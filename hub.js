// Limestone Games — homepage interactivity
// Renders mosaic, all-games grid, sidebar, and handles search/filter/hover.

(function () {
  'use strict';

  // ── Game catalog ───────────────────────────────────────────────────────
  const GAMES = [
    { id: 'snake',             name: 'Snake',             cat: 'kids',    desc: "Eat, grow, don't crash.",         color: '#7BC97B', plays: '12.4k' },
    { id: 'bubble-pop',        name: 'Bubble Pop',        cat: 'kids',    desc: 'Tap bubbles before they float away.', color: '#FF8FA3', plays: '0',    isNew: true },
    { id: 'memory-match',      name: 'Memory Match',      cat: 'kids',    desc: 'Flip cards. Find the pairs.',      color: '#FFD93D', plays: '0',    isNew: true },
    { id: 'shape-sorter',      name: 'Shape Sorter',      cat: 'kids',    desc: 'Drag shapes into matching buckets.', color: '#6DD5FA', plays: '0',    isNew: true },
    { id: 'counting-critters', name: 'Counting Critters', cat: 'kids',    desc: 'How many critters? Tap the number.', color: '#A78BFA', plays: '0',    isNew: true },
    { id: 'pong',              name: 'Pong',              cat: 'classic', desc: 'Paddle vs. AI. Keep it alive.',    color: '#8FA8E6', plays: '8.2k'  },
    { id: 'breakout',          name: 'Breakout',          cat: 'classic', desc: 'Bricks, ball, bounce.',            color: '#F2A65A', plays: '15.1k' },
    { id: 'space-invaders',    name: 'Space Invasion',    cat: 'classic', desc: 'Defend Earth from alien waves.',   color: '#9B7EDC', plays: '11.8k' },
    { id: 'block-puzzle',      name: 'Block Puzzle',      cat: 'classic', desc: 'Stack, clear, score.',             color: '#5DC4D9', plays: '22.6k' },
    { id: 'asteroids',         name: 'Asteroids',         cat: 'classic', desc: 'Pilot through the rocks.',         color: '#A78BFA', plays: '9.4k'  },
    { id: 'frogger',           name: 'Frogger',           cat: 'classic', desc: 'Hop home through traffic.',        color: '#7BC97B', plays: '6.7k'  },
    { id: 'missile-command',   name: 'Missile Command',   cat: 'classic', desc: 'Defend cities from above.',        color: '#F2A65A', plays: '4.9k'  },
    { id: 'lunar-lander',      name: 'Lunar Lander',      cat: 'classic', desc: 'Touch down softly.',               color: '#8FA8E6', plays: '5.5k'  },
    { id: 'spacex-lander',     name: 'SpaceX Lander',     cat: 'classic', desc: 'Land the Falcon 9.',               color: '#5DC4D9', plays: '7.1k'  },
    { id: 'defender',          name: 'Defender',          cat: 'classic', desc: 'Save the humanoids.',              color: '#9B7EDC', plays: '3.2k'  },
    { id: 'simon',             name: 'Simon',             cat: 'classic', desc: 'Watch. Repeat. Repeat longer.',    color: '#F08488', plays: '8.6k'  },
    { id: 'connect-4',         name: 'Connect 4',         cat: 'puzzle',  desc: 'Four in a row beats the AI.',      color: '#8FA8E6', plays: '14.3k' },
    { id: 'connect-dots',      name: 'Dots & Boxes',      cat: 'puzzle',  desc: 'Lines, boxes, strategy.',          color: '#F08488', plays: '5.8k'  },
    { id: 'blackjack',         name: 'Blackjack',         cat: 'casino',  desc: 'Hit 21 with strategy hints.',      color: '#7BC97B', plays: '18.9k' },
    { id: 'roulette',          name: 'Roulette',          cat: 'casino',  desc: 'Spin the European wheel.',         color: '#F08488', plays: '6.4k'  },
    { id: 'video-poker',       name: 'Video Poker',       cat: 'casino',  desc: 'Jacks or Better. Hold smart.',     color: '#A78BFA', plays: '11.2k' },
    { id: 'baccarat',          name: 'Baccarat',          cat: 'casino',  desc: 'Player or Banker?',                color: '#F2A65A', plays: '3.7k'  },
    { id: 'craps',             name: 'Craps',             cat: 'casino',  desc: 'Roll the bones.',                  color: '#5DC4D9', plays: '4.1k'  },
    { id: 'three-card-poker',  name: 'Three Card Poker',  cat: 'casino',  desc: 'Play or fold? Three cards.',       color: '#9B7EDC', plays: '5.3k'  },
  ];

  const CATEGORIES = [
    { id: 'classic', label: 'Arcade' },
    { id: 'kids',    label: 'Kids' },
    { id: 'puzzle',  label: 'Strategy & Puzzles' },
    { id: 'casino',  label: 'Casino' },
  ];

  const HIGH_SCORES = {
    snake: '1,840', pong: 21, breakout: '4,720', 'space-invaders': '9,650', 'block-puzzle': '38,400',
    asteroids: '12,200', frogger: 880, simon: 27, blackjack: '+$420', roulette: '+$185',
  };

  // Per-game inline SVG glyph (paths only; svg wrapper added at render time).
  const GLYPH_PATHS = {
    snake: '<rect x="14" y="14" width="10" height="10" rx="2" fill="C"/><rect x="26" y="14" width="10" height="10" rx="2" fill="C"/><rect x="38" y="14" width="10" height="10" rx="2" fill="C"/><rect x="38" y="26" width="10" height="10" rx="2" fill="C"/><rect x="38" y="38" width="10" height="10" rx="2" fill="C"/>',
    pong: '<rect x="10" y="14" width="6" height="34" rx="3" fill="C"/><rect x="48" y="20" width="6" height="34" rx="3" fill="C" opacity="0.7"/><circle cx="32" cy="32" r="4" fill="C"/>',
    breakout: '<rect x="8" y="10" width="12" height="6" rx="2" fill="C"/><rect x="22" y="10" width="12" height="6" rx="2" fill="C" opacity="0.7"/><rect x="36" y="10" width="12" height="6" rx="2" fill="C"/><rect x="8" y="18" width="12" height="6" rx="2" fill="C" opacity="0.6"/><rect x="22" y="18" width="12" height="6" rx="2" fill="C"/><rect x="20" y="50" width="24" height="5" rx="2.5" fill="C"/><circle cx="32" cy="40" r="3.5" fill="C" opacity="0.8"/>',
    'space-invaders': '<rect x="20" y="14" width="6" height="6" fill="C"/><rect x="38" y="14" width="6" height="6" fill="C"/><rect x="14" y="20" width="36" height="10" rx="2" fill="C"/><rect x="10" y="26" width="6" height="8" fill="C"/><rect x="48" y="26" width="6" height="8" fill="C"/><rect x="20" y="34" width="8" height="4" fill="C"/><rect x="36" y="34" width="8" height="4" fill="C"/><rect x="28" y="48" width="8" height="6" rx="1" fill="C" opacity="0.7"/>',
    'block-puzzle': '<rect x="8" y="40" width="10" height="10" rx="2" fill="C"/><rect x="18" y="40" width="10" height="10" rx="2" fill="C"/><rect x="18" y="30" width="10" height="10" rx="2" fill="C"/><rect x="28" y="40" width="10" height="10" rx="2" fill="C" opacity="0.7"/><rect x="38" y="40" width="10" height="10" rx="2" fill="C" opacity="0.7"/><rect x="38" y="30" width="10" height="10" rx="2" fill="C" opacity="0.7"/><rect x="38" y="12" width="10" height="10" rx="2" fill="C" opacity="0.4"/>',
    asteroids: '<polygon points="32,8 22,14 14,22 18,32 14,42 28,46 42,42 46,32 42,22 38,14" fill="none" stroke="C" stroke-width="3" stroke-linejoin="round"/><polygon points="32,28 28,34 32,40 36,34" fill="C"/>',
    frogger: '<ellipse cx="32" cy="34" rx="12" ry="9" fill="C"/><circle cx="26" cy="26" r="4" fill="C"/><circle cx="38" cy="26" r="4" fill="C"/><circle cx="26" cy="25" r="1.5" fill="#fff"/><circle cx="38" cy="25" r="1.5" fill="#fff"/>',
    'missile-command': '<circle cx="20" cy="38" r="3" fill="C"/><line x1="20" y1="38" x2="40" y2="14" stroke="C" stroke-width="2.5" stroke-dasharray="3 3"/><polygon points="40,12 36,18 44,18" fill="C"/><rect x="10" y="44" width="44" height="6" rx="2" fill="C" opacity="0.4"/>',
    'lunar-lander': '<polygon points="32,12 22,28 42,28" fill="C"/><rect x="26" y="28" width="12" height="6" fill="C" opacity="0.8"/><line x1="22" y1="28" x2="16" y2="40" stroke="C" stroke-width="2"/><line x1="42" y1="28" x2="48" y2="40" stroke="C" stroke-width="2"/><rect x="14" y="44" width="36" height="6" rx="1" fill="C" opacity="0.3"/>',
    'spacex-lander': '<rect x="28" y="10" width="8" height="26" rx="3" fill="C"/><polygon points="28,36 22,48 30,48" fill="C" opacity="0.7"/><polygon points="36,36 42,48 34,48" fill="C" opacity="0.7"/><rect x="10" y="50" width="44" height="4" rx="1" fill="C" opacity="0.4"/>',
    defender: '<path d="M8 32 Q20 22 32 30 T56 28" fill="none" stroke="C" stroke-width="3"/><circle cx="14" cy="34" r="2" fill="C"/><circle cx="48" cy="32" r="2" fill="C" opacity="0.7"/>',
    simon: '<path d="M32 8 A24 24 0 0 1 56 32 L32 32 Z" fill="C"/><path d="M56 32 A24 24 0 0 1 32 56 L32 32 Z" fill="C" opacity="0.7"/><path d="M32 56 A24 24 0 0 1 8 32 L32 32 Z" fill="C" opacity="0.5"/><path d="M8 32 A24 24 0 0 1 32 8 L32 32 Z" fill="C" opacity="0.85"/>',
    'connect-4': '<rect x="8" y="10" width="48" height="44" rx="4" fill="C" opacity="0.25"/><circle cx="18" cy="22" r="4" fill="C"/><circle cx="32" cy="22" r="4" fill="C" opacity="0.5"/><circle cx="46" cy="22" r="4" fill="C"/><circle cx="18" cy="36" r="4" fill="C" opacity="0.5"/><circle cx="32" cy="36" r="4" fill="C"/><circle cx="46" cy="36" r="4" fill="C" opacity="0.5"/>',
    'connect-dots': '<circle cx="14" cy="14" r="3" fill="C"/><circle cx="32" cy="14" r="3" fill="C"/><circle cx="50" cy="14" r="3" fill="C"/><circle cx="14" cy="32" r="3" fill="C"/><circle cx="32" cy="32" r="3" fill="C"/><circle cx="50" cy="32" r="3" fill="C"/><circle cx="14" cy="50" r="3" fill="C"/><circle cx="32" cy="50" r="3" fill="C"/><circle cx="50" cy="50" r="3" fill="C"/><line x1="14" y1="14" x2="32" y2="14" stroke="C" stroke-width="2.5"/><line x1="14" y1="14" x2="14" y2="32" stroke="C" stroke-width="2.5"/><line x1="14" y1="32" x2="32" y2="32" stroke="C" stroke-width="2.5"/><line x1="32" y1="14" x2="32" y2="32" stroke="C" stroke-width="2.5"/>',
    blackjack: '<rect x="8" y="14" width="22" height="32" rx="3" fill="#fff" stroke="C" stroke-width="2"/><text x="13" y="26" font-size="10" fill="C" font-weight="700">A</text><rect x="32" y="18" width="22" height="32" rx="3" fill="C"/><text x="38" y="32" font-size="10" fill="#fff" font-weight="700">K</text>',
    roulette: '<circle cx="32" cy="32" r="22" fill="none" stroke="C" stroke-width="3"/><circle cx="32" cy="32" r="14" fill="none" stroke="C" stroke-width="2" opacity="0.5"/><circle cx="32" cy="32" r="4" fill="C"/><circle cx="32" cy="14" r="2.5" fill="C"/><circle cx="50" cy="32" r="2.5" fill="C" opacity="0.6"/>',
    'video-poker': '<rect x="6" y="14" width="14" height="22" rx="2" fill="#fff" stroke="C" stroke-width="1.5"/><rect x="22" y="14" width="14" height="22" rx="2" fill="C"/><rect x="38" y="14" width="14" height="22" rx="2" fill="#fff" stroke="C" stroke-width="1.5"/><rect x="6" y="42" width="46" height="6" rx="2" fill="C" opacity="0.4"/>',
    baccarat: '<rect x="10" y="14" width="20" height="32" rx="3" fill="C"/><rect x="34" y="14" width="20" height="32" rx="3" fill="#2a2a2a"/>',
    craps: '<rect x="8" y="14" width="20" height="20" rx="3" fill="C" transform="rotate(-10 18 24)"/><circle cx="14" cy="20" r="1.5" fill="#fff"/><circle cx="22" cy="28" r="1.5" fill="#fff"/><rect x="32" y="22" width="20" height="20" rx="3" fill="#fff" stroke="C" stroke-width="1.5" transform="rotate(8 42 32)"/><circle cx="38" cy="28" r="1.5" fill="C"/><circle cx="46" cy="36" r="1.5" fill="C"/><circle cx="42" cy="32" r="1.5" fill="C"/>',
    'three-card-poker': '<rect x="6" y="18" width="16" height="26" rx="2" fill="#fff" stroke="C" stroke-width="1.5" transform="rotate(-8 14 30)"/><rect x="22" y="14" width="16" height="26" rx="2" fill="#fff" stroke="C" stroke-width="1.5"/><rect x="40" y="18" width="16" height="26" rx="2" fill="#fff" stroke="C" stroke-width="1.5" transform="rotate(8 48 30)"/>',
    'bubble-pop': '<circle cx="20" cy="22" r="9" fill="C" opacity="0.55"/><circle cx="17" cy="19" r="2.5" fill="#fff" opacity="0.9"/><circle cx="42" cy="34" r="11" fill="C" opacity="0.45"/><circle cx="38" cy="30" r="3" fill="#fff" opacity="0.9"/><circle cx="28" cy="46" r="7" fill="C" opacity="0.65"/><circle cx="26" cy="44" r="2" fill="#fff" opacity="0.9"/>',
    'memory-match': '<rect x="6"  y="10" width="16" height="20" rx="3" fill="C"/><rect x="24" y="10" width="16" height="20" rx="3" fill="C" opacity="0.55"/><rect x="42" y="10" width="16" height="20" rx="3" fill="C"/><rect x="6"  y="34" width="16" height="20" rx="3" fill="C" opacity="0.55"/><rect x="24" y="34" width="16" height="20" rx="3" fill="C"/><rect x="42" y="34" width="16" height="20" rx="3" fill="C" opacity="0.55"/><circle cx="32" cy="44" r="3" fill="#fff"/>',
    'shape-sorter': '<circle cx="14" cy="14" r="6" fill="C"/><rect x="26" y="8" width="12" height="12" rx="2" fill="C" opacity="0.7"/><polygon points="50,8 56,20 44,20" fill="C"/><rect x="6" y="40" width="14" height="14" rx="3" fill="none" stroke="C" stroke-width="2.5"/><rect x="26" y="40" width="14" height="14" rx="3" fill="none" stroke="C" stroke-width="2.5" opacity="0.7"/><rect x="46" y="40" width="14" height="14" rx="3" fill="none" stroke="C" stroke-width="2.5"/>',
    'counting-critters': '<circle cx="14" cy="20" r="6" fill="C"/><circle cx="32" cy="20" r="6" fill="C" opacity="0.7"/><circle cx="50" cy="20" r="6" fill="C"/><text x="32" y="50" font-size="20" font-weight="800" text-anchor="middle" fill="C">3</text>',
  };

  function glyph(game, size) {
    const tpl = GLYPH_PATHS[game.id] || '<rect x="12" y="12" width="40" height="40" rx="8" fill="C"/>';
    const inner = tpl.replace(/"C"/g, `"${game.color}"`);
    return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true">${inner}</svg>`;
  }

  // Featured rhythm: hero + tall + 2 wides + med, plus a native ad slot
  const FEATURED_LAYOUT = [
    { id: 'snake',          size: 's-hero', isHero: true },
    { id: 'blackjack',      size: 's-tall' },
    { id: 'asteroids',      size: 's-wide' },
    { id: 'space-invaders', size: 's-wide' },
    { id: 'bubble-pop',     size: 's-med'  },
  ];
  const FEATURED_IDS = FEATURED_LAYOUT.map(f => f.id);

  // Plays count → numeric for sorting (e.g. '12.4k' → 12400).
  function playsToNum(s) {
    const m = String(s).match(/^([\d.]+)(k|m)?$/i);
    if (!m) return 0;
    let n = parseFloat(m[1]);
    if ((m[2] || '').toLowerCase() === 'k') n *= 1000;
    if ((m[2] || '').toLowerCase() === 'm') n *= 1000000;
    return n;
  }

  // ── DOM helpers ────────────────────────────────────────────────────────
  function el(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }
  function gameUrl(game) { return `${game.id}/`; }

  // ── Tile rendering ─────────────────────────────────────────────────────
  function renderTile(game, size, isHero) {
    const best = HIGH_SCORES[game.id];
    const hero = isHero ? `
      <p class="desc">${game.desc} Pick up where you left off — your scores are saved locally.</p>
    ` : '';
    const heroCta = isHero ? `<span class="play-cta">Play now →</span>` : '';
    const sizeForGlyph = isHero ? 140 : (size === 's-tall' ? 100 : 64);

    const a = el(`
      <a class="tile ${size} has-preview" href="${gameUrl(game)}" style="background:${game.color}22">
        ${game.isNew ? '<span class="tile-new">NEW</span>' : ''}
        ${isHero ? '<span class="tile-tag">★ Featured</span>' : ''}
        <div class="tile-decoration"></div>
        <div class="tile-art">${glyph(game, sizeForGlyph)}</div>
        <div class="tile-preview" style="background:${game.color}14">
          <div class="preview-grid" style="--cell:${game.color}"></div>
        </div>
        <div class="tile-meta">
          <h3>${game.name}</h3>
          ${hero}
          <div class="meta-row">
            <span>▸ ${game.plays}</span>
            ${best != null ? `<span class="best">★ ${best}</span>` : ''}
          </div>
          ${heroCta}
        </div>
      </a>
    `);

    // Build preview grid cells (12x8)
    const grid = a.querySelector('.preview-grid');
    const total = 12 * 8;
    for (let i = 0; i < total; i++) grid.appendChild(document.createElement('div'));
    wirePreview(a, grid, total);
    return a;
  }

  // Animate preview when tile is hovered. Uses requestAnimationFrame-driven interval.
  function wirePreview(tile, grid, total) {
    let timer = null;
    let head = 0;
    const cells = grid.children;
    function step() {
      head = (head + 1) % total;
      for (let i = 0; i < total; i++) cells[i].className = '';
      for (let i = 0; i < 5; i++) {
        const idx = (head - i + total) % total;
        cells[idx].className = 'active';
      }
    }
    tile.addEventListener('mouseenter', () => {
      if (timer) return;
      step();
      timer = setInterval(step, 300);
    });
    tile.addEventListener('mouseleave', () => {
      if (timer) { clearInterval(timer); timer = null; }
      for (let i = 0; i < total; i++) cells[i].className = '';
    });
  }

  function renderAdTile() {
    return el(`
      <div class="tile-ad">
        <div class="ad-tag">Sponsored</div>
        <div class="ad-body">Native 300×250</div>
        <h4>Blends with cards</h4>
      </div>
    `);
  }

  // ── Sidebar ────────────────────────────────────────────────────────────
  function renderSidebar() {
    const side = document.getElementById('hub-side');
    side.innerHTML = '';

    // Stats
    const stats = el(`
      <div class="stats-card">
        <h4>Your stats <span class="more">11-day streak</span></h4>
        <div class="stats-grid">
          <div class="stat"><div class="l">Top score</div><div class="n">38,400</div><div class="s">Block Puzzle</div></div>
          <div class="stat"><div class="l">Plays</div><div class="n">87</div><div class="s">9 games</div></div>
        </div>
      </div>
    `);
    side.appendChild(stats);

    // Trending
    const trending = el(`
      <div class="side-card">
        <h4>Trending this week <span class="more">Top 5</span></h4>
      </div>
    `);
    GAMES.slice()
      .sort((a, b) => playsToNum(b.plays) - playsToNum(a.plays))
      .slice(0, 5)
      .forEach((g, i) => {
        const row = el(`
          <a class="rank" href="${gameUrl(g)}">
            <div class="pos">${String(i + 1).padStart(2, '0')}</div>
            <div class="glyph" style="background:${g.color}33">${glyph(g, 24)}</div>
            <div class="name">${g.name}</div>
            <div class="score">${g.plays}</div>
          </a>
        `);
        trending.appendChild(row);
      });
    side.appendChild(trending);

    // Sidebar ad
    side.appendChild(el(`
      <div class="ad-slot size-sidebar">
        <div>Sponsored · Sidebar</div>
        <div class="ad-size">300 × 600</div>
      </div>
    `));

    // New this month
    const newGames = GAMES.filter(g => g.isNew);
    const newCard = el(`
      <div class="side-card">
        <h4>New this month <span class="more">${newGames.length}</span></h4>
      </div>
    `);
    newGames.slice(0, 4).forEach(g => {
      const row = el(`
        <a class="rank" href="${gameUrl(g)}">
          <div class="glyph" style="background:${g.color}33">${glyph(g, 24)}</div>
          <div class="name">${g.name}</div>
          <div class="score">↗</div>
        </a>
      `);
      newCard.appendChild(row);
    });
    side.appendChild(newCard);
  }

  // ── Main grid rendering ────────────────────────────────────────────────
  let state = { query: '', filter: 'all' };

  function matches(g) {
    if (state.filter === 'new' && !g.isNew) return false;
    if (state.filter !== 'all' && state.filter !== 'new' && g.cat !== state.filter) return false;
    if (state.query) {
      const q = state.query.toLowerCase();
      const hay = (g.name + ' ' + g.desc + ' ' + g.cat).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }

  function renderGrid() {
    const main = document.getElementById('hub-main-grids');
    main.innerHTML = '';

    const isFiltering = state.query || state.filter !== 'all';
    const allMatching = GAMES.filter(matches);
    const total = GAMES.length;

    // Results line (only when filtering)
    const resultsEl = document.getElementById('hub-results');
    if (isFiltering) {
      const filterLabel = state.filter === 'new'
        ? 'New'
        : (CATEGORIES.find(c => c.id === state.filter) || {}).label;
      let s = `${allMatching.length} match${allMatching.length === 1 ? '' : 'es'}`;
      if (state.query) s += ` for "${state.query}"`;
      if (state.filter !== 'all' && filterLabel) s += ` in ${filterLabel}`;
      resultsEl.textContent = s;
      resultsEl.style.display = '';
    } else {
      resultsEl.style.display = 'none';
    }

    if (allMatching.length === 0) {
      main.appendChild(el(`
        <div class="hub-empty">
          <h3>No games match.</h3>
          <p>Try another keyword or clear the filters.</p>
        </div>
      `));
      return;
    }

    if (!isFiltering) {
      // Featured mosaic
      const featuredGames = FEATURED_LAYOUT
        .map(f => ({ ...f, game: GAMES.find(g => g.id === f.id) }))
        .filter(f => f.game && matches(f.game));

      const mosaic = el('<div class="hub-mosaic"></div>');
      featuredGames.forEach(f => mosaic.appendChild(renderTile(f.game, f.size, !!f.isHero)));
      mosaic.appendChild(renderAdTile());
      main.appendChild(mosaic);

      // All games (excluding featured)
      const rest = GAMES.filter(g => !FEATURED_IDS.includes(g.id) && matches(g));
      const head = el(`
        <div class="hub-section-head">
          <h2>All games</h2>
          <div class="rule"></div>
          <span class="count">${rest.length + featuredGames.length} / ${total}</span>
        </div>
      `);
      main.appendChild(head);
      const grid = el('<div class="hub-mosaic tight"></div>');
      rest.forEach(g => grid.appendChild(renderTile(g, 's-base', false)));
      main.appendChild(grid);
    } else {
      const head = el(`
        <div class="hub-section-head">
          <h2>Results</h2>
          <div class="rule"></div>
          <span class="count">${allMatching.length}</span>
        </div>
      `);
      main.appendChild(head);
      const grid = el('<div class="hub-mosaic tight"></div>');
      allMatching.forEach(g => grid.appendChild(renderTile(g, 's-base', false)));
      main.appendChild(grid);
    }
  }

  // ── Filter pills ───────────────────────────────────────────────────────
  function setupPills() {
    const row = document.getElementById('hub-pills');
    row.innerHTML = '';
    const pills = [
      { id: 'all', label: 'All' },
      ...CATEGORIES,
      { id: 'new', label: '⊕ New' },
    ];
    pills.forEach(p => {
      const btn = el(`<button class="hub-pill" data-id="${p.id}">${p.label}</button>`);
      btn.addEventListener('click', () => {
        state.filter = p.id;
        updatePills();
        renderGrid();
      });
      row.appendChild(btn);
    });
    updatePills();
  }
  function updatePills() {
    document.querySelectorAll('#hub-pills .hub-pill').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.id === state.filter);
    });
  }

  // ── Search ─────────────────────────────────────────────────────────────
  function setupSearch() {
    const input = document.getElementById('hub-search-input');
    const clear = document.getElementById('hub-search-clear');
    const kbd = document.getElementById('hub-search-kbd');
    input.placeholder = `Search ${GAMES.length} games…`;
    function syncClear() {
      const has = input.value.length > 0;
      clear.style.display = has ? '' : 'none';
      kbd.style.display = has ? 'none' : '';
    }
    syncClear();
    input.addEventListener('input', () => {
      state.query = input.value;
      syncClear();
      renderGrid();
    });
    clear.addEventListener('click', () => {
      input.value = '';
      state.query = '';
      syncClear();
      renderGrid();
      input.focus();
    });
    // ⌘K / Ctrl+K to focus
    window.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        input.focus();
        input.select();
      }
    });
  }

  // ── Category hero card "stat pills" — counts per category ──────────────
  function setupCategoryHeroes() {
    document.querySelectorAll('.ch-card').forEach(card => {
      const cat = card.dataset.cat;
      const list = GAMES.filter(g => g.cat === cat);
      const newCount = list.filter(g => g.isNew).length;
      const pill = card.querySelector('.ch-stat-pill');
      if (pill) {
        pill.innerHTML = `<b>${list.length}</b> games`
          + (newCount > 0 ? ` · <b>${newCount}</b> new` : '');
      }
      // Each category has its own landing page; the hero card routes there.
      const LANDINGS = { classic: 'arcade/', kids: 'kids/', puzzle: 'puzzles/', casino: 'casino/' };
      card.addEventListener('click', (e) => {
        if (e.target.closest('a')) return;
        const target = LANDINGS[cat];
        if (target) {
          window.location.href = target;
          return;
        }
        state.filter = cat;
        updatePills();
        renderGrid();
        const main = document.getElementById('hub-main-grids');
        if (main) main.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  // ── Boot ───────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    setupCategoryHeroes();
    setupPills();
    setupSearch();
    renderGrid();
    renderSidebar();
  });
})();
