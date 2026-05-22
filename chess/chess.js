// Chess UI — DOM board, drag + click input, animated moves.
// The brain is untouched: ChessEngine (engine.js) for rules, ChessAI (ai.js) for the opponent.

(function () {
  'use strict';

  const E = window.ChessEngine;
  const AI = window.ChessAI;
  const FILES = 'abcdefgh';

  // ---- DOM ----
  const boardEl = document.getElementById('board');
  const squaresEl = document.getElementById('squares');
  const piecesEl = document.getElementById('pieces');
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
  const capTopEl = document.getElementById('capTop');
  const capBottomEl = document.getElementById('capBottom');
  const flipBoardBtn = document.getElementById('flipBoard');
  const boardThemeSel = document.getElementById('boardTheme');
  const pieceSetSel = document.getElementById('pieceSetSel');
  const soundSel = document.getElementById('soundSel');
  const analysisSel = document.getElementById('analysisSel');
  const evalWrapEl = document.getElementById('evalWrap');
  const evalFillEl = document.getElementById('evalFill');
  const evalNumEl = document.getElementById('evalNum');
  const hintBtn = document.getElementById('hint');
  const reviewBtn = document.getElementById('review');
  const analysisOutEl = document.getElementById('analysisOut');
  const movelistEl = document.getElementById('movelist');
  const reviewBarEl = document.getElementById('reviewBar');
  const toLiveBtn = document.getElementById('toLive');
  const undoBtn = document.getElementById('undo');
  const copyPgnBtn = document.getElementById('copyPgn');
  const copyFenBtn = document.getElementById('copyFen');

  // ---- localStorage keys (unchanged — the Strategy page reads chessGamesWon etc.) ----
  const KEY_STREAK = 'chessHighScore';
  const KEY_BEST = 'chessBestStreak';
  const KEY_WINS = 'chessGamesWon';
  const KEY_LOSS = 'chessGamesLost';
  const KEY_DIFF = 'chessDifficulty';
  const KEY_PLAYER = 'chessPlayerColor';
  const KEY_PIECES = 'chessPieceSet';
  const KEY_BOARD = 'chessBoardTheme';
  const KEY_SOUND = 'chessSound';
  const KEY_ANALYSIS = 'chessEvalBar';
  const EVAL_DEPTH = 3;
  const HINT_DEPTH = 4;

  function sound(type) { if (soundOn && window.ChessSound) ChessSound.play(type); }

  const PIECE_VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  const THEMES = {
    Wood:  { light: '#E8D2A1', dark: '#A07B4F', frame: '#5C3A1F' },
    Green: { light: '#EEEED2', dark: '#769656', frame: '#3C4A2A' },
    Blue:  { light: '#DEE3E6', dark: '#5B87A8', frame: '#2C4356' },
    Gray:  { light: '#E6E6E6', dark: '#9AA0A6', frame: '#474B50' },
  };

  // ---- state ----
  let state = E.newGame();
  let selected = null;
  let legalForSelected = [];
  let pendingPromo = null;
  let aiThinking = false;
  let gameOver = false;
  let captured = { w: [], b: [] };
  let playedMoves = [];   // [{ move, san }]
  let viewPly = 0;        // half-moves currently shown (live === playedMoves.length)
  let reviewing = false;
  let gameResultStr = '*';
  let playerColor = (localStorage.getItem(KEY_PLAYER) === 'b') ? 'b' : 'w';
  let orientation = playerColor;   // board view; can be flipped without changing sides
  let difficulty = localStorage.getItem(KEY_DIFF) || 'Medium';
  let pieceSet = localStorage.getItem(KEY_PIECES) || 'cburnett';
  let boardTheme = localStorage.getItem(KEY_BOARD) || 'Wood';
  let soundOn = localStorage.getItem(KEY_SOUND) !== 'off';
  let analysisOn = localStorage.getItem(KEY_ANALYSIS) !== 'off';
  diffEl.value = difficulty;

  const squareCells = new Array(64);            // board idx -> cell element
  const squarePieces = new Array(64).fill(null); // board idx -> piece element
  let drag = null;
  let hintSquares = null;  // { from, to } currently highlighted by the Hint button

  // ---- small helpers ----
  function readNum(k) { const n = parseInt(localStorage.getItem(k), 10); return isFinite(n) && n >= 0 ? n : 0; }
  function writeNum(k, v) { localStorage.setItem(k, String(v)); }
  function pieceCode(p) { return (p === p.toUpperCase() ? 'w' : 'b') + p.toUpperCase(); }
  function pieceSrc(p) { return 'pieces/' + pieceSet + '/' + pieceCode(p) + '.svg'; }

  function visualOf(idx) {
    const r = E.rk(idx), f = E.fl(idx);
    return orientation === 'b' ? { vr: 7 - r, vc: 7 - f } : { vr: r, vc: f };
  }
  function idxOf(vr, vc) {
    return orientation === 'b' ? (7 - vr) * 8 + (7 - vc) : vr * 8 + vc;
  }
  function setTransform(el, idx) {
    const { vr, vc } = visualOf(idx);
    el.style.transform = `translate(${vc * 100}%, ${vr * 100}%)`;
  }

  // ---- board build ----
  function buildSquares() {
    squaresEl.innerHTML = '';
    for (let vr = 0; vr < 8; vr++) {
      for (let vc = 0; vc < 8; vc++) {
        const idx = idxOf(vr, vc);
        const cell = document.createElement('div');
        cell.className = 'sq ' + (((vr + vc) & 1) ? 'dark' : 'light');
        cell.style.transform = `translate(${vc * 100}%, ${vr * 100}%)`;
        if (vc === 0) { const n = document.createElement('span'); n.className = 'coord rank'; n.textContent = String(8 - E.rk(idx)); cell.appendChild(n); }
        if (vr === 7) { const n = document.createElement('span'); n.className = 'coord file'; n.textContent = FILES[E.fl(idx)]; cell.appendChild(n); }
        squaresEl.appendChild(cell);
        squareCells[idx] = cell;
      }
    }
  }

  function createPieceEl(p, idx) {
    const el = document.createElement('div');
    el.className = 'piece';
    el.style.backgroundImage = `url("${pieceSrc(p)}")`;
    el.dataset.piece = p;
    setTransform(el, idx);
    piecesEl.appendChild(el);
    return el;
  }

  // Rebuild all piece elements from a board array, no animation.
  function placePiecesFrom(board) {
    boardEl.classList.add('no-anim');
    piecesEl.innerHTML = '';
    for (let i = 0; i < 64; i++) {
      squarePieces[i] = null;
      const p = board[i];
      if (p !== '.') squarePieces[i] = createPieceEl(p, i);
    }
    void boardEl.offsetWidth; // flush layout so the next frame animates again
    boardEl.classList.remove('no-anim');
  }
  function syncFromState() { placePiecesFrom(state.board); }

  function refreshStats() {
    winsEl.textContent = readNum(KEY_WINS) + '–' + readNum(KEY_LOSS);
    streakEl.textContent = readNum(KEY_STREAK);
  }

  function updateHighlights() {
    const last = state.lastMove;
    const inCheck = E.isInCheck(state, state.turn);
    const kingSq = inCheck ? E.findKing(state.board, state.turn) : -1;
    for (let i = 0; i < 64; i++) {
      const c = squareCells[i];
      if (!c) continue;
      c.classList.toggle('sq-last', !!last && (i === last.from || i === last.to));
      c.classList.toggle('sq-check', i === kingSq);
      c.classList.toggle('sq-sel', i === selected);
      c.classList.remove('sq-move', 'sq-cap');
    }
    for (const m of legalForSelected) {
      const c = squareCells[m.to];
      if (m.capture || m.ep) c.classList.add('sq-cap'); else c.classList.add('sq-move');
    }
  }

  // Highlights for a reviewed (read-only) position.
  function setReviewHighlights(s) {
    const last = s.lastMove;
    const inCheck = E.isInCheck(s, s.turn);
    const kingSq = inCheck ? E.findKing(s.board, s.turn) : -1;
    for (let i = 0; i < 64; i++) {
      const c = squareCells[i];
      if (!c) continue;
      c.classList.toggle('sq-last', !!last && (i === last.from || i === last.to));
      c.classList.toggle('sq-check', i === kingSq);
      c.classList.remove('sq-sel', 'sq-move', 'sq-cap');
    }
  }

  // Replay the first n half-moves onto a fresh game.
  function stateAfter(n) {
    const s = E.newGame();
    for (let i = 0; i < n; i++) E.makeMove(s, playedMoves[i].move);
    return s;
  }

  function mvHtml(i, activePly) {
    const p = playedMoves[i];
    const a = p.annot ? `<b class="annot ${annotClass(p.annot)}">${p.annot}</b>` : '';
    return `<span class="mv${i === activePly ? ' active' : ''}" data-ply="${i}">${p.san}${a}</span>`;
  }
  function updateMoveList() {
    if (playedMoves.length === 0) {
      movelistEl.innerHTML = '<span class="empty">Moves will appear here.</span>';
      return;
    }
    const activePly = viewPly - 1;
    let html = '';
    for (let i = 0; i < playedMoves.length; i += 2) {
      html += `<span class="moveno">${i / 2 + 1}.</span>` + mvHtml(i, activePly);
      html += playedMoves[i + 1] ? mvHtml(i + 1, activePly) : '<span></span>';
    }
    movelistEl.innerHTML = html;
    const active = movelistEl.querySelector('.mv.active');
    if (active) active.scrollIntoView({ block: 'nearest' });
  }

  // Show the position after n half-moves. n === playedMoves.length returns to live play.
  function reviewTo(n) {
    n = Math.max(0, Math.min(playedMoves.length, n));
    viewPly = n;
    if (n === playedMoves.length) {
      reviewing = false;
      selected = null; legalForSelected = [];
      placePiecesFrom(state.board);
      updateHighlights();
      reviewBarEl.hidden = true;
    } else {
      reviewing = true;
      const s = stateAfter(n);
      placePiecesFrom(s.board);
      setReviewHighlights(s);
      reviewBarEl.hidden = false;
    }
    updateMoveList();
    updateEval();
  }

  // ---- analysis / coaching ----
  function updateEval() {
    if (!analysisOn || !window.ChessAnalysis) { evalWrapEl.hidden = true; return; }
    evalWrapEl.hidden = false;
    const s = reviewing ? stateAfter(viewPly) : state;
    const status = E.getStatus(s);
    let whiteProb, label;
    if (status === 'mate') { whiteProb = s.turn === 'b' ? 1 : 0; label = '#'; }
    else if (status !== 'playing') { whiteProb = 0.5; label = '½'; }
    else {
      const cp = Math.max(-1500, Math.min(1500, ChessAnalysis.staticCp(s)));
      whiteProb = 1 / (1 + Math.pow(10, -cp / 400));
      label = (cp >= 0 ? '+' : '') + (cp / 100).toFixed(1);
    }
    evalFillEl.style.height = (whiteProb * 100).toFixed(1) + '%';
    evalNumEl.textContent = label;
    evalWrapEl.classList.toggle('flip', orientation === 'b');
  }

  function clearHint() {
    if (!hintSquares) return;
    [hintSquares.from, hintSquares.to].forEach(i => { if (squareCells[i]) squareCells[i].classList.remove('sq-hint'); });
    hintSquares = null;
  }
  function showHint() {
    if (gameOver || reviewing || aiThinking || state.turn !== playerColor || !window.ChessAnalysis) return;
    clearHint();
    const r = ChessAnalysis.analyse(state, HINT_DEPTH);
    if (!r.best) return;
    hintSquares = { from: r.best.from, to: r.best.to };
    squareCells[r.best.from].classList.add('sq-hint');
    squareCells[r.best.to].classList.add('sq-hint');
  }

  function annotClass(a) { return a === '??' ? 'a-blunder' : a === '?' ? 'a-mistake' : 'a-inacc'; }

  // Walk the whole game, mark move quality, and report approximate accuracy. Chunked to keep the UI live.
  function reviewGame() {
    if (playedMoves.length === 0 || !window.ChessAnalysis) return;
    reviewBtn.disabled = true;
    analysisOutEl.hidden = false;
    analysisOutEl.textContent = 'Analyzing… 0%';
    const cpl = { w: [], b: [] };
    const counts = { w: { '?!': 0, '?': 0, '??': 0 }, b: { '?!': 0, '?': 0, '??': 0 } };
    const s = E.newGame();
    let i = 0;
    function step() {
      const end = Math.min(i + 4, playedMoves.length);
      for (; i < end; i++) {
        const mover = s.turn;
        const before = ChessAnalysis.analyse(s, EVAL_DEPTH);
        const bestMover = mover === 'w' ? before.cp : -before.cp;
        E.makeMove(s, playedMoves[i].move);
        const after = ChessAnalysis.analyse(s, EVAL_DEPTH);
        const afterMover = mover === 'w' ? after.cp : -after.cp;
        cpl[mover].push(Math.max(0, bestMover - afterMover));
        const annot = ChessAnalysis.classify(bestMover, afterMover);
        playedMoves[i].annot = annot;
        if (annot) counts[mover][annot]++;
      }
      updateMoveList();
      if (i < playedMoves.length) {
        analysisOutEl.textContent = 'Analyzing… ' + Math.round(i / playedMoves.length * 100) + '%';
        setTimeout(step, 0);
        return;
      }
      const acc = side => {
        const arr = cpl[side];
        if (!arr.length) return 100;
        const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
        return Math.max(20, Math.min(100, Math.round(100 - avg / 6)));
      };
      const you = playerColor;
      analysisOutEl.innerHTML =
        '<b>Approximate accuracy</b>' +
        '<div class="acc-row">White ' + acc('w') + '% · Black ' + acc('b') + '%</div>' +
        '<div class="dim">You: ' + counts[you]['??'] + ' blunders, ' + counts[you]['?'] + ' mistakes, ' + counts[you]['?!'] + ' inaccuracies</div>';
      reviewBtn.disabled = false;
    }
    step();
  }

  function setStatus(msg) {
    statusEl.textContent = msg;
    turnEl.textContent = state.turn === 'w' ? 'White to move' : 'Black to move';
  }

  function materialOf(list) { return list.reduce((s, p) => s + (PIECE_VALUE[p.toLowerCase()] || 0), 0); }

  function captureStrip(list, adv) {
    const imgs = list.slice()
      .sort((a, b) => (PIECE_VALUE[b.toLowerCase()] || 0) - (PIECE_VALUE[a.toLowerCase()] || 0))
      .map(p => `<img src="${pieceSrc(p)}" alt="">`).join('');
    const advTxt = adv > 0 ? `<span class="cap-adv">+${adv}</span>` : '';
    return `<span class="pieces-mini">${imgs}</span>${advTxt}`;
  }

  function renderCaptured() {
    // captured.w = pieces White captured; captured.b = pieces Black captured.
    const whiteAdv = materialOf(captured.w) - materialOf(captured.b);
    const bottomColor = orientation;            // side shown at the bottom of the board
    const bottomCaps = bottomColor === 'w' ? captured.w : captured.b;
    const topCaps = bottomColor === 'w' ? captured.b : captured.w;
    const bottomAdv = bottomColor === 'w' ? whiteAdv : -whiteAdv;
    capBottomEl.innerHTML = captureStrip(bottomCaps, bottomAdv);
    capTopEl.innerHTML = captureStrip(topCaps, -bottomAdv);
  }

  function applyTheme(name) {
    const t = THEMES[name] || THEMES.Wood;
    boardEl.style.setProperty('--b-light', t.light);
    boardEl.style.setProperty('--b-dark', t.dark);
    boardEl.style.setProperty('--frame', t.frame);
  }

  // ---- move animation ----
  function fadeRemove(el) {
    if (!el) return;
    el.classList.add('gone');
    setTimeout(() => el.remove(), 200);
  }

  function animateMove(move) {
    const el = squarePieces[move.from];
    squarePieces[move.from] = null;

    if (move.ep != null) {
      fadeRemove(squarePieces[move.ep]); squarePieces[move.ep] = null;
    } else if (move.capture) {
      fadeRemove(squarePieces[move.to]); squarePieces[move.to] = null;
    }

    if (move.castle === 'K' || move.castle === 'Q') {
      const r = E.rk(move.to);
      const rf = move.castle === 'K' ? E.sq(r, 7) : E.sq(r, 0);
      const rt = move.castle === 'K' ? E.sq(r, 5) : E.sq(r, 3);
      const rel = squarePieces[rf]; squarePieces[rf] = null;
      if (rel) { setTransform(rel, rt); squarePieces[rt] = rel; }
    }

    if (el) {
      el.classList.add('moving');
      setTransform(el, move.to);
      squarePieces[move.to] = el;
      setTimeout(() => {
        el.classList.remove('moving');
        if (move.promo) { el.dataset.piece = move.promo; el.style.backgroundImage = `url("${pieceSrc(move.promo)}")`; }
      }, 200);
    }
  }

  // ---- game flow ----
  function recordWin() { writeNum(KEY_WINS, readNum(KEY_WINS) + 1); const s = readNum(KEY_STREAK) + 1; writeNum(KEY_STREAK, s); if (s > readNum(KEY_BEST)) writeNum(KEY_BEST, s); refreshStats(); }
  function recordLoss() { writeNum(KEY_LOSS, readNum(KEY_LOSS) + 1); writeNum(KEY_STREAK, 0); refreshStats(); }
  function recordDraw() { writeNum(KEY_STREAK, 0); refreshStats(); }

  function showOver(title, text) { overTitleEl.textContent = title; overTextEl.textContent = text; overEl.classList.add('show'); gameOver = true; }

  function endGameIfTerminal() {
    const s = E.getStatus(state);
    if (s === 'playing') return false;
    if (s === 'mate') {
      gameResultStr = state.turn === 'w' ? '0-1' : '1-0';
      const winner = state.turn === 'w' ? 'Black' : 'White';
      const youWon = (state.turn !== playerColor);
      if (youWon) recordWin(); else recordLoss();
      sound(youWon ? 'win' : 'lose');
      showOver(youWon ? 'Checkmate — you win!' : 'Checkmate',
        winner + ' delivered mate. ' + (youWon ? 'Streak preserved.' : 'Streak reset.'));
    } else if (s === 'stalemate') { gameResultStr = '1/2-1/2'; recordDraw(); sound('draw'); showOver('Stalemate', 'No legal moves and not in check. The game is a draw.'); }
    else if (s === 'draw-50') { gameResultStr = '1/2-1/2'; recordDraw(); sound('draw'); showOver('Draw — 50-move rule', 'No pawn move or capture in 50 moves. Drawn.'); }
    else if (s === 'draw-3fold') { gameResultStr = '1/2-1/2'; recordDraw(); sound('draw'); showOver('Draw — threefold repetition', 'Same position has occurred three times. Drawn.'); }
    else if (s === 'draw-material') { gameResultStr = '1/2-1/2'; recordDraw(); sound('draw'); showOver('Draw — insufficient material', 'Neither side can force mate. Drawn.'); }
    return true;
  }

  function applyMove(move) {
    const mover = state.turn;
    const san = window.ChessNotation ? ChessNotation.toSAN(state, move) : '';
    // Best the mover could have done (for coaching their own moves).
    let bestBeforeMover = null;
    if (analysisOn && mover === playerColor && window.ChessAnalysis) {
      const rb = ChessAnalysis.analyse(state, EVAL_DEPTH);
      bestBeforeMover = mover === 'w' ? rb.cp : -rb.cp;
    }
    clearHint();
    if (move.capture) captured[E.colorOf(move.piece)].push(move.capture);
    E.makeMove(state, move);
    playedMoves.push({ move, san });
    viewPly = playedMoves.length;
    reviewing = false; reviewBarEl.hidden = true;
    animateMove(move);
    selected = null; legalForSelected = [];
    updateHighlights();
    renderCaptured();
    if (bestBeforeMover != null) {
      const after = ChessAnalysis.analyse(state, EVAL_DEPTH);
      const afterMover = mover === 'w' ? after.cp : -after.cp;
      const annot = ChessAnalysis.classify(bestBeforeMover, afterMover);
      if (annot) playedMoves[playedMoves.length - 1].annot = annot;
    }
    updateMoveList();
    updateEval();
    sound(move.castle ? 'castle' : move.promo ? 'promote' : (move.capture || move.ep) ? 'capture' : 'move');
    if (endGameIfTerminal()) return;
    if (E.isInCheck(state, state.turn)) sound('check');
    setStatus(state.turn === playerColor ? 'Your move.' : 'AI is thinking…');
    if (state.turn !== playerColor) scheduleAI();
  }

  function scheduleAI() {
    if (aiThinking || gameOver) return;
    aiThinking = true;
    setTimeout(() => {
      try { const m = AI.chooseMove(state, difficulty); if (m) applyMove(m); }
      finally { aiThinking = false; if (!gameOver && state.turn === playerColor) setStatus('Your move.'); }
    }, 140);
  }

  // ---- input (click + drag, unified via pointer events) ----
  function squareAt(e) {
    const rect = boardEl.getBoundingClientRect();
    const cell = rect.width / 8;
    let vc = Math.floor((e.clientX - rect.left) / cell);
    let vr = Math.floor((e.clientY - rect.top) / cell);
    vc = Math.max(0, Math.min(7, vc));
    vr = Math.max(0, Math.min(7, vr));
    return idxOf(vr, vc);
  }

  function select(sqi) { clearHint(); selected = sqi; legalForSelected = E.legalMovesFrom(state, sqi); updateHighlights(); }
  function deselect() { clearHint(); selected = null; legalForSelected = []; updateHighlights(); }

  function chooseMoveTo(toSq) {
    const m = legalForSelected.find(mv => mv.to === toSq);
    if (!m) return false;
    const promos = legalForSelected.filter(mv => mv.to === toSq && mv.promo);
    if (promos.length > 1) {
      if (selected != null && squarePieces[selected]) setTransform(squarePieces[selected], selected);
      showPromotion(promos);
      return true;
    }
    applyMove(m);
    return true;
  }

  function onDown(e) {
    if (e.button != null && e.button !== 0) return;
    if (gameOver || aiThinking || pendingPromo || reviewing) return;
    if (state.turn !== playerColor) return;
    const sqi = squareAt(e);
    if (selected != null && chooseMoveTo(sqi)) return;
    const p = state.board[sqi];
    if (p !== '.' && E.colorOf(p) === playerColor) {
      select(sqi);
      const el = squarePieces[sqi];
      drag = { el, fromSq: sqi, moved: false, pid: e.pointerId, startX: e.clientX, startY: e.clientY };
      if (el) el.classList.add('dragging');
      try { boardEl.setPointerCapture(e.pointerId); } catch (_) { }
      e.preventDefault();
    } else {
      deselect();
    }
  }

  function onMove(e) {
    if (!drag) return;
    if (!drag.moved) {
      const dx = e.clientX - drag.startX, dy = e.clientY - drag.startY;
      if (dx * dx + dy * dy < 18) return;
      drag.moved = true;
    }
    const rect = boardEl.getBoundingClientRect();
    const cell = rect.width / 8;
    const x = e.clientX - rect.left - cell / 2;
    const y = e.clientY - rect.top - cell / 2;
    if (drag.el) drag.el.style.transform = `translate(${x}px, ${y}px)`;
  }

  function onUp(e) {
    if (!drag) return;
    const el = drag.el, fromSq = drag.fromSq, moved = drag.moved;
    try { boardEl.releasePointerCapture(drag.pid); } catch (_) { }
    if (el) el.classList.remove('dragging');
    const sqi = squareAt(e);
    drag = null;
    if (moved) {
      const handled = (selected != null) && chooseMoveTo(sqi);
      if (!handled && el) setTransform(el, fromSq); // snap back
    } else if (el) {
      setTransform(el, fromSq); // a tap: selection already set, keep piece on its square
    }
  }

  boardEl.addEventListener('pointerdown', onDown);
  boardEl.addEventListener('pointermove', onMove);
  boardEl.addEventListener('pointerup', onUp);
  boardEl.addEventListener('pointercancel', onUp);

  function showPromotion(promos) {
    pendingPromo = promos;
    promoChoices.innerHTML = '';
    const seen = new Set();
    for (const m of promos) {
      if (seen.has(m.promo)) continue;
      seen.add(m.promo);
      const btn = document.createElement('button');
      btn.className = 'promo-btn';
      btn.innerHTML = `<img src="${pieceSrc(m.promo)}" alt="">`;
      btn.title = { q: 'Queen', r: 'Rook', b: 'Bishop', n: 'Knight', Q: 'Queen', R: 'Rook', B: 'Bishop', N: 'Knight' }[m.promo];
      btn.addEventListener('click', () => { promoEl.classList.remove('show'); pendingPromo = null; applyMove(m); });
      promoChoices.appendChild(btn);
    }
    promoEl.classList.add('show');
  }

  // ---- new game / controls ----
  function newGame() {
    state = E.newGame();
    selected = null; legalForSelected = []; pendingPromo = null; aiThinking = false; gameOver = false;
    captured = { w: [], b: [] };
    playedMoves = []; viewPly = 0; reviewing = false; gameResultStr = '*';
    overEl.classList.remove('show');
    promoEl.classList.remove('show');
    reviewBarEl.hidden = true;
    analysisOutEl.hidden = true;
    hintSquares = null;
    buildSquares();
    syncFromState();
    updateHighlights();
    renderCaptured();
    updateMoveList();
    updateEval();
    setStatus(state.turn === playerColor ? 'Your move.' : 'AI is thinking…');
    if (state.turn !== playerColor) scheduleAI();
  }

  // Rebuild the live game from the first n recorded moves (used by undo).
  function rebuildLiveTo(n) {
    state = E.newGame();
    captured = { w: [], b: [] };
    for (let i = 0; i < n; i++) {
      const m = playedMoves[i].move;
      if (m.capture) captured[E.colorOf(m.piece)].push(m.capture);
      E.makeMove(state, m);
    }
    gameOver = false; gameResultStr = '*'; reviewing = false; viewPly = n;
    selected = null; legalForSelected = []; pendingPromo = null;
    overEl.classList.remove('show'); promoEl.classList.remove('show'); reviewBarEl.hidden = true;
    analysisOutEl.hidden = true; hintSquares = null;
    placePiecesFrom(state.board);
    updateHighlights();
    renderCaptured();
    updateMoveList();
    updateEval();
    setStatus(state.turn === playerColor ? 'Your move.' : 'AI is thinking…');
    if (state.turn !== playerColor) scheduleAI();
  }

  // Take back to before the human's most recent move.
  function undo() {
    if (aiThinking || playedMoves.length === 0) return;
    do { playedMoves.pop(); } while (playedMoves.length > 0 && stateAfter(playedMoves.length).turn !== playerColor);
    rebuildLiveTo(playedMoves.length);
  }

  function flashBtn(btn, txt) {
    const orig = btn.dataset.label || btn.textContent;
    btn.dataset.label = orig;
    btn.textContent = txt;
    setTimeout(() => { btn.textContent = btn.dataset.label; }, 1100);
  }
  function copyText(text, btn, okMsg) {
    const done = () => flashBtn(btn, okMsg);
    const fail = () => flashBtn(btn, 'Copy failed');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(fail);
    } else {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (_) { fail(); }
      ta.remove();
    }
  }

  newGameBtn.addEventListener('click', newGame);
  overBtn.addEventListener('click', newGame);
  undoBtn.addEventListener('click', undo);
  toLiveBtn.addEventListener('click', () => reviewTo(playedMoves.length));
  movelistEl.addEventListener('click', (e) => {
    const mv = e.target.closest('.mv');
    if (!mv) return;
    reviewTo(parseInt(mv.dataset.ply, 10) + 1);
  });
  copyPgnBtn.addEventListener('click', () => {
    const sans = playedMoves.map(p => p.san);
    const human = 'You', cpu = 'Computer (' + difficulty + ')';
    const pgn = ChessNotation.toPGN(sans, gameResultStr, playerColor === 'w' ? human : cpu, playerColor === 'w' ? cpu : human);
    copyText(pgn, copyPgnBtn, 'Copied!');
  });
  copyFenBtn.addEventListener('click', () => {
    const s = reviewing ? stateAfter(viewPly) : state;
    copyText(ChessNotation.toFEN(s), copyFenBtn, 'Copied!');
  });
  resignBtn.addEventListener('click', () => { if (gameOver) return; gameResultStr = playerColor === 'w' ? '0-1' : '1-0'; recordLoss(); sound('lose'); showOver('Resigned', 'You resigned. Streak reset.'); });
  flipBtn.addEventListener('click', () => {
    playerColor = playerColor === 'w' ? 'b' : 'w';
    orientation = playerColor;
    localStorage.setItem(KEY_PLAYER, playerColor);
    newGame();
  });
  flipBoardBtn.addEventListener('click', () => {
    clearHint();
    orientation = orientation === 'w' ? 'b' : 'w';
    buildSquares();
    if (reviewing) { const s = stateAfter(viewPly); placePiecesFrom(s.board); setReviewHighlights(s); }
    else { placePiecesFrom(state.board); updateHighlights(); }
    renderCaptured();
    updateEval();
  });
  diffEl.addEventListener('change', () => { difficulty = diffEl.value; localStorage.setItem(KEY_DIFF, difficulty); });
  boardThemeSel.addEventListener('change', () => { boardTheme = boardThemeSel.value; localStorage.setItem(KEY_BOARD, boardTheme); applyTheme(boardTheme); });
  pieceSetSel.addEventListener('change', () => { pieceSet = pieceSetSel.value; localStorage.setItem(KEY_PIECES, pieceSet); syncFromState(); renderCaptured(); });
  soundSel.addEventListener('change', () => { soundOn = soundSel.value === 'on'; localStorage.setItem(KEY_SOUND, soundOn ? 'on' : 'off'); if (window.ChessSound) ChessSound.setEnabled(soundOn); });
  analysisSel.addEventListener('change', () => {
    analysisOn = analysisSel.value === 'on';
    localStorage.setItem(KEY_ANALYSIS, analysisOn ? 'on' : 'off');
    if (!analysisOn) clearHint();
    updateEval();
  });
  hintBtn.addEventListener('click', showHint);
  reviewBtn.addEventListener('click', reviewGame);

  // init persisted UI choices
  boardThemeSel.value = boardTheme;
  pieceSetSel.value = pieceSet;
  soundSel.value = soundOn ? 'on' : 'off';
  analysisSel.value = analysisOn ? 'on' : 'off';
  if (window.ChessSound) ChessSound.setEnabled(soundOn);
  applyTheme(boardTheme);
  refreshStats();
  newGame();
})();
