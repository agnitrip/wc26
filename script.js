// Couch World Cup quiz + countdown
// Vanilla JS, no dependencies.

(function () {
  'use strict';

  // ----- Days to kickoff -----
  function updateCountdown() {
    var el = document.getElementById('countdown');
    if (!el) return;
    var kickoff = new Date('2026-06-11T17:00:00Z'); // approx noon ET opener
    var now = new Date();
    var msPerDay = 1000 * 60 * 60 * 24;
    var days = Math.ceil((kickoff - now) / msPerDay);
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
  var SERVICES = {
    ota: {
      name: 'OTA antenna + Tubi',
      price: 'Free',
      blurb: 'Plug a $30 antenna into your TV. FOX broadcasts most matches free over the air. Use Tubi for the opener.'
    },
    otaSpanish: {
      name: 'OTA Telemundo',
      price: 'Free',
      blurb: 'Telemundo broadcasts free over the air with an antenna. Spanish commentary, no monthly bill.'
    },
    sling: {
      name: 'Sling Blue',
      price: '~$45/mo',
      blurb: 'The cheapest streaming bundle that carries FOX, FS1, and Telemundo. Cancel after July 19 and you are done.'
    },
    fubo: {
      name: 'Fubo',
      price: '~$80/mo',
      blurb: 'The only consumer bundle with customizable multi-view across 4 games on one screen. Perfect for group-stage final days.'
    },
    fuboPremium: {
      name: 'Fubo, top tier',
      price: '~$100/mo',
      blurb: 'Every match, 4K where available, plus 4-game multi-view. The most generous option.'
    },
    youtubeTV: {
      name: 'YouTube TV',
      price: '~$83/mo',
      blurb: 'Best picture quality, 4K on select matches, and 4-stream multi-view on the TV app (not browser).'
    },
    peacock: {
      name: 'Peacock Premium',
      price: '~$8/mo',
      blurb: 'Telemundo’s 92 matches streaming on demand. Cheapest path to full Spanish coverage.'
    }
  };

  function recommend(a) {
    // Spanish preference overrides
    if (a.lang === 'spanish') {
      if (a.budget === 'free') return { primary: 'otaSpanish', alts: ['peacock'] };
      if (a.budget === 'premium') return { primary: 'peacock', alts: ['fubo', 'youtubeTV'] };
      return { primary: 'peacock', alts: ['otaSpanish', 'sling'] };
    }

    // Free overrides
    if (a.budget === 'free') {
      return { primary: 'ota', alts: a.lang === 'either' ? ['otaSpanish'] : ['otaSpanish'] };
    }

    // Lighter coverage = don't pay
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
      // multiview = no
      if (a.budget === 'cheap') return { primary: 'sling', alts: ['fubo', 'youtubeTV'] };
      if (a.budget === 'premium') return { primary: 'youtubeTV', alts: ['fubo', 'sling'] };
    }

    // Fallback
    return { primary: 'sling', alts: ['ota', 'fubo'] };
  }

  // ----- Quiz state machine -----
  var answers = {};
  var step = 1;
  var maxStep = 3; // becomes 4 if coverage === 'all'

  function showStep(n) {
    var questions = document.querySelectorAll('.question');
    questions.forEach(function (q) {
      q.classList.toggle('active', parseInt(q.getAttribute('data-step'), 10) === n);
    });
    var dots = document.querySelectorAll('.quiz-progress .dot');
    dots.forEach(function (d) {
      var s = parseInt(d.getAttribute('data-step'), 10);
      d.classList.toggle('active', s === n);
      d.classList.toggle('done', s < n);
    });
    var back = document.getElementById('back-btn');
    if (back) back.hidden = n === 1;
  }

  function advance(key, value) {
    answers[key] = value;

    // After coverage answer, decide whether Q4 is needed
    if (key === 'coverage') {
      var dot4 = document.getElementById('dot-4');
      if (value === 'all') {
        maxStep = 4;
        if (dot4) dot4.hidden = false;
      } else {
        maxStep = 3;
        delete answers.multiview;
        if (dot4) dot4.hidden = true;
      }
    }

    if (step >= maxStep) {
      showResult();
      return;
    }

    step += 1;
    // If we just answered Q3 and we don't need Q4, jump straight to result
    if (step === 4 && maxStep === 3) {
      showResult();
      return;
    }
    showStep(step);
  }

  function back() {
    if (step <= 1) return;
    step -= 1;
    var keys = ['lang', 'coverage', 'budget', 'multiview'];
    delete answers[keys[step - 1]];
    showStep(step);
  }

  function renderAltCard(serviceId) {
    var s = SERVICES[serviceId];
    if (!s) return '';
    return '<div class="alt-card">' +
      '<div class="alt-name">' + s.name + '</div>' +
      '<div class="alt-price">' + s.price + '</div>' +
      '</div>';
  }

  function showResult() {
    var pick = recommend(answers);
    var primary = SERVICES[pick.primary];
    document.getElementById('result-name').textContent = primary.name;
    document.getElementById('result-price').textContent = primary.price;
    document.getElementById('result-why').textContent = primary.blurb;

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
    answers = {};
    step = 1;
    maxStep = 3;
    var dot4 = document.getElementById('dot-4');
    if (dot4) dot4.hidden = true;
    document.getElementById('result').hidden = true;
    document.getElementById('quiz').hidden = false;
    showStep(1);
    document.getElementById('quiz').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ----- Wire up -----
  document.addEventListener('DOMContentLoaded', function () {
    updateCountdown();

    document.querySelectorAll('.answer').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var q = btn.closest('.question');
        var key = q.getAttribute('data-key');
        var value = btn.getAttribute('data-value');
        advance(key, value);
      });
    });

    var backBtn = document.getElementById('back-btn');
    if (backBtn) backBtn.addEventListener('click', back);

    var retakeBtn = document.getElementById('retake-btn');
    if (retakeBtn) retakeBtn.addEventListener('click', reset);
  });
})();
