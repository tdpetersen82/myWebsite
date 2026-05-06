/* eslint-disable */
// Main blackjack app — full game state machine

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

const DEALER_BUST_PCT = { 2:35, 3:38, 4:40, 5:43, 6:42, 7:26, 8:24, 9:23, 10:21, A:12 };

function playerBustRisk(total, isSoft) {
  if (isSoft || total < 12) return 0;
  if (total >= 21) return 100;
  let bustRanks = 0;
  for (let v = 2; v <= 10; v++) {
    if (total + v > 21) bustRanks += (v === 10) ? 4 : 1;
  }
  return Math.round(bustRanks / 13 * 100);
}

function handValue(cards) {
  let total = 0, aces = 0;
  for (const c of cards) {
    if (c.rank === 'A') { aces++; total += 11; }
    else total += cardVal(c.rank);
  }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  let t2 = 0, a2 = 0;
  for (const c of cards) { if (c.rank==='A'){a2++;t2+=11;} else t2 += cardVal(c.rank); }
  while (t2 > 21 && a2 > 0) { t2 -= 10; a2--; }
  const soft = a2 > 0 && cards.some(c=>c.rank==='A');
  return { total, soft };
}

function isBlackjack(cards) {
  if (cards.length !== 2) return false;
  return handValue(cards).total === 21;
}

