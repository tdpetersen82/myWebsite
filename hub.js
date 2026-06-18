// Limestone Games — homepage interactivity
// Renders mosaic, all-games grid, sidebar, and handles search/filter/hover.

(function () {
  'use strict';

  // ── Game catalog ───────────────────────────────────────────────────────
  const GAMES = [
    { id: 'snake',             name: 'Snake',             cat: 'kids',    desc: "Eat, grow, don't crash.",         color: '#7BC97B' },
    { id: 'bubble-pop',        name: 'Bubble Pop',        cat: 'kids',    desc: 'Tap bubbles before they float away.', color: '#FF8FA3', isNew: true },
    { id: 'memory-match',      name: 'Memory Match',      cat: 'kids',    desc: 'Flip cards. Find the pairs.',      color: '#FFD93D', isNew: true },
    { id: 'shape-sorter',      name: 'Shape Sorter',      cat: 'kids',    desc: 'Drag shapes into matching buckets.', color: '#6DD5FA', isNew: true },
    { id: 'counting-critters', name: 'Counting Critters', cat: 'kids',    desc: 'How many critters? Tap the number.', color: '#A78BFA', isNew: true },
    { id: 'animal-detective',  name: 'Animal Detective',  cat: 'kids',    desc: 'Guess the animal in 20 yes-or-no questions.', color: '#FF6F61', isNew: true },
    { id: 'pong',              name: 'Pong',              cat: 'classic', desc: 'Paddle vs. Computer. Keep it alive.',    color: '#8FA8E6'  },
    { id: 'breakout',          name: 'Breakout',          cat: 'classic', desc: 'Bricks, ball, bounce.',            color: '#F2A65A' },
    { id: 'space-invaders',    name: 'Space Invaders',    cat: 'classic', desc: 'Defend Earth from alien waves.',   color: '#9B7EDC' },
    { id: 'block-puzzle',      name: 'Block Puzzle',      cat: 'classic', desc: 'Stack, clear, score.',             color: '#5DC4D9' },
    { id: 'asteroids',         name: 'Asteroids',         cat: 'classic', desc: 'Pilot through the rocks.',         color: '#A78BFA'  },
    { id: 'frogger',           name: 'Frogger',           cat: 'classic', desc: 'Hop home through traffic.',        color: '#7BC97B'  },
    { id: 'missile-command',   name: 'Missile Command',   cat: 'classic', desc: 'Defend cities from above.',        color: '#F2A65A'  },
    { id: 'lunar-lander',      name: 'Lunar Lander',      cat: 'classic', desc: 'Touch down softly.',               color: '#8FA8E6'  },
    { id: 'spacex-lander',     name: 'SpaceX Lander',     cat: 'classic', desc: 'Land the Falcon 9.',               color: '#5DC4D9'  },
    { id: 'defender',          name: 'Defender',          cat: 'classic', desc: 'Save the humanoids.',              color: '#9B7EDC'  },
    { id: 'simon',             name: 'Simon',             cat: 'classic', desc: 'Watch. Repeat. Repeat longer.',    color: '#F08488'  },
    { id: 'solar-system',      name: 'Solar System',      cat: 'classic', desc: 'Planets orbit the Sun under real gravity.', color: '#F2A65A', isNew: true },
    { id: 'connect-4',         name: 'Connect 4',         cat: 'puzzle',  desc: 'Four in a row. Three levels.',      color: '#8FA8E6' },
    { id: 'connect-dots',      name: 'Dots & Boxes',      cat: 'puzzle',  desc: 'Lines, boxes, strategy.',          color: '#F08488'  },
    { id: '2048',              name: '2048',              cat: 'puzzle',  desc: 'Merge tiles. Reach 2048.',          color: '#F2A65A', isNew: true },
    { id: 'chess',             name: 'Chess',             cat: 'puzzle',  desc: 'Full rules. Three difficulties.', color: '#9B7EDC', isNew: true },
    { id: 'checkers',          name: 'Checkers',          cat: 'puzzle',  desc: 'Mandatory captures. Multi-jumps. Crown me.',   color: '#D23B33', isNew: true },
    { id: 'backgammon',        name: 'Backgammon',        cat: 'puzzle',  desc: 'Roll, race, bear off. Pip-count strategy.',     color: '#A26F3C', isNew: true },
    { id: 'othello',           name: 'Othello',           cat: 'puzzle',  desc: 'Flip flanked discs. Hold the corners.',         color: '#1A7B3F', isNew: true },
    { id: 'chinese-checkers',  name: 'Chinese Checkers',  cat: 'puzzle',  desc: 'Hop chains. 2, 3, or 6 players.',               color: '#2DA1A6', isNew: true },
    { id: 'ultimate-tic-tac-toe', name: 'Ultimate Tic-Tac-Toe', cat: 'puzzle', desc: 'Nine boards in one. Your move picks the next.', color: '#E8A330', isNew: true },
    { id: 'sudoku',            name: 'Sudoku',            cat: 'puzzle',  desc: 'Fill the grid 1–9. Four difficulties.', color: '#2E6CB4', isNew: true },
    { id: 'minesweeper',       name: 'Minesweeper',       cat: 'puzzle',  desc: 'Clear the board. Flag the mines.',  color: '#5B6470', isNew: true },
    { id: 'mahjong',           name: 'Mahjong Solitaire', cat: 'puzzle',  desc: 'Match free tiles. Clear the mound.', color: '#1FA88A', isNew: true },
    { id: 'mancala',           name: 'Mancala',           cat: 'puzzle',  desc: 'Sow seeds. Capture across. Claim the store.',   color: '#B85C38', isNew: true },
    { id: 'word-search',       name: 'Word Search',       cat: 'puzzle',  desc: 'Find hidden words. Eight themed packs.', color: '#C96F2A', isNew: true },
    { id: 'hangman',           name: 'Hangman',           cat: 'puzzle',  desc: 'Guess the word by theme. Build a streak.', color: '#2E8B57', isNew: true },
    { id: 'blackjack',         name: 'Blackjack',         cat: 'casino',  desc: 'Hit 21 with strategy hints.',      color: '#7BC97B' },
    { id: 'roulette',          name: 'Roulette',          cat: 'casino',  desc: 'Spin the European wheel.',         color: '#F08488'  },
    { id: 'video-poker',       name: 'Video Poker',       cat: 'casino',  desc: 'Jacks or Better. Hold smart.',     color: '#A78BFA' },
    { id: 'solitaire',         name: 'Solitaire',         cat: 'casino',  desc: 'Klondike — beat the deck.',        color: '#5DC4D9'  },
    { id: 'freecell',          name: 'FreeCell',          cat: 'casino',  desc: 'All cards up. Pure skill.',        color: '#3FA796', isNew: true },
    { id: 'craps',             name: 'Craps',             cat: 'casino',  desc: 'Roll the bones.',                  color: '#5DC4D9'  },
    { id: 'three-card-poker',  name: 'Three Card Poker',  cat: 'casino',  desc: 'Play or fold? Three cards.',       color: '#9B7EDC'  },
    { id: 'texas-holdem',      name: "Texas Hold'em",     cat: 'casino',  desc: '4-handed cash game. Equity hints.', color: '#E8B05B', isNew: true },
    { id: 'slot-machine',      name: 'Slot Machine',      cat: 'casino',  desc: 'Three reels, three themes.',       color: '#C8A14A', isNew: true },
  ];

  const CATEGORIES = [
    { id: 'classic', label: 'Arcade' },
    { id: 'kids',    label: 'Kids' },
    { id: 'puzzle',  label: 'Strategy' },
    { id: 'casino',  label: 'Casino' },
  ];
  const CAT_LABEL = Object.fromEntries(CATEGORIES.map(c => [c.id, c.label]));

  // Games with a real screenshot thumbnail in assets/thumbs/<id>.webp. Tiles for
  // these show the captured frame; everything else falls back to the icon
  // medallion. Add an id here when its thumbnail lands.
  const THUMBS = new Set([
    '2048', 'backgammon', 'checkers', 'chess', 'chinese-checkers',
    'connect-4', 'connect-dots', 'mahjong', 'mancala', 'othello',
    'ultimate-tic-tac-toe', 'sudoku', 'minesweeper',
    'snake', 'pong', 'breakout', 'space-invaders', 'solar-system',
  ]);

  // Map of game id → localStorage key for personal best. If a key isn't here
  // (or has no stored value), the tile renders without the ★ badge — better
  // than showing fake placeholder data.
  const SCORE_KEYS = {
    snake: 'snakeHighScore',
    pong: 'pongHighScore',
    breakout: 'breakoutHighScore',
    'space-invaders': 'spaceInvadersHighScore',
    asteroids: 'asteroidsHighScore',
    frogger: 'froggerHighScore',
    simon: 'simonHighScore',
    defender: 'defenderHighScore',
    'lunar-lander': 'lunarLanderHighScore',
    'spacex-lander': 'spacexLanderHighScore',
    '2048': '2048HighScore',
    chess: 'chessHighScore',
    checkers: 'checkersHighScore',
    backgammon: 'backgammonHighScore',
    othello: 'othelloHighScore',
    'chinese-checkers': 'chineseCheckersHighScore',
    'ultimate-tic-tac-toe': 'ultimateTicTacToeHighScore',
    mancala: 'mancalaHighScore',
    hangman: 'hangmanHighScore',
  };
  function getBest(gameId) {
    const key = SCORE_KEYS[gameId];
    if (!key) return null;
    const n = parseInt(localStorage.getItem(key), 10);
    return isFinite(n) && n > 0 ? n.toLocaleString() : null;
  }

  // Per-game inline SVG glyph (paths only; svg wrapper added at render time).
  const GLYPH_PATHS = {
    freecell: '<rect x="7" y="9" width="11" height="14" rx="2" fill="none" stroke="C" stroke-width="2"/><rect x="20" y="9" width="11" height="14" rx="2" fill="none" stroke="C" stroke-width="2"/><rect x="34" y="9" width="11" height="14" rx="2" fill="C"/><rect x="47" y="9" width="11" height="14" rx="2" fill="none" stroke="C" stroke-width="2"/><rect x="20" y="32" width="17" height="22" rx="2.5" fill="C" opacity="0.5"/><rect x="20" y="40" width="17" height="22" rx="2.5" fill="C"/>',
    'word-search': '<rect x="12" y="12" width="11" height="11" rx="2" fill="C"/><rect x="27" y="12" width="11" height="11" rx="2" fill="C" opacity="0.4"/><rect x="42" y="12" width="11" height="11" rx="2" fill="C" opacity="0.4"/><rect x="12" y="27" width="11" height="11" rx="2" fill="C" opacity="0.4"/><rect x="27" y="27" width="11" height="11" rx="2" fill="C"/><rect x="42" y="27" width="11" height="11" rx="2" fill="C" opacity="0.4"/><rect x="12" y="42" width="11" height="11" rx="2" fill="C" opacity="0.4"/><rect x="27" y="42" width="11" height="11" rx="2" fill="C" opacity="0.4"/><rect x="42" y="42" width="11" height="11" rx="2" fill="C"/>',
    hangman: '<line x1="14" y1="54" x2="40" y2="54" stroke="C" stroke-width="3" stroke-linecap="round"/><line x1="20" y1="54" x2="20" y2="12" stroke="C" stroke-width="3" stroke-linecap="round"/><line x1="20" y1="12" x2="42" y2="12" stroke="C" stroke-width="3" stroke-linecap="round"/><line x1="42" y1="12" x2="42" y2="19" stroke="C" stroke-width="3" stroke-linecap="round"/><circle cx="42" cy="26" r="6" fill="none" stroke="C" stroke-width="3"/><line x1="42" y1="32" x2="42" y2="44" stroke="C" stroke-width="3" stroke-linecap="round"/><line x1="42" y1="36" x2="36" y2="41" stroke="C" stroke-width="3" stroke-linecap="round"/><line x1="42" y1="36" x2="48" y2="41" stroke="C" stroke-width="3" stroke-linecap="round"/><line x1="42" y1="44" x2="37" y2="52" stroke="C" stroke-width="3" stroke-linecap="round"/><line x1="42" y1="44" x2="47" y2="52" stroke="C" stroke-width="3" stroke-linecap="round"/>',
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
    '2048': '<rect x="8" y="8"  width="11" height="11" rx="2" fill="C" opacity="0.3"/><rect x="20" y="8"  width="11" height="11" rx="2" fill="C" opacity="0.45"/><rect x="33" y="8"  width="11" height="11" rx="2" fill="C" opacity="0.6"/><rect x="45" y="8"  width="11" height="11" rx="2" fill="C" opacity="0.4"/><rect x="8"  y="20" width="11" height="11" rx="2" fill="C" opacity="0.5"/><rect x="20" y="20" width="11" height="11" rx="2" fill="C" opacity="0.7"/><rect x="33" y="20" width="11" height="11" rx="2" fill="C" opacity="0.55"/><rect x="45" y="20" width="11" height="11" rx="2" fill="C" opacity="0.35"/><rect x="8"  y="33" width="11" height="11" rx="2" fill="C" opacity="0.45"/><rect x="20" y="33" width="11" height="11" rx="2" fill="C" opacity="0.6"/><rect x="33" y="33" width="23" height="23" rx="3" fill="C"/><rect x="8"  y="45" width="11" height="11" rx="2" fill="C" opacity="0.5"/><rect x="20" y="45" width="11" height="11" rx="2" fill="C" opacity="0.4"/><text x="44.5" y="48.5" font-size="9" font-weight="800" fill="#fff" text-anchor="middle">2048</text>',
    blackjack: '<rect x="8" y="14" width="22" height="32" rx="3" fill="#fff" stroke="C" stroke-width="2"/><text x="13" y="26" font-size="10" fill="C" font-weight="700">A</text><rect x="32" y="18" width="22" height="32" rx="3" fill="C"/><text x="38" y="32" font-size="10" fill="#fff" font-weight="700">K</text>',
    roulette: '<circle cx="32" cy="32" r="22" fill="none" stroke="C" stroke-width="3"/><circle cx="32" cy="32" r="14" fill="none" stroke="C" stroke-width="2" opacity="0.5"/><circle cx="32" cy="32" r="4" fill="C"/><circle cx="32" cy="14" r="2.5" fill="C"/><circle cx="50" cy="32" r="2.5" fill="C" opacity="0.6"/>',
    'video-poker': '<rect x="6" y="14" width="14" height="22" rx="2" fill="#fff" stroke="C" stroke-width="1.5"/><rect x="22" y="14" width="14" height="22" rx="2" fill="C"/><rect x="38" y="14" width="14" height="22" rx="2" fill="#fff" stroke="C" stroke-width="1.5"/><rect x="6" y="42" width="46" height="6" rx="2" fill="C" opacity="0.4"/>',
    solitaire: '<rect x="6" y="14" width="18" height="26" rx="2.5" fill="C" transform="rotate(-12 15 27)" opacity="0.85"/><rect x="22" y="14" width="18" height="26" rx="2.5" fill="#fff" stroke="C" stroke-width="1.5"/><text x="26" y="26" font-size="9" font-weight="700" fill="C">K</text><text x="29" y="36" font-size="10" fill="C">♠</text><rect x="40" y="14" width="18" height="26" rx="2.5" fill="C" transform="rotate(12 49 27)" opacity="0.85"/>',
    craps: '<rect x="8" y="14" width="20" height="20" rx="3" fill="C" transform="rotate(-10 18 24)"/><circle cx="14" cy="20" r="1.5" fill="#fff"/><circle cx="22" cy="28" r="1.5" fill="#fff"/><rect x="32" y="22" width="20" height="20" rx="3" fill="#fff" stroke="C" stroke-width="1.5" transform="rotate(8 42 32)"/><circle cx="38" cy="28" r="1.5" fill="C"/><circle cx="46" cy="36" r="1.5" fill="C"/><circle cx="42" cy="32" r="1.5" fill="C"/>',
    'three-card-poker': '<rect x="6" y="18" width="16" height="26" rx="2" fill="#fff" stroke="C" stroke-width="1.5" transform="rotate(-8 14 30)"/><rect x="22" y="14" width="16" height="26" rx="2" fill="#fff" stroke="C" stroke-width="1.5"/><rect x="40" y="18" width="16" height="26" rx="2" fill="#fff" stroke="C" stroke-width="1.5" transform="rotate(8 48 30)"/>',
    'texas-holdem': '<rect x="10" y="14" width="22" height="32" rx="3" fill="#fff" stroke="C" stroke-width="2" transform="rotate(-10 21 30)"/><text x="13" y="28" font-size="10" fill="C" font-weight="700" transform="rotate(-10 21 30)">A</text><rect x="32" y="14" width="22" height="32" rx="3" fill="C" transform="rotate(10 43 30)"/><text x="36" y="34" font-size="10" fill="#fff" font-weight="700" transform="rotate(10 43 30)">K</text>',
    chess: '<path d="M28 8h8v6h6v6h-6l4 14h-16l4-14h-6v-6h6z" fill="C"/><rect x="18" y="40" width="28" height="6" rx="1" fill="C" opacity="0.7"/><rect x="14" y="48" width="36" height="8" rx="2" fill="C"/>',
    checkers: '<circle cx="32" cy="42" r="14" fill="C"/><circle cx="32" cy="42" r="10" fill="none" stroke="#fff" stroke-width="1.5" opacity="0.5"/><circle cx="32" cy="22" r="14" fill="C" opacity="0.55"/><polygon points="32,15 28,22 36,22" fill="C"/>',
    backgammon: '<rect x="6" y="10" width="52" height="44" rx="3" fill="C" opacity="0.25"/><polygon points="10,12 16,12 13,30" fill="C"/><polygon points="20,12 26,12 23,30" fill="C" opacity="0.5"/><polygon points="30,12 36,12 33,30" fill="C"/><polygon points="40,12 46,12 43,30" fill="C" opacity="0.5"/><polygon points="50,12 56,12 53,30" fill="C"/><polygon points="13,52 16,34 10,34" fill="C" opacity="0.5"/><polygon points="23,52 26,34 20,34" fill="C"/><circle cx="13" cy="48" r="4" fill="C"/><circle cx="23" cy="46" r="4" fill="#fff" stroke="C" stroke-width="1"/>',
    othello: '<rect x="6" y="6" width="52" height="52" rx="4" fill="C"/><circle cx="22" cy="22" r="7" fill="#fff"/><circle cx="42" cy="22" r="7" fill="#1A1310"/><circle cx="22" cy="42" r="7" fill="#1A1310"/><circle cx="42" cy="42" r="7" fill="#fff"/>',
    'chinese-checkers': '<polygon points="32,4 38,22 58,22 42,33 48,52 32,40 16,52 22,33 6,22 26,22" fill="C" opacity="0.18"/><circle cx="32" cy="14" r="4" fill="#3D5A80"/><circle cx="32" cy="50" r="4" fill="#D23B33"/><circle cx="13" cy="22" r="4" fill="#E29F4D"/><circle cx="51" cy="22" r="4" fill="#9B5BD0"/><circle cx="13" cy="42" r="4" fill="#3FA866"/><circle cx="51" cy="42" r="4" fill="#D9B447"/>',
    'ultimate-tic-tac-toe': '<rect x="6" y="6" width="52" height="52" rx="4" fill="C" opacity="0.14"/><line x1="24" y1="8" x2="24" y2="56" stroke="C" stroke-width="2"/><line x1="40" y1="8" x2="40" y2="56" stroke="C" stroke-width="2"/><line x1="8" y1="24" x2="56" y2="24" stroke="C" stroke-width="2"/><line x1="8" y1="40" x2="56" y2="40" stroke="C" stroke-width="2"/><line x1="11" y1="11" x2="21" y2="21" stroke="#C53B33" stroke-width="2" stroke-linecap="round"/><line x1="21" y1="11" x2="11" y2="21" stroke="#C53B33" stroke-width="2" stroke-linecap="round"/><circle cx="48" cy="16" r="5" fill="none" stroke="#2E6CB4" stroke-width="2"/><line x1="27" y1="27" x2="37" y2="37" stroke="#C53B33" stroke-width="2" stroke-linecap="round"/><line x1="37" y1="27" x2="27" y2="37" stroke="#C53B33" stroke-width="2" stroke-linecap="round"/><circle cx="16" cy="48" r="5" fill="none" stroke="#2E6CB4" stroke-width="2"/><circle cx="48" cy="48" r="5" fill="none" stroke="#2E6CB4" stroke-width="2"/>',
    mancala: '<rect x="6" y="20" width="52" height="24" rx="10" fill="C" opacity="0.18"/><ellipse cx="13" cy="32" rx="6" ry="10" fill="C" opacity="0.55"/><ellipse cx="51" cy="32" rx="6" ry="10" fill="C" opacity="0.55"/><circle cx="24" cy="26" r="3.5" fill="C"/><circle cx="32" cy="26" r="3.5" fill="C"/><circle cx="40" cy="26" r="3.5" fill="C"/><circle cx="24" cy="38" r="3.5" fill="C" opacity="0.7"/><circle cx="32" cy="38" r="3.5" fill="C" opacity="0.7"/><circle cx="40" cy="38" r="3.5" fill="C" opacity="0.7"/><circle cx="12" cy="30" r="2" fill="#FFF6E2"/><circle cx="14" cy="34" r="2" fill="#FFF6E2"/><circle cx="50" cy="30" r="2" fill="#FFF6E2"/><circle cx="52" cy="34" r="2" fill="#FFF6E2"/>',
    'bubble-pop': '<circle cx="20" cy="22" r="9" fill="C" opacity="0.55"/><circle cx="17" cy="19" r="2.5" fill="#fff" opacity="0.9"/><circle cx="42" cy="34" r="11" fill="C" opacity="0.45"/><circle cx="38" cy="30" r="3" fill="#fff" opacity="0.9"/><circle cx="28" cy="46" r="7" fill="C" opacity="0.65"/><circle cx="26" cy="44" r="2" fill="#fff" opacity="0.9"/>',
    'memory-match': '<rect x="6"  y="10" width="16" height="20" rx="3" fill="C"/><rect x="24" y="10" width="16" height="20" rx="3" fill="C" opacity="0.55"/><rect x="42" y="10" width="16" height="20" rx="3" fill="C"/><rect x="6"  y="34" width="16" height="20" rx="3" fill="C" opacity="0.55"/><rect x="24" y="34" width="16" height="20" rx="3" fill="C"/><rect x="42" y="34" width="16" height="20" rx="3" fill="C" opacity="0.55"/><circle cx="32" cy="44" r="3" fill="#fff"/>',
    'shape-sorter': '<circle cx="14" cy="14" r="6" fill="C"/><rect x="26" y="8" width="12" height="12" rx="2" fill="C" opacity="0.7"/><polygon points="50,8 56,20 44,20" fill="C"/><rect x="6" y="40" width="14" height="14" rx="3" fill="none" stroke="C" stroke-width="2.5"/><rect x="26" y="40" width="14" height="14" rx="3" fill="none" stroke="C" stroke-width="2.5" opacity="0.7"/><rect x="46" y="40" width="14" height="14" rx="3" fill="none" stroke="C" stroke-width="2.5"/>',
    'counting-critters': '<circle cx="14" cy="20" r="6" fill="C"/><circle cx="32" cy="20" r="6" fill="C" opacity="0.7"/><circle cx="50" cy="20" r="6" fill="C"/><text x="32" y="50" font-size="20" font-weight="800" text-anchor="middle" fill="C">3</text>',
    'slot-machine': '<rect x="8" y="16" width="14" height="32" rx="2" fill="C" opacity="0.22"/><rect x="25" y="16" width="14" height="32" rx="2" fill="C" opacity="0.22"/><rect x="42" y="16" width="14" height="32" rx="2" fill="C" opacity="0.22"/><text x="15" y="37" font-size="13" font-weight="800" text-anchor="middle" fill="C">7</text><text x="32" y="37" font-size="13" font-weight="800" text-anchor="middle" fill="C">7</text><text x="49" y="37" font-size="13" font-weight="800" text-anchor="middle" fill="C">7</text>',
    sudoku: '<rect x="8" y="8" width="48" height="48" rx="3" fill="C" opacity="0.12"/><line x1="24" y1="8" x2="24" y2="56" stroke="C" stroke-width="2"/><line x1="40" y1="8" x2="40" y2="56" stroke="C" stroke-width="2"/><line x1="8" y1="24" x2="56" y2="24" stroke="C" stroke-width="2"/><line x1="8" y1="40" x2="56" y2="40" stroke="C" stroke-width="2"/><rect x="8" y="8" width="48" height="48" rx="3" fill="none" stroke="C" stroke-width="2.5"/><text x="16" y="20" font-size="12" font-weight="800" text-anchor="middle" fill="C">5</text><text x="48" y="20" font-size="12" font-weight="800" text-anchor="middle" fill="C">3</text><text x="32" y="36" font-size="12" font-weight="800" text-anchor="middle" fill="C">8</text><text x="16" y="52" font-size="12" font-weight="800" text-anchor="middle" fill="C">7</text><text x="48" y="52" font-size="12" font-weight="800" text-anchor="middle" fill="C">2</text>',
    mahjong: '<rect x="20" y="8" width="24" height="48" rx="4" fill="C" opacity="0.18"/><rect x="20" y="8" width="24" height="48" rx="4" fill="none" stroke="C" stroke-width="2.5"/><circle cx="32" cy="22" r="4" fill="C"/><circle cx="32" cy="34" r="4" fill="C"/><circle cx="32" cy="46" r="3" fill="C" opacity="0.6"/>',
    'solar-system': '<circle cx="32" cy="32" r="7" fill="C"/><circle cx="32" cy="32" r="15" fill="none" stroke="C" stroke-width="2" opacity="0.45"/><circle cx="32" cy="32" r="24" fill="none" stroke="C" stroke-width="2" opacity="0.3"/><circle cx="47" cy="32" r="3.5" fill="C"/><circle cx="32" cy="8" r="3" fill="C" opacity="0.7"/>',
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

  // ── DOM helpers ────────────────────────────────────────────────────────
  function el(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }
  function gameUrl(game) { return `${game.id}/`; }

  // ── Tile rendering ─────────────────────────────────────────────────────
  // The big hero tile keeps its showcase layout (ambient art + blurb + CTA).
  // Every other tile uses the "Style B" frame: a screenshot up top (real game
  // frame when we have one, otherwise an icon medallion) over a clean footer.
  function renderTile(game, size, isHero) {
    if (isHero) return renderHeroTile(game, size);

    const best = getBest(game.id);
    const cat = CAT_LABEL[game.cat] || '';
    const hasShot = THUMBS.has(game.id);
    const top = hasShot
      ? `<img class="shot-img" src="assets/thumbs/${game.id}.webp" alt="${game.name} screenshot" loading="lazy" decoding="async" width="600" height="600">`
      : `<div class="shot-ph" style="background:${game.color}22">${glyph(game, size === 's-tall' ? 84 : 56)}</div>`;

    return el(`
      <a class="tile ${size} tileB ${hasShot ? 'has-shot' : 'no-shot'}" href="${gameUrl(game)}" style="--g:${game.color}">
        ${game.isNew ? '<span class="tile-new">NEW</span>' : ''}
        <div class="shot">${top}</div>
        <div class="tfoot">
          <div class="tf-text">
            <span class="tf-eyebrow">${cat}</span>
            <h3>${game.name}</h3>
          </div>
          <span class="tf-cta">${best != null ? `★ ${best}` : 'Play'}</span>
        </div>
      </a>
    `);
  }

  function renderHeroTile(game, size) {
    const best = getBest(game.id);
    const a = el(`
      <a class="tile ${size} has-preview" href="${gameUrl(game)}" style="background:${game.color}22;--g:${game.color}">
        ${game.isNew ? '<span class="tile-new">NEW</span>' : ''}
        <span class="tile-tag">★ Featured</span>
        <div class="tile-decoration"></div>
        <div class="tile-art">${glyph(game, 140)}</div>
        <div class="tile-preview" style="background:${game.color}14">
          <div class="preview-grid" style="--cell:${game.color}"></div>
        </div>
        <div class="tile-meta">
          <h3>${game.name}</h3>
          <p class="desc">${game.desc} Pick up where you left off — your scores are saved locally.</p>
          <div class="meta-row">
            <span>▸ Free</span>
            ${best != null ? `<span class="best">★ ${best}</span>` : ''}
          </div>
          <span class="play-cta">Play now →</span>
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
  function readNumStorage(key) {
    const n = parseInt(localStorage.getItem(key), 10);
    return isFinite(n) && n > 0 ? n : null;
  }

  function renderSidebar() {
    const side = document.getElementById('hub-side');
    side.innerHTML = '';

    // Pull what we actually know from localStorage; show editorial picks otherwise.
    const snakeBest = readNumStorage('snakeHighScore');
    const asteroidsBest = readNumStorage('asteroidsHighScore');
    const blockPuzzleBest = readNumStorage('blockPuzzleHighScore'); // not yet persisted
    const arcadeBest = Math.max(asteroidsBest || 0, blockPuzzleBest || 0,
      readNumStorage('breakoutHighScore') || 0,
      readNumStorage('spaceInvadersHighScore') || 0,
      readNumStorage('pongHighScore') || 0) || null;

    let casinoBankroll = null;
    try {
      const api = window.CASINO_BANKROLL;
      const raw = api ? api.read() : Number(localStorage.getItem('casinoBankroll'));
      if (isFinite(raw) && raw >= 0) casinoBankroll = Math.floor(raw);
    } catch (e) {}

    const cats = [
      { id: 'classic', label: 'Arcade',  href: 'arcade/',  color: '#FF4F2D',
        metric: arcadeBest != null ? arcadeBest.toLocaleString() : 'Play',
        sub:    arcadeBest != null ? 'Top arcade score' : 'Classic & 80s' },
      { id: 'kids',    label: 'Kids',    href: 'kids/',    color: '#FF4F8B',
        metric: snakeBest != null ? snakeBest.toLocaleString() : 'Play',
        sub:    snakeBest != null ? 'Snake best' : 'Gentle & ad-free' },
      { id: 'puzzle',  label: 'Strategy', href: 'strategy/', color: '#1F5A3D',
        metric: 'Play', sub: 'Chess, Othello & more' },
      { id: 'casino',  label: 'Casino',  href: 'casino/',  color: '#C8A14A',
        metric: casinoBankroll != null ? '$' + casinoBankroll.toLocaleString() : '$1,000',
        sub:    casinoBankroll != null ? 'Bankroll' : 'Free starting stake' },
    ];

    const tilesHtml = cats.map(c => `
      <a class="stats-cat" href="${c.href}" style="--cat:${c.color}">
        <div class="l"><span class="dot"></span>${c.label}</div>
        <div class="n">${c.metric}</div>
        <div class="s">${c.sub}</div>
      </a>
    `).join('');

    // Anchor: only show a top score if we actually have one.
    const realScores = [
      arcadeBest != null ? { label: 'Arcade best',  value: arcadeBest.toLocaleString(),  game: 'Top arcade run' } : null,
      snakeBest  != null ? { label: 'Snake best',   value: snakeBest.toLocaleString(),   game: 'Snake' } : null,
    ].filter(Boolean);
    const anchor = realScores.length
      ? realScores.reduce((a, b) => (parseInt(a.value.replace(/,/g, ''), 10) >= parseInt(b.value.replace(/,/g, ''), 10) ? a : b))
      : null;

    const stats = el(`
      <div class="stats-card">
        <h4>At a glance</h4>
        ${anchor ? `
        <div class="stats-anchor">
          <div class="stats-anchor-chip">★</div>
          <div class="stats-anchor-body">
            <div class="l">${anchor.label}</div>
            <div class="n">${anchor.value}</div>
            <div class="s">${anchor.game}</div>
          </div>
        </div>` : ''}
        <div class="stats-cats">${tilesHtml}</div>
      </div>
    `);
    side.appendChild(stats);

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
        <h4>New this month</h4>
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
    input.placeholder = 'Search games…';
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
      const pill = card.querySelector('.ch-stat-pill');
      if (pill) pill.remove();
      // Each category has its own landing page; the hero card routes there.
      const LANDINGS = { classic: 'arcade/', kids: 'kids/', puzzle: 'strategy/', casino: 'casino/' };
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
