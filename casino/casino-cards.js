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
// faceStyle(rank, suit) returns the background-image properties for a
// card-face element. Source cells are 156×220 (aspect 78:110); render the
// face on a container with that aspect to avoid sub-pixel rendering at the
// cell boundaries. All games use sizes that match: 78×110 (blackjack,
// three-card-poker, texas-holdem default), 84×118 (texas-holdem table,
// solitaire), 110×155 (video-poker), 36×51 (texas-holdem dealer minis).
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

  // Each rank's art in cards.png is not perfectly centered in its 156-px-wide
  // cell. These offsets nudge each rank's bg-position to recenter the art —
  // capped at each cell's available padding so we never expose neighbor-cell
  // pixels at the edges (which would show as faint boundary lines). Cards
  // whose art touches a cell edge in the source (9, 10, K) cannot be shifted
  // toward that edge and stay slightly off-center.
  const COL_SHIFT_X = [-2, -3, -2, -2, -2.5, -3, -1, -2.5, 0, 0, -2, -2.5, 0];

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

  // Percentage-based bg-size+position: each cell is rendered at exactly the
  // container's box. Caller is responsible for keeping container aspect at
  // 78:110 (== source cell aspect) — otherwise the bg image scales
  // non-uniformly and adjacent cells can bleed through at the edges.
  const CELL_W = 156;
  function faceStyle(rank, suit) {
    const col = rankIndex(rank);
    const row = suitIndex(suit);
    const xPct = (col * CELL_W + COL_SHIFT_X[col]) / ((COLS - 1) * CELL_W) * 100;
    return {
      backgroundImage: 'url(' + URL + ')',
      backgroundRepeat: 'no-repeat',
      backgroundSize: (COLS * 100) + '% ' + (ROWS * 100) + '%',
      backgroundPosition: xPct + '% ' + (row / (ROWS - 1) * 100) + '%'
    };
  }

  window.CASINO_CARDS = {
    URL: URL, COLS: COLS, ROWS: ROWS,
    rankIndex: rankIndex,
    suitIndex: suitIndex,
    faceStyle: faceStyle
  };
})();
