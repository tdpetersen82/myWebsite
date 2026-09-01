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

  // ── Everything else the search should find (printables, utilities) ──────
  // These are NOT games — hub.js never renders them as tiles — but both
  // search UIs (hub.js in-place, global-search.js palette) include them so a
  // query like "yardzee" lands on the printable instead of a dead end.
  // GENERATED from the hub pages' cards; `node tools/check-search-index.mjs`
  // diffs this list against sitemap.xml — run it after adding a printable or
  // tool.
  window.LG_EXTRAS = [
    { name: 'Yahtzee score sheet', cat: 'printable', url: '/printables/yahtzee-score-sheet/', desc: 'The full upper and lower section scorecard, six players to a page, with the 63-point bonus and Yahtzee bonus rows.' },
    { name: 'Farkle score sheet', cat: 'printable', url: '/printables/farkle-score-sheet/', desc: 'Running-total columns for six players plus the full scoring key — singles, triples, straights and three pairs.' },
    { name: 'Spades score sheet', cat: 'printable', url: '/printables/spades-score-sheet/', desc: 'Bid, tricks and running score for two partnerships, with a dedicated bag counter and the Nil bonuses.' },
    { name: 'Hearts score sheet', cat: 'printable', url: '/printables/hearts-score-sheet/', desc: 'Four columns, sixteen hands, running totals — with the passing rotation and shooting-the-moon rule on the page.' },
    { name: 'Euchre score sheet', cat: 'printable', url: '/printables/euchre-score-sheet/', desc: 'We / They columns with maker, alone and euchre marks — plus the full points table and the bower ranking.' },
    { name: 'Mexican Train score sheet', cat: 'printable', url: '/printables/mexican-train-score-sheet/', desc: 'All thirteen rounds from double-12 down to double-blank, six players, with the rules on the sheet.' },
    { name: 'Phase 10 score sheet', cat: 'printable', url: '/printables/phase-10-score-sheet/', desc: 'All ten phases listed down the side, six players, and the card scoring values underneath.' },
    { name: 'Bunco score sheet', cat: 'printable', url: '/printables/bunco-score-sheet/', desc: 'Six rounds plus the win, loss and Bunco tally most groups hand out prizes on.' },
    { name: 'Canasta score sheet', cat: 'printable', url: '/printables/canasta-score-sheet/', desc: 'Ten hands with running totals, plus card values, canasta bonuses and the initial meld table.' },
    { name: 'Hand and Foot score sheet', cat: 'printable', url: '/printables/hand-and-foot-score-sheet/', desc: 'Four rounds with the meld requirement on each row, card values and book bonuses alongside.' },
    { name: 'Quiddler score sheet', cat: 'printable', url: '/printables/quiddler-score-sheet/', desc: 'All eight rounds from the 3-card hand to the 10-card hand, with both bonuses and the tie rule on the sheet.' },
    { name: 'Qwinto score sheet', cat: 'printable', url: '/printables/qwinto-score-sheet/', desc: 'Two replacement boards per page — ascending rows, pentagon bonuses and failed-attempt boxes.' },
    { name: '500 score sheet', cat: 'printable', url: '/printables/500-score-sheet/', desc: 'Running score for both sides plus the full Avondale bid table, from six spades to ten no-trumps.' },
    { name: 'Gin Rummy score sheet', cat: 'printable', url: '/printables/gin-rummy-score-sheet/', desc: 'Running score to 100 with knock, gin, undercut and the box bonuses printed on the sheet.' },
    { name: 'Pinochle score sheet', cat: 'printable', url: '/printables/pinochle-score-sheet/', desc: 'Partnership scorecard plus the full single-deck meld chart — runs, marriages, arounds and doubles.' },
    { name: 'Wizard score sheet', cat: 'printable', url: '/printables/wizard-score-sheet/', desc: 'Bid and score boxes for six players across all twenty rounds, with the exact-bid maths.' },
    { name: 'Five Crowns score sheet', cat: 'printable', url: '/printables/five-crowns-score-sheet/', desc: 'All eleven rounds with each round\'s wild card on the row, and the card values underneath.' },
    { name: 'Golf card game score sheet', cat: 'printable', url: '/printables/golf-card-game-score-sheet/', desc: 'Nine holes for six players with the six-card values — kings zero, twos minus two, pairs cancel.' },
    { name: 'Dominoes score sheet', cat: 'printable', url: '/printables/dominoes-score-sheet/', desc: 'Running score for block and draw, with the All Fives rule for tables that score during play.' },
    { name: '60 Second Slam sheets', cat: 'printable', url: '/printables/60-second-slam-score-sheets/', desc: 'A-to-Z answer columns, two rounds per page, with the unique-answer scoring on the sheet.' },
    { name: 'Qwixx score sheet', cat: 'printable', url: '/printables/qwixx-score-sheet/', desc: 'Two replacement boards per page — four colour rows, locks, penalties and the points table.' },
    { name: 'Scattergories answer sheets', cat: 'printable', url: '/printables/scattergories-answer-sheets/', desc: 'Three 12-line lists per page with letter boxes — a full three-round game per player.' },
    { name: 'UNO score sheet', cat: 'printable', url: '/printables/uno-score-sheet/', desc: 'The official scoring nobody uses: race to 500 with the card values printed beside it.' },
    { name: 'Rummikub score sheet', cat: 'printable', url: '/printables/rummikub-score-sheet/', desc: 'Winner-positive scoring with the joker penalty and the 30-point initial meld rule.' },
    { name: 'Skull King score sheet', cat: 'printable', url: '/printables/skull-king-score-sheet/', desc: 'Bid and score boxes for ten rounds, with the zero-bid gamble and capture bonuses.' },
    { name: 'Frustration Rummy sheet', cat: 'printable', url: '/printables/frustration-rummy-score-sheet/', desc: 'All fourteen contracts printed in order, with score columns for five players.' },
    { name: 'Triple Yahtzee score sheet', cat: 'printable', url: '/printables/triple-yahtzee-score-sheet/', desc: 'Three columns per player — ×1, ×2, ×3 — with each column earning its own bonus.' },
    { name: 'Rummy score sheet', cat: 'printable', url: '/printables/rummy-score-sheet/', desc: 'Twenty-four rounds for six players with the standard card values — the pad every rummy variant starts from.' },
    { name: 'Rummy 500 score sheet', cat: 'printable', url: '/printables/rummy-500-score-sheet/', desc: 'Plus and minus columns per player with running totals to 500, and the deep-draw rule on the sheet.' },
    { name: 'Contract Rummy score sheet', cat: 'printable', url: '/printables/contract-rummy-score-sheet/', desc: 'All seven contracts and deal sizes printed on the pad — two full games per sheet.' },
    { name: 'Shanghai Rummy score sheet', cat: 'printable', url: '/printables/shanghai-rummy-score-sheet/', desc: 'Ten rounds with contracts printed, deuces-wild card values and buying limits on the sheet.' },
    { name: 'Liverpool Rummy score sheet', cat: 'printable', url: '/printables/liverpool-rummy-score-sheet/', desc: 'The seven deals ending in the run of seven, two games per sheet, with the buying rule.' },
    { name: 'Progressive Rummy score sheet', cat: 'printable', url: '/printables/progressive-rummy-score-sheet/', desc: 'The standard contract list plus a blank write-in grid for your family’s own rounds.' },
    { name: 'Oh Hell score sheet', cat: 'printable', url: '/printables/oh-hell-score-sheet/', desc: 'Up and Down the River pad: 19 rounds with deal sizes printed and both common scoring systems.' },
    { name: 'Whist score sheets', cat: 'printable', url: '/printables/whist-score-sheets/', desc: 'Two cut-out whist drive cards plus a Bid Whist team tally with uptown/downtown tracking.' },
    { name: 'Bridge score sheet', cat: 'printable', url: '/printables/bridge-score-sheet/', desc: 'A rubber bridge WE/THEY pad with the line — and the full point values printed below.' },
    { name: 'Bridge tally cards', cat: 'printable', url: '/printables/bridge-tally-cards/', desc: 'Four personal tallies per sheet plus rotations for two, three and four tables of party bridge.' },
    { name: 'Pitch score sheet', cat: 'printable', url: '/printables/pitch-score-sheet/', desc: 'High, Low, Jack and Game — partnership and cutthroat pads with the four points explained.' },
    { name: 'Yardzee score card', cat: 'printable', url: '/printables/yardzee-score-card/', desc: 'Big-print yard dice score cards, two per page, with the full category list and rules.' },
    { name: 'Kismet score sheet', cat: 'printable', url: '/printables/kismet-score-sheet/', desc: 'The colored-dice card with all categories, three bonus tiers and the pip colors explained.' },
    { name: '10,000 dice score sheet', cat: 'printable', url: '/printables/10000-dice-score-sheet/', desc: 'Banked and running totals to 10,000 with the base scoring and a house-rule checklist.' },
    { name: 'Shut the Box score sheet', cat: 'printable', url: '/printables/shut-the-box-score-sheet/', desc: 'Two game grids with the rules on the sheet — works for 1–9, 1–10 and 1–12 boxes.' },
    { name: 'Ship Captain Crew score sheet', cat: 'printable', url: '/printables/ship-captain-crew-score-sheet/', desc: 'Eighteen rounds of cargo scores with the 6-5-4 in-order rules printed on the pad.' },
    { name: 'Skip-Bo score sheet', cat: 'printable', url: '/printables/skip-bo-score-sheet/', desc: 'Game-by-game scoring to 500 with the official points — 25 to win plus 5 per stock card.' },
    { name: 'Flip 7 score sheet', cat: 'printable', url: '/printables/flip-7-score-sheet/', desc: 'Rounds and running totals to 200, with the bust rule and the +15 Flip 7 bonus on the pad.' },
    { name: 'Skyjo score sheet', cat: 'printable', url: '/printables/skyjo-score-sheet/', desc: 'Rounds and totals for six players — with the round-end doubling rule printed where it can’t be disputed.' },
    { name: 'Qwirkle score sheet', cat: 'printable', url: '/printables/qwirkle-score-sheet/', desc: 'Turn-by-turn scoring with the line rules, the +6 Qwirkle bonus and the go-out bonus.' },
    { name: 'Play Nine score sheet', cat: 'printable', url: '/printables/play-nine-score-sheet/', desc: 'Two 9-hole grids with the official match bonuses — including what a pair of Hole-in-Ones is really worth.' },
    { name: 'Chess score sheet', cat: 'printable', url: '/printables/chess-score-sheet/', desc: 'Fifty numbered move pairs with a game header and algebraic notation explained in one minute.' },
    { name: 'Darts score sheets', cat: 'printable', url: '/printables/darts-score-sheets/', desc: 'Cricket scoreboards, 501 subtraction ladders and a killer lives tracker — with all three rule sets.' },
    { name: 'Pig dice score sheet', cat: 'printable', url: '/printables/pig-dice-score-sheet/', desc: 'Two race-to-100 grids for the classroom classic, with the rules and Two-Dice Pig variant.' },
    { name: 'Mini golf scorecard', cat: 'printable', url: '/printables/mini-golf-scorecard/', desc: 'An 18-hole card plus two 9-hole cards — blank pars fit any course, bucket golf included.' },
    { name: 'Blackjack strategy chart', cat: 'printable', url: '/printables/blackjack-strategy-chart/', desc: 'Every hard total, soft total and pair for a 6-deck S17 game — the complete basic strategy on one page.' },
    { name: 'Craps payout chart', cat: 'printable', url: '/printables/craps-payout-chart/', desc: 'Line bets, odds, place bets and the field — every payout, ranked from lowest to highest house edge.' },
    { name: 'Video poker strategy chart', cat: 'printable', url: '/printables/video-poker-strategy-chart/', desc: 'The 9/6 Jacks or Better pay table plus the hold priority list — read down, keep the first line that matches.' },
    { name: 'Poker hand rankings', cat: 'printable', url: '/printables/poker-hand-rankings/', desc: 'All ten hands strongest to weakest, with an example of each and the tie-break rules that decide close pots.' },
    { name: 'Roulette payout chart', cat: 'printable', url: '/printables/roulette-payout-chart/', desc: 'Every inside and outside bet with payout and coverage — plus the honest house-edge numbers.' },
    { name: 'Hold\'em starting hands', cat: 'printable', url: '/printables/texas-holdem-starting-hands/', desc: 'A tight-aggressive baseline by tier and position — raise, call or fold before the flop.' },
    { name: 'Three Card Poker payouts', cat: 'printable', url: '/printables/three-card-poker-payouts/', desc: 'Pair Plus, Ante Bonus and 6-Card Bonus pay tables on one reference card — with the three-card hand ranking.' },
    { name: 'Crazy Eights rules card', cat: 'printable', url: '/printables/crazy-eights-rules/', desc: 'A one-page rules card with the scoring values and the common variants, sized to keep in the card box.' },
    { name: 'Mancala rules card', cat: 'printable', url: '/printables/mancala-rules/', desc: 'Sowing, free turns, captures and the end-game sweep — plus the six strategy ideas that decide most games.' },
    { name: 'Othello rules card', cat: 'printable', url: '/printables/othello-rules/', desc: 'Opening setup, legal moves, flipping and passing, with the corner strategy that decides nearly every game.' },
    { name: 'Backgammon rules card', cat: 'printable', url: '/printables/backgammon-rules/', desc: 'Rolling, making points, hitting blots and bearing off — the whole game on one page.' },
    { name: 'Solitaire rules card', cat: 'printable', url: '/printables/solitaire-rules/', desc: 'Klondike layout, legal moves and the empty-column rule, plus six tips that measurably raise your win rate.' },
    { name: 'Cribbage scoring chart', cat: 'printable', url: '/printables/cribbage-scoring-chart/', desc: 'Every hand combination and every pegging score — including the flush rule that differs in the crib.' },
    { name: 'Left Center Right rules', cat: 'printable', url: '/printables/left-center-right-rules/', desc: 'The full LCR rules card with the regular-dice conversion chart — 1-3 keep, 4 left, 5 center, 6 right.' },
    { name: 'Dots and boxes grid', cat: 'printable', url: '/printables/dots-and-boxes-grid/', desc: 'One large 12×9 board plus two small ones, with the chain strategy that decides the game.' },
    { name: 'Tic-tac-toe sheets', cat: 'printable', url: '/printables/tic-tac-toe-sheets/', desc: 'Nine blank grids on a page, with the move order that means you can never lose.' },
    { name: 'Battleship grid', cat: 'printable', url: '/printables/battleship-grid/', desc: 'Two labelled 10×10 grids per player, the fleet list and a sunk-ship tracker.' },
    { name: 'Hangman template', cat: 'printable', url: '/printables/hangman-template/', desc: 'Six rounds a page, each with a gallows, answer line and the alphabet to cross off.' },
    { name: 'Ultimate Tic-Tac-Toe board', cat: 'printable', url: '/printables/ultimate-tic-tac-toe-board/', desc: 'A clean blank 9×9 board — nine boards inside one — with the send rule printed underneath.' },
    { name: 'Chess board & pieces', cat: 'printable', url: '/printables/chess-board/', desc: 'A full board and all 32 cut-out pieces, with the setup rules under the board.' },
    { name: 'Checkers board & discs', cat: 'printable', url: '/printables/checkers-board/', desc: 'An 8×8 board with 24 discs plus king spares — and the mandatory-jump rule in print.' },
    { name: 'Mancala board', cat: 'printable', url: '/printables/mancala-board/', desc: 'Twelve pits and two stores sized for real seeds, with the rules underneath.' },
    { name: 'Cribbage board template', cat: 'printable', url: '/printables/cribbage-board-template/', desc: 'Two 120-hole pencil tracks with every fifth hole shaded — peg with pencil marks.' },
    { name: 'Euchre rotation charts', cat: 'printable', url: '/printables/euchre-rotation-charts/', desc: '8- and 12-player schedules where every player partners every other exactly once.' },
    { name: 'Trivia answer sheets', cat: 'printable', url: '/printables/trivia-answer-sheets/', desc: 'A 20-question slip, two 10-question slips and a host scoring grid — a quiz night on one page.' },
    { name: 'Game night score sheets', cat: 'printable', url: '/printables/game-night-score-sheets/', desc: 'A game-by-game log with a winner column and leaderboard — one pad for the whole evening.' },
    { name: 'Pictionary word lists', cat: 'printable', url: '/printables/pictionary-word-lists/', desc: '162 original words across easy, medium, hard, kids and holiday lists, with the drawing rules.' },
    { name: 'Charades cards', cat: 'printable', url: '/printables/charades-cards/', desc: '24 cut-out prompt cards plus the classic gesture code, printed where everyone can see it.' },
    { name: 'Poker run score sheet', cat: 'printable', url: '/printables/poker-run-score-sheet/', desc: 'Fifteen riders, five checkpoint boxes each, and the poker hand rankings at the finish line.' },
    { name: 'Football squares', cat: 'printable', url: '/printables/football-squares/', desc: 'The classic 100-square pool grid with number strips and a payout table.' },
    { name: 'White Elephant rules', cat: 'printable', url: '/printables/white-elephant-rules/', desc: 'The rules card that ends the annual argument, plus 30 cut-apart number slips.' },
    { name: 'JSON Formatter', cat: 'utility', url: '/utilities/json-formatter/', desc: '' },
    { name: 'Base64', cat: 'utility', url: '/utilities/base64/', desc: '' },
    { name: 'Regex Tester', cat: 'utility', url: '/utilities/regex-tester/', desc: '' },
    { name: 'JWT Decoder', cat: 'utility', url: '/utilities/jwt-decoder/', desc: '' },
    { name: 'Unit Converter', cat: 'utility', url: '/utilities/unit-converter/', desc: '' },
    { name: 'Percentage Calculator', cat: 'utility', url: '/utilities/percentage-calculator/', desc: '' },
    { name: 'Loan Calculator', cat: 'utility', url: '/utilities/loan-calculator/', desc: '' },
    { name: 'Color Converter', cat: 'utility', url: '/utilities/color-converter/', desc: '' },
    { name: 'Text Counter', cat: 'utility', url: '/utilities/text-counter/', desc: '' },
    { name: 'Case Converter', cat: 'utility', url: '/utilities/case-converter/', desc: '' },
    { name: 'Text Diff', cat: 'utility', url: '/utilities/text-diff/', desc: '' },
    { name: 'Gradient Generator', cat: 'utility', url: '/utilities/gradient-generator/', desc: '' },
    { name: 'Tournament Generator', cat: 'utility', url: '/utilities/tournament-generator/', desc: '' },
    { name: 'Bocce score cards', cat: 'printable', url: '/printables/bocce-score-cards/', desc: 'Frame-by-frame bocce cards, two per page, with the closest-to-the-pallino scoring rules printed on the card.' },
    { name: 'Nertz score sheet', cat: 'printable', url: '/printables/nertz-score-sheet/', desc: 'Round scores and running totals to 100 for six players, with the +1/−2 Nertz scoring printed on the pad.' },
    { name: 'Rook score sheet', cat: 'printable', url: '/printables/rook-score-sheet/', desc: 'WE/THEY pad to 300 with bid column, counter card values, and the set rule printed on the sheet.' },
    { name: 'Sheepshead score sheet', cat: 'printable', url: '/printables/sheepshead-score-sheet/', desc: 'Five-player pad with the Wisconsin payout table — picker, partner, schneider, schwarz, and leasters.' },
    { name: 'Shuffleboard score cards', cat: 'printable', url: '/printables/shuffleboard-score-cards/', desc: 'Table shuffleboard to 15/21 and the outdoor court game to 75, with zones, hangers, and 10-OFF on the sheet.' },
    { name: 'Garbage (Trash) rules card', cat: 'printable', url: '/printables/garbage-rules-card/', desc: 'The kids\u2019 classic on one card: 2×5 layout diagram, wild Jacks, dead Queens and Kings, shrinking rounds.' },
    { name: 'Kings in the Corner rules', cat: 'printable', url: '/printables/kings-in-the-corner-rules/', desc: 'Layout diagram, corner Kings, pile moves, and the common 10-per-King scoring on one printable card.' },
    { name: 'Tripoley layout mat', cat: 'printable', url: '/printables/tripoley-layout/', desc: 'The classic nine-section Michigan Rummy mat with the three-phase rules printed under it.' },
    { name: 'Send feedback', cat: 'feedback', url: '/feedback/', desc: 'Report a bug, request a game or printable — read by the person who builds the site.' },
  ];

  // extras cat -> label + accent color used by the search UIs
  window.LG_EXTRA_META = {
    printable: { label: 'Printable', color: '#8A5A2B' },
    utility:   { label: 'Utility',   color: '#147C7C' },
    feedback:  { label: 'Site',      color: '#147C7C' },
  };

  // ── Shared search scoring (used by hub.js and global-search.js) ─────────
  // Substring tiers first. When none hit and the query is long enough to
  // carry signal, fall back to edit distance so one-typo queries
  // ("yachtzee", "farkel") still find the right thing instead of a dead end.
  function editDist(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    var pp = null, prev = [], cur, i, j, cost, best;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      cur = [i];
      best = i;
      for (j = 1; j <= b.length; j++) {
        cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
        // an adjacent swap counts as one edit ("farkel" -> "farkle")
        if (pp && j > 1 && a.charAt(i - 1) === b.charAt(j - 2) && a.charAt(i - 2) === b.charAt(j - 1)) {
          cur[j] = Math.min(cur[j], pp[j - 2] + 1);
        }
        if (cur[j] < best) best = cur[j];
      }
      if (best > max) return max + 1;
      pp = prev; prev = cur;
    }
    return prev[b.length];
  }

  // Score query q against a lowercased name; hay is extra searchable text
  // (desc + category). Higher wins; -1 means no match.
  window.LG_SCORE = function (q, name, hay) {
    if (name === q) return 100;
    if (name.indexOf(q) === 0) return 80;
    var words = name.split(/[\s-]+/), i;
    for (i = 0; i < words.length; i++) if (words[i].indexOf(q) === 0) return 70;
    if (name.indexOf(q) !== -1) return 50;
    if (q.length >= 4) {
      var max = q.length >= 7 ? 2 : 1;
      if (editDist(q, name, max) <= max) return 40;
      for (i = 0; i < words.length; i++) {
        if (words[i].length >= 4 && editDist(q, words[i], max) <= max) return 40;
      }
    }
    if (hay && hay.indexOf(q) !== -1) return 20;
    return -1;
  };
})();
