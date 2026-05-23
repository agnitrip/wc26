// WC26 Anywhere — schedule page logic
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
    } catch (e) { /* ignore */ }
  }

  function saveState() {
    try {
      localStorage.setItem('wc26_zone', state.zoneId);
      localStorage.setItem('wc26_teams', JSON.stringify(state.teams));
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
  function downloadIcs(match) {
    var TEAMS = window.WC26_DATA.TEAMS;
    var start = new Date(match.kickoffISO);
    var end = new Date(start.getTime() + 2.5 * 60 * 60 * 1000); // 2.5hr block
    var title = matchTitle(match, TEAMS);
    var loc = match.venue + ', ' + match.city;
    var desc = 'Broadcast: ' + match.broadcast.join(', ') + '\\nVia WC26 Anywhere (wc26-jade.vercel.app)';
    var uid = 'wc26-match-' + match.num + '@wc26-jade.vercel.app';
    var lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//WC26 Anywhere//EN',
      'BEGIN:VEVENT',
      'UID:' + uid,
      'DTSTAMP:' + icsDate(new Date()),
      'DTSTART:' + icsDate(start),
      'DTEND:' + icsDate(end),
      'SUMMARY:' + title,
      'LOCATION:' + loc,
      'DESCRIPTION:' + desc,
      'END:VEVENT',
      'END:VCALENDAR',
    ];
    var blob = new Blob([lines.join('\r\n')], { type: 'text/calendar' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'wc26-match-' + match.num + '.ics';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 100);
  }

  // ----- Renderers -----
  function renderMatch(match, TEAMS) {
    var ft = formatTime(match.kickoffISO);
    var mine = isMyTeam(match);
    var classes = 'match' + (mine ? ' match-mine' : '');
    var star = mine ? '<span class="match-star" title="Your team">⭐</span>' : '';
    return '<div class="' + classes + '" data-num="' + match.num + '">' +
      '<div class="match-time">' + star + ft.time + ' <span class="match-zone">' + ft.zone + '</span></div>' +
      '<div class="match-teams">' + teamLabel(match.teamA, TEAMS) + ' <span class="vs">vs</span> ' + teamLabel(match.teamB, TEAMS) + '</div>' +
      '<div class="match-meta">' +
        '<span class="match-stage">' + stageChip(match) + '</span>' +
        ' · <span class="match-venue">' + match.venue + ', ' + match.city + '</span>' +
        ' · <span class="match-broadcast">' + broadcastLabel(match.broadcast) + '</span>' +
      '</div>' +
      '<div class="match-actions"><button class="ics-btn" data-num="' + match.num + '">📅 Add to calendar</button></div>' +
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
          '<div class="match-actions"><button class="ics-btn" data-num="' + next.num + '">📅 Add to calendar</button></div>' +
        '</div></div>';
    }
    if (tomorrowMatches.length && !todayMatches.length) {
      comingHtml += '<div class="coming-section"><div class="coming-label">Tomorrow</div>' +
        tomorrowMatches.map(function (m) { return renderMatch(m, TEAMS); }).join('') + '</div>';
    }

    // "Your teams" pinned section
    var pinnedHtml = '';
    if (state.teams.length) {
      var mine = MATCHES.filter(isMyTeam).sort(function (a, b) {
        return new Date(a.kickoffISO) - new Date(b.kickoffISO);
      });
      if (mine.length) {
        pinnedHtml = '<div class="pinned-section">' +
          '<h2 class="pinned-header">⭐ Your teams (' + mine.length + ')</h2>' +
          mine.map(function (m) { return renderMatch(m, TEAMS); }).join('') +
          '</div>';
      }
    }

    // Full schedule grouped by day
    var scheduleHtml = '<div class="full-schedule"><h2 class="full-header">All 104 matches</h2>';
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

    document.getElementById('coming').innerHTML = comingHtml;
    document.getElementById('pinned').innerHTML = pinnedHtml;
    document.getElementById('schedule-body').innerHTML = scheduleHtml;

    // Wire up calendar buttons
    document.querySelectorAll('.ics-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var num = parseInt(btn.getAttribute('data-num'), 10);
        var m = MATCHES.find(function (x) { return x.num === num; });
        if (m) downloadIcs(m);
      });
    });
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

    renderZoneChip();
    renderZoneMenu();
    renderTeamChip();
    renderTeamMenu('');
    renderSchedule();
  });
})();
