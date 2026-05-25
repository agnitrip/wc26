// WC26 Pregame — feedback modal (shared across all pages)
// Vanilla JS, no dependencies. Triggers on [data-feedback-open] buttons.

(function () {
  'use strict';

  var EMAIL = 'tripathi.agni@gmail.com';
  var COPY_RESET_MS = 2000;

  var modal, card, lastFocused, copyTimer;

  function getFocusables() {
    if (!card) return [];
    var nodes = card.querySelectorAll(
      'button, [href], [tabindex]:not([tabindex="-1"])'
    );
    return Array.prototype.filter.call(nodes, function (el) {
      return !el.hasAttribute('disabled') && el.offsetParent !== null;
    });
  }

  function open() {
    if (!modal) return;
    lastFocused = document.activeElement;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    var closeBtn = card.querySelector('.feedback-modal-close');
    if (closeBtn) closeBtn.focus();
    document.addEventListener('keydown', onKey);
  }

  function close() {
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    document.body.style.overflow = '';
    document.removeEventListener('keydown', onKey);
    if (copyTimer) {
      clearTimeout(copyTimer);
      copyTimer = null;
      var copyBtn = document.getElementById('feedback-copy-btn');
      if (copyBtn) copyBtn.textContent = 'Copy email';
    }
    if (lastFocused && typeof lastFocused.focus === 'function') {
      lastFocused.focus();
    }
  }

  function onKey(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (e.key !== 'Tab') return;
    var f = getFocusables();
    if (!f.length) return;
    var first = f[0];
    var last = f[f.length - 1];
    var active = document.activeElement;
    if (e.shiftKey) {
      if (active === first || !card.contains(active)) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (active === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  function selectEmailFallback() {
    var em = card && card.querySelector('.feedback-modal-email');
    if (!em) return;
    var range = document.createRange();
    range.selectNodeContents(em);
    var sel = window.getSelection();
    if (!sel) return;
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function flashCopied() {
    var copyBtn = document.getElementById('feedback-copy-btn');
    if (!copyBtn) return;
    copyBtn.textContent = 'Copied ✓';
    if (copyTimer) clearTimeout(copyTimer);
    copyTimer = setTimeout(function () {
      copyBtn.textContent = 'Copy email';
      copyTimer = null;
    }, COPY_RESET_MS);
  }

  function copyEmail() {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(EMAIL).then(flashCopied, selectEmailFallback);
    } else {
      selectEmailFallback();
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    modal = document.getElementById('feedback-modal');
    if (!modal) return;
    card = modal.querySelector('.feedback-modal-card');

    Array.prototype.forEach.call(
      document.querySelectorAll('[data-feedback-open]'),
      function (el) {
        el.addEventListener('click', function (e) {
          e.preventDefault();
          open();
        });
      }
    );

    Array.prototype.forEach.call(
      modal.querySelectorAll('[data-feedback-close]'),
      function (el) {
        el.addEventListener('click', function (e) {
          e.preventDefault();
          close();
        });
      }
    );

    var copyBtn = document.getElementById('feedback-copy-btn');
    if (copyBtn) copyBtn.addEventListener('click', copyEmail);
  });
})();
