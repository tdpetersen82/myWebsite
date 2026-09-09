/* Shared end-of-run recommendations. Games own scoring, persistence and restart. */
(function () {
  'use strict';
  const titles = {
    'block-puzzle': 'Block Puzzle', pong: 'Pong', breakout: 'Breakout',
    'space-invaders': 'Space Invaders', asteroids: 'Asteroids', simon: 'Simon',
    'spacex-lander': 'SpaceX Lander', frogger: 'Frogger', 'lunar-lander': 'Lunar Lander',
    'missile-command': 'Missile Command', defender: 'Defender'
  };
  const related = {
    'block-puzzle': ['simon', 'breakout', 'frogger'],
    pong: ['breakout', 'block-puzzle', 'frogger'],
    breakout: ['pong', 'space-invaders', 'block-puzzle'],
    'space-invaders': ['asteroids', 'defender', 'missile-command'],
    asteroids: ['space-invaders', 'defender', 'lunar-lander'],
    simon: ['block-puzzle', 'frogger', 'pong'],
    'spacex-lander': ['lunar-lander', 'asteroids', 'missile-command'],
    'lunar-lander': ['spacex-lander', 'asteroids', 'defender'],
    'missile-command': ['space-invaders', 'defender', 'asteroids'],
    defender: ['space-invaders', 'asteroids', 'missile-command']
  };
  let dialog, restart, previousFocus;
  const game = location.pathname.split('/').filter(Boolean)[0];
  function hide() {
    if (dialog && dialog.open) dialog.close();
    restart = null;
  }
  function build() {
    dialog = document.createElement('dialog');
    dialog.className = 'arcade-end';
    dialog.setAttribute('aria-labelledby', 'arcade-end-title');
    dialog.innerHTML = '<button class="arcade-end-close" type="button" aria-label="Close game-over panel">×</button>' +
      '<p class="arcade-end-eyebrow">RUN COMPLETE</p><h2 id="arcade-end-title">Game over</h2>' +
      '<p class="arcade-end-score"></p><p class="arcade-end-best"></p>' +
      '<button class="arcade-end-again" type="button" autofocus>▶ Play again</button>' +
      '<h3>Play next</h3><div class="arcade-end-games"></div>' +
      '<a class="arcade-end-all" href="../arcade/" data-game="arcade">All arcade games →</a>';
    const grid = dialog.querySelector('.arcade-end-games');
    for (const id of related[game] || ['frogger', 'asteroids', 'pong']) {
      if (id === game) continue;
      const link = document.createElement('a');
      link.href = '../' + id + '/'; link.dataset.game = id;
      const img = document.createElement('img');
      img.src = '../assets/thumbs/' + id + '-arcade-20260909.png'; img.alt = '';
      img.width = img.height = 160; img.decoding = 'async';
      const label = document.createElement('span'); label.textContent = titles[id];
      link.append(img, label); grid.appendChild(link);
    }
    dialog.querySelector('.arcade-end-close').addEventListener('click', hide);
    dialog.querySelector('.arcade-end-again').addEventListener('click', () => {
      const play = restart;
      hide();
      if (play) play();
    });
    // Keep game keyboard handlers from treating dialog navigation as gameplay.
    for (const type of ['keydown', 'keyup', 'pointerdown', 'click']) {
      dialog.addEventListener(type, event => event.stopPropagation());
    }
    dialog.addEventListener('close', () => {
      restart = null;
      if (previousFocus && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
    });
    dialog.querySelectorAll('a[data-game]').forEach(link => {
      link.addEventListener('click', () => {
        if (typeof window.gtag === 'function') window.gtag('event', 'play_next', { from: game, to_game: link.dataset.game });
      });
    });
    document.body.appendChild(dialog);
  }
  window.ArcadeGameOver = {
    show(options = {}) {
      if (!dialog) build();
      restart = options.restart || (() => window.gameAPI && window.gameAPI.restart());
      const score = Number(options.score ?? document.getElementById('score')?.textContent ?? 0);
      const best = Math.max(score, Number(options.best ?? document.getElementById('highScore')?.textContent ?? 0));
      dialog.querySelector('.arcade-end-score').textContent = 'Score: ' + score.toLocaleString();
      dialog.querySelector('.arcade-end-best').textContent = 'Best: ' + best.toLocaleString();
      if (!dialog.open) {
        previousFocus = document.activeElement;
        dialog.showModal();
      }
      dialog.querySelector('.arcade-end-again').focus({ preventScroll: true });
    },
    hide
  };
})();
