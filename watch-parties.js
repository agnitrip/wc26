// WC26 Anywhere — watch parties page logic
// Vanilla JS, no dependencies. Reads from window.WC26_WP (watch-parties-data.js).

(function () {
  'use strict';

  var state = {
    cityFilter: 'all',
    countryFilter: 'all',
    crossPagePersonalized: false, // tracks whether country filter came from schedule teams
  };

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
          return;
        }
      }
    } catch (e) { /* ignore */ }
  }

  function loadLocalState() {
    try {
      var c = localStorage.getItem('wc26_wp_city');
      if (c) state.cityFilter = c;
      var co = localStorage.getItem('wc26_wp_country');
      if (co) {
        state.countryFilter = co;
        state.crossPagePersonalized = false; // user explicit override
      }
    } catch (e) { /* ignore */ }
  }

  function saveLocalState() {
    try {
      localStorage.setItem('wc26_wp_city', state.cityFilter);
      localStorage.setItem('wc26_wp_country', state.countryFilter);
    } catch (e) { /* ignore */ }
  }

  function clearCrossPagePersonalization() {
    state.crossPagePersonalized = false;
    state.countryFilter = 'all';
    saveLocalState();
  }

  // ----- Filter logic -----
  function matches(venue) {
    if (state.cityFilter !== 'all' && venue.city !== state.cityFilter) return false;
    if (state.countryFilter !== 'all' && venue.countries.indexOf(state.countryFilter) === -1) return false;
    return true;
  }

  // ----- Renderers -----
  function venueCard(v, COUNTRIES) {
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
    return '<div class="venue">' +
      '<div class="venue-head">' +
        '<div class="venue-flags">' + flagsHtml + '</div>' +
        '<div class="venue-name">' + v.name + '</div>' +
        '<div class="venue-countries">' + countryNames + '</div>' +
      '</div>' +
      '<div class="venue-addr">' + v.address + (v.neighborhood ? ' · ' + v.neighborhood : '') + '</div>' +
      '<div class="venue-desc">' + v.description + '</div>' +
      sourceHtml +
      '</div>';
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
        saveLocalState();
        renderAll();
        closeMenus();
      });
    });

    var countryMenu = document.getElementById('country-menu');
    var countryEntries = Object.keys(data.WP_COUNTRIES).map(function (code) {
      return { code: code, name: data.WP_COUNTRIES[code].name, flag: data.WP_COUNTRIES[code].flag };
    }).sort(function (a, b) {
      // Keep GEN at top, then alphabetical
      if (a.code === 'GEN') return -1;
      if (b.code === 'GEN') return 1;
      return a.name.localeCompare(b.name);
    });
    countryMenu.innerHTML = '<button class="menu-item" data-country="all">All countries ' + (state.countryFilter === 'all' ? '✓' : '') + '</button>' +
      countryEntries.map(function (t) {
        var checked = state.countryFilter === t.code ? ' ✓' : '';
        return '<button class="menu-item" data-country="' + t.code + '"><span class="team-flag">' + t.flag + '</span> ' + t.name + checked + '</button>';
      }).join('');
    countryMenu.querySelectorAll('.menu-item').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.countryFilter = btn.getAttribute('data-country');
        state.crossPagePersonalized = false;
        saveLocalState();
        renderAll();
        closeMenus();
      });
    });

    // Chip labels
    var cityLabel = state.cityFilter === 'all' ? 'All cities' : (data.CITIES.find(function (c) { return c.id === state.cityFilter; }) || {}).name;
    document.getElementById('city-chip-label').textContent = '📍 ' + cityLabel;
    var countryLabel;
    if (state.countryFilter === 'all') countryLabel = 'All countries';
    else {
      var co = data.WP_COUNTRIES[state.countryFilter];
      countryLabel = co ? co.flag + ' ' + co.name : 'All countries';
    }
    document.getElementById('country-chip-label').textContent = countryLabel;
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

    var html = '';
    data.CITIES.forEach(function (city) {
      if (!byCity[city.id]) return;
      html += '<section class="city-section">' +
        '<h2 class="city-header">' + city.name + ' <span class="city-count">(' + byCity[city.id].length + ')</span></h2>' +
        '<div class="venues-grid">' +
          byCity[city.id].map(function (v) { return venueCard(v, data.WP_COUNTRIES); }).join('') +
        '</div>' +
        cityThreadsHtml(city.id) +
        '</section>';
    });

    document.getElementById('venues-body').innerHTML = html;
  }

  function renderAll() {
    renderPersonalizationNotice();
    renderFilters();
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

    var countryChip = document.getElementById('country-chip');
    var countryMenu = document.getElementById('country-menu');
    countryChip.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = !countryMenu.hidden;
      closeMenus();
      countryMenu.hidden = open;
    });

    document.addEventListener('click', function (e) {
      if (!e.target.closest('.picker-group')) closeMenus();
    });

    renderAll();
  });
})();
