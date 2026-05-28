// ui-state-probe.js — find layout issues in transient UI (toasts, dialogs, overlays).
//
// USAGE (from a page's DevTools console, or via preview_eval):
//   const r = window.__uiProbe();
//   console.table(r.flat);
//
// What it does: enumerates elements that are normally hidden (the `hidden`
// attribute, or known overlay/toast/dialog classes), forces each visible,
// measures it, flags geometric anomalies, then restores state.
//
// Designed to catch latent bugs like the chess board-toast (a small status pill
// that was being stretched to fill the entire board by a sibling-blanket rule).
//
// Exposes window.__uiProbe(opts?) — pure read-only, restores everything it touches.

(function () {
  'use strict';

  // Selectors covering the typical "transient UI" surfaces across the site.
  const SELECTORS = [
    '[hidden]',
    '.toast', '.board-toast', '.game-toast',
    '.modal', '.dialog', '[role="dialog"]',
    '.game-over', '.promo', '.confirm', '.over-card',
    '.tooltip', '.popover',
  ];

  // Tweakable thresholds for what counts as "this looks wrong."
  const TOAST_MAX_HEIGHT = 100;   // a status toast shouldn't be taller than this
  const PARENT_FILL_TOLERANCE = 2; // px slack when comparing to parent dims
  const OVERFLOW_TOLERANCE = 1;    // px slack for "extends outside parent"

  // Overlays that are EXPECTED to fill their parent (so don't flag them).
  const EXPECTED_FILL = new Set([
    'squares', 'pieces', 'game-over', 'promo', 'confirm', 'modal-overlay',
    'over', 'confirmOverlay',
  ]);

  function isToastClass(el) {
    return /\btoast\b|board-toast/i.test(el.className);
  }

  function expectedFill(el) {
    if (EXPECTED_FILL.has(el.id)) return true;
    for (const cls of el.classList) {
      if (EXPECTED_FILL.has(cls)) return true;
    }
    return false;
  }

  function show(el) {
    const orig = {
      hidden: el.hidden,
      classList: el.className,
      inlineStyle: el.getAttribute('style') || '',
    };
    if (el.hidden) el.hidden = false;
    if (!el.classList.contains('show')) el.classList.add('show');
    // Some hidden elements rely on opacity; nudge it up to 1 inline so we can measure.
    el.style.opacity = '1';
    el.style.transition = 'none';
    // Force layout
    void el.offsetWidth;
    return orig;
  }

  function restore(el, orig) {
    if (orig.inlineStyle) el.setAttribute('style', orig.inlineStyle);
    else el.removeAttribute('style');
    el.className = orig.classList;
    el.hidden = orig.hidden;
  }

  function describe(el) {
    let s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    const cls = (el.className || '').trim().split(/\s+/).filter(Boolean).slice(0, 3).join('.');
    if (cls) s += '.' + cls;
    return s;
  }

  function checkOne(el) {
    if (!el.parentElement) return null;
    const orig = show(el);
    let result;
    try {
      const r = el.getBoundingClientRect();
      const pr = el.parentElement.getBoundingClientRect();
      const issues = [];

      if (r.width <= 0 || r.height <= 0) {
        issues.push('zero size after show — element may need a different toggle');
      }

      if (pr.width > 0 && pr.height > 0) {
        if (r.width > pr.width + OVERFLOW_TOLERANCE) {
          issues.push(`wider than parent (${Math.round(r.width)}px > ${Math.round(pr.width)}px)`);
        }
        if (r.height > pr.height + OVERFLOW_TOLERANCE) {
          issues.push(`taller than parent (${Math.round(r.height)}px > ${Math.round(pr.height)}px)`);
        }
        if (r.left < pr.left - OVERFLOW_TOLERANCE) {
          issues.push(`extends left of parent (left ${Math.round(r.left)} vs parent ${Math.round(pr.left)})`);
        }
        if (r.right > pr.right + OVERFLOW_TOLERANCE) {
          issues.push(`extends right of parent (right ${Math.round(r.right)} vs parent ${Math.round(pr.right)})`);
        }
        if (r.top < pr.top - OVERFLOW_TOLERANCE) {
          issues.push(`extends above parent (top ${Math.round(r.top)} vs parent ${Math.round(pr.top)})`);
        }
        if (r.bottom > pr.bottom + OVERFLOW_TOLERANCE) {
          issues.push(`extends below parent (bottom ${Math.round(r.bottom)} vs parent ${Math.round(pr.bottom)})`);
        }
        const fillsParent =
          Math.abs(r.width - pr.width) <= PARENT_FILL_TOLERANCE &&
          Math.abs(r.height - pr.height) <= PARENT_FILL_TOLERANCE;
        if (fillsParent && !expectedFill(el)) {
          issues.push(`fills parent (${Math.round(r.width)}x${Math.round(r.height)}) — likely unintended inset:0 / size-stretch`);
        }
      }

      if (isToastClass(el) && r.height > TOAST_MAX_HEIGHT) {
        issues.push(`toast-class element is unusually tall (${Math.round(r.height)}px > ${TOAST_MAX_HEIGHT}px)`);
      }

      result = {
        sel: describe(el),
        w: Math.round(r.width),
        h: Math.round(r.height),
        parent: describe(el.parentElement),
        parentW: Math.round(pr.width),
        parentH: Math.round(pr.height),
        issues,
      };
    } finally {
      restore(el, orig);
    }
    return result;
  }

  function probe(opts = {}) {
    const sel = (opts.selectors || SELECTORS).join(',');
    const candidates = Array.from(document.querySelectorAll(sel));
    const seen = new Set();
    const flat = [];
    for (const el of candidates) {
      if (seen.has(el)) continue;
      seen.add(el);
      const r = checkOne(el);
      if (r) flat.push(r);
    }
    const issuesOnly = flat.filter(r => r.issues.length);
    return {
      page: location.pathname,
      checked: flat.length,
      problems: issuesOnly.length,
      flat,
      issues: issuesOnly,
    };
  }

  window.__uiProbe = probe;
})();
