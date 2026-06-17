/* =====================================================================
   Limestone Casino — rotate-to-landscape hint
   These table games are built on a fixed 1380x860 landscape design. On a
   phone in portrait that design can only scale to ~27%, which is unusable.
   Rather than shrink the table, we ask the player to rotate — in landscape
   the table fills the screen. Shown ONLY on portrait phones via a CSS media
   query; in landscape (and on tablets/desktop) the overlay is display:none
   and the game plays normally underneath.

   Games with a dedicated portrait layout (blackjack, roulette) do NOT load
   this — they reflow instead.

   Usage:  <script src="../casino/rotate-hint.js"></script>
   ===================================================================== */
(function () {
  if (document.getElementById('rotate-hint')) return;

  var title = (document.title.split('—')[0] || 'This table').trim();

  var css = '' +
    '#rotate-hint{display:none}' +
    '@media (orientation:portrait) and (max-width:760px){' +
    '  #rotate-hint{' +
    '    display:flex;position:fixed;inset:0;z-index:99999;' +
    '    flex-direction:column;align-items:center;justify-content:center;gap:22px;' +
    '    padding:32px;text-align:center;' +
    '    background:radial-gradient(1200px 700px at 50% 30%, rgba(89,60,30,.5), transparent 70%), #0a0805;' +
    "    color:#F4ECD8;font-family:'Inter',system-ui,sans-serif;" +
    '  }' +
    '  body{overflow:hidden}' +
    '}' +
    '#rotate-hint .rh-phone{width:84px;height:84px;color:#C8A14A;animation:rh-rot 2.4s ease-in-out infinite}' +
    '@keyframes rh-rot{0%,18%{transform:rotate(0)}38%,72%{transform:rotate(-90deg)}92%,100%{transform:rotate(-90deg)}}' +
    "#rotate-hint h2{font-family:'Bricolage Grotesque',serif;font-weight:700;font-size:24px;margin:0;letter-spacing:.2px}" +
    '#rotate-hint p{margin:0;max-width:300px;font-size:15px;line-height:1.5;color:#B9AC92}' +
    '#rotate-hint .rh-eyebrow{font-family:"JetBrains Mono",monospace;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#C8A14A}' +
    '@media (prefers-reduced-motion:reduce){#rotate-hint .rh-phone{animation:none;transform:rotate(-90deg)}}';

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var el = document.createElement('div');
  el.id = 'rotate-hint';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Rotate your device to play');
  el.innerHTML =
    '<svg class="rh-phone" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
      '<rect x="7" y="2" width="10" height="20" rx="2.2" stroke="currentColor" stroke-width="1.6"/>' +
      '<line x1="11" y1="19" x2="13" y2="19" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>' +
    '</svg>' +
    '<div class="rh-eyebrow">' + title + '</div>' +
    '<h2>Rotate your device</h2>' +
    '<p>This table plays best in landscape. Turn your phone sideways to take a seat.</p>';
  (document.body || document.documentElement).appendChild(el);
})();