function basicStrategy(player, dealerUp) {
  if (!dealerUp) return null;
  const dv = cardVal(dealerUp.rank);
  const { total, soft } = handValue(player);
  const pair = player.length === 2 && player[0].rank === player[1].rank;
  const dealerKey = dealerUp.rank === 'A' ? 'A' : Math.min(cardVal(dealerUp.rank), 10);
  const dealerBust = DEALER_BUST_PCT[dealerKey];
  const up = dealerUp.rank === 'A' ? 'ace' : String(dealerKey);

  function out(action, explanation) {
    const odds = { dealerBust };
    const pb = playerBustRisk(total, soft);
    if (pb > 0) odds.playerBust = pb;
    return { kind:'strategy', action, explanation, odds };
  }

  if (pair) {
    const r = player[0].rank;
    if (r === 'A') return out('Split', `Aces are the most profitable split in the game — each one starts a new hand at 11. Catch: you only get one card per ace, no further hits or doubles. Still always worth it.`);
    if (r === '8') return out('Split', `Hard 16 is the worst total in blackjack — too high to safely hit, too weak to win standing. Two fresh starts at 8 dodge it entirely, especially against the dealer's ${up}.`);
    if (['10','J','Q','K'].includes(r)) return out('Stand', `20 wins against everything but a dealer 21. Splitting trades a near-certain win for two ten-starts that aren't as strong. Don't break it.`);
    if (r === '9' && [2,3,4,5,6,8,9].includes(dv)) return out('Split', `18 is decent, but vs the dealer's ${up}, two fresh nines extract more EV. (Pair of 9s vs 7, 10, or ace: stand on the 18.)`);
    if (r === '7' && dv <= 7) return out('Split', `14 is one of the toughest totals — too low to stand, too high to hit comfortably. Vs the dealer's ${up}, two starting sevens are better than one stuck 14.`);
    if (r === '6' && dv <= 6) return out('Split', `12 from a pair of sixes is bust-prone on a hit and a probable loser if you stand. Vs the dealer's ${up} (weak), splitting puts two hands into play while they're most likely to break.`);
    if (r === '4' && [5,6].includes(dv)) return out('Split', `Eight is weak to hit. The dealer's ${up} is in the bust zone, so splitting fours catches their weakest spot — two starting 4s beat one 8.`);
    if ((r === '2' || r === '3') && dv <= 7) return out('Split', `Splitting cheaply when the dealer's ${up} is weak (busts often) — two hands in play extract more than one weak hit-or-stand decision.`);
  }

  if (soft) {
    if (total >= 19) return out('Stand', `Soft ${total} beats most dealer outcomes. Hitting risks turning a winner into a 17 or worse — stand pat.`);
    if (total === 18) {
      if (dv >= 9) return out('Hit', `Soft 18 loses to the dealer's likely 19-20 here. Your ace flexes to 1 if you pull a face — you can't bust on one card, so hit safely for a shot at 19+.`);
      return out('Stand', `Soft 18 vs the dealer's ${up} (weak) wins more often than it loses. Stand and let them try to make a hand.`);
    }
    if (total === 17 && [3,4,5,6].includes(dv)) return out('Double', `Soft 17 vs a ${up} is the rare soft-hand double. The ace cushions the bust risk, and the dealer is in their weakest range — double for max value.`);
    return out('Hit', `Soft hands can't bust on one card — the ace flexes from 11 to 1 if needed. Take the free improvement; ${total} alone won't beat much.`);
  }

  if (total === 16 && dv >= 9) return out('Surrender', `Hard 16 vs the dealer's ${up} is a near-certain loss either way: hit and you bust the majority of the time, stand and the dealer's strong upcard beats you. Half back is the best math available.`);
  if (total === 15 && dv === 10) return out('Surrender', `Hard 15 vs a 10 loses around 74% of the time. Hitting busts on more than half your draws. Surrender for half back if the table allows.`);
  if (total >= 17) return out('Stand', `Hard ${total} stands — hitting busts on more cards than it improves you. Whatever the dealer's ${up} makes, you've already drawn the line.`);
  if (total >= 13 && dv <= 6) return out('Stand', `The dealer's ${up} is weak — they're more likely to break than make a strong hand. Standing on ${total} forces them to play it out and bust.`);
  if (total === 12 && [4,5,6].includes(dv)) return out('Stand', `The dealer's ${up} is the bust zone (4-6 break the most often). Don't take your own bust risk on a 12 when they're about to break for you.`);
  if (total === 11) return out('Double', `11 is the best double in the game. Ten-value cards are 4 of 13 ranks (~31%) — your most likely landing spot is 21. Vs the dealer's ${up}, double for the extra unit.`);
  if (total === 10 && dv <= 9) return out('Double', `10 doubles into 20 on any ten-card, and the dealer's ${up} can't make blackjack. Lock in the EV before they play.`);
  if (total === 9 && [3,4,5,6].includes(dv)) return out('Double', `9 + a ten = 19, and the dealer's ${up} is the weakest range to face. Double down — they're most likely to break and a 19 wins big when they don't.`);
  return out('Hit', `Hard ${total} is too low to stand against the dealer's ${up}. The dealer will likely outdraw you if you stop here — take another card.`);
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

  // Round
  const [phase, setPhase] = useState('idle');
  const [shoe, setShoe] = useState(() => buildShoe(6));
  const [bet, setBet] = useState([]);
  const [lastBet, setLastBet] = useState([]);
  const [dealer, setDealer] = useState([]);
  const [hands, setHands] = useState([]); // [{cards, bet, doubled, surrendered, stood, busted, isSplitAces}]
  const [activeHandIdx, setActiveHandIdx] = useState(0);
  const [holeRevealed, setHoleRevealed] = useState(false);
  const [results, setResults] = useState([]); // per hand
  const [insurance, setInsurance] = useState(0); // amount wagered on insurance
  const [insuranceOffered, setInsuranceOffered] = useState(false);

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
    const stored = localStorage.getItem('bjPlayerName');
    if (stored && stored.trim()) {
      if (stored !== tweaks.playerName) setTweak('playerName', stored);
    } else {
      setShowNameModal(true);
    }
  }, []);

  function savePlayerName(name) {
    const trimmed = (name || '').trim().slice(0, 20);
    if (!trimmed) return;
    localStorage.setItem('bjPlayerName', trimmed);
    setTweak('playerName', trimmed);
    setShowNameModal(false);
  }

  const ctx = { player: tweaks.playerName, dealer: tweaks.dealerName };

  function nudgeMood(delta) {
    setMood(m => Math.max(-1, Math.min(1, m + delta)));
  }

  function say(key, expr) {
    setMessage(pickLine(key, ctx));
    if (expr) {
      setExpression(expr);
      const moodDelta = expr === 'happy' ? 0.18
        : expr === 'shocked' ? 0.10
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

  const totalBet = bet.reduce((a,b)=>a+b, 0);

  function addChip(value) {
    if (phase !== 'idle' && phase !== 'bet') return;
    if (bankroll < value) return;
    setBet(b => [...b, value]);
    setBankroll(br => br - value);
    setPhase('bet');
    setIsIdle(false);
    if (tweaks.soundOn) SFX.chip();
    const newTotal = totalBet + value;
    if (newTotal >= 500) say('bet_huge', 'shocked');
    else if (newTotal >= 100 || value >= 100) say('bet_high', 'happy');
    else say('bet_low', 'idle');
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

  function deal() {
    if (!totalBet) return;
    if (tweaks.soundOn) { SFX.deal(); [0,150,300,450].forEach(d=>setTimeout(()=>SFX.card(), d)); }
    setLastBet(bet);
    setResults([]);
    setHoleRevealed(false);
    setInsurance(0);
    setInsuranceOffered(false);
    setActiveHandIdx(0);
    setPhase('dealing');
    setExpression('deal');

    const next = [...shoe];
    const p1 = next.pop(), d1 = next.pop(), p2 = next.pop(), d2 = next.pop();
    setShoe(next);

    const newPlayer = [p1, p2];
    const newDealer = [d1, d2];
    setHands([{ cards: newPlayer, bet: totalBet, doubled: false, surrendered: false, stood: false, busted: false, isSplitAces: false }]);
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
        say('insurance', 'idle');
        return;
      }

      if (pBJ || dBJ) {
        setHoleRevealed(true);
        setTimeout(() => resolveImmediate(newPlayer, newDealer, totalBet), 700);
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

  function takeInsurance(yes) {
    setInsuranceOffered(false);
    const insAmt = yes ? Math.floor(totalBet / 2) : 0;
    if (yes && bankroll >= insAmt) {
      setBankroll(br => br - insAmt);
      setInsurance(insAmt);
    }
    setHoleRevealed(true);
    const dBJ = isBlackjack(dealer);
    const pBJ = isBlackjack(hands[0].cards);
    setTimeout(() => {
      if (dBJ) {
        // dealer BJ — insurance pays 2:1 if taken
        if (yes) {
          setBankroll(br => br + insAmt * 3); // win insurance: stake + 2x stake
        }
        if (pBJ) finishHand(0, 'push', totalBet, 0);
        else finishHand(0, 'lose', totalBet, totalBet);
        setPhase('resolved');
        if (pBJ) say('push', 'idle');
        else say('dealer_win', 'happy');
      } else {
        // No dealer BJ — insurance lost (if taken)
        if (pBJ) {
          finishHand(0, 'blackjack', totalBet, Math.floor(totalBet * 1.5));
          setPhase('resolved');
          setBankroll(br => br + totalBet + Math.floor(totalBet * 1.5));
          setStreak(s => s + 1);
          setLossStreak(0);
          say('player_bj', 'shocked');
        } else {
          setPhase('player');
          setExpression('idle');
          setMessage(pickLine('idle', ctx));
        }
      }
    }, 700);
  }

  function resolveImmediate(p, d, betAmt) {
    const pBJ = isBlackjack(p), dBJ = isBlackjack(d);
    if (pBJ && dBJ) {
      finishHand(0, 'push', betAmt, 0);
      setPhase('resolved');
      setBankroll(br => br + betAmt);
      say('push', 'idle');
    } else if (pBJ) {
      finishHand(0, 'blackjack', betAmt, Math.floor(betAmt * 1.5));
      setPhase('resolved');
      setBankroll(br => br + betAmt + Math.floor(betAmt * 1.5));
      setStreak(s => {
        const ns = s + 1;
        announceStreak(ns, true);
        return ns;
      });
      setLossStreak(0);
    } else if (dBJ) {
      finishHand(0, 'lose', betAmt, betAmt);
      setPhase('resolved');
      setStreak(0);
      setLossStreak(ls => ls + 1);
      say('dealer_win', 'happy');
    }
  }

  function announceStreak(s, immediate = false) {
    setTimeout(() => {
      if (s >= 5 && s % 5 === 0) say('streak5', 'shocked');
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
  }

  // Player actions
  function curHand() { return hands[activeHandIdx]; }

  function hit() {
    if (phase !== 'player') return;
    const h = curHand();
    if (!h || h.stood || h.busted) return;
    if (tweaks.soundOn) SFX.card();
    const next = [...shoe];
    const c = next.pop();
    setShoe(next);
    const newCards = [...h.cards, c];
    setHands(prev => prev.map((x,i) => i===activeHandIdx ? {...x, cards: newCards} : x));
    setExpression('deal');
    if (Math.random() < 0.4) setMessage(pickLine('hit', ctx));
    const v = handValue(newCards).total;
    if (v > 21) {
      setTimeout(() => {
        setHands(prev => prev.map((x,i) => i===activeHandIdx ? {...x, cards: newCards, busted: true} : x));
        say('bust', 'bust');
        if (tweaks.soundOn) SFX.bust();
        advanceHand();
      }, 700);
    } else if (v === 21) {
      setTimeout(() => {
        setHands(prev => prev.map((x,i) => i===activeHandIdx ? {...x, cards: newCards, stood: true} : x));
        setExpression('idle');
        advanceHand();
      }, 700);
    } else {
      setTimeout(() => setExpression('idle'), 700);
    }
  }

  function stand() {
    if (phase !== 'player') return;
    const h = curHand();
    if (!h) return;
    setHands(prev => prev.map((x,i) => i===activeHandIdx ? {...x, stood: true} : x));
    if (Math.random() < 0.5) say('stand', 'idle');
    advanceHand();
  }

  function double() {
    if (phase !== 'player') return;
    const h = curHand();
    if (!h || h.cards.length !== 2 || bankroll < h.bet) return;
    setBankroll(br => br - h.bet);
    say('double', 'shocked');
    if (tweaks.soundOn) SFX.chip();
    const next = [...shoe];
    const c = next.pop();
    setShoe(next);
    const newCards = [...h.cards, c];
    setHands(prev => prev.map((x,i) => i===activeHandIdx ? {...x, cards: newCards, bet: x.bet * 2, doubled: true, stood: true} : x));
    setTimeout(() => {
      const v = handValue(newCards).total;
      if (v > 21) {
        setHands(prev => prev.map((x,i) => i===activeHandIdx ? {...x, busted: true} : x));
        say('bust', 'bust');
      }
      advanceHand();
    }, 600);
  }

  function split() {
    if (phase !== 'player') return;
    const h = curHand();
    if (!h || h.cards.length !== 2 || h.cards[0].rank !== h.cards[1].rank || bankroll < h.bet) return;
    setBankroll(br => br - h.bet);
    say('split', 'happy');
    if (tweaks.soundOn) SFX.chip();
    const isAces = h.cards[0].rank === 'A';
    const next = [...shoe];
    const c1 = next.pop();
    const c2 = next.pop();
    setShoe(next);

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
    if (!h || h.cards.length !== 2 || hands.length > 1) return;
    say('surrender', 'sad');
    finishHand(activeHandIdx, 'surrender', h.bet, Math.floor(h.bet / 2));
    setBankroll(br => br + Math.floor(h.bet / 2));
    setHands(prev => prev.map((x,i) => i===activeHandIdx ? {...x, surrendered: true, stood: true} : x));
    setStreak(0);
    setLossStreak(ls => ls + 1);
    setTimeout(() => {
      setPhase('resolved');
    }, 700);
  }

  function advanceHand() {
    setHands(currentHands => {
      const nextIdx = currentHands.findIndex((h, i) => i > activeHandIdx && !h.stood && !h.busted);
      if (nextIdx >= 0) {
        setActiveHandIdx(nextIdx);
        return currentHands;
      }
      // all hands resolved → dealer plays
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
    let local = [...shoe];

    const allBusted = finalHands.every(h => h.busted || h.surrendered);
    if (allBusted) {
      // no need to draw
      setTimeout(() => resolveAll(cards, finalHands), 600);
      return;
    }

    function step() {
      const v = handValue(cards);
      if (v.total < 17) {
        const c = local.pop();
        cards = [...cards, c];
        setDealer(cards);
        setShoe([...local]);
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
    if (dBust) say('dealer_bust', 'shocked');

    let totalReturn = 0;
    const newResults = finalHands.map((h) => {
      if (h.surrendered) return { kind:'surrender', payout: Math.floor(h.bet/2), betAmt: h.bet };
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
    setBankroll(br => br + totalReturn);

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

    setStats(s => {
      const playedDelta = newResults.length;
      const wonDelta = wins;
      const bjDelta = newResults.filter(r => r.kind === 'blackjack').length;
      return {
        ...s,
        played: s.played + playedDelta,
        won: s.won + wonDelta,
        bj: s.bj + bjDelta,
        best: Math.max(s.best, bankroll + totalReturn)
      };
    });

    setPhase('resolved');

    if (!dBust) {
      // pick line based on overall outcome
      setTimeout(() => {
        if (wins > losses) say('player_win', 'sad');
        else if (losses > wins) say('dealer_win', 'happy');
        else say('push', 'idle');
      }, 800);
    }
  }

  function nextRound() {
    setBet([]);
    setHands([]); setDealer([]);
    setResults([]); setHoleRevealed(false);
    setInsurance(0); setInsuranceOffered(false);
    setActiveHandIdx(0);
    setPhase('idle');
    setExpression('idle');
    setMessage(pickLine('idle', ctx));
    if (shoe.length < 80) setShoe(buildShoe(6));
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

  // Hint
  const hint = useMemo(() => {
    if (!tweaks.showHints) return null;
    if (phase === 'idle' || phase === 'bet') {
      if (bankroll <= 0) return null;
      const suggested = Math.max(5, Math.min(100, Math.round(bankroll * 0.025 / 5) * 5));
      return {
        kind: 'bet',
        action: `$${suggested}`,
        explanation: 'About 2.5% of your bankroll. Smaller bets stretch your session through normal variance.',
      };
    }
    if (phase === 'insurance') {
      return {
        kind: 'insurance',
        action: 'Decline',
        explanation: 'Insurance pays 2:1 but dealer blackjack hits only ~31% of the time. Negative EV unless you are counting cards.',
      };
    }
    if (phase !== 'player') return null;
    const h = hands[activeHandIdx];
    if (!h || h.cards.length === 0) return null;
    return basicStrategy(h.cards, dealer[0]);
  }, [tweaks.showHints, phase, hands, activeHandIdx, dealer, bankroll]);

  // Derived
  const activeHand = hands[activeHandIdx];
  const pCards = activeHand?.cards || [];
  const pVal = handValue(pCards);
  const dVal = holeRevealed ? handValue(dealer) : handValue(dealer.slice(0,1));
  const pBJ = phase !== 'idle' && hands.length === 1 && isBlackjack(pCards);
  const dBJ = holeRevealed && isBlackjack(dealer);

  const canDouble = phase === 'player' && activeHand && activeHand.cards.length === 2 && bankroll >= activeHand.bet && !activeHand.isSplitAces;
  const canSplit = phase === 'player' && activeHand && activeHand.cards.length === 2 &&
    activeHand.cards[0].rank === activeHand.cards[1].rank && bankroll >= activeHand.bet && hands.length < 4;
  const canSurrender = phase === 'player' && activeHand && activeHand.cards.length === 2 && hands.length === 1;

  const overallResult = useMemo(() => {
    if (phase !== 'resolved' || !results.length) return null;
    if (results.length === 1) return results[0];
    // composite for split hands
    const totalPayout = results.reduce((a,r) => a + (r.kind==='win' || r.kind==='blackjack' ? r.payout : r.kind==='surrender' ? -r.payout : r.kind==='lose' || r.kind==='bust' ? -r.betAmt : 0), 0);
    const wins = results.filter(r=>r.kind==='win'||r.kind==='blackjack').length;
    const losses = results.filter(r=>r.kind==='lose'||r.kind==='bust'||r.kind==='surrender').length;
    if (totalPayout > 0) return { kind:'win', payout: totalPayout, mixed: true, wins, losses };
    if (totalPayout < 0) return { kind:'lose', payout: -totalPayout, mixed: true, wins, losses };
    return { kind:'push', payout: 0, mixed: true };
  }, [phase, results]);

  return (
    <div style={{
      width:'100vw', height:'100vh',
      display:'flex', alignItems:'center', justifyContent:'center',
      padding: 24,
      position:'relative'
    }}>
      <div style={{
        width: 1380, maxWidth:'100%', height: '100%', maxHeight: 860,
        display:'flex', gap: 20, position:'relative'
      }}>
        <DealerPanel
          name={tweaks.dealerName}
          gender={tweaks.dealerName === 'Marcus' ? 'male' : 'female'}
          expression={expression}
          message={message}
          onTipDealer={tipDealer}
          tipped={tipped}
          playerName={tweaks.playerName}
          isIdle={isIdle}
          mood={mood}
          onEditName={() => setShowNameModal(true)}
        />

        <div style={{
          flex: 1, position:'relative', minWidth: 800
        }}>
          <FeltBackdrop />

          <div style={{ position:'absolute', inset: 0, display:'flex', flexDirection:'column' }}>

            {/* Top brass rail */}
            <BrassRail
              bankroll={bankroll}
              streak={streak}
              played={stats.played}
              won={stats.won}
              best={stats.best}
              showHints={tweaks.showHints}
              onToggleHints={() => setTweak('showHints', !tweaks.showHints)}
            />

            {/* Play area */}
            <div style={{
              flex:1,
              position:'relative',
              padding:'4px 32px 0',
              display:'flex', flexDirection:'column'
            }}>
              <FeltLogo />

              {/* Dealer hand */}
              <div style={{ marginTop: 8, textAlign:'center', position:'relative', zIndex: 3 }}>
                {dealer.length > 0 && <HandValue value={dVal.total} soft={dVal.soft} isBust={dVal.total > 21} isBJ={dBJ} label="Dealer" />}
                <div style={{ display:'flex', justifyContent:'center', gap: 8, marginTop: 12, minHeight: 110 }}>
                  {dealer.map((c, i) => (
                    <PlayingCard
                      key={c.id}
                      rank={c.rank} suit={c.suit}
                      faceDown={i === 1 && !holeRevealed}
                      dealIndex={i*2+1}
                      fromX={140} fromY={-200}
                    />
                  ))}
                </div>
              </div>

              {overallResult && <ResultBanner kind={overallResult.kind} payout={overallResult.payout} mixed={overallResult.mixed} />}

              {/* Player hands (potentially split) */}
              <div style={{
                position:'absolute', left:0, right:0, bottom: 200,
                textAlign:'center', zIndex: 3
              }}>
                <PlayerHandsRow
                  hands={hands}
                  activeIdx={activeHandIdx}
                  results={results}
                  pBJ={pBJ}
                  shake={overallResult?.kind === 'bust' || (results.length===1 && results[0]?.kind === 'bust')}
                  playerName={tweaks.playerName}
                />
              </div>

              <HintPanel hint={hint} />
            </div>

            {/* Bottom action zone */}
            <div style={{
              position:'relative', zIndex: 5,
              padding:'18px 26px 22px',
              minHeight: 200,
              display:'flex', flexDirection:'column', gap: 14
            }}>
              {(phase === 'idle' || phase === 'bet') && (
                <BettingZone
                  bet={bet}
                  bankroll={bankroll}
                  onChip={addChip}
                  onClear={clearBet}
                  onRebet={rebet}
                  onDeal={deal}
                  hasLast={lastBet.length > 0}
                />
              )}

              {phase === 'insurance' && (
                <InsuranceZone
                  amount={Math.floor(totalBet/2)}
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
                  onHit={hit}
                  onStand={stand}
                  onDouble={double}
                  onSplit={split}
                  onSurrender={surrender}
                  betAmount={activeHand.bet}
                />
              )}

              {(phase === 'dealing' || phase === 'dealer') && (
                <div style={{
                  display:'flex', alignItems:'center', justifyContent:'center',
                  height: 100,
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
                  onRebet={() => { nextRound(); setTimeout(rebet, 50); setTimeout(deal, 100); }}
                  hasLast={lastBet.length > 0}
                />
              )}
            </div>
          </div>
        </div>
      </div>

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
          <TweakButton label="Reset bankroll" onClick={() => { setBankroll(tweaks.startingBankroll); setStats({played:0,won:0,bj:0,best:tweaks.startingBankroll,tipsGiven:0}); setStreak(0); setLossStreak(0); }} />
        </TweakSection>
      </TweaksPanel>

      {showNameModal && (
        <NameModal
          initialName={tweaks.playerName === 'Alex' ? '' : tweaks.playerName}
          onSave={savePlayerName}
          onCancel={localStorage.getItem('bjPlayerName') ? () => setShowNameModal(false) : null}
        />
      )}

      {showBrokeModal && (
        <BrokeModal
          playerName={tweaks.playerName}
          message={`Looks like the table cleaned you out, ${tweaks.playerName}.`}
          onReload={() => {
            const v = window.CASINO_BANKROLL ? window.CASINO_BANKROLL.reload() : 1000;
            setBankroll(v);
            setShowBrokeModal(false);
          }}
        />
      )}
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
          }}>Reload $1,000</button>
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
      {/* Lobby pill */}
      <a
        href="../casino/"
        title="Back to casino"
        style={{
          display:'inline-flex', alignItems:'center', gap: 6,
          alignSelf:'center',
          marginRight: 14,
          padding:'8px 14px',
          background:'rgba(20,12,6,.6)',
          color:'var(--brass-2)',
          border:'1px solid rgba(201,162,106,.5)',
          borderRadius: 999,
          fontSize: 10, fontWeight: 700, letterSpacing:'.18em',
          textTransform:'uppercase',
          textDecoration:'none',
          whiteSpace:'nowrap',
          transition:'all .2s',
          boxShadow:'0 2px 6px rgba(0,0,0,.3)'
        }}
      >← Lobby</a>

      {/* Brand on left (clickable) */}
      <a
        href="../casino/"
        title="Back to casino"
        style={{
          display:'flex', alignItems:'center', gap: 12, paddingRight: 18,
          borderRight:'1px solid rgba(201,162,106,.2)',
          textDecoration:'none', color:'inherit'
        }}
      >
        <div style={{
          width: 32, height: 32, borderRadius:'50%',
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
            fontStyle:'italic', fontWeight: 600, letterSpacing:'.02em', lineHeight: 1
          }}>Limestone Games</div>
          <div style={{ fontSize: 9, letterSpacing:'.32em', color:'var(--ivory-dim)', textTransform:'uppercase', marginTop: 3 }}>
            Vegas Strip · Private Table 07
          </div>
        </div>
      </a>

      {/* Stat slots */}
      <div style={{ flex: 1, display:'flex', alignItems:'center', justifyContent:'flex-end', gap: 0 }}>
        <RailStat label="Bankroll" value={`$${bankroll.toLocaleString()}`} accent />
        <RailStat label="Streak" value={streak > 0 ? `🔥 ×${streak}` : '—'} highlight={streak >= 3} />
        <RailStat label="Hands" value={played || '—'} />
        <RailStat label="Win Rate" value={winRate !== null ? `${winRate}%` : '—'} />
        <RailStat label="Peak" value={`$${best.toLocaleString()}`} small />
        <button
          onClick={onToggleHints}
          title={showHints ? 'Hide basic-strategy hints' : 'Show basic-strategy hints'}
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
          {showHints ? '✦ Hints On' : 'Hints Off'}
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
      <div style={{ fontSize: 8, letterSpacing:'.28em', color:'var(--ivory-dim)', textTransform:'uppercase', fontWeight: 600 }}>{label}</div>
      <div style={{
        fontFamily: accent ? "'Playfair Display', serif" : "'JetBrains Mono', monospace",
        fontSize: accent ? 22 : (small ? 13 : 15),
        color: highlight ? '#ffb347' : accent ? 'var(--brass-2)' : '#fff',
        fontWeight: accent ? 700 : 500,
        lineHeight: 1.1, marginTop: 2,
        fontStyle: accent ? 'italic' : 'normal'
      }}>{value}</div>
    </div>
  );
}

function PlayerHandsRow({ hands, activeIdx, results, pBJ, shake, playerName }) {
  if (!hands.length) return null;
  if (hands.length === 1) {
    const h = hands[0];
    const v = handValue(h.cards);
    const r = results[0];
    return (
      <div>
        <div style={{ display:'flex', justifyContent:'center', gap: 8, marginBottom: 10, minHeight: 110 }} className={shake ? 'shake' : ''}>
          {h.cards.map((c, i) => (
            <PlayingCard
              key={c.id}
              rank={c.rank} suit={c.suit}
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
  // Split hands — show side by side
  return (
    <div style={{ display:'flex', justifyContent:'center', gap: 36, alignItems:'flex-end' }}>
      {hands.map((h, idx) => {
        const v = handValue(h.cards);
        const r = results[idx];
        const isActive = idx === activeIdx && !h.stood && !h.busted;
        return (
          <div key={idx} style={{
            position:'relative',
            padding:'10px 14px 8px',
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
                fontWeight: 700, textTransform:'uppercase'
              }}>Active</div>
            )}
            <div style={{ display:'flex', justifyContent:'center', gap: 6, marginBottom: 10, minHeight: 100 }}>
              {h.cards.map((c, i) => (
                <PlayingCard
                  key={c.id}
                  rank={c.rank} suit={c.suit}
                  dealIndex={i}
                  fromX={140} fromY={-360}
                />
              ))}
            </div>
            <div style={{ display:'flex', justifyContent:'center', gap: 8, alignItems:'center' }}>
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
                  color: r.kind==='win'||r.kind==='blackjack' ? '#9eddb8' : r.kind==='push' ? '#e6c590' : '#ff9286',
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

function BettingZone({ bet, bankroll, onChip, onClear, onRebet, onDeal, hasLast }) {
  const totalBet = bet.reduce((a,b)=>a+b,0);
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap: 18 }}>
      <div style={{ display:'flex', gap: 14, alignItems:'center' }}>
        {CHIP_DEFS.map(c => (
          <Chip key={c.value} value={c.value} size={62} onClick={() => onChip(c.value)} disabled={bankroll < c.value} />
        ))}
      </div>

      <div className={totalBet > 0 ? 'glow-pulse' : 'bet-empty-pulse'} style={{
        position:'relative',
        width: 130, height: 130,
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
          fontSize: 28, fontWeight: 700,
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
          <SmallBtn onClick={onRebet} disabled={!hasLast}>Rebet ↺</SmallBtn>
        </div>
        <button
          onClick={onDeal}
          disabled={!totalBet}
          style={{
            padding:'18px 44px',
            background: totalBet ? 'linear-gradient(180deg, #f5d896, #c9a26a)' : 'rgba(40,28,18,.4)',
            color: totalBet ? '#1a1208' : 'rgba(255,255,255,.3)',
            border:`1px solid ${totalBet ? 'rgba(245,216,150,1)' : 'rgba(201,162,106,.2)'}`,
            borderRadius: 12,
            fontFamily:"'Playfair Display', serif",
            fontStyle:'italic',
            fontSize: 24, fontWeight: 700,
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

function ActionZone({ hint, canDouble, canSplit, canSurrender, onHit, onStand, onDouble, onSplit, onSurrender, betAmount }) {
  const ha = hint?.action;
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap: 12, paddingTop: 4, flexWrap:'wrap' }}>
      <ActionButton label="Hit"    onClick={onHit}    hint={ha==='Hit'}    sub="Take a card" />
      <ActionButton label="Stand"  onClick={onStand}  hint={ha==='Stand'}  sub="Lock it in" />
      <ActionButton label="Double" onClick={onDouble} hint={ha==='Double'} disabled={!canDouble} sub={`+$${betAmount}`} />
      <ActionButton label="Split"  onClick={onSplit}  hint={ha==='Split'}  disabled={!canSplit} sub={`+$${betAmount}`} />
      <div style={{ width: 1, height: 60, background:'rgba(201,162,106,.25)', margin:'0 4px' }}/>
      <ActionButton label="Surrender" onClick={onSurrender} hint={ha==='Surrender'} disabled={!canSurrender} sub="½ back" />
    </div>
  );
}

function InsuranceZone({ amount, onYes, onNo }) {
  return (
    <div style={{
      display:'flex', alignItems:'center', justifyContent:'center', gap: 18,
      padding:'12px 18px',
      background:'rgba(20,12,6,.5)',
      border:'1px solid rgba(245,216,150,.35)',
      borderRadius: 10,
      maxWidth: 600, margin:'0 auto'
    }}>
      <div style={{
        fontFamily:"'Playfair Display', serif",
        fontStyle:'italic', fontSize: 18, color:'var(--brass-2)',
        flex: 1, textAlign:'center'
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
      <button onClick={onYes} style={{
        padding:'10px 22px',
        background:'linear-gradient(180deg, #f5d896, #c9a26a)',
        color:'#1a1208',
        border:'1px solid rgba(245,216,150,1)',
        borderRadius: 8,
        fontSize: 12, letterSpacing:'.16em', textTransform:'uppercase',
        fontWeight: 700, cursor:'pointer', fontFamily:'inherit',
        boxShadow:'0 6px 16px rgba(230,197,144,.4)'
      }}>Insure · ${amount}</button>
    </div>
  );
}

function ResolvedZone({ result, onContinue, onRebet, hasLast }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap: 14, paddingTop: 4 }}>
      <button onClick={onContinue} style={{
        padding:'14px 32px',
        background:'linear-gradient(180deg, rgba(40,28,18,.95), rgba(20,12,6,.95))',
        color:'var(--ivory)',
        border:'1px solid rgba(201,162,106,.4)',
        borderRadius: 10,
        fontFamily:"'Playfair Display', serif",
        fontStyle:'italic', fontSize: 18, fontWeight: 600,
        cursor:'pointer'
      }}>New Hand</button>
      {hasLast && (
        <button onClick={onRebet} style={{
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
