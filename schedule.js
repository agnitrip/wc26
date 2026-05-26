// WC26 Pregame — schedule page logic
// Vanilla JS, no dependencies. Reads from window.WC26_DATA (schedule-data.js).

(function () {
  'use strict';

  // ----- Time zone catalogue -----
  var ZONES = [
    { id: 'auto', label: 'Use device location', iana: null },
    { id: 'PT', label: 'Los Angeles time (PT)', iana: 'America/Los_Angeles' },
    { id: 'MT', label: 'Denver time (MT)', iana: 'America/Denver' },
    { id: 'CT', label: 'Chicago time (CT)', iana: 'America/Chicago' },
    { id: 'MX', label: 'Mexico City time', iana: 'America/Mexico_City' },
    { id: 'ET', label: 'New York time (ET)', iana: 'America/New_York' },
    { id: 'TOR', label: 'Toronto time (ET)', iana: 'America/Toronto' },
  ];

  var IANA_TO_ZONE_ID = {
    'America/Los_Angeles': 'PT',
    'America/Vancouver': 'PT',
    'America/Tijuana': 'PT',
    'America/Denver': 'MT',
    'America/Edmonton': 'MT',
    'America/Phoenix': 'MT',
    'America/Chicago': 'CT',
    'America/Winnipeg': 'CT',
    'America/Mexico_City': 'MX',
    'America/Monterrey': 'MX',
    'America/New_York': 'ET',
    'America/Detroit': 'ET',
    'America/Toronto': 'TOR',
    'America/Montreal': 'TOR',
  };

  // ----- State -----
  var state = {
    zoneId: 'ET', // default
    teams: [], // array of team codes
    filter: 'mine', // 'mine' (default when teams picked) or 'all'
  };

  function loadState() {
    try {
      var z = localStorage.getItem('wc26_zone');
      if (z) state.zoneId = z;
      else {
        // Auto-detect on first visit
        var detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
        var mapped = IANA_TO_ZONE_ID[detected];
        if (mapped) state.zoneId = mapped;
      }
      var t = localStorage.getItem('wc26_teams');
      if (t) state.teams = JSON.parse(t);
      var f = localStorage.getItem('wc26_filter');
      if (f === 'all' || f === 'mine') state.filter = f;
    } catch (e) { /* ignore */ }
  }

  function saveState() {
    try {
      localStorage.setItem('wc26_zone', state.zoneId);
      localStorage.setItem('wc26_teams', JSON.stringify(state.teams));
      localStorage.setItem('wc26_filter', state.filter);
    } catch (e) { /* ignore */ }
  }

  function getZone() {
    return ZONES.find(function (z) { return z.id === state.zoneId; }) || ZONES[5];
  }

  function getIana() {
    var zone = getZone();
    if (zone.iana) return zone.iana;
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  // ----- Time formatting -----
  function formatTime(iso) {
    var iana = getIana();
    var d = new Date(iso);
    var parts = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: iana,
      timeZoneName: 'short',
    }).formatToParts(d);
    var time = parts.filter(function (p) { return p.type !== 'timeZoneName'; }).map(function (p) { return p.value; }).join('').trim();
    var tz = (parts.find(function (p) { return p.type === 'timeZoneName'; }) || {}).value || '';
    return { time: time, zone: tz };
  }

  function formatDayHeader(iso) {
    var iana = getIana();
    var d = new Date(iso);
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: iana,
    }).format(d);
  }

  function isoDateOnly(iso) {
    var iana = getIana();
    var d = new Date(iso);
    return new Intl.DateTimeFormat('en-CA', {
      year: 'numeric', month: '2-digit', day: '2-digit', timeZone: iana,
    }).format(d); // YYYY-MM-DD
  }

  function daysUntil(iso) {
    var d = new Date(iso);
    var now = new Date();
    return Math.ceil((d - now) / (1000 * 60 * 60 * 24));
  }

  // ----- Match team rendering -----
  function teamLabel(teamRef, TEAMS) {
    if (teamRef.code) {
      var t = TEAMS[teamRef.code];
      if (t) return '<span class="team"><span class="team-flag">' + t.flag + '</span> ' + t.name + '</span>';
      return '<span class="team">' + teamRef.code + '</span>';
    }
    return '<span class="team team-placeholder">' + (teamRef.placeholder || 'TBD') + '</span>';
  }

  function isMyTeam(match) {
    if (!state.teams.length) return false;
    var a = match.teamA.code;
    var b = match.teamB.code;
    return (a && state.teams.indexOf(a) !== -1) || (b && state.teams.indexOf(b) !== -1);
  }

  function stageChip(match) {
    if (match.stage === 'group') return 'Group ' + match.group;
    if (match.stage === 'R32') return 'Round of 32';
    if (match.stage === 'R16') return 'Round of 16';
    if (match.stage === 'QF') return 'Quarterfinal';
    if (match.stage === 'SF') return 'Semifinal';
    if (match.stage === '3rd') return '🥉 3rd place';
    if (match.stage === 'F') return '🏆 Final';
    return '';
  }

  function broadcastLabel(broadcast) {
    return '📺 ' + broadcast.join(', ');
  }

  // ----- .ics generation -----
  function pad2(n) { return n < 10 ? '0' + n : '' + n; }
  function icsDate(d) {
    return d.getUTCFullYear() +
      pad2(d.getUTCMonth() + 1) +
      pad2(d.getUTCDate()) + 'T' +
      pad2(d.getUTCHours()) +
      pad2(d.getUTCMinutes()) + '00Z';
  }
  function matchTitle(match, TEAMS) {
    function n(t) {
      if (t.code && TEAMS[t.code]) return TEAMS[t.code].name;
      return t.placeholder || 'TBD';
    }
    var teams = n(match.teamA) + ' vs ' + n(match.teamB);
    var stage = stageChip(match);
    return teams + ' · ' + stage + ' · WC 2026';
  }
  function buildIcsEvent(match, TEAMS) {
    var start = new Date(match.kickoffISO);
    var end = new Date(start.getTime() + 2.5 * 60 * 60 * 1000);
    var title = matchTitle(match, TEAMS);
    var loc = match.venue + ', ' + match.city;
    var desc = 'Broadcast: ' + match.broadcast.join(', ') + '\\nVia WC26 Pregame (wc26pregame.com)';
    var uid = 'wc26-match-' + match.num + '@wc26pregame.com';
    return [
      'BEGIN:VEVENT',
      'UID:' + uid,
      'DTSTAMP:' + icsDate(new Date()),
      'DTSTART:' + icsDate(start),
      'DTEND:' + icsDate(end),
      'SUMMARY:' + title,
      'LOCATION:' + loc,
      'DESCRIPTION:' + desc,
      'END:VEVENT',
    ].join('\r\n');
  }

  function downloadIcsForMatches(matches, filename) {
    var TEAMS = window.WC26_DATA.TEAMS;
    var events = matches.map(function (m) { return buildIcsEvent(m, TEAMS); }).join('\r\n');
    var lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//WC26 Pregame//EN',
      events,
      'END:VCALENDAR',
    ];
    var blob = new Blob([lines.join('\r\n')], { type: 'text/calendar' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 100);
  }

  function downloadIcs(match) {
    downloadIcsForMatches([match], 'wc26-match-' + match.num + '.ics');
  }

  // ----- Confirmation modal -----
  function openConfirmModal(opts) {
    var overlay = document.getElementById('modal-overlay');
    if (!overlay) return;
    document.getElementById('modal-title').textContent = opts.title;
    document.getElementById('modal-body').textContent = opts.body;
    document.getElementById('modal-confirm').textContent = opts.confirmLabel || 'Confirm';
    document.getElementById('modal-confirm').onclick = function () {
      closeModal();
      opts.onConfirm();
    };
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(function () { document.getElementById('modal-cancel').focus(); }, 50);
  }

  function closeModal() {
    var overlay = document.getElementById('modal-overlay');
    if (!overlay) return;
    overlay.hidden = true;
    document.body.style.overflow = '';
  }

  function bulkAddMyMatches() {
    var mine = window.WC26_DATA.MATCHES.filter(isMyTeam);
    openConfirmModal({
      title: 'Add your team matches to calendar?',
      body: mine.length + ' match' + (mine.length === 1 ? '' : 'es') + ' will be added as separate events. Your calendar app will open with the file ready to import.',
      confirmLabel: 'Add ' + mine.length + ' matches',
      onConfirm: function () { downloadIcsForMatches(mine, 'wc26-my-matches.ics'); },
    });
  }

  function bulkAddAll() {
    var all = window.WC26_DATA.MATCHES;
    openConfirmModal({
      title: 'Add all 104 matches to calendar?',
      body: 'All 104 matches will be added as separate events across 39 days. This is a lot. Only do this if you want every single match in your calendar.',
      confirmLabel: 'Yes, add all 104',
      onConfirm: function () { downloadIcsForMatches(all, 'wc26-all-104.ics'); },
    });
  }

  function bulkAddKnockouts() {
    var ko = window.WC26_DATA.MATCHES.filter(function (m) {
      return ['R32', 'R16', 'QF', 'SF', '3rd', 'F'].indexOf(m.stage) !== -1;
    });
    openConfirmModal({
      title: 'Add all 32 knockout matches?',
      body: 'The Round of 32, Round of 16, Quarterfinals, Semifinals, 3rd-place, and Final will be added as separate events. Teams resolve as the group stage finishes.',
      confirmLabel: 'Add ' + ko.length + ' matches',
      onConfirm: function () { downloadIcsForMatches(ko, 'wc26-knockouts.ics'); },
    });
  }

  // ----- Renderers -----
  var KO_STAGES = ['R32', 'R16', 'QF', 'SF', '3rd', 'F'];
  function renderMatch(match, TEAMS) {
    var ft = formatTime(match.kickoffISO);
    var mine = isMyTeam(match);
    var isKO = KO_STAGES.indexOf(match.stage) !== -1;
    var isFinal = match.stage === 'F';
    var classes = 'match' + (mine ? ' match-mine' : '') + (isKO ? ' match-knockout' : '');
    var star = mine ? '<span class="match-star" title="Your team">⭐</span>' : '';
    var stageClasses = 'match-stage' + (isKO ? ' is-knockout' : '') + (isFinal ? ' is-final' : '');
    return '<div class="' + classes + '" data-num="' + match.num + '">' +
      '<div class="match-time">' + star + ft.time + ' <span class="match-zone">' + ft.zone + '</span></div>' +
      '<div class="match-teams">' + teamLabel(match.teamA, TEAMS) + ' <span class="vs">vs</span> ' + teamLabel(match.teamB, TEAMS) + '</div>' +
      '<div class="match-meta">' +
        '<span class="' + stageClasses + '">' + stageChip(match) + '</span>' +
        ' · <span class="match-venue">' + match.venue + ', ' + match.city + '</span>' +
        ' · <span class="match-broadcast">' + broadcastLabel(match.broadcast) + '</span>' +
      '</div>' +
      '<div class="match-actions"><button class="ics-btn" data-num="' + match.num + '"><span class="btn-emoji" aria-hidden="true">📅</span>Add to calendar</button></div>' +
      '</div>';
  }

  function renderSchedule() {
    var data = window.WC26_DATA;
    if (!data) return;
    var TEAMS = data.TEAMS;
    var MATCHES = data.MATCHES;

    // Group matches by display-zone date
    var byDay = {};
    MATCHES.forEach(function (m) {
      var key = isoDateOnly(m.kickoffISO);
      (byDay[key] = byDay[key] || []).push(m);
    });
    var sortedDays = Object.keys(byDay).sort();

    // "Coming up" section
    var nowMs = Date.now();
    var future = MATCHES.filter(function (m) { return new Date(m.kickoffISO).getTime() > nowMs; });
    var todayKey = isoDateOnly(new Date().toISOString());
    var tomorrowKey = isoDateOnly(new Date(nowMs + 24 * 60 * 60 * 1000).toISOString());
    var todayMatches = (byDay[todayKey] || []).filter(function (m) { return new Date(m.kickoffISO).getTime() > nowMs - 2.5 * 60 * 60 * 1000; });
    var tomorrowMatches = byDay[tomorrowKey] || [];

    var comingHtml = '';
    if (todayMatches.length) {
      comingHtml += '<div class="coming-section"><div class="coming-label">Today</div>' +
        todayMatches.map(function (m) { return renderMatch(m, TEAMS); }).join('') + '</div>';
    } else if (future.length) {
      var next = future[0];
      var days = daysUntil(next.kickoffISO);
      var ft = formatTime(next.kickoffISO);
      comingHtml += '<div class="coming-section"><div class="coming-label">Coming up</div>' +
        '<div class="coming-card">' +
          '<div class="coming-headline">Tournament starts in ' + days + ' day' + (days === 1 ? '' : 's') + '</div>' +
          '<div class="coming-sub">Opening match: ' + formatDayHeader(next.kickoffISO) + ' · ' + ft.time + ' ' + ft.zone + '</div>' +
          '<div class="coming-sub">' + teamLabel(next.teamA, TEAMS) + ' vs ' + teamLabel(next.teamB, TEAMS) + ' at ' + next.venue + '</div>' +
          '<div class="match-actions"><button class="ics-btn" data-num="' + next.num + '"><span class="btn-emoji" aria-hidden="true">📅</span>Add to calendar</button></div>' +
        '</div></div>';
    }
    if (tomorrowMatches.length && !todayMatches.length) {
      comingHtml += '<div class="coming-section"><div class="coming-label">Tomorrow</div>' +
        tomorrowMatches.map(function (m) { return renderMatch(m, TEAMS); }).join('') + '</div>';
    }

    // "Your teams" pinned section + filter toggle
    var pinnedHtml = '';
    var hasTeams = state.teams.length > 0;
    if (hasTeams) {
      var mine = MATCHES.filter(isMyTeam).sort(function (a, b) {
        return new Date(a.kickoffISO) - new Date(b.kickoffISO);
      });
      if (mine.length) {
        var mineByDay = {};
        mine.forEach(function (m) {
          var key = isoDateOnly(m.kickoffISO);
          (mineByDay[key] = mineByDay[key] || []).push(m);
        });
        var mineDays = Object.keys(mineByDay).sort();
        var pinnedMatchesHtml = mineDays.map(function (key) {
          var dayMatches = mineByDay[key];
          var header = formatDayHeader(dayMatches[0].kickoffISO);
          return '<div class="pinned-day-header">' + header + '</div>' +
            dayMatches.map(function (m) { return renderMatch(m, TEAMS); }).join('');
        }).join('');

        pinnedHtml = '<div class="pinned-section">' +
          '<div class="pinned-header-row">' +
            '<h2 class="pinned-header">⭐ Your matches (' + mine.length + ')</h2>' +
            '<button class="bulk-ics-btn" id="bulk-my-btn"><span class="btn-emoji" aria-hidden="true">📅</span>Add all to calendar</button>' +
          '</div>' +
          pinnedMatchesHtml +
          '</div>';
      }

      // Filter toggle (only meaningful when teams are picked)
      pinnedHtml += '<div class="filter-toggle">' +
        '<span class="filter-label">Show:</span> ' +
        '<button class="toggle-btn ' + (state.filter === 'mine' ? 'active' : '') + '" data-filter="mine">Just your teams</button>' +
        '<button class="toggle-btn ' + (state.filter === 'all' ? 'active' : '') + '" data-filter="all">All matches</button>' +
        '</div>';
    }

    // Full schedule grouped by day — hidden when filter = mine + teams picked
    var scheduleHtml = '';
    var showFullSchedule = !hasTeams || state.filter === 'all';
    if (showFullSchedule) {
      // Bulk-calendar buttons (All 104 / Knockouts only) live in the picker
      // chip row at the top of the page so the schedule body opens straight
      // into matches rather than into bulk-add controls. Handlers attached
      // once at DOMContentLoaded — see init below.
      scheduleHtml = '<div class="full-schedule">' +
        '<h2 class="full-header">All 104 matches</h2>';
      sortedDays.forEach(function (key) {
        var matches = byDay[key];
        var header = formatDayHeader(matches[0].kickoffISO);
        var note = '';
        if (key === '2026-06-11') note = ' · Opening day';
        if (key === '2026-07-19') note = ' · The Final 🏆';
        scheduleHtml += '<div class="day-section">' +
          '<div class="day-header">' + header + note + '</div>' +
          matches.map(function (m) { return renderMatch(m, TEAMS); }).join('') +
          '</div>';
      });
      scheduleHtml += '</div>';
    }

    // "Coming up" section is hidden when filter = mine + teams picked
    // (pinned section already shows all your matches with dates)
    var finalComingHtml = (hasTeams && state.filter === 'mine') ? '' : comingHtml;

    document.getElementById('coming').innerHTML = finalComingHtml;
    document.getElementById('pinned').innerHTML = pinnedHtml;
    document.getElementById('schedule-body').innerHTML = scheduleHtml;

    // Wire up filter toggle buttons
    document.querySelectorAll('.toggle-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.filter = btn.getAttribute('data-filter');
        saveState();
        renderSchedule();
      });
    });

    // Wire up calendar buttons
    document.querySelectorAll('.ics-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var num = parseInt(btn.getAttribute('data-num'), 10);
        var m = MATCHES.find(function (x) { return x.num === num; });
        if (m) downloadIcs(m);
      });
    });

    // bulk-my-btn renders inside the pinned section (only when teams are picked)
    // so its handler must re-attach on each render. bulk-all-btn and bulk-ko-btn
    // are now static in the picker chip row and wired once at DOMContentLoaded.
    var bulkMy = document.getElementById('bulk-my-btn');
    if (bulkMy) bulkMy.addEventListener('click', bulkAddMyMatches);
  }

  // ----- Picker UIs -----
  function renderZoneChip() {
    var zone = getZone();
    var label = zone.id === 'auto' ? '📍 Auto' : '📍 ' + zone.label.replace(' time', '');
    document.getElementById('zone-chip-label').textContent = label;
  }

  function renderZoneMenu() {
    var menu = document.getElementById('zone-menu');
    menu.innerHTML = ZONES.map(function (z) {
      var checked = z.id === state.zoneId ? ' ✓' : '';
      return '<button class="menu-item" data-zone="' + z.id + '">' + z.label + checked + '</button>';
    }).join('');
    menu.querySelectorAll('.menu-item').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.zoneId = btn.getAttribute('data-zone');
        saveState();
        renderZoneChip();
        renderZoneMenu();
        renderSchedule();
        closeMenus();
      });
    });
  }

  function renderTeamChip() {
    var n = state.teams.length;
    document.getElementById('team-chip-label').textContent = n ? '⭐ Your teams (' + n + ')' : '⭐ Pick teams';
  }

  function renderTeamMenu(filter) {
    var TEAMS = window.WC26_DATA.TEAMS;
    var menu = document.getElementById('team-menu-list');
    var entries = Object.keys(TEAMS).map(function (code) {
      return { code: code, name: TEAMS[code].name, flag: TEAMS[code].flag };
    }).filter(function (t) {
      if (!filter) return true;
      return t.name.toLowerCase().indexOf(filter.toLowerCase()) !== -1 ||
             t.code.toLowerCase().indexOf(filter.toLowerCase()) !== -1;
    }).sort(function (a, b) { return a.name.localeCompare(b.name); });
    menu.innerHTML = entries.map(function (t) {
      var checked = state.teams.indexOf(t.code) !== -1;
      return '<button class="menu-item team-item' + (checked ? ' checked' : '') + '" data-code="' + t.code + '">' +
        '<span class="team-flag">' + t.flag + '</span> ' + t.name +
        (checked ? ' <span class="check">✓</span>' : '') +
        '</button>';
    }).join('');
    menu.querySelectorAll('.team-item').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var code = btn.getAttribute('data-code');
        var i = state.teams.indexOf(code);
        if (i === -1) state.teams.push(code);
        else state.teams.splice(i, 1);
        saveState();
        renderTeamChip();
        renderTeamMenu(document.getElementById('team-search').value);
        renderSchedule();
      });
    });
  }

  function closeMenus() {
    document.querySelectorAll('.dropdown-menu').forEach(function (m) { m.hidden = true; });
  }

  // ----- Wire up -----
  document.addEventListener('DOMContentLoaded', function () {
    loadState();

    // Static bulk-calendar chips in the picker row (wired once).
    var bulkAll = document.getElementById('bulk-all-btn');
    if (bulkAll) bulkAll.addEventListener('click', bulkAddAll);
    var bulkKo = document.getElementById('bulk-ko-btn');
    if (bulkKo) bulkKo.addEventListener('click', bulkAddKnockouts);

    // Zone chip / menu
    var zoneChip = document.getElementById('zone-chip');
    var zoneMenu = document.getElementById('zone-menu');
    zoneChip.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = !zoneMenu.hidden;
      closeMenus();
      zoneMenu.hidden = open;
    });

    // Team chip / menu
    var teamChip = document.getElementById('team-chip');
    var teamMenu = document.getElementById('team-menu');
    teamChip.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = !teamMenu.hidden;
      closeMenus();
      teamMenu.hidden = open;
      if (!open) document.getElementById('team-search').focus();
    });

    document.getElementById('team-search').addEventListener('input', function (e) {
      renderTeamMenu(e.target.value);
    });

    document.addEventListener('click', function (e) {
      if (!e.target.closest('.picker-group')) closeMenus();
    });

    // Modal close handlers
    var modalCancel = document.getElementById('modal-cancel');
    if (modalCancel) modalCancel.addEventListener('click', closeModal);
    var modalBackdrop = document.getElementById('modal-backdrop');
    if (modalBackdrop) modalBackdrop.addEventListener('click', closeModal);
    document.addEventListener('keydown', function (e) {
      var overlay = document.getElementById('modal-overlay');
      if (overlay && !overlay.hidden && e.key === 'Escape') closeModal();
    });

    renderZoneChip();
    renderZoneMenu();
    renderTeamChip();
    renderTeamMenu('');
    renderSchedule();
  });
})();
