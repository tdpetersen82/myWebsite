// Chess UI — canvas board, click-to-move input, status updates, AI plumbing.
// Globals: ChessEngine (engine.js), ChessAI (ai.js).

(function () {
  'use strict';

  const E = window.ChessEngine;
  const AI = window.ChessAI;

  const PIECE_GLYPHS = {
    P: '♙', N: '♘', B: '♗', R: '♖', Q: '♕', K: '♔',
    p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚',
  };

  // DOM
  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d');
  const statusEl = document.getElementById('status');
  const turnEl = document.getElementById('turn');
  const winsEl = document.getElementById('wins');
  const streakEl = document.getElementById('streak');
  const diffEl = document.getElementById('difficulty');
  const newGameBtn = document.getElementById('newGame');
  const resignBtn = document.getElementById('resign');
  const flipBtn = document.getElementById('flip');
  const overEl = document.getElementById('over');
  const overTitleEl = document.getElementById('overTitle');
  const overTextEl = document.getElementById('overText');
  const overBtn = document.getElementById('overBtn');
  const promoEl = document.getElementById('promo');
  const promoChoices = document.getElementById('promoChoices');
  const capWhiteEl = document.getElementById('capWhite');
  const capBlackEl = document.getElementById('capBlack');

  // localStorage keys
  const KEY_STREAK = 'chessHighScore';   // current win streak (zeroed on loss/draw)
  const KEY_BEST = 'chessBestStreak';    // best streak ever
  const KEY_WINS = 'chessGamesWon';
  const KEY_LOSS = 'chessGamesLost';
  const KEY_DIFF = 'chessDifficulty';
  const KEY_PLAYER = 'chessPlayerColor'; // 'w' or 'b'

  const W = canvas.width, H = canvas.height;
  const SQ = W / 8;

  let state = E.newGame();
  let selected = null;        // selected square index
  let legalForSelected = [];  // array of moves
  let pendingPromo = null;    // { from, to, moves }
  let aiThinking = false;
  let captured = { w: [], b: [] }; // captured pieces by side that captured them
  let playerColor = (localStorage.getItem(KEY_PLAYER) === 'b') ? 'b' : 'w';
  let difficulty = localStorage.getItem(KEY_DIFF) || 'Medium';
  diffEl.value = difficulty;

  function readNum(k) {
    const n = parseInt(localStorage.getItem(k), 10);
    return isFinite(n) && n >= 0 ? n : 0;
  }
  function writeNum(k, v) { localStorage.setItem(k, String(v)); }

  function refreshStats() {
    const w = readNum(KEY_WINS);
    const l = readNum(KEY_LOSS);
    const s = readNum(KEY_STREAK);
    winsEl.textContent = w + '–' + l;
    streakEl.textContent = s;
  }
  refreshStats();

  // Drawing
  function squareXY(idx) {
    let r = E.rk(idx), f = E.fl(idx);
    if (playerColor === 'b') {
      r = 7 - r; f = 7 - f;
    }
    return { x: f * SQ, y: r * SQ };
  }
  function xyToSquare(px, py) {
    let f = Math.floor(px / SQ);
    let r = Math.floor(py / SQ);
    if (f < 0 || f > 7 || r < 0 || r > 7) return -1;
    if (playerColor === 'b') { r = 7 - r; f = 7 - f; }
    return r * 8 + f;
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    const lastMove = state.lastMove;
    const inCheck = E.isInCheck(state, state.turn);
    const kingSq = inCheck ? E.findKing(state.board, state.turn) : -1;

    for (let i = 0; i < 64; i++) {
      const { x, y } = squareXY(i);
      const dark = ((E.rk(i) + E.fl(i)) & 1) === 1;
      ctx.fillStyle = dark ? '#A07B4F' : '#E8D2A1';
      ctx.fillRect(x, y, SQ, SQ);

      // Last-move highlight
      if (lastMove && (i === lastMove.from || i === lastMove.to)) {
        ctx.fillStyle = dark ? 'rgba(245, 235, 80, 0.50)' : 'rgba(245, 235, 80, 0.65)';
        ctx.fillRect(x, y, SQ, SQ);
      }

      // King-in-check tint
      if (i === kingSq) {
        ctx.fillStyle = 'rgba(220, 60, 50, 0.5)';
        ctx.fillRect(x, y, SQ, SQ);
      }

      // Selected
      if (i === selected) {
        ctx.fillStyle = 'rgba(80, 160, 220, 0.55)';
        ctx.fillRect(x, y, SQ, SQ);
      }

      // Coordinate labels (a-h on bottom rank, 1-8 on left file)
      ctx.font = '11px Inter, sans-serif';
      ctx.fillStyle = dark ? 'rgba(232, 210, 161, 0.85)' : 'rgba(160, 123, 79, 0.85)';
      const fileChar = 'abcdefgh'[E.fl(i)];
      const rankChar = String(8 - E.rk(i));
      const labelF = playerColor === 'b' ? E.fl(i) === 0 : E.fl(i) === 7;
      const labelR = playerColor === 'b' ? E.rk(i) === 0 : E.rk(i) === 7;
      if (labelR) ctx.fillText(fileChar, x + SQ - 12, y + SQ - 4);
      if (labelF) ctx.fillText(rankChar, x + 3, y + 12);
    }

    // Legal-move dots for selected piece
    for (const m of legalForSelected) {
      const { x, y } = squareXY(m.to);
      ctx.beginPath();
      const cx = x + SQ / 2, cy = y + SQ / 2;
      if (m.capture || m.ep) {
        ctx.strokeStyle = 'rgba(40, 180, 90, 0.85)';
        ctx.lineWidth = 4;
        ctx.arc(cx, cy, SQ * 0.42, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(40, 180, 90, 0.55)';
        ctx.arc(cx, cy, SQ * 0.16, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Pieces
    ctx.font = `${SQ * 0.78}px "Bricolage Grotesque", "Segoe UI Symbol", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < 64; i++) {
      const p = state.board[i];
      if (p === '.') continue;
      const { x, y } = squareXY(i);
      const cx = x + SQ / 2, cy = y + SQ / 2 + SQ * 0.04;
      // Subtle drop shadow for readability on either square color
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.fillText(PIECE_GLYPHS[p], cx + 1, cy + 2);
      ctx.fillStyle = (p === p.toUpperCase()) ? '#FFFEF5' : '#1A1310';
      ctx.fillText(PIECE_GLYPHS[p], cx, cy);
    }
  }

  function renderCaptured() {
    capWhiteEl.textContent = captured.w.map(p => PIECE_GLYPHS[p]).join(' ');
    capBlackEl.textContent = captured.b.map(p => PIECE_GLYPHS[p]).join(' ');
  }

  function setStatus(msg) {
    statusEl.textContent = msg;
    turnEl.textContent = state.turn === 'w' ? 'White to move' : 'Black to move';
  }

  function showOver(title, text) {
    overTitleEl.textContent = title;
    overTextEl.textContent = text;
    overEl.classList.add('show');
  }

  function recordWin() {
    writeNum(KEY_WINS, readNum(KEY_WINS) + 1);
    const s = readNum(KEY_STREAK) + 1;
    writeNum(KEY_STREAK, s);
    if (s > readNum(KEY_BEST)) writeNum(KEY_BEST, s);
    refreshStats();
  }
  function recordLoss() {
    writeNum(KEY_LOSS, readNum(KEY_LOSS) + 1);
    writeNum(KEY_STREAK, 0);
    refreshStats();
  }
  function recordDraw() {
    writeNum(KEY_STREAK, 0);
    refreshStats();
  }

  function endGameIfTerminal() {
    const s = E.getStatus(state);
    if (s === 'playing') return false;
    if (s === 'mate') {
      // Side to move is mated — they lost.
      const winner = state.turn === 'w' ? 'Black' : 'White';
      const youWon = (state.turn !== playerColor);
      if (youWon) recordWin(); else recordLoss();
      showOver(youWon ? 'Checkmate — you win!' : 'Checkmate',
        winner + ' delivered mate. ' + (youWon ? 'Streak preserved.' : 'Streak reset.'));
    } else if (s === 'stalemate') {
      recordDraw();
      showOver('Stalemate', 'No legal moves and not in check. The game is a draw.');
    } else if (s === 'draw-50') {
      recordDraw();
      showOver('Draw — 50-move rule', 'No pawn move or capture in 50 moves. Drawn.');
    } else if (s === 'draw-3fold') {
      recordDraw();
      showOver('Draw — threefold repetition', 'Same position has occurred three times. Drawn.');
    } else if (s === 'draw-material') {
      recordDraw();
      showOver('Draw — insufficient material', 'Neither side can force mate. Drawn.');
    }
    return true;
  }

  function applyMove(move) {
    // Track captures
    if (move.capture) captured[E.colorOf(move.piece)].push(move.capture);

    E.makeMove(state, move);
    selected = null;
    legalForSelected = [];
    renderCaptured();
    draw();

    if (endGameIfTerminal()) return;

    setStatus(state.turn === playerColor ? 'Your move.' : 'AI is thinking…');
    if (state.turn !== playerColor) {
      scheduleAI();
    }
  }

  function scheduleAI() {
    if (aiThinking) return;
    aiThinking = true;
    setTimeout(() => {
      try {
        const m = AI.chooseMove(state, difficulty);
        if (m) applyMove(m);
      } finally {
        aiThinking = false;
        if (state.turn === playerColor) setStatus('Your move.');
      }
    }, 80);
  }

  // Click handler
  canvas.addEventListener('click', (e) => {
    if (aiThinking || pendingPromo) return;
    if (state.turn !== playerColor) return;
    const rect = canvas.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (W / rect.width);
    const py = (e.clientY - rect.top) * (H / rect.height);
    const sq = xyToSquare(px, py);
    if (sq < 0) return;

    // If a piece of mine is selected, try to move
    if (selected != null) {
      const m = legalForSelected.find(mv => mv.to === sq);
      if (m) {
        // Promotion: if multiple moves share from/to, prompt.
        const promos = legalForSelected.filter(mv => mv.from === selected && mv.to === sq && mv.promo);
        if (promos.length > 1) {
          showPromotion(promos);
          return;
        }
        applyMove(m);
        return;
      }
      // Re-select if clicking another own piece
      const p = state.board[sq];
      if (p !== '.' && E.colorOf(p) === playerColor) {
        selected = sq;
        legalForSelected = E.legalMovesFrom(state, sq);
        draw();
        return;
      }
      // Deselect
      selected = null;
      legalForSelected = [];
      draw();
      return;
    }

    const p = state.board[sq];
    if (p === '.' || E.colorOf(p) !== playerColor) return;
    selected = sq;
    legalForSelected = E.legalMovesFrom(state, sq);
    draw();
  });

  function showPromotion(promos) {
    pendingPromo = promos;
    promoChoices.innerHTML = '';
    const seen = new Set();
    for (const m of promos) {
      if (seen.has(m.promo)) continue;
      seen.add(m.promo);
      const btn = document.createElement('button');
      btn.className = 'promo-btn';
      btn.textContent = PIECE_GLYPHS[m.promo];
      btn.title = ({ q:'Queen', r:'Rook', b:'Bishop', n:'Knight',
                     Q:'Queen', R:'Rook', B:'Bishop', N:'Knight' })[m.promo];
      btn.addEventListener('click', () => {
        promoEl.classList.remove('show');
        pendingPromo = null;
        applyMove(m);
      });
      promoChoices.appendChild(btn);
    }
    promoEl.classList.add('show');
  }

  function newGame() {
    state = E.newGame();
    selected = null;
    legalForSelected = [];
    captured = { w: [], b: [] };
    overEl.classList.remove('show');
    promoEl.classList.remove('show');
    pendingPromo = null;
    aiThinking = false;
    setStatus(state.turn === playerColor ? 'Your move.' : 'AI is thinking…');
    renderCaptured();
    draw();
    if (state.turn !== playerColor) scheduleAI();
  }

  newGameBtn.addEventListener('click', newGame);
  overBtn.addEventListener('click', newGame);
  resignBtn.addEventListener('click', () => {
    if (overEl.classList.contains('show')) return;
    recordLoss();
    showOver('Resigned', 'You resigned. Streak reset.');
  });
  flipBtn.addEventListener('click', () => {
    playerColor = playerColor === 'w' ? 'b' : 'w';
    localStorage.setItem(KEY_PLAYER, playerColor);
    newGame();
  });
  diffEl.addEventListener('change', () => {
    difficulty = diffEl.value;
    localStorage.setItem(KEY_DIFF, difficulty);
  });

  newGame();

  // Auto-scale: keep board within viewport.
  (function () {
    const c = canvas;
    const bw = c.width, bh = c.height;
    function sc() {
      const par = c.parentElement;
      const ps = getComputedStyle(par);
      const mw = par.clientWidth - parseFloat(ps.paddingLeft) - parseFloat(ps.paddingRight);
      const mh = window.innerHeight * 0.72;
      const s = Math.min(mw / bw, mh / bh, 1);
      c.style.width = (bw * s) + 'px';
      c.style.height = (bh * s) + 'px';
    }
    window.addEventListener('resize', sc);
    sc();
  })();
})();
