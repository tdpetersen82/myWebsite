// Limestone Games — global command-palette search.
// Injects a search field into the page nav and opens an overlay that searches
// the WHOLE catalog (games-catalog.js) from any page — never a dead end.
// The homepage has its own in-place search, so this skips that page.
(function () {
  'use strict';

  if (!window.LG_GAMES) return;                       // catalog not loaded
  if (document.getElementById('hub-search-input')) return; // homepage: leave its search alone

  var CAT_LABEL = window.LG_CAT_LABEL || {};
  var CATEGORIES = window.LG_CATEGORIES || [];

  var games = window.LG_GAMES.map(function (g) {
    return {
      name: g.name,
      desc: g.desc || '',
      color: g.color || '#C77A2A',
      cat: g.cat,
      catLabel: CAT_LABEL[g.cat] || '',
      isNew: !!g.isNew,
      url: '/' + g.id + '/',
      nameLc: g.name.toLowerCase(),
      hay: (g.name + ' ' + (g.desc || '') + ' ' + (CAT_LABEL[g.cat] || '')).toLowerCase()
    };
  });

  // ── Matching / ranking ────────────────────────────────────────────────
  function score(g, q) {
    var n = g.nameLc;
    if (n === q) return 100;
    if (n.indexOf(q) === 0) return 80;
    if (n.split(/\s+/).some(function (w) { return w.indexOf(q) === 0; })) return 70;
    if (n.indexOf(q) !== -1) return 50;
    if (g.hay.indexOf(q) !== -1) return 20;
    return -1;
  }
  function search(q) {
    q = q.trim().toLowerCase();
    if (!q) return null; // null => empty query (show full catalogue)
    return games
      .map(function (g) { return { g: g, s: score(g, q) }; })
      .filter(function (x) { return x.s >= 0; })
      .sort(function (a, b) { return b.s - a.s || a.g.name.localeCompare(b.g.name); })
      .map(function (x) { return x.g; });
  }

  // ── Build DOM ─────────────────────────────────────────────────────────
  var isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  var kbdLabel = isMac ? '⌘K' : 'Ctrl K';

  var trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'gs-trigger';
  trigger.setAttribute('aria-label', 'Search games');
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.innerHTML =
    '<span class="gs-t-icon" aria-hidden="true">⌕</span>' +
    '<span class="gs-t-label">Search games…</span>' +
    '<span class="gs-t-kbd">' + kbdLabel + '</span>';

  var nav = document.querySelector('nav.nav') || document.querySelector('.nav');
  if (nav) {
    var meta = nav.querySelector('.nav-meta');
    if (meta) nav.insertBefore(trigger, meta);
    else nav.appendChild(trigger);
  }

  var overlay = document.createElement('div');
  overlay.className = 'gs-overlay';
  overlay.hidden = true;
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Search games');
  overlay.innerHTML =
    '<div class="gs-panel">' +
      '<div class="gs-field">' +
        '<span class="gs-f-icon" aria-hidden="true">⌕</span>' +
        '<input class="gs-input" type="text" placeholder="Search all games…" ' +
          'aria-label="Search all games" autocomplete="off" autocapitalize="off" ' +
          'autocorrect="off" spellcheck="false" role="combobox" aria-expanded="true" ' +
          'aria-controls="gs-results" aria-autocomplete="list">' +
        '<kbd class="gs-esc">esc</kbd>' +
      '</div>' +
      '<div class="gs-results" id="gs-results" role="listbox" aria-label="Game results"></div>' +
      '<div class="gs-foot">' +
        '<span><b>↑↓</b>navigate</span>' +
        '<span><b>↵</b>open</span>' +
        '<span><b>esc</b>close</span>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);

  var panel = overlay.querySelector('.gs-panel');
  var input = overlay.querySelector('.gs-input');
  var resultsEl = overlay.querySelector('.gs-results');

  // ── Rendering ─────────────────────────────────────────────────────────
  var rows = [];        // currently-rendered <a.gs-row> elements (flat order)
  var activeIndex = -1;

  function rowHTML(g, idx) {
    return '<a class="gs-row" role="option" id="gs-row-' + idx + '" href="' + g.url + '" ' +
      'style="--g:' + g.color + '" data-idx="' + idx + '">' +
      '<span class="gs-row-dot" aria-hidden="true"></span>' +
      '<span class="gs-row-main">' +
        '<span class="gs-row-name">' + esc(g.name) +
          (g.isNew ? '<span class="gs-row-new">New</span>' : '') +
        '</span>' +
        '<span class="gs-row-desc">' + esc(g.desc) + '</span>' +
      '</span>' +
      '<span class="gs-row-cat">' + esc(g.catLabel) + '</span>' +
    '</a>';
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function render(q) {
    var list = search(q);
    var html = '';
    var flat = [];

    if (list === null) {
      // Empty query — browse the whole catalogue grouped by category.
      CATEGORIES.forEach(function (cat) {
        var inCat = games.filter(function (g) { return g.cat === cat.id; });
        if (!inCat.length) return;
        html += '<div class="gs-group-label">' + esc(cat.label) + '</div>';
        inCat.forEach(function (g) { html += rowHTML(g, flat.length); flat.push(g); });
      });
    } else if (list.length === 0) {
      html = '<div class="gs-empty"><strong>No games match.</strong>' +
             '<span>Try another title or a category like “casino”.</span></div>';
    } else {
      list.forEach(function (g) { html += rowHTML(g, flat.length); flat.push(g); });
    }

    resultsEl.innerHTML = html;
    rows = Array.prototype.slice.call(resultsEl.querySelectorAll('.gs-row'));
    setActive(rows.length ? 0 : -1, false);
  }

  function setActive(i, scroll) {
    if (activeIndex >= 0 && rows[activeIndex]) rows[activeIndex].classList.remove('active');
    activeIndex = i;
    var el = rows[i];
    if (el) {
      el.classList.add('active');
      input.setAttribute('aria-activedescendant', el.id);
      if (scroll !== false) el.scrollIntoView({ block: 'nearest' });
    } else {
      input.removeAttribute('aria-activedescendant');
    }
  }

  // ── Open / close ──────────────────────────────────────────────────────
  function isOpen() { return !overlay.hidden; }

  function open() {
    if (isOpen()) return;
    overlay.hidden = false;
    document.documentElement.classList.add('gs-locked');
    input.value = '';
    render('');
    // next frame so the transition runs
    requestAnimationFrame(function () { overlay.classList.add('gs-open'); });
    input.focus();
  }

  function close() {
    if (!isOpen()) return;
    overlay.classList.remove('gs-open');
    document.documentElement.classList.remove('gs-locked');
    var done = function () { overlay.hidden = true; overlay.removeEventListener('transitionend', done); };
    overlay.addEventListener('transitionend', done);
    // fallback in case transitionend doesn't fire
    setTimeout(function () { if (!overlay.classList.contains('gs-open')) overlay.hidden = true; }, 240);
    trigger.focus();
  }

  // ── Events ────────────────────────────────────────────────────────────
  trigger.addEventListener('click', open);

  input.addEventListener('input', function () { render(input.value); });

  input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (rows.length) setActive((activeIndex + 1) % rows.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (rows.length) setActive((activeIndex - 1 + rows.length) % rows.length);
    } else if (e.key === 'Enter') {
      var el = rows[activeIndex] || rows[0];
      if (el) { e.preventDefault(); window.location.href = el.getAttribute('href'); }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  });

  // Hover syncs the active row with the pointer.
  resultsEl.addEventListener('mousemove', function (e) {
    var row = e.target.closest('.gs-row');
    if (row) {
      var i = parseInt(row.dataset.idx, 10);
      if (i !== activeIndex) setActive(i, false);
    }
  });

  // Click on the dimmed backdrop closes.
  overlay.addEventListener('mousedown', function (e) {
    if (e.target === overlay) close();
  });

  // Global shortcuts.
  function isTyping(t) {
    if (!t) return false;
    var tag = t.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t.isContentEditable;
  }
  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      isOpen() ? close() : open();
    } else if (e.key === '/' && !isOpen() && !isTyping(e.target)) {
      e.preventDefault();
      open();
    }
  });
})();
