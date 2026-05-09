/* eslint-disable */
// Klondike Solitaire — full game state machine.

const { useState, useEffect, useRef, useMemo, useCallback } = React;

// ─── Game logic ───────────────────────────────────────────
const SUITS_ORDER = ['♠','♥','♦','♣'];
const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const RANK_NUM = { A:1, '2':2, '3':3, '4':4, '5':5, '6':6, '7':7, '8':8, '9':9, '10':10, J:11, Q:12, K:13 };

function buildDeck() {
  const deck = [];
  for (const s of SUITS_ORDER) for (const r of RANKS) {
    deck.push({ rank: r, suit: s, id: `${s}-${r}-${Math.random().toString(36).slice(2,6)}`, faceUp: false });
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function dealLayout(deck) {
  const tableau = [[], [], [], [], [], [], []];
  let idx = 0;
  for (let col = 0; col < 7; col++) {
    for (let row = 0; row <= col; row++) {
      const card = { ...deck[idx++], faceUp: row === col };
      tableau[col].push(card);
    }
  }
  const stock = deck.slice(idx).map(c => ({ ...c, faceUp: false }));
  return { tableau, stock };
}

function isRedSuit(suit) { return suit === '♥' || suit === '♦'; }
function isBlackSuit(suit) { return suit === '♠' || suit === '♣'; }
function colorsAlternate(a, b) {
  return (isRedSuit(a) && isBlackSuit(b)) || (isBlackSuit(a) && isRedSuit(b));
}

function canMoveToFoundation(card, pile) {
  if (!card) return false;
  if (pile.length === 0) return card.rank === 'A';
  const top = pile[pile.length - 1];
  return top.suit === card.suit && RANK_NUM[card.rank] === RANK_NUM[top.rank] + 1;
}

function canStackOnTableau(card, destTop, destEmpty) {
  if (destEmpty) return card.rank === 'K';
  if (!destTop || !destTop.faceUp) return false;
  return colorsAlternate(card.suit, destTop.suit) && RANK_NUM[card.rank] === RANK_NUM[destTop.rank] - 1;
}

function topOf(pile) { return pile.length ? pile[pile.length - 1] : null; }

// Returns the cards selected based on a selection descriptor
function selectionCards(state, sel) {
  if (!sel) return [];
  if (sel.source === 'waste') {
    const t = topOf(state.waste);
    return t ? [t] : [];
  }
  if (sel.source === 'foundation') {
    const t = topOf(state.foundations[sel.suit]);
    return t ? [t] : [];
  }
  if (sel.source === 'tableau') {
    return state.tableau[sel.col].slice(sel.idx);
  }
  return [];
}

// After any move, auto-flip top face-down card of a tableau column
function flipTopIfNeeded(tableau) {
  return tableau.map(col => {
    if (col.length === 0) return col;
    const top = col[col.length - 1];
    if (!top.faceUp) {
      const newCol = [...col];
      newCol[newCol.length - 1] = { ...top, faceUp: true };
      return newCol;
    }
    return col;
  });
}

// Try to apply a move with a given destination. Returns null if illegal.
function tryMove(state, sel, dest) {
  const cards = selectionCards(state, sel);
  if (!cards.length) return null;
  const head = cards[0];

  if (dest.kind === 'foundation') {
    if (cards.length !== 1) return null;
    if (!canMoveToFoundation(head, state.foundations[dest.suit])) return null;
    if (head.suit !== dest.suit) return null;
  } else if (dest.kind === 'tableau') {
    const col = state.tableau[dest.col];
    const destEmpty = col.length === 0;
    const destTop = topOf(col);
    if (!canStackOnTableau(head, destTop, destEmpty)) return null;
  } else {
    return null;
  }

  // Apply: remove cards from source
  let nextWaste = state.waste;
  let nextTableau = state.tableau.map(c => [...c]);
  let nextFoundations = { ...state.foundations };
  for (const k of SUITS_ORDER) nextFoundations[k] = [...state.foundations[k]];

  if (sel.source === 'waste') {
    nextWaste = nextWaste.slice(0, -1);
  } else if (sel.source === 'foundation') {
    nextFoundations[sel.suit] = nextFoundations[sel.suit].slice(0, -1);
  } else if (sel.source === 'tableau') {
    nextTableau[sel.col] = nextTableau[sel.col].slice(0, sel.idx);
  }

  // Add to destination
  if (dest.kind === 'foundation') {
    nextFoundations[dest.suit] = [...nextFoundations[dest.suit], { ...cards[0], faceUp: true }];
  } else {
    nextTableau[dest.col] = [...nextTableau[dest.col], ...cards.map(c => ({ ...c, faceUp: true }))];
  }

  // Auto-flip
  nextTableau = flipTopIfNeeded(nextTableau);

  return {
    ...state,
    waste: nextWaste,
    tableau: nextTableau,
    foundations: nextFoundations
  };
}

function isWon(state) {
  return SUITS_ORDER.reduce((s, k) => s + state.foundations[k].length, 0) === 52;
}

function canAutoComplete(state) {
  if (state.stock.length > 0 || state.waste.length > 0) return false;
  for (const col of state.tableau) {
    for (const c of col) if (!c.faceUp) return false;
  }
  return true;
}

// One step of auto-promote: find any card eligible to move to foundation
function autoPromoteOne(state) {
  // Try tableau bottoms first
  for (let col = 0; col < state.tableau.length; col++) {
    const top = topOf(state.tableau[col]);
    if (top && top.faceUp && canMoveToFoundation(top, state.foundations[top.suit])) {
      const sel = { source: 'tableau', col, idx: state.tableau[col].length - 1 };
      const next = tryMove(state, sel, { kind: 'foundation', suit: top.suit });
      if (next) return next;
    }
  }
  // Try waste top
  const wtop = topOf(state.waste);
  if (wtop && canMoveToFoundation(wtop, state.foundations[wtop.suit])) {
    const sel = { source: 'waste' };
    const next = tryMove(state, sel, { kind: 'foundation', suit: wtop.suit });
    if (next) return next;
  }
  return null;
}

function findHint(state) {
  // Priority 1: ace or 2 to foundation
  for (let col = 0; col < state.tableau.length; col++) {
    const top = topOf(state.tableau[col]);
    if (top && top.faceUp && (top.rank === 'A' || top.rank === '2')
        && canMoveToFoundation(top, state.foundations[top.suit])) {
      return { fromIds: [top.id], dest: { kind: 'foundation', suit: top.suit } };
    }
  }
  const wtop = topOf(state.waste);
  if (wtop && (wtop.rank === 'A' || wtop.rank === '2')
      && canMoveToFoundation(wtop, state.foundations[wtop.suit])) {
    return { fromIds: [wtop.id], dest: { kind: 'foundation', suit: wtop.suit } };
  }

  // Priority 2: tableau move that uncovers a face-down
  for (let col = 0; col < state.tableau.length; col++) {
    const colCards = state.tableau[col];
    if (colCards.length < 2) continue;
    let firstFaceUp = -1;
    for (let i = 0; i < colCards.length; i++) {
      if (colCards[i].faceUp) { firstFaceUp = i; break; }
    }
    if (firstFaceUp <= 0) continue;
    const head = colCards[firstFaceUp];
    for (let dest = 0; dest < state.tableau.length; dest++) {
      if (dest === col) continue;
      const destCol = state.tableau[dest];
      if (canStackOnTableau(head, topOf(destCol), destCol.length === 0)) {
        const ids = colCards.slice(firstFaceUp).map(c => c.id);
        return { fromIds: ids, dest: { kind: 'tableau', col: dest } };
      }
    }
  }

  // Priority 3: any other foundation move
  for (let col = 0; col < state.tableau.length; col++) {
    const top = topOf(state.tableau[col]);
    if (top && top.faceUp && canMoveToFoundation(top, state.foundations[top.suit])) {
      return { fromIds: [top.id], dest: { kind: 'foundation', suit: top.suit } };
    }
  }
  if (wtop && canMoveToFoundation(wtop, state.foundations[wtop.suit])) {
    return { fromIds: [wtop.id], dest: { kind: 'foundation', suit: wtop.suit } };
  }

  // Priority 4: waste → tableau
  if (wtop) {
    for (let dest = 0; dest < state.tableau.length; dest++) {
      const destCol = state.tableau[dest];
      if (canStackOnTableau(wtop, topOf(destCol), destCol.length === 0)) {
        return { fromIds: [wtop.id], dest: { kind: 'tableau', col: dest } };
      }
    }
  }

  // Priority 5: King to empty column
  for (let col = 0; col < state.tableau.length; col++) {
    if (state.tableau[col].length !== 0) continue;
    for (let src = 0; src < state.tableau.length; src++) {
      if (src === col) continue;
      const srcCards = state.tableau[src];
      const fu = srcCards.findIndex(c => c.faceUp);
      if (fu <= 0) continue;
      const head = srcCards[fu];
      if (head.rank === 'K') {
        const ids = srcCards.slice(fu).map(c => c.id);
        return { fromIds: ids, dest: { kind: 'tableau', col } };
      }
    }
  }

  // Priority 6: any tableau → tableau move
  for (let src = 0; src < state.tableau.length; src++) {
    const srcCards = state.tableau[src];
    for (let i = 0; i < srcCards.length; i++) {
      if (!srcCards[i].faceUp) continue;
      const head = srcCards[i];
      for (let dest = 0; dest < state.tableau.length; dest++) {
        if (dest === src) continue;
        const destCol = state.tableau[dest];
        if (canStackOnTableau(head, topOf(destCol), destCol.length === 0)) {
          const ids = srcCards.slice(i).map(c => c.id);
          return { fromIds: ids, dest: { kind: 'tableau', col: dest } };
        }
      }
    }
  }

  return null;
}

function hasAnyLegalMove(state) {
  if (state.stock.length > 0) return true;
  if (state.waste.length > 0) return true; // can recycle
  return findHint(state) !== null;
}

// ─── App ──────────────────────────────────────────────────
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "playerName": "Alex",
  "dealerName": "Melissa",
  "drawMode": "one",
  "soundOn": true
}/*EDITMODE-END*/;

const HISTORY_CAP = 60;

function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);

  const [phase, setPhase] = useState('dealing');
  const [tableau, setTableau] = useState(() => Array.from({ length: 7 }, () => []));
  const [foundations, setFoundations] = useState(() => ({ '♠':[], '♥':[], '♦':[], '♣':[] }));
  const [stock, setStock] = useState([]);
  const [waste, setWaste] = useState([]);
  const [selection, setSelection] = useState(null);
  const [history, setHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [moves, setMoves] = useState(0);
  const [score, setScore] = useState(-52);
  const [startTime, setStartTime] = useState(() => Date.now());
  const [passes, setPasses] = useState(0);
  const [hint, setHint] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const [bestScore, setBestScore] = useState(null);
  const [stats, setStats] = useState({ gamesPlayed: 0, gamesWon: 0 });
  const [achievedFirstAce, setAchievedFirstAce] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [showAbandonModal, setShowAbandonModal] = useState(false);
  const [pendingDrawMode, setPendingDrawMode] = useState(null);
  const [shakeOn, setShakeOn] = useState(false);
  const [autoPlaying, setAutoPlaying] = useState(false);
  const autoPlayRef = useRef(null);
  const stateRef = useRef(null);
  const drawingRef = useRef(false);

  // Release the stock-draw guard after every render so the next click can fire.
  useEffect(() => { drawingRef.current = false; });

  // Dealer state
  const [expression, setExpression] = useState('idle');
  const [message, setMessage] = useState('');
  const [tipped, setTipped] = useState(false);
  const [isIdle, setIsIdle] = useState(false);
  const [mood, setMood] = useState(0);
  const idleTimerRef = useRef(null);

  const ctx = { player: tweaks.playerName, dealer: tweaks.dealerName };
  const drawCount = tweaks.drawMode === 'three' ? 3 : 1;

  const dealerGender = tweaks.dealerName === 'Marcus' ? 'male' : 'female';

  function nudgeMood(d) { setMood(m => Math.max(-1, Math.min(1, m + d))); }

  function say(key, expr) {
    setMessage(pickLine(key, ctx));
    if (expr) {
      setExpression(expr);
      const md = expr === 'happy' ? 0.18 : expr === 'shocked' ? 0.10 : (expr === 'sad' || expr === 'bust') ? -0.18 : 0;
      if (md) nudgeMood(md);
    }
  }

  // Mood decay
  useEffect(() => {
    const id = setInterval(() => {
      setMood(m => Math.abs(m) < 0.02 ? 0 : m * 0.94);
    }, 2500);
    return () => clearInterval(id);
  }, []);

  // Tick clock
  useEffect(() => {
    if (phase !== 'playing') return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [phase]);

  // Load best score
  useEffect(() => {
    const raw = localStorage.getItem('solitaireStats');
    if (raw) {
      try {
        const s = JSON.parse(raw);
        if (s) {
          if (typeof s.bestScore === 'number') setBestScore(s.bestScore);
          setStats({ gamesPlayed: s.gamesPlayed || 0, gamesWon: s.gamesWon || 0 });
        }
      } catch (_) {}
    }
  }, []);

  // Player name
  useEffect(() => {
    const stored = window.CASINO_PLAYER.read();
    if (stored) {
      if (stored !== tweaks.playerName) setTweak('playerName', stored);
    } else {
      setShowNameModal(true);
    }
  }, []);

  function savePlayerName(name) {
    const trimmed = window.CASINO_PLAYER.write(name);
    if (!trimmed) return;
    setTweak('playerName', trimmed);
    setShowNameModal(false);
  }

  // Initial deal on mount
  useEffect(() => {
    startNewDeal(/*announce*/ true);
  }, []);

  // Idle timer
  function bumpIdle() {
    setIsIdle(false);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      setIsIdle(true);
      if (phase === 'playing') say('idle_long');
    }, 12000);
  }
  useEffect(() => { bumpIdle(); }, [moves, phase]);
  useEffect(() => () => { if (idleTimerRef.current) clearTimeout(idleTimerRef.current); }, []);

  // Keep a ref to current board state for use inside intervals
  useEffect(() => {
    stateRef.current = { tableau, foundations, stock, waste, score, moves, passes };
  }, [tableau, foundations, stock, waste, score, moves, passes]);

  function snapshot() {
    return { tableau, foundations, stock, waste, score, moves, passes };
  }

  function pushHistory() {
    setHistory(h => {
      const next = [...h, snapshot()];
      if (next.length > HISTORY_CAP) next.shift();
      return next;
    });
    setRedoStack([]);
  }

  function commitState(next) {
    setTableau(next.tableau);
    setFoundations(next.foundations);
    setStock(next.stock != null ? next.stock : stock);
    setWaste(next.waste != null ? next.waste : waste);
    if (next.passes != null) setPasses(next.passes);
  }

  function startNewDeal(announce) {
    if (autoPlayRef.current) { clearInterval(autoPlayRef.current); autoPlayRef.current = null; setAutoPlaying(false); }
    const deck = buildDeck();
    const { tableau: tab, stock: stk } = dealLayout(deck);
    setTableau(tab);
    setFoundations({ '♠':[], '♥':[], '♦':[], '♣':[] });
    setStock(stk);
    setWaste([]);
    setSelection(null);
    setHistory([]);
    setRedoStack([]);
    setMoves(0);
    setScore(-52);
    setStartTime(Date.now());
    setNow(Date.now());
    setPasses(0);
    setHint(null);
    setAchievedFirstAce(false);
    setExpression('deal');
    setPhase('dealing');
    if (window.SFX) SFX.shuffle();

    setTimeout(() => {
      setPhase('playing');
      setExpression('idle');
      if (announce) say('deal_done');
    }, 1500);

    if (announce) say('greet', 'idle');
  }

  function confirmAbandon() {
    setShowAbandonModal(false);
    startNewDeal(false);
    say('new_deal', 'idle');
  }

  function requestNewDeal() {
    if (moves > 0 && phase === 'playing') {
      setShowAbandonModal(true);
    } else {
      startNewDeal(false);
      say('new_deal', 'idle');
    }
  }

  // ─── Move handlers ────────────────────────────────────────
  function attemptMove(sel, dest) {
    const stateNow = { tableau, foundations, stock, waste, score, moves, passes };
    const next = tryMove(stateNow, sel, dest);
    if (!next) {
      if (window.SFX) SFX.illegal();
      setShakeOn(true);
      setTimeout(() => setShakeOn(false), 500);
      return false;
    }
    pushHistory();

    let scoreDelta = 0;
    let ackKey = null;
    let ackExpr = null;

    if (dest.kind === 'foundation') {
      scoreDelta = 5;
      if (window.SFX) SFX.foundation();
      const head = selectionCards(stateNow, sel)[0];
      if (head && head.rank === 'A' && !achievedFirstAce) {
        ackKey = 'foundation_first_ace'; ackExpr = 'happy';
        setAchievedFirstAce(true);
      } else {
        ackKey = 'foundation_progress';
      }
    } else if (dest.kind === 'tableau') {
      if (window.SFX) SFX.tableau();
      const wasEmpty = stateNow.tableau[dest.col].length === 0;
      const head = selectionCards(stateNow, sel)[0];
      if (wasEmpty && head && head.rank === 'K') {
        ackKey = 'king_to_empty'; ackExpr = 'happy';
      }
      // Did the source column just empty out (and produce an empty column)?
      if (sel.source === 'tableau') {
        if (next.tableau[sel.col].length === 0 && stateNow.tableau[sel.col].length > 0) {
          ackKey = 'column_cleared'; ackExpr = 'happy';
        }
      }
    }

    setTableau(next.tableau);
    setFoundations(next.foundations);
    setWaste(next.waste);
    setStock(next.stock);
    setSelection(null);
    setMoves(m => m + 1);
    if (scoreDelta) setScore(s => s + scoreDelta);

    if (ackKey) say(ackKey, ackExpr);
    setHint(null);

    // Win check
    setTimeout(() => {
      if (isWon(next)) {
        finishWin(next);
      }
    }, 50);
    return true;
  }

  function finishWin(state) {
    setPhase('won');
    setExpression('happy');
    say('win', 'happy');
    if (window.SFX) SFX.cascade();
    nudgeMood(0.4);
    // Bonus: + (60 - elapsedSec*0.1) capped, + 100 for win
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const bonus = Math.max(0, 200 - Math.floor(elapsed * 0.5));
    const finalScore = score + bonus;
    setScore(finalScore);
    persistResult(finalScore, elapsed, true);
  }

  function persistResult(finalScore, elapsedSec, won) {
    let nextStats;
    setStats(s => {
      nextStats = {
        gamesPlayed: s.gamesPlayed + 1,
        gamesWon: s.gamesWon + (won ? 1 : 0)
      };
      return nextStats;
    });
    let nextBest = bestScore;
    if (won && (bestScore == null || finalScore > bestScore)) {
      nextBest = finalScore;
      setBestScore(nextBest);
    }
    setTimeout(() => {
      try {
        localStorage.setItem('solitaireStats', JSON.stringify({
          bestScore: nextBest,
          ...nextStats
        }));
      } catch (_) {}
    }, 0);
    if (window.CASINO_STATS) {
      window.CASINO_STATS.recordEvent('solitaire', { won, payout: 0 });
    }
  }

  function onTableauClick(col, idx, card) {
    if (phase !== 'playing') return;
    if (!card.faceUp) {
      // Click face-down card: only useful if it's the current top — auto-flip already handles.
      if (selection) attemptMove(selection, { kind: 'tableau', col });
      return;
    }
    // Have a selection
    if (selection) {
      const sameCard = selection.source === 'tableau' && selection.col === col && selection.idx === idx;
      if (sameCard) { setSelection(null); return; }
      // Try moving to this column (placing on its top regardless of clicked idx)
      const moved = attemptMove(selection, { kind: 'tableau', col });
      if (!moved) {
        // Re-select clicked card
        setSelection({ source: 'tableau', col, idx });
      }
      return;
    }
    setSelection({ source: 'tableau', col, idx });
  }

  // Double-click a face-up tableau top → send to foundation if it fits there.
  function onTableauDblClick(col, idx, card) {
    if (phase !== 'playing') return;
    if (!card.faceUp) return;
    if (idx !== tableau[col].length - 1) return;
    if (!canMoveToFoundation(card, foundations[card.suit])) return;
    attemptMove({ source: 'tableau', col, idx }, { kind: 'foundation', suit: card.suit });
  }

  function onTableauEmptyClick(col) {
    if (phase !== 'playing') return;
    if (selection) {
      attemptMove(selection, { kind: 'tableau', col });
    }
  }

  function onWasteClick() {
    if (phase !== 'playing') return;
    if (selection && selection.source === 'waste') { setSelection(null); return; }
    if (selection) {
      // Selecting waste with an existing non-waste selection = clear it
      setSelection(null);
      return;
    }
    if (waste.length === 0) return;
    setSelection({ source: 'waste' });
  }

  // Double-click waste top → send to foundation if it fits there.
  function onWasteDblClick() {
    if (phase !== 'playing') return;
    const top = topOf(waste);
    if (!top) return;
    if (!canMoveToFoundation(top, foundations[top.suit])) return;
    attemptMove({ source: 'waste' }, { kind: 'foundation', suit: top.suit });
  }

  function onFoundationClick(suit) {
    if (phase !== 'playing') return;
    if (selection) {
      attemptMove(selection, { kind: 'foundation', suit });
      return;
    }
    // Auto-promote tableau top of this suit if eligible (helpful click)
    // (kept off for simplicity; double-clicking handled elsewhere)
  }

  function onStockClick() {
    if (phase !== 'playing') return;
    // Block re-entry until React commits the resulting state. Without this, a
    // second click that fires before the next render reads stale stock/waste
    // from closure and ends up duplicating the same card into waste.
    if (drawingRef.current) return;
    drawingRef.current = true;

    setSelection(null);
    if (stock.length === 0) {
      if (waste.length === 0) return;
      // Recycle
      pushHistory();
      const recycled = waste.slice().reverse().map(c => ({ ...c, faceUp: false }));
      setStock(recycled);
      setWaste([]);
      const newPasses = passes + 1;
      setPasses(newPasses);
      if (newPasses > 1) setScore(s => s - 5);
      if (window.SFX) SFX.shuffle();
      say('stock_cycle');
      return;
    }
    pushHistory();
    const n = Math.min(drawCount, stock.length);
    const drawn = stock.slice(-n).map(c => ({ ...c, faceUp: true })).reverse();
    setStock(stock.slice(0, -n));
    setWaste([...waste, ...drawn]);
    if (window.SFX) SFX.card();
  }

  function doUndo() {
    if (history.length === 0) return;
    if (autoPlayRef.current) return;
    const prev = history[history.length - 1];
    setRedoStack(r => [...r, snapshot()]);
    setHistory(h => h.slice(0, -1));
    setTableau(prev.tableau);
    setFoundations(prev.foundations);
    setStock(prev.stock);
    setWaste(prev.waste);
    setMoves(prev.moves);
    setScore(prev.score - 5);
    setPasses(prev.passes);
    setSelection(null);
    setHint(null);
    if (window.SFX) SFX.undo();
    say('undo_used');
  }

  function doRedo() {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setHistory(h => [...h, snapshot()]);
    setRedoStack(r => r.slice(0, -1));
    setTableau(next.tableau);
    setFoundations(next.foundations);
    setStock(next.stock);
    setWaste(next.waste);
    setMoves(next.moves);
    setScore(next.score);
    setPasses(next.passes);
    setSelection(null);
    if (window.SFX) SFX.card();
  }

  function doHint() {
    if (phase !== 'playing') return;
    const stateNow = { tableau, foundations, stock, waste };
    const h = findHint(stateNow);
    if (h) {
      setHint(h);
      say('hint_offered');
      if (window.SFX) SFX.hint();
      setTimeout(() => setHint(null), 4000);
      return;
    }
    if (stock.length > 0) {
      setHint({ fromIds: [], dest: { kind: 'stock' } });
      say('hint_draw');
      if (window.SFX) SFX.hint();
      setTimeout(() => setHint(null), 4000);
      return;
    }
    if (waste.length > 0) {
      setHint({ fromIds: [], dest: { kind: 'stock' } });
      say('hint_recycle');
      if (window.SFX) SFX.hint();
      setTimeout(() => setHint(null), 4000);
      return;
    }
    say('stuck', 'sad');
    if (window.SFX) SFX.illegal();
  }

  function doAutoComplete() {
    if (autoPlayRef.current) return;
    setAutoPlaying(true);
    autoPlayRef.current = setInterval(() => {
      const stateNow = stateRef.current;
      if (!stateNow) return;
      const next = autoPromoteOne(stateNow);
      if (!next) {
        clearInterval(autoPlayRef.current);
        autoPlayRef.current = null;
        setAutoPlaying(false);
        return;
      }
      setTableau(next.tableau);
      setFoundations(next.foundations);
      if (window.SFX) SFX.foundation();
      setMoves(m => m + 1);
      setScore(s => s + 5);
      if (isWon(next)) {
        clearInterval(autoPlayRef.current);
        autoPlayRef.current = null;
        setAutoPlaying(false);
        finishWin(next);
      }
    }, 100);
  }

  // Cleanup on unmount
  useEffect(() => () => {
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e) {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      const cmd = e.metaKey || e.ctrlKey;
      if (cmd && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); doUndo(); }
      else if (cmd && e.key.toLowerCase() === 'z' && e.shiftKey) { e.preventDefault(); doRedo(); }
      else if (e.key === 'h' || e.key === 'H') { doHint(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [history, redoStack, tableau, foundations, stock, waste, phase]);

  // Draw mode toggle: if changed mid-game, prompt
  useEffect(() => {
    // Track changes via tweaks.drawMode
  }, [tweaks.drawMode]);

  function changeDrawMode(mode) {
    if (moves > 0 && phase === 'playing') {
      setPendingDrawMode(mode);
    } else {
      setTweak('drawMode', mode);
    }
  }
  function confirmDrawModeChange() {
    setTweak('drawMode', pendingDrawMode);
    setPendingDrawMode(null);
    startNewDeal(false);
    say('new_deal');
  }

  function tipDealer() {
    if (tipped) return;
    setTipped(true);
    setScore(s => s - 5);
    say('after_tip', 'happy');
    if (window.SFX) SFX.foundation();
    setTimeout(() => setTipped(false), 4000);
  }

  // ─── Render ───────────────────────────────────────────────
  const elapsedMs = phase === 'playing' ? (now - startTime) : (phase === 'won' ? (now - startTime) : 0);
  const elapsedTotal = Math.floor(elapsedMs / 1000);
  const timeStr = `${Math.floor(elapsedTotal/60)}:${String(elapsedTotal%60).padStart(2,'0')}`;

  const stuck = phase === 'playing' && !hasAnyLegalMove({ tableau, foundations, stock, waste });
  const hintIds = hint ? hint.fromIds : null;
  const hintFoundationSuit = hint && hint.dest.kind === 'foundation' ? hint.dest.suit : null;
  const hintTableauCol = hint && hint.dest.kind === 'tableau' ? hint.dest.col : null;
  const hintStock = hint && hint.dest.kind === 'stock';

  const isDealing = phase === 'dealing';

  return (
    <div className={shakeOn ? 'shake' : ''} style={{
      width: '100%', height: '100%',
      display:'flex', gap: 18, padding: 18,
      position:'relative'
    }}>
      <DealerPanel
        name={tweaks.dealerName}
        expression={expression}
        message={message}
        onTipDealer={tipDealer}
        tipped={tipped}
        playerName={tweaks.playerName}
        gender={dealerGender}
        isIdle={isIdle}
        mood={mood}
        onEditName={() => setShowNameModal(true)}
      />

      <div style={{ position:'relative', flex: 1, height: '100%' }}>
        <FeltBackdrop>
          <BrassRail
            score={score}
            moves={moves}
            time={timeStr}
            best={bestScore}
            onUndo={doUndo}
            canUndo={history.length > 0 && !autoPlaying}
            onRedo={doRedo}
            canRedo={redoStack.length > 0 && !autoPlaying}
            onHint={doHint}
            onAutoComplete={doAutoComplete}
            canAutoComplete={canAutoComplete({ tableau, foundations, stock, waste }) && !autoPlaying && !isWon({ tableau, foundations, stock, waste })}
            onNewDeal={requestNewDeal}
          />

          {/* Stock + Waste */}
          <div style={{ position:'absolute', left: 28, top: 90, display:'flex', gap: 18 }}>
            <StockPile stock={stock} waste={waste} onDraw={onStockClick} drawMode={drawCount} passes={passes} isHinted={hintStock} />
            <WastePile waste={waste} drawMode={drawCount} selection={selection} onSelect={onWasteClick} onDblClick={onWasteDblClick} />
          </div>

          {/* Foundations */}
          <div style={{ position:'absolute', right: 28, top: 90, display:'flex', gap: 14 }}>
            {SUITS_ORDER.map(suit => (
              <FoundationSlot
                key={suit}
                suit={suit}
                cards={foundations[suit]}
                onClick={() => onFoundationClick(suit)}
                isHinted={hintFoundationSuit === suit}
              />
            ))}
          </div>

          {/* Tableau */}
          <div style={{
            position:'absolute', left: 28, right: 28, top: 240,
            display:'flex', gap: 18,
            justifyContent:'flex-start'
          }}>
            {tableau.map((col, idx) => (
              <div key={idx} style={{
                animation: hintTableauCol === idx ? 'glowPulse 1.6s ease-in-out infinite' : 'none',
                borderRadius: 12,
                padding: hintTableauCol === idx ? 2 : 0,
                margin: hintTableauCol === idx ? -2 : 0
              }}>
                {/* Use deal-in animation for initial deal */}
                <DealtTableauColumn
                  col={idx}
                  cards={col}
                  selection={selection}
                  hintIds={hintIds}
                  onCardClick={onTableauClick}
                  onCardDblClick={onTableauDblClick}
                  onEmptyClick={() => onTableauEmptyClick(idx)}
                  isDealing={isDealing}
                />
              </div>
            ))}
          </div>

          {stuck && phase === 'playing' && (
            <StuckBanner
              onNewDeal={requestNewDeal}
              onUndo={doUndo}
              canUndo={history.length > 0}
            />
          )}

          {phase === 'won' && (
            <WinBanner
              score={score}
              time={timeStr}
              moves={moves}
              onNewDeal={() => { startNewDeal(false); say('new_deal'); }}
            />
          )}
        </FeltBackdrop>
      </div>

      {showNameModal && (
        <NameModal
          initial={tweaks.playerName === 'Alex' ? '' : tweaks.playerName}
          onSave={savePlayerName}
          onCancel={window.CASINO_PLAYER.read() ? () => setShowNameModal(false) : null}
        />
      )}

      {showAbandonModal && (
        <ConfirmModal
          title={`Abandon this hand?`}
          body={`You're at ${score >= 0 ? '+$' : '-$'}${Math.abs(score)} with ${moves} moves played. Starting over resets your score.`}
          confirmLabel="New Deal"
          onConfirm={confirmAbandon}
          onCancel={() => setShowAbandonModal(false)}
        />
      )}

      {pendingDrawMode && (
        <ConfirmModal
          title={`Switch to Draw ${pendingDrawMode === 'three' ? '3' : '1'}?`}
          body="Changing draw mode mid-game requires a new deal. Your current hand will be abandoned."
          confirmLabel="Switch & Deal"
          onConfirm={confirmDrawModeChange}
          onCancel={() => setPendingDrawMode(null)}
        />
      )}

      <TweaksPanel title="Solitaire Tweaks">
        <TweakSection label="Game" />
        <TweakRadio
          label="Draw mode"
          value={tweaks.drawMode}
          options={[
            { value: 'one', label: 'Draw 1' },
            { value: 'three', label: 'Draw 3' }
          ]}
          onChange={(v) => changeDrawMode(v)}
        />
        <TweakSection label="Player" />
        <TweakText
          label="Your name"
          value={tweaks.playerName}
          onChange={(v) => setTweak('playerName', v)}
        />
        <TweakRadio
          label="Host"
          value={tweaks.dealerName}
          options={['Melissa', 'Marcus']}
          onChange={(v) => setTweak('dealerName', v)}
        />
      </TweaksPanel>
    </div>
  );
}

function DealtTableauColumn({ col, cards, selection, hintIds, onCardClick, onCardDblClick, onEmptyClick, isDealing }) {
  if (cards.length === 0) {
    return (
      <div onClick={onEmptyClick} style={{
        width: 84, height: 120, borderRadius: 10,
        border: '1.5px dashed rgba(201,162,106,.4)',
        background: 'rgba(0,0,0,.18)',
        display:'flex', alignItems:'center', justifyContent:'center',
        cursor:'pointer'
      }}>
        <span style={{ fontSize: 30, color:'rgba(201,162,106,.4)', fontFamily:"'Playfair Display', serif" }}>♚</span>
      </div>
    );
  }
  const offsets = [];
  let cum = 0;
  for (let i = 0; i < cards.length; i++) {
    offsets.push(cum);
    cum += cards[i].faceUp ? 26 : 8;
  }
  const totalH = offsets[offsets.length - 1] + 120;

  return (
    <div style={{ position:'relative', width: 84, height: Math.max(totalH, 120) }}>
      {cards.map((card, i) => {
        const isSelected = selection && selection.source === 'tableau' && selection.col === col && i >= selection.idx;
        const hinted = hintIds && hintIds.includes(card.id);
        // Compute global deal index for nice cascade
        const dealIdx = i * 0.7 + col * 1.5;
        return (
          <div key={card.id} style={{
            position:'absolute', left:0, top: offsets[i] - (isSelected ? 6 : 0),
            transition: 'top .15s ease'
          }}>
            <PlayingCard
              rank={card.rank}
              suit={card.suit}
              faceDown={!card.faceUp}
              w={84} h={120}
              selected={isSelected}
              glow={hinted}
              dealing={isDealing}
              dealIndex={dealIdx}
              fromX={-380} fromY={-90}
              onClick={() => onCardClick(col, i, card)}
              onDoubleClick={() => onCardDblClick && onCardDblClick(col, i, card)}
            />
          </div>
        );
      })}
    </div>
  );
}

function ConfirmModal({ title, body, confirmLabel, onConfirm, onCancel }) {
  return (
    <div style={{
      position:'absolute', inset:0, zIndex: 100,
      background:'rgba(0,0,0,.6)', backdropFilter:'blur(4px)',
      display:'flex', alignItems:'center', justifyContent:'center'
    }}>
      <div style={{
        padding:'24px 32px',
        background:'linear-gradient(180deg, rgba(40,28,18,.97), rgba(20,12,6,.97))',
        border:'1px solid rgba(201,162,106,.5)',
        borderRadius: 14,
        maxWidth: 420,
        boxShadow:'0 30px 80px rgba(0,0,0,.7)'
      }}>
        <div style={{
          fontFamily:"'Playfair Display', serif", fontSize: 22, fontStyle:'italic',
          color:'var(--brass-2)', marginBottom: 8
        }}>{title}</div>
        <div style={{ color:'var(--ivory-dim)', fontSize: 14, marginBottom: 16, lineHeight: 1.5 }}>{body}</div>
        <div style={{ display:'flex', gap: 10, justifyContent:'flex-end' }}>
          <button onClick={onCancel} style={{
            padding:'8px 18px',
            background:'rgba(20,12,6,.7)', color:'var(--ivory)',
            border:'1px solid rgba(201,162,106,.35)', borderRadius: 8,
            fontSize: 11, letterSpacing:'.16em', textTransform:'uppercase',
            fontWeight: 600, cursor:'pointer', fontFamily:'inherit'
          }}>Keep playing</button>
          <button onClick={onConfirm} style={{
            padding:'8px 18px',
            background:'linear-gradient(180deg, #f5d896, #c9a26a)', color:'#1a1208',
            border:'1px solid rgba(245,216,150,1)', borderRadius: 8,
            fontSize: 11, letterSpacing:'.16em', textTransform:'uppercase',
            fontWeight: 700, cursor:'pointer', fontFamily:'inherit'
          }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
