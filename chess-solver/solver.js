// Chess AI Solver v3 for cardgames.io/chess
// Uses DOM click simulation for proper turn management.
// Inject via browser console or bookmarklet.

(function () {
  'use strict';

  if (typeof game === 'undefined' || !game.table) {
    alert('Chess AI: No game object found. Are you on cardgames.io/chess?');
    return;
  }

  if (window.__chessAI) {
    window.__chessAI.panel.remove();
    if (window.__chessAI.timer) clearTimeout(window.__chessAI.timer);
    delete window.__chessAI;
  }

  // ========== CONSTANTS ==========
  const WHITE = 0, BLACK = 1;
  const PAWN = 0, ROOK = 1, KNIGHT = 2, BISHOP = 3, QUEEN = 4, KING = 5;
  const PV = [100, 500, 320, 330, 900, 20000];

  const PST = [
    // PAWN
    [0,0,0,0,0,0,0,0,50,50,50,50,50,50,50,50,10,10,20,30,30,20,10,10,5,5,10,25,25,10,5,5,0,0,0,20,20,0,0,0,5,-5,-10,0,0,-10,-5,5,5,10,10,-20,-20,10,10,5,0,0,0,0,0,0,0,0],
    // ROOK
    [0,0,0,0,0,0,0,0,5,10,10,10,10,10,10,5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,0,0,0,5,5,0,0,0],
    // KNIGHT
    [-50,-40,-30,-30,-30,-30,-40,-50,-40,-20,0,0,0,0,-20,-40,-30,0,10,15,15,10,0,-30,-30,5,15,20,20,15,5,-30,-30,0,15,20,20,15,0,-30,-30,5,10,15,15,10,5,-30,-40,-20,0,5,5,0,-20,-40,-50,-40,-30,-30,-30,-30,-40,-50],
    // BISHOP
    [-20,-10,-10,-10,-10,-10,-10,-20,-10,0,0,0,0,0,0,-10,-10,0,10,10,10,10,0,-10,-10,5,5,10,10,5,5,-10,-10,0,10,10,10,10,0,-10,-10,10,10,10,10,10,10,-10,-10,5,0,0,0,0,5,-10,-20,-10,-10,-10,-10,-10,-10,-20],
    // QUEEN
    [-20,-10,-10,-5,-5,-10,-10,-20,-10,0,0,0,0,0,0,-10,-10,0,5,5,5,5,0,-10,-5,0,5,5,5,5,0,-5,0,0,5,5,5,5,0,-5,-10,5,5,5,5,5,0,-10,-10,0,5,0,0,0,0,-10,-20,-10,-10,-5,-5,-10,-10,-20],
    // KING middlegame
    [-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-20,-30,-30,-40,-40,-30,-30,-20,-10,-20,-20,-20,-20,-20,-20,-10,20,20,0,0,0,0,20,20,20,30,10,0,0,10,30,20]
  ];
  const KE = [-50,-40,-30,-20,-20,-30,-40,-50,-30,-20,-10,0,0,-10,-20,-30,-30,-10,20,30,30,20,-10,-30,-30,-10,30,40,40,30,-10,-30,-30,-10,30,40,40,30,-10,-30,-30,-10,20,30,30,20,-10,-30,-30,-30,0,0,0,0,-30,-30,-50,-30,-30,-30,-30,-30,-30,-50];

  // ========== EVALUATION ==========
  function evalT(t) {
    let s = 0, wm = 0, bm = 0, wb = 0, bb = 0;
    const pc = t.allPieces;
    for (let i = 0; i < pc.length; i++) {
      const p = pc[i]; if (p.rank < 1) continue;
      const v = PV[p.name];
      if (p.color === 0) { wm += v; if (p.name === 3) wb++; }
      else { bm += v; if (p.name === 3) bb++; }
    }
    const eg = (wm + bm) < 26000;
    for (let i = 0; i < pc.length; i++) {
      const p = pc[i]; if (p.rank < 1) continue;
      const v = PV[p.name];
      const idx = p.color === 0 ? (8 - p.rank) * 8 + (p.file - 1) : (p.rank - 1) * 8 + (p.file - 1);
      const pt = p.name === 5 ? (eg ? KE : PST[5]) : PST[p.name];
      if (p.color === 0) s += v + pt[idx]; else s -= v + pt[idx];
    }
    if (wb >= 2) s += 30; if (bb >= 2) s -= 30;
    return s;
  }

  // ========== SEARCH ==========
  let N = 0, DL = 0, AB = false;

  function ms(m) {
    return (m.mate ? 100000 : 0) + (m.kills ? 10000 : 0) + (m.check ? 5000 : 0) + (m.promotion ? 8000 : 0);
  }

  function sm(moves) {
    for (let i = 1; i < moves.length; i++) {
      const m = moves[i], v = ms(m);
      let j = i - 1;
      while (j >= 0 && ms(moves[j]) < v) { moves[j + 1] = moves[j]; j--; }
      moves[j + 1] = m;
    }
  }

  function ab(t, d, a, b, mx) {
    N++;
    if ((N & 4095) === 0 && performance.now() > DL) { AB = true; return { score: evalT(t) }; }
    if (d === 0) return qs(t, a, b, mx, 4);
    const c = mx ? 0 : 1;
    let mv;
    try { mv = t.fasterAllLegalMoves(c); } catch (e) { try { mv = t.allLegalMoves(c); } catch (e2) { mv = null; } }
    if (!mv || mv.length === 0) {
      try { if (t.check(c)) return { score: mx ? -99999 + (100 - d) : 99999 - (100 - d) }; } catch (e) {}
      return { score: 0 };
    }
    sm(mv);
    let bst = mv[0];
    if (mx) {
      let ev = -Infinity;
      for (let i = 0; i < mv.length; i++) {
        if (AB) break;
        const r = ab(t.getNextTable(mv[i]), d - 1, a, b, false);
        if (r.score > ev) { ev = r.score; bst = mv[i]; }
        if (ev > a) a = ev; if (a >= b) break;
      }
      return { score: ev, move: bst };
    } else {
      let ev = Infinity;
      for (let i = 0; i < mv.length; i++) {
        if (AB) break;
        const r = ab(t.getNextTable(mv[i]), d - 1, a, b, true);
        if (r.score < ev) { ev = r.score; bst = mv[i]; }
        if (ev < b) b = ev; if (a >= b) break;
      }
      return { score: ev, move: bst };
    }
  }

  function qs(t, a, b, mx, md) {
    N++;
    const sp = evalT(t);
    if (md <= 0) return { score: sp };
    if (mx) { if (sp >= b) return { score: b }; if (sp > a) a = sp; }
    else { if (sp <= a) return { score: a }; if (sp < b) b = sp; }
    const c = mx ? 0 : 1;
    let mv;
    try { mv = t.fasterAllLegalMoves(c); } catch (e) { try { mv = t.allLegalMoves(c); } catch (e2) { return { score: sp }; } }
    if (!mv || mv.length === 0) {
      try { if (t.check(c)) return { score: mx ? -99999 : 99999 }; } catch (e) {}
      return { score: sp };
    }
    const tc = mv.filter(m => m.kills || m.check || m.promotion);
    if (tc.length === 0) return { score: sp };
    sm(tc);
    if (mx) {
      let bs = sp;
      for (const m of tc) { if (AB) break; const r = qs(t.getNextTable(m), a, b, false, md - 1); if (r.score > bs) bs = r.score; if (bs > a) a = bs; if (a >= b) break; }
      return { score: bs };
    } else {
      let bs = sp;
      for (const m of tc) { if (AB) break; const r = qs(t.getNextTable(m), a, b, true, md - 1); if (r.score < bs) bs = r.score; if (bs < b) b = bs; if (a >= b) break; }
      return { score: bs };
    }
  }

  function findBest(tl) {
    N = 0; AB = false; DL = performance.now() + tl;
    const t = game.table, mx = (game.getCurrentPlayerColor() === 0);
    let br = null, cd = 0;
    const t0 = performance.now();
    for (let d = 1; d <= 8; d++) {
      AB = false;
      const r = ab(t, d, -Infinity, Infinity, mx);
      if (!AB) { br = r; cd = d; if (Math.abs(r.score) > 90000) break; } else break;
      if (performance.now() - t0 > tl * 0.6) break;
    }
    return { move: br ? br.move : null, score: br ? br.score : 0, nodes: N, time: ((performance.now() - t0) / 1000).toFixed(2), depth: cd };
  }

  // ========== DOM MOVE EXECUTION ==========
  // Uses click simulation to properly trigger game turn management.

  // Derive full 8x8 board grid from a single piece anchor + square size.
  function getBoardGeometry() {
    // Find two pieces on different ranks to determine square size + orientation
    let anchor = null, other = null;
    for (const [sq, p] of Object.entries(game.table.Pieces)) {
      if (!p || p.rank < 1 || !p.guiPiece) continue;
      const dom = p.guiPiece[0] || p.guiPiece;
      const rect = dom.getBoundingClientRect();
      if (rect.width < 10) continue; // skip invisible
      const info = { file: p.file, rank: p.rank, cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2, size: rect.width };
      if (!anchor) { anchor = info; continue; }
      if (info.rank !== anchor.rank) { other = info; break; }
    }
    if (!anchor) return null;

    const sz = anchor.size; // square size in pixels
    // Determine file direction: find another piece on a different file
    let fileDir = 1; // +1 = file increases rightward
    for (const [sq, p] of Object.entries(game.table.Pieces)) {
      if (!p || p.rank < 1 || !p.guiPiece || p.file === anchor.file) continue;
      const dom = p.guiPiece[0] || p.guiPiece;
      const rect = dom.getBoundingClientRect();
      if (rect.width < 10) continue;
      fileDir = (rect.left + rect.width / 2 - anchor.cx) > 0 === (p.file - anchor.file) > 0 ? 1 : -1;
      break;
    }
    // Determine rank direction from the two pieces on different ranks
    let rankDir = -1; // default: rank increases upward (y decreases)
    if (other) {
      rankDir = (other.cy - anchor.cy) > 0 === (other.rank - anchor.rank) > 0 ? 1 : -1;
    }

    return {
      // Convert board (file, rank) to pixel center
      centerOf(file, rank) {
        return {
          x: anchor.cx + (file - anchor.file) * sz * fileDir,
          y: anchor.cy + (rank - anchor.rank) * sz * rankDir
        };
      },
      // Convert pixel position to board (file, rank) via grid-snap
      squareOf(px, py) {
        const f = Math.round((px - anchor.cx) / (sz * fileDir) + anchor.file);
        const r = Math.round((py - anchor.cy) / (sz * rankDir) + anchor.rank);
        return { file: Math.max(1, Math.min(8, f)), rank: Math.max(1, Math.min(8, r)) };
      }
    };
  }

  function deselectPiece() {
    const board = document.querySelector('#board-and-header') || document.body;
    board.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: 50, clientY: 50 }));
  }

  function executeMove(move) {
    return new Promise((resolve) => {
      const fenBefore = game.table.toFen();

      // Step 1: Find the piece to click
      const color = game.getCurrentPlayerColor();
      let sourcePiece = null;
      for (const [sq, p] of Object.entries(game.table.Pieces)) {
        if (!p || p.color !== color) continue;
        if (p.file === move.fromFile && p.rank === move.fromRank) {
          sourcePiece = p;
          break;
        }
      }
      if (!sourcePiece || !sourcePiece.guiPiece) { resolve(false); return; }

      // Step 2: Select the piece via mousedown
      const pieceDom = sourcePiece.guiPiece[0] || sourcePiece.guiPiece;
      pieceDom.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));

      // Step 3: Poll for highlights (up to 500ms), then match by board square
      const geo = getBoardGeometry();
      if (!geo) { deselectPiece(); resolve(false); return; }

      let pollCount = 0;
      const pollForHighlights = () => {
        pollCount++;
        const highlights = document.querySelectorAll('.highlight');

        if (highlights.length > 0) {
          // Map each highlight to a board square and find our target
          let targetHL = null;
          for (const h of highlights) {
            const rect = h.getBoundingClientRect();
            const sq = geo.squareOf(rect.left + rect.width / 2, rect.top + rect.height / 2);
            if (sq.file === move.toFile && sq.rank === move.toRank) {
              targetHL = h;
              break;
            }
          }

          if (targetHL) {
            jQuery(targetHL).trigger('click');
            // Step 4: Verify the board actually changed
            let verifyCount = 0;
            const verifyMove = () => {
              verifyCount++;
              if (game.table.toFen() !== fenBefore) {
                resolve(true); // Board changed — move succeeded
              } else if (verifyCount < 6) {
                setTimeout(verifyMove, 50);
              } else {
                deselectPiece();
                resolve(false); // Board didn't change — move failed
              }
            };
            setTimeout(verifyMove, 50);
          } else {
            // No highlight matched our target square
            deselectPiece();
            resolve(false);
          }
        } else if (pollCount < 10) {
          setTimeout(pollForHighlights, 50); // Keep polling
        } else {
          // No highlights appeared after 500ms
          deselectPiece();
          resolve(false);
        }
      };
      setTimeout(pollForHighlights, 50);
    });
  }

  // ========== UI ==========
  function fl(f) { return 'abcdefgh'[f - 1] || '?'; }
  function fmt(m) { return fl(m.fromFile) + m.fromRank + (m.kills ? 'x' : '-') + fl(m.toFile) + m.toRank; }
  function si(h) { document.getElementById('ai-info').innerHTML = h; }

  const moveHistory = [];
  let moveNumber = 1;
  let wasHumanTurn = false;
  let lastLoggedFen = '';

  function addToTimeline(moveStr, eval_, depth, time, isAI) {
    // Guard: don't add duplicate AI entries with same moveStr back-to-back
    if (isAI && moveHistory.length > 0) {
      const last = moveHistory[moveHistory.length - 1];
      if (last.isAI && last.moveStr === moveStr) return;
    }
    moveHistory.push({ moveStr, eval: eval_, depth, time, isAI, moveNum: moveNumber });
    if (isAI) moveNumber++;
    lastLoggedFen = game.table.toFen();
    renderTimeline();
  }

  function checkOpponentMove() {
    const isHuman = game.humanTurn();
    if (isHuman && !wasHumanTurn) {
      const currentFen = game.table.toFen();
      // Only log if: last entry was AI (strict alternation) AND FEN actually changed
      const lastEntry = moveHistory.length > 0 ? moveHistory[moveHistory.length - 1] : null;
      if ((!lastEntry || lastEntry.isAI) && currentFen !== lastLoggedFen) {
        const lastMove = game.getLastMove ? game.getLastMove() : null;
        if (lastMove) {
          const oppStr = fl(lastMove.fromFile) + lastMove.fromRank +
            (lastMove.kills ? 'x' : '-') + fl(lastMove.toFile) + lastMove.toRank;
          moveHistory.push({ moveStr: oppStr, eval: null, depth: null, time: null, isAI: false, moveNum: moveNumber });
          lastLoggedFen = currentFen;
          renderTimeline();
        }
      }
    }
    wasHumanTurn = isHuman;
  }

  // Convert raw eval to a human-readable label + color
  function evalLabel(evStr) {
    if (evStr === null) return { text: '', color: '#888' };
    const v = parseFloat(evStr);
    if (v >= 9) return { text: 'Winning!', color: '#16c79a' };
    if (v >= 3) return { text: 'Big lead', color: '#16c79a' };
    if (v >= 1) return { text: 'Ahead', color: '#4ade80' };
    if (v >= 0.3) return { text: 'Slight edge', color: '#86efac' };
    if (v > -0.3) return { text: 'Even', color: '#888' };
    if (v > -1) return { text: 'Slight trouble', color: '#fca5a5' };
    if (v > -3) return { text: 'Behind', color: '#f87171' };
    if (v > -9) return { text: 'Big trouble', color: '#e94560' };
    return { text: 'Losing!', color: '#e94560' };
  }

  function renderTimeline() {
    const tl = document.getElementById('ai-timeline');
    if (!tl) return;

    let html = '';
    for (let i = moveHistory.length - 1; i >= Math.max(0, moveHistory.length - 20); i--) {
      const m = moveHistory[i];
      const label = evalLabel(m.eval);
      const timeStr = m.time !== null ? m.time + 's' : '';
      const icon = m.isAI ? '<span style="color:#e94560">AI</span>' : '<span style="color:#888">OPP</span>';

      html += `<div class="tl-row${i === moveHistory.length - 1 ? ' tl-latest' : ''}">
        <div class="tl-num">${m.moveNum}.</div>
        <div class="tl-who">${icon}</div>
        <div class="tl-move"><b>${m.moveStr}</b></div>
        <div class="tl-eval" style="color:${label.color}">${label.text}</div>
        <div class="tl-meta">${timeStr}</div>
      </div>`;
    }
    tl.innerHTML = html || '<div class="tl-empty">No moves yet</div>';
    tl.scrollTop = 0;
  }

  function getStatusLine() {
    if (game.finished) return '<span style="color:#e94560;font-weight:bold">GAME OVER</span>';
    try {
      if (game.humanTurn()) return '<span style="color:#16c79a">Your turn — AI thinking...</span>';
      else return '<span style="color:#888">Opponent thinking...</span>';
    } catch (e) {
      return '<span style="color:#888">Waiting...</span>';
    }
  }

  const panel = document.createElement('div');
  panel.id = 'chess-ai-panel';
  panel.innerHTML = `
    <style>
      #chess-ai-panel { position:fixed;top:10px;right:10px;z-index:99999;background:#1a1a2e;color:#eee;border-radius:12px;padding:16px;width:280px;font-family:system-ui,sans-serif;box-shadow:0 4px 24px rgba(0,0,0,0.5);font-size:14px;user-select:none }
      #chess-ai-panel h3 { margin:0 0 10px;font-size:16px;color:#e94560;text-align:center;letter-spacing:1px;cursor:grab }
      #chess-ai-panel button { width:100%;padding:10px;margin:3px 0;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600 }
      #chess-ai-panel .bm { background:#e94560;color:#fff } #chess-ai-panel .bm:disabled { background:#555;cursor:wait }
      #chess-ai-panel .ba { background:#0f3460;color:#fff } #chess-ai-panel .ba.active { background:#16c79a;color:#1a1a2e }
      #chess-ai-panel .dr { display:flex;align-items:center;gap:8px;margin:8px 0 4px }
      #chess-ai-panel .dr label { flex-shrink:0;font-size:13px } #chess-ai-panel .dr input { flex:1 }
      #chess-ai-panel .dr span { width:30px;text-align:center;font-size:13px }
      #chess-ai-panel .nfo { margin-top:8px;padding:6px 8px;background:rgba(255,255,255,.05);border-radius:6px;font-size:12px;line-height:1.5;min-height:20px }
      #chess-ai-panel .nfo .l { color:#888 }
      #chess-ai-panel .status { text-align:center;font-size:12px;margin:6px 0;min-height:16px }
      #chess-ai-panel .tl-wrap { margin-top:8px }
      #chess-ai-panel .tl-label { font-size:11px;color:#666;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px }
      #chess-ai-panel .tl {
        max-height:200px;overflow-y:auto;background:rgba(0,0,0,.2);border-radius:6px;padding:4px;
        scrollbar-width:thin;scrollbar-color:#333 transparent
      }
      #chess-ai-panel .tl::-webkit-scrollbar { width:4px }
      #chess-ai-panel .tl::-webkit-scrollbar-thumb { background:#444;border-radius:2px }
      #chess-ai-panel .tl-row { display:grid;grid-template-columns:24px 26px 50px 1fr 40px;align-items:center;gap:2px;padding:3px 4px;font-size:11px;border-bottom:1px solid rgba(255,255,255,.03) }
      #chess-ai-panel .tl-latest { background:rgba(233,69,96,.1);border-radius:4px }
      #chess-ai-panel .tl-num { color:#555;font-size:10px }
      #chess-ai-panel .tl-who { font-size:9px;font-weight:700 }
      #chess-ai-panel .tl-move { color:#eee }
      #chess-ai-panel .tl-eval { color:#aaa;font-size:10px;text-align:right }
      #chess-ai-panel .tl-bar { height:4px;background:#222;border-radius:2px;overflow:hidden }
      #chess-ai-panel .tl-bar-fill { height:100%;border-radius:2px;transition:width .3s }
      #chess-ai-panel .tl-meta { color:#555;font-size:9px;text-align:right }
      #chess-ai-panel .tl-empty { color:#555;text-align:center;padding:8px;font-size:11px }
    </style>
    <h3>CHESS AI</h3>
    <button class="bm" id="ai-move-btn">AI Move</button>
    <button class="ba" id="ai-auto-btn">Auto-Play: OFF</button>
    <div class="dr">
      <label>Time:</label>
      <input type="range" id="ai-time" min="1" max="15" value="5">
      <span id="ai-time-val">5s</span>
    </div>
    <div class="status" id="ai-status"></div>
    <div class="nfo" id="ai-info"><span class="l">Ready. Click Auto-Play to start!</span></div>
    <div class="tl-wrap">
      <div class="tl-label">Move Timeline</div>
      <div class="tl" id="ai-timeline"><div class="tl-empty">No moves yet</div></div>
    </div>
  `;
  document.body.appendChild(panel);

  // Draggable
  let drag = false, ox, oy;
  panel.querySelector('h3').addEventListener('mousedown', e => { drag = true; ox = e.clientX - panel.getBoundingClientRect().left; oy = e.clientY - panel.getBoundingClientRect().top; });
  document.addEventListener('mousemove', e => { if (!drag) return; panel.style.left = (e.clientX - ox) + 'px'; panel.style.top = (e.clientY - oy) + 'px'; panel.style.right = 'auto'; });
  document.addEventListener('mouseup', () => { drag = false; });
  document.getElementById('ai-time').addEventListener('input', e => { document.getElementById('ai-time-val').textContent = e.target.value + 's'; });

  // ========== GAME LOGIC ==========
  let autoPlay = false, autoTimer = null;

  function updateStatus() {
    const el = document.getElementById('ai-status');
    if (el) el.innerHTML = getStatusLine();
  }

  // Poll for turn transitions and status updates
  setInterval(() => {
    checkOpponentMove(); // only logs on actual turn transition (wasHumanTurn flag)
    updateStatus();
  }, 500);

  function doAIMove() {
    if (game.finished) {
      si('<span class="l">Game over!</span>');
      updateStatus();
      stopAuto();
      return Promise.resolve(false);
    }
    let h; try { h = game.humanTurn(); } catch (e) { return Promise.resolve(false); }
    if (!h) { si('<span class="l">Waiting for opponent...</span>'); updateStatus(); return Promise.resolve(false); }

    const tl = parseInt(document.getElementById('ai-time').value) * 1000;
    const btn = document.getElementById('ai-move-btn');
    btn.disabled = true; btn.textContent = 'Thinking...';
    si('<span class="l">Searching...</span>');
    updateStatus();

    return new Promise(resolve => {
      setTimeout(() => {
        try {
          const r = findBest(tl);
          btn.disabled = false; btn.textContent = 'AI Move';

          if (!r.move) { si('<span class="l">No moves found.</span>'); resolve(false); return; }

          // Show pending status — do NOT show move details until confirmed
          const moveStr = fmt(r.move);
          si('<span class="l">Playing ' + moveStr + '...</span>');

          // Execute the move via DOM clicks
          const ev = (r.score / 100).toFixed(2);
          executeMove(r.move).then(ok => {
            if (ok) {
              // Move confirmed — NOW show details and log to timeline
              const label = evalLabel(ev);
              si(
                '<b>' + moveStr + '</b> &mdash; <span style="color:' + label.color + '">' + label.text + '</span><br>' +
                '<span class="l">Looked ' + r.depth + ' moves ahead in ' + r.time + 's</span>'
              );
              addToTimeline(moveStr, ev, r.depth, r.time, true);
            } else {
              si('<span class="l">Retrying...</span>');
            }
            updateStatus();
            resolve(ok);
          });
        } catch (e) {
          btn.disabled = false; btn.textContent = 'AI Move';
          si('<span class="l">Error: ' + e.message + '</span>');
          console.error('Chess AI:', e);
          resolve(false);
        }
      }, 50);
    });
  }

  function autoLoop() {
    if (!autoPlay) return;
    doAIMove().then(moved => {
      if (autoPlay && !game.finished) autoTimer = setTimeout(autoLoop, moved ? 1500 : 500);
      else if (game.finished) stopAuto();
    });
  }

  function stopAuto() {
    autoPlay = false;
    if (autoTimer) clearTimeout(autoTimer);
    autoTimer = null;
    const btn = document.getElementById('ai-auto-btn');
    if (btn) { btn.textContent = 'Auto-Play: OFF'; btn.classList.remove('active'); }
  }

  document.getElementById('ai-move-btn').addEventListener('click', () => doAIMove());
  document.getElementById('ai-auto-btn').addEventListener('click', () => {
    autoPlay = !autoPlay;
    const btn = document.getElementById('ai-auto-btn');
    if (autoPlay) { btn.textContent = 'Auto-Play: ON'; btn.classList.add('active'); autoLoop(); }
    else stopAuto();
  });

  window.__chessAI = { panel, stopAuto, timer: autoTimer };
  console.log('Chess AI v3 loaded! DOM click execution for proper turn management.');
})();
