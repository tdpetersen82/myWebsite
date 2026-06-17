/* =====================================================================
   Limestone Arcade — auto-chrome installer
   Drop this on any game page with one line. It finds the game's <canvas>
   (vanilla games: present at parse time; Phaser games: created async after
   Phaser boots), wraps it in the Cabinet Hall chrome, builds the top bar
   from <title> and data-attrs, and hooks pause/restart/mute to either
   window.gameAPI or a synthetic keyboard event.

   The chrome is a presentation layer ONLY — it does not persist scores.
   Each game owns its own persistence (localStorage, Cloudflare JSON, etc).
   The chrome mirrors the page's existing #score and #highScore elements
   into the topbar via MutationObserver.

   Usage on a game page:

     <link rel="stylesheet" href="../arcade/arcade-game.css">
     <body class="ch-game" data-category="arcade"
           data-eyebrow="Cabinet · Pong"
           data-title="Pong"
           data-hint-1="↑↓ move paddle"
           data-hint-2="Space pause"
           data-hint-3="R restart">
       <!-- existing game markup, including <canvas> -->
       <script src="../arcade/arcade-chrome.js"></script>
     </body>
   ===================================================================== */
(function () {
  if (document.querySelector('.ch-stage')) return;

  const body = document.body;
  if (!body || !body.classList.contains('ch-game')) return;

  let installed = false;
  const startedAt = Date.now();
  const TIMEOUT_MS = 3000;

  function tryInstall() {
    if (installed) return true;
    const canvas = document.querySelector('canvas');
    if (!canvas) return false;
    install(canvas);
    installed = true;
    return true;
  }

  // First synchronous attempt — vanilla games have a canvas at parse time.
  if (!tryInstall()) {
    // Phaser games inject the canvas into #phaser-container or
    // #game-container after their async boot. Watch for it.
    const observer = new MutationObserver(() => {
      if (tryInstall()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Belt-and-suspenders polling fallback in case the observer misses.
    const poll = setInterval(() => {
      if (tryInstall() || Date.now() - startedAt > TIMEOUT_MS) {
        clearInterval(poll);
        observer.disconnect();
      }
    }, 50);
  }

  function install(canvas) {
    const d = body.dataset;
    const title    = d.title    || document.title.split('—')[0].trim() || 'Game';
    const eyebrow  = d.eyebrow  || ('Cabinet · ' + title);
    const hint1    = body.getAttribute('data-hint-1') || '←→ move';
    const hint2    = body.getAttribute('data-hint-2') || 'Space pause';
    const hint3    = body.getAttribute('data-hint-3') || 'R restart';
    // Back link points to the game's category hub (e.g. /arcade/), not the site
    // root. Falls back to data-back, then the category, then the site root.
    const cat       = d.category || 'arcade';
    const backHref  = d.back      || ('../' + cat + '/');
    const backLabel = d.backLabel || ('← ' + cat.charAt(0).toUpperCase() + cat.slice(1));

    // Read initial values from each game's existing in-page elements (the
    // chrome JS hides these via CSS but keeps them as the source of truth).
    const pageScoreEl = document.getElementById('score');
    const pageHiEl    = document.getElementById('highScore') || document.getElementById('hi');
    const initialScore = pageScoreEl ? pageScoreEl.textContent.trim() : '0';
    const initialHi    = pageHiEl    ? pageHiEl.textContent.trim()    : '0';

    const stage = document.createElement('div');
    stage.className = 'ch-stage';
    stage.innerHTML = `
      <header class="ch-topbar">
        <a class="ch-back" href="${backHref}">${backLabel}</a>
        <div class="ch-title">
          <div class="ch-eyebrow"><span class="ch-dot"></span>${eyebrow}</div>
          <h1>${title}</h1>
        </div>
        <div class="ch-scores">
          <div class="ch-score"><span class="ch-l">Score</span><b id="ch-score">${initialScore}</b></div>
          <div class="ch-score"><span class="ch-l">Hi</span><b id="ch-hi">${initialHi}</b></div>
        </div>
        <div class="ch-controls">
          <button class="ch-btn" data-act="pause">Pause</button>
          <button class="ch-btn" data-act="restart">Restart</button>
          <button class="ch-btn ch-btn-icon" data-act="mute" aria-label="Mute">♪</button>
        </div>
      </header>
      <div class="ch-bezel">
        <span class="ch-coin">INSERT COIN</span>
      </div>
      <footer class="ch-hint">
        <span>${kbd(hint1)}</span><span>${kbd(hint2)}</span><span>${kbd(hint3)}</span>
      </footer>
    `;

    // Phaser games wrap their canvas in #phaser-container or #game-container.
    // Move the wrapper (not the canvas itself) so Phaser.Scale.FIT keeps
    // computing layout against a sized parent.
    const wrapper = canvas.parentElement;
    const moveTarget = (wrapper && (wrapper.id === 'phaser-container' || wrapper.id === 'game-container'))
      ? wrapper : canvas;
    moveTarget.parentNode.insertBefore(stage, moveTarget);
    stage.querySelector('.ch-bezel').appendChild(moveTarget);

    // Wire control buttons. window.gameAPI takes precedence; falls back to
    // dispatching keyboard events so games can opt out of explicit hooks.
    const bezel = stage.querySelector('.ch-bezel');
    let paused = false, muted = false;

    function call(name, key) {
      if (window.gameAPI && typeof window.gameAPI[name] === 'function') {
        window.gameAPI[name]();
      } else if (key) {
        fireKey('keydown', key);
      }
    }

    // Hide the "INSERT COIN" attract text once the player has interacted
    // with the game (first keypress, canvas click, or restart). Add the
    // .ch-started class to the bezel; CSS hides .ch-coin from then on.
    const markStarted = () => bezel.classList.add('ch-started');
    window.addEventListener('keydown', markStarted, { once: true });
    canvas.addEventListener('click', markStarted, { once: true });
    canvas.addEventListener('touchstart', markStarted, { once: true, passive: true });

    stage.querySelector('[data-act="pause"]').addEventListener('click', () => {
      paused = !paused;
      bezel.classList.toggle('ch-paused', paused);
      call('pause', ' ');
    });
    stage.querySelector('[data-act="restart"]').addEventListener('click', () => {
      paused = false; bezel.classList.remove('ch-paused');
      markStarted();
      call('restart', 'r');
    });
    const muteBtn = stage.querySelector('[data-act="mute"]');
    muteBtn.addEventListener('click', () => {
      muted = !muted;
      muteBtn.dataset.active = muted;
      muteBtn.textContent = muted ? '♪̸' : '♪';
      call('mute', 'm');
    });

    // ── Real Start overlay ───────────────────────────────────────────────
    // Games that expose window.gameAPI.start get a clear, clickable/tappable
    // "Press Start" panel instead of the cosmetic INSERT COIN. Any first key
    // (or a synthetic key from a touch button) also begins. gameAPI.start is
    // expected to be a no-op if the game is already running.
    if (window.gameAPI && typeof window.gameAPI.start === 'function') {
      const coin = bezel.querySelector('.ch-coin');
      if (coin) coin.remove();
      const startEl = document.createElement('button');
      startEl.type = 'button';
      startEl.className = 'ch-start';
      startEl.innerHTML =
        '<span class="ch-start-btn">▶ Press Start</span>' +
        '<span class="ch-start-sub">Tap, click, or press a key</span>';
      bezel.appendChild(startEl);
      const begin = () => {
        if (startEl.parentNode) startEl.remove();
        markStarted();
        try { window.gameAPI.start(); } catch (e) {}
      };
      startEl.addEventListener('click', begin);
      window.addEventListener('keydown', begin, { once: true });
    }

    // ── On-screen touch controls (per-game data-touch spec) ───────────────
    // Spec: groups separated by "|", buttons by ",", each "glyph:Key".
    // Prefix the key with "~" for hold-to-repeat (movement). Example:
    //   data-touch="◀:~ArrowLeft,▶:~ArrowRight | ↻:ArrowUp,FIRE:Space"
    if (d.touch) {
      const pad = document.createElement('div');
      pad.className = 'ch-touch';
      d.touch.split('|').forEach((groupSpec) => {
        const group = document.createElement('div');
        group.className = 'ch-touch-group';
        groupSpec.split(',').forEach((btnSpec) => {
          const spec = btnSpec.trim();
          const ci = spec.indexOf(':');
          if (ci < 0) return;
          const label = spec.slice(0, ci).trim();
          let keyName = spec.slice(ci + 1).trim();
          const repeat = keyName.charAt(0) === '~';
          if (repeat) keyName = keyName.slice(1);
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'ch-touch-btn';
          b.textContent = label;
          b.setAttribute('aria-label', keyName);
          wireTouchButton(b, keyName, repeat, markStarted);
          group.appendChild(b);
        });
        pad.appendChild(group);
      });
      bezel.insertAdjacentElement('afterend', pad);
    }

    // Mirror the page's existing score / hi elements into the chrome topbar.
    // No localStorage writes — each game owns persistence (CF JSON or local).
    const chScoreEl = stage.querySelector('#ch-score');
    const chHiEl    = stage.querySelector('#ch-hi');

    // Games that keep score only on their own canvas (no #score element) get
    // no frozen "0" in the chrome topbar — hide the score block entirely.
    if (!pageScoreEl && !pageHiEl) {
      const sc = stage.querySelector('.ch-scores');
      if (sc) sc.style.display = 'none';
    }

    if (pageScoreEl) {
      new MutationObserver(() => {
        chScoreEl.textContent = pageScoreEl.textContent.trim();
      }).observe(pageScoreEl, { childList: true, characterData: true, subtree: true });
    }
    if (pageHiEl) {
      new MutationObserver(() => {
        chHiEl.textContent = pageHiEl.textContent.trim();
      }).observe(pageHiEl, { childList: true, characterData: true, subtree: true });
    }

    // De-dupe headings: the chrome injects the page's visible <h1> in the topbar,
    // so remove any other <h1> (each game ships its own, hidden by CSS) to keep a
    // single h1 in the document outline for SEO / screen-reader navigation.
    document.querySelectorAll('h1').forEach((h) => { if (!stage.contains(h)) h.remove(); });
  }

  // ── Synthetic key dispatch ───────────────────────────────────────────
  // Drives both vanilla games (which read event.key) and Phaser games (which
  // look the Key up by event.keyCode). The KeyboardEvent constructor ignores
  // keyCode/which, so we redefine them. Dispatched on document so it reaches
  // document-level listeners AND bubbles up to window-level (Phaser) ones.
  const KEYCODES = { ArrowLeft:37, ArrowUp:38, ArrowRight:39, ArrowDown:40, Space:32, ' ':32, Enter:13, Escape:27, Esc:27, Shift:16 };
  function keyCodeFor(k) {
    if (KEYCODES[k] != null) return KEYCODES[k];
    if (k.length === 1) return k.toUpperCase().charCodeAt(0);
    return 0;
  }
  function codeFor(k) {
    if (k === ' ' || k === 'Space') return 'Space';
    if (/^Arrow/.test(k)) return k;
    if (k === 'Enter') return 'Enter';
    if (k === 'Escape' || k === 'Esc') return 'Escape';
    if (k === 'Shift') return 'ShiftLeft';
    if (k.length === 1) return (/[a-z]/i.test(k) ? 'Key' + k.toUpperCase() : 'Digit' + k);
    return k;
  }
  function fireKey(type, keyName) {
    const kc = keyCodeFor(keyName);
    const key = (keyName === 'Space') ? ' ' : keyName;
    const ev = new KeyboardEvent(type, { key: key, code: codeFor(keyName), bubbles: true, cancelable: true });
    try {
      Object.defineProperty(ev, 'keyCode', { get: function () { return kc; } });
      Object.defineProperty(ev, 'which',   { get: function () { return kc; } });
    } catch (e) {}
    document.dispatchEvent(ev);
  }

  // Wire one on-screen touch button to hold-to-press a key. Movement keys pass
  // repeat=true so holding the button auto-repeats after a short delay.
  function wireTouchButton(btn, keyName, repeat, markStarted) {
    let holdTimer = null, repTimer = null, down = false;
    const press = (e) => {
      if (e) e.preventDefault();
      if (down) return;
      down = true;
      markStarted();
      fireKey('keydown', keyName);
      if (repeat) {
        holdTimer = setTimeout(() => {
          repTimer = setInterval(() => fireKey('keydown', keyName), 80);
        }, 260);
      }
      btn.classList.add('ch-touch-active');
    };
    const release = () => {
      if (!down) return;
      down = false;
      if (holdTimer) clearTimeout(holdTimer);
      if (repTimer) clearInterval(repTimer);
      holdTimer = repTimer = null;
      fireKey('keyup', keyName);
      btn.classList.remove('ch-touch-active');
    };
    btn.addEventListener('pointerdown', press);
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointercancel', release);
    btn.addEventListener('pointerleave', release);
    btn.addEventListener('lostpointercapture', release);
    window.addEventListener('blur', release);
  }

  function kbd(s) {
    return s.split(/\s+/).map((tok, i) => {
      if (i === 0 || /^[A-Z]/.test(tok) || tok.length === 1 || /[←→↑↓]/.test(tok)) {
        return `<kbd>${tok}</kbd>`;
      }
      return tok;
    }).join(' ');
  }
})();
