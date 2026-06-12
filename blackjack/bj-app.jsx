/* eslint-disable */
// Main blackjack app — full game state machine.
//
// Strategy hints come from BJ_STRATEGY (bj-strategy.js), an exact EV engine
// that only ranks actions the table will accept right now — the coach can
// never recommend a disabled button. The shoe lives in a ref (not state) so
// every draw — player hits, doubles, splits, dealer draws scheduled through
// setTimeout — pulls from the one live deck; the old state-based shoe let
// delayed dealer draws replay cards the player had already been dealt.

const { useState, useEffect, useRef, useMemo } = React;

// ─── Game logic helpers ────────────────────────────────
const SUITS_ORDER = ['♠','♥','♦','♣'];
const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];

function buildShoe(decks = 6) {
  const shoe = [];
  for (let d = 0; d < decks; d++) {
    for (const s of SUITS_ORDER) for (const r of RANKS) shoe.push({ rank: r, suit: s, id: `${d}-${s}-${r}-${Math.random().toString(36).slice(2,6)}` });
  }
  for (let i = shoe.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shoe[i], shoe[j]] = [shoe[j], shoe[i]];
  }
  return shoe;
}

function cardVal(rank) {
  if (rank === 'A') return 11;
  if (['J','Q','K'].includes(rank)) return 10;
  return parseInt(rank, 10);
}

// ─── Hi-lo counting (coach) ────────────────────────────
// 2-6 = +1 · 7-9 = 0 · 10/J/Q/K/A = -1. A full shoe sums to zero, so the
// running count of everything the player has SEEN is simply the negative of
// the remaining shoe's sum — minus the dealer's hole card while it's hidden.
// Derived, never bookkept: there is no card-by-card tally to drift or leak.
const TEN_VALUE = { '10': true, J: true, Q: true, K: true };
function hiLo(rank) {
  if (rank === 'A' || TEN_VALUE[rank]) return -1;
  if (rank === '7' || rank === '8' || rank === '9') return 0;
  return 1;
}

function handValue(cards) {
  let total = 0, aces = 0;
  for (const c of cards) {
    if (c.rank === 'A') { aces++; total += 11; }
    else total += cardVal(c.rank);
  }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return { total, soft: aces > 0 };
}

function isBlackjack(cards) {
  if (cards.length !== 2) return false;
  return handValue(cards).total === 21;
}

// ─── Coach copy layer ──────────────────────────────────
// Turns the engine's numbers into one plain-English sentence plus readable
// odds. No jargon: probabilities always read as "N out of 100 hands".

// Round [win, push, lose] to integers that sum to exactly 100, largest
// remainder first, so the bars and the prose always quote the same numbers.
function roundTo100(probs) {
  const raw = probs.map(p => p * 100);
  const floors = raw.map(Math.floor);
  let left = 100 - floors.reduce((a, b) => a + b, 0);
  const order = raw.map((v, i) => [v - floors[i], i]).sort((a, b) => b[0] - a[0]);
  for (let k = 0; k < order.length && left > 0; k++, left--) floors[order[k][1]]++;
  return floors;
}

function upName(rank) {
  if (rank === 'A') return 'ace';
  if (['J','Q','K'].includes(rank)) return 'ten';
  return rank;
}

// "an ace", "an 8", "a 9"
function aAn(word) {
  return /^(a|e|i|o|u|8)/i.test(word) ? `an ${word}` : `a ${word}`;
}

function barFor(a, primary) {
  const [win, push, lose] = roundTo100([a.win, a.push, a.lose]);
  return { label: a.action, win, push, lose, primary: !!primary };
}

function buildPlayHint(d, ctx) {
  // d: BJ_STRATEGY.decide() result · ctx: { bet, bankroll, dealerUpRank, isSplitHand, cardsCount }
  const best = d.best;
  // The comparison is always against the best PLAYING alternative — a
  // surrender bar is a solid red block and reads as noise, even in the odd
  // spots (like 12 vs 8) where surrender technically out-EVs standing.
  const runner = d.candidates.find(c => c !== best && c.action !== 'Surrender') || null;
  const up = upName(ctx.dealerUpRank);
  const dealerBust = Math.round(d.dealerBust * 100);
  const bustNext = Math.round(d.bustNext * 100);
  const bestBar = barFor(best, true);
  const total = d.total;

  // Textbook note — when the by-the-book play isn't possible right now.
  let textbookNote = null;
  if (d.shortOfChips && d.ideal) {
    const shortBy = ctx.bet - ctx.bankroll;
    textbookNote = `Textbook says ${d.ideal.action.toLowerCase()} — needs $${shortBy} more behind it.`;
  } else if (ctx.cardsCount === 2 && ctx.isSplitHand && !d.soft &&
             ((total === 16 && ['9','10','J','Q','K','A'].includes(ctx.dealerUpRank)) || (total === 15 && cardVal(ctx.dealerUpRank) === 10))) {
    textbookNote = 'Textbook says surrender — not after splitting.';
  } else if (ctx.cardsCount > 2 && !d.soft &&
             ((total === 16 && ['9','10','J','Q','K','A'].includes(ctx.dealerUpRank)) || (total === 15 && cardVal(ctx.dealerUpRank) === 10))) {
    textbookNote = 'Textbook says surrender — off the table once you hit.';
  }

  // Why sentence by situation class.
  let why;
  const a = best.action;
  if (a === 'Stand') {
    if (!d.soft && total <= 16 && cardVal(ctx.dealerUpRank) <= 6) {
      why = `The dealer's ${up} is in trouble — they bust ${dealerBust} times out of 100 from there. Stay put and let them wreck their own hand.`;
    } else if (d.isPair && total === 20) {
      why = `Twenty wins ${bestBar.win} hands out of 100 just sitting there. Don't break up a winner for two maybes.`;
    } else {
      why = `${total} is a made hand. Hitting wrecks it more often than it helps — make the dealer come to you.`;
    }
  } else if (a === 'Hit') {
    if (d.soft) {
      why = `Your ace bends — it counts as 1 if it must, so this card can't bust you. That's a free swing at a better hand.`;
    } else if (total <= 11) {
      why = `You can't bust from ${total} — every card helps. Take one and build something the dealer has to beat.`;
    } else {
      why = `Standing on ${total} only wins if the dealer busts, and ${aAn(up)} rarely does (${dealerBust} in 100). ${bustNext} of 100 hits go over — and hitting is still your better play.`;
    }
  } else if (a === 'Double') {
    why = `Same one card either way — doubling just puts another $${ctx.bet} out while the odds lean your way.`;
  } else if (a === 'Split') {
    if (d.isPair && ctx.pairRank === 'A') {
      why = `Two aces locked together make a clumsy ${total}. Apart, each one starts a fresh hand at eleven.`;
    } else if (d.isPair && ctx.pairRank === '8') {
      why = `Sixteen is the worst seat in the house. Two hands starting from 8 dodge it entirely.`;
    } else {
      why = `One ${ctx.pairRank}-${ctx.pairRank} hand is stuck at ${total}; two fresh starts aren't. Splitting wins more across both hands.`;
    }
  } else if (a === 'Surrender') {
    const alt = runner;
    const altLose = alt ? roundTo100([alt.win, alt.push, alt.lose])[2] : null;
    why = `Hard truth: ${total} against ${aAn(up)} loses about ${altLose} times in 100 however you play it. Take $${Math.ceil(ctx.bet / 2)} back and live to bet again.`;
  }

  // Bars: recommended + runner-up. Surrender shows only the best playing
  // alternative (its own bar would be a solid red "lose" block).
  let bars, chip = null, moneyLine = null;
  const evGapDollars = runner ? (best.ev - runner.ev) * ctx.bet : 99;
  const closeCall = runner && Math.abs(evGapDollars) < 1;

  if (a === 'Surrender') {
    bars = runner ? [barFor(runner, false)] : [];
    chip = `Keeps $${Math.ceil(ctx.bet / 2)} of your $${ctx.bet}`;
    const extra = runner ? Math.round((-runner.ev * ctx.bet) - ctx.bet / 2) : 0;
    if (extra >= 1) moneyLine = `≈ $${extra} cheaper than playing it out.`;
  } else {
    bars = runner ? [bestBar, barFor(runner, false)] : [bestBar];
    if (closeCall) {
      chip = 'Coin flip — either works';
      why = why + ` (Honestly, it's close — the book leans ${a.toLowerCase()}.)`;
    } else if (a === 'Double' || a === 'Split') {
      const delta = Math.round(evGapDollars);
      if (delta >= 1) chip = `≈ +$${delta} per hand vs ${runner.action.toLowerCase()}`;
      moneyLine = a === 'Double' ? `+$${ctx.bet} rides on one card.` : `Each split hand plays for $${ctx.bet}.`;
    } else if (runner) {
      const runnerBar = bars[1];
      const dWin = bestBar.win - runnerBar.win;
      if (dWin > 0) chip = `+${dWin} more wins per 100 than ${runner.action.toLowerCase()}`;
      else {
        const dLose = runnerBar.lose - bestBar.lose;
        if (dLose > 0) chip = `Loses ${dLose} fewer per 100 than ${runner.action.toLowerCase()}`;
      }
    }
  }

  return {
    kind: 'play',
    action: a,
    why, textbookNote, bars, chip, moneyLine,
    stats: [
      { label: 'Dealer busts', value: `${dealerBust}%` },
      ...(bustNext > 0 ? [{ label: 'Bust if you hit', value: `${bustNext}%` }] : []),
    ],
  };
}

// ─── App ──────────────────────────────────────────────
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "playerName": "Alex",
  "dealerName": "Melissa",
  "showHints": true,
  "feltColor": "emerald",
  "startingBankroll": 1000,
  "soundOn": false
}/*EDITMODE-END*/;

