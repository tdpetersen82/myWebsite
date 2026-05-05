/* eslint-disable */
// Roulette App — state machine, persistence, dialogue dispatch.

const { useState, useEffect, useRef, useMemo } = React;

const STARTING_BANKROLL = 1000;
const MIN_BET = 5;
const STORAGE_KEY = 'rouletteStats';

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "playerName": "Alex",
  "dealerName": "Melissa",
  "showHints": true,
  "soundOn": false,
  "startingBankroll": 1000
}/*EDITMODE-END*/;

function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // Persistent
  const [bankroll, setBankroll] = useState(STARTING_BANKROLL);
  const [stats, setStats] = useState({ spinsPlayed: 0, spinsWon: 0, biggestWin: 0, biggestBankroll: STARTING_BANKROLL });
  const [history, setHistory] = useState([]);

  // Round
  const [phase, setPhase] = useState('betting'); // betting | no_more_bets | spinning | result
  const [bets, setBets] = useState([]); // [{ id, type, numbers, amount }]
  const [selectedChip, setSelectedChip] = useState(5);
  const [target, setTarget] = useState(null); // chosen winning number for current spin
  const [winningNumber, setWinningNumber] = useState(null); // displayed after spin
  const [resultBanner, setResultBanner] = useState(null); // {kind, payout}
  const [lastBet, setLastBet] = useState(null);

  // Dealer
  const [expression, setExpression] = useState('idle');
  const [message, setMessage] = useState('');
  const [tipped, setTipped] = useState(false);
  const [isIdle, setIsIdle] = useState(false);
  const [mood, setMood] = useState(0);
  const [showNameModal, setShowNameModal] = useState(false);
  const idleTimerRef = useRef(null);
  const expressionTimerRef = useRef(null);

  const ctx = { player: tweaks.playerName, dealer: tweaks.dealerName };

  // ── Persistence ────────────────────────────────────────
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved) {
        if (saved.bankroll != null) setBankroll(saved.bankroll);
        if (saved.stats) setStats(s => ({ ...s, ...saved.stats }));
        if (Array.isArray(saved.history)) setHistory(saved.history);
      }
    } catch (e) {}
    const storedName = localStorage.getItem('bjPlayerName');
    if (storedName && storedName.trim()) {
      if (storedName !== tweaks.playerName) setTweak('playerName', storedName);
    } else {
      setShowNameModal(true);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ bankroll, stats, history }));
  }, [bankroll, stats, history]);

  function savePlayerName(name) {
    const trimmed = (name || '').trim().slice(0, 20);
    if (!trimmed) return;
    localStorage.setItem('bjPlayerName', trimmed);
    setTweak('playerName', trimmed);
    setShowNameModal(false);
  }

  // ── Mood & dialogue ───────────────────────────────────

  function nudgeMood(delta) {
    setMood(m => Math.max(-1, Math.min(1, m + delta)));
  }

  function say(key, expr, extra) {
    setMessage(pickLine(key, { ...ctx, ...(extra || {}) }));
    if (expr) {
      flashExpression(expr);
      const moodDelta = expr === 'happy' ? 0.18
        : expr === 'shocked' ? 0.10
        : (expr === 'sad' || expr === 'bust') ? -0.18
        : 0;
      if (moodDelta) nudgeMood(moodDelta);
    }
  }

  // Set expression and (optionally) restore to idle after `holdMs`
  function flashExpression(expr, holdMs) {
    if (expressionTimerRef.current) clearTimeout(expressionTimerRef.current);
    setExpression(expr);
    if (holdMs) {
      expressionTimerRef.current = setTimeout(() => setExpression('idle'), holdMs);
    }
  }

  // Mood decay
  useEffect(() => {
    const id = setInterval(() => {
      setMood(m => Math.abs(m) < 0.02 ? 0 : m * 0.94);
    }, 2500);
    return () => clearInterval(id);
  }, []);

  // Greeting on mount, dealer or player name change
  useEffect(() => {
    setMessage(pickLine('greet', ctx));
    setExpression('idle');
  }, [tweaks.dealerName, tweaks.playerName]);

  // Idle behavior — after 15s of inactivity in betting phase
  useEffect(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (phase === 'betting') {
      idleTimerRef.current = setTimeout(() => {
        if (bets.length === 0) {
          setIsIdle(true);
          say('idle_long');
        }
      }, 15000);
    } else {
      setIsIdle(false);
    }
    return () => { if (idleTimerRef.current) clearTimeout(idleTimerRef.current); };
  }, [phase, bets.length, tweaks.playerName]);

  // ── Bet handling ──────────────────────────────────────

  const totalBet = useMemo(() => bets.reduce((s, b) => s + b.amount, 0), [bets]);

  function placeBet(cell) {
    if (phase !== 'betting') return;
    if (selectedChip > bankroll - totalBet) return;
    setIsIdle(false);

    const existingIdx = bets.findIndex(b => b.id === cell.id);
    if (existingIdx >= 0) {
      setBets(prev => prev.map((b, i) => i === existingIdx ? { ...b, amount: b.amount + selectedChip } : b));
    } else {
      setBets(prev => [...prev, { id: cell.id, type: cell.type, numbers: cell.numbers, amount: selectedChip }]);
    }
    if (tweaks.soundOn) RL_SFX.chipPlace();

    const newTotal = totalBet + selectedChip;
    if (newTotal >= 500) say('bet_high', 'shocked');
    else if (newTotal >= 100 || selectedChip >= 100) say('bet_mid', 'happy');
    else say('bet_low');
  }

  function clearBets() {
    if (phase !== 'betting') return;
    setBets([]);
    if (tweaks.soundOn) RL_SFX.chipRemove();
  }

  function rebet() {
    if (phase !== 'betting' || !lastBet || lastBet.length === 0) return;
    const total = lastBet.reduce((s,b)=>s+b.amount,0);
    if (total > bankroll) return;
    setBets(lastBet);
    if (tweaks.soundOn) RL_SFX.chipPlace();
    say('bet_mid', 'happy');
  }

  // ── Spin flow ──────────────────────────────────────────

  function spin() {
    if (phase !== 'betting' || bets.length === 0) return;
    if (totalBet > bankroll) return;
    setLastBet(bets);
    setBankroll(br => br - totalBet);
    setResultBanner(null);
    setWinningNumber(null);

    const result = Math.floor(Math.random() * 37);
    setTarget(result);

    setPhase('no_more_bets');
    say('no_more_bets', 'shocked');

    setTimeout(() => {
      setPhase('spinning');
      say('spin', 'idle');
    }, 900);
  }

  function onWheelLanded(num) {
    setWinningNumber(num);
    resolveSpin(num);
  }

  function resolveSpin(num) {
    setPhase('result');
    const isZero = num === 0;
    const isRedN = !isZero && RED_NUMBERS.includes(num);
    const colorKey = isZero ? 'result_zero' : (isRedN ? 'result_red' : 'result_black');

    let winnings = 0;
    let bestPayout = 0;
    let hadStraight = false;
    bets.forEach(b => {
      if (b.numbers.includes(num)) {
        const payout = PAYOUTS[b.type];
        const w = b.amount * payout + b.amount;
        winnings += w;
        bestPayout = Math.max(bestPayout, payout);
        if (b.type === 'straight') hadStraight = true;
      }
    });

    const profit = winnings - totalBet;

    // Update bankroll & stats
    if (winnings > 0) setBankroll(br => br + winnings);
    setStats(prev => {
      const next = {
        spinsPlayed: prev.spinsPlayed + 1,
        spinsWon: prev.spinsWon + (profit > 0 ? 1 : 0),
        biggestWin: Math.max(prev.biggestWin, profit > 0 ? profit : 0),
        biggestBankroll: Math.max(prev.biggestBankroll, bankroll - totalBet + winnings)
      };
      return next;
    });
    setHistory(h => [num, ...h].slice(0, 30));

    // Result banner
    if (hadStraight && profit > 0) {
      setResultBanner({ kind: 'straight', payout: profit });
    } else if (profit > 0 && profit >= totalBet * 5) {
      setResultBanner({ kind: 'bigwin', payout: profit });
    } else if (profit > 0) {
      setResultBanner({ kind: 'win', payout: profit });
    } else if (profit === 0 && winnings > 0) {
      setResultBanner({ kind: 'push', payout: 0 });
    } else {
      setResultBanner({ kind: 'lose', payout: 0 });
    }

    // Dialogue + sound after color announcement
    setMessage(pickLine(colorKey, { ...ctx, number: num }));

    setTimeout(() => {
      if (hadStraight && profit > 0) {
        say('win_straight', 'shocked');
        if (tweaks.soundOn) RL_SFX.bigWin();
      } else if (profit > 0 && profit >= totalBet * 5) {
        say('win_big', 'shocked');
        if (tweaks.soundOn) RL_SFX.bigWin();
      } else if (profit > 0) {
        say('win_small', 'happy');
        if (tweaks.soundOn) RL_SFX.win();
      } else if (winnings > 0) {
        // push (rare in roulette)
        say('lose');
      } else {
        say('lose', 'sad');
        if (tweaks.soundOn) RL_SFX.lose();
      }
    }, 1400);

    // Next round
    setTimeout(() => {
      nextRound();
    }, 3500);
  }

  function nextRound() {
    setBets([]);
    setTarget(null);
    setWinningNumber(null);
    setResultBanner(null);
    if (bankroll < MIN_BET && totalBet === 0) {
      // Bankroll wipe
      setBankroll(STARTING_BANKROLL);
      say('bust', 'bust');
    }
    setPhase('betting');
  }

  // ── Tip ────────────────────────────────────────────────
  function tipDealer() {
    if (tipped || bankroll < 5 || phase !== 'betting') return;
    if (tweaks.soundOn) RL_SFX.tip();
    setBankroll(br => br - 5);
    setTipped(true);
    flashExpression('happy', 2500);
    setMessage(pickLine('after_tip', ctx));
    nudgeMood(0.35);
    setTimeout(() => setTipped(false), 30000);
  }

  // ── Hint ───────────────────────────────────────────────
  const hint = useMemo(() => {
    if (!tweaks.showHints) return null;
    if (phase !== 'betting') return null;
    return makeHint(bets);
  }, [tweaks.showHints, phase, bets]);

  // ── Render ─────────────────────────────────────────────
  const disabled = phase !== 'betting';

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
          flex: 1, position:'relative', minWidth: 800,
          borderRadius: 18, overflow: 'hidden'
        }}>
          <FeltBackdrop />
          <FeltLogo />

          <div style={{ position:'absolute', inset: 0, display:'flex', flexDirection:'column' }}>
            <BrassRail
              bankroll={bankroll}
              biggestWin={stats.biggestWin}
              spinsPlayed={stats.spinsPlayed}
              spinsWon={stats.spinsWon}
              peak={stats.biggestBankroll}
              showHints={tweaks.showHints}
              onToggleHints={() => setTweak('showHints', !tweaks.showHints)}
            />

            {/* Wheel + result row */}
            <div style={{
              display:'flex', alignItems:'center', justifyContent:'space-around',
              padding:'12px 32px 0',
              gap: 24,
              position:'relative'
            }}>
              <div style={{ position:'relative' }}>
                <Wheel
                  size={260}
                  target={target}
                  spinning={phase === 'spinning'}
                  onLanded={onWheelLanded}
                  onSpinStart={() => tweaks.soundOn && RL_SFX.spinStart()}
                  onTickStart={(d) => tweaks.soundOn && RL_SFX.startSpinTicks(d)}
                  onTickStop={() => tweaks.soundOn && RL_SFX.stopSpinTicks()}
                  onBallDrop={() => tweaks.soundOn && RL_SFX.ballDrop()}
                />
              </div>

              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap: 14 }}>
                <ResultBigNumber result={winningNumber} />
                <HistoryStrip history={history} />
              </div>
            </div>

            {/* Phase banner */}
            {phase === 'no_more_bets' && (
              <div style={{
                position:'absolute', top: 200, left:'50%', transform:'translateX(-50%)',
                padding:'8px 22px',
                background:'rgba(10,6,3,.9)',
                border:'1px solid var(--brass-2)',
                borderRadius: 999,
                color:'var(--brass-2)',
                fontFamily:"'Playfair Display', serif",
                fontStyle:'italic', fontSize: 16,
                letterSpacing:'.18em', textTransform:'uppercase',
                zIndex: 10,
                boxShadow:'0 12px 28px rgba(0,0,0,.5)'
              }} className="banner-in">No more bets</div>
            )}
            {resultBanner && phase === 'result' && (
              <ResultBanner kind={resultBanner.kind} payout={resultBanner.payout} />
            )}

            {/* Hint panel */}
            <HintPanel hint={hint} />

            {/* Betting board + chip rack + actions */}
            <div style={{
              flex: 1, padding:'14px 24px 24px',
              display:'flex', flexDirection:'column', gap: 12,
              justifyContent:'flex-end'
            }}>
              <BettingBoard
                bets={bets}
                onPlace={placeBet}
                winningNumber={phase === 'result' ? winningNumber : null}
                disabled={disabled}
              />

              <div style={{
                display:'flex', alignItems:'center', justifyContent:'space-between',
                gap: 14
              }}>
                <ChipRack selected={selectedChip} onSelect={setSelectedChip} bankroll={bankroll - totalBet} />

                <div style={{ display:'flex', alignItems:'center', gap: 10 }}>
                  <div style={{
                    padding:'8px 16px',
                    background:'rgba(10,6,3,.5)',
                    border:'1px dashed rgba(201,162,106,.5)',
                    borderRadius: 12,
                    color: totalBet > 0 ? 'var(--brass-2)' : 'var(--ivory-dim)',
                    fontFamily:"'Playfair Display', serif",
                    fontStyle:'italic', fontSize: 18,
                    minWidth: 130, textAlign:'center'
                  }}>
                    <div style={{
                      fontFamily:'system-ui, sans-serif',
                      fontStyle:'normal', fontSize: 9,
                      letterSpacing:'.28em', textTransform:'uppercase',
                      color:'var(--ivory-dim)', marginBottom: 2
                    }}>Total Bet</div>
                    ${totalBet}
                  </div>

                  <ActionButton onClick={clearBets} label="Clear" disabled={disabled || bets.length === 0} />
                  <ActionButton onClick={rebet} label="Rebet ↺" disabled={disabled || !lastBet || lastBet.length === 0 || bets.length > 0} />
                  <ActionButton onClick={spin} label="Spin →" primary disabled={disabled || bets.length === 0} />
                </div>
              </div>
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
          <TweakButton label="Reset bankroll" onClick={() => {
            setBankroll(tweaks.startingBankroll);
            setStats({ spinsPlayed:0, spinsWon:0, biggestWin:0, biggestBankroll: tweaks.startingBankroll });
            setHistory([]);
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

function ActionButton({ onClick, label, primary, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding:'12px 20px',
        background: disabled
          ? 'rgba(20,12,6,.4)'
          : (primary ? 'linear-gradient(180deg, #e6c590, #c9a26a)' : 'rgba(20,12,6,.7)'),
        color: disabled ? 'var(--ivory-dim)' : (primary ? '#1a1208' : 'var(--brass-2)'),
        border: `1px solid ${primary ? 'var(--brass-2)' : 'rgba(201,162,106,.4)'}`,
        borderRadius: 10,
        fontSize: 11, fontWeight: 700, letterSpacing:'.2em',
        textTransform:'uppercase',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        whiteSpace:'nowrap',
        transition:'all .2s',
        boxShadow: primary && !disabled ? '0 8px 18px rgba(230,197,144,.4)' : '0 4px 10px rgba(0,0,0,.4)'
      }}
    >{label}</button>
  );
}

function NameModal({ initialName = '', onSave, onCancel }) {
  const [name, setName] = React.useState(initialName);
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    const id = setTimeout(() => {
      inputRef.current && inputRef.current.focus();
      inputRef.current && inputRef.current.select();
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
          {initialName ? 'Going by something different tonight?' : 'What should the croupier call you?'}
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

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
