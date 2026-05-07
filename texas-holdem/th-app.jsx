/* eslint-disable */
// Main Texas Hold'em app — phase machine, betting loop, AI driver, persistence,
// audio, modals.

const { useState, useEffect, useRef, useMemo, useCallback } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "playerName": "",
  "dealerName": "Melissa",
  "showHints": true,
  "soundOn": false,
  "startingBankroll": 1000
}/*EDITMODE-END*/;

const STATS_KEY = 'texasHoldemStats';

function loadStats() {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return { handsPlayed: 0, handsWon: 0, biggestPot: 0, biggestWin: 0, bestHand: null };
    const o = JSON.parse(raw);
    return {
      handsPlayed: o.handsPlayed || 0,
      handsWon:    o.handsWon    || 0,
      biggestPot:  o.biggestPot  || 0,
      biggestWin:  o.biggestWin  || 0,
      bestHand:    o.bestHand    || null
    };
  } catch (e) {
    return { handsPlayed: 0, handsWon: 0, biggestPot: 0, biggestWin: 0, bestHand: null };
  }
}

function saveStats(s) {
  localStorage.setItem(STATS_KEY, JSON.stringify(s));
}

// Build a fresh seat. Player is seat 0, opponents seats 1..3.
function makeSeat({ id, name, archetype, isPlayer, stack }) {
  return {
    id, name, archetype, isPlayer,
    stack,
    hole: [],
    bet: 0,                // chips committed THIS street
    totalContrib: 0,       // chips committed across the whole hand
    status: 'live',        // 'live'|'folded'|'allin'|'sittingout'
    acted: false,          // has this seat acted since last raise this street?
    lastAction: null,      // string for UI: 'fold'|'check'|'call'|'bet'|'raise'|'allin'
    lastAmount: 0,
    message: null,
    showCardsAtShowdown: false
  };
}

function buildLineup(playerName, buyin) {
  const arche = window.TH_PERSONALITY.ARCHETYPES;
  return [
    makeSeat({ id: 0, name: playerName, archetype: { id: 'player', name: playerName, color: '#e6c590', initials: (playerName[0] || 'Y').toUpperCase() }, isPlayer: true, stack: buyin }),
    makeSeat({ id: 1, name: 'Tight Tom',  archetype: arche['tight-tom'],   isPlayer: false, stack: buyin }),
    makeSeat({ id: 2, name: 'Loose Lucy', archetype: arche['loose-lucy'],  isPlayer: false, stack: buyin }),
    makeSeat({ id: 3, name: 'Maniac Mike',archetype: arche['maniac-mike'], isPlayer: false, stack: buyin })
  ];
}

function nextLive(seats, fromIdx) {
  const n = seats.length;
  for (let k = 1; k <= n; k++) {
    const i = (fromIdx + k) % n;
    if (seats[i].status === 'live') return i;
  }
  return -1;
}

function liveCount(seats) {
  return seats.filter(s => s.status === 'live' || s.status === 'allin').length;
}

function notFoldedCount(seats) {
  return seats.filter(s => s.status !== 'folded').length;
}

function liveActable(seats) {
  return seats.filter(s => s.status === 'live').length;
}

// Determine if betting round is complete.
// Round ends when: all 'live' (not all-in) seats have acted AND their bets are equal,
// OR only one seat remains 'live' or 'allin' (everyone else folded).
function bettingRoundComplete(seats, currentBet) {
  const stillIn = seats.filter(s => s.status === 'live' || s.status === 'allin');
  if (stillIn.length <= 1) return true;
  const liveSeats = seats.filter(s => s.status === 'live');
  if (liveSeats.length === 0) return true; // all all-in
  return liveSeats.every(s => s.acted && s.bet === currentBet);
}

function compareEvalAndKickers(a, b) {
  return TH_HAND.compareEval(a, b);
}

// Build a list of pots from the current totalContrib values + statuses.
// Standard side-pot algorithm: sort contributors ascending, cap layers by all-in.
function computePots(seats) {
  const contribs = seats
    .map(s => ({ id: s.id, amount: s.totalContrib, eligible: s.status !== 'folded' }))
    .filter(c => c.amount > 0);
  if (contribs.length === 0) return [];
  // Build pots from sorted unique contribution levels.
  const levels = [...new Set(contribs.map(c => c.amount))].sort((a, b) => a - b);
  const pots = [];
  let prev = 0;
  for (const L of levels) {
    const layer = L - prev;
    let amount = 0;
    const eligibleIds = [];
    for (const c of contribs) {
      if (c.amount >= L) {
        amount += layer;
        if (c.eligible) eligibleIds.push(c.id);
      }
    }
    if (amount > 0) pots.push({ amount, eligibleIds });
    prev = L;
  }
  // Merge consecutive pots with the same eligible set (keeps math simpler)
  const merged = [];
  for (const p of pots) {
    const last = merged[merged.length - 1];
    if (last && last.eligibleIds.length === p.eligibleIds.length &&
        last.eligibleIds.every(id => p.eligibleIds.includes(id))) {
      last.amount += p.amount;
    } else {
      merged.push({ ...p });
    }
  }
  return merged;
}

