// Chess notation helpers — SAN, FEN, PGN. Built on the ChessEngine exports; the engine is unchanged.

(function (global) {
  'use strict';

  const E = global.ChessEngine;
  const FILES = 'abcdefgh';

  // Forsyth–Edwards Notation for the current position.
  function toFEN(state) {
    let board = '';
    for (let r = 0; r < 8; r++) {
      let empty = 0, row = '';
      for (let f = 0; f < 8; f++) {
        const p = state.board[r * 8 + f];
        if (p === '.') { empty++; }
        else { if (empty) { row += empty; empty = 0; } row += p; }
      }
      if (empty) row += empty;
      board += row + (r < 7 ? '/' : '');
    }
    const cr = state.castling;
    let castle = (cr.wK ? 'K' : '') + (cr.wQ ? 'Q' : '') + (cr.bK ? 'k' : '') + (cr.bQ ? 'q' : '');
    if (!castle) castle = '-';
    const ep = state.ep == null ? '-' : E.alg(state.ep);
    return `${board} ${state.turn} ${castle} ${ep} ${state.halfmove} ${state.fullmove}`;
  }

  // Check / checkmate suffix for a move applied to `state`.
  function suffix(state, move) {
    const c = E.clone(state);
    E.makeMove(c, move);
    const st = E.getStatus(c);
    if (st === 'mate') return '#';
    if (E.isInCheck(c, c.turn)) return '+';
    return '';
  }

  // Origin disambiguation when another same-type piece can also reach the destination.
  function disambig(state, move) {
    const others = E.generateLegalMoves(state).filter(m =>
      m.piece === move.piece && m.to === move.to && m.from !== move.from);
    if (others.length === 0) return '';
    const sameFile = others.some(m => E.fl(m.from) === E.fl(move.from));
    const sameRank = others.some(m => E.rk(m.from) === E.rk(move.from));
    if (!sameFile) return FILES[E.fl(move.from)];
    if (!sameRank) return String(8 - E.rk(move.from));
    return FILES[E.fl(move.from)] + String(8 - E.rk(move.from));
  }

  // Standard Algebraic Notation. `state` must be the position BEFORE the move.
  function toSAN(state, move) {
    if (move.castle === 'K') return 'O-O' + suffix(state, move);
    if (move.castle === 'Q') return 'O-O-O' + suffix(state, move);
    const type = move.piece.toUpperCase();
    const dest = E.alg(move.to);
    const isCap = !!(move.capture || move.ep);
    let s = '';
    if (type === 'P') {
      if (isCap) s += FILES[E.fl(move.from)] + 'x';
      s += dest;
      if (move.promo) s += '=' + move.promo.toUpperCase();
    } else {
      s += type + disambig(state, move) + (isCap ? 'x' : '') + dest;
    }
    return s + suffix(state, move);
  }

  // Minimal but valid PGN from an array of SAN strings.
  function toPGN(sans, result, white, black) {
    const d = new Date();
    const date = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
    let head = `[Event "Casual game"]\n[Site "limestonegames.com"]\n[Date "${date}"]\n[Round "-"]\n`;
    head += `[White "${white || 'White'}"]\n[Black "${black || 'Black'}"]\n[Result "${result || '*'}"]\n\n`;
    let body = '';
    for (let i = 0; i < sans.length; i++) {
      if (i % 2 === 0) body += (i / 2 + 1) + '. ';
      body += sans[i] + ' ';
    }
    body += (result || '*');
    return head + body + '\n';
  }

  global.ChessNotation = { toFEN, toSAN, toPGN };
})(window);
