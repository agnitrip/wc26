// WC26 Pregame — watch parties page logic
// Vanilla JS, no dependencies. Reads from window.WC26_WP (watch-parties-data.js).

(function () {
  'use strict';

  var state = {
    cityFilter: 'all',
    countryFilter: 'all',
    nearStadiumOnly: false, // proximity filter
    crossPagePersonalized: false, // tracks whether country filter came from schedule teams
  };

  function track(name, props) {
    if (typeof window === 'undefined' || typeof window.plausible !== 'function') return;
    if (props) window.plausible(name, { props: props });
    else window.plausible(name);
  }

  function loadCrossPage() {
    try {
      var teams = JSON.parse(localStorage.getItem('wc26_teams') || '[]');
      if (!teams.length) return;
      var data = window.WC26_WP;
      // Find first picked team that has venues
      for (var i = 0; i < teams.length; i++) {
        var code = teams[i];
        var hasVenues = data.VENUES.some(function (v) { return v.countries.indexOf(code) !== -1; });
        if (hasVenues && data.WP_COUNTRIES[code]) {
          state.countryFilter = code;
          state.crossPagePersonalized = true;
          track('personalization_fired', { country: code });
          return;
        }
      }
    } catch (e) { /* ignore */ }
  }

  function loadLocalState() {
    try {
      var c = localStorage.getItem('wc26_wp_city');
      if (c) state.cityFilter = c;
      var ns = localStorage.getItem('wc26_wp_near_stadium');
      if (ns === 'true') state.nearStadiumOnly = true;
      // Note: country filter is NOT persisted across visits anymore.
      // It exists transparently to support cross-page personalization from
      // /schedule's wc26_teams localStorage (handled by loadCrossPage).
    } catch (e) { /* ignore */ }
  }

  function saveLocalState() {
    try {
      localStorage.setItem('wc26_wp_city', state.cityFilter);
      localStorage.setItem('wc26_wp_near_stadium', state.nearStadiumOnly ? 'true' : 'false');
    } catch (e) { /* ignore */ }
  }

  function clearCrossPagePersonalization() {
    track('personalization_cleared');
    state.crossPagePersonalized = false;
    state.countryFilter = 'all';
    saveLocalState();
  }

  // ----- Filter logic -----
  function matches(venue) {
    if (state.cityFilter !== 'all' && venue.city !== state.cityFilter) return false;
    if (state.countryFilter !== 'all' && venue.countries.indexOf(state.countryFilter) === -1) return false;
    if (state.nearStadiumOnly && !venue.nearStadium) return false;
    return true;
  }

  // ----- Renderers -----
  function venueCard(v, COUNTRIES, STADIUMS) {
    var flagsHtml = v.countries.map(function (code) {
      var c = COUNTRIES[code];
      return c ? '<span class="venue-flag" title="' + c.name + '">' + c.flag + '</span>' : '';
    }).join('');
    var countryNames = v.countries.map(function (code) {
      var c = COUNTRIES[code];
      return c ? c.name : code;
    }).join(' · ');
    var sourceHtml = '';
    if (v.sourceUrl) {
      sourceHtml = '<div class="venue-source"><a href="' + v.sourceUrl + '" target="_blank" rel="noopener">' + (v.sourceLabel || 'Source') + ' ↗</a></div>';
    }
    var stadiumChip = '';
    if (v.nearStadium && STADIUMS && STADIUMS[v.nearStadium]) {
      var s = STADIUMS[v.nearStadium];
      // When the proximity filter is on, surface the walking time prominently
      // (that's the filter's whole promise). Otherwise fall back to just the
      // stadium name. walkTime is optional per venue — venues without it just
      // show the bare stadium chip.
      if (state.nearStadiumOnly && v.walkTime) {
        stadiumChip = '<div class="venue-stadium venue-stadium-walk">🚶 ' + v.walkTime + ' to ' + s.name + '</div>';
      } else {
        stadiumChip = '<div class="venue-stadium">🏟 Near ' + s.name + '</div>';
      }
    }
    return '<div class="venue' + (v.nearStadium ? ' venue-near-stadium' : '') + '">' +
      '<div class="venue-head">' +
        '<div class="venue-flags">' + flagsHtml + '</div>' +
        '<div class="venue-name">' + v.name + '</div>' +
        '<div class="venue-countries">' + countryNames + '</div>' +
      '</div>' +
      '<div class="venue-addr">' + v.address + (v.neighborhood ? ' · ' + v.neighborhood : '') + '</div>' +
      stadiumChip +
      '<div class="venue-desc">' + v.description + '</div>' +
      sourceHtml +
      '<a class="venue-shootout" href="/game/shootout"><span aria-hidden="true">🎮</span> Heading here? Warm up with the Shootout <span aria-hidden="true">→</span></a>' +
      '</div>';
  }

  // ----- Remaining-match host cities -----
  // Derived live from schedule-data.js (loaded on this page) so the badges and
  // city ordering track the bracket without a hand-maintained list: they pick
  // up resolved teams automatically and expire as matches are played.
  var STADIUM_CITY = {
    'Gillette Stadium': 'BOS', 'MetLife Stadium': 'NYC', 'Lincoln Financial Field': 'PHL',
    'Mercedes-Benz Stadium': 'ATL', 'Hard Rock Stadium': 'MIA', 'AT&T Stadium': 'DAL',
    'NRG Stadium': 'HOU', 'Arrowhead Stadium': 'KC', "Levi's Stadium": 'SF',
    'SoFi Stadium': 'LA', 'Lumen Field': 'SEA', 'BMO Field': 'TOR', 'BC Place': 'VAN',
    'Estadio Azteca': 'CDMX', 'Estadio Akron': 'GDL', 'Estadio BBVA': 'MTY',
  };
  var STAGE_NAMES = { R32: 'Round of 32', R16: 'Round of 16', QF: 'Quarter-final', SF: 'Semifinal', '3rd': 'Third-place game', F: 'The Final' };

  // Next knockout match still to be played in a city, or null.
  function nextMatchIn(cityId) {
    var sd = window.WC26_DATA;
    if (!sd || !sd.MATCHES) return null;
    var now = Date.now();
    var upcoming = sd.MATCHES.filter(function (m) {
      return m.stage !== 'group' && STADIUM_CITY[m.venue] === cityId &&
        new Date(m.kickoffISO).getTime() + 2.5 * 3600000 > now;
    });
    upcoming.sort(function (a, b) { return new Date(a.kickoffISO) - new Date(b.kickoffISO); });
    return upcoming[0] || null;
  }

  function hostingBadge(cityId) {
    var m = nextMatchIn(cityId);
    if (!m) return '';
    var sd = window.WC26_DATA;
    var teams = '';
    if (m.teamA.code && m.teamB.code && sd.TEAMS[m.teamA.code] && sd.TEAMS[m.teamB.code]) {
      teams = sd.TEAMS[m.teamA.code].name + ' v ' + sd.TEAMS[m.teamB.code].name + ' · ';
    }
    var when = new Date(m.kickoffISO).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    return ' <span class="city-hosting">🏟 ' + (STAGE_NAMES[m.stage] || 'Match') + ' here · ' + teams + when + '</span>';
  }

  function cityThreadsHtml(cityId) {
    var threads = (window.WC26_WP.CITY_THREADS || {})[cityId];
    if (!threads || !threads.length) return '';
    return '<div class="city-threads">' +
      '<div class="city-threads-label">More venues from the community:</div>' +
      threads.map(function (t) {
        return '<a class="city-thread" href="' + t.url + '" target="_blank" rel="noopener">' + t.label + ' ↗</a>';
      }).join(' · ') +
      '</div>';
  }

  function renderFilters() {
    var data = window.WC26_WP;
    var cityMenu = document.getElementById('city-menu');
    cityMenu.innerHTML = '<button class="menu-item" data-city="all">All cities ' + (state.cityFilter === 'all' ? '✓' : '') + '</button>' +
      data.CITIES.map(function (c) {
        var checked = state.cityFilter === c.id ? ' ✓' : '';
        return '<button class="menu-item" data-city="' + c.id + '">' + c.name + checked + '</button>';
      }).join('');
    cityMenu.querySelectorAll('.menu-item').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.cityFilter = btn.getAttribute('data-city');
        track('city_filter', { city: state.cityFilter });
        saveLocalState();
        renderAll();
        closeMenus();
      });
    });

    // City chip label
    var cityLabel = state.cityFilter === 'all' ? 'All cities' : (data.CITIES.find(function (c) { return c.id === state.cityFilter; }) || {}).name;
    document.getElementById('city-chip-label').textContent = '📍 ' + cityLabel;
  }

  function renderPersonalizationNotice() {
    var data = window.WC26_WP;
    var el = document.getElementById('personalization-notice');
    if (!state.crossPagePersonalized || state.countryFilter === 'all') {
      el.innerHTML = '';
      return;
    }
    var co = data.WP_COUNTRIES[state.countryFilter];
    if (!co) { el.innerHTML = ''; return; }
    el.innerHTML = '<div class="personalization-notice">' +
      '📍 Showing ' + co.flag + ' ' + co.name + ' venues (from your <a href="/schedule">Schedule</a> picks). ' +
      '<button class="show-all-btn" id="show-all-btn">Show all</button>' +
      '</div>';
    document.getElementById('show-all-btn').addEventListener('click', function () {
      clearCrossPagePersonalization();
      renderAll();
    });
  }

  function renderVenues() {
    var data = window.WC26_WP;
    var filtered = data.VENUES.filter(matches);
    var summary = document.getElementById('results-summary');

    if (filtered.length === 0) {
      summary.textContent = '';
      document.getElementById('venues-body').innerHTML =
        '<div class="empty-state">' +
          '<p>No venues match those filters.</p>' +
          '<p>Try widening one of them, or check the Reddit threads linked below per city.</p>' +
        '</div>';
      return;
    }

    summary.textContent = 'Showing ' + filtered.length + ' venue' + (filtered.length === 1 ? '' : 's');

    // Group by city
    var byCity = {};
    filtered.forEach(function (v) {
      (byCity[v.city] = byCity[v.city] || []).push(v);
    });

    // Audience-priority order: largest diaspora populations + host-stadium visibility first.
    // Keeps data file canonical while controlling presentation here.
    // US + Canada first (primary US-diaspora audience), Mexico host cities at
    // the end (smaller portion of the target audience but on-the-ground option
    // for travelers and Mexican-American fans heading home for matches).
    var CITY_PRIORITY = ['NYC', 'LA', 'TOR', 'SF', 'DAL', 'MIA', 'ATL', 'BOS', 'PHL', 'HOU', 'KC', 'VAN', 'SEA', 'CDMX', 'GDL', 'MTY'];
    var orderedCities = CITY_PRIORITY
      .map(function (id) { return data.CITIES.find(function (c) { return c.id === id; }); })
      .filter(Boolean);
    // Append any city in the data that isn't in the priority list (defensive)
    data.CITIES.forEach(function (c) {
      if (CITY_PRIORITY.indexOf(c.id) === -1) orderedCities.push(c);
    });

    // Cities still hosting a knockout match jump the queue, soonest match
    // first; everything else keeps diaspora-priority order (sort is stable).
    var hostTs = {};
    orderedCities.forEach(function (c) {
      var m = nextMatchIn(c.id);
      if (m) hostTs[c.id] = new Date(m.kickoffISO).getTime();
    });
    orderedCities.sort(function (a, b) {
      var ha = hostTs[a.id], hb = hostTs[b.id];
      if (ha && hb) return ha - hb;
      if (ha) return -1;
      if (hb) return 1;
      return 0;
    });

    var html = '';
    orderedCities.forEach(function (city) {
      if (!byCity[city.id]) return;
      html += '<section class="city-section">' +
        '<h2 class="city-header">' + city.name + ' <span class="city-count">(' + byCity[city.id].length + ')</span>' + hostingBadge(city.id) + '</h2>' +
        '<div class="venues-grid">' +
          byCity[city.id].map(function (v) { return venueCard(v, data.WP_COUNTRIES, data.STADIUMS); }).join('') +
        '</div>' +
        cityThreadsHtml(city.id) +
        '</section>';
    });

    document.getElementById('venues-body').innerHTML = html;
  }

  function renderProximityToggle() {
    var el = document.getElementById('proximity-toggle');
    if (!el) return;
    el.innerHTML = '<div class="filter-toggle">' +
      '<span class="filter-label">Show:</span> ' +
      '<button class="toggle-btn ' + (!state.nearStadiumOnly ? 'active' : '') + '" data-near="false">All venues</button>' +
      '<button class="toggle-btn ' + (state.nearStadiumOnly ? 'active' : '') + '" data-near="true">🏟 Near a host stadium</button>' +
      '</div>';
    el.querySelectorAll('.toggle-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.nearStadiumOnly = btn.getAttribute('data-near') === 'true';
        track('proximity_toggle', { mode: state.nearStadiumOnly ? 'near_stadium' : 'all' });
        saveLocalState();
        renderAll();
      });
    });
  }

  function renderAll() {
    renderPersonalizationNotice();
    renderFilters();
    renderProximityToggle();
    renderVenues();
  }

  function closeMenus() {
    document.querySelectorAll('.dropdown-menu').forEach(function (m) { m.hidden = true; });
  }

  // ----- Wire up -----
  document.addEventListener('DOMContentLoaded', function () {
    loadCrossPage();
    loadLocalState();

    var cityChip = document.getElementById('city-chip');
    var cityMenu = document.getElementById('city-menu');
    cityChip.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = !cityMenu.hidden;
      closeMenus();
      cityMenu.hidden = open;
    });

    document.addEventListener('click', function (e) {
      if (!e.target.closest('.picker-group')) closeMenus();
    });

    renderAll();
  });
})();
