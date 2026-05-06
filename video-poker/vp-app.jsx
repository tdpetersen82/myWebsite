/* eslint-disable */
// Main app — state machine, dialogue dispatch, persistence, mood, name modal.
const { useState, useEffect, useRef, useMemo } = React;

const STORAGE_KEY = 'videoPokerStats';
const STARTING_BANKROLL = 1000;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "playerName": "Alex",
  "dealerName": "Melissa",
  "showHints": true,
  "soundOn": false
}/*EDITMODE-END*/;

function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // Persistent state — loaded from localStorage
  const persisted = (() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  })();

  const [bankroll, setBankroll] = useState(persisted?.bankroll ?? STARTING_BANKROLL);
  const [stats, setStats] = useState(persisted?.stats ?? { handsPlayed:0, handsWon:0, royalFlushes:0, biggestBankroll: STARTING_BANKROLL });
  const [coinsBet, setCoinsBet] = useState(persisted?.coinsBet ?? 1);

  // Round
  const [phase, setPhase] = useState('betting'); // betting | dealing | holding | drawing | resolution
  const [cards, setCards] = useState([null, null, null, null, null]);
  const [held, setHeld] = useState([false, false, false, false, false]);
  const [justDrew, setJustDrew] = useState([false, false, false, false, false]);
  const [resultBanner, setResultBanner] = useState(null);
  const [winningKey, setWinningKey] = useState(null);
  const [lossStreak, setLossStreak] = useState(0);

  // Dealer
  const [expression, setExpression] = useState('idle');
  const [message, setMessage] = useState('');
  const [tipped, setTipped] = useState(false);
  const [isIdle, setIsIdle] = useState(false);
  const [mood, setMood] = useState(0);
  const [showNameModal, setShowNameModal] = useState(false);
  const idleTimerRef = useRef(null);
  const expressionTimerRef = useRef(null);

  // Persist
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ bankroll, stats, coinsBet }));
  }, [bankroll, stats, coinsBet]);

  // Player name init
  useEffect(() => {
    const stored = localStorage.getItem('bjPlayerName');
    if (stored && stored.trim()) {
      if (stored !== tweaks.playerName) setTweak('playerName', stored);
    } else {
      setShowNameModal(true);
    }
    // build initial deck
    VP_DECK.build();
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

  function flashExpression(expr, holdMs) {
    if (expressionTimerRef.current) clearTimeout(expressionTimerRef.current);
    setExpression(expr);
    if (holdMs) expressionTimerRef.current = setTimeout(() => setExpression('idle'), holdMs);
  }

  function say(key, expr) {
    setMessage(pickLine(key, ctx));
    if (expr) {
      flashExpression(expr);
      const moodDelta = expr === 'happy' ? 0.18
        : expr === 'shocked' ? 0.20
        : (expr === 'sad' || expr === 'bust') ? -0.18
        : 0;
      if (moodDelta) nudgeMood(moodDelta);
    }
  }

  // Mood decay
  useEffect(() => {
    const id = setInterval(() => {
      setMood(m => Math.abs(m) < 0.02 ? 0 : m * 0.94);
    }, 2500);
    return () => clearInterval(id);
  }, []);

  // Greeting on mount/dealer/name change
  useEffect(() => {
    setMessage(pickLine('greet', { player: tweaks.playerName, dealer: tweaks.dealerName }));
    setExpression('idle');
  }, [tweaks.dealerName, tweaks.playerName]);

  // Idle timer
  useEffect(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (phase === 'betting' || phase === 'holding') {
      setIsIdle(false);
      idleTimerRef.current = setTimeout(() => {
        setIsIdle(true);
        say('idle_long');
      }, 12000);
    }
    return () => { if (idleTimerRef.current) clearTimeout(idleTimerRef.current); };
  }, [phase, cards, held]);

  // Coins
  function changeCoins(n) {
    if (phase !== 'betting') return;
    const max = Math.min(5, bankroll);
    const value = Math.min(n, max);
    if (value < 1) return;
    setCoinsBet(value);
    setIsIdle(false);
    if (tweaks.soundOn) VP_SFX.coinSelect();
    if (value === 5) say('bet_max', 'shocked');
    else if (value === 4) say('bet_high', 'happy');
    else if (value === 3) say('bet_mid', 'happy');
    else say('bet_low', 'idle');
  }

  function betMax() {
    if (phase !== 'betting') return;
    const v = Math.min(5, bankroll);
    if (v < 1) return;
    setCoinsBet(v);
    say('bet_max', 'shocked');
    if (tweaks.soundOn) VP_SFX.coinSelect();
    // Auto-deal
    setTimeout(() => deal(v), 400);
  }

  // Deal & Draw
  function deal(coinsOverride) {
    const coins = coinsOverride || coinsBet;
    if (phase !== 'betting') return;
    setIsIdle(false);

    // Bust path: bankroll wipe → reset
    if (bankroll < 1) {
      setBankroll(STARTING_BANKROLL);
      say('bust', 'bust');
      return;
    }

    const cost = Math.min(coins, bankroll);
    setCoinsBet(cost);
    setBankroll(br => br - cost);
    setResultBanner(null);
    setWinningKey(null);
    setHeld([false, false, false, false, false]);
    setJustDrew([false, false, false, false, false]);

    VP_DECK.build();
    const newHand = VP_DECK.dealHand(5);
    setPhase('dealing');
    setCards([null, null, null, null, null]);

    // Cascade in cards (visual only — values are already determined)
    if (tweaks.soundOn) VP_SFX.cardDeal();
    newHand.forEach((card, i) => {
      setTimeout(() => {
        setCards(prev => {
          const next = [...prev];
          next[i] = card;
          return next;
        });
        if (tweaks.soundOn) VP_SFX.cardDeal();
      }, i * 150);
    });

    setTimeout(() => {
      setPhase('holding');
      flashExpression('idle');
      setMessage(pickLine('deal', ctx));
    }, 5 * 150 + 200);
  }

  function toggleHold(i) {
    if (phase !== 'holding') return;
    setIsIdle(false);
    if (tweaks.soundOn) VP_SFX.holdToggle();
    setHeld(prev => {
      const next = [...prev];
      next[i] = !next[i];
      return next;
    });
  }

  function draw() {
    if (phase !== 'holding') return;
    setIsIdle(false);
    setPhase('drawing');

    const heldCount = held.filter(Boolean).length;
    if (heldCount === 0) say('hold_none', 'deal');
    else if (heldCount === 5) say('hold_all', 'deal');
    else say('draw', 'deal');

    if (tweaks.soundOn) VP_SFX.draw();

    // Replace unheld cards
    const newCards = [...cards];
    const drewMask = [false, false, false, false, false];
    for (let i = 0; i < 5; i++) {
      if (!held[i]) {
        newCards[i] = VP_DECK.deal();
        drewMask[i] = true;
      }
    }
    setCards(newCards);
    setJustDrew(drewMask);

    setTimeout(() => resolveHand(newCards), 700);
  }

  function resolveHand(finalCards) {
    setPhase('resolution');
    const result = VP_HAND.evaluate(finalCards);
    const payout = VP_HAND.getPayout(result.key, coinsBet);

    setStats(prev => {
      const isWin = payout > 0;
      const newBankroll = bankroll + payout;
      return {
        handsPlayed: prev.handsPlayed + 1,
        handsWon: prev.handsWon + (isWin ? 1 : 0),
        royalFlushes: prev.royalFlushes + (result.key === 'royal-flush' ? 1 : 0),
        biggestBankroll: Math.max(prev.biggestBankroll, newBankroll)
      };
    });

    if (payout > 0) {
      setBankroll(br => br + payout);
      setResultBanner({ name: result.name, payout });
      setWinningKey(result.key);
      setLossStreak(0);
    } else {
      setResultBanner({ name: result.name, payout: 0 });
      setLossStreak(s => s + 1);
    }

    // Dealer reaction (after a beat for dramatic effect)
    setTimeout(() => {
      if (result.key === 'royal-flush') {
        say('result_royal', 'shocked');
        nudgeMood(0.4); // big extra bump
        if (tweaks.soundOn) VP_SFX.winRoyal();
        if (typeof confetti === 'function') {
          confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 } });
          setTimeout(() => confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 } }), 250);
          setTimeout(() => confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } }), 500);
        }
      } else if (result.key === 'straight-flush') {
        say('result_straight_flush', 'shocked');
        if (tweaks.soundOn) VP_SFX.winBig();
        if (typeof confetti === 'function') confetti({ particleCount: 120, spread: 80, origin: { y: 0.55 } });
      } else if (result.key === 'four-of-a-kind') {
        say('result_four_kind', 'shocked');
        if (tweaks.soundOn) VP_SFX.winBig();
        if (typeof confetti === 'function') confetti({ particleCount: 100, spread: 70, origin: { y: 0.55 } });
      } else if (result.key === 'full-house') {
        say('result_full_house', 'happy');
        if (tweaks.soundOn) VP_SFX.winMedium();
      } else if (result.key === 'flush') {
        say('result_flush', 'happy');
        if (tweaks.soundOn) VP_SFX.winMedium();
      } else if (result.key === 'straight') {
        say('result_straight', 'happy');
        if (tweaks.soundOn) VP_SFX.winMedium();
      } else if (result.key === 'three-of-a-kind') {
        say('result_three_kind', 'happy');
        if (tweaks.soundOn) VP_SFX.winSmall();
      } else if (result.key === 'two-pair') {
        say('result_two_pair', 'happy');
        if (tweaks.soundOn) VP_SFX.winSmall();
      } else if (result.key === 'jacks-or-better') {
        say('result_jacks', 'happy');
        if (tweaks.soundOn) VP_SFX.winSmall();
      } else {
        // Loss
        if (lossStreak >= 2) say('losing_streak', 'sad');
        else say('lose', 'sad');
        if (tweaks.soundOn) VP_SFX.lose();
      }
    }, 600);

    // Auto-advance to next hand
    setTimeout(() => {
      setPhase('betting');
      setJustDrew([false, false, false, false, false]);
      flashExpression('idle');
    }, 3500);
  }

  function tipDealer() {
    if (tipped || bankroll < 5) return;
    if (tweaks.soundOn) VP_SFX.tip();
    setBankroll(br => br - 5);
    setTipped(true);
    setExpression('happy');
    nudgeMood(0.35);
    setMessage(pickLine('after_tip', ctx));
    setTimeout(() => setTipped(false), 30000);
  }

  // Hint
  const hint = useMemo(() => {
    if (!tweaks.showHints || phase !== 'holding' || cards.some(c => !c)) return null;
    return VP_STRATEGY.getRecommendation(cards);
  }, [tweaks.showHints, phase, cards]);

  const canDeal = phase === 'betting' && bankroll >= coinsBet && coinsBet >= 1;

  return (
    <div style={{
      width:'100vw', height:'100vh',
      display:'flex', alignItems:'center', justifyContent:'center',
      padding:24, position:'relative'
    }}>
      <div style={{
        width:1380, maxWidth:'100%', height:'100%', maxHeight:860,
        display:'flex', gap:20, position:'relative'
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

        <div style={{ flex:1, position:'relative', minWidth:800 }}>
          <FeltBackdrop />

          <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column' }}>
            <BrassRail
              bankroll={bankroll}
              hands={stats.handsPlayed}
              wins={stats.handsWon}
              royals={stats.royalFlushes}
              best={stats.biggestBankroll}
              showHints={tweaks.showHints}
              onToggleHints={() => setTweak('showHints', !tweaks.showHints)}
            />

            <Paytable coinsBet={coinsBet} winningKey={winningKey} />

            {hint && <HintPanel rec={hint} />}

            <div style={{ flex:1, position:'relative', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'20px 32px 0' }}>
              {resultBanner && <ResultBanner name={resultBanner.name} payout={resultBanner.payout} />}

              <div style={{
                display:'flex', justifyContent:'center', gap:18,
                marginBottom:24
              }}>
                {[0,1,2,3,4].map(i => (
                  <CardSlot
                    key={i}
                    card={cards[i]}
                    held={held[i]}
                    justDrew={justDrew[i]}
                    onToggleHold={() => toggleHold(i)}
                    dealIndex={i}
                  />
                ))}
              </div>

              <div style={{
                display:'flex', alignItems:'center', justifyContent:'space-between',
                width:'100%', maxWidth:900,
                padding:'18px 24px',
                background:'linear-gradient(180deg, rgba(20,12,6,.6), rgba(10,6,3,.7))',
                border:'1px solid rgba(201,162,106,.3)',
                borderRadius:12,
                boxShadow:'0 6px 18px rgba(0,0,0,.4)'
              }}>
                <CoinSelector
                  coins={coinsBet}
                  onChange={changeCoins}
                  onBetMax={betMax}
                  disabled={phase !== 'betting'}
                />
                <div style={{ textAlign:'center', minWidth:120 }}>
                  <div style={{ fontSize:9, letterSpacing:'.28em', color:'var(--ivory-dim)', textTransform:'uppercase' }}>Bet</div>
                  <div style={{ fontFamily:"'Playfair Display', serif", fontSize:24, color:'var(--brass-2)', fontStyle:'italic', fontWeight:600 }}>
                    ${coinsBet}
                  </div>
                </div>
                <DealDrawButton phase={phase} canDeal={canDeal} onClick={() => phase === 'betting' ? deal() : draw()} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <TweaksPanel title="Tweaks">
        <TweakSection title="Players">
          <TweakText label="Your name" value={tweaks.playerName} onChange={v => setTweak('playerName', v)} />
          <TweakSelect label="Dealer" value={tweaks.dealerName} onChange={v => setTweak('dealerName', v)}
            options={[{ value:'Melissa', label:'Melissa (warm, flirty)' }]}/>
        </TweakSection>
        <TweakSection title="Game">
          <TweakToggle label="Strategy hints" value={tweaks.showHints} onChange={v => setTweak('showHints', v)} />
          <TweakToggle label="Sound" value={tweaks.soundOn} onChange={v => setTweak('soundOn', v)} />
          <TweakButton label="Reset bankroll" onClick={() => {
            setBankroll(STARTING_BANKROLL);
            setStats({ handsPlayed:0, handsWon:0, royalFlushes:0, biggestBankroll: STARTING_BANKROLL });
            setLossStreak(0);
          }} />
        </TweakSection>
      </TweaksPanel>

      {showNameModal && (
        <NameModal
          initialName={tweaks.playerName === 'Alex' ? '' : tweaks.playerName}
          onSave={savePlayerName}
          onCancel={localStorage.getItem('bjPlayerName') ? () => setShowNameModal(false) : null}
        />
      )}
    </div>
  );
}

function NameModal({ initialName = '', onSave, onCancel }) {
  const [name, setName] = React.useState(initialName);
  const inputRef = React.useRef(null);
  React.useEffect(() => {
    const id = setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select(); }, 50);
    return () => clearTimeout(id);
  }, []);
  function submit(e) { if (e) e.preventDefault(); if (name.trim()) onSave(name); }
  return (
    <div style={{
      position:'fixed', inset:0, zIndex:9000,
      background:'rgba(8,5,2,.65)', backdropFilter:'blur(8px)',
      display:'flex', alignItems:'center', justifyContent:'center'
    }}>
      <form onSubmit={submit} style={{
        background:'linear-gradient(180deg, rgba(35,22,10,.95), rgba(20,12,6,.98))',
        border:'1px solid rgba(201,162,106,.5)',
        borderRadius:16,
        padding:'30px 36px 26px',
        boxShadow:'0 30px 80px rgba(0,0,0,.7), inset 0 1px 0 rgba(230,197,144,.15)',
        minWidth:380, maxWidth:440,
        textAlign:'center'
      }}>
        <div style={{ fontSize:10, letterSpacing:'.32em', textTransform:'uppercase', color:'var(--ivory-dim)', marginBottom:6 }}>Limestone Games</div>
        <div style={{
          fontFamily:"'Playfair Display', serif", fontStyle:'italic',
          fontSize:22, color:'var(--brass-2)', marginBottom:20, lineHeight:1.3
        }}>
          {initialName ? 'Going by something different tonight?' : 'What should I call you at the machine?'}
        </div>
        <input
          ref={inputRef}
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={20}
          placeholder="Your name"
          autoComplete="off"
          style={{
            width:'100%', padding:'12px 16px',
            background:'rgba(10,6,3,.6)',
            border:'1px solid rgba(201,162,106,.4)',
            borderRadius:10, color:'var(--ivory)',
            fontFamily:"'Playfair Display', serif",
            fontSize:19, fontStyle:'italic', textAlign:'center',
            outline:'none', boxSizing:'border-box'
          }}/>
        <div style={{ display:'flex', gap:10, marginTop:18, justifyContent:'center' }}>
          {onCancel && (
            <button type="button" onClick={onCancel} style={{
              padding:'10px 18px',
              background:'rgba(20,12,6,.6)',
              border:'1px solid rgba(201,162,106,.3)',
              borderRadius:999, color:'var(--ivory-dim)',
              fontSize:10, fontWeight:700, letterSpacing:'.18em', textTransform:'uppercase', cursor:'pointer'
            }}>Cancel</button>
          )}
          <button type="submit" disabled={!name.trim()} style={{
            padding:'10px 22px',
            background: name.trim() ? 'linear-gradient(180deg, #e6c590, #c9a26a)' : 'rgba(201,162,106,.25)',
            border:'1px solid rgba(201,162,106,.5)',
            borderRadius:999,
            color: name.trim() ? '#1a1208' : 'var(--ivory-dim)',
            fontSize:10, fontWeight:700, letterSpacing:'.18em', textTransform:'uppercase',
            cursor: name.trim() ? 'pointer' : 'not-allowed',
            boxShadow: name.trim() ? '0 4px 12px rgba(230,197,144,.4)' : 'none'
          }}>Pull Up A Seat →</button>
        </div>
      </form>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
