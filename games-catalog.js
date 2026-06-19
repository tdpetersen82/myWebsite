// Limestone Games — shared game catalog (single source of truth).
// Consumed by hub.js (homepage in-place search) and global-search.js (the
// command-palette search on every other page). Add a game here ONCE.
(function () {
  'use strict';

  window.LG_GAMES = [
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
    { id: 'spacex-lander',     name: 'SpaceX Lander',     cat: 'classic', desc: 'Stick the booster landing.',       color: '#5DC4D9'  },
    { id: 'defender',          name: 'Defender',          cat: 'classic', desc: 'Save the humanoids.',              color: '#9B7EDC'  },
    { id: 'simon',             name: 'Simon',             cat: 'classic', desc: 'Watch. Repeat. Repeat longer.',    color: '#F08488'  },
    { id: 'solar-system',      name: 'Solar System',      cat: 'classic', desc: 'Planets orbit the Sun under real gravity.', color: '#F2A65A', isNew: true },
    { id: 'dirt-jumper',       name: 'Dirt Jumper',       cat: 'classic', desc: 'Pump the rollers, send the jumps, stick the landing.', color: '#C96F2A', isNew: true },
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
    { id: 'spider-solitaire',  name: 'Spider Solitaire',  cat: 'casino',  desc: 'Two decks. 1, 2, or 4 suits.',     color: '#9B7EDC', isNew: true },
    { id: 'hearts',            name: 'Hearts',            cat: 'casino',  desc: 'Dodge the Queen of Spades.',       color: '#C8423A', isNew: true },
    { id: 'spades',            name: 'Spades',            cat: 'casino',  desc: 'Bid, partner up, race to 500.',    color: '#4F7CAC', isNew: true },
    { id: 'craps',             name: 'Craps',             cat: 'casino',  desc: 'Roll the bones.',                  color: '#5DC4D9'  },
    { id: 'three-card-poker',  name: 'Three Card Poker',  cat: 'casino',  desc: 'Play or fold? Three cards.',       color: '#9B7EDC'  },
    { id: 'texas-holdem',      name: "Texas Hold'em",     cat: 'casino',  desc: '4-handed cash game. Equity hints.', color: '#E8B05B', isNew: true },
    { id: 'slot-machine',      name: 'Slot Machine',      cat: 'casino',  desc: 'Three reels, three themes.',       color: '#C8A14A', isNew: true },
  ];

  window.LG_CATEGORIES = [
    { id: 'classic', label: 'Arcade' },
    { id: 'kids',    label: 'Kids' },
    { id: 'puzzle',  label: 'Strategy' },
    { id: 'casino',  label: 'Casino' },
  ];

  // category id -> display label (Arcade / Kids / Strategy / Casino)
  window.LG_CAT_LABEL = Object.fromEntries(window.LG_CATEGORIES.map(function (c) { return [c.id, c.label]; }));

  // category id -> landing-page path (root-relative, works from any page)
  window.LG_CAT_PATH = { classic: '/arcade/', kids: '/kids/', puzzle: '/strategy/', casino: '/casino/' };
})();
