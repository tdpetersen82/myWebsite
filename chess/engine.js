// Chess rules engine — full rules including castling, en passant, promotion,
// check/checkmate/stalemate detection, 50-move rule, threefold repetition.
//
// Board representation: 64-element array, index 0=a8 (top-left), 63=h1 (bottom-right).
// Pieces: uppercase = white (PNBRQK), lowercase = black (pnbrqk), '.' = empty.

(function (global) {
  'use strict';

  const FILES = 'abcdefgh';
  const PIECES = 'PNBRQKpnbrqk';

  function colorOf(p) {
    if (p === '.' || !p) return null;
    return p === p.toUpperCase() ? 'w' : 'b';
  }
  function isWhite(p) { return p && p !== '.' && p === p.toUpperCase(); }
  function isBlack(p) { return p && p !== '.' && p === p.toLowerCase(); }
  function rk(sq) { return sq >> 3; }            // 0 (top, rank 8) — 7 (bottom, rank 1)
  function fl(sq) { return sq & 7; }             // 0 (file a) — 7 (file h)
  function sq(r, f) { return r * 8 + f; }
  function inBoard(r, f) { return r >= 0 && r < 8 && f >= 0 && f < 8; }
  function alg(s) { return FILES[fl(s)] + (8 - rk(s)); }

  function newGame() {
    const board = [
      'r','n','b','q','k','b','n','r',  // rank 8
      'p','p','p','p','p','p','p','p',  // rank 7
      '.','.','.','.','.','.','.','.',  // 6
      '.','.','.','.','.','.','.','.',  // 5
      '.','.','.','.','.','.','.','.',  // 4
      '.','.','.','.','.','.','.','.',  // 3
      'P','P','P','P','P','P','P','P',  // 2
      'R','N','B','Q','K','B','N','R',  // 1
    ];
    return {
      board: board,
      turn: 'w',
      castling: { wK: true, wQ: true, bK: true, bQ: true },
      ep: null,                  // en passant target square (the empty square the captured pawn passed through)
      halfmove: 0,
      fullmove: 1,
      history: [],               // position keys for threefold detection
      lastMove: null,            // { from, to }
    };
  }

  function clone(state) {
    return {
      board: state.board.slice(),
      turn: state.turn,
      castling: Object.assign({}, state.castling),
      ep: state.ep,
      halfmove: state.halfmove,
      fullmove: state.fullmove,
      history: state.history.slice(),
      lastMove: state.lastMove ? { from: state.lastMove.from, to: state.lastMove.to } : null,
    };
  }

  // Compact key for repetition detection (board + turn + castling + ep file)
  function positionKey(state) {
    return state.board.join('') + '|' + state.turn
      + '|' + (state.castling.wK ? 'K' : '') + (state.castling.wQ ? 'Q' : '')
      + (state.castling.bK ? 'k' : '') + (state.castling.bQ ? 'q' : '')
      + '|' + (state.ep == null ? '-' : fl(state.ep));
  }

  // True if `sq` is attacked by side `by` ('w'|'b') in the given board.
  function isAttacked(board, square, by) {
    const tr = rk(square), tf = fl(square);
    const upper = by === 'w';

    // Pawn attacks: pawns attack diagonally one square forward (relative to their color).
    // White pawns attack (tr+1, tf±1) when looking from target's perspective.
    if (upper) {
      // White pawn attacks square if a white P sits at (tr+1, tf-1) or (tr+1, tf+1)
      if (inBoard(tr + 1, tf - 1) && board[sq(tr + 1, tf - 1)] === 'P') return true;
      if (inBoard(tr + 1, tf + 1) && board[sq(tr + 1, tf + 1)] === 'P') return true;
    } else {
      if (inBoard(tr - 1, tf - 1) && board[sq(tr - 1, tf - 1)] === 'p') return true;
      if (inBoard(tr - 1, tf + 1) && board[sq(tr - 1, tf + 1)] === 'p') return true;
    }

    // Knights
    const N = upper ? 'N' : 'n';
    const knightOffs = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
    for (const [dr, df] of knightOffs) {
      const r = tr + dr, f = tf + df;
      if (inBoard(r, f) && board[sq(r, f)] === N) return true;
    }

    // Sliders: rook/queen along ranks/files; bishop/queen along diagonals
    const R = upper ? 'R' : 'r';
    const B = upper ? 'B' : 'b';
    const Q = upper ? 'Q' : 'q';
    const orth = [[-1,0],[1,0],[0,-1],[0,1]];
    for (const [dr, df] of orth) {
      let r = tr + dr, f = tf + df;
      while (inBoard(r, f)) {
        const p = board[sq(r, f)];
        if (p !== '.') {
          if (p === R || p === Q) return true;
          break;
        }
        r += dr; f += df;
      }
    }
    const diag = [[-1,-1],[-1,1],[1,-1],[1,1]];
    for (const [dr, df] of diag) {
      let r = tr + dr, f = tf + df;
      while (inBoard(r, f)) {
        const p = board[sq(r, f)];
        if (p !== '.') {
          if (p === B || p === Q) return true;
          break;
        }
        r += dr; f += df;
      }
    }

    // King (adjacent)
    const K = upper ? 'K' : 'k';
    for (let dr = -1; dr <= 1; dr++) {
      for (let df = -1; df <= 1; df++) {
        if (!dr && !df) continue;
        const r = tr + dr, f = tf + df;
        if (inBoard(r, f) && board[sq(r, f)] === K) return true;
      }
    }

    return false;
  }

  function findKing(board, color) {
    const k = color === 'w' ? 'K' : 'k';
    for (let i = 0; i < 64; i++) if (board[i] === k) return i;
    return -1;
  }

  function isInCheck(state, color) {
    const k = findKing(state.board, color);
    if (k < 0) return false;
    return isAttacked(state.board, k, color === 'w' ? 'b' : 'w');
  }

  // Generate all pseudo-legal moves (may leave own king in check).
  // Returns array of moves: { from, to, piece, capture, promo?, ep?, castle? ('K'|'Q') }
  function generatePseudoMoves(state) {
    const board = state.board;
    const turn = state.turn;
    const moves = [];
    const myColor = turn === 'w' ? 'w' : 'b';

    for (let s = 0; s < 64; s++) {
      const p = board[s];
      if (p === '.' || colorOf(p) !== myColor) continue;
      const r = rk(s), f = fl(s);
      const piece = p.toLowerCase();

      if (piece === 'p') {
        const dir = myColor === 'w' ? -1 : 1;     // white pawns move toward rank 8 (lower index)
        const startRank = myColor === 'w' ? 6 : 1;
        const promoRank = myColor === 'w' ? 0 : 7;

        // Forward 1
        const fwd = sq(r + dir, f);
        if (inBoard(r + dir, f) && board[fwd] === '.') {
          if (r + dir === promoRank) {
            for (const promo of (myColor === 'w' ? 'QRBN' : 'qrbn')) {
              moves.push({ from: s, to: fwd, piece: p, capture: null, promo });
            }
          } else {
            moves.push({ from: s, to: fwd, piece: p, capture: null });
            // Forward 2 from start
            if (r === startRank) {
              const fwd2 = sq(r + 2 * dir, f);
              if (board[fwd2] === '.') {
                moves.push({ from: s, to: fwd2, piece: p, capture: null, double: true });
              }
            }
          }
        }
        // Captures (and en passant)
        for (const df of [-1, 1]) {
          const nr = r + dir, nf = f + df;
          if (!inBoard(nr, nf)) continue;
          const ts = sq(nr, nf);
          const tgt = board[ts];
          if (tgt !== '.' && colorOf(tgt) !== myColor) {
            if (nr === promoRank) {
              for (const promo of (myColor === 'w' ? 'QRBN' : 'qrbn')) {
                moves.push({ from: s, to: ts, piece: p, capture: tgt, promo });
              }
            } else {
              moves.push({ from: s, to: ts, piece: p, capture: tgt });
            }
          } else if (state.ep != null && ts === state.ep) {
            // En passant: target square is empty; captured pawn sits on (r, nf)
            const capSq = sq(r, nf);
            moves.push({ from: s, to: ts, piece: p, capture: board[capSq], ep: capSq });
          }
        }
      } else if (piece === 'n') {
        const offs = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
        for (const [dr, df] of offs) {
          const nr = r + dr, nf = f + df;
          if (!inBoard(nr, nf)) continue;
          const ts = sq(nr, nf);
          const tgt = board[ts];
          if (tgt === '.' || colorOf(tgt) !== myColor) {
            moves.push({ from: s, to: ts, piece: p, capture: tgt === '.' ? null : tgt });
          }
        }
      } else if (piece === 'b' || piece === 'r' || piece === 'q') {
        const dirs = [];
        if (piece === 'b' || piece === 'q') dirs.push([-1,-1],[-1,1],[1,-1],[1,1]);
        if (piece === 'r' || piece === 'q') dirs.push([-1,0],[1,0],[0,-1],[0,1]);
        for (const [dr, df] of dirs) {
          let nr = r + dr, nf = f + df;
          while (inBoard(nr, nf)) {
            const ts = sq(nr, nf);
            const tgt = board[ts];
            if (tgt === '.') {
              moves.push({ from: s, to: ts, piece: p, capture: null });
            } else {
              if (colorOf(tgt) !== myColor) {
                moves.push({ from: s, to: ts, piece: p, capture: tgt });
              }
              break;
            }
            nr += dr; nf += df;
          }
        }
      } else if (piece === 'k') {
        for (let dr = -1; dr <= 1; dr++) {
          for (let df = -1; df <= 1; df++) {
            if (!dr && !df) continue;
            const nr = r + dr, nf = f + df;
            if (!inBoard(nr, nf)) continue;
            const ts = sq(nr, nf);
            const tgt = board[ts];
            if (tgt === '.' || colorOf(tgt) !== myColor) {
              moves.push({ from: s, to: ts, piece: p, capture: tgt === '.' ? null : tgt });
            }
          }
        }
        // Castling — king must not be in check; squares between empty;
        // king must not pass through or land on attacked square.
        const enemy = myColor === 'w' ? 'b' : 'w';
        const homeRank = myColor === 'w' ? 7 : 0;
        const cr = state.castling;
        if (s === sq(homeRank, 4) && !isAttacked(board, s, enemy)) {
          // Kingside
          if ((myColor === 'w' ? cr.wK : cr.bK)
              && board[sq(homeRank, 5)] === '.'
              && board[sq(homeRank, 6)] === '.'
              && !isAttacked(board, sq(homeRank, 5), enemy)
              && !isAttacked(board, sq(homeRank, 6), enemy)) {
            moves.push({ from: s, to: sq(homeRank, 6), piece: p, capture: null, castle: 'K' });
          }
          // Queenside
          if ((myColor === 'w' ? cr.wQ : cr.bQ)
              && board[sq(homeRank, 3)] === '.'
              && board[sq(homeRank, 2)] === '.'
              && board[sq(homeRank, 1)] === '.'
              && !isAttacked(board, sq(homeRank, 3), enemy)
              && !isAttacked(board, sq(homeRank, 2), enemy)) {
            moves.push({ from: s, to: sq(homeRank, 2), piece: p, capture: null, castle: 'Q' });
          }
        }
      }
    }
    return moves;
  }

  // Make a move on state, returning an undo record so unmakeMove can revert.
  function makeMove(state, m) {
    const board = state.board;
    const undo = {
      from: m.from, to: m.to,
      pieceMoved: board[m.from],
      pieceCaptured: board[m.to],
      epCapturedSq: m.ep != null ? m.ep : -1,
      epCapturedPiece: m.ep != null ? board[m.ep] : null,
      castle: m.castle || null,
      promo: m.promo || null,
      prevEp: state.ep,
      prevHalfmove: state.halfmove,
      prevCastling: Object.assign({}, state.castling),
      prevLastMove: state.lastMove,
    };

    // Move piece
    let moving = board[m.from];
    board[m.from] = '.';

    if (m.ep != null) {
      board[m.ep] = '.';
    }

    if (m.promo) {
      moving = m.promo;
    }

    board[m.to] = moving;

    // Castling: also move the rook
    if (m.castle === 'K') {
      const r = rk(m.to);
      board[sq(r, 5)] = board[sq(r, 7)];
      board[sq(r, 7)] = '.';
    } else if (m.castle === 'Q') {
      const r = rk(m.to);
      board[sq(r, 3)] = board[sq(r, 0)];
      board[sq(r, 0)] = '.';
    }

    // Update castling rights
    const cr = state.castling;
    if (undo.pieceMoved === 'K') { cr.wK = false; cr.wQ = false; }
    if (undo.pieceMoved === 'k') { cr.bK = false; cr.bQ = false; }
    if (undo.pieceMoved === 'R') {
      if (m.from === 56) cr.wQ = false;       // a1
      else if (m.from === 63) cr.wK = false;  // h1
    }
    if (undo.pieceMoved === 'r') {
      if (m.from === 0) cr.bQ = false;        // a8
      else if (m.from === 7) cr.bK = false;   // h8
    }
    if (m.to === 0) cr.bQ = false;
    if (m.to === 7) cr.bK = false;
    if (m.to === 56) cr.wQ = false;
    if (m.to === 63) cr.wK = false;

    // En passant target square: set if double pawn push
    if (m.double) {
      state.ep = sq((rk(m.from) + rk(m.to)) / 2, fl(m.from));
    } else {
      state.ep = null;
    }

    // Halfmove clock
    if (undo.pieceMoved.toLowerCase() === 'p' || undo.pieceCaptured !== '.') {
      state.halfmove = 0;
    } else {
      state.halfmove++;
    }

    // Fullmove
    if (state.turn === 'b') state.fullmove++;
    state.turn = state.turn === 'w' ? 'b' : 'w';

    state.lastMove = { from: m.from, to: m.to };
    state.history.push(positionKey(state));

    return undo;
  }

  function unmakeMove(state, m, undo) {
    const board = state.board;
    state.history.pop();
    state.lastMove = undo.prevLastMove;
    state.castling = undo.prevCastling;
    state.ep = undo.prevEp;
    state.halfmove = undo.prevHalfmove;
    state.turn = state.turn === 'w' ? 'b' : 'w';
    if (state.turn === 'b') state.fullmove--;

    // Undo castling rook
    if (m.castle === 'K') {
      const r = rk(m.to);
      board[sq(r, 7)] = board[sq(r, 5)];
      board[sq(r, 5)] = '.';
    } else if (m.castle === 'Q') {
      const r = rk(m.to);
      board[sq(r, 0)] = board[sq(r, 3)];
      board[sq(r, 3)] = '.';
    }

    // Undo move
    board[m.from] = undo.pieceMoved;
    board[m.to] = undo.pieceCaptured;

    // Undo en passant capture
    if (m.ep != null) {
      board[m.ep] = undo.epCapturedPiece;
    }
  }

  // Generate all legal moves (filtering pseudo-legal by king safety).
  function generateLegalMoves(state) {
    const pseudo = generatePseudoMoves(state);
    const legal = [];
    const myColor = state.turn;
    for (const m of pseudo) {
      const undo = makeMove(state, m);
      if (!isInCheck(state, myColor)) legal.push(m);
      unmakeMove(state, m, undo);
    }
    return legal;
  }

  // Detect insufficient material draw (K vs K, K+B vs K, K+N vs K, K+B vs K+B same color).
  function insufficientMaterial(board) {
    const counts = { w: { N: 0, B: 0, other: 0, bishopSquareColors: [] },
                     b: { N: 0, B: 0, other: 0, bishopSquareColors: [] } };
    for (let i = 0; i < 64; i++) {
      const p = board[i];
      if (p === '.' || p === 'K' || p === 'k') continue;
      const c = colorOf(p);
      const t = p.toLowerCase();
      if (t === 'n') counts[c].N++;
      else if (t === 'b') {
        counts[c].B++;
        counts[c].bishopSquareColors.push((rk(i) + fl(i)) & 1);
      } else counts[c].other++;
    }
    if (counts.w.other || counts.b.other) return false;
    const w = counts.w.N + counts.w.B;
    const b = counts.b.N + counts.b.B;
    if (w === 0 && b === 0) return true;                 // K v K
    if ((w === 1 && b === 0) || (w === 0 && b === 1)) return true; // K+B/K+N v K
    if (w === 1 && b === 1 && counts.w.B === 1 && counts.b.B === 1
        && counts.w.bishopSquareColors[0] === counts.b.bishopSquareColors[0]) return true;
    return false;
  }

  function getStatus(state) {
    const legal = generateLegalMoves(state);
    if (legal.length === 0) {
      if (isInCheck(state, state.turn)) return 'mate';
      return 'stalemate';
    }
    if (state.halfmove >= 100) return 'draw-50';
    if (insufficientMaterial(state.board)) return 'draw-material';
    // Threefold: count occurrences of current position key
    const key = state.history[state.history.length - 1];
    if (key) {
      let count = 0;
      for (const k of state.history) if (k === key) count++;
      if (count >= 3) return 'draw-3fold';
    }
    return 'playing';
  }

  // Convenience: legal moves for piece at given square (used for highlight).
  function legalMovesFrom(state, fromSq) {
    return generateLegalMoves(state).filter(m => m.from === fromSq);
  }

  // Load a position from FEN notation. Used for QA / testing positions (promotion,
  // stalemate, mate, en-passant setups) that real play rarely reaches. Returns a new
  // state; doesn't mutate any argument. Throws on malformed FEN.
  //
  // FEN format: <board> <turn> <castling> <ep> <halfmove> <fullmove>
  // e.g. "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" (starting position)
  function loadFen(fen) {
    const parts = fen.trim().split(/\s+/);
    if (parts.length < 4) throw new Error('FEN missing required fields: ' + fen);
    const [boardStr, turnStr, castlingStr, epStr, halfStr, fullStr] = parts;

    const board = new Array(64).fill('.');
    const ranks = boardStr.split('/');
    if (ranks.length !== 8) throw new Error('FEN board must have 8 ranks: ' + boardStr);
    for (let r = 0; r < 8; r++) {
      let f = 0;
      for (const ch of ranks[r]) {
        if (/[1-8]/.test(ch)) f += parseInt(ch, 10);
        else if (PIECES.includes(ch)) { board[r * 8 + f] = ch; f++; }
        else throw new Error('FEN invalid piece char: ' + ch);
      }
      if (f !== 8) throw new Error('FEN rank ' + (8 - r) + ' has wrong width: ' + ranks[r]);
    }
    if (turnStr !== 'w' && turnStr !== 'b') throw new Error('FEN turn must be w or b: ' + turnStr);

    const castling = { wK: false, wQ: false, bK: false, bQ: false };
    if (castlingStr !== '-') {
      for (const ch of castlingStr) {
        if (ch === 'K') castling.wK = true;
        else if (ch === 'Q') castling.wQ = true;
        else if (ch === 'k') castling.bK = true;
        else if (ch === 'q') castling.bQ = true;
        else throw new Error('FEN invalid castling char: ' + ch);
      }
    }

    let ep = null;
    if (epStr !== '-') {
      if (!/^[a-h][36]$/.test(epStr)) throw new Error('FEN invalid ep square: ' + epStr);
      const f = epStr.charCodeAt(0) - 97;
      const r = 8 - parseInt(epStr[1], 10);
      ep = r * 8 + f;
    }

    return {
      board,
      turn: turnStr,
      castling,
      ep,
      halfmove: halfStr != null ? parseInt(halfStr, 10) || 0 : 0,
      fullmove: fullStr != null ? parseInt(fullStr, 10) || 1 : 1,
      history: [],
      lastMove: null,
    };
  }

  global.ChessEngine = {
    newGame, clone, makeMove, unmakeMove, loadFen,
    generatePseudoMoves, generateLegalMoves, legalMovesFrom,
    isAttacked, isInCheck, getStatus, findKing,
    positionKey, alg, sq, rk, fl, colorOf,
  };
})(window);
