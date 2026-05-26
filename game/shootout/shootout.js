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
  // Session-scoped used-card tracking — avoids repeating any card within a session.
  // Persists across matches in the same session, regardless of win/loss. Resets
  // on page refresh. When a tier is fully exhausted, the relevant set wraps.
  var sessionUsed = { kicks: new Set(), breakaways: new Set() };

  // ===== Streak-aware difficulty + narrative =====
  // Weights are easy/medium/hard percentages (sum 100). As the player's session
  // streak grows, the deck biases toward harder cards. Cards are still drawn
  // randomly within the chosen tier — the streak only shifts the *odds*.
  function streakWeights(streak) {
    if (streak >= 10) return { easy: 5,  medium: 45, hard: 50 };
    if (streak >= 6)  return { easy: 15, medium: 50, hard: 35 };
    if (streak >= 3)  return { easy: 35, medium: 50, hard: 15 };
    return { easy: 70, medium: 25, hard: 5 };
  }
  // Chip label shown when difficulty has visibly shifted. Null below streak 3.
  function streakChip(streak) {
    if (streak >= 10) return 'Boss mode';
    if (streak >= 6)  return 'Hot pile';
    if (streak >= 3)  return 'Heating up';
    return null;
  }
  // Per-match-win narrative. 2 variants per tier so back-to-back games rotate.
  function streakNarrative(streak, rng) {
    var rand = rng || Math.random;
    if (streak <= 0) return null;
    if (streak > 10) {
      var late = [
        '🔥🔥🔥 ' + streak + ' in a row. Unreal.',
        '🔥🔥🔥 ' + streak + ' straight. Still going.',
      ];
      return late[Math.floor(rand() * late.length)];
    }
    var variants = {
      1:  ['On the board.',                          'First one banked.'],
      2:  ['Two straight. Steady.',                  'Two in a row.'],
      3:  ['🔥 Hat trick. Cards stepping up.',       '🔥 Three. The deck just shifted.'],
      4:  ['🔥 Four. Still going.',                  '🔥 Locked in.'],
      5:  ['🔥 Five deep. No misses.',               "🔥 Five. You're in the zone."],
      6:  ['🔥🔥 Six. Welcome to the hard pile.',     '🔥🔥 Cards getting tougher.'],
      7:  ['🔥🔥 Seven straight. Few get this deep.', "🔥🔥 Don't blink."],
      8:  ['🔥🔥 Eight. Cards are biting back.',      '🔥🔥 The deck is showing teeth.'],
      9:  ['🔥🔥🔥 Almost there. One more.',          '🔥🔥🔥 Nine. Get to double digits.'],
      10: ['🔥🔥🔥 Ten. Legend territory.',           '🔥🔥🔥 Boss mode.'],
    };
    var list = variants[streak];
    return list[Math.floor(rand() * list.length)];
  }
  // Draw one card from a pool, weighted by difficulty for the current streak,
  // avoiding cards already used this session. When a tier is empty, falls
  // through to the next. When the whole pool is exhausted, the used set wraps.
  function drawCardWeighted(poolName, streakAtPick, rng) {
    var pool = pools[poolName];
    var used = sessionUsed[poolName];
    if (!pool || !pool.length) return null;
    var available = pool.filter(function (c) { return !used.has(c.id); });
    if (!available.length) {
      // Whole pool seen this session — wrap. Keep playing infinitely.
      used.clear();
      available = pool;
    }
    var buckets = { easy: [], medium: [], hard: [] };
    available.forEach(function (c) {
      if (buckets[c.difficulty]) buckets[c.difficulty].push(c);
    });
    var w = streakWeights(streakAtPick);
    var r = rng() * 100;
    var tier;
    if (r < w.hard) tier = 'hard';
    else if (r < w.hard + w.medium) tier = 'medium';
    else tier = 'easy';
    // Fallback: if chosen tier is empty (small pool late in session), spiral.
    var order = ['hard', 'medium', 'easy'];
    if (!buckets[tier].length) {
      for (var i = 0; i < order.length; i++) {
        if (buckets[order[i]].length) { tier = order[i]; break; }
      }
    }
    if (!buckets[tier].length) return null;
    var pick = buckets[tier][Math.floor(rng() * buckets[tier].length)];
    used.add(pick.id);
    return pick;
  }

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
  // Cards are drawn on demand by currentKick/currentBreakaway, weighted by the
  // streak frozen at match start. This guarantees a consistent difficulty
  // through the match even if sessionStreak changes (it doesn't mid-match, but
  // the freeze keeps the contract obvious).
  function createMatch() {
    var seed = Math.floor(Math.random() * 0x7fffffff);
    var rng = mulberry32(seed);
    return {
      seed: seed,
      rng: rng,
      streakBefore: sessionStreak,
      streakAfter: sessionStreak,
      streakAtPick: sessionStreak,
      // Per-match card caches keyed by step so re-renders return the same card.
      pickedKicks: [],
      pickedBreakaways: [],
      // SD draws fresh each round; nothing to pre-cache.
      you: [],
      them: [],
      sdYou: [],
      sdThem: [],
      step: 0,
      sdRound: 0,
      phase: 'matchStart',
      result: null,
      narrativeText: null,
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
  // Mode toggle so non-game screens (chooser, result) can grow/scroll past the
  // gameplay-fixed 620px arena. In-game screens leave mode null so the absolute
  // positioning that the tile-fall animation needs stays intact.
  function setRootMode(mode) {
    if (!root) return;
    root.classList.remove('is-chooser', 'is-result');
    if (mode) root.classList.add(mode);
  }
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
    setRootMode('is-chooser');
    var store = Storage.load();

    var playBtn = el('button', { class: 'sh-play-btn', type: 'button' }, [
      el('span', { class: 'sh-play-btn-main', text: sessionStreak > 0 ? 'Keep the streak going' : 'Play Shootout' }),
    ]);
    playBtn.addEventListener('click', function () { startMatch(); });

    // Compact secondary: same shape as primary but tighter padding + smaller
    // type so the chooser fits comfortably on a 700px mobile viewport.
    var firstTouchBtn = el('button', { class: 'sh-play-btn ft-play-secondary ft-play-compact', type: 'button' }, [
      el('span', { class: 'sh-play-btn-main', text: 'Play First Touch' }),
      el('span', { class: 'sh-play-btn-sub', text: 'New to soccer? Start here.' }),
    ]);
    firstTouchBtn.addEventListener('click', function () {
      if (window.PregameFirstTouch && typeof window.PregameFirstTouch.start === 'function') {
        window.PregameFirstTouch.start();
      }
    });

    // Streak panel: shows current run prominently if active, otherwise lifetime best if any.
    var streakPanel = null;
    if (sessionStreak > 0) {
      var liveChildren = [
        el('span', { class: 'sh-streak-flame', text: '🔥' }),
        el('span', { class: 'sh-streak-num', text: String(sessionStreak) }),
        el('span', { class: 'sh-streak-label', text: sessionStreak === 1 ? 'win in a row' : 'wins in a row' }),
      ];
      var chip = streakChip(sessionStreak);
      if (chip) liveChildren.push(el('span', { class: 'sh-streak-chip', text: chip }));
      streakPanel = el('div', { class: 'sh-streak-panel is-live' }, liveChildren);
    } else if (store.longestStreak > 0) {
      streakPanel = el('div', { class: 'sh-streak-panel' }, [
        el('span', { class: 'sh-streak-label', text: 'Best streak this device: ' }),
        el('span', { class: 'sh-streak-num-small', text: String(store.longestStreak) }),
      ]);
    }

    var screen = el('div', { class: 'screen screen-start' }, [
      startHeroEl(),
      el('h1', { class: 'sh-start-title', text: '5 kicks. 5 saves.' }),
      el('p', { class: 'sh-start-intro', text: '10 World Cup trivia questions.' }),
      el('div', { class: 'sh-start-rules' }, [
        el('p', { class: 'sh-rule-line' }, [
          el('strong', { text: 'Your 5 kicks:' }),
          document.createTextNode(' TRUE or FALSE on a World Cup question. Correct = goal.'),
        ]),
        el('p', { class: 'sh-rule-line' }, [
          el('strong', { text: 'Their 5 kicks:' }),
          document.createTextNode(' tap the correct answer. Correct = save.'),
        ]),
        el('p', { class: 'sh-rule-line' }, [
          el('strong', { text: 'Streak bonus:' }),
          document.createTextNode(' the longer your win streak, the tougher the cards.'),
        ]),
      ]),
      streakPanel,
      el('div', { class: 'sh-play-wrap' }, [playBtn, firstTouchBtn]),
    ]);
    root.appendChild(screen);
  }

  function startHeroEl() {
    // System soccer-ball emoji at hero size. Platform-native glyph, no custom SVG.
    return el('div', { class: 'sh-start-hero', 'aria-hidden': 'true', text: '⚽' });
  }

  // ===== Match flow =====
  function startMatch() {
    // Reset body scroll BEFORE rendering. The previous result screen runs in
    // is-result mode (flex column, overflow-y: auto) which lets the arena
    // grow past 600px when the share grid + actions + cross-links + best-line
    // stack tall. The body scrolls to accommodate. Without this reset, the
    // new match's gameplay arena (which renders in absolute coordinates
    // relative to game-root) lands with its HUD + kick-counter hidden behind
    // the sticky header, since the body is still scrolled to where the user
    // ended up on the result screen. Reproduced on iPhone 13 Pro 2026-05-25.
    scrollToArena();
    match = createMatch();
    match.phase = 'your';
    renderYourKick();
  }

  function scrollToArena() {
    if (typeof window === 'undefined' || typeof window.scrollTo !== 'function') return;
    try { window.scrollTo({ top: 0, behavior: 'auto' }); }
    catch (_e) { window.scrollTo(0, 0); }
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
    setRootMode(null);
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
    // Check the math after recording the kick. If the game is already won/lost,
    // we'll still play the reveal flash for this kick (the player deserves to
    // see why they were right or wrong), then skip straight to the result.
    var decided = regulationDecision();
    // On your kick: scored = correct, missed = wrong.
    showReveal(goal ? 'You scored' : 'You missed', goal, kick.explanation, function () {
      if (decided) {
        showBanner('GAME OVER', 'No need for the rest', function () { finishMatch(decided); });
        return;
      }
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
    setRootMode(null);
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
    // Same math check — after their kick, if the game is decided, jump straight
    // to result after the reveal rather than advancing to the next round.
    var decided = regulationDecision();
    // On their kick: saved = correct, they-scored = wrong.
    showReveal(kind === 'saved' ? 'You saved it' : 'They scored', kind === 'saved', bk.explanation, function () {
      if (decided) {
        showBanner('GAME OVER', 'No need for the rest', function () { finishMatch(decided); });
        return;
      }
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

  // Real-shootout rule: end regulation the moment the score is mathematically
  // decided. If my lead exceeds your remaining kicks (or vice versa), the
  // remaining cards aren't dealt — same as a keeper celebrating with kicks
  // still on the docket. SD is excluded (each SD round is already one-shot).
  // Returns 'W', 'L', or null if regulation should continue.
  function regulationDecision() {
    if (match.phase === 'sd-your' || match.phase === 'sd-their' || match.sdRound > 0) {
      return null;
    }
    var youScore = sum(match.you);
    var themScore = sum(match.them);
    var yourRem = KICKS_PER_HALF - match.you.length;
    var theirRem = KICKS_PER_HALF - match.them.length;
    if (youScore > themScore + theirRem) return 'W';
    if (themScore > youScore + yourRem) return 'L';
    return null;
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
    // SD draws a fresh weighted card each round; nothing to cache (each SD round
    // is a single attempt and resolveYourKick reads the card via closure).
    if (match.phase === 'sd-your') {
      return drawCardWeighted('kicks', match.streakAtPick, match.rng);
    }
    // Regular round: cache so re-renders return the same card.
    if (!match.pickedKicks[match.step]) {
      var card = drawCardWeighted('kicks', match.streakAtPick, match.rng);
      if (card) match.pickedKicks[match.step] = card;
    }
    return match.pickedKicks[match.step] || null;
  }
  function currentBreakaway() {
    if (match.phase === 'sd-their') {
      return drawCardWeighted('breakaways', match.streakAtPick, match.rng);
    }
    if (!match.pickedBreakaways[match.step]) {
      var card = drawCardWeighted('breakaways', match.streakAtPick, match.rng);
      if (card) match.pickedBreakaways[match.step] = card;
    }
    return match.pickedBreakaways[match.step] || null;
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
    // Pick the narrative once at match end so re-renders show the same line.
    match.narrativeText = result === 'W' ? streakNarrative(sessionStreak, match.rng) : null;
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
    setRootMode('is-result');
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

    // Streak status: on a win, lead with the per-streak narrative (e.g. "🔥 Three.
    // The deck just shifted.") and follow with the bare stat. Adds the tier chip
    // when difficulty has visibly shifted (streak >= 3). On loss with a prior
    // run, keep the existing "Streak ended at X" surface.
    var streakLine = null;
    if (won) {
      var statText = match.streakAfter + (match.streakAfter === 1 ? ' win in a row' : ' wins in a row');
      var chip = streakChip(match.streakAfter);
      var statChildren = [el('span', { class: 'sh-streak-stat-text', text: statText })];
      if (chip) statChildren.push(el('span', { class: 'sh-streak-chip', text: chip }));
      var children = [];
      if (match.narrativeText) {
        children.push(el('div', { class: 'sh-streak-narrative', text: match.narrativeText }));
      }
      children.push(el('div', { class: 'sh-streak-stat' }, statChildren));
      streakLine = el('div', { class: 'sh-streak-line is-live' }, children);
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
    lines.push(''); // blank line between header block and score
    lines.push('Final: ' + youScore + '-' + themScore + ' ' + (won ? 'W' : 'L'));
    lines.push(''); // blank line before the play-by-play emoji rows
    // "Me" reads correctly from the recipient's perspective; "They" stays neutral third-person.
    // Spacing after the label is tuned so the emoji columns align (Me:[3sp] vs They:[1sp] = both 6 chars).
    lines.push('Me:   ' + youRow);
    lines.push('They: ' + themRow);
    lines.push(''); // blank line before the call-to-action
    // Deep-link to the shootout so recipients land on the game, not the home page.
    // ?source=share lets you see in analytics how many sessions came from a shared card.
    lines.push('Your turn → wc26pregame.com/game/shootout?source=share');
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

  // Public surface for cross-engine handoff (First Touch chooser CTA + back-to-start).
  window.PregameShootout = {
    renderStart: function () { if (root) renderStart(); },
    startMatch: function () { if (pools.kicks && pools.breakaways) startMatch(); },
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