function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // Persistent — bankroll lives in shared casino store
  const [bankroll, setBankroll] = useState(() =>
    (window.CASINO_BANKROLL ? window.CASINO_BANKROLL.read() : tweaks.startingBankroll)
  );
  const [stats, setStats] = useState({ played: 0, won: 0, bj: 0, best: tweaks.startingBankroll, tipsGiven: 0 });
  const [streak, setStreak] = useState(0);
  const [lossStreak, setLossStreak] = useState(0);
  const [showBrokeModal, setShowBrokeModal] = useState(false);

  // Mirror bankroll into shared store on every change.
  useEffect(() => {
    if (window.CASINO_BANKROLL) window.CASINO_BANKROLL.write(bankroll);
  }, [bankroll]);

  // Adopt the cloud bankroll when sync hydrates after mount — otherwise the
  // next local write would clobber a balance synced from another device.
  useEffect(() => {
    const onHydrated = () => { if (window.CASINO_BANKROLL) setBankroll(window.CASINO_BANKROLL.read()); };
    window.addEventListener('casino:hydrated', onHydrated);
    return () => window.removeEventListener('casino:hydrated', onHydrated);
  }, []);

  // Portrait/landscape canvas — chosen by the resize script in index.html.
  const [portrait, setPortrait] = useState(() => !!(window.BJ_CANVAS && window.BJ_CANVAS.portrait));
  useEffect(() => {
    const onCanvas = () => setPortrait(!!(window.BJ_CANVAS && window.BJ_CANVAS.portrait));
    window.addEventListener('bj:canvas', onCanvas);
    return () => window.removeEventListener('bj:canvas', onCanvas);
  }, []);

  // Round
  const [phase, setPhase] = useState('idle');
  const shoeRef = useRef(null);
  if (!shoeRef.current) shoeRef.current = buildShoe(6);
  const dealerStartedRef = useRef(false);
  const [bet, setBet] = useState([]);
  const [lastBet, setLastBet] = useState([]);
  const [dealer, setDealer] = useState([]);
  const [hands, setHands] = useState([]); // [{cards, bet, doubled, surrendered, stood, busted, isSplitAces}]
  const [activeHandIdx, setActiveHandIdx] = useState(0);
  const [holeRevealed, setHoleRevealed] = useState(false);
  const [results, setResults] = useState([]); // per hand
  const [insurance, setInsurance] = useState(0); // amount wagered on insurance
  const [insuranceOffered, setInsuranceOffered] = useState(false);
  const [blockedMsg, setBlockedMsg] = useState(null); // why a dimmed button can't be used
  const blockedTimerRef = useRef(null);

  // Dealer messaging + idle
  const [expression, setExpression] = useState('idle');
  const [message, setMessage] = useState('');
  const [tipped, setTipped] = useState(false);
  const [isIdle, setIsIdle] = useState(false);
  const [mood, setMood] = useState(0);
  const [showNameModal, setShowNameModal] = useState(false);
  const idleTimerRef = useRef(null);

  // Player name persistence
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

  const ctx = { player: tweaks.playerName, dealer: tweaks.dealerName };

  function nudgeMood(delta) {
    setMood(m => Math.max(-1, Math.min(1, m + delta)));
  }

  function say(key, expr, extra) {
    setMessage(pickLine(key, extra ? { ...ctx, ...extra } : ctx));
    if (expr) {
      setExpression(expr);
      const moodDelta = (expr === 'happy' || expr === 'celebrate') ? 0.18
        : expr === 'shocked' ? 0.10
        : (expr === 'smirk' || expr === 'leanin') ? 0.08
        : expr === 'wince' ? -0.12
        : (expr === 'sad' || expr === 'bust') ? -0.18
        : 0;
      if (moodDelta) nudgeMood(moodDelta);
    }
  }

  // Mood decay toward 0
  useEffect(() => {
    const id = setInterval(() => {
      setMood(m => Math.abs(m) < 0.02 ? 0 : m * 0.94);
    }, 2500);
    return () => clearInterval(id);
  }, []);

  // Broke detection — pop modal when bankroll falls below smallest chip and
  // the player isn't mid-round.
  useEffect(() => {
    if ((phase === 'idle' || phase === 'bet') && bankroll < 5 && bet.length === 0) {
      setShowBrokeModal(true);
    } else if (bankroll >= 5 && showBrokeModal) {
      setShowBrokeModal(false);
    }
  }, [phase, bankroll, bet.length]);

  // Greeting on mount, dealer change, or name change
  useEffect(() => {
    setMessage(pickLine('greet', { player: tweaks.playerName, dealer: tweaks.dealerName }));
    setExpression('idle');
  }, [tweaks.dealerName, tweaks.playerName]);

  // Idle behavior — after 12s of inactivity, prompt
  useEffect(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (phase === 'idle' || phase === 'bet') {
      idleTimerRef.current = setTimeout(() => {
        setIsIdle(true);
        setMessage(pickLine('idle_long', ctx));
      }, 12000);
    } else {
      setIsIdle(false);
    }
    return () => { if (idleTimerRef.current) clearTimeout(idleTimerRef.current); };
  }, [phase, message]);

  // She notices you stalling — nine seconds of inaction mid-hand earns the
  // thinking pose. Any action resets it (hands changes on every card).
  useEffect(() => {
    if (phase !== 'player') return;
    const t = setTimeout(() => setExpression('thinking'), 9000);
    return () => clearTimeout(t);
  }, [phase, hands, activeHandIdx]);

  const totalBet = bet.reduce((a,b)=>a+b, 0);

  function showBlocked(msg) {
    if (!msg) return;
    setBlockedMsg(msg);
    if (blockedTimerRef.current) clearTimeout(blockedTimerRef.current);
    blockedTimerRef.current = setTimeout(() => setBlockedMsg(null), 2800);
  }

  function addChip(value) {
    if (phase !== 'idle' && phase !== 'bet') return;
    if (bankroll < value) return;
    setBet(b => [...b, value]);
    setBankroll(br => br - value);
    setPhase('bet');
    setIsIdle(false);
    if (tweaks.soundOn) SFX.chip();
    // React when the bet crosses a tier, not on every chip stacked past it —
    // otherwise building a big bet chip-by-chip gasps once per click.
    const prevTotal = totalBet;
    const newTotal = prevTotal + value;
    if (newTotal >= 500) {
      if (prevTotal < 500) say('bet_huge', 'shocked');
    } else if (newTotal >= 100) {
      if (prevTotal < 100) say('bet_high', 'leanin');
    } else {
      say('bet_low', 'idle');
    }
  }
  function clearBet() {
    setBankroll(br => br + totalBet);
    setBet([]);
    setPhase('idle');
    say('idle', 'idle');
  }
  function rebet() {
    if (!lastBet.length) return;
    const sum = lastBet.reduce((a,b)=>a+b,0);
    if (bankroll < sum) return;
    setBet(lastBet);
    setBankroll(br => br - sum);
    setPhase('bet');
    say('rebet', 'happy');
  }

  // Deal a round with an explicit chip stack — both the Deal button and
  // Rebet&Deal route through here so there are no stale-closure paths.
  function startRound(chips) {
    const roundBet = chips.reduce((a,b)=>a+b, 0);
    if (!roundBet) return;
    if (shoeRef.current.length < 80) shoeRef.current = buildShoe(6);
    dealerStartedRef.current = false;
    if (tweaks.soundOn) { SFX.deal(); [0,150,300,450].forEach(d=>setTimeout(()=>SFX.card(), d)); }
    setBet(chips);
    setLastBet(chips);
    setResults([]);
    setHoleRevealed(false);
    setInsurance(0);
    setInsuranceOffered(false);
    setActiveHandIdx(0);
    setBlockedMsg(null);
    setPhase('dealing');
    setExpression('deal');

    const p1 = shoeRef.current.pop(), d1 = shoeRef.current.pop(), p2 = shoeRef.current.pop(), d2 = shoeRef.current.pop();

    const newPlayer = [p1, p2];
    const newDealer = [d1, d2];
    setHands([{ cards: newPlayer, bet: roundBet, doubled: false, surrendered: false, stood: false, busted: false, isSplitAces: false }]);
    setDealer(newDealer);

    say('deal', 'deal');

    setTimeout(() => {
      const pBJ = isBlackjack(newPlayer);
      const dUpAce = newDealer[0].rank === 'A';
      const dBJ = isBlackjack(newDealer);

      if (dUpAce && !pBJ) {
        // Offer insurance
        setInsuranceOffered(true);
        setPhase('insurance');
        say('insurance', 'peek');
        return;
      }

      if (pBJ || dBJ) {
        setHoleRevealed(true);
        setTimeout(() => resolveImmediate(newPlayer, newDealer, roundBet), 700);
      } else {
        setPhase('player');
        const v = handValue(newPlayer).total;
        if (v === 21) setMessage('Twenty-one!');
        else if (v === 11) setMessage(`Eleven. The doubling temptation is real, ${tweaks.playerName}.`);
        else setMessage(pickLine('idle', ctx));
        setTimeout(() => setExpression('idle'), 700);
      }
    }, 1400);
  }

  function deal() {
    if (phase !== 'idle' && phase !== 'bet') return;
    startRound(bet);
  }

  const canRebet = lastBet.length > 0 && bankroll >= lastBet.reduce((a,b)=>a+b,0);

  function rebetAndDeal() {
    if (phase !== 'resolved') return;
    const sum = lastBet.reduce((a,b)=>a+b,0);
    if (!sum || bankroll < sum) return;
    setBankroll(br => br - sum);
    startRound(lastBet);
  }

  function takeInsurance(yes) {
    if (phase !== 'insurance' || !insuranceOffered) return;
    setInsuranceOffered(false);
    setPhase('dealing'); // lock input during the reveal beat
    const baseBet = hands[0].bet;
    const insAmt = Math.floor(baseBet / 2);
    const took = yes && bankroll >= insAmt;
    if (took) {
      setBankroll(br => br - insAmt);
      setInsurance(insAmt);
    }
    const dBJ = isBlackjack(dealer);
    setTimeout(() => {
      if (dBJ) {
        setHoleRevealed(true);
        if (took) setBankroll(br => br + insAmt * 3); // win insurance: stake + 2x stake
        finishHand(0, 'lose', baseBet, baseBet);
        setStreak(0);
        setLossStreak(ls => ls + 1);
        setPhase('resolved');
        say('dealer_win', 'smirk');
      } else {
        setPhase('player');
        setExpression('idle');
        setMessage(took ? `No blackjack under there — insurance is mine. Play on, ${tweaks.playerName}.` : pickLine('idle', ctx));
      }
    }, 700);
  }

  function resolveImmediate(p, d, betAmt) {
    const pBJ = isBlackjack(p), dBJ = isBlackjack(d);
    if (pBJ && dBJ) {
      finishHand(0, 'push', betAmt, 0);
      setPhase('resolved');
      setBankroll(br => br + betAmt);
      say('push', 'shrug');
    } else if (pBJ) {
      finishHand(0, 'blackjack', betAmt, Math.floor(betAmt * 1.5));
      setPhase('resolved');
      setBankroll(br => {
        const nb = br + betAmt + Math.floor(betAmt * 1.5);
        if (window.CASINO_STATS) window.CASINO_STATS.recordPeak(nb);
        setStats(s => ({ ...s, best: Math.max(s.best, nb) }));
        return nb;
      });
      setStreak(s => {
        const ns = s + 1;
        announceStreak(ns, true);
        return ns;
      });
      setLossStreak(0);
      if (tweaks.soundOn) SFX.bj();
      say('player_bj', 'celebrate');
    } else if (dBJ) {
      finishHand(0, 'lose', betAmt, betAmt);
      setPhase('resolved');
      setStreak(0);
      setLossStreak(ls => ls + 1);
      say('dealer_win', 'smirk');
    }
  }

  function announceStreak(s, immediate = false) {
    setTimeout(() => {
      if (s >= 5 && s % 5 === 0) say('streak5', 'celebrate');
      else if (s === 3) say('streak3', 'happy');
      else if (s === 2) say('streak2', 'happy');
    }, immediate ? 1500 : 800);
  }

  function finishHand(idx, kind, betAmt, payout) {
    setResults(prev => {
      const next = [...prev];
      next[idx] = { kind, payout, betAmt };
      return next;
    });
    setHands(prev => {
      const next = [...prev];
      if (kind === 'bust') next[idx] = { ...next[idx], busted: true };
      if (kind === 'blackjack') next[idx] = { ...next[idx], stood: true };
      return next;
    });
    recordHandEvent({ kind, betAmt, payout });
  }

  // Per-hand stats recording — every resolution path (natural, insurance
  // loss, surrender, dealer showdown) funnels through here exactly once, so
  // the rail counters and the shared lifetime stats can't drift apart.
  function recordHandEvent(r) {
    const won = r.kind === 'win' || r.kind === 'blackjack';
    setStats(s => ({
      ...s,
      played: s.played + 1,
      won: s.won + (won ? 1 : 0),
      bj: s.bj + (r.kind === 'blackjack' ? 1 : 0),
    }));
    if (!window.CASINO_STATS) return;
    const payout = won ? Math.max(0, Number(r.payout) || 0) : 0;
    window.CASINO_STATS.recordEvent('blackjack', {
      won,
      payout,
      rare: r.kind === 'blackjack' ? 'blackjack' : null,
    });
  }

  // Player actions
  function curHand() { return hands[activeHandIdx]; }

  function hit() {
    if (phase !== 'player') return;
    const h = curHand();
    if (!h || h.stood || h.busted || h.surrendered) return;
    if (tweaks.soundOn) SFX.card();
    const c = shoeRef.current.pop();
    const newCards = [...h.cards, c];
    const v = handValue(newCards).total;
    // Terminal flags set synchronously — the 700ms beat is presentation only,
    // so no second action can sneak in and run the dealer twice.
    setHands(prev => prev.map((x,i) => i===activeHandIdx
      ? { ...x, cards: newCards, busted: v > 21, stood: v === 21 ? true : x.stood }
      : x));
    setExpression('glance');
    if (v > 21) {
      say('bust', 'wince', { total: v });
      if (tweaks.soundOn) SFX.bust();
      setTimeout(() => advanceHand(), 700);
    } else if (v === 21) {
      setTimeout(() => { setExpression('idle'); advanceHand(); }, 700);
    } else {
      if (Math.random() < 0.4) setMessage(pickLine('hit', ctx));
      setTimeout(() => setExpression('idle'), 700);
    }
  }

  function stand() {
    if (phase !== 'player') return;
    const h = curHand();
    if (!h || h.stood || h.busted || h.surrendered) return;
    setHands(prev => prev.map((x,i) => i===activeHandIdx ? {...x, stood: true} : x));
    if (Math.random() < 0.5) say('stand', 'idle');
    advanceHand();
  }

  function double() {
    if (phase !== 'player') return;
    const h = curHand();
    if (!h || h.stood || h.busted || h.surrendered) return;
    if (h.cards.length !== 2 || h.isSplitAces || bankroll < h.bet) return;
    setBankroll(br => br - h.bet);
    // Doubling is routine basic strategy — the gasp is only earned when
    // there's real money riding on the one card.
    say('double', h.bet >= 100 ? 'shocked' : 'happy');
    if (tweaks.soundOn) SFX.chip();
    const c = shoeRef.current.pop();
    const newCards = [...h.cards, c];
    const v = handValue(newCards).total;
    setHands(prev => prev.map((x,i) => i===activeHandIdx
      ? { ...x, cards: newCards, bet: x.bet * 2, doubled: true, stood: true, busted: v > 21 }
      : x));
    setTimeout(() => {
      if (v > 21) say('bust', 'wince', { total: v });
      advanceHand();
    }, 600);
  }

  function split() {
    if (phase !== 'player') return;
    const h = curHand();
    if (!h || h.stood || h.busted || h.surrendered || h.isSplitAces) return;
    if (h.cards.length !== 2 || h.cards[0].rank !== h.cards[1].rank) return;
    if (hands.length >= 4 || bankroll < h.bet) return;
    setBankroll(br => br - h.bet);
    say('split', 'happy');
    if (tweaks.soundOn) SFX.chip();
    const isAces = h.cards[0].rank === 'A';
    const c1 = shoeRef.current.pop();
    const c2 = shoeRef.current.pop();

    const hand1 = { cards: [h.cards[0], c1], bet: h.bet, doubled: false, surrendered: false, stood: isAces, busted: false, isSplitAces: isAces };
    const hand2 = { cards: [h.cards[1], c2], bet: h.bet, doubled: false, surrendered: false, stood: isAces, busted: false, isSplitAces: isAces };

    setHands(prev => {
      const arr = [...prev];
      arr.splice(activeHandIdx, 1, hand1, hand2);
      return arr;
    });

    if (isAces) {
      // split aces: one card each, no more
      setTimeout(advanceHand, 800);
    }
  }

  function surrender() {
    if (phase !== 'player') return;
    const h = curHand();
    if (!h || h.stood || h.busted || h.surrendered) return;
    if (h.cards.length !== 2 || hands.length > 1) return;
    say('surrender', 'sad');
    const refund = Math.ceil(h.bet / 2); // round the player's half up
    finishHand(activeHandIdx, 'surrender', h.bet, refund);
    setBankroll(br => br + refund);
    setHands(prev => prev.map((x,i) => i===activeHandIdx ? {...x, surrendered: true, stood: true} : x));
    setStreak(0);
    setLossStreak(ls => ls + 1);
    setHoleRevealed(true);
    setPhase('resolved');
  }

  function advanceHand() {
    setHands(currentHands => {
      const nextIdx = currentHands.findIndex((h, i) => i > activeHandIdx && !h.stood && !h.busted);
      if (nextIdx >= 0) {
        setActiveHandIdx(nextIdx);
        return currentHands;
      }
      // all hands resolved → dealer plays (exactly once)
      if (dealerStartedRef.current) return currentHands;
      dealerStartedRef.current = true;
      const allBusted = currentHands.every(h => h.busted);
      setPhase('dealer');
      setHoleRevealed(true);
      if (!allBusted) say('stand', 'idle');
      runDealer([...dealer], currentHands);
      return currentHands;
    });
  }

  function runDealer(dCards, finalHands) {
    let cards = [...dCards];

    const allBusted = finalHands.every(h => h.busted || h.surrendered);
    if (allBusted) {
      // no need to draw
      setTimeout(() => resolveAll(cards, finalHands), 600);
      return;
    }

    function step() {
      const v = handValue(cards);
      if (v.total < 17) {
        const c = shoeRef.current.pop();
        cards = [...cards, c];
        setDealer(cards);
        if (tweaks.soundOn) SFX.card();
        setTimeout(step, 600);
      } else {
        setTimeout(() => resolveAll(cards, finalHands), 500);
      }
    }
    setTimeout(step, 600);
  }

  function resolveAll(dCards, finalHands) {
    const dv = handValue(dCards).total;
    const dBust = dv > 21;
    // Dealer busts ~28% of hands — that's routine, not shocking. The facepalm
    // 'bust' pose is the one drawn for exactly this moment ("I broke").
    if (dBust) say('dealer_bust', 'bust', { total: dv });

    let totalReturn = 0;
    const newResults = finalHands.map((h) => {
      if (h.surrendered) return { kind:'surrender', payout: Math.ceil(h.bet/2), betAmt: h.bet };
      if (h.busted) return { kind:'bust', payout: h.bet, betAmt: h.bet };
      const pv = handValue(h.cards).total;
      if (dBust) {
        totalReturn += h.bet * 2;
        return { kind:'win', payout: h.bet, betAmt: h.bet };
      }
      if (pv > dv) {
        totalReturn += h.bet * 2;
        return { kind:'win', payout: h.bet, betAmt: h.bet };
      }
      if (pv < dv) {
        return { kind:'lose', payout: h.bet, betAmt: h.bet };
      }
      totalReturn += h.bet;
      return { kind:'push', payout: 0, betAmt: h.bet };
    });

    setResults(newResults);
    setBankroll(br => {
      const nb = br + totalReturn;
      if (window.CASINO_STATS) window.CASINO_STATS.recordPeak(nb);
      setStats(s => ({ ...s, best: Math.max(s.best, nb) }));
      return nb;
    });
    // Record each hand resolution (naturals/surrenders resolved earlier never reach here)
    newResults.forEach(recordHandEvent);

    // streaks based on net result
    const wins = newResults.filter(r => r.kind === 'win' || r.kind === 'blackjack').length;
    const losses = newResults.filter(r => r.kind === 'lose' || r.kind === 'bust' || r.kind === 'surrender').length;
    if (wins > losses) {
      setStreak(s => {
        const ns = s + 1;
        announceStreak(ns);
        return ns;
      });
      setLossStreak(0);
      if (tweaks.soundOn) SFX.win();
    } else if (losses > wins) {
      setStreak(0);
      setLossStreak(ls => {
        const nl = ls + 1;
        if (nl >= 3) setTimeout(() => say('losing_streak', 'sad'), 1500);
        return nl;
      });
      if (tweaks.soundOn) SFX.lose();
    } else {
      if (tweaks.soundOn) SFX.push();
    }

    setPhase('resolved');

    if (!dBust) {
      // pick line based on overall outcome
      setTimeout(() => {
        if (wins > losses) say('player_win', 'sad');
        else if (losses > wins) say('dealer_win', 'smirk');
        else say('push', 'shrug');
      }, 800);
    }
  }

  function nextRound() {
    setBet([]);
    setHands([]); setDealer([]);
    setResults([]); setHoleRevealed(false);
    setInsurance(0); setInsuranceOffered(false);
    setActiveHandIdx(0);
    setBlockedMsg(null);
    dealerStartedRef.current = false;
    setPhase('idle');
    setExpression('idle');
    setMessage(pickLine('idle', ctx));
    if (shoeRef.current.length < 80) shoeRef.current = buildShoe(6);
  }

  function tipDealer() {
    if (tipped || bankroll < 5) return;
    if (tweaks.soundOn) SFX.tip();
    setBankroll(br => br - 5);
    setTipped(true);
    setExpression('happy');
    nudgeMood(0.35);
    setStats(s => ({...s, tipsGiven: s.tipsGiven + 1}));
    if (stats.tipsGiven > 0) {
      setMessage(pickLine('after_tip', ctx));
    } else {
      setMessage(`Aw — thank you, ${tweaks.playerName}. That's sweet of you. ✨`);
    }
    setTimeout(() => setTipped(false), 30000);
  }

  // Derived
  const activeHand = hands[activeHandIdx];
  const pCards = activeHand?.cards || [];
  const pBJ = phase !== 'idle' && hands.length === 1 && isBlackjack(pCards);

  // The dealer's printed total waits for the card to actually arrive — the
  // deal-in flight and the hole-card flip both run ~.55s, and updating the
  // number on state change announced every draw half a beat early.
  const [shownDVal, setShownDVal] = useState(null); // { total, soft, bj } | null
  useEffect(() => {
    if (dealer.length === 0) { setShownDVal(null); return; }
    const target = {
      ...(holeRevealed ? handValue(dealer) : handValue(dealer.slice(0, 1))),
      bj: holeRevealed && isBlackjack(dealer)
    };
    const t = setTimeout(() => setShownDVal(target), 550);
    return () => clearTimeout(t);
  }, [dealer, holeRevealed]);

  function doubleAvailability() {
    if (phase !== 'player' || !activeHand) return { enabled: false, reason: '' };
    if (activeHand.cards.length !== 2) return { enabled: false, reason: 'Double is only allowed on your first two cards — you\'ve already hit.' };
    if (activeHand.isSplitAces) return { enabled: false, reason: 'Split aces get exactly one card — no doubling.' };
    if (bankroll < activeHand.bet) return { enabled: false, reason: `Doubling needs $${activeHand.bet - bankroll} more than you have.` };
    return { enabled: true, reason: '' };
  }
  function splitAvailability() {
    if (phase !== 'player' || !activeHand) return { enabled: false, reason: '' };
    if (activeHand.isSplitAces || activeHand.stood) return { enabled: false, reason: 'Split aces get exactly one card each.' };
    if (activeHand.cards.length !== 2) return { enabled: false, reason: 'Split is only allowed on your first two cards.' };
    if (activeHand.cards[0].rank !== activeHand.cards[1].rank) return { enabled: false, reason: 'Split needs a pair — both cards the same rank.' };
    if (hands.length >= 4) return { enabled: false, reason: 'Four hands is the table limit.' };
    if (bankroll < activeHand.bet) return { enabled: false, reason: `Splitting needs $${activeHand.bet - bankroll} more than you have.` };
    return { enabled: true, reason: '' };
  }
  function surrenderAvailability() {
    if (phase !== 'player' || !activeHand) return { enabled: false, reason: '' };
    if (hands.length !== 1) return { enabled: false, reason: 'No surrendering after a split.' };
    if (activeHand.cards.length !== 2) return { enabled: false, reason: 'Surrender is only allowed before you hit.' };
    return { enabled: true, reason: '' };
  }
  const dblAvail = doubleAvailability();
  const splAvail = splitAvailability();
  const surAvail = surrenderAvailability();
  const canDouble = dblAvail.enabled;
  const canSplit = splAvail.enabled;
  const canSurrender = surAvail.enabled;

  // Shoe count as the player sees it — the hole card stays out of the tally
  // until it's revealed, so the coach never knows more than an honest counter.
  function readCount() {
    const shoe = shoeRef.current || [];
    let remSum = 0, tensUnseen = 0, unseen = shoe.length;
    for (const c of shoe) { remSum += hiLo(c.rank); if (TEN_VALUE[c.rank]) tensUnseen++; }
    let running = -remSum;
    if (dealer.length > 1 && !holeRevealed) {
      running -= hiLo(dealer[1].rank);
      if (TEN_VALUE[dealer[1].rank]) tensUnseen++;
      unseen++;
    }
    const decksLeft = Math.max(unseen / 52, 0.25);
    const trueCount = running / decksLeft;
    // 6-deck S17 DAS LS baseline ≈ -0.5%; each +1 true count ≈ +0.5% to you.
    const edge = -0.5 + 0.5 * trueCount;
    return { running, trueCount, decksLeft, edge, tensPct: (tensUnseen / Math.max(unseen, 1)) * 100 };
  }

  // Coach hint — exact EV over the actions available right now.
  const hint = useMemo(() => {
    if (!tweaks.showHints) return null;
    const count = readCount();
    const fmtTc = (n) => (n > 0 ? '+' : '') + n.toFixed(1);

    if (phase === 'idle' || phase === 'bet') {
      const roll = bankroll + totalBet;
      if (roll < 5) return null;
      const base = Math.max(5, Math.min(100, Math.round(roll * 0.025 / 5) * 5));
      const tc = count.trueCount;
      const cur = totalBet;

      if (tc >= 2) {
        // Ten-rich shoe: this is the moment counting exists for.
        const spread = Math.min(6, Math.floor(tc));
        const cap = Math.max(5, Math.round(roll * 0.1 / 5) * 5);
        const suggested = Math.max(base, Math.min(base * spread, cap));
        return {
          kind: 'bet',
          action: `$${suggested}`,
          why: `The shoe is running ten-rich — true count ${fmtTc(tc)}, edge ≈ ${count.edge >= 0 ? '+' : ''}${count.edge.toFixed(1)}% to you. This is the spot counters press: about ${spread}× the steady bet while it lasts.`,
          stats: [{ label: 'Steady bet', value: `$${base}` }],
          count,
        };
      }
      if (tc <= -1) {
        return {
          kind: 'bet',
          action: '$5',
          why: `Shoe's gone cold — true count ${fmtTc(tc)}, mostly small cards left. Counters ride the table minimum here and wait for the shuffle.`,
          stats: [{ label: 'Steady bet', value: `$${base}` }],
          count,
        };
      }
      if (cur > 0 && cur > roll * 0.1) {
        return {
          kind: 'bet',
          action: `$${base}`,
          why: `Big swings, short nights — $${cur} is over a tenth of your stack. Your call, high roller.`,
          stats: [{ label: 'Cold hands of cushion', value: Math.max(0, Math.floor((roll - cur) / cur)) }],
          count,
        };
      }
      return {
        kind: 'bet',
        action: `$${base}`,
        why: `The steady play — enough behind it to ride out ${Math.floor(roll / base)} cold hands in a row and still be in the game.`,
        stats: [{ label: 'Table minimum', value: '$5' }],
        count,
      };
    }

    if (phase === 'insurance') {
      const baseBet = hands[0] ? hands[0].bet : totalBet;
      const insCost = Math.floor(baseBet / 2);
      // Exact: share of unseen cards that are ten-value — the hole card is
      // one draw from that pool. Break-even is 1 in 3.
      const pBJpct = count.tensPct;
      const pRound = Math.round(pBJpct);
      if (pBJpct > 100 / 3) {
        const gainPerTake = Math.max(1, Math.round(insCost * (3 * pBJpct / 100 - 1)));
        return {
          kind: 'insurance',
          action: 'Take it',
          why: `The count flips this one: the shoe is so ten-rich that ${pRound} aces in 100 are hiding a ten — past the 33 break-even. Worth about $${gainPerTake} a take. The rare time insurance is a bet, not a tax.`,
          insurance: { pBJ: pRound, breakEven: 33 },
          count,
        };
      }
      const lossPerTake = Math.max(1, Math.round(insCost * (1 - 3 * pBJpct / 100)));
      return {
        kind: 'insurance',
        action: 'No thanks',
        why: `Right now ${pRound} aces in 100 have a ten hiding underneath, but the payout breaks even at 33. On $${insCost} a take, that's about $${lossPerTake} burned each time. Wave it off.`,
        insurance: { pBJ: pRound, breakEven: 33 },
        count,
      };
    }

    if (phase !== 'player') return null;
    const h = hands[activeHandIdx];
    if (!h || h.cards.length < 2 || h.stood || h.busted || h.surrendered) return null;
    const decision = window.BJ_STRATEGY.decide(h.cards, dealer[0] && dealer[0].rank, {
      double: canDouble,
      split: canSplit,
      surrender: canSurrender,
      doubleRuleBlocked: h.cards.length !== 2 || h.isSplitAces,
      splitRuleBlocked: h.cards.length !== 2 || h.cards[0].rank !== h.cards[1].rank || hands.length >= 4,
      surrenderRuleBlocked: h.cards.length !== 2 || hands.length !== 1,
    });
    if (!decision) return null;
    const played = buildPlayHint(decision, {
      bet: h.bet,
      bankroll,
      dealerUpRank: dealer[0].rank,
      isSplitHand: hands.length > 1,
      cardsCount: h.cards.length,
      pairRank: h.cards.length === 2 && h.cards[0].rank === h.cards[1].rank ? h.cards[0].rank : null,
    });
    return played ? { ...played, count } : played;
  }, [tweaks.showHints, phase, hands, activeHandIdx, dealer, holeRevealed, bankroll, totalBet, canDouble, canSplit, canSurrender]);

  const overallResult = useMemo(() => {
    if (phase !== 'resolved' || !results.length) return null;
    if (results.length === 1) return results[0];
    // composite for split hands
    const totalPayout = results.reduce((a,r) =>
      a + (r.kind==='win' || r.kind==='blackjack' ? r.payout
        : r.kind==='surrender' ? -(r.betAmt - r.payout)
        : r.kind==='lose' || r.kind==='bust' ? -r.betAmt : 0), 0);
    const wins = results.filter(r=>r.kind==='win'||r.kind==='blackjack').length;
    const losses = results.filter(r=>r.kind==='lose'||r.kind==='bust'||r.kind==='surrender').length;
    if (totalPayout > 0) return { kind:'win', payout: totalPayout, mixed: true, wins, losses };
    if (totalPayout < 0) return { kind:'lose', payout: -totalPayout, betAmt: -totalPayout, mixed: true, wins, losses };
    return { kind:'push', payout: 0, mixed: true };
  }, [phase, results]);

  // Keyboard shortcuts — desktop quality-of-life.
  const keysRef = useRef({});
  keysRef.current = { phase, hit, stand, double, split, surrender, deal, nextRound, rebetAndDeal, canDouble, canSplit, canSurrender, totalBet, canRebet };
  useEffect(() => {
    function onKey(e) {
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const K = keysRef.current;
      const k = e.key.toLowerCase();
      if (K.phase === 'player') {
        if (k === 'h') K.hit();
        else if (k === 's') K.stand();
        else if (k === 'd' && K.canDouble) K.double();
        else if (k === 'p' && K.canSplit) K.split();
        else if (k === 'r' && K.canSurrender) K.surrender();
      } else if (K.phase === 'resolved') {
        if (k === 'n') K.nextRound();
        else if (k === 'b' && K.canRebet) K.rebetAndDeal();
      } else if ((K.phase === 'idle' || K.phase === 'bet') && (k === 'enter' || k === ' ')) {
        if (K.totalBet) { e.preventDefault(); K.deal(); }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ── Render ──────────────────────────────────────────
  const bottomZone = (
    <div style={{
      position:'relative', zIndex: 5,
      padding: portrait ? '10px 12px 14px' : '12px 26px 18px',
      minHeight: portrait ? 0 : 212,
      display:'flex', flexDirection:'column', gap: 10, justifyContent:'flex-end'
    }}>
      {hint && (phase === 'idle' || phase === 'bet' || phase === 'insurance' || phase === 'player') && (
        <CoachBar hint={hint} compact={portrait} />
      )}
      {blockedMsg && (
        <div style={{
          alignSelf:'center',
          padding:'6px 16px',
          background:'rgba(20,12,6,.92)',
          border:'1px solid rgba(230,197,144,.4)',
          borderRadius: 999,
          fontSize: 12, color:'var(--ivory)',
          boxShadow:'0 8px 20px rgba(0,0,0,.4)'
        }}>{blockedMsg}</div>
      )}

      {(phase === 'idle' || phase === 'bet') && (
        <BettingZone
          bet={bet}
          bankroll={bankroll}
          onChip={addChip}
          onClear={clearBet}
          onRebet={rebet}
          onDeal={deal}
          canRebet={canRebet}
          compact={portrait}
        />
      )}

      {phase === 'insurance' && (
        <InsuranceZone
          amount={Math.floor((hands[0] ? hands[0].bet : totalBet)/2)}
          bankroll={bankroll}
          onYes={() => takeInsurance(true)}
          onNo={() => takeInsurance(false)}
        />
      )}

      {phase === 'player' && activeHand && (
        <ActionZone
          hint={hint}
          canDouble={canDouble}
          canSplit={canSplit}
          canSurrender={canSurrender}
          doubleReason={dblAvail.reason}
          splitReason={splAvail.reason}
          surrenderReason={surAvail.reason}
          onHit={hit}
          onStand={stand}
          onDouble={double}
          onSplit={split}
          onSurrender={surrender}
          onBlocked={showBlocked}
          betAmount={activeHand.bet}
          compact={portrait}
        />
      )}

      {(phase === 'dealing' || phase === 'dealer') && (
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'center',
          height: portrait ? 70 : 100,
          fontSize: 13, letterSpacing:'.3em', color:'var(--ivory-dim)', textTransform:'uppercase'
        }}>
          <span style={{
            width: 10, height: 10, borderRadius:'50%',
            background:'var(--brass)',
            marginRight: 12,
            animation:'glowPulse 1s ease-in-out infinite'
          }} />
          {phase === 'dealing' ? 'Dealing…' : 'Dealer is playing the hand'}
        </div>
      )}

      {phase === 'resolved' && (
        <ResolvedZone
          result={overallResult}
          onContinue={nextRound}
          onRebet={rebetAndDeal}
          canRebet={canRebet}
        />
      )}
    </div>
  );

  const feltArea = (
    <div style={{ position:'absolute', inset: 0, display:'flex', flexDirection:'column' }}>
      {!portrait && (
        <BrassRail
          bankroll={bankroll}
          streak={streak}
          played={stats.played}
          won={stats.won}
          best={stats.best}
          showHints={tweaks.showHints}
          onToggleHints={() => setTweak('showHints', !tweaks.showHints)}
        />
      )}

      {/* Play area */}
      <div style={{
        flex:1,
        position:'relative',
        padding: portrait ? '4px 12px 0' : '4px 32px 0',
        display:'flex', flexDirection:'column'
      }}>
        <FeltLogo />

        {/* Dealer hand */}
        <div style={{ marginTop: portrait ? 4 : 8, textAlign:'center', position:'relative', zIndex: 3 }}>
          {dealer.length > 0 && shownDVal && <HandValue value={shownDVal.total} soft={shownDVal.soft} isBust={shownDVal.total > 21} isBJ={shownDVal.bj} label="Dealer" />}
          <div style={{ display:'flex', justifyContent:'center', gap: 8, marginTop: 10, minHeight: portrait ? 96 : 110 }}>
            {dealer.map((c, i) => (
              <PlayingCard
                key={c.id}
                rank={c.rank} suit={c.suit}
                w={portrait ? 68 : 78} h={portrait ? 96 : 110}
                faceDown={i === 1 && !holeRevealed}
                dealIndex={i*2+1}
                fromX={140} fromY={-200}
              />
            ))}
          </div>
        </div>

        {overallResult && <ResultBanner kind={overallResult.kind} payout={overallResult.payout} betAmt={overallResult.betAmt} netLoss={overallResult.kind === 'surrender' ? overallResult.betAmt - overallResult.payout : null} />}

        {/* Player hands (potentially split) — anchored just above the action zone */}
        <div style={{
          position:'absolute', left:0, right:0, bottom: portrait ? 10 : 16,
          textAlign:'center', zIndex: 3
        }}>
          <PlayerHandsRow
            hands={hands}
            activeIdx={activeHandIdx}
            results={results}
            pBJ={pBJ}
            shake={overallResult?.kind === 'bust' || (results.length===1 && results[0]?.kind === 'bust')}
            playerName={tweaks.playerName}
            compact={portrait}
          />
        </div>
      </div>

      {bottomZone}
    </div>
  );

  return (
    <div style={{
      width:'100%', height:'100%',
      padding: portrait ? 12 : 20,
      position:'relative',
      display:'flex', flexDirection: portrait ? 'column' : 'row', gap: portrait ? 10 : 20
    }}>
      {portrait ? (
        <>
          <PortraitRail
            bankroll={bankroll}
            streak={streak}
            showHints={tweaks.showHints}
            onToggleHints={() => setTweak('showHints', !tweaks.showHints)}
          />
          <DealerStrip name={tweaks.dealerName} message={message} gender={tweaks.dealerName === 'Marcus' ? 'male' : 'female'} expression={expression} />
          <div style={{ flex: 1, position:'relative', minHeight: 0 }}>
            <FeltBackdrop />
            {feltArea}
          </div>
        </>
      ) : (
        <>
          <DealerPanel
            name={tweaks.dealerName}
            gender={tweaks.dealerName === 'Marcus' ? 'male' : 'female'}
            expression={expression}
            message={message}
            onTipDealer={tipDealer}
            tipped={tipped}
            playerName={tweaks.playerName}
            mood={mood}
            onEditName={() => setShowNameModal(true)}
          />
          <div style={{ flex: 1, position:'relative', minWidth: 700 }}>
            <FeltBackdrop />
            {feltArea}
          </div>
        </>
      )}

      <TweaksPanel title="Tweaks">
        <TweakSection title="Players">
          <TweakText label="Your name" value={tweaks.playerName} onChange={v => setTweak('playerName', v)} />
          <TweakSelect label="Dealer" value={tweaks.dealerName} onChange={v => setTweak('dealerName', v)}
            options={[{ value: 'Melissa', label: 'Melissa (warm, flirty)' }]}/>
        </TweakSection>
        <TweakSection title="Game">
          <TweakToggle label="Strategy hints" value={tweaks.showHints} onChange={v => setTweak('showHints', v)} />
          <TweakToggle label="Sound" value={tweaks.soundOn} onChange={v => setTweak('soundOn', v)} />
          <TweakNumber label="Starting bankroll" value={tweaks.startingBankroll} onChange={v => setTweak('startingBankroll', Number(v))} min={100} max={100000} step={100} />
          <TweakButton label="Reset bankroll" onClick={() => { setBankroll(tweaks.startingBankroll); setStats({played:0,won:0,bj:0,best:tweaks.startingBankroll,tipsGiven:0}); setStreak(0); setLossStreak(0); if (window.CASINO_STATS) window.CASINO_STATS.resetAll(); }} />
        </TweakSection>
      </TweaksPanel>

      {showNameModal && (
        <NameModal
          initialName={tweaks.playerName === 'Alex' ? '' : tweaks.playerName}
          onSave={savePlayerName}
          onCancel={window.CASINO_PLAYER.read() ? () => setShowNameModal(false) : null}
        />
      )}

      {showBrokeModal && (
        <BrokeModal
          playerName={tweaks.playerName}
          message={`Looks like the table cleaned you out, ${tweaks.playerName}.`}
          onReload={() => {
            window.location.href = '../profile/?from=blackjack';
          }}
        />
      )}
    </div>
  );
}

// Slim top rail for the portrait layout.
function PortraitRail({ bankroll, streak, showHints, onToggleHints }) {
  return (
    <div style={{
      display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'8px 14px',
      background:'linear-gradient(180deg, rgba(35,22,10,.8), rgba(20,12,6,.88))',
      border:'1px solid rgba(201,162,106,.35)',
      borderRadius: 12,
      boxShadow:'0 8px 22px rgba(0,0,0,.4), inset 0 1px 0 rgba(230,197,144,.15)'
    }}>
      <a href="../casino/" style={{
        fontSize: 10, fontWeight: 700, letterSpacing:'.18em', textTransform:'uppercase',
        color:'var(--brass-2)', textDecoration:'none', whiteSpace:'nowrap'
      }}>← Lobby</a>
      <div style={{ display:'flex', alignItems:'baseline', gap: 14 }}>
        <span style={{
          fontFamily:"'Playfair Display', serif", fontStyle:'italic',
          fontSize: 20, fontWeight: 700, color:'var(--brass-2)'
        }}>${bankroll.toLocaleString()}</span>
        {streak > 0 && (
          <span style={{
            fontFamily:"'JetBrains Mono', monospace", fontSize: 12,
            color:'var(--brass-2)',
            textShadow: streak >= 3 ? '0 0 12px rgba(230,197,144,.7)' : 'none'
          }}>×{streak}</span>
        )}
      </div>
      <button onClick={onToggleHints} style={{
        padding:'6px 12px',
        background: showHints ? 'linear-gradient(180deg, #e6c590, #c9a26a)' : 'rgba(20,12,6,.6)',
        color: showHints ? '#1a1208' : 'var(--brass-2)',
        border:'1px solid rgba(201,162,106,.5)',
        borderRadius: 999,
        fontSize: 9, fontWeight: 700, letterSpacing:'.16em', textTransform:'uppercase',
        cursor:'pointer', whiteSpace:'nowrap'
      }}>{showHints ? '✦ Hints' : 'Hints'}</button>
    </div>
  );
}

function BrokeModal({ playerName, message, onReload }) {
  return (
    <div style={{
      position:'fixed', inset:0, zIndex:9000,
      background:'rgba(8,5,2,.7)', backdropFilter:'blur(8px)',
      display:'flex', alignItems:'center', justifyContent:'center'
    }}>
      <div style={{
        background:'linear-gradient(180deg, rgba(35,22,10,.95), rgba(20,12,6,.98))',
        border:'1px solid rgba(201,162,106,.5)',
        borderRadius:16,
        padding:'30px 36px 26px',
        boxShadow:'0 30px 80px rgba(0,0,0,.7), inset 0 1px 0 rgba(230,197,144,.15)',
        minWidth:380, maxWidth:460,
        textAlign:'center'
      }}>
        <div style={{ fontSize:10, letterSpacing:'.32em', textTransform:'uppercase', color:'var(--ivory-dim)', marginBottom:6 }}>Limestone Games</div>
        <div style={{
          fontFamily:"'Playfair Display', serif", fontStyle:'italic',
          fontSize:24, color:'var(--brass-2)', marginBottom:6, lineHeight:1.25
        }}>Out of chips.</div>
        <div style={{ fontSize:14, color:'var(--ivory-dim)', marginBottom:22, lineHeight:1.4 }}>
          {message || `That's the last of it, ${playerName || 'friend'}.`}
        </div>
        <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
          <a href="../casino/" style={{
            padding:'10px 18px',
            background:'rgba(20,12,6,.6)',
            border:'1px solid rgba(201,162,106,.3)',
            borderRadius:999, color:'var(--ivory-dim)',
            fontSize:10, fontWeight:700, letterSpacing:'.18em', textTransform:'uppercase',
            textDecoration:'none', display:'inline-block'
          }}>← Lobby</a>
          <button onClick={onReload} style={{
            padding:'10px 22px',
            background:'linear-gradient(180deg, #e6c590, #c9a26a)',
            border:'1px solid rgba(201,162,106,.5)',
            borderRadius:999, color:'#1a1208',
            fontSize:10, fontWeight:700, letterSpacing:'.18em', textTransform:'uppercase',
            cursor:'pointer',
            boxShadow:'0 4px 12px rgba(230,197,144,.4)'
          }}>Cash out · profile</button>
        </div>
      </div>
    </div>
  );
}

function NameModal({ initialName = '', onSave, onCancel }) {
  const [name, setName] = React.useState(initialName);
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    const id = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
    return () => clearTimeout(id);
  }, []);

  function submit(e) {
    if (e) e.preventDefault();
    if (name.trim()) onSave(name);
  }

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:9000,
      background:'rgba(8,5,2,.65)',
      backdropFilter:'blur(8px)',
      display:'flex', alignItems:'center', justifyContent:'center'
    }}>
      <form onSubmit={submit} style={{
        background:'linear-gradient(180deg, rgba(35,22,10,.95), rgba(20,12,6,.98))',
        border:'1px solid rgba(201,162,106,.5)',
        borderRadius: 16,
        padding:'30px 36px 26px',
        boxShadow:'0 30px 80px rgba(0,0,0,.7), inset 0 1px 0 rgba(230,197,144,.15)',
        minWidth: 380, maxWidth: 440,
        textAlign:'center'
      }}>
        <div style={{
          fontSize: 10, letterSpacing:'.32em', textTransform:'uppercase',
          color:'var(--ivory-dim)', marginBottom: 6
        }}>Limestone Games</div>
        <div style={{
          fontFamily:"'Playfair Display', serif",
          fontStyle:'italic',
          fontSize: 22, color:'var(--brass-2)',
          marginBottom: 20, lineHeight: 1.3
        }}>
          {initialName ? 'Going by something different tonight?' : 'What should the dealer call you?'}
        </div>
        <input
          ref={inputRef}
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={20}
          placeholder="Your name"
          autoComplete="off"
          style={{
            width:'100%',
            padding:'12px 16px',
            background:'rgba(10,6,3,.6)',
            border:'1px solid rgba(201,162,106,.4)',
            borderRadius: 10,
            color:'var(--ivory)',
            fontFamily:"'Playfair Display', serif",
            fontSize: 19,
            fontStyle:'italic',
            textAlign:'center',
            outline:'none',
            boxSizing:'border-box'
          }}
        />
        <div style={{ display:'flex', gap: 10, marginTop: 18, justifyContent:'center' }}>
          {onCancel && (
            <button type="button" onClick={onCancel} style={{
              padding:'10px 18px',
              background:'rgba(20,12,6,.6)',
              border:'1px solid rgba(201,162,106,.3)',
              borderRadius: 999,
              color:'var(--ivory-dim)',
              fontSize: 10, fontWeight: 700, letterSpacing:'.18em',
              textTransform:'uppercase',
              cursor:'pointer'
            }}>Cancel</button>
          )}
          <button type="submit" disabled={!name.trim()} style={{
            padding:'10px 22px',
            background: name.trim() ? 'linear-gradient(180deg, #e6c590, #c9a26a)' : 'rgba(201,162,106,.25)',
            border:'1px solid rgba(201,162,106,.5)',
            borderRadius: 999,
            color: name.trim() ? '#1a1208' : 'var(--ivory-dim)',
            fontSize: 10, fontWeight: 700, letterSpacing:'.18em',
            textTransform:'uppercase',
            cursor: name.trim() ? 'pointer' : 'not-allowed',
            boxShadow: name.trim() ? '0 4px 12px rgba(230,197,144,.4)' : 'none'
          }}>Take a seat →</button>
        </div>
      </form>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────

