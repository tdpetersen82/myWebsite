// Chess AI — negamax with alpha-beta pruning, piece-square tables, MVV-LVA ordering.
// Hard difficulty adds a small quiescence search on captures.

(function (global) {
  'use strict';

  const E = global.ChessEngine;

  // Material values (centipawns)
  const PIECE_VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

  // Piece-square tables (from white's perspective, index 0 = a8 / black's back rank).
  // Black mirrors vertically.
  const PST = {
    p: [
       0,  0,  0,  0,  0,  0,  0,  0,
      50, 50, 50, 50, 50, 50, 50, 50,
      10, 10, 20, 30, 30, 20, 10, 10,
       5,  5, 10, 25, 25, 10,  5,  5,
       0,  0,  0, 20, 20,  0,  0,  0,
       5, -5,-10,  0,  0,-10, -5,  5,
       5, 10, 10,-20,-20, 10, 10,  5,
       0,  0,  0,  0,  0,  0,  0,  0,
    ],
    n: [
      -50,-40,-30,-30,-30,-30,-40,-50,
      -40,-20,  0,  0,  0,  0,-20,-40,
      -30,  0, 10, 15, 15, 10,  0,-30,
      -30,  5, 15, 20, 20, 15,  5,-30,
      -30,  0, 15, 20, 20, 15,  0,-30,
      -30,  5, 10, 15, 15, 10,  5,-30,
      -40,-20,  0,  5,  5,  0,-20,-40,
      -50,-40,-30,-30,-30,-30,-40,-50,
    ],
    b: [
      -20,-10,-10,-10,-10,-10,-10,-20,
      -10,  0,  0,  0,  0,  0,  0,-10,
      -10,  0,  5, 10, 10,  5,  0,-10,
      -10,  5,  5, 10, 10,  5,  5,-10,
      -10,  0, 10, 10, 10, 10,  0,-10,
      -10, 10, 10, 10, 10, 10, 10,-10,
      -10,  5,  0,  0,  0,  0,  5,-10,
      -20,-10,-10,-10,-10,-10,-10,-20,
    ],
    r: [
       0,  0,  0,  0,  0,  0,  0,  0,
       5, 10, 10, 10, 10, 10, 10,  5,
      -5,  0,  0,  0,  0,  0,  0, -5,
      -5,  0,  0,  0,  0,  0,  0, -5,
      -5,  0,  0,  0,  0,  0,  0, -5,
      -5,  0,  0,  0,  0,  0,  0, -5,
      -5,  0,  0,  0,  0,  0,  0, -5,
       0,  0,  0,  5,  5,  0,  0,  0,
    ],
    q: [
      -20,-10,-10, -5, -5,-10,-10,-20,
      -10,  0,  0,  0,  0,  0,  0,-10,
      -10,  0,  5,  5,  5,  5,  0,-10,
       -5,  0,  5,  5,  5,  5,  0, -5,
        0,  0,  5,  5,  5,  5,  0, -5,
      -10,  5,  5,  5,  5,  5,  0,-10,
      -10,  0,  5,  0,  0,  0,  0,-10,
      -20,-10,-10, -5, -5,-10,-10,-20,
    ],
    // King midgame table (we don't switch to endgame PST here; simpler is fine for depth ≤4).
    k: [
      -30,-40,-40,-50,-50,-40,-40,-30,
      -30,-40,-40,-50,-50,-40,-40,-30,
      -30,-40,-40,-50,-50,-40,-40,-30,
      -30,-40,-40,-50,-50,-40,-40,-30,
      -20,-30,-30,-40,-40,-30,-30,-20,
      -10,-20,-20,-20,-20,-20,-20,-10,
       20, 20,  0,  0,  0,  0, 20, 20,
       20, 30, 10,  0,  0, 10, 30, 20,
    ],
  };

  // Score relative to side to move (negamax convention).
  function evaluate(state) {
    let score = 0;
    const board = state.board;
    for (let i = 0; i < 64; i++) {
      const p = board[i];
      if (p === '.') continue;
      const t = p.toLowerCase();
      const val = PIECE_VAL[t];
      const pst = PST[t][p === p.toUpperCase() ? i : (63 - i)];
      const sign = (p === p.toUpperCase()) ? 1 : -1;
      score += sign * (val + pst);
    }
    // Negamax: positive if side-to-move is better
    return state.turn === 'w' ? score : -score;
  }

  // Move ordering: captures first (MVV-LVA), promotions next, then quiet.
  function scoreMove(m) {
    let s = 0;
    if (m.capture) {
      const v = PIECE_VAL[m.capture.toLowerCase()] || 0;
      const a = PIECE_VAL[m.piece.toLowerCase()] || 0;
      s += 10000 + v * 10 - a;
    }
    if (m.promo) s += 8000 + PIECE_VAL[m.promo.toLowerCase()];
    if (m.castle) s += 100;
    return s;
  }

  function negamax(state, depth, alpha, beta, useQ) {
    const status = E.getStatus(state);
    if (status === 'mate') return -100000 + (state.history.length); // prefer later mate, mate-in-N
    if (status === 'stalemate' || status === 'draw-50' || status === 'draw-3fold' || status === 'draw-material') {
      return 0;
    }
    if (depth <= 0) {
      if (useQ) return quiescence(state, alpha, beta, 4);
      return evaluate(state);
    }

    const moves = E.generateLegalMoves(state);
    moves.sort((a, b) => scoreMove(b) - scoreMove(a));

    let best = -Infinity;
    for (const m of moves) {
      const undo = E.makeMove(state, m);
      const score = -negamax(state, depth - 1, -beta, -alpha, useQ);
      E.unmakeMove(state, m, undo);
      if (score > best) best = score;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  }

  function quiescence(state, alpha, beta, qdepth) {
    const stand = evaluate(state);
    if (qdepth <= 0) return stand;
    if (stand >= beta) return beta;
    if (stand > alpha) alpha = stand;

    const moves = E.generateLegalMoves(state).filter(m => m.capture || m.promo);
    moves.sort((a, b) => scoreMove(b) - scoreMove(a));
    for (const m of moves) {
      const undo = E.makeMove(state, m);
      const score = -quiescence(state, -beta, -alpha, qdepth - 1);
      E.unmakeMove(state, m, undo);
      if (score >= beta) return beta;
      if (score > alpha) alpha = score;
    }
    return alpha;
  }

  // Returns the chosen move and a small report. Difficulty: 'Easy' | 'Medium' | 'Hard'.
  function chooseMove(state, difficulty) {
    const cfg = {
      Easy:   { depth: 2, useQ: false, jitter: 80 },
      Medium: { depth: 3, useQ: false, jitter: 30 },
      Hard:   { depth: 4, useQ: true,  jitter: 0  },
    }[difficulty] || { depth: 3, useQ: false, jitter: 30 };

    const moves = E.generateLegalMoves(state);
    if (moves.length === 0) return null;

    // Search root: pick move with best score.
    let bestScore = -Infinity;
    const scored = [];
    moves.sort((a, b) => scoreMove(b) - scoreMove(a));
    let alpha = -Infinity, beta = Infinity;
    for (const m of moves) {
      const undo = E.makeMove(state, m);
      const score = -negamax(state, cfg.depth - 1, -beta, -alpha, cfg.useQ);
      E.unmakeMove(state, m, undo);
      scored.push({ m, score });
      if (score > bestScore) bestScore = score;
      if (score > alpha) alpha = score;
    }

    // Apply jitter on Easy/Medium so the AI picks slightly suboptimal moves sometimes.
    const window = cfg.jitter;
    const candidates = scored.filter(s => bestScore - s.score <= window);
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    return pick.m;
  }

  global.ChessAI = { chooseMove, evaluate };
})(window);
