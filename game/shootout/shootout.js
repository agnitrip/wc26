(function () {
  'use strict';

  // ===== Constants =====
  var LAUNCH_DATE_UTC = '2026-05-25';
  var STORAGE_KEY = 'pregame.shootout.v1';
  var KICKS_URL = '/game/shootout/data/kicks.json';
  var BREAKAWAYS_URL = '/game/shootout/data/breakaways.json';
  var KICKS_PER_HALF = 5;
  var KICK_TIMER_MS = 6500;
  var BREAKAWAY_DURATION_MS = 12000;
  var BREAKAWAY_READ_DELAY_MS = 1000;
  var REVEAL_MS = 400;
  var BANNER_MS = 800;
  var SWIPE_THRESHOLD_PX = 70;

  // ===== State =====
  var pools = { kicks: null, breakaways: null };
  var match = null;
  var root = null;

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
      daily: {
        lastPlayedDate: null,
        todayResult: null,
        currentStreak: 0,
        longestStreak: 0,
      },
      practice: {
        personalBest: { you: 0, them: 0 },
        totalPlays: 0,
        totalWins: 0,
      },
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

  // ===== Date helpers (UTC) =====
  function todayUtcKey() {
    var d = new Date();
    return d.getUTCFullYear() + '-' +
      pad2(d.getUTCMonth() + 1) + '-' +
      pad2(d.getUTCDate());
  }
  function todaySeed() {
    return parseInt(todayUtcKey().replace(/-/g, ''), 10);
  }
  function dailyNumber() {
    var launchMs = Date.parse(LAUNCH_DATE_UTC + 'T00:00:00Z');
    var nowMs = Date.parse(todayUtcKey() + 'T00:00:00Z');
    return Math.floor((nowMs - launchMs) / 86400000) + 1;
  }
  function pad2(n) { return n < 10 ? '0' + n : '' + n; }
  function pad3(n) { return n < 10 ? '00' + n : (n < 100 ? '0' + n : '' + n); }

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
  function createMatch(mode) {
    var seed = mode === 'daily' ? todaySeed() : Math.floor(Math.random() * 0x7fffffff);
    var rng = mulberry32(seed);
    var allKicks = shuffle(pools.kicks, rng);
    var allBreakaways = shuffle(pools.breakaways, rng);
    return {
      mode: mode,
      seed: seed,
      dailyNumber: mode === 'daily' ? dailyNumber() : null,
      kicks: allKicks.slice(0, KICKS_PER_HALF),
      breakaways: allBreakaways.slice(0, KICKS_PER_HALF),
      remainingKicks: allKicks.slice(KICKS_PER_HALF),
      remainingBreakaways: allBreakaways.slice(KICKS_PER_HALF),
      rng: rng,
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

  // ===== HUD (scoreline + counter) =====
  function renderHud() {
    var youScore = sum(match.you) + sum(match.sdYou);
    var themScore = sum(match.them) + sum(match.sdThem);
    var hud = el('div', { class: 'sh-scoreline' }, [
      pipBlock('YOU', match.you, match.sdYou, youScore),
      pipBlock('GK',  match.them, match.sdThem, themScore),
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
  function showReveal(kind, explanation, done) {
    var word = kind === 'goal' ? 'GOAL!' : 'SAVED!';
    var cls = kind === 'goal' ? 'sh-reveal sh-reveal-goal' : 'sh-reveal sh-reveal-saved';
    var overlay = el('div', { class: cls }, [
      el('span', { class: 'sh-reveal-word', text: word }),
      explanation ? el('div', { class: 'sh-reveal-explain', text: explanation }) : null,
    ]);
    root.appendChild(overlay);
    setTimeout(function () {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      done();
    }, REVEAL_MS + 350); // hold the explanation briefly past the flash
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
    var dailyDone = store.daily.lastPlayedDate === todayUtcKey() && store.daily.todayResult;

    var dailyBtn = el('button', {
      class: 'sh-mode-btn' + (dailyDone ? ' is-disabled' : ''),
      type: 'button',
    }, [
      el('span', { text: dailyDone ? "Today's Shootout · played" : "Today's Shootout" }),
      el('span', {
        class: 'sh-mode-btn-sub',
        text: dailyDone
          ? 'Today: ' + scoreString(store.daily.todayResult) + ' ' + (store.daily.todayResult.won ? 'W' : 'L') + '. Back tomorrow.'
          : 'Same cards for everyone playing today. Daily #' + pad3(dailyNumber()) + '.',
      }),
    ]);
    if (!dailyDone) {
      dailyBtn.addEventListener('click', function () { startMatch('daily'); });
    } else {
      dailyBtn.addEventListener('click', function () { showReplayResult(store.daily.todayResult); });
    }

    var hasPracticePb = store.practice.totalPlays > 0 && (store.practice.personalBest.you > 0 || store.practice.personalBest.them > 0);
    var practiceSub = hasPracticePb
      ? 'Random cards. Unlimited plays. Best: ' + store.practice.personalBest.you + '-' + store.practice.personalBest.them + '.'
      : 'Random cards. Unlimited plays. Warm up here.';
    var practiceBtn = el('button', { class: 'sh-mode-btn', type: 'button' }, [
      el('span', { text: 'Practice' }),
      el('span', { class: 'sh-mode-btn-sub', text: practiceSub }),
    ]);
    practiceBtn.addEventListener('click', function () { startMatch('practice'); });

    var hasPlayed = !!store.daily.lastPlayedDate || store.practice.totalPlays > 0;
    var stats = hasPlayed ? el('div', { class: 'sh-start-stats' }, [
      el('span', { html: 'Daily streak <span>' + store.daily.currentStreak + '</span>' }),
      el('span', { html: 'Best <span>' + store.daily.longestStreak + '</span>' }),
      el('span', { html: 'Practice wins <span>' + store.practice.totalWins + '/' + store.practice.totalPlays + '</span>' }),
    ]) : null;

    var screen = el('div', { class: 'screen screen-start' }, [
      startHeroSvg(),
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
      el('div', { class: 'sh-mode-btns' }, [dailyBtn, practiceBtn]),
      stats,
    ]);
    root.appendChild(screen);
  }

  function startHeroSvg() {
    // System soccer-ball emoji at hero size. Renders as the platform's own crafted glyph
    // (3D-shaded ball on iOS/macOS, equivalent on Android/Windows). No SVG to break.
    return el('div', { class: 'sh-start-hero', 'aria-hidden': 'true', text: '⚽' });
  }
  function scoreString(result) {
    return sum(result.you || []) + sum(result.sd || []) + '-' +
      sum(result.them || []) + sum(result.sdThem || []);
  }
  function showReplayResult(todayResult) {
    // Synthesize a finished match shape from the stored result so the result screen renders.
    match = {
      mode: 'daily',
      dailyNumber: dailyNumber(),
      you: todayResult.you || [],
      them: todayResult.them || [],
      sdYou: todayResult.sd || [],
      sdThem: todayResult.sdThem || [],
      step: KICKS_PER_HALF,
      sdRound: (todayResult.sd || []).length,
      phase: 'result',
      result: todayResult.won ? 'W' : 'L',
    };
    renderResult({ alreadyPlayed: true });
  }

  // ===== Match flow =====
  function startMatch(mode) {
    match = createMatch(mode);
    match.phase = 'your';
    renderYourKick();
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
    showReveal(goal ? 'goal' : 'saved', kick.explanation, function () {
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

    rowTiles.forEach(function (tile) {
      tile.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        if (resolved) return;
        var isImposter = tile.dataset.imposter === 'true';
        finish(isImposter ? 'saved' : 'goal', tile);
      }, { passive: false });
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
    showReveal(kind === 'goal' ? 'goal' : 'saved', bk.explanation, function () {
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
    persistMatch();
    renderResult({ alreadyPlayed: false });
  }
  function persistMatch() {
    var store = Storage.load();
    var won = match.result === 'W';
    if (match.mode === 'daily') {
      store.daily.lastPlayedDate = todayUtcKey();
      store.daily.todayResult = {
        won: won,
        you: match.you.slice(),
        them: match.them.slice(),
        sd: match.sdYou.slice(),
        sdThem: match.sdThem.slice(),
      };
      if (won) {
        store.daily.currentStreak += 1;
        if (store.daily.currentStreak > store.daily.longestStreak) {
          store.daily.longestStreak = store.daily.currentStreak;
        }
      } else {
        store.daily.currentStreak = 0;
      }
    } else {
      store.practice.totalPlays += 1;
      if (won) store.practice.totalWins += 1;
      var yourScore = sum(match.you) + sum(match.sdYou);
      var themScore = sum(match.them) + sum(match.sdThem);
      var pb = store.practice.personalBest;
      // PB defined as best (your-score, then lowest opponent score).
      if (yourScore > pb.you || (yourScore === pb.you && themScore < pb.them)) {
        store.practice.personalBest = { you: yourScore, them: themScore };
      }
    }
    Storage.save(store);
  }

  function renderResult(opts) {
    clearRoot();
    var youScore = sum(match.you) + sum(match.sdYou);
    var themScore = sum(match.them) + sum(match.sdThem);
    var won = match.result === 'W' || (match.result === null && youScore > themScore);
    var store = Storage.load();

    var verdict = el('h1', {
      class: 'sh-result-verdict ' + (won ? 'is-win' : 'is-loss'),
      text: won ? 'WIN' : 'LOSS',
    });
    var scoreLine = el('div', { class: 'sh-result-score', text: youScore + ' - ' + themScore });

    var grid = buildShareGridDom();
    var stats = match.mode === 'daily'
      ? el('div', { class: 'sh-result-stats' }, [
          el('span', { html: 'Streak <strong>' + store.daily.currentStreak + '</strong>' }),
          el('span', { html: 'Best <strong>' + store.daily.longestStreak + '</strong>' }),
        ])
      : el('div', { class: 'sh-result-stats' }, [
          el('span', { html: 'PB <strong>' + store.practice.personalBest.you + '-' + store.practice.personalBest.them + '</strong>' }),
          el('span', { html: 'Wins <strong>' + store.practice.totalWins + '/' + store.practice.totalPlays + '</strong>' }),
        ]);

    var rematchBtn;
    if (match.mode === 'daily' && opts.alreadyPlayed) {
      rematchBtn = el('button', {
        class: 'sh-rematch is-disabled',
        type: 'button',
        text: 'Daily played · back tomorrow',
      });
    } else if (match.mode === 'daily') {
      rematchBtn = el('button', {
        class: 'sh-rematch is-disabled',
        type: 'button',
        text: 'Come back tomorrow',
      });
    } else {
      rematchBtn = el('button', { class: 'sh-rematch', type: 'button', text: 'Rematch' });
      rematchBtn.addEventListener('click', function () { startMatch('practice'); });
    }

    var shareBtn = el('button', { class: 'sh-share', type: 'button', text: 'Share result' });
    shareBtn.addEventListener('click', function () { copyShare(shareBtn); });

    var backBtn = el('button', { class: 'sh-share', type: 'button', text: '← Back to start' });
    backBtn.addEventListener('click', function () { renderStart(); });

    var actions = el('div', { class: 'sh-result-actions' }, [rematchBtn, shareBtn, backBtn]);

    var crossLinks = el('div', { class: 'sh-result-crosslinks' }, [
      el('a', { href: '/streaming', text: 'Watching a match today? · Pick a stream' }),
      el('a', { href: '/watch-parties', text: 'Find a watch party near you' }),
    ]);

    var notice = match.mode === 'daily'
      ? el('p', { class: 'sh-daily-notice', text: 'Daily #' + pad3(match.dailyNumber) + ' · same cards for everyone playing today.' })
      : null;

    var screen = el('div', { class: 'screen screen-result' }, [
      verdict, scoreLine, grid, stats, actions, crossLinks, notice,
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
        el('span', { class: 'grid-label', text: 'GK' }),
        el('span', { text: themRow }),
      ]),
    ]);
  }
  function emoji(v) { return v === 1 ? '⚽' : '❌'; }

  function buildShareText() {
    var youScore = sum(match.you) + sum(match.sdYou);
    var themScore = sum(match.them) + sum(match.sdThem);
    var won = youScore > themScore;
    var youRow = match.you.map(emoji).concat(match.sdYou.map(emoji)).join('');
    var themRow = match.them.map(emoji).concat(match.sdThem.map(emoji)).join('');
    var store = Storage.load();
    var lines = [];
    if (match.mode === 'daily') {
      lines.push('Pregame Shootout - Daily #' + pad3(match.dailyNumber));
      lines.push('Final: ' + youScore + '-' + themScore + ' ' + (won ? 'W' : 'L'));
      lines.push('You: ' + youRow);
      lines.push('GK:  ' + themRow);
      lines.push('Streak: ' + store.daily.currentStreak);
    } else {
      lines.push('Pregame Shootout - Practice - best ' +
        store.practice.personalBest.you + '-' + store.practice.personalBest.them + ' W');
      lines.push('This run: ' + youScore + '-' + themScore + ' ' + (won ? 'W' : 'L'));
      lines.push('You: ' + youRow);
      lines.push('GK:  ' + themRow);
    }
    lines.push('wc26pregame.com');
    return lines.join('\n');
  }

  function copyShare(btn) {
    var text = buildShareText();
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
