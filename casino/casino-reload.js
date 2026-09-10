/* eslint-disable */
// Out-of-chips reset: one modal and one reset path shared by every casino
// table, the casino lobby, and the profile page.
//
// A table calls CASINO_RELOAD.open({...}) when the player can't cover its
// smallest bet. "Reset to $1,000" banks the current run into lifetime stats
// (the same thing the profile page's "Cash out & start over" does), restores
// the starting stake, and the modal says what is happening: "Resetting your
// bankroll…" while the balance counts up, then "Bankroll reset." with a
// button back to the table.
//
// Load after casino-bankroll.js and casino-stats.js.
//
//   CASINO_RELOAD.open({
//     game:          'blackjack',          // analytics tag
//     minBet:        5,                    // closes itself if the bankroll recovers to this
//                                          // (reset in another tab, cloud sync)
//     message:       'The table cleaned you out.',
//     secondary:     { label, href } | { label, onClick },  // default: ← Lobby
//     continueLabel: 'Back to the table',
//     onReset(v),                          // bankroll is now v: adopt it into table state
//     onClose(),                           // confirmation dismissed: resume play
//   });
//   CASINO_RELOAD.reset(game)  → new bankroll, no UI
//   CASINO_RELOAD.close()      → remove an open modal without callbacks
(function () {
  var STYLE_ID = 'cas-rl-style';
  var COUNT_MS = 750;   // balance count-up while "Resetting…" shows
  var current = null;   // the open modal, if any

  function fmt(n) {
    return '$' + Math.max(0, Math.floor(Number(n) || 0)).toLocaleString('en-US');
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  // Bank the run and restore the starting stake. Returns the new bankroll.
  function reset(game) {
    var B = window.CASINO_BANKROLL;
    var final = B.read();
    if (window.CASINO_STATS) window.CASINO_STATS.bankRun(final);
    var v = B.reload();
    try {
      if (typeof window.gtag === 'function') window.gtag('event', 'bankroll_reset', { game: game || 'casino' });
    } catch (e) {}
    return v;
  }

  var CSS = [
    '.cas-rl{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;',
    '  padding:16px;box-sizing:border-box;background:rgba(8,5,2,.72);',
    '  -webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);animation:cas-rl-fade .18s ease-out}',
    '.cas-rl .cas-rl-box{box-sizing:border-box;width:min(440px,100%);max-height:100%;overflow:auto;',
    '  padding:28px 32px 24px;border-radius:16px;text-align:center;color:#f4ecd8;',
    '  background:linear-gradient(180deg,rgba(35,22,10,.97),rgba(20,12,6,.99));',
    '  border:1px solid rgba(201,162,106,.5);',
    '  box-shadow:0 30px 80px rgba(0,0,0,.7),inset 0 1px 0 rgba(230,197,144,.15);',
    '  animation:cas-rl-pop .24s cubic-bezier(.2,.9,.3,1.15)}',
    '.cas-rl .cas-rl-kicker{font-size:10px;letter-spacing:.32em;text-transform:uppercase;color:#d9cfb8;opacity:.8;margin-bottom:6px}',
    '.cas-rl .cas-rl-title{margin:0 0 6px;font-family:"Playfair Display",Georgia,"Times New Roman",serif;',
    '  font-style:italic;font-weight:500;font-size:26px;line-height:1.2;color:#e6c590}',
    '.cas-rl .cas-rl-msg{margin:0 0 18px;font-size:14px;line-height:1.45;color:#d9cfb8;text-wrap:balance}',
    '.cas-rl .cas-rl-bank{display:flex;flex-direction:column;align-items:center;gap:2px;margin:0 0 16px;padding:12px 16px;',
    '  border-radius:12px;background:rgba(10,6,3,.55);border:1px solid rgba(201,162,106,.22);',
    '  transition:border-color .3s ease,box-shadow .3s ease}',
    '.cas-rl .cas-rl-bank-l{font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:#c9a26a;font-weight:700}',
    '.cas-rl .cas-rl-bank-n{font-family:"JetBrains Mono",ui-monospace,Menlo,Consolas,monospace;font-size:28px;font-weight:500;',
    '  line-height:1.2;color:#f4ecd8;font-variant-numeric:tabular-nums}',
    '.cas-rl .cas-rl-box.is-resetting .cas-rl-bank,.cas-rl .cas-rl-box.is-done .cas-rl-bank{border-color:rgba(230,197,144,.6);',
    '  box-shadow:inset 0 0 24px rgba(230,197,144,.14)}',
    '.cas-rl .cas-rl-box.is-done .cas-rl-bank-n{color:#f5d896}',
    '.cas-rl .cas-rl-note{margin:0 0 20px;font-size:12px;line-height:1.45;color:#d9cfb8;opacity:.78;text-wrap:pretty}',
    '.cas-rl .cas-rl-actions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}',
    '.cas-rl .cas-rl-btn{-webkit-appearance:none;appearance:none;box-sizing:border-box;display:inline-flex;align-items:center;',
    '  justify-content:center;min-height:42px;margin:0;padding:10px 22px;border-radius:999px;font-family:inherit;',
    '  font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;line-height:1.2;',
    '  text-decoration:none;cursor:pointer;transition:transform .12s ease,box-shadow .12s ease,background .12s ease,color .12s ease}',
    '.cas-rl .cas-rl-btn-ghost{background:rgba(20,12,6,.6);border:1px solid rgba(201,162,106,.3);color:#d9cfb8}',
    '.cas-rl .cas-rl-btn-ghost:hover{background:rgba(44,29,14,.85);color:#f4ecd8}',
    '.cas-rl .cas-rl-btn-primary{background:linear-gradient(180deg,#e6c590,#c9a26a);border:1px solid rgba(201,162,106,.5);',
    '  color:#1a1208;box-shadow:0 4px 12px rgba(230,197,144,.35)}',
    '.cas-rl .cas-rl-btn-primary:hover:not([disabled]){transform:translateY(-1px);box-shadow:0 6px 16px rgba(230,197,144,.45)}',
    '.cas-rl .cas-rl-btn[disabled]{cursor:default;opacity:.7}',
    '.cas-rl .cas-rl-btn:focus-visible{outline:2px solid #f5d896;outline-offset:3px}',
    '@keyframes cas-rl-fade{from{opacity:0}}',
    '@keyframes cas-rl-pop{from{opacity:0;transform:translateY(8px) scale(.97)}}',
    '@media (max-width:420px){.cas-rl .cas-rl-box{padding:24px 20px 20px}.cas-rl .cas-rl-title{font-size:23px}}',
    '@media (prefers-reduced-motion:reduce){.cas-rl,.cas-rl .cas-rl-box{animation:none}}'
  ].join('\n');

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function open(opts) {
    var B = window.CASINO_BANKROLL;
    if (!B || !document.body) return;
    opts = opts || {};
    if (current) teardown();
    injectStyle();

    var root = el('div', 'cas-rl');
    var box = el('div', 'cas-rl-box');
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-labelledby', 'cas-rl-title');
    box.setAttribute('aria-describedby', 'cas-rl-msg');

    var live = el('div');
    live.setAttribute('aria-live', 'polite');
    var title = el('h2', 'cas-rl-title', 'Out of chips.');
    title.id = 'cas-rl-title';
    var msg = el('p', 'cas-rl-msg', opts.message || "That's the last of your chips.");
    msg.id = 'cas-rl-msg';
    live.appendChild(title);
    live.appendChild(msg);

    var bank = el('div', 'cas-rl-bank');
    var amt = el('div', 'cas-rl-bank-n', fmt(B.read()));
    bank.appendChild(el('div', 'cas-rl-bank-l', 'Bankroll'));
    bank.appendChild(amt);

    var note = el('p', 'cas-rl-note',
      'A reset puts you back at the ' + fmt(B.STARTING) + ' starting stake and begins a new run. ' +
      'Your lifetime stats are kept.');

    var actions = el('div', 'cas-rl-actions');
    var sec = opts.secondary === null ? null : (opts.secondary || { label: '← Lobby', href: '../casino/' });
    var secEl = null;
    if (sec) {
      if (sec.href) {
        secEl = el('a', 'cas-rl-btn cas-rl-btn-ghost', sec.label);
        secEl.href = sec.href;
      } else {
        secEl = el('button', 'cas-rl-btn cas-rl-btn-ghost', sec.label);
        secEl.type = 'button';
        secEl.addEventListener('click', function () {
          if (current !== m) return;
          var cb = sec.onClick;
          teardown();
          if (cb) cb();
        });
      }
      actions.appendChild(secEl);
    }
    var primary = el('button', 'cas-rl-btn cas-rl-btn-primary', 'Reset to ' + fmt(B.STARTING));
    primary.type = 'button';
    actions.appendChild(primary);

    box.appendChild(el('div', 'cas-rl-kicker', 'Limestone Games'));
    box.appendChild(live);
    box.appendChild(bank);
    box.appendChild(note);
    box.appendChild(actions);
    root.appendChild(box);
    document.body.appendChild(root);

    var m = {
      opts: opts, root: root, box: box, amt: amt,
      state: 'broke', timers: [], raf: 0,
      prevFocus: document.activeElement
    };
    current = m;

    primary.addEventListener('click', function () {
      if (current !== m) return;
      if (m.state === 'broke') startReset();
      else if (m.state === 'done') finish(m);
    });
    root.addEventListener('click', function (e) {
      if (e.target === root && m.state === 'done') finish(m);
    });
    // Pressing the backdrop shouldn't drop focus to <body>; keep it on the button.
    root.addEventListener('mousedown', function (e) {
      if (e.target === root) e.preventDefault();
    });

    function startReset() {
      var from = B.read();
      var v = reset(opts.game);
      m.state = 'resetting';
      box.classList.add('is-resetting');
      title.textContent = 'Resetting your bankroll…';
      msg.textContent = 'Back to the ' + fmt(v) + ' starting stake.';
      note.style.display = 'none';
      if (secEl) secEl.style.display = 'none';
      primary.disabled = true;
      primary.textContent = 'Resetting…';
      if (opts.onReset) {
        try { opts.onReset(v); } catch (e) { console.error(e); }
      }
      countUp(m, from, v);
      // The state change runs on a timer, not rAF, so it completes even when
      // the tab isn't painting.
      m.timers.push(setTimeout(function () {
        m.state = 'done';
        box.classList.remove('is-resetting');
        box.classList.add('is-done');
        amt.textContent = fmt(v);
        title.textContent = 'Bankroll reset.';
        msg.textContent = 'You have ' + fmt(v) + ' to play with. Your last run is saved in your lifetime stats.';
        primary.disabled = false;
        primary.textContent = opts.continueLabel || 'Back to the table';
        primary.focus();
      }, COUNT_MS + 150));
    }

    setTimeout(function () { if (current === m) primary.focus(); }, 30);
  }

  function countUp(m, from, to) {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !window.requestAnimationFrame) { m.amt.textContent = fmt(to); return; }
    var t0 = null;
    function step(t) {
      if (current !== m || m.state !== 'resetting') return;
      if (t0 == null) t0 = t;
      var p = Math.min(1, (t - t0) / COUNT_MS);
      var eased = 1 - Math.pow(1 - p, 3);
      m.amt.textContent = fmt(from + (to - from) * eased);
      if (p < 1) m.raf = requestAnimationFrame(step);
    }
    m.raf = requestAnimationFrame(step);
  }

  function finish(m) {
    if (!m || current !== m) return;
    var cb = m.opts.onClose;
    teardown();
    if (cb) {
      try { cb(); } catch (e) { console.error(e); }
    }
  }

  function teardown() {
    var m = current;
    if (!m) return;
    current = null;
    m.timers.forEach(clearTimeout);
    if (m.raf) cancelAnimationFrame(m.raf);
    if (m.root.parentNode) m.root.parentNode.removeChild(m.root);
    var prev = m.prevFocus;
    if (prev && prev.focus && prev !== document.body && document.contains(prev)) {
      try { prev.focus({ preventScroll: true }); } catch (e) {}
    }
  }

  // While the modal is up, the table behind it must not see keys (Space deals,
  // spins and rolls). Capture-phase on window runs before every game listener.
  // Enter and Space press the focused modal control here rather than through
  // the browser's native activation, which hangs off a separate keypress/keyup
  // event: one deterministic press, and Space never scrolls the page behind.
  function onKey(e) {
    if (!current) return;
    e.stopPropagation();
    if (e.type !== 'keydown') return;
    var box = current.box;
    if (e.key === 'Tab') {
      e.preventDefault();
      var f = Array.prototype.filter.call(box.querySelectorAll('a[href],button'), function (n) {
        return !n.disabled && n.style.display !== 'none';
      });
      if (!f.length) return;
      var i = f.indexOf(document.activeElement);
      var next = e.shiftKey ? (i <= 0 ? f.length - 1 : i - 1) : (i === f.length - 1 ? 0 : i + 1);
      f[next].focus();
      return;
    }
    if (e.key === 'Escape' && current.state === 'done') {
      e.preventDefault();
      finish(current);
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      var t = e.target;
      if (!e.repeat && box.contains(t) && (t.tagName === 'BUTTON' || t.tagName === 'A') && !t.disabled) t.click();
    }
  }
  window.addEventListener('keydown', onKey, true);
  window.addEventListener('keyup', onKey, true);
  window.addEventListener('keypress', onKey, true);

  // The bankroll can recover while the modal is up: a reset in another tab, or
  // cloud sync restoring another device's balance. Adopt it and get out of the way.
  function onExternal(e) {
    if (!current || current.state !== 'broke') return;
    var B = window.CASINO_BANKROLL;
    if (e.type === 'storage' && e.key !== B.KEY) return;
    var v = B.read();
    if (v < (current.opts.minBet || B.MIN_PLAYABLE)) return;
    var o = current.opts;
    teardown();
    try {
      if (o.onReset) o.onReset(v);
      if (o.onClose) o.onClose();
    } catch (err) { console.error(err); }
  }
  window.addEventListener('storage', onExternal);
  window.addEventListener('casino:hydrated', onExternal);

  window.CASINO_RELOAD = { open: open, close: teardown, reset: reset };
})();
