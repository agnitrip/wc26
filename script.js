// Pregame — streaming quiz + countdown
// Vanilla JS, no dependencies. Reads TEAMS from window.WC26_DATA (schedule-data.js).

(function () {
  'use strict';

  // ----- Days to kickoff -----
  function updateCountdown() {
    var el = document.getElementById('countdown');
    if (!el) return;
    var kickoff = new Date('2026-06-11T18:00:00Z');
    var now = new Date();
    var msPerDay = 1000 * 60 * 60 * 24;
    var days = Math.floor((kickoff - now) / msPerDay);
    if (days > 1) {
      el.textContent = 'June 11 to July 19, 2026 · ' + days + ' days to kickoff';
    } else if (days === 1) {
      el.textContent = 'Kicks off tomorrow';
    } else if (days === 0) {
      el.textContent = 'Live today';
    } else if (days >= -38) {
      el.textContent = 'Tournament underway · ends July 19';
    } else {
      el.textContent = 'June 11 to July 19, 2026';
    }
  }

  // ----- Services catalogue -----
  // Each service has: name, price (display), monthlyPrice (number for math),
  // blurb (generic why), cancelPath (steps to cancel, or null for free),
  // canCancel (whether to surface cancel-reminder button).
  var SERVICES = {
    ota: {
      name: 'OTA antenna + Tubi',
      price: 'Free',
      monthlyPrice: 0,
      antennaCost: 30,
      blurb: 'Plug a $30 antenna into your TV. FOX broadcasts most matches free over the air. Use Tubi for the opener.',
      cancelPath: null,
      canCancel: false,
    },
    otaSpanish: {
      name: 'OTA Telemundo',
      price: 'Free',
      monthlyPrice: 0,
      antennaCost: 30,
      blurb: 'Telemundo broadcasts free over the air with an antenna. Spanish commentary, no monthly bill.',
      cancelPath: null,
      canCancel: false,
    },
    sling: {
      name: 'Sling Blue',
      price: '~$45/mo',
      monthlyPrice: 45,
      blurb: 'The cheapest streaming bundle that carries FOX, FS1, and Telemundo. Cancel after July 19 and you are done.',
      cancelPath: 'Sling → Account → Cancel Subscription. You keep access through the end of your billing cycle.',
      canCancel: true,
    },
    fubo: {
      name: 'Fubo',
      price: '~$80/mo',
      monthlyPrice: 80,
      blurb: 'The only consumer bundle with customizable multi-view across 4 games on one screen. Perfect for group-stage final days.',
      cancelPath: 'Fubo → Profile → My Account → Subscription → Cancel. Access continues through paid period.',
      canCancel: true,
    },
    fuboPremium: {
      name: 'Fubo, top tier',
      price: '~$100/mo',
      monthlyPrice: 100,
      blurb: 'Every match, 4K where available, plus 4-game multi-view. The most generous option.',
      cancelPath: 'Fubo → Profile → My Account → Subscription → Cancel. Access continues through paid period.',
      canCancel: true,
    },
    youtubeTV: {
      name: 'YouTube TV',
      price: '~$83/mo',
      monthlyPrice: 83,
      blurb: 'Best picture quality, 4K on select matches, and 4-stream multi-view on the TV app (not browser).',
      cancelPath: 'YouTube TV → Settings → Membership → Manage → Pause or cancel membership.',
      canCancel: true,
    },
    peacock: {
      name: 'Peacock Premium',
      price: '~$8/mo',
      monthlyPrice: 8,
      blurb: "Telemundo's 92 matches streaming on demand. Cheapest path to full Spanish coverage.",
      cancelPath: 'Peacock → Account → Plans → Cancel Plan. Access continues through paid period.',
      canCancel: true,
    },
  };

  // ----- Team language hint -----
  // Teams whose primary commentary in the US would naturally lean Spanish.
  var SPANISH_LEANING = {
    MEX: 1, ESP: 1, ARG: 1, COL: 1, ECU: 1, URU: 1, PAR: 1, CRC: 1, PAN: 1, HON: 1,
  };
  function picksHaveSpanishLean(teams) {
    return teams.some(function (code) { return SPANISH_LEANING[code]; });
  }

  // ----- Recommendation -----
  function recommend(a) {
    var teams = a.teams || [];
    var hasSpanishLean = picksHaveSpanishLean(teams);

    // If user said "either" but picked a Spanish-leaning team, promote Spanish path
    var effLang = a.lang;
    if (a.lang === 'either' && hasSpanishLean) effLang = 'spanish';

    // Spanish-preferred
    if (effLang === 'spanish') {
      if (a.budget === 'free') return { primary: 'otaSpanish', alts: ['peacock'] };
      if (a.budget === 'premium') return { primary: 'peacock', alts: ['fubo', 'youtubeTV'] };
      return { primary: 'peacock', alts: ['otaSpanish', 'sling'] };
    }

    // Free budget
    if (a.budget === 'free') {
      return { primary: 'ota', alts: ['otaSpanish'] };
    }

    // Lighter coverage = don't pay much
    if (a.coverage === 'opener') {
      if (a.budget === 'cheap') return { primary: 'ota', alts: ['sling'] };
      return { primary: 'sling', alts: ['ota', 'youtubeTV'] };
    }

    if (a.coverage === 'marquee') {
      if (a.budget === 'cheap') return { primary: 'sling', alts: ['ota'] };
      return { primary: 'youtubeTV', alts: ['sling', 'fubo'] };
    }

    // All 104
    if (a.coverage === 'all') {
      if (a.multiview === 'yes') {
        if (a.budget === 'premium') return { primary: 'fuboPremium', alts: ['youtubeTV'] };
        return { primary: 'fubo', alts: ['youtubeTV', 'sling'] };
      }
      if (a.budget === 'cheap') return { primary: 'sling', alts: ['fubo', 'youtubeTV'] };
      if (a.budget === 'premium') return { primary: 'youtubeTV', alts: ['fubo', 'sling'] };
    }

    return { primary: 'sling', alts: ['ota', 'fubo'] };
  }

  // ----- Team-aware reasoning -----
  function teamsLabel(teams, TEAMS) {
    if (!teams || !teams.length) return '';
    var names = teams.map(function (code) {
      return (TEAMS[code] && TEAMS[code].name) || code;
    });
    if (names.length === 1) return names[0];
    if (names.length === 2) return names[0] + ' and ' + names[1];
    return names.slice(0, -1).join(', ') + ', and ' + names[names.length - 1];
  }

  function teamAddendum(serviceId, teams, lang, TEAMS) {
    if (!teams || !teams.length) return '';
    var label = teamsLabel(teams, TEAMS);
    var spanish = picksHaveSpanishLean(teams);

    if (serviceId === 'peacock') {
      return ' For ' + label + ', Telemundo carries the full Spanish-language schedule on Peacock.';
    }
    if (serviceId === 'otaSpanish') {
      return ' Telemundo airs ' + label + (teams.length > 1 ? ' matches' : "'s matches") + ' in Spanish, free with an antenna.';
    }
    if (serviceId === 'ota') {
      if (spanish) return ' You will catch ' + label + ' on FOX where matches air there. For Telemundo (Spanish) matches, also tune in via the antenna.';
      return ' FOX broadcasts most ' + label + ' matches free over the air.';
    }
    if (serviceId === 'sling') {
      return ' Sling Blue carries both FOX (English) and Telemundo (Spanish), so you get ' + label + ' matches in whichever language you prefer.';
    }
    if (serviceId === 'fubo' || serviceId === 'fuboPremium') {
      return ' Covers every ' + label + ' match in English and Spanish. Multi-view is useful on group-stage final days.';
    }
    if (serviceId === 'youtubeTV') {
      return ' Covers every ' + label + ' match in English (FOX) and Spanish (Telemundo).';
    }
    return '';
  }

  // ----- Total cost across tournament -----
  function totalCostNote(svc) {
    if (svc.monthlyPrice === 0) {
      if (svc.antennaCost) return 'One-time antenna cost (~$' + svc.antennaCost + '). No monthly fees.';
      return 'Free. No monthly fees.';
    }
    var twoMonths = svc.monthlyPrice * 2;
    return 'About $' + twoMonths + ' total if you cancel after the Final (July 19). The headline $' + svc.monthlyPrice + '/mo bills twice over the 39-day tournament.';
  }

  // ----- Tradeoff line -----
  function tradeoffLine(serviceId, a) {
    if (serviceId === 'ota') {
      return 'You miss matches that air on FS1 (cable-only). Most matches are on free FOX, but a handful of group-stage games are FS1-only.';
    }
    if (serviceId === 'otaSpanish') {
      return 'English commentary not included. If you want English too, add OTA FOX (same antenna) or Sling Blue.';
    }
    if (serviceId === 'peacock') {
      return 'Spanish-only commentary. If English matters for some matches, see Sling Blue in the alternates.';
    }
    if (serviceId === 'sling') {
      if (a.multiview === 'yes') return 'Multi-view is limited on Sling. If you want true 4-game simultaneous viewing, see Fubo in the alternates.';
      return 'No 4K on Sling Blue. If picture quality matters, see YouTube TV or Fubo in the alternates.';
    }
    if (serviceId === 'youtubeTV') {
      return 'Multi-view works on the TV app only, not the browser. If you usually watch on a laptop, Fubo handles multi-view across devices.';
    }
    if (serviceId === 'fubo') {
      return 'Costs more than Sling Blue. The premium is the multi-view feature; if you do not need it, Sling covers the same channels for half the price.';
    }
    if (serviceId === 'fuboPremium') {
      return 'Premium tier is significantly pricier than the base Fubo. The premium add is 4K on more matches; base Fubo still has multi-view.';
    }
    return '';
  }

  // ----- ICS calendar generation -----
  function pad2(n) { return n < 10 ? '0' + n : '' + n; }
  function icsDate(d) {
    return d.getUTCFullYear() + pad2(d.getUTCMonth() + 1) + pad2(d.getUTCDate()) +
      'T' + pad2(d.getUTCHours()) + pad2(d.getUTCMinutes()) + '00Z';
  }
  function downloadCancelReminder(serviceId) {
    var svc = SERVICES[serviceId];
    if (!svc || !svc.canCancel) return;
    var start = new Date('2026-06-20T17:00:00Z'); // 10am Pacific / 1pm Eastern
    var end = new Date(start.getTime() + 30 * 60 * 1000);
    var title = 'Cancel ' + svc.name + ' subscription';
    var desc = 'The WC Final is in 29 days. Cancel now to avoid the next auto-renewal charge.\\n\\nHow to cancel: ' + (svc.cancelPath || 'Open the service app and find Account or Subscription settings.') + '\\n\\nMost services keep your access through the end of the current billing period, so canceling now still preserves access through the knockouts and the Final.\\n\\nVia Pregame (wc26-jade.vercel.app)';
    var uid = 'wc26-cancel-' + serviceId + '@wc26-jade.vercel.app';
    var lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Pregame//EN',
      'BEGIN:VEVENT',
      'UID:' + uid,
      'DTSTAMP:' + icsDate(new Date()),
      'DTSTART:' + icsDate(start),
      'DTEND:' + icsDate(end),
      'SUMMARY:' + title,
      'DESCRIPTION:' + desc,
      'BEGIN:VALARM',
      'TRIGGER:-PT30M',
      'ACTION:DISPLAY',
      'DESCRIPTION:' + title,
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR',
    ];
    var blob = new Blob([lines.join('\r\n')], { type: 'text/calendar' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'wc26-cancel-' + serviceId + '.ics';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 100);
  }

  // ----- Quiz state -----
  var state = {
    stance: null, // 'all' | 'one' | 'few'
    teams: [], // array of team codes
    lang: null,
    coverage: null,
    budget: null,
    multiview: null,
  };
  var step = 1; // 1..6

  function getPath() {
    // Returns the active step IDs based on stance + coverage choices.
    var path = ['stance'];
    if (state.stance === 'one' || state.stance === 'few') path.push('teams');
    path.push('lang', 'coverage', 'budget');
    if (state.coverage === 'all') path.push('multiview');
    return path;
  }

  function currentStepKey() {
    return getPath()[step - 1];
  }

  function maxStep() {
    return getPath().length;
  }

  function renderProgress() {
    var path = getPath();
    var html = '';
    for (var i = 0; i < path.length; i++) {
      var cls = 'dot';
      if (i + 1 === step) cls += ' active';
      if (i + 1 < step) cls += ' done';
      html += '<span class="' + cls + '"></span>';
    }
    document.getElementById('quiz-progress').innerHTML = html;
  }

  function showStep(n) {
    step = n;
    var key = currentStepKey();
    var questions = document.querySelectorAll('.question');
    questions.forEach(function (q) {
      q.classList.toggle('active', q.getAttribute('data-key') === key);
    });
    renderProgress();
    var back = document.getElementById('back-btn');
    if (back) back.hidden = step === 1;

    // Special: teams step needs to re-render based on stance
    if (key === 'teams') renderTeamsQuestion();
  }

  function loadTeamsFromStorage() {
    try {
      var saved = JSON.parse(localStorage.getItem('wc26_teams') || '[]');
      if (Array.isArray(saved) && saved.length > 0) {
        state.teams = saved.slice();
        // Infer stance from team count
        if (!state.stance) state.stance = state.teams.length === 1 ? 'one' : 'few';
      }
    } catch (e) { /* ignore */ }
  }

  function saveTeamsToStorage() {
    try {
      localStorage.setItem('wc26_teams', JSON.stringify(state.teams));
    } catch (e) { /* ignore */ }
  }

  // ----- Teams question rendering -----
  function getTeamsData() {
    var data = window.WC26_DATA;
    if (!data || !data.TEAMS) return null;
    return data.TEAMS;
  }

  function renderTeamsQuestion() {
    var TEAMS = getTeamsData();
    if (!TEAMS) return;
    var multi = state.stance === 'few';
    var helpText = multi
      ? 'Pick all the teams you follow. You can change this anytime.'
      : 'Pick the team you follow.';
    var html =
      '<div class="q-icon" aria-hidden="true">⭐</div>' +
      '<h2 class="q-title">' + (multi ? 'Which teams do you follow?' : 'Which team do you follow?') + '</h2>' +
      '<p class="q-note">' + helpText + '</p>' +
      '<div class="quiz-team-picker">' +
        '<input type="search" id="quiz-team-search" placeholder="Search teams..." autocomplete="off">' +
        '<div id="quiz-team-list" class="quiz-team-list"></div>' +
        (multi ? '<button class="answer continue-btn" id="quiz-team-continue" disabled>Continue with ' + state.teams.length + ' team(s)</button>' : '') +
      '</div>';
    var q = document.querySelector('.question[data-key="teams"]');
    q.innerHTML = html;
    renderTeamsList('');

    var search = document.getElementById('quiz-team-search');
    if (search) {
      search.addEventListener('input', function () { renderTeamsList(search.value); });
    }
    if (multi) {
      var cont = document.getElementById('quiz-team-continue');
      cont.disabled = state.teams.length === 0;
      cont.addEventListener('click', function () {
        if (state.teams.length === 0) return;
        saveTeamsToStorage();
        advance();
      });
    }
  }

  function renderTeamsList(filter) {
    var TEAMS = getTeamsData();
    if (!TEAMS) return;
    var multi = state.stance === 'few';
    var entries = Object.keys(TEAMS).map(function (code) {
      return { code: code, name: TEAMS[code].name, flag: TEAMS[code].flag };
    }).filter(function (t) {
      if (!filter) return true;
      return t.name.toLowerCase().indexOf(filter.toLowerCase()) !== -1 ||
             t.code.toLowerCase().indexOf(filter.toLowerCase()) !== -1;
    }).sort(function (a, b) { return a.name.localeCompare(b.name); });

    var list = document.getElementById('quiz-team-list');
    list.innerHTML = entries.map(function (t) {
      var checked = state.teams.indexOf(t.code) !== -1;
      var cls = 'quiz-team-item' + (checked ? ' checked' : '');
      return '<button class="' + cls + '" data-code="' + t.code + '">' +
        '<span class="team-flag">' + t.flag + '</span> ' + t.name +
        (checked ? ' <span class="check">✓</span>' : '') +
        '</button>';
    }).join('');

    list.querySelectorAll('.quiz-team-item').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var code = btn.getAttribute('data-code');
        if (multi) {
          var i = state.teams.indexOf(code);
          if (i === -1) state.teams.push(code);
          else state.teams.splice(i, 1);
          renderTeamsList(document.getElementById('quiz-team-search').value);
          var cont = document.getElementById('quiz-team-continue');
          if (cont) {
            cont.disabled = state.teams.length === 0;
            cont.textContent = 'Continue with ' + state.teams.length + ' team' + (state.teams.length === 1 ? '' : 's');
          }
        } else {
          state.teams = [code];
          saveTeamsToStorage();
          advance();
        }
      });
    });
  }

  // ----- Advance / back -----
  function advance(key, value) {
    if (key) state[key] = value;
    if (step >= maxStep()) {
      showResult();
      return;
    }
    showStep(step + 1);
  }

  function back() {
    if (step <= 1) return;
    // Clear answer for current step
    var key = currentStepKey();
    if (key === 'teams') state.teams = [];
    else state[key] = null;
    showStep(step - 1);
  }

  // ----- Result -----
  function renderAltCard(serviceId) {
    var s = SERVICES[serviceId];
    if (!s) return '';
    return '<div class="alt-card">' +
      '<div class="alt-name">' + s.name + '</div>' +
      '<div class="alt-price">' + s.price + '</div>' +
      '</div>';
  }

  function showResult() {
    var TEAMS = getTeamsData() || {};
    var pick = recommend(state);
    var primary = SERVICES[pick.primary];

    // Headline
    document.getElementById('result-name').textContent = primary.name;
    document.getElementById('result-price').textContent = primary.price;

    // Why (blurb + team addendum)
    var why = primary.blurb + teamAddendum(pick.primary, state.teams, state.lang, TEAMS);
    document.getElementById('result-why').textContent = why;

    // Total cost
    var costEl = document.getElementById('result-total-cost');
    costEl.textContent = totalCostNote(primary);

    // Cancel section
    var cancelSection = document.getElementById('result-cancel-section');
    if (primary.canCancel && primary.cancelPath) {
      cancelSection.hidden = false;
      document.getElementById('result-cancel-path').textContent = primary.cancelPath;
      var btn = document.getElementById('result-cancel-btn');
      btn.onclick = function () { downloadCancelReminder(pick.primary); };
    } else {
      cancelSection.hidden = true;
    }

    // Tradeoff
    var tradeoff = tradeoffLine(pick.primary, state);
    var tradeoffEl = document.getElementById('result-tradeoff');
    var tradeoffSection = document.getElementById('result-tradeoff-section');
    if (tradeoff) {
      tradeoffSection.hidden = false;
      tradeoffEl.textContent = tradeoff;
    } else {
      tradeoffSection.hidden = true;
    }

    // Alternates
    var altsHtml = '';
    if (pick.alts && pick.alts.length) {
      altsHtml = '<div class="alts-label">Also consider</div>' +
        '<div class="alts-grid">' +
        pick.alts.map(renderAltCard).join('') +
        '</div>';
    }
    document.getElementById('result-alts').innerHTML = altsHtml;

    document.getElementById('quiz').hidden = true;
    document.getElementById('result').hidden = false;
  }

  function reset() {
    state.stance = null;
    state.teams = [];
    state.lang = null;
    state.coverage = null;
    state.budget = null;
    state.multiview = null;
    step = 1;
    document.getElementById('result').hidden = true;
    document.getElementById('quiz').hidden = false;
    loadTeamsFromStorage();
    showStep(1);
    document.getElementById('quiz').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ----- Wire up -----
  document.addEventListener('DOMContentLoaded', function () {
    updateCountdown();
    loadTeamsFromStorage();

    // Stance & answer buttons (non-team questions)
    document.querySelectorAll('.answer').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (btn.classList.contains('continue-btn')) return;
        var q = btn.closest('.question');
        var key = q.getAttribute('data-key');
        var value = btn.getAttribute('data-value');
        if (key === 'stance') {
          state.stance = value;
          if (value === 'all') {
            state.teams = [];
            saveTeamsToStorage();
          }
        }
        advance(key, value);
      });
    });

    var backBtn = document.getElementById('back-btn');
    if (backBtn) backBtn.addEventListener('click', back);

    var retakeBtn = document.getElementById('retake-btn');
    if (retakeBtn) retakeBtn.addEventListener('click', reset);

    showStep(1);
  });
})();