function BrassRail({ bankroll, streak, played, won, best, showHints, onToggleHints }) {
  const winRate = played ? Math.round(won/played*100) : null;
  return (
    <div style={{
      display:'flex', alignItems:'stretch',
      margin:'14px 22px 0',
      padding:'10px 18px',
      background:'linear-gradient(180deg, rgba(35,22,10,.75), rgba(20,12,6,.85))',
      border:'1px solid rgba(201,162,106,.35)',
      borderRadius: 10,
      backdropFilter:'blur(10px)',
      boxShadow:'0 8px 22px rgba(0,0,0,.4), inset 0 1px 0 rgba(230,197,144,.15)',
      gap: 0,
      zIndex: 5, position:'relative'
    }}>
      {/* Brand (clickable, returns to lobby) */}
      <a
        href="../casino/"
        title="Back to casino"
        style={{
          display:'flex', alignItems:'center', gap: 12, paddingRight: 18,
          borderRight:'1px solid rgba(201,162,106,.2)',
          textDecoration:'none', color:'inherit',
          whiteSpace:'nowrap', flexShrink: 0
        }}
      >
        <div style={{
          width: 32, height: 32, borderRadius:'50%', flexShrink: 0,
          background:'radial-gradient(circle at 35% 30%, #f5d896, #8c6a3f 75%)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontFamily:"'Playfair Display', serif",
          color:'#1a1208', fontSize: 14, fontWeight: 800,
          fontStyle:'italic',
          boxShadow:'inset 0 1px 0 rgba(255,255,255,.4), 0 2px 6px rgba(0,0,0,.4)'
        }}>L</div>
        <div>
          <div style={{
            fontFamily:"'Playfair Display', serif",
            fontSize: 17, color:'var(--brass-2)',
            fontStyle:'italic', fontWeight: 600, letterSpacing:'.02em', lineHeight: 1,
            whiteSpace:'nowrap'
          }}>Limestone Games</div>
          <div style={{ fontSize: 9, letterSpacing:'.28em', color:'var(--ivory-dim)', textTransform:'uppercase', marginTop: 3, whiteSpace:'nowrap' }}>
            ← Lobby · Private Table 07
          </div>
        </div>
      </a>

      {/* Stat slots */}
      <div style={{ flex: 1, display:'flex', alignItems:'center', justifyContent:'flex-end', gap: 0 }}>
        <RailStat label="Bankroll" value={`$${bankroll.toLocaleString()}`} accent />
        <RailStat label="Streak" value={streak > 0 ? `×${streak}` : '—'} highlight={streak >= 3} />
        <RailStat label="Hands" value={played || '—'} />
        <RailStat label="Win Rate" value={winRate !== null ? `${winRate}%` : '—'} />
        <RailStat label="Peak" value={`$${best.toLocaleString()}`} small />
        <button
          onClick={onToggleHints}
          title={showHints ? 'Hide coaching (keyboard: H hit · S stand · D double · P split · R surrender)' : 'Show coaching'}
          style={{
            marginLeft: 14,
            padding:'8px 14px',
            background: showHints
              ? 'linear-gradient(180deg, #e6c590, #c9a26a)'
              : 'rgba(20,12,6,.6)',
            color: showHints ? '#1a1208' : 'var(--brass-2)',
            border:'1px solid rgba(201,162,106,.5)',
            borderRadius: 999,
            fontSize: 10, fontWeight: 700, letterSpacing:'.18em',
            textTransform:'uppercase',
            cursor:'pointer',
            whiteSpace:'nowrap',
            transition:'all .2s',
            boxShadow: showHints ? '0 4px 10px rgba(230,197,144,.35)' : '0 2px 6px rgba(0,0,0,.3)'
          }}
        >
          {showHints ? '✦ Coach On' : 'Coach Off'}
        </button>
      </div>
    </div>
  );
}

