// Limestone Games — shared game catalog (single source of truth).
// Consumed by hub.js (homepage in-place search) and global-search.js (the
// command-palette search on every other page). Add a game here ONCE.
(function () {
  'use strict';

  window.LG_GAMES = [
    { id: 'snake',             name: 'Snake',             cat: 'kids',    desc: "Eat, grow, don't crash.",         color: '#7BC97B', added: '2026-03-12' },
    { id: 'bubble-pop',        name: 'Bubble Pop',        cat: 'kids',    desc: 'Tap bubbles before they float away.', color: '#FF8FA3', added: '2026-05-06' },
    { id: 'memory-match',      name: 'Memory Match',      cat: 'kids',    desc: 'Flip cards. Find the pairs.',      color: '#FFD93D', added: '2026-05-06' },
    { id: 'shape-sorter',      name: 'Shape Sorter',      cat: 'kids',    desc: 'Drag shapes into matching buckets.', color: '#6DD5FA', added: '2026-05-06' },
    { id: 'counting-critters', name: 'Counting Critters', cat: 'kids',    desc: 'How many critters? Tap the number.', color: '#A78BFA', added: '2026-05-06' },
    { id: 'animal-detective',  name: 'Animal Detective',  cat: 'kids',    desc: 'Guess the animal in 20 yes-or-no questions.', color: '#FF6F61', added: '2026-05-06' },
    { id: 'tic-tac-toe',       name: 'Tic-Tac-Toe',       cat: 'kids',    desc: 'The classic Xs and Os. Three levels.', color: '#2EC4B6', added: '2026-07-15' },
    { id: 'go-fish',           name: 'Go Fish',           cat: 'kids',    desc: 'Ask for animals, fish the pond, make books.', color: '#1E9BD7', added: '2026-07-15' },
    { id: 'crazy-eights',      name: 'Crazy Eights',      cat: 'kids',    desc: 'Match the card or play a wild 8.', color: '#F58A3C', added: '2026-07-15' },
    { id: 'dogs',              name: 'Pup Quiz',          cat: 'kids',    desc: 'Five clues, one dog breed. New puzzle daily.', color: '#8A5A2B', url: '/dogs/play.html', added: '2026-08-13' },
    { id: 'pong',              name: 'Pong',              cat: 'classic', desc: 'Paddle vs. Computer. Keep it alive.',    color: '#8FA8E6', added: '2026-03-12' },
    { id: 'breakout',          name: 'Breakout',          cat: 'classic', desc: 'Bricks, ball, bounce.',            color: '#F2A65A', added: '2026-03-12' },
    { id: 'space-invaders',    name: 'Space Invaders',    cat: 'classic', desc: 'Defend Earth from alien waves.',   color: '#9B7EDC', added: '2026-03-12' },
    { id: 'block-puzzle',      name: 'Block Puzzle',      cat: 'classic', desc: 'Stack, clear, score.',             color: '#5DC4D9', added: '2026-03-12' },
    { id: 'asteroids',         name: 'Asteroids',         cat: 'classic', desc: 'Pilot through the rocks.',         color: '#A78BFA', added: '2026-03-12' },
    { id: 'frogger',           name: 'Frogger',           cat: 'classic', desc: 'Hop home through traffic.',        color: '#7BC97B', added: '2026-03-12' },
    { id: 'missile-command',   name: 'Missile Command',   cat: 'classic', desc: 'Defend cities from above.',        color: '#F2A65A', added: '2026-03-12' },
    { id: 'lunar-lander',      name: 'Lunar Lander',      cat: 'classic', desc: 'Touch down softly.',               color: '#8FA8E6', added: '2026-03-12' },
    { id: 'spacex-lander',     name: 'SpaceX Lander',     cat: 'classic', desc: 'Stick the booster landing.',       color: '#5DC4D9', added: '2026-03-27' },
    { id: 'defender',          name: 'Defender',          cat: 'classic', desc: 'Save the humanoids.',              color: '#9B7EDC', added: '2026-03-12' },
    { id: 'simon',             name: 'Simon',             cat: 'classic', desc: 'Watch. Repeat. Repeat longer.',    color: '#F08488', added: '2026-03-12' },
    { id: 'solar-system',      name: 'Solar System',      cat: 'classic', desc: 'Planets orbit the Sun under real gravity.', color: '#F2A65A', added: '2026-06-02' },
    { id: 'connect-4',         name: 'Connect 4',         cat: 'puzzle',  desc: 'Four in a row. Three levels.',      color: '#8FA8E6', added: '2026-03-12' },
    { id: 'connect-dots',      name: 'Dots & Boxes',      cat: 'puzzle',  desc: 'Lines, boxes, strategy.',          color: '#F08488', added: '2026-03-12' },
    { id: '2048',              name: '2048',              cat: 'puzzle',  desc: 'Merge tiles. Reach 2048.',          color: '#F2A65A', added: '2026-05-07' },
    { id: 'chess',             name: 'Chess',             cat: 'puzzle',  desc: 'Full rules. Three difficulties.', color: '#9B7EDC', added: '2026-05-08' },
    { id: 'checkers',          name: 'Checkers',          cat: 'puzzle',  desc: 'Mandatory captures. Multi-jumps. Crown me.',   color: '#D23B33', added: '2026-05-08' },
    { id: 'backgammon',        name: 'Backgammon',        cat: 'puzzle',  desc: 'Roll, race, bear off. Pip-count strategy.',     color: '#A26F3C', added: '2026-05-08' },
    { id: 'othello',           name: 'Othello',           cat: 'puzzle',  desc: 'Flip flanked discs. Hold the corners.',         color: '#1A7B3F', added: '2026-05-08' },
    { id: 'chinese-checkers',  name: 'Chinese Checkers',  cat: 'puzzle',  desc: 'Hop chains. 2, 3, or 6 players.',               color: '#2DA1A6', added: '2026-05-08' },
    { id: 'ultimate-tic-tac-toe', name: 'Ultimate Tic-Tac-Toe', cat: 'puzzle', desc: 'Nine boards in one. Your move picks the next.', color: '#E8A330', added: '2026-05-10' },
    { id: 'sudoku',            name: 'Sudoku',            cat: 'puzzle',  desc: 'Fill the grid 1–9. Four difficulties.', color: '#2E6CB4', added: '2026-06-05' },
    { id: 'minesweeper',       name: 'Minesweeper',       cat: 'puzzle',  desc: 'Clear the board. Flag the mines.',  color: '#5B6470', added: '2026-06-05' },
    { id: 'mahjong',           name: 'Mahjong Solitaire', cat: 'puzzle',  desc: 'Match free tiles. Clear the mound.', color: '#1FA88A', added: '2026-06-02' },
    { id: 'mancala',           name: 'Mancala',           cat: 'puzzle',  desc: 'Sow seeds. Capture across. Claim the store.',   color: '#B85C38', added: '2026-05-10' },
    { id: 'word-search',       name: 'Word Search',       cat: 'puzzle',  desc: 'Find hidden words — or make your own puzzle.', color: '#C96F2A', added: '2026-06-18' },
    { id: 'crossword-maker',   name: 'Crossword Maker',   cat: 'puzzle',  desc: 'Your words, your clues — a printable crossword.', color: '#3D5A80', added: '2026-08-10' },
    { id: 'hangman',           name: 'Hangman',           cat: 'puzzle',  desc: 'Guess the word by theme. Build a streak.', color: '#2E8B57', added: '2026-06-18' },
    { id: 'yahtzee',           name: 'Yahtzee',           cat: 'puzzle',  desc: 'Roll, hold, fill the card. Best total wins.', color: '#34558B', added: '2026-07-15' },
    { id: 'farkle',            name: 'Farkle',            cat: 'puzzle',  desc: 'Push your luck to 10,000. Bank or bust.', color: '#B0413E', added: '2026-07-15' },
    // Both live under /dogs/ and so need the `url` override: the finder owns
    // the directory index, the game sits beside it.
    { id: 'dog-breed-finder',  name: 'Dog Breed Finder',  cat: 'puzzle',  desc: 'Answer eight questions, see which breeds fit.', color: '#A9743C', url: '/dogs/', added: '2026-08-13' },
    { id: 'blackjack',         name: 'Blackjack',         cat: 'casino',  desc: 'Hit 21 with strategy hints.',      color: '#7BC97B', added: '2026-03-27' },
    { id: 'roulette',          name: 'Roulette',          cat: 'casino',  desc: 'Spin the European wheel.',         color: '#F08488', added: '2026-03-27' },
    { id: 'video-poker',       name: 'Video Poker',       cat: 'casino',  desc: 'Jacks or Better. Hold smart.',     color: '#A78BFA', added: '2026-03-27' },
    { id: 'solitaire',         name: 'Solitaire',         cat: 'casino',  desc: 'Klondike — beat the deck.',        color: '#5DC4D9', added: '2026-05-06' },
    { id: 'freecell',          name: 'FreeCell',          cat: 'casino',  desc: 'All cards up. Pure skill.',        color: '#3FA796', added: '2026-06-18' },
    { id: 'spider-solitaire',  name: 'Spider Solitaire',  cat: 'casino',  desc: 'Two decks. 1, 2, or 4 suits.',     color: '#9B7EDC', added: '2026-06-18' },
    { id: 'hearts',            name: 'Hearts',            cat: 'casino',  desc: 'Dodge the Queen of Spades.',       color: '#C8423A', added: '2026-06-18' },
    { id: 'spades',            name: 'Spades',            cat: 'casino',  desc: 'Bid, partner up, race to 500.',    color: '#4F7CAC', added: '2026-06-18' },
    { id: 'euchre',            name: 'Euchre',            cat: 'casino',  desc: 'Order up trump, play the bowers, race to 10.', color: '#7A5AA8', added: '2026-08-13' },
    { id: 'craps',             name: 'Craps',             cat: 'casino',  desc: 'Roll the bones.',                  color: '#5DC4D9', added: '2026-03-27' },
    { id: 'three-card-poker',  name: 'Three Card Poker',  cat: 'casino',  desc: 'Play or fold? Three cards.',       color: '#9B7EDC', added: '2026-03-27' },
    { id: 'texas-holdem',      name: "Texas Hold'em",     cat: 'casino',  desc: '4-handed cash game. Equity hints.', color: '#E8B05B', added: '2026-05-07' },
    { id: 'slot-machine',      name: 'Slot Machine',      cat: 'casino',  desc: 'Three reels, three themes.',       color: '#C8A14A', added: '2026-05-08' },
  ];

  // "New" is derived from `added`, never hand-maintained. A game wears the NEW
  // badge for NEW_WINDOW_DAYS after it ships, then quietly stops. (Previously
  // 34 of 54 games carried a permanent isNew:true, so the badge meant nothing.)
  var NEW_WINDOW_DAYS = 45;
  var newCutoff = Date.now() - NEW_WINDOW_DAYS * 864e5;
  window.LG_GAMES.forEach(function (g) {
    g.isNew = !!g.added && Date.parse(g.added) >= newCutoff;
  });

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
