/* eslint-disable */
// Shared playing-card sprite helper.
// Sprite at /assets/cards.png — 13 columns (ranks) × 4 rows (suits).
//   col index: A=0, 2=1, 3=2, 4=3, 5=4, 6=5, 7=6, 8=7, 9=8, 10=9, J=10, Q=11, K=12
//   row index: spades=0, hearts=1, diamonds=2, clubs=3
//
// Games normalize their suit/rank values to this index space via suitIndex()
// and rankIndex(), which accept both glyphs ('♠♥♦♣') and long names
// ('spades'/'hearts'/'diamonds'/'clubs') so each existing game keeps using
// its own data shape.
//
// faceStyle(rank, suit, w, h) returns the background-image properties to use
// on a card-face element of size w×h. Aspect of the source cells is taller
// than the typical 78×110 box, so cards render slightly compressed vertically
// at default sizes — readable, no layout breakage.
(function () {
  const URL = '../assets/cards.png';
  const COLS = 13;
  const ROWS = 4;

  const RANK_TO_COL = {
    'A': 0, 'a': 0,
    '2': 1, '3': 2, '4': 3, '5': 4, '6': 5, '7': 6, '8': 7, '9': 8, '10': 9,
    'J': 10, 'j': 10,
    'Q': 11, 'q': 11,
    'K': 12, 'k': 12
  };

  // Suit glyphs as \u escapes (ASCII-only source) so the keys are invariant
  // regardless of how the JS file is decoded by the browser.
  const SUIT_TO_ROW = {
    '\u2660': 0, 'spades': 0, 'spade': 0, 's': 0, 'S': 0, // \u2660
    '\u2665': 1, 'hearts': 1, 'heart': 1, 'h': 1, 'H': 1, // \u2665
    '\u2666': 2, 'diamonds': 2, 'diamond': 2, 'd': 2, 'D': 2, // \u2666
    '\u2663': 3, 'clubs': 3, 'club': 3, 'c': 3, 'C': 3 // \u2663
  };

  function rankIndex(rank) {
    const v = RANK_TO_COL[rank];
    return typeof v === 'number' ? v : 0;
  }

  function suitIndex(suit) {
    const v = SUIT_TO_ROW[suit];
    return typeof v === 'number' ? v : 0;
  }

  // Percentage-based — caller's element provides explicit width/height; the
  // sprite scales to fit each card cell into that box (slight vertical squish
  // on default 78×110-ish sizes, but no layout breakage). No `w`/`h` needed.
  function faceStyle(rank, suit) {
    const col = rankIndex(rank);
    const row = suitIndex(suit);
    return {
      backgroundImage: 'url(' + URL + ')',
      backgroundRepeat: 'no-repeat',
      backgroundSize: (COLS * 100) + '% ' + (ROWS * 100) + '%',
      backgroundPosition: (col / (COLS - 1) * 100) + '% ' + (row / (ROWS - 1) * 100) + '%'
    };
  }

  window.CASINO_CARDS = {
    URL: URL, COLS: COLS, ROWS: ROWS,
    rankIndex: rankIndex,
    suitIndex: suitIndex,
    faceStyle: faceStyle
  };
})();