function RailStat({ label, value, accent, highlight, small }) {
  return (
    <div style={{
      padding:'4px 18px',
      borderLeft:'1px solid rgba(201,162,106,.18)',
      textAlign:'right',
      minWidth: small ? 80 : 100
    }}>
      <div style={{ fontSize: 9, letterSpacing:'.22em', color:'var(--ivory-dim)', textTransform:'uppercase', fontWeight: 600 }}>{label}</div>
      <div style={{
        fontFamily: accent ? "'Playfair Display', serif" : "'JetBrains Mono', monospace",
        fontSize: accent ? 22 : (small ? 13 : 15),
        color: accent ? 'var(--brass-2)' : 'var(--ivory)',
        fontWeight: accent ? 700 : 500,
        lineHeight: 1.1, marginTop: 2,
        fontStyle: accent ? 'italic' : 'normal',
        textShadow: highlight ? '0 0 12px rgba(230,197,144,.7)' : 'none'
      }}>{value}</div>
    </div>
  );
}

function PlayerHandsRow({ hands, activeIdx, results, pBJ, shake, playerName, compact }) {
  if (!hands.length) return null;
  if (hands.length === 1) {
    const h = hands[0];
    const v = handValue(h.cards);
    const cw = compact ? 68 : 78, ch = compact ? 96 : 110;
    return (
      <div>
        <div style={{ display:'flex', justifyContent:'center', gap: 8, marginBottom: 10, minHeight: ch }} className={shake ? 'shake' : ''}>
          {h.cards.map((c, i) => (
            <PlayingCard
              key={c.id}
              rank={c.rank} suit={c.suit}
              w={cw} h={ch}
              dealIndex={i*2}
              fromX={140} fromY={-360}
              glow={pBJ}
            />
          ))}
        </div>
        {h.cards.length > 0 && (
          <HandValue
            value={v.total} soft={v.soft}
            isBust={v.total > 21}
            isBJ={pBJ}
            label={h.surrendered ? 'Surrendered' : (h.doubled ? `${playerName} · 2×` : playerName)}
          />
        )}
      </div>
    );
  }
  // Split hands — show side by side; shrink cards as the table fills up.
  const many = hands.length >= 3;
  const cw = compact ? 52 : (many ? 62 : 72);
  const ch = compact ? 74 : (many ? 88 : 102);
  return (
    <div style={{ display:'flex', justifyContent:'center', gap: compact ? 10 : (many ? 14 : 28), alignItems:'flex-end' }}>
      {hands.map((h, idx) => {
        const v = handValue(h.cards);
        const r = results[idx];
        const isActive = idx === activeIdx && !h.stood && !h.busted;
        return (
          <div key={idx} style={{
            position:'relative',
            padding: compact ? '8px 8px 6px' : '10px 14px 8px',
            borderRadius: 12,
            border: isActive ? '1.5px solid rgba(245,216,150,.7)' : '1px solid rgba(201,162,106,.15)',
            background: isActive ? 'rgba(245,216,150,.06)' : 'transparent',
            transition:'all .25s ease',
            opacity: h.busted || h.surrendered ? .6 : 1
          }}>
            {isActive && (
              <div style={{
                position:'absolute', top: -10, left:'50%', transform:'translateX(-50%)',
                fontSize: 9, letterSpacing:'.3em', color:'#1a1208',
                background:'linear-gradient(180deg, #f5d896, #c9a26a)',
                padding:'2px 10px', borderRadius: 4,
                fontWeight: 700, textTransform:'uppercase',
                zIndex: 4
              }}>Active</div>
            )}
            <div style={{ display:'flex', justifyContent:'center', gap: 5, marginBottom: 8, minHeight: ch }}>
              {h.cards.map((c, i) => (
                <PlayingCard
                  key={c.id}
                  rank={c.rank} suit={c.suit}
                  w={cw} h={ch}
                  dealIndex={i}
                  fromX={140} fromY={-360}
                />
              ))}
            </div>
            <div style={{ display:'flex', justifyContent:'center', gap: 8, alignItems:'center', flexWrap:'wrap' }}>
              <HandValue
                value={v.total} soft={v.soft}
                isBust={v.total > 21 || h.busted}
                label={`Hand ${idx+1}${h.doubled ? ' · 2×' : ''}`}
              />
              {r && (
                <div style={{
                  fontSize: 10, letterSpacing:'.2em', textTransform:'uppercase', fontWeight:700,
                  padding:'3px 8px', borderRadius: 4,
                  background: r.kind==='win'||r.kind==='blackjack' ? 'rgba(126,219,156,.2)' : r.kind==='push' ? 'rgba(230,197,144,.2)' : 'rgba(255,107,90,.2)',
                  color: r.kind==='win'||r.kind==='blackjack' ? 'var(--win)' : r.kind==='push' ? '#e6c590' : 'var(--lose)',
                  border: `1px solid ${r.kind==='win'||r.kind==='blackjack' ? '#9eddb8' : r.kind==='push' ? '#c9a26a' : '#ff6b5a'}40`
                }}>
                  {r.kind === 'win' ? `+$${r.payout}` : r.kind === 'blackjack' ? `BJ +$${r.payout}` : r.kind === 'push' ? 'Push' : r.kind === 'surrender' ? `½ back` : `-$${r.betAmt}`}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BettingZone({ bet, bankroll, onChip, onClear, onRebet, onDeal, canRebet, compact }) {
  const totalBet = bet.reduce((a,b)=>a+b,0);
  if (compact) {
    return (
      <div style={{ display:'flex', flexDirection:'column', gap: 10, alignItems:'center' }}>
        <div style={{ display:'flex', gap: 8, alignItems:'center', justifyContent:'center', flexWrap:'wrap' }}>
          {CHIP_DEFS.map(c => (
            <Chip key={c.value} value={c.value} size={52} onClick={() => onChip(c.value)} disabled={bankroll < c.value} />
          ))}
        </div>
        <div style={{ display:'flex', gap: 12, alignItems:'center', width:'100%', justifyContent:'center' }}>
          <div className={totalBet > 0 ? 'glow-pulse' : 'bet-empty-pulse'} style={{
            width: 88, height: 88, borderRadius:'50%', flexShrink: 0,
            border:`2px dashed ${totalBet > 0 ? 'rgba(230,197,144,.7)' : 'rgba(230,197,144,.4)'}`,
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
            background:'radial-gradient(circle, rgba(0,0,0,.35), transparent)'
          }}>
            <div style={{ fontSize: 8, letterSpacing:'.24em', color:'var(--brass)', textTransform:'uppercase' }}>
              {totalBet > 0 ? 'Bet' : 'Place bet'}
            </div>
            <div style={{
              fontFamily:"'Playfair Display', serif", fontSize: 20, fontWeight: 700,
              color: totalBet > 0 ? 'var(--brass-2)' : 'rgba(230,197,144,.4)'
            }}>${totalBet}</div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap: 8 }}>
            <div style={{ display:'flex', gap: 8 }}>
              <SmallBtn onClick={onClear} disabled={!totalBet}>Clear</SmallBtn>
              <SmallBtn onClick={onRebet} disabled={!canRebet}>Rebet ↺</SmallBtn>
            </div>
            <button
              onClick={onDeal}
              disabled={!totalBet}
              style={{
                padding:'12px 26px',
                background: totalBet ? 'linear-gradient(180deg, #f5d896, #c9a26a)' : 'rgba(40,28,18,.4)',
                color: totalBet ? '#1a1208' : 'rgba(255,255,255,.3)',
                border:`1px solid ${totalBet ? 'rgba(245,216,150,1)' : 'rgba(201,162,106,.2)'}`,
                borderRadius: 12,
                fontFamily:"'Playfair Display', serif", fontStyle:'italic',
                fontSize: 18, fontWeight: 700,
                cursor: totalBet ? 'pointer' : 'not-allowed',
                boxShadow: totalBet ? '0 10px 22px rgba(230,197,144,.4)' : 'none'
              }}
            >Deal Cards →</button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap: 18 }}>
      <div style={{ display:'flex', gap: 14, alignItems:'center' }}>
        {CHIP_DEFS.map(c => (
          <Chip key={c.value} value={c.value} size={62} onClick={() => onChip(c.value)} disabled={bankroll < c.value} />
        ))}
      </div>

      <div className={totalBet > 0 ? 'glow-pulse' : 'bet-empty-pulse'} style={{
        position:'relative',
        width: 124, height: 124,
        borderRadius:'50%',
        border:`2px dashed ${totalBet > 0 ? 'rgba(230,197,144,.7)' : 'rgba(230,197,144,.4)'}`,
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        background:'radial-gradient(circle, rgba(0,0,0,.35), transparent)'
      }}>
        <div style={{ fontSize: 9, letterSpacing:'.3em', color:'var(--brass)', textTransform:'uppercase', marginBottom: 2 }}>
          {totalBet > 0 ? 'Your Bet' : 'Place Bet'}
        </div>
        <div style={{
          fontFamily:"'Playfair Display', serif",
          fontSize: 26, fontWeight: 700,
          color: totalBet > 0 ? 'var(--brass-2)' : 'rgba(230,197,144,.4)'
        }}>${totalBet}</div>
        {totalBet > 0 && (
          <div style={{ display:'flex', gap: 4, marginTop: 4, height: 8 }}>
            {bet.slice(-6).map((v,i)=>{
              const def = CHIP_DEFS.find(c=>c.value===v);
              return <div key={i} className="chip-toss" style={{
                animationDelay: `${i*0.04}s`,
                width:8, height:8, borderRadius:'50%',
                background:`radial-gradient(circle at 35% 30%, ${def.color}, ${def.edge} 75%)`,
                border:`1px solid ${def.edge}`
              }}/>;
            })}
          </div>
        )}
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap: 10, alignItems:'flex-end', minWidth: 200 }}>
        <div style={{ display:'flex', gap: 8 }}>
          <SmallBtn onClick={onClear} disabled={!totalBet}>Clear</SmallBtn>
          <SmallBtn onClick={onRebet} disabled={!canRebet}>Rebet ↺</SmallBtn>
        </div>
        <button
          onClick={onDeal}
          disabled={!totalBet}
          title="Deal (Enter)"
          style={{
            padding:'16px 40px',
            background: totalBet ? 'linear-gradient(180deg, #f5d896, #c9a26a)' : 'rgba(40,28,18,.4)',
            color: totalBet ? '#1a1208' : 'rgba(255,255,255,.3)',
            border:`1px solid ${totalBet ? 'rgba(245,216,150,1)' : 'rgba(201,162,106,.2)'}`,
            borderRadius: 12,
            fontFamily:"'Playfair Display', serif",
            fontStyle:'italic',
            fontSize: 22, fontWeight: 700,
            letterSpacing:'.04em',
            cursor: totalBet ? 'pointer' : 'not-allowed',
            boxShadow: totalBet ? '0 14px 28px rgba(230,197,144,.45), inset 0 1px 0 rgba(255,255,255,.5)' : 'none',
            transition: 'all .2s'
          }}
        >Deal Cards →</button>
      </div>
    </div>
  );
}

function SmallBtn({ children, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding:'8px 14px',
      background:'rgba(20,12,6,.85)',
      color: disabled ? 'rgba(255,255,255,.3)' : 'var(--ivory)',
      border:'1px solid rgba(201,162,106,.35)',
      borderRadius: 8,
      fontSize: 11, letterSpacing:'.16em', textTransform:'uppercase',
      fontWeight: 600,
      cursor: disabled ? 'not-allowed' : 'pointer',
      fontFamily:'inherit'
    }}>{children}</button>
  );
}

function ActionZone({ hint, canDouble, canSplit, canSurrender, doubleReason, splitReason, surrenderReason, onHit, onStand, onDouble, onSplit, onSurrender, onBlocked, betAmount, compact }) {
  const ha = hint?.action;
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap: compact ? 8 : 12, paddingTop: 2, flexWrap:'wrap' }}>
      <ActionButton label="Hit"    onClick={onHit}    hint={ha==='Hit'}    sub="Take a card" kbd="H" compact={compact} />
      <ActionButton label="Stand"  onClick={onStand}  hint={ha==='Stand'}  sub="Lock it in" kbd="S" compact={compact} />
      <ActionButton label="Double" onClick={onDouble} hint={ha==='Double'} disabled={!canDouble} disabledReason={doubleReason} onBlocked={onBlocked} sub={`+$${betAmount}`} kbd="D" compact={compact} />
      <ActionButton label="Split"  onClick={onSplit}  hint={ha==='Split'}  disabled={!canSplit} disabledReason={splitReason} onBlocked={onBlocked} sub={`+$${betAmount}`} kbd="P" compact={compact} />
      {!compact && <div style={{ width: 1, height: 56, background:'rgba(201,162,106,.25)', margin:'0 4px' }}/>}
      <ActionButton label="Surrender" onClick={onSurrender} hint={ha==='Surrender'} disabled={!canSurrender} disabledReason={surrenderReason} onBlocked={onBlocked} sub="½ back" kbd="R" ghost compact={compact} />
    </div>
  );
}