function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // Bankroll mirrors casino-bankroll store.
  const [bankroll, setBankroll] = useState(() =>
    window.CASINO_BANKROLL ? window.CASINO_BANKROLL.read() : tweaks.startingBankroll
  );
  useEffect(() => {
    if (window.CASINO_BANKROLL) window.CASINO_BANKROLL.write(bankroll);
  }, [bankroll]);

  const [stats, setStats] = useState(loadStats);
  useEffect(() => { saveStats(stats); }, [stats]);

  // Phase: 'lobby'|'preflop'|'flop'|'turn'|'river'|'showdown'|'between'
  const [phase, setPhase] = useState('lobby');
  const [tier, setTier] = useState(null); // {buyin, sb, bb}
  const [seats, setSeats] = useState([]);
  const [buttonIdx, setButtonIdx] = useState(0);
  const [actorIdx, setActorIdx] = useState(-1);
  const [board, setBoard] = useState([]);
  const [deck, setDeck] = useState([]);
  const [currentBet, setCurrentBet] = useState(0);
  const [minRaise, setMinRaise] = useState(0);
  const [pot, setPot] = useState(0); // current STREET pot for display only
  const [totalPot, setTotalPot] = useState(0);
  const [holeRevealed, setHoleRevealed] = useState(false); // showdown
  const [dealerExpression, setDealerExpression] = useState('idle');
  const [dealerMessage, setDealerMessage] = useState('');
  const [resultBanner, setResultBanner] = useState(null); // {kind, sub}
  const [winners, setWinners] = useState([]); // [{seatId, hand, label, share}]
  const [bestBoardIdx, setBestBoardIdx] = useState([]); // for glow
  const [raiseInput, setRaiseInput] = useState(0);
  const [showLobby, setShowLobby] = useState(true);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showBroke, setShowBroke] = useState(false);
  const [chatBust, setChatBust] = useState(0); // re-render trigger for ai message expiry
  const [handCount, setHandCount] = useState(0);

  // Cached equity for hint (avoid recomputing every keystroke).
  const equityCache = useRef({ key: '', value: null });

  // Persistent player name — pulled from the shared casino profile so the
  // name set in any other table flows in here too.
  useEffect(() => {
    const stored = window.CASINO_PLAYER ? window.CASINO_PLAYER.read() : '';
    if (stored && stored !== tweaks.playerName) setTweak('playerName', stored);
  }, []);

  function persistName(name) {
    if (!window.CASINO_PLAYER) return;
    const trimmed = window.CASINO_PLAYER.write(name);
    if (!trimmed) return;
    setTweak('playerName', trimmed);
  }

  const dealerCtx = { player: tweaks.playerName || 'You', dealer: tweaks.dealerName };

  function dealerSay(key, expression = 'idle') {
    const line = thPickLine(key, dealerCtx);
    setDealerMessage(line);
    setDealerExpression(expression);
  }

  // Auto-clear opponent speech bubbles after a few seconds.
  useEffect(() => {
    const id = setInterval(() => {
      setSeats(prev => prev.map(s => {
        if (s.message && s._messageExpires && Date.now() > s._messageExpires) {
          return { ...s, message: null, _messageExpires: 0 };
        }
        return s;
      }));
    }, 800);
    return () => clearInterval(id);
  }, []);

  function setSeatMessage(seatIdx, msg, ms = 3500) {
    setSeats(prev => {
      const next = prev.slice();
      next[seatIdx] = { ...next[seatIdx], message: msg, _messageExpires: Date.now() + ms };
      return next;
    });
  }

  // Lobby → join.
  function joinTable(pickedTier, name) {
    if (bankroll < pickedTier.buyin) return;
    persistName(name);
    setBankroll(b => b - pickedTier.buyin);
    setTier(pickedTier);
    const lineup = buildLineup(name, pickedTier.buyin);
    setSeats(lineup);
    setButtonIdx(0);
    setShowLobby(false);
    setHandCount(0);
    setResultBanner(null);
    if (tweaks.soundOn) TH_SFX.deal();
    dealerSay('greet', 'happy');
    // Start first hand after a short pause so the player can see the layout.
    setTimeout(() => startHand(lineup, 0, pickedTier), 700);
  }

  function leaveTable(refundStack = true) {
    if (refundStack) {
      const me = seats[0];
      if (me && me.stack > 0) {
        setBankroll(b => b + me.stack);
      }
    }
    setSeats([]);
    setBoard([]);
    setPot(0);
    setTotalPot(0);
    setTier(null);
    setShowLobby(true);
    setShowLeaveConfirm(false);
    setPhase('lobby');
    setResultBanner(null);
    setWinners([]);
  }

  // Start a new hand.
  function startHand(curSeats, curButton, curTier) {
    if (!curTier) return;

    // Anyone with no chips left rebuys silently (deduct from bankroll if available, else sit out).
    const refilled = curSeats.map(s => {
      if (s.stack > 0) return s;
      if (s.isPlayer) {
        // We'll handle player rebuy via Broke modal — sit them out for now.
        return { ...s, status: 'sittingout' };
      }
      // AI rebuys to buyin from "house" (free since they're not real). The plan
      // says player rebuys come from bankroll; AI just topup.
      return { ...s, stack: curTier.buyin, status: 'live' };
    });

    // If player is sitting out, show broke modal.
    if (refilled[0].status === 'sittingout' || (refilled[0].stack === 0 && bankroll < curTier.buyin)) {
      setSeats(refilled);
      setShowBroke(true);
      setPhase('between');
      return;
    }

    // Reset seat state for new hand.
    const playable = refilled.map(s => ({
      ...s,
      hole: [], bet: 0, totalContrib: 0,
      status: s.stack > 0 ? 'live' : 'sittingout',
      acted: false, lastAction: null, lastAmount: 0,
      message: null, showCardsAtShowdown: false
    }));

    // Move button to next seat with chips.
    const nextBtn = nextLive(playable, curButton === -1 ? 3 : curButton);
    const sbIdx = nextLive(playable, nextBtn);
    const bbIdx = nextLive(playable, sbIdx);

    // Post blinds.
    const sbAmt = Math.min(curTier.sb, playable[sbIdx].stack);
    const bbAmt = Math.min(curTier.bb, playable[bbIdx].stack);
    playable[sbIdx].stack -= sbAmt;
    playable[sbIdx].bet = sbAmt;
    playable[sbIdx].totalContrib = sbAmt;
    if (playable[sbIdx].stack === 0) playable[sbIdx].status = 'allin';
    playable[bbIdx].stack -= bbAmt;
    playable[bbIdx].bet = bbAmt;
    playable[bbIdx].totalContrib = bbAmt;
    if (playable[bbIdx].stack === 0) playable[bbIdx].status = 'allin';

    // Deal hole cards.
    const fresh = TH_DECK.buildDeck();
    for (const s of playable) {
      if (s.status === 'sittingout') continue;
      s.hole = TH_DECK.deal(fresh, 2);
    }

    // First to act preflop = next live seat after BB (UTG = button + 3 in 4-handed).
    let firstActor = nextLive(playable, bbIdx);

    setSeats(playable);
    setButtonIdx(nextBtn);
    setBoard([]);
    setDeck(fresh);
    setCurrentBet(bbAmt);
    setMinRaise(bbAmt);
    setPot(sbAmt + bbAmt);
    setTotalPot(sbAmt + bbAmt);
    setPhase('preflop');
    setResultBanner(null);
    setWinners([]);
    setBestBoardIdx([]);
    setHoleRevealed(false);
    setRaiseInput(bbAmt * 2);
    setActorIdx(firstActor);
    setHandCount(c => c + 1);
    if (tweaks.soundOn) {
      TH_SFX.deal();
      setTimeout(() => TH_SFX.card(), 120);
      setTimeout(() => TH_SFX.card(), 220);
    }
    dealerSay('deal', 'deal');
  }

  // Apply a single action from a seat.
  function applyAction(seatIdx, action) {
    setSeats(prev => {
      const next = prev.map(s => ({ ...s }));
      const s = next[seatIdx];
      if (!s || s.status !== 'live') return prev;

      const reset = (notIdx) => {
        for (let i = 0; i < next.length; i++) {
          if (i !== notIdx && next[i].status === 'live') next[i].acted = false;
        }
      };

      let kindForBanner = action.action;

      if (action.action === 'fold') {
        s.status = 'folded';
        s.acted = true;
        s.lastAction = 'fold';
        s.lastAmount = 0;
        if (s.isPlayer) {
          dealerSay('youFold', 'sad');
        } else {
          setSeatMessage(seatIdx, TH_PERSONALITY.pickLine(s.archetype.id, 'fold'));
        }
        if (tweaks.soundOn) TH_SFX.fold();
      } else if (action.action === 'check') {
        s.acted = true;
        s.lastAction = 'check';
        s.lastAmount = 0;
        if (!s.isPlayer) setSeatMessage(seatIdx, TH_PERSONALITY.pickLine(s.archetype.id, 'check'));
        if (tweaks.soundOn) TH_SFX.check();
      } else if (action.action === 'call') {
        const need = currentBet - s.bet;
        const pay = Math.min(need, s.stack);
        s.stack -= pay;
        s.bet += pay;
        s.totalContrib += pay;
        s.acted = true;
        if (s.stack === 0) {
          s.status = 'allin';
          s.lastAction = 'allin';
          s.lastAmount = pay;
          if (!s.isPlayer) setSeatMessage(seatIdx, TH_PERSONALITY.pickLine(s.archetype.id, 'allin'));
        } else {
          s.lastAction = 'call';
          s.lastAmount = pay;
          if (!s.isPlayer) setSeatMessage(seatIdx, TH_PERSONALITY.pickLine(s.archetype.id, 'call'));
        }
        setTotalPot(p => p + pay);
        setPot(p => p + pay);
        if (tweaks.soundOn) TH_SFX.call();
      } else if (action.action === 'raise') {
        // action.amount = chips ADDED this turn.
        const add = Math.max(0, Math.min(action.amount, s.stack));
        const newTotalBet = s.bet + add;
        const raiseSize = newTotalBet - currentBet;
        s.stack -= add;
        s.bet = newTotalBet;
        s.totalContrib += add;
        s.acted = true;
        if (s.stack === 0) {
          s.status = 'allin';
          s.lastAction = 'allin';
          if (!s.isPlayer) setSeatMessage(seatIdx, TH_PERSONALITY.pickLine(s.archetype.id, 'allin'));
        } else if (raiseSize >= minRaise) {
          s.lastAction = currentBet === 0 ? 'bet' : 'raise';
          if (!s.isPlayer) {
            const sizeKey = raiseSize >= minRaise * 3 ? 'raise_big' : 'raise_small';
            setSeatMessage(seatIdx, TH_PERSONALITY.pickLine(s.archetype.id, sizeKey));
          }
        } else {
          // Under-min raise (only legal as all-in completion): treat as call w/ allin.
          s.lastAction = 'allin';
        }
        s.lastAmount = add;
        setTotalPot(p => p + add);
        setPot(p => p + add);
        if (newTotalBet > currentBet) {
          setCurrentBet(newTotalBet);
          if (raiseSize >= minRaise) setMinRaise(raiseSize);
          // Reset other seats' acted flags
          reset(seatIdx);
        }
        if (s.isPlayer) {
          if (newTotalBet >= s.bet + s.stack /*all-in*/ || s.status === 'allin') dealerSay('allin', 'shocked');
          else if (raiseSize >= bigBlindAmount() * 5) dealerSay('bet_huge', 'shocked');
          else dealerSay('raise', 'happy');
        }
        if (tweaks.soundOn) TH_SFX.raise();
      }

      return next;
    });
  }

  function bigBlindAmount() { return tier ? tier.bb : 0; }

  // After each action, advance to next actor or end the street.
  useEffect(() => {
    if (phase === 'lobby' || phase === 'between' || phase === 'showdown') return;
    if (actorIdx < 0) return;

    const stillIn = seats.filter(s => s.status !== 'folded');
    if (stillIn.length <= 1) {
      // Hand ends now — last person standing wins everything.
      finalizeFolded();
      return;
    }

    if (bettingRoundComplete(seats, currentBet)) {
      advanceStreet();
      return;
    }

    // If current actor isn't able to act (folded/allin/sittingout), skip.
    const cur = seats[actorIdx];
    if (!cur || cur.status !== 'live') {
      const nxt = nextLive(seats, actorIdx);
      if (nxt < 0) {
        advanceStreet();
      } else {
        setActorIdx(nxt);
      }
      return;
    }

    // If current actor is AI, schedule a decision after a small delay so it feels paced.
    if (!cur.isPlayer) {
      const timeoutMs = 700 + Math.random() * 700;
      const id = setTimeout(() => runAITurn(actorIdx), timeoutMs);
      return () => clearTimeout(id);
    }
    // else: player's turn — wait for click.
  }, [actorIdx, seats, phase, currentBet]);

  function runAITurn(seatIdx) {
    const s = seats[seatIdx];
    if (!s || s.status !== 'live') return;
    const ctx = {
      archetype: s.archetype,
      hole: s.hole,
      board,
      phase,
      pot: totalPot,
      toCall: Math.max(0, currentBet - s.bet),
      myStack: s.stack,
      myCurrentBet: s.bet,
      currentBet,
      minRaise,
      bigBlind: tier.bb,
      aliveCount: notFoldedCount(seats),
      position: positionFor(seatIdx),
      handsThisStreet: 0,
      iters: 250
    };
    let action;
    try {
      action = TH_AI.decide(ctx);
    } catch (e) {
      console.warn('AI error', e);
      action = { action: 'fold', reason: 'error' };
    }

    // Validate action
    if (action.action === 'check' && currentBet > s.bet) {
      action = { action: 'fold', reason: 'forced fold (no check)' };
    }
    if (action.action === 'call' && currentBet === s.bet) {
      action = { action: 'check', reason: 'free check' };
    }
    if (action.action === 'raise') {
      const minRaiseAdd = (currentBet + minRaise) - s.bet;
      if (action.amount < minRaiseAdd && action.amount < s.stack) {
        // Can't raise this small unless all-in. Convert to call.
        action = { action: currentBet > s.bet ? 'call' : 'check', reason: 'invalid raise -> call/check' };
      }
      if (action.action === 'raise' && action.amount >= s.stack) {
        action.amount = s.stack;
      }
    }

    applyAction(seatIdx, action);

    // After applying, advance.
    setTimeout(() => {
      const nxt = nextLive(seatsRef.current, seatIdx);
      if (nxt < 0) {
        // shouldn't happen — bettingRoundComplete will fire on next render
        return;
      }
      setActorIdx(nxt);
    }, 350);
  }

  // Keep a ref of seats for use inside timed callbacks.
  const seatsRef = useRef(seats);
  useEffect(() => { seatsRef.current = seats; }, [seats]);

  function positionFor(seatIdx) {
    const distFromButton = (seatIdx - buttonIdx + 4) % 4;
    return distFromButton === 0 ? 'button'
         : distFromButton === 1 ? 'sb'
         : distFromButton === 2 ? 'bb'
         : 'utg';
  }

  // Player actions.
  function playerFold() {
    if (!isPlayerTurn()) return;
    applyAction(0, { action: 'fold' });
    setTimeout(() => setActorIdx(nextLive(seatsRef.current, 0)), 250);
  }
  function playerCheckCall() {
    if (!isPlayerTurn()) return;
    const me = seats[0];
    if (currentBet === me.bet) {
      applyAction(0, { action: 'check' });
    } else {
      applyAction(0, { action: 'call' });
    }
    setTimeout(() => setActorIdx(nextLive(seatsRef.current, 0)), 250);
  }
  function playerRaise(amt) {
    if (!isPlayerTurn()) return;
    const me = seats[0];
    const minRaiseAdd = Math.max(currentBet + minRaise - me.bet, tier.bb);
    const a = Math.max(minRaiseAdd, Math.min(me.stack, amt));
    applyAction(0, { action: 'raise', amount: a });
    setTimeout(() => setActorIdx(nextLive(seatsRef.current, 0)), 250);
  }

  function isPlayerTurn() {
    return phase !== 'lobby' && phase !== 'showdown' && phase !== 'between'
      && actorIdx === 0 && seats[0] && seats[0].status === 'live';
  }

  // Advance to next street (or showdown if river done).
  function advanceStreet() {
    // Reset acted/bet for next street.
    setSeats(prev => prev.map(s => ({ ...s, bet: 0, acted: false, lastAction: null, lastAmount: 0 })));
    setCurrentBet(0);
    setMinRaise(tier.bb);
    setPot(0);

    let nextPhase = phase;
    if (phase === 'preflop') nextPhase = 'flop';
    else if (phase === 'flop') nextPhase = 'turn';
    else if (phase === 'turn') nextPhase = 'river';
    else if (phase === 'river') nextPhase = 'showdown';

    if (nextPhase === 'flop') {
      setDeck(d => {
        const newDeck = d.slice();
        newDeck.pop(); // burn
        const f = [newDeck.pop(), newDeck.pop(), newDeck.pop()];
        setBoard(b => b.concat(f));
        return newDeck;
      });
      dealerSay('flop', 'idle');
      if (tweaks.soundOn) [0,140,280].forEach(d => setTimeout(() => TH_SFX.card(), d));
    } else if (nextPhase === 'turn') {
      setDeck(d => {
        const newDeck = d.slice();
        newDeck.pop(); // burn
        const t = [newDeck.pop()];
        setBoard(b => b.concat(t));
        return newDeck;
      });
      dealerSay('turn', 'idle');
      if (tweaks.soundOn) TH_SFX.card();
    } else if (nextPhase === 'river') {
      setDeck(d => {
        const newDeck = d.slice();
        newDeck.pop(); // burn
        const r = [newDeck.pop()];
        setBoard(b => b.concat(r));
        return newDeck;
      });
      dealerSay('river', 'idle');
      if (tweaks.soundOn) TH_SFX.card();
    }

    setPhase(nextPhase);

    if (nextPhase === 'showdown') {
      // Resolve hand.
      setActorIdx(-1);
      setTimeout(() => resolveShowdown(), 600);
      return;
    }

    // Postflop: first live seat after button acts first.
    setTimeout(() => {
      const first = nextLive(seatsRef.current, buttonIdx);
      if (first < 0 || liveActable(seatsRef.current) === 0) {
        // Everyone all-in or only one seat left — auto-advance again.
        setActorIdx(-1);
        setTimeout(advanceStreet, 600);
      } else {
        setActorIdx(first);
      }
    }, 700);
  }

  function finalizeFolded() {
    // Last seat not folded wins everything.
    const winnerSeat = seats.find(s => s.status !== 'folded');
    if (!winnerSeat) return;
    const pots = computePots(seats);
    const totalAward = pots.reduce((a, p) => a + p.amount, 0);
    setActorIdx(-1);
    setSeats(prev => prev.map(s => s.id === winnerSeat.id ? { ...s, stack: s.stack + totalAward } : s));
    setWinners([{ seatId: winnerSeat.id, label: '(uncontested)', share: totalAward }]);
    if (winnerSeat.isPlayer) {
      setResultBanner({ kind: 'win_uncon', sub: `+$${totalAward}` });
      dealerSay('everyoneFold', 'happy');
      bumpStats({ won: true, potSize: totalAward, bestHand: null });
      if (tweaks.soundOn) TH_SFX.win();
    } else {
      setResultBanner({ kind: 'lose', sub: `${winnerSeat.name} wins $${totalAward}` });
      dealerSay('youLose', 'idle');
      bumpStats({ won: false, potSize: totalAward, bestHand: null });
      if (tweaks.soundOn) TH_SFX.lose();
    }
    setPhase('between');
    queueNextHand();
  }

  function resolveShowdown() {
    // Need to run remaining streets if we haven't.
    if (board.length < 5) {
      runOutBoardThenShowdown();
      return;
    }
    setHoleRevealed(true);

    // Evaluate everyone left.
    const evals = seats.map(s => {
      if (s.status === 'folded' || s.status === 'sittingout') return null;
      const ev = TH_HAND.evalBest5From7([...s.hole, ...board]);
      const label = TH_HAND.labelOf(ev, s.hole, board);
      return { seat: s, ev, label };
    });

    const pots = computePots(seats);
    const winnersAcc = [];
    const seatGains = {}; // seatId -> chips won

    for (const pot of pots) {
      const eligible = evals.filter(e => e && pot.eligibleIds.includes(e.seat.id));
      if (eligible.length === 0) continue;
      eligible.sort((a, b) => TH_HAND.compare(b.ev, a.ev));
      const top = eligible[0].ev;
      const winners = eligible.filter(e => TH_HAND.compare(e.ev, top) === 0);
      const share = Math.floor(pot.amount / winners.length);
      const remainder = pot.amount - share * winners.length;
      winners.forEach((w, i) => {
        const give = share + (i === 0 ? remainder : 0);
        seatGains[w.seat.id] = (seatGains[w.seat.id] || 0) + give;
      });
      winnersAcc.push({
        eligibleIds: pot.eligibleIds,
        amount: pot.amount,
        winnerIds: winners.map(w => w.seat.id),
        label: winners[0].label
      });
    }

    setSeats(prev => prev.map(s => {
      const g = seatGains[s.id] || 0;
      const reveal = s.status !== 'folded' && s.status !== 'sittingout';
      return { ...s, stack: s.stack + g, showCardsAtShowdown: reveal };
    }));

    // Determine player outcome.
    const me = seats[0];
    const myEval = evals[0];
    const myShare = seatGains[0] || 0;
    const totalPotSize = pots.reduce((a, p) => a + a, 0); // sum
    const handPotSize = pots.reduce((a, p) => a + p.amount, 0);

    // pick best 5 to glow
    if (myEval && myEval.ev.best5) {
      const idxs = [];
      for (let i = 0; i < board.length; i++) {
        if (myEval.ev.best5.some(c => c.id === board[i].id)) idxs.push(i);
      }
      setBestBoardIdx(idxs);
    }

    if (myShare > handPotSize / 2 + 1) {
      setResultBanner({ kind: 'win_show', sub: `${myEval ? myEval.label : ''} · +$${myShare}` });
      dealerSay('youWin', 'happy');
      if (tweaks.soundOn) TH_SFX.win();
      bumpStats({ won: true, potSize: handPotSize, bestHand: myEval?.label });
    } else if (myShare > 0) {
      setResultBanner({ kind: 'chop', sub: `${myEval ? myEval.label : ''} · +$${myShare}` });
      dealerSay('showdown', 'idle');
      bumpStats({ won: true, potSize: handPotSize, bestHand: myEval?.label });
    } else {
      const winLabel = winnersAcc[0]?.label || '';
      setResultBanner({ kind: 'lose', sub: winLabel ? `Lost to ${winLabel}` : 'Better hand wins' });
      dealerSay('youLose', 'sad');
      if (tweaks.soundOn) TH_SFX.lose();
      bumpStats({ won: false, potSize: handPotSize, bestHand: null });
    }
    setWinners(winnersAcc);
    setPhase('showdown');
    queueNextHand(3500);
  }

  // If betting ended with multi-way all-in before river, deal remaining cards.
  function runOutBoardThenShowdown() {
    // Reveal community cards one by one.
    const need = 5 - board.length;
    let count = 0;
    setHoleRevealed(true);
    function step() {
      if (count >= need) {
        setTimeout(() => resolveShowdown(), 500);
        return;
      }
      setDeck(d => {
        const nd = d.slice();
        if (board.length === 0) nd.pop(); // burn before flop
        nd.pop(); // burn
        const c = nd.pop();
        setBoard(b => b.concat([c]));
        return nd;
      });
      count++;
      if (tweaks.soundOn) TH_SFX.card();
      setTimeout(step, 600);
    }
    step();
  }

  function bumpStats({ won, potSize, bestHand }) {
    setStats(s => {
      const next = {
        handsPlayed: s.handsPlayed + 1,
        handsWon:    s.handsWon + (won ? 1 : 0),
        biggestPot:  Math.max(s.biggestPot, potSize),
        biggestWin:  won ? Math.max(s.biggestWin, potSize) : s.biggestWin,
        bestHand:    bestHand || s.bestHand
      };
      return next;
    });
  }

  function queueNextHand(delayMs = 2800) {
    setTimeout(() => {
      // Move button + auto-deal.
      setSeats(prev => {
        const me = prev[0];
        if (!me || (me.stack === 0 && bankroll < (tier?.buyin || 0))) {
          setShowBroke(true);
          setPhase('between');
          return prev;
        }
        // Player rebuy from bankroll if zero and bankroll has it.
        if (me.stack === 0 && bankroll >= tier.buyin) {
          setBankroll(b => b - tier.buyin);
          const r = prev.slice();
          r[0] = { ...r[0], stack: tier.buyin };
          startHand(r, buttonIdx, tier);
          return r;
        }
        startHand(prev, buttonIdx, tier);
        return prev;
      });
    }, delayMs);
  }

  // Memoized hint for the player.
  const hint = useMemo(() => {
    if (!tweaks.showHints) return null;
    if (!isPlayerTurn()) return null;
    const me = seats[0];
    if (!me || !me.hole.length) return null;

    const oppCount = Math.max(1, notFoldedCount(seats) - 1);
    const cacheKey = `${me.hole.map(c=>c.id).join('-')}|${board.map(c=>c.id).join('-')}|${oppCount}`;
    let eq;
    if (equityCache.current.key === cacheKey && equityCache.current.value) {
      eq = equityCache.current.value;
    } else {
      eq = TH_EQUITY.estimateEquity({
        playerHole: me.hole,
        board,
        oppCount,
        iters: phase === 'preflop' ? 1200 : 1500
      });
      equityCache.current = { key: cacheKey, value: eq };
    }

    const toCall = Math.max(0, currentBet - me.bet);
    const oddsRequired = toCall > 0 ? TH_EQUITY.potOdds(toCall, totalPot) : 0;
    const equity = eq.equity;

    let action, explanation;
    const pos = positionFor(0);
    const posLabel = pos === 'button' ? 'In position' : (pos === 'utg' ? 'UTG (out of position)' : pos === 'sb' ? 'Small blind' : pos === 'bb' ? 'Big blind' : 'In position');

    if (toCall === 0) {
      // Open / check option
      if (equity >= 0.62) {
        const target = Math.round(totalPot * 0.66);
        action = `Bet ~$${target}`;
        explanation = `Strong equity (${Math.round(equity * 100)}%). Bet for value — extract from worse hands and protect the lead.`;
      } else if (equity >= 0.45 && phase !== 'preflop') {
        const target = Math.round(totalPot * 0.5);
        action = `Bet ~$${target}`;
        explanation = `Decent equity (${Math.round(equity * 100)}%) — a half-pot bet folds out floats and builds the pot.`;
      } else if (phase === 'preflop' && equity >= 0.55) {
        const target = Math.max(tier.bb * 3, Math.round(totalPot));
        action = `Raise to ~$${target}`;
        explanation = `Premium hole — open-raise to thin the field and build pot pre-flop.`;
      } else {
        action = 'Check';
        explanation = `Equity ${Math.round(equity * 100)}% — take the free card and reassess on the next street.`;
      }
    } else {
      const requiredPct = Math.round(oddsRequired * 100);
      const equityPct = Math.round(equity * 100);
      if (equity >= 0.7) {
        const target = Math.max(currentBet * 3, currentBet + Math.round(totalPot * 0.6));
        action = `Raise to ~$${target}`;
        explanation = `Equity ${equityPct}% vs. their range — raise for value. Charge their draws.`;
      } else if (equity >= oddsRequired) {
        action = toCall >= me.stack ? `Call ($${me.stack} all-in)` : `Call ($${toCall})`;
        explanation = `You need ${requiredPct}% to break even and you have ~${equityPct}%. The price is right.`;
      } else if (equity < oddsRequired - 0.05) {
        action = 'Fold';
        explanation = `Equity ${equityPct}% vs. ${requiredPct}% required — pot is laying you bad odds. Save the chips.`;
      } else {
        action = 'Fold';
        explanation = `Marginal: equity ${equityPct}% vs. ${requiredPct}% required. Without implied odds, fold and wait.`;
      }
    }

    const me0Eval = board.length >= 3 ? TH_HAND.evalBest5From7([...me.hole, ...board]) : null;
    const label = me0Eval ? TH_HAND.labelOf(me0Eval, me.hole, board) : TH_HAND.holeLabel(me.hole);

    return {
      action, explanation, equity, potOdds: oddsRequired,
      label, position: pos
    };
  }, [tweaks.showHints, phase, seats, board, currentBet, totalPot, actorIdx]);

  // Layout.
  const me = seats[0];
  const opponents = seats.slice(1);

  // Reset raise input when context changes.
  useEffect(() => {
    if (!isPlayerTurn() || !me || !tier) return;
    const minRaiseAdd = Math.max(currentBet + minRaise - me.bet, tier.bb);
    setRaiseInput(prev => Math.max(minRaiseAdd, Math.min(me.stack, prev || minRaiseAdd)));
  }, [actorIdx, phase, currentBet, minRaise]);

  return (
    <div style={{
      width:'100vw', height:'100vh',
      display:'flex', alignItems:'center', justifyContent:'center',
      padding: 24, position:'relative'
    }}>
      <div style={{
        width: 1380, maxWidth:'100%', height: '100%', maxHeight: 860,
        display:'flex', gap: 14, position:'relative'
      }}>
        {!showLobby && (
          <THDealerStrip
            name={tweaks.dealerName}
            gender={tweaks.dealerName === 'Marcus' ? 'male' : 'female'}
            expression={dealerExpression}
            message={dealerMessage}
          />
        )}

        <div style={{ flex: 1, position:'relative', minWidth: 800 }}>
          <THFeltBackdrop />

          <div style={{ position:'absolute', inset: 0, display:'flex', flexDirection:'column' }}>

            <THBrassRail
              bankroll={bankroll}
              tableStack={me ? me.stack : null}
              blinds={tier ? `$${tier.sb}/$${tier.bb}` : null}
              handsPlayed={stats.handsPlayed}
              biggestPot={stats.biggestPot}
              showHints={tweaks.showHints}
              onToggleHints={() => setTweak('showHints', !tweaks.showHints)}
              onLeave={!showLobby ? () => setShowLeaveConfirm(true) : null}
            />

            {/* Play area */}
            <div style={{
              flex: 1, position:'relative',
              padding:'10px 32px 0',
              display:'flex', flexDirection:'column'
            }}>
              <THFeltLogo />

              {/* Top row — opponents */}
              {!showLobby && (
                <div style={{
                  marginTop: 18,
                  display:'flex', justifyContent:'space-between', gap: 12,
                  position:'relative', zIndex: 3,
                  paddingRight: tweaks.showHints ? 280 : 0,
                  transition: 'padding-right .2s ease'
                }}>
                  {opponents.map((s, idx) => {
                    const seatIdx = idx + 1;
                    const pos = positionFor(seatIdx);
                    const isBtn = seatIdx === buttonIdx;
                    const blindLabel = pos === 'sb' ? 'SB' : pos === 'bb' ? 'BB' : null;
                    return (
                      <THOpponentSeat
                        key={s.id}
                        archetype={s.archetype}
                        name={s.name}
                        stack={s.stack}
                        bet={s.bet}
                        status={s.status}
                        isActive={actorIdx === seatIdx && s.status === 'live'}
                        isButton={isBtn}
                        blindLabel={blindLabel}
                        hole={s.hole}
                        holeRevealed={holeRevealed && s.showCardsAtShowdown}
                        message={s.message}
                      />
                    );
                  })}
                </div>
              )}

              {/* Middle — pot + community cards */}
              {!showLobby && (
                <div style={{
                  flex: 1, display:'flex', flexDirection:'column',
                  alignItems:'center', justifyContent:'center', gap: 14,
                  position:'relative', zIndex: 2,
                  marginTop: 6
                }}>
                  {totalPot > 0 && <THPotDisplay pot={totalPot} />}
                  <THCommunityCards board={board} phase={phase} glowIdx={bestBoardIdx} />
                  {resultBanner && <THResultBanner kind={resultBanner.kind} sub={resultBanner.sub} />}
                </div>
              )}

              {/* Bottom — player */}
              {!showLobby && me && (
                <div style={{
                  position:'relative', zIndex: 3,
                  display:'flex', alignItems:'flex-end', justifyContent:'center', gap: 24,
                  marginBottom: 6
                }}>
                  <PlayerSeatPanel
                    seat={me}
                    isActive={actorIdx === 0 && me.status === 'live'}
                    isButton={buttonIdx === 0}
                    blindLabel={positionFor(0) === 'sb' ? 'SB' : positionFor(0) === 'bb' ? 'BB' : null}
                    holeRevealed={true}
                  />
                </div>
              )}

              {/* Hint panel */}
              {tweaks.showHints && hint && <THHintPanel hint={hint} label={hint.label} equity={hint.equity} potOdds={hint.potOdds} />}
            </div>

            {/* Bottom action zone */}
            {!showLobby && (
              <div style={{
                position:'relative', zIndex: 5,
                padding:'14px 26px 18px',
                minHeight: 130
              }}>
                {isPlayerTurn() && me && tier && (
                  <THActionZone
                    toCall={Math.max(0, currentBet - me.bet)}
                    currentBet={currentBet}
                    myCurrentBet={me.bet}
                    minRaise={minRaise}
                    myStack={me.stack}
                    pot={totalPot}
                    bigBlind={tier.bb}
                    raiseAmount={raiseInput}
                    setRaiseAmount={setRaiseInput}
                    hint={hint}
                    onFold={playerFold}
                    onCheckCall={playerCheckCall}
                    onRaise={playerRaise}
                  />
                )}
                {!isPlayerTurn() && phase !== 'lobby' && (
                  <div style={{
                    display:'flex', alignItems:'center', justifyContent:'center',
                    height: 80,
                    fontSize: 12, letterSpacing:'.3em', color:'var(--ivory-dim)', textTransform:'uppercase'
                  }}>
                    <span style={{
                      width: 10, height: 10, borderRadius:'50%',
                      background:'var(--brass)',
                      marginRight: 12,
                      animation:'glowPulse 1s ease-in-out infinite'
                    }} />
                    {phase === 'showdown' ? 'Showdown — next hand soon' :
                     phase === 'between' ? 'Shuffling…' :
                     actorIdx >= 0 ? `${seats[actorIdx]?.name || ''} is thinking…` : 'Dealing…'}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Player">
          <TweakText label="Your name" value={tweaks.playerName} onChange={v => setTweak('playerName', v)} />
          <TweakSelect label="Dealer" value={tweaks.dealerName} onChange={v => setTweak('dealerName', v)}
            options={[{ value: 'Melissa', label: 'Melissa (warm)' }, { value: 'Marcus', label: 'Marcus (deadpan)' }]}/>
        </TweakSection>
        <TweakSection label="Game">
          <TweakToggle label="Strategy hints" value={tweaks.showHints} onChange={v => setTweak('showHints', v)} />
          <TweakToggle label="Sound" value={tweaks.soundOn} onChange={v => setTweak('soundOn', v)} />
          <TweakNumber label="Starting bankroll" value={tweaks.startingBankroll} onChange={v => setTweak('startingBankroll', Number(v))} min={100} max={100000} step={100} />
          <TweakButton label="Reset bankroll" onClick={() => {
            const v = tweaks.startingBankroll;
            setBankroll(v);
            if (window.CASINO_BANKROLL) window.CASINO_BANKROLL.write(v);
          }} />
          <TweakButton label="Reset stats" secondary onClick={() => {
            const empty = { handsPlayed: 0, handsWon: 0, biggestPot: 0, biggestWin: 0, bestHand: null };
            setStats(empty);
          }} />
        </TweakSection>
      </TweaksPanel>

      {showLobby && (
        <THLobbyModal
          bankroll={bankroll}
          defaultName={tweaks.playerName}
          onJoin={joinTable}
          onCancel={null}
        />
      )}

      {showLeaveConfirm && (
        <THConfirmModal
          title="Leave the table?"
          body={`Cash out and return to the casino. Your remaining stack of $${me?.stack || 0} returns to your bankroll.`}
          confirmLabel="Cash out"
          cancelLabel="Keep playing"
          onConfirm={() => leaveTable(true)}
          onCancel={() => setShowLeaveConfirm(false)}
        />
      )}

      {showBroke && (
        <THBrokeModal
          playerName={tweaks.playerName}
          onLeave={() => { setShowBroke(false); leaveTable(true); }}
          onReload={() => {
            const v = window.CASINO_BANKROLL ? window.CASINO_BANKROLL.reload() : 1000;
            setBankroll(v);
            setShowBroke(false);
            // Restart the seat.
            setTimeout(() => {
              if (tier) {
                setBankroll(b => b - tier.buyin);
                setSeats(prev => {
                  const r = prev.slice();
                  r[0] = { ...r[0], stack: tier.buyin, status: 'live' };
                  startHand(r, buttonIdx, tier);
                  return r;
                });
              }
            }, 200);
          }}
        />
      )}
    </div>
  );
}

function PlayerSeatPanel({ seat, isActive, isButton, blindLabel, holeRevealed }) {
  if (!seat) return null;
  const folded = seat.status === 'folded';
  const allin = seat.status === 'allin';
  return (
    <div style={{
      display:'flex', flexDirection:'column', alignItems:'center', gap: 10,
      padding:'12px 22px 14px',
      background: isActive
        ? 'linear-gradient(180deg, rgba(245,216,150,.18), rgba(20,12,6,.7))'
        : 'linear-gradient(180deg, rgba(35,22,10,.7), rgba(20,12,6,.85))',
      borderRadius: 16,
      border: isActive ? '1.5px solid rgba(245,216,150,.7)' : '1px solid rgba(201,162,106,.35)',
      boxShadow: isActive
        ? '0 8px 22px rgba(230,197,144,.25), inset 0 1px 0 rgba(230,197,144,.18)'
        : '0 6px 14px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.06)',
      backdropFilter:'blur(6px)',
      transition:'all .25s ease',
      minWidth: 360,
      opacity: folded ? 0.6 : 1,
      position:'relative'
    }}>
      <div style={{ display:'flex', alignItems:'center', gap: 10 }}>
        <div style={{
          fontFamily:"'Playfair Display', serif",
          fontStyle:'italic',
          fontSize: 22, fontWeight: 700,
          color:'var(--brass-2)',
          letterSpacing:'.02em'
        }}>{seat.name}</div>
        {isButton && (
          <span style={{
            fontSize: 10, fontWeight: 800, padding:'2px 7px',
            background:'#fff', color:'#1a1208',
            borderRadius: 4, letterSpacing:'.1em'
          }}>D</span>
        )}
        {blindLabel && (
          <span style={{
            fontSize: 10, fontWeight: 700, padding:'2px 7px',
            background:'rgba(230,197,144,.25)', color:'var(--brass-2)',
            border:'1px solid rgba(230,197,144,.5)',
            borderRadius: 4, letterSpacing:'.1em'
          }}>{blindLabel}</span>
        )}
        {folded && (
          <span style={{
            fontSize: 10, fontWeight: 800, padding:'3px 8px',
            background:'rgba(120,30,30,.85)', color:'#fff',
            borderRadius: 4, letterSpacing:'.16em', textTransform:'uppercase'
          }}>Folded</span>
        )}
        {allin && (
          <span style={{
            fontSize: 10, fontWeight: 800, padding:'3px 8px',
            background:'rgba(245,216,150,.95)', color:'#1a1208',
            borderRadius: 4, letterSpacing:'.16em', textTransform:'uppercase'
          }}>All-in</span>
        )}
      </div>
      <div style={{ display:'flex', gap: 10 }}>
        {seat.hole && seat.hole.length === 2 ? (
          seat.hole.map((c, i) => (
            <THCard
              key={c.id || i}
              card={c}
              w={84} h={118}
              dealIndex={i}
              fromX={-40} fromY={220}
              dim={folded}
            />
          ))
        ) : (
          <>
            <div style={{ width: 84, height: 118, border:'2px dashed rgba(201,162,106,.25)', borderRadius:10 }}/>
            <div style={{ width: 84, height: 118, border:'2px dashed rgba(201,162,106,.25)', borderRadius:10 }}/>
          </>
        )}
      </div>
      <div style={{ display:'flex', alignItems:'center', gap: 12 }}>
        <THStackChip amount={seat.stack} size={14} />
        {seat.bet > 0 && (
          <span style={{
            fontSize: 11, color:'var(--brass-2)', fontWeight: 700,
            letterSpacing:'.12em', fontFamily:"'JetBrains Mono', monospace",
            padding:'3px 9px',
            background:'rgba(40,28,18,.6)',
            border:'1px solid rgba(230,197,144,.4)',
            borderRadius: 6
          }}>BET ${seat.bet}</span>
        )}
        {seat.lastAction && (
          <span style={{
            fontSize: 9, color:'var(--ivory-dim)',
            letterSpacing:'.18em', textTransform:'uppercase'
          }}>· {seat.lastAction}</span>
        )}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
