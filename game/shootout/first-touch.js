(function () {
  'use strict';

  // ===== Constants =====
  var STORAGE_KEY = 'pregame.first-touch.v1';
  var KICKS_URL = '/game/shootout/data/first-touch-kicks.json';
  var CARDS_PER_MATCH = 5;
  var KICK_TIMER_MS = 5200;
  var REVEAL_HOLD_MS = 5000;
  var SWIPE_THRESHOLD_PX = 70;
  var PASS_THRESHOLD = 3;

  // ===== State =====
  var pool = null;
  var poolPromise = null;
  var match = null;
  var root = null;
  // Session-scoped used-card tracking — avoids repeating cards across matches
  // in the same session (parity with Shootout). Persists for the page life;
  // wraps when the pool is exhausted so play can continue infinitely.
  var sessionUsed = new Set();

  // ===== Storage =====
  var Storage = {
    load: function () {
      try {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return defaultStore();
        var parsed = JSON.parse(raw);
        return Object.assign(defaultStore(), parsed);
      } catch (_e) {
        return defaultStore();
      }
    },
    save: function (data) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (_e) { /* quota or private mode */ }
    },
  };
  function defaultStore() {
    return {
      lastResult: null,
      gradCount: 0,
      factsLearnedTotal: 0,
    };
  }

  // ===== RNG (mulberry32) =====
  function mulberry32(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffle(arr, rng) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  // ===== Pool loader =====
  function loadPool() {
    if (poolPromise) return poolPromise;
    poolPromise = fetch(KICKS_URL).then(function (r) { return r.json(); }).then(function (data) {
      pool = data;
      return data;
    });
    return poolPromise;
  }

  // ===== Render helpers =====
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'html') node.innerHTML = attrs[k];
        else if (k.indexOf('data-') === 0) node.setAttribute(k, attrs[k]);
        else if (k === 'text') node.textContent = attrs[k];
        else node.setAttribute(k, attrs[k]);
      }
    }
    if (children) {
      children.forEach(function (c) {
        if (c == null) return;
        node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      });
    }
    return node;
  }
  function clearRoot() { while (root.firstChild) root.removeChild(root.firstChild); }
  // Mirror Shootout's mode toggle so non-game screens can grow/scroll on mobile.
  function setRootMode(mode) {
    if (!root) return;
    root.classList.remove('is-chooser', 'is-result');
    if (mode) root.classList.add(mode);
  }

  // ===== Match construction =====
  function createMatch() {
    var seed = Math.floor(Math.random() * 0x7fffffff);
    var rng = mulberry32(seed);
    // Draw from cards not yet seen this session. If fewer than a full match
    // remain, wrap the used set so play continues indefinitely.
    var available = pool.filter(function (c) { return !sessionUsed.has(c.id); });
    if (available.length < CARDS_PER_MATCH) {
      sessionUsed.clear();
      available = pool;
    }
    var shuffled = shuffle(available, rng);
    var picked = shuffled.slice(0, CARDS_PER_MATCH);
    picked.forEach(function (c) { sessionUsed.add(c.id); });
    return {
      seed: seed,
      rng: rng,
      cards: picked,
      step: 0,
      results: [],   // 1 = correct, 0 = wrong
      misses: [],    // full card objects the user got wrong, for recap
    };
  }

  // ===== Public start =====
  function start() {
    root = document.getElementById('game-root');
    if (!root) return;
    if (!pool) {
      clearRoot();
      root.appendChild(el('div', { class: 'screen screen-start' }, [
        el('div', { class: 'sh-start-eyebrow', text: 'Loading...' }),
      ]));
      loadPool().then(function () { beginMatch(); }).catch(function (err) {
        clearRoot();
        root.appendChild(el('div', { class: 'screen screen-start' }, [
          el('div', { class: 'sh-start-eyebrow', text: "Couldn't load cards" }),
          el('p', { class: 'sh-start-sub', text: 'Reload the page. If it keeps failing, the card pool may be missing.' }),
        ]));
        if (window.console) console.error('[first-touch] pool load failed', err);
      });
      return;
    }
    beginMatch();
  }

  function beginMatch() {
    match = createMatch();
    renderCard();
  }

  // ===== Counter (Card X of 5) =====
  function renderCounter() {
    var counter = el('div', { class: 'sh-kick-counter ft-counter' });
    counter.textContent = 'Card ' + (match.step + 1) + ' of ' + CARDS_PER_MATCH;
    root.appendChild(counter);
  }

  // ===== Card screen =====
  function renderCard() {
    var card = match.cards[match.step];
    if (!card) { finishMatch(); return; }
    clearRoot();
    setRootMode(null);
    renderCounter();

    var claimCard = el('div', { class: 'sh-claim-card ft-claim-card', 'data-card-id': card.id }, [
      el('div', { class: 'sh-claim-eyebrow', text: 'True or false?' }),
      el('div', { class: 'sh-claim-text', text: card.statement }),
      el('div', { class: 'sh-claim-hint', text: 'Swipe right TRUE · left FALSE' }),
    ]);
    var timer = el('div', { class: 'sh-timer' }, [el('div', { class: 'sh-timer-bar' })]);
    var btnFalse = el('button', { class: 'sh-tf-btn sh-tf-false', type: 'button', 'aria-label': 'False' }, [
      el('span', { class: 'sh-tf-glyph', text: '✕' }),
      el('span', { text: 'False' }),
    ]);
    var btnTrue = el('button', { class: 'sh-tf-btn sh-tf-true', type: 'button', 'aria-label': 'True' }, [
      el('span', { class: 'sh-tf-glyph', text: '✓' }),
      el('span', { text: 'True' }),
    ]);
    var row = el('div', { class: 'sh-tf-row' }, [btnFalse, btnTrue]);

    var screen = el('div', { class: 'screen screen-your-kick ft-screen-card' }, [claimCard, timer, row]);
    root.appendChild(screen);

    var resolved = false;
    var cancelTimer = startTimer(timer.firstChild, KICK_TIMER_MS, function () {
      if (resolved) return;
      resolved = true;
      resolveCard(card, null);
    });

    function pick(answer) {
      if (resolved) return;
      resolved = true;
      cancelTimer();
      claimCard.classList.add(answer ? 'swipe-true' : 'swipe-false');
      setTimeout(function () { resolveCard(card, answer); }, 140);
    }
    btnTrue.addEventListener('click', function () { pick(true); });
    btnFalse.addEventListener('click', function () { pick(false); });
    setupSwipe(claimCard, function () { pick(true); }, function () { pick(false); });
  }

  function resolveCard(card, answer) {
    var correct = answer !== null && answer === card.truth;
    match.results.push(correct ? 1 : 0);
    if (!correct) match.misses.push(card);
    showReveal(correct ? 'You scored' : 'You missed', correct, card.explanation, function () {
      match.step++;
      if (match.step >= CARDS_PER_MATCH) {
        finishMatch();
      } else {
        renderCard();
      }
    });
  }

  // ===== Reveal flash =====
  function showReveal(word, correct, explanation, done) {
    var cls = 'sh-reveal ' + (correct ? 'sh-reveal-correct' : 'sh-reveal-wrong');
    var overlay = el('div', { class: cls }, [
      el('span', { class: 'sh-reveal-word', text: word }),
      explanation ? el('div', { class: 'sh-reveal-explain', text: explanation }) : null,
      el('span', { class: 'sh-reveal-skip-hint', text: 'tap to continue' }),
    ]);
    root.appendChild(overlay);

    var resolved = false;
    function finish() {
      if (resolved) return;
      resolved = true;
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      done();
    }
    overlay.addEventListener('click', finish);
    overlay.addEventListener('pointerdown', function (e) { e.preventDefault(); finish(); }, { passive: false });
    setTimeout(finish, REVEAL_HOLD_MS);
  }

  // ===== Result =====
  function finishMatch() {
    var score = match.results.reduce(function (a, b) { return a + b; }, 0);
    var total = CARDS_PER_MATCH;
    persistResult(score, total);
    renderResult(score, total);
  }

  function persistResult(score, total) {
    var store = Storage.load();
    store.lastResult = { score: score, total: total, timestamp: Date.now() };
    store.factsLearnedTotal = (store.factsLearnedTotal || 0) + score;
    if (score >= PASS_THRESHOLD) store.gradCount = (store.gradCount || 0) + 1;
    Storage.save(store);
  }

  function renderResult(score, total) {
    clearRoot();
    setRootMode('is-result');
    var perfect = score === total;
    var pass = score >= PASS_THRESHOLD;
    var store = Storage.load();

    var children = [];

    if (perfect) {
      children.push(el('div', { class: 'ft-sticker', text: 'Perfect run ⭐' }));
    }

    var hero, verdict, blurb;
    if (pass) {
      hero = el('div', { class: 'sh-result-hero is-win ft-result-hero', 'aria-hidden': 'true', text: '🎓' });
      verdict = el('h1', { class: 'sh-result-verdict is-win ft-verdict', text: 'Nice.' });
      blurb = el('p', { class: 'ft-blurb', text: 'You learned 5 things about the World Cup.' });
    } else {
      hero = el('div', { class: 'sh-result-hero is-loss ft-result-hero', 'aria-hidden': 'true', text: '⚽' });
      verdict = el('h1', { class: 'sh-result-verdict ft-verdict-close', text: 'Close.' });
      blurb = el('p', { class: 'ft-blurb', text: "Here's what you'll know next time." });
    }
    children.push(hero, verdict, blurb);

    var scoreLine = el('div', { class: 'ft-score', text: score + ' of ' + total + ' right' });
    children.push(scoreLine);

    if (!pass && match.misses.length) {
      var recapItems = match.misses.map(function (card) {
        return el('li', { class: 'ft-recap-item' }, [
          el('div', { class: 'ft-recap-statement', text: card.statement }),
          el('div', { class: 'ft-recap-explain', text: card.explanation }),
        ]);
      });
      children.push(el('ul', { class: 'ft-recap' }, recapItems));
    }

    var actions = el('div', { class: 'ft-actions' }, []);
    if (pass) {
      var shootoutBtn = el('button', { class: 'sh-rematch ft-cta-primary', type: 'button', text: 'Play Shootout →' });
      shootoutBtn.addEventListener('click', handoffToShootout);
      var replayBtn = el('button', { class: 'sh-share ft-cta-secondary', type: 'button', text: 'Play First Touch again' });
      replayBtn.addEventListener('click', function () { beginMatch(); });
      var shareBtn = el('button', { class: 'sh-share ft-cta-secondary', type: 'button', text: nativeShareSupported() ? 'Share' : 'Copy result' });
      shareBtn.addEventListener('click', function () { shareResult(shareBtn, score, total); });
      actions.appendChild(shootoutBtn);
      actions.appendChild(replayBtn);
      actions.appendChild(shareBtn);
    } else {
      var tryAgainBtn = el('button', { class: 'sh-rematch ft-cta-primary', type: 'button', text: 'Try again' });
      tryAgainBtn.addEventListener('click', function () { beginMatch(); });
      var backBtn = el('button', { class: 'sh-share ft-cta-secondary', type: 'button', text: 'Back to start' });
      backBtn.addEventListener('click', backToChooser);
      actions.appendChild(tryAgainBtn);
      actions.appendChild(backBtn);
    }
    children.push(actions);

    if (store.factsLearnedTotal > 0) {
      var noun = store.factsLearnedTotal === 1 ? 'fact' : 'facts';
      children.push(el('p', { class: 'ft-footnote', text: "You've learned " + store.factsLearnedTotal + ' World Cup ' + noun + ' on this device.' }));
    }

    var screen = el('div', { class: 'screen screen-result ft-screen-result' }, children);
    root.appendChild(screen);
  }

  function handoffToShootout() {
    match = null;
    if (window.PregameShootout && typeof window.PregameShootout.startMatch === 'function') {
      window.PregameShootout.startMatch();
    } else {
      backToChooser();
    }
  }

  function backToChooser() {
    match = null;
    if (window.PregameShootout && typeof window.PregameShootout.renderStart === 'function') {
      window.PregameShootout.renderStart();
    } else {
      clearRoot();
    }
  }

  // ===== Share (pass screen only) =====
  function buildShareText(score, total) {
    var emojiRow = match.results.map(function (r) { return r === 1 ? '✅' : '❌'; }).join('');
    var lines = ['Pregame · First Touch', emojiRow];
    if (score === total) {
      lines.push(score + ' of ' + total + '. Maybe I am a soccer pro after all.');
    } else {
      lines.push(score + ' of ' + total + '. Not a soccer pro, but I graduated from First Touch.');
    }
    lines.push('');
    lines.push('Your turn → wc26pregame.com/game/shootout?source=ft-share');
    return lines.join('\n');
  }

  function nativeShareSupported() {
    return typeof navigator !== 'undefined' && typeof navigator.share === 'function'
      && (navigator.maxTouchPoints > 0 || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent || ''));
  }

  function shareResult(btn, score, total) {
    var text = buildShareText(score, total);
    var shareData = { title: 'Pregame First Touch', text: text };
    if (nativeShareSupported()) {
      navigator.share(shareData).catch(function (err) {
        if (!err || err.name !== 'AbortError') copyShareToClipboard(text, btn);
      });
      return;
    }
    copyShareToClipboard(text, btn);
  }

  function copyShareToClipboard(text, btn) {
    function done() {
      var orig = btn.textContent;
      btn.textContent = 'Copied ✓';
      btn.classList.add('is-copied');
      setTimeout(function () {
        btn.textContent = orig;
        btn.classList.remove('is-copied');
      }, 1600);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text, done); });
    } else {
      fallbackCopy(text, done);
    }
  }

  function fallbackCopy(text, done) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (_e) {}
    document.body.removeChild(ta);
    done();
  }

  // ===== Swipe + Timer primitives =====
  function setupSwipe(card, onTrue, onFalse) {
    var startX = null;
    var dx = 0;
    function onDown(e) {
      startX = e.clientX;
      try { card.setPointerCapture(e.pointerId); } catch (_e) {}
      card.classList.add('is-swiping');
    }
    function onMove(e) {
      if (startX === null) return;
      dx = e.clientX - startX;
      card.style.transform = 'translateX(' + dx + 'px) rotate(' + (dx * 0.06) + 'deg)';
    }
    function onUp() {
      if (startX === null) return;
      card.classList.remove('is-swiping');
      if (Math.abs(dx) > SWIPE_THRESHOLD_PX) {
        if (dx > 0) onTrue(); else onFalse();
      } else {
        card.style.transform = '';
      }
      startX = null;
      dx = 0;
    }
    card.addEventListener('pointerdown', onDown);
    card.addEventListener('pointermove', onMove);
    card.addEventListener('pointerup', onUp);
    card.addEventListener('pointercancel', onUp);
  }
  function startTimer(barEl, ms, onTimeout) {
    barEl.style.transition = 'none';
    barEl.style.transform = 'scaleX(1)';
    barEl.classList.remove('is-urgent');
    void barEl.offsetWidth;
    barEl.style.transition = 'transform ' + ms + 'ms linear, background 0.25s ease';
    barEl.style.transform = 'scaleX(0)';
    var urgentT = setTimeout(function () { barEl.classList.add('is-urgent'); }, ms * 0.65);
    var t = setTimeout(onTimeout, ms);
    return function () { clearTimeout(t); clearTimeout(urgentT); };
  }

  // ===== Public surface =====
  window.PregameFirstTouch = {
    start: start,
  };

  // Eager pool fetch so the first CTA click is instant on most networks.
  loadPool().catch(function (err) {
    if (window.console) console.error('[first-touch] eager pool fetch failed', err);
  });
})();