function InsuranceZone({ amount, bankroll, onYes, onNo }) {
  const canAfford = bankroll >= amount;
  return (
    <div style={{
      display:'flex', alignItems:'center', justifyContent:'center', gap: 18,
      padding:'12px 18px',
      background:'rgba(20,12,6,.5)',
      border:'1px solid rgba(245,216,150,.35)',
      borderRadius: 10,
      maxWidth: 620, margin:'0 auto',
      flexWrap:'wrap'
    }}>
      <div style={{
        fontFamily:"'Playfair Display', serif",
        fontStyle:'italic', fontSize: 18, color:'var(--brass-2)',
        flex: 1, textAlign:'center', minWidth: 200
      }}>
        Insurance? <span style={{fontSize: 12, letterSpacing:'.2em', textTransform:'uppercase', color:'var(--ivory-dim)', fontStyle:'normal'}}>Pays 2:1 if dealer has blackjack</span>
      </div>
      <button onClick={onNo} style={{
        padding:'10px 20px',
        background:'rgba(20,12,6,.85)',
        color:'var(--ivory)',
        border:'1px solid rgba(201,162,106,.35)',
        borderRadius: 8,
        fontSize: 12, letterSpacing:'.16em', textTransform:'uppercase',
        fontWeight: 600, cursor:'pointer', fontFamily:'inherit'
      }}>No thanks</button>
      <button onClick={onYes} disabled={!canAfford} title={canAfford ? undefined : 'Not enough chips left to insure'} style={{
        padding:'10px 22px',
        background: canAfford ? 'linear-gradient(180deg, #f5d896, #c9a26a)' : 'rgba(40,28,18,.4)',
        color: canAfford ? '#1a1208' : 'rgba(255,255,255,.3)',
        border:`1px solid ${canAfford ? 'rgba(245,216,150,1)' : 'rgba(201,162,106,.2)'}`,
        borderRadius: 8,
        fontSize: 12, letterSpacing:'.16em', textTransform:'uppercase',
        fontWeight: 700, cursor: canAfford ? 'pointer' : 'not-allowed', fontFamily:'inherit',
        boxShadow: canAfford ? '0 6px 16px rgba(230,197,144,.4)' : 'none'
      }}>Insure · ${amount}</button>
    </div>
  );
}

function ResolvedZone({ result, onContinue, onRebet, canRebet }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap: 14, paddingTop: 4 }}>
      <button onClick={onContinue} title="New hand (N)" style={{
        padding:'14px 32px',
        background:'linear-gradient(180deg, rgba(40,28,18,.95), rgba(20,12,6,.95))',
        color:'var(--ivory)',
        border:'1px solid rgba(201,162,106,.4)',
        borderRadius: 10,
        fontFamily:"'Playfair Display', serif",
        fontStyle:'italic', fontSize: 18, fontWeight: 600,
        cursor:'pointer'
      }}>New Hand</button>
      {canRebet && (
        <button onClick={onRebet} title="Rebet & deal (B)" style={{
          padding:'14px 32px',
          background:'linear-gradient(180deg, #f5d896, #c9a26a)',
          color:'#1a1208',
          border:'1px solid rgba(245,216,150,1)',
          borderRadius: 10,
          fontFamily:"'Playfair Display', serif",
          fontStyle:'italic', fontSize: 18, fontWeight: 700,
          cursor:'pointer',
          boxShadow:'0 8px 22px rgba(230,197,144,.4)'
        }}>Rebet &amp; Deal →</button>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
