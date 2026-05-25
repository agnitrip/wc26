(function () {
  'use strict';

  // ===== Constants =====
  var STORAGE_KEY = 'pregame.shootout.v2';
  var KICKS_URL = '/game/shootout/data/kicks.json';
  var BREAKAWAYS_URL = '/game/shootout/data/breakaways.json';
  var KICKS_PER_HALF = 5;
  var KICK_TIMER_MS = 5200;
  var BREAKAWAY_DURATION_MS = 15000;
  var BREAKAWAY_READ_DELAY_MS = 1000;
  var REVEAL_MS = 400;       // flash animation duration
  var REVEAL_HOLD_MS = 5000; // total time the answer overlay stays visible (user can tap to skip earlier)
  var BANNER_MS = 800;
  var SWIPE_THRESHOLD_PX = 70;

  // ===== State =====
  var pools = { kicks: null, breakaways: null };
  var match = null;
  var root = null;
  // Session streak: in-memory only, resets to 0 on page refresh.
  var sessionStreak = 0;

  // ===== Storage (cross-session lifetime stats only — session streak is in-memory) =====
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
      longestStreak: 0,
      totalWins: 0,
      totalLosses: 0,
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

  // ===== Number helpers =====
  function pad2(n) { return n < 10 ? '0' + n : '' + n; }

  // ===== Pool loader =====
  function loadPools() {
    return Promise.all([
      fetch(KICKS_URL).then(function (r) { return r.json(); }),
      fetch(BREAKAWAYS_URL).then(function (r) { return r.json(); }),
    ]).then(function (results) {
      pools.kicks = results[0];
      pools.breakaways = results[1];
    });
  }

  // ===== Match construction =====
  function createMatch() {
    var seed = Math.floor(Math.random() * 0x7fffffff);
    var rng = mulberry32(seed);
    var allKicks = shuffle(pools.kicks, rng);
    var allBreakaways = shuffle(pools.breakaways, rng);
    return {
      seed: seed,
      kicks: allKicks.slice(0, KICKS_PER_HALF),
      breakaways: allBreakaways.slice(0, KICKS_PER_HALF),
      remainingKicks: allKicks.slice(KICKS_PER_HALF),
      remainingBreakaways: allBreakaways.slice(KICKS_PER_HALF),
      rng: rng,
      streakBefore: sessionStreak,
      streakAfter: sessionStreak,
      you: [],
      them: [],
      sdYou: [],
      sdThem: [],
      step: 0,
      sdRound: 0,
      phase: 'matchStart',
      result: null,
    };
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
  function sum(arr) { return arr.reduce(function (a, b) { return a + b; }, 0); }

  // ===== HUD (scoreline + counter + quit) =====
  function renderHud() {
    var youScore = sum(match.you) + sum(match.sdYou);
    var themScore = sum(match.them) + sum(match.sdThem);
    var quitBtn = el('button', { class: 'sh-quit-btn', type: 'button', 'aria-label': 'Quit match' }, [
      el('span', { class: 'sh-quit-glyph', text: '✕' }),
    ]);
    quitBtn.addEventListener('click', quitMatch);
    var hud = el('div', { class: 'sh-hud-row' }, [
      el('div', { class: 'sh-scoreline' }, [
        pipBlock('YOU',  match.you, match.sdYou, youScore),
        pipBlock('THEY', match.them, match.sdThem, themScore),
      ]),
      quitBtn,
    ]);
    var counter = el('div', { class: 'sh-kick-counter' });
    if (match.phase === 'sd' || match.sdRound > 0) {
      counter.textContent = 'Sudden Death · Round ' + Math.max(1, match.sdRound);
    } else {
      var kickNum = Math.min(match.step + 1, KICKS_PER_HALF);
      counter.textContent = 'Kick ' + kickNum + ' of ' + KICKS_PER_HALF;
    }
    root.appendChild(hud);
    root.appendChild(counter);
  }
  function pipBlock(label, regResults, sdResults, score) {
    var pipsWrap = el('div', { class: 'sh-side-pips' });
    for (var i = 0; i < KICKS_PER_HALF; i++) {
      var cls = 'sh-pip';
      if (i < regResults.length) cls += regResults[i] === 1 ? ' pip-goal' : ' pip-saved';
      pipsWrap.appendChild(el('span', { class: cls }));
    }
    sdResults.forEach(function (r) {
      pipsWrap.appendChild(el('span', { class: 'sh-pip pip-sd ' + (r === 1 ? 'pip-goal' : 'pip-saved') }));
    });
    return el('div', { class: 'sh-side' }, [
      el('span', { class: 'sh-side-label', text: label }),
      el('strong', { text: String(score) }),
      pipsWrap,
    ]);
  }

  // ===== Reveal flash =====
  // word = headline copy (e.g. "You scored", "They scored").
  // correct = whether the player got the answer right (drives the colour: green correct, red wrong).
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
    // Tap anywhere on the overlay to skip.
    overlay.addEventListener('click', finish);
    overlay.addEventListener('pointerdown', function (e) { e.preventDefault(); finish(); }, { passive: false });
    setTimeout(finish, REVEAL_HOLD_MS);
  }

  // ===== Banner (HT, SUDDEN DEATH) =====
  function showBanner(word, sub, done) {
    var overlay = el('div', { class: 'sh-banner' }, [
      el('div', null, [
        el('span', { class: 'sh-banner-word', text: word }),
        sub ? el('span', { class: 'sh-banner-sub', text: sub }) : null,
      ]),
    ]);
    root.appendChild(overlay);
    setTimeout(function () {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      done();
    }, BANNER_MS);
  }

  // ===== Start screen =====
  function renderStart() {
    match = null;
    clearRoot();
    var store = Storage.load();

    var playBtn = el('button', { class: 'sh-play-btn', type: 'button' }, [
      el('span', { class: 'sh-play-btn-main', text: sessionStreak > 0 ? 'Keep the streak going' : 'Play' }),
      el('span', { class: 'sh-play-btn-sub', text: '10 cards. One try per match.' }),
    ]);
    playBtn.addEventListener('click', function () { startMatch(); });

    // Streak panel: shows current run prominently if active, otherwise lifetime best if any.
    var streakPanel = null;
    if (sessionStreak > 0) {
      streakPanel = el('div', { class: 'sh-streak-panel is-live' }, [
        el('span', { class: 'sh-streak-flame', text: '🔥' }),
        el('span', { class: 'sh-streak-num', text: String(sessionStreak) }),
        el('span', { class: 'sh-streak-label', text: sessionStreak === 1 ? 'win in a row' : 'wins in a row' }),
      ]);
    } else if (store.longestStreak > 0) {
      streakPanel = el('div', { class: 'sh-streak-panel' }, [
        el('span', { class: 'sh-streak-label', text: 'Best streak this device: ' }),
        el('span', { class: 'sh-streak-num-small', text: String(store.longestStreak) }),
      ]);
    }

    var screen = el('div', { class: 'screen screen-start' }, [
      startHeroEl(),
      el('div', { class: 'sh-start-eyebrow', text: 'Pregame · Shootout' }),
      el('h1', { class: 'sh-start-title', text: '5 kicks.\n5 saves.' }),
      el('div', { class: 'sh-start-rules' }, [
        el('p', { class: 'sh-rule-line' }, [
          el('strong', { text: 'Take your kick' }),
          document.createTextNode(' — swipe true or false.'),
        ]),
        el('p', { class: 'sh-rule-line' }, [
          el('strong', { text: 'Save theirs' }),
          document.createTextNode(' — tap the odd one out in time.'),
        ]),
      ]),
      streakPanel,
      el('div', { class: 'sh-play-wrap' }, [playBtn]),
    ]);
    root.appendChild(screen);
  }

  function startHeroEl() {
    // System soccer-ball emoji at hero size. Platform-native glyph, no custom SVG.
    return el('div', { class: 'sh-start-hero', 'aria-hidden': 'true', text: '⚽' });
  }

  // ===== Match flow =====
  function startMatch() {
    match = createMatch();
    match.phase = 'your';
    renderYourKick();
  }

  function quitMatch() {
    // Quit returns to start without ending the streak — the match simply didn't happen.
    match = null;
    renderStart();
  }

  function renderYourKick() {
    var kick = currentKick();
    if (!kick) { checkFullTime(); return; }
    clearRoot();
    renderHud();
    var card = el('div', { class: 'sh-claim-card', 'data-card-id': kick.id }, [
      el('div', { class: 'sh-claim-eyebrow', text: 'Your kick' }),
      el('div', { class: 'sh-claim-text', text: kick.statement }),
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

    var screen = el('div', { class: 'screen screen-your-kick' }, [card, timer, row]);
    root.appendChild(screen);

    var resolved = false;
    var cancelTimer = startTimer(timer.firstChild, KICK_TIMER_MS, function () {
      if (resolved) return;
      resolved = true;
      // Timeout counts as a miss (saved by GK).
      resolveYourKick(kick, null);
    });

    function pick(answer) {
      if (resolved) return;
      resolved = true;
      cancelTimer();
      var goal = answer === kick.truth;
      card.classList.add(answer ? 'swipe-true' : 'swipe-false');
      // Resolve immediately after a brief visual; reveal flash takes over.
      setTimeout(function () { resolveYourKick(kick, answer); }, 140);
    }
    btnTrue.addEventListener('click', function () { pick(true); });
    btnFalse.addEventListener('click', function () { pick(false); });
    setupSwipe(card, function () { pick(true); }, function () { pick(false); });
  }

  function resolveYourKick(kick, answer) {
    var goal = answer !== null && answer === kick.truth;
    var record = goal ? 1 : 0;
    if (match.phase === 'sd-your') {
      match.sdYou.push(record);
    } else {
      match.you.push(record);
    }
    // On your kick: scored = correct, missed = wrong.
    showReveal(goal ? 'You scored' : 'You missed', goal, kick.explanation, function () {
      if (match.phase === 'sd-your') {
        match.phase = 'sd-their';
        renderTheirKick();
      } else {
        match.phase = 'their';
        renderTheirKick();
      }
    });
  }

  function renderTheirKick() {
    var bk = currentBreakaway();
    if (!bk) { checkFullTime(); return; }
    clearRoot();
    renderHud();

    var tilesShuffled = shuffle(bk.in_set.concat([bk.imposter]), match.rng || mulberry32(Date.now()));
    var rowTiles = tilesShuffled.map(function (name) {
      return el('button', {
        class: 'sh-bk-tile',
        type: 'button',
        'data-imposter': name === bk.imposter ? 'true' : 'false',
      }, [
        el('span', { class: 'sh-bk-tile-glyph', text: '⚽' }),
        el('span', { class: 'sh-bk-tile-name', text: name }),
      ]);
    });
    var bkRow = el('div', { class: 'sh-bk-row' }, rowTiles);
    var goalLine = el('div', { class: 'sh-bk-goal-line' });
    var goalpost = goalpostSvg();
    var track = el('div', { class: 'sh-bk-track' }, [goalpost, goalLine, bkRow]);

    var category = el('div', { class: 'sh-bk-category', text: 'Their kick · Spot the odd one out' });
    var catLine = el('h2', { class: 'sh-bk-cat-line' }, [
      el('span', { class: 'sh-bk-defend', text: 'DEFEND' }),
      document.createTextNode(bk.category_label),
    ]);

    var screen = el('div', { class: 'screen screen-their-kick' }, [category, catLine, track]);
    root.appendChild(screen);

    var resolved = false;
    var rafId = null;

    // Hold the row offscreen for a beat so the player can read the category before tiles start falling.
    setTimeout(function () {
      if (resolved) return;
      bkRow.classList.add('is-running');
      rafId = requestAnimationFrame(tick);
      // Safety: guarantee resolution even if the rAF crossing detection misses (tab throttled, etc.).
      setTimeout(function () { if (!resolved) finish('goal', null); }, BREAKAWAY_DURATION_MS + 200);
    }, BREAKAWAY_READ_DELAY_MS);

    function finish(kind, tappedTile) {
      if (resolved) return;
      resolved = true;
      if (rafId) cancelAnimationFrame(rafId);
      bkRow.classList.add('is-paused');
      var imposterEl = bkRow.querySelector('[data-imposter="true"]');
      if (kind === 'saved') {
        if (tappedTile) tappedTile.classList.add('tile-correct');
      } else {
        if (tappedTile) tappedTile.classList.add('tile-wrong');
        if (imposterEl && !tappedTile) imposterEl.classList.add('tile-wrong');
        if (imposterEl && tappedTile && tappedTile !== imposterEl) imposterEl.classList.add('tile-correct');
      }
      resolveTheirKick(bk, kind);
    }

    function onTileTap(tile, e) {
      if (e && e.preventDefault) e.preventDefault();
      if (resolved) return;
      var isImposter = tile.dataset.imposter === 'true';
      finish(isImposter ? 'saved' : 'goal', tile);
    }
    rowTiles.forEach(function (tile) {
      // pointerdown fires fast for response; click is the reliable fallback when
      // hit-testing flakes on a moving/animating button (seen on iOS Safari).
      tile.addEventListener('pointerdown', function (e) { onTileTap(tile, e); }, { passive: false });
      tile.addEventListener('click', function (e) { onTileTap(tile, e); });
    });

    var imposter = bkRow.querySelector('[data-imposter="true"]');
    function tick() {
      if (resolved) return;
      var goalLineY = goalLine.getBoundingClientRect().top;
      var imposterRect = imposter.getBoundingClientRect();
      // Falling top-to-bottom: leading edge is the tile's bottom. Crossing fires when it touches the goal-line.
      if (imposterRect.bottom >= goalLineY) {
        finish('goal', null);
        return;
      }
      rafId = requestAnimationFrame(tick);
    }
  }

  function goalpostSvg() {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'sh-bk-goalpost');
    svg.setAttribute('viewBox', '0 0 280 110');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML =
      '<defs>' +
        '<pattern id="goalnet" width="14" height="14" patternUnits="userSpaceOnUse">' +
          '<path d="M0 0 L14 14 M14 0 L0 14" stroke="rgba(255,255,255,0.42)" stroke-width="1" fill="none"/>' +
        '</pattern>' +
      '</defs>' +
      '<rect x="8" y="8" width="264" height="102" fill="url(#goalnet)"/>' +
      '<rect x="0" y="0" width="280" height="8" fill="#fff" rx="2"/>' +
      '<rect x="0" y="0" width="8" height="110" fill="#fff" rx="2"/>' +
      '<rect x="272" y="0" width="8" height="110" fill="#fff" rx="2"/>';
    return svg;
  }

  function resolveTheirKick(bk, kind) {
    var record = kind === 'goal' ? 1 : 0; // 1 means they scored
    if (match.phase === 'sd-their') {
      match.sdThem.push(record);
    } else {
      match.them.push(record);
    }
    // On their kick: saved = correct, they-scored = wrong.
    showReveal(kind === 'saved' ? 'You saved it' : 'They scored', kind === 'saved', bk.explanation, function () {
      if (match.phase === 'sd-their') {
        evaluateSdRound();
      } else {
        advanceStep();
      }
    });
  }

  function advanceStep() {
    match.step++;
    if (match.step >= KICKS_PER_HALF) {
      checkFullTime();
      return;
    }
    match.phase = 'your';
    renderYourKick();
  }

  function checkFullTime() {
    var youScore = sum(match.you);
    var themScore = sum(match.them);
    if (youScore === themScore) {
      showBanner('SUDDEN DEATH', 'Tied at full time', function () { startSdRound(); });
    } else {
      finishMatch(youScore > themScore ? 'W' : 'L');
    }
  }

  function startSdRound() {
    match.sdRound++;
    match.phase = 'sd-your';
    renderYourKick();
  }

  function evaluateSdRound() {
    var i = match.sdYou.length - 1;
    var youThis = match.sdYou[i];
    var themThis = match.sdThem[i];
    if (youThis !== themThis) {
      finishMatch(youThis > themThis ? 'W' : 'L');
    } else {
      startSdRound();
    }
  }

  function currentKick() {
    if (match.phase === 'sd-your') {
      // Draw from remaining queue, refilling if exhausted (small pools).
      if (!match.remainingKicks.length) match.remainingKicks = shuffle(pools.kicks, match.rng);
      var k = match.remainingKicks.shift();
      // Cache the active sd kick so resolveYourKick can read same object via closure (already passed).
      return k;
    }
    return match.kicks[match.step] || null;
  }
  function currentBreakaway() {
    if (match.phase === 'sd-their') {
      if (!match.remainingBreakaways.length) match.remainingBreakaways = shuffle(pools.breakaways, match.rng);
      return match.remainingBreakaways.shift();
    }
    return match.breakaways[match.step] || null;
  }

  // ===== Result + persistence =====
  function finishMatch(result) {
    match.phase = 'result';
    match.result = result;
    match.streakBefore = sessionStreak;
    if (result === 'W') {
      sessionStreak += 1;
    } else {
      sessionStreak = 0;
    }
    match.streakAfter = sessionStreak;
    persistMatch();
    renderResult();
  }
  function persistMatch() {
    var store = Storage.load();
    var won = match.result === 'W';
    if (won) store.totalWins += 1;
    else     store.totalLosses += 1;
    if (sessionStreak > store.longestStreak) store.longestStreak = sessionStreak;
    Storage.save(store);
  }

  function renderResult() {
    clearRoot();
    var youScore = sum(match.you) + sum(match.sdYou);
    var themScore = sum(match.them) + sum(match.sdThem);
    var won = match.result === 'W';
    var store = Storage.load();

    var resultHero = el('div', {
      class: 'sh-result-hero ' + (won ? 'is-win' : 'is-loss'),
      'aria-hidden': 'true',
      text: won ? '🏆' : '💔',
    });
    var verdict = el('h1', {
      class: 'sh-result-verdict ' + (won ? 'is-win' : 'is-loss'),
      text: won ? 'You won.' : 'You lost.',
    });
    var scoreLine = el('div', { class: 'sh-result-score', text: youScore + ' - ' + themScore });
    var grid = buildShareGridDom();

    // Streak status line: leads the result. "X wins in a row" on win, "Streak ended at X" on loss with a prior run.
    var streakLine = null;
    if (won) {
      streakLine = el('div', { class: 'sh-streak-line is-live' }, [
        el('span', { class: 'sh-streak-flame', text: '🔥' }),
        el('span', { text: match.streakAfter + (match.streakAfter === 1 ? ' win in a row' : ' wins in a row') }),
      ]);
    } else if (match.streakBefore > 0) {
      streakLine = el('div', { class: 'sh-streak-line is-ended' }, [
        el('span', { text: 'Streak ended at ' + match.streakBefore }),
      ]);
    }

    var rematchBtn = el('button', { class: 'sh-rematch', type: 'button', text: won ? 'Play next' : 'Play again' });
    rematchBtn.addEventListener('click', startMatch);

    var shareBtn = el('button', { class: 'sh-share', type: 'button', text: nativeShareSupported() ? 'Share' : 'Copy result' });
    shareBtn.addEventListener('click', function () { shareResult(shareBtn); });

    var backBtn = el('button', { class: 'sh-share', type: 'button', text: '← Back to start' });
    backBtn.addEventListener('click', function () { renderStart(); });

    var actions = el('div', { class: 'sh-result-actions' }, [rematchBtn, shareBtn, backBtn]);

    var crossLinks = el('div', { class: 'sh-result-crosslinks' }, [
      el('a', { href: '/streaming', text: 'Watching a match today? · Pick a stream' }),
      el('a', { href: '/watch-parties', text: 'Find a watch party near you' }),
    ]);

    var bestLine = store.longestStreak > 0 ? el('p', { class: 'sh-daily-notice', text: 'Best streak this device: ' + store.longestStreak }) : null;

    var screen = el('div', { class: 'screen screen-result' }, [
      streakLine, resultHero, verdict, scoreLine, grid, actions, crossLinks, bestLine,
    ]);
    root.appendChild(screen);
    rematchBtn.focus();
  }

  function buildShareGridDom() {
    var youRow = match.you.map(emoji).concat(match.sdYou.map(emoji)).join('');
    var themRow = match.them.map(emoji).concat(match.sdThem.map(emoji)).join('');
    return el('div', { class: 'sh-result-grid' }, [
      el('div', { class: 'grid-row' }, [
        el('span', { class: 'grid-label', text: 'YOU' }),
        el('span', { text: youRow }),
      ]),
      el('div', { class: 'grid-row' }, [
        el('span', { class: 'grid-label', text: 'THEY' }),
        el('span', { text: themRow }),
      ]),
    ]);
  }
  function emoji(v) { return v === 1 ? '⚽' : '❌'; }

  function buildShareText() {
    var youScore = sum(match.you) + sum(match.sdYou);
    var themScore = sum(match.them) + sum(match.sdThem);
    var won = match.result === 'W';
    var youRow = match.you.map(emoji).concat(match.sdYou.map(emoji)).join('');
    var themRow = match.them.map(emoji).concat(match.sdThem.map(emoji)).join('');
    var lines = ['Pregame Shootout'];
    if (won) {
      lines.push('🔥 ' + match.streakAfter + (match.streakAfter === 1 ? ' win in a row' : ' wins in a row'));
    } else if (match.streakBefore > 0) {
      lines.push('💔 Streak ended at ' + match.streakBefore);
    }
    lines.push('Final: ' + youScore + '-' + themScore + ' ' + (won ? 'W' : 'L'));
    lines.push('You:  ' + youRow);
    lines.push('They: ' + themRow);
    lines.push('wc26pregame.com');
    return lines.join('\n');
  }

  function nativeShareSupported() {
    // Restrict to touch contexts where the OS share sheet is the right surface. On desktop
    // most browsers ship navigator.share but the sheet is awkward; clipboard is friendlier.
    return typeof navigator !== 'undefined' && typeof navigator.share === 'function'
      && (navigator.maxTouchPoints > 0 || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent || ''));
  }

  function shareResult(btn) {
    var text = buildShareText();
    var shareData = { title: 'Pregame Shootout', text: text };
    if (nativeShareSupported()) {
      navigator.share(shareData).catch(function (err) {
        // User cancelled (AbortError) is silent; any other failure falls back to clipboard.
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

  // ===== Init =====
  function init() {
    root = document.getElementById('game-root');
    if (!root) return;
    root.appendChild(el('div', { class: 'screen screen-start' }, [
      el('div', { class: 'sh-start-eyebrow', text: 'Loading...' }),
    ]));
    loadPools().then(renderStart).catch(function (err) {
      clearRoot();
      root.appendChild(el('div', { class: 'screen screen-start' }, [
        el('div', { class: 'sh-start-eyebrow', text: 'Couldn\'t load cards' }),
        el('p', { class: 'sh-start-sub', text: 'Reload the page. If it keeps failing, the card pool may be missing.' }),
      ]));
      // eslint-disable-next-line no-console
      if (window.console) console.error('[shootout] pool load failed', err);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
