// Casual analysis layer — a shallow negamax built on the existing ChessEngine + ChessAI.evaluate.
// Strength is intentionally modest (it reuses the game AI's material + piece-square evaluation),
// so this is positioned in the UI as casual coaching, not engine-grade analysis.

(function (global) {
  'use strict';

  const E = global.ChessEngine;
  const AI = global.ChessAI;
  const MATE = 100000;
  const VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

  function scoreMove(m) {
    let s = 0;
    if (m.capture) s += 10000 + (VAL[m.capture.toLowerCase()] || 0) * 10 - (VAL[m.piece.toLowerCase()] || 0);
    if (m.promo) s += 8000;
    if (m.castle) s += 50;
    return s;
  }

  function negamax(s, depth, alpha, beta, ply) {
    const st = E.getStatus(s);
    if (st === 'mate') return -(MATE - ply);
    if (st !== 'playing') return 0; // any draw
    if (depth <= 0) return AI.evaluate(s);
    const moves = E.generateLegalMoves(s);
    moves.sort((a, b) => scoreMove(b) - scoreMove(a));
    let best = -Infinity;
    for (const m of moves) {
      const u = E.makeMove(s, m);
      const sc = -negamax(s, depth - 1, -beta, -alpha, ply + 1);
      E.unmakeMove(s, m, u);
      if (sc > best) best = sc;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  }

  // Returns { cp, mateIn, best } from White's perspective. `state` is left unchanged.
  function analyse(state, depth) {
    const moves = E.generateLegalMoves(state);
    if (moves.length === 0) {
      const inCheck = E.isInCheck(state, state.turn);
      const white = inCheck ? (state.turn === 'w' ? -MATE : MATE) : 0;
      return { cp: white, mateIn: inCheck ? 0 : null, best: null, terminal: true };
    }
    moves.sort((a, b) => scoreMove(b) - scoreMove(a));
    let best = -Infinity, bestMove = moves[0], alpha = -Infinity;
    const beta = Infinity;
    for (const m of moves) {
      const u = E.makeMove(state, m);
      const sc = -negamax(state, depth - 1, -beta, -alpha, 1);
      E.unmakeMove(state, m, u);
      if (sc > best) { best = sc; bestMove = m; }
      if (best > alpha) alpha = best;
    }
    const white = state.turn === 'w' ? best : -best;
    let mateIn = null;
    if (Math.abs(best) >= MATE - 1000) {
      const plies = MATE - Math.abs(best);
      mateIn = (white > 0 ? 1 : -1) * Math.max(1, Math.ceil(plies / 2));
    }
    return { cp: white, mateIn, best: bestMove, terminal: false };
  }

  // Static evaluation (material + piece-square) from White's perspective. Stable — no search,
  // so the eval bar doesn't swing on tempo the way a shallow search would.
  function staticCp(state) {
    const rel = AI.evaluate(state);
    return state.turn === 'w' ? rel : -rel;
  }

  // Move-quality marker from the mover's point of view (centipawn loss vs. the best line).
  // Conservative thresholds: the shallow search is noisy, so only flag clear errors to keep
  // the coaching trustworthy (better to miss a subtle slip than to call a good move a mistake).
  function classify(bestBeforeMover, afterMover) {
    const loss = bestBeforeMover - afterMover;
    if (loss >= 500) return '??';
    if (loss >= 300) return '?';
    if (loss >= 150) return '?!';
    return '';
  }

  global.ChessAnalysis = { analyse, staticCp, classify, MATE };
})(window);
