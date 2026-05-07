/* eslint-disable */
// Main craps app — state machine, bet placement, dice rolling, persistence,
// dialogue, modals. Mirrors the architecture of bj-app.jsx.

const { useState, useEffect, useRef, useMemo, useCallback } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "playerName": "Alex",
  "dealerName": "Melissa",
  "showHints": true,
  "soundOn": false,
  "startingBankroll": 1000,
  "maxOddsMultiplier": 3
}/*EDITMODE-END*/;

const POINT_NUMBERS = window.CR_RULES.POINT_NUMBERS;

function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // ── Bankroll (shared store) ──
  const [bankroll, setBankroll] = useState(() =>
    window.CASINO_BANKROLL ? window.CASINO_BANKROLL.read() : tweaks.startingBankroll
  );
  const [stats, setStats] = useState({
    rolls: 0, passWins: 0, dontPassWins: 0, comeWins: 0, bestBankroll: tweaks.startingBankroll
  });
  const [streak, setStreak] = useState(0);
  const [lossStreak, setLossStreak] = useState(0);
  const [showBrokeModal, setShowBrokeModal] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);

  // Mirror bankroll into shared store on every change
  useEffect(() => {
    if (window.CASINO_BANKROLL) window.CASINO_BANKROLL.write(bankroll);
  }, [bankroll]);

  // Mount-time migration + load persisted stats
  useEffect(() => {
    try {
      const raw = localStorage.getItem('crapsStats');
      if (raw) {
        const old = JSON.parse(raw);
        if (old) {
          // One-time migration: if a legacy bankroll field is here and exceeds
          // the current shared bankroll, carry it forward.
          if (typeof old.bankroll === 'number' && old.bankroll > 0 && window.CASINO_BANKROLL) {
            const cur = window.CASINO_BANKROLL.read();
            if (old.bankroll > cur) {
              window.CASINO_BANKROLL.write(old.bankroll);
              setBankroll(old.bankroll);
            }
            delete old.bankroll;
          }
          setStats(s => ({ ...s, ...old }));
        }
      }
    } catch (e) {}
    // Hints toggle: respect any persisted value at first mount.
    try {
      const h = localStorage.getItem('crapsHintsOn');
      if (h === 'true' || h === 'false') {
        const want = h === 'true';
        if (want !== tweaks.showHints) setTweak('showHints', want);
      }
    } catch (e) {}
    // Player name persistence
    const storedName = window.CASINO_PLAYER.read();
    if (storedName) {
      if (storedName !== tweaks.playerName) setTweak('playerName', storedName);
    } else {
      setShowNameModal(true);
    }
  }, []);

  useEffect(() => {
    try {
      const toSave = { ...stats };
      delete toSave.bankroll;
      localStorage.setItem('crapsStats', JSON.stringify(toSave));
    } catch (e) {}
  }, [stats]);

  useEffect(() => {
    try { localStorage.setItem('crapsHintsOn', String(tweaks.showHints)); } catch (e) {}
  }, [tweaks.showHints]);

  function savePlayerName(name) {
    const trimmed = window.CASINO_PLAYER.write(name);
    if (!trimmed) return;
    setTweak('playerName', trimmed);
    setShowNameModal(false);
  }

  // ── Game state ──
  const [phase, setPhase] = useState('comeOut'); // 'comeOut' | 'point' | 'rolling' | 'resolving'
  const [point, setPoint] = useState(0);
  const [bets, setBets] = useState(() => window.CR_RULES.emptyBets());
  const [lastBets, setLastBets] = useState(null);
  const [lastBankrollAtBet, setLastBankrollAtBet] = useState(null);
  const [dice, setDice] = useState({ a: 1, b: 1 });
  const [isRolling, setIsRolling] = useState(false);
  const [selectedChip, setSelectedChip] = useState(5);
  const [resultBanner, setResultBanner] = useState(null);
  const [rollMessages, setRollMessages] = useState([]);
  const [illegalZone, setIllegalZone] = useState(null);
  const [hoverZone, setHoverZone] = useState(null);
  const [hintExpanded, setHintExpanded] = useState(false);

  // Dialogue
  const [expression, setExpression] = useState('idle');
  const [message, setMessage] = useState('');
  const [tipped, setTipped] = useState(false);
  const [isIdle, setIsIdle] = useState(false);
  const [mood, setMood] = useState(0);
  const idleTimerRef = useRef(null);

  const dialogueCtx = { player: tweaks.playerName, dealer: tweaks.dealerName, point };

  function nudgeMood(delta) {
    setMood(m => Math.max(-1, Math.min(1, m + delta)));
  }

  function say(key, expr, extras) {
    const ctx = { ...dialogueCtx, ...(extras || {}) };
    setMessage(crPickLine(key, ctx));
    if (expr) {
      setExpression(expr);
      const moodDelta = expr === 'happy' ? 0.18
        : expr === 'shocked' ? 0.10
        : (expr === 'sad' || expr === 'bust') ? -0.18
        : 0;
      if (moodDelta) nudgeMood(moodDelta);
    }
  }

  // Mood decays toward zero
  useEffect(() => {
    const id = setInterval(() => {
      setMood(m => Math.abs(m) < 0.02 ? 0 : m * 0.94);
    }, 2500);
    return () => clearInterval(id);
  }, []);

  // Greeting on mount / dealer change / name change
  useEffect(() => {
    setMessage(crPickLine('greet', { player: tweaks.playerName, dealer: tweaks.dealerName, point }));
    setExpression('idle');
  }, [tweaks.dealerName]);

  // Idle prompt
  useEffect(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (phase === 'comeOut' || phase === 'point') {
      idleTimerRef.current = setTimeout(() => {
        setIsIdle(true);
        setMessage(crPickLine('idle_long', dialogueCtx));
      }, 12000);
    } else {
      setIsIdle(false);
    }
    return () => { if (idleTimerRef.current) clearTimeout(idleTimerRef.current); };
  }, [phase, message]);

  // Broke detection
  useEffect(() => {
    const atRisk = window.CR_RULES.totalAtRisk(bets);
    if ((phase === 'comeOut' || phase === 'point') && bankroll < window.CR_RULES.MIN_BET && atRisk === 0) {
      setShowBrokeModal(true);
    } else if (bankroll >= window.CR_RULES.MIN_BET && showBrokeModal) {
      setShowBrokeModal(false);
    }
  }, [phase, bankroll, bets, showBrokeModal]);

  // ── Bet legality ──
  function isLegal(zone, n) {
    if (phase !== 'comeOut' && phase !== 'point') return false;
    if (zone === 'pass')         return phase === 'comeOut' && bets.dontPass === 0;
    if (zone === 'dontPass')     return phase === 'comeOut' && bets.pass === 0;
    if (zone === 'passOdds')     return phase === 'point' && bets.pass > 0 && bets.passOdds < bets.pass * tweaks.maxOddsMultiplier;
    if (zone === 'dontPassOdds') return phase === 'point' && bets.dontPass > 0 && bets.dontPassOdds < bets.dontPass * tweaks.maxOddsMultiplier * 2;
    if (zone === 'come')         return phase === 'point';
    if (zone === 'dontCome')     return phase === 'point';
    if (zone === 'comeOdds')     return phase === 'point' && bets.comePoints[n] > 0 && bets.comeOdds[n] < bets.comePoints[n] * tweaks.maxOddsMultiplier;
    if (zone === 'dontComeOdds') return phase === 'point' && bets.dontComePoints[n] > 0 && bets.dontComeOdds[n] < bets.dontComePoints[n] * tweaks.maxOddsMultiplier * 2;
    if (zone === 'place')        return phase === 'point';
    if (zone === 'field')        return true;
    return false;
  }

  function placeBet(zone, n) {
    if (phase !== 'comeOut' && phase !== 'point') return;
    if (!isLegal(zone, n)) {
      flashIllegal(zoneId(zone, n));
      return;
    }
    if (bankroll < selectedChip) {
      flashIllegal(zoneId(zone, n));
      return;
    }

    setBets(prev => {
      const next = window.CR_RULES.cloneBets(prev);
      if (zone === 'pass')         next.pass += selectedChip;
      else if (zone === 'dontPass') next.dontPass += selectedChip;
      else if (zone === 'passOdds') next.passOdds += selectedChip;
      else if (zone === 'dontPassOdds') next.dontPassOdds += selectedChip;
      else if (zone === 'come')     next.come += selectedChip;
      else if (zone === 'dontCome') next.dontCome += selectedChip;
      else if (zone === 'comeOdds')     next.comeOdds[n] += selectedChip;
      else if (zone === 'dontComeOdds') next.dontComeOdds[n] += selectedChip;
      else if (zone === 'place')    next.place[n] += selectedChip;
      else if (zone === 'field')    next.field += selectedChip;
      return next;
    });
    setBankroll(b => b - selectedChip);
    setIsIdle(false);
    if (tweaks.soundOn) CR_SFX.chip();

    // Light dialogue cues based on the zone
    const lineKey =
      zone === 'pass' ? 'pass' :
      zone === 'dontPass' ? 'dont_pass' :
      zone === 'field' ? 'field' :
      zone === 'place' ? 'place' :
      zone === 'come' ? 'come' :
      (zone === 'passOdds' || zone === 'dontPassOdds' || zone === 'comeOdds' || zone === 'dontComeOdds') ? 'odds' :
      zone === 'dontCome' ? 'dont_pass' :
      null;
    if (lineKey) say(lineKey, 'happy');
  }

  function zoneId(zone, n) {
    if (n != null) return zone + ':' + n;
    return zone;
  }

  function flashIllegal(id) {
    setIllegalZone(id);
    setTimeout(() => setIllegalZone(null), 350);
  }

  function clearAllBets() {
    // Refund bets that are clearable. In point phase, contract bets stay.
    setBets(prev => {
      const next = window.CR_RULES.cloneBets(prev);
      let refund = 0;
      if (phase === 'comeOut') {
        refund += next.pass + next.dontPass + next.field;
        next.pass = 0; next.dontPass = 0; next.field = 0;
      } else {
        refund += next.field;
        next.field = 0;
        for (const n of POINT_NUMBERS) {
          refund += next.place[n];
          next.place[n] = 0;
        }
      }
      if (refund > 0) setBankroll(b => b + refund);
      return next;
    });
  }

  function rebetFromLast() {
    if (!lastBets) return;
    const totalNeeded = window.CR_RULES.totalAtRisk(lastBets);
    if (bankroll < totalNeeded) return;
    setBankroll(b => b - totalNeeded);
    setBets(window.CR_RULES.cloneBets(lastBets));
    say('rebet', 'happy');
  }

  // ── Roll dice ──
  function canRoll() {
    if (phase !== 'comeOut' && phase !== 'point') return false;
    return window.CR_RULES.totalAtRisk(bets) > 0;
  }

  function rollDice() {
    if (!canRoll()) return;
    setLastBets(window.CR_RULES.cloneBets(bets));
    setLastBankrollAtBet(bankroll);
    setRollMessages([]);
    setResultBanner(null);
    setHintExpanded(false);
    setPhase('rolling');
    setIsRolling(true);
    if (tweaks.soundOn) CR_SFX.diceShake();
    say('roll', 'idle');

    const a = window.CR_RULES.dieRoll();
    const b = window.CR_RULES.dieRoll();

    setTimeout(() => {
      setDice({ a, b });
      setIsRolling(false);
      if (tweaks.soundOn) CR_SFX.diceLand();

      const result = window.CR_RULES.resolveRoll(a, b, bets, phase, point);
      applyRollResult(result, a + b);
    }, 800);
  }

  function applyRollResult(result, total) {
    setBets(result.newBets);
    if (result.winnings > 0) setBankroll(b => b + result.winnings);
    setPoint(result.newPoint);
    setRollMessages(result.messages);
    setResultBanner({ kind: result.bannerKind, total, totalWon: result.winnings });

    if (tweaks.soundOn && result.sfxKey && CR_SFX[result.sfxKey]) {
      CR_SFX[result.sfxKey]();
    }

    // Dialogue
    if (result.bannerKind === 'natural')    say('natural', 'happy');
    else if (result.bannerKind === 'craps') say('craps', 'sad');
    else if (result.bannerKind === 'point_set')  say('point_set', 'idle', { point: result.newPoint });
    else if (result.bannerKind === 'point_made') say('point_made', 'shocked', { point });
    else if (result.bannerKind === 'seven_out')  say('seven_out', 'sad');
    else if (result.winnings > 0) say('win', 'sad');
    else say('idle', 'idle');

    // Stats + streaks
    setStats(s => ({
      ...s,
      rolls: s.rolls + 1,
      passWins: s.passWins + (result.bannerKind === 'natural' || result.bannerKind === 'point_made' ? 1 : 0),
      dontPassWins: s.dontPassWins + (result.bannerKind === 'seven_out' && bets.dontPass > 0 ? 1 : 0),
      comeWins: s.comeWins + result.messages.filter(m => m.startsWith('Come ') && m.includes('+$')).length,
      bestBankroll: Math.max(s.bestBankroll, bankroll + result.winnings)
    }));

    if (result.bannerKind === 'natural' || result.bannerKind === 'point_made') {
      setStreak(s => {
        const ns = s + 1;
        if (ns >= 5 && ns % 5 === 0) setTimeout(() => say('streak5', 'shocked'), 1500);
        else if (ns === 3) setTimeout(() => say('streak3', 'happy'), 1500);
        else if (ns === 2) setTimeout(() => say('streak2', 'happy'), 1500);
        return ns;
      });
      setLossStreak(0);
      // Confetti for big wins (point made)
      if (result.bannerKind === 'point_made' && typeof confetti === 'function') {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
      }
    } else if (result.bannerKind === 'seven_out') {
      setStreak(0);
      setLossStreak(ls => {
        const nl = ls + 1;
        if (nl >= 3) setTimeout(() => say('losing_streak', 'sad'), 1500);
        return nl;
      });
    }

    // Re-enter betting after resolution delay
    setPhase('resolving');
    setTimeout(() => {
      setPhase(result.newPhase);
    }, 1600);
  }

  // ── Tip dealer ──
  function tipDealer() {
    if (tipped || bankroll < 5) return;
    if (tweaks.soundOn) CR_SFX.tip();
    setBankroll(b => b - 5);
    setTipped(true);
    setExpression('happy');
    nudgeMood(0.35);
    setMessage(crPickLine('after_tip', dialogueCtx));
    setTimeout(() => setTipped(false), 30000);
  }

  // ── Hints ──
  const hint = useMemo(() => {
    if (!tweaks.showHints) return null;
    if (phase !== 'comeOut' && phase !== 'point') return null;
    return window.CR_STRATEGY.getBettingHint({ phase, point, bets });
  }, [tweaks.showHints, phase, point, bets]);

  // ── Hover-zone tooltip lookup ──
  const hoverInfo = useMemo(() => {
    if (!hoverZone) return null;
    const BI = window.CR_RULES.BET_INFO;
    if (hoverZone === 'pass')         return BI.pass;
    if (hoverZone === 'dontPass')     return BI.dontPass;
    if (hoverZone === 'passOdds')     return BI.passOdds;
    if (hoverZone === 'dontPassOdds') return BI.dontPassOdds;
    if (hoverZone === 'field')        return BI.field;
    if (hoverZone === 'come')         return BI.come;
    if (hoverZone === 'dontCome')     return BI.dontCome;
    if (hoverZone.startsWith('place')) {
      const n = parseInt(hoverZone.slice(5), 10);
      return BI['place' + n];
    }
    return null;
  }, [hoverZone]);

  // ── Active odds zone (whichever side has a flat bet) ──
  const oddsActive = phase === 'point' && (bets.pass > 0 || bets.dontPass > 0);
  const oddsVariant = bets.pass > 0 ? 'pass' : 'dontPass';
  const oddsAmount = oddsVariant === 'pass' ? bets.passOdds : bets.dontPassOdds;

  // ── Render ──
  const phaseLabel = phase === 'comeOut' ? 'COME-OUT ROLL' : phase === 'point' ? `POINT IS ${point}` : phase === 'rolling' ? 'ROLLING' : 'RESOLVING';

  return (
    <div style={{
      width: '100vw', height: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
      position: 'relative'
    }}>
      <div style={{
        width: 1380, maxWidth: '100%', height: '100%', maxHeight: 860,
        display: 'flex', gap: 20, position: 'relative'
      }}>
        <CRDealerPanel
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

        <div style={{ flex: 1, position: 'relative', minWidth: 800 }}>
          <FeltBackdrop />

          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
            <BrassRail
              bankroll={bankroll}
              streak={streak}
              rolls={stats.rolls}
              peak={stats.bestBankroll}
              showHints={tweaks.showHints}
              soundOn={tweaks.soundOn}
              onToggleHints={() => setTweak('showHints', !tweaks.showHints)}
              onToggleSound={() => setTweak('soundOn', !tweaks.soundOn)}
            />

            {/* Play area */}
            <div style={{
              flex: 1,
              position: 'relative',
              padding: '12px 22px 0',
              display: 'flex', flexDirection: 'column', gap: 10,
              minHeight: 0
            }}>
              <FeltLogo />

              {/* Phase banner */}
              <div style={{
                position: 'absolute', top: 4, left: '50%', transform: 'translateX(-50%)',
                fontSize: 9, letterSpacing: '.4em', color: 'var(--brass)', textTransform: 'uppercase',
                fontWeight: 700, zIndex: 4
              }}>{phaseLabel}</div>

              {/* Place number row */}
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                {POINT_NUMBERS.map(n => {
                  const totals = window.CR_RULES.cellTotals(bets, n);
                  return (
                    <PlaceNumberCell
                      key={n}
                      n={n}
                      isPoint={point === n}
                      totals={totals}
                      disabled={phase !== 'point'}
                      onClickPlace={() => placeBet('place', n)}
                      onClickComeOdds={() => placeBet('comeOdds', n)}
                      onClickDontComeOdds={() => placeBet('dontComeOdds', n)}
                      onHoverChange={(h, id) => setHoverZone(h ? id : null)}
                    />
                  );
                })}
              </div>

              {/* Field + Come row */}
              <div style={{ display: 'flex', gap: 8 }}>
                <BetZone
                  id="field"
                  label="Field"
                  sublabel="2 · 3 · 4 · 9 · 10 · 11 · 12"
                  hint="2 pays 2:1 · 12 pays 3:1"
                  amount={bets.field}
                  onClick={() => placeBet('field')}
                  illegal={illegalZone === 'field'}
                  onHoverChange={(h, id) => setHoverZone(h ? id : null)}
                  style={{ flex: 2.4 }}
                />
                <BetZone
                  id="come"
                  label="Come"
                  sublabel="Travels to next number"
                  amount={bets.come}
                  disabled={phase !== 'point'}
                  onClick={() => placeBet('come')}
                  illegal={illegalZone === 'come'}
                  onHoverChange={(h, id) => setHoverZone(h ? id : null)}
                  style={{ flex: 1 }}
                />
              </div>

              {/* Pass / dice / dont come row */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
                <BetZone
                  id="pass"
                  label="Pass Line"
                  sublabel="With the shooter"
                  amount={bets.pass}
                  isPoint={false}
                  disabled={!isLegal('pass') && bets.pass === 0 && phase !== 'comeOut'}
                  onClick={() => placeBet('pass')}
                  illegal={illegalZone === 'pass'}
                  onHoverChange={(h, id) => setHoverZone(h ? id : null)}
                  style={{ flex: 1.3, minHeight: 110 }}
                />
                <div style={{
                  flex: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative', minHeight: 110
                }}>
                  <DiceTray dice={dice} rolling={isRolling} />
                </div>
                <BetZone
                  id="dontCome"
                  label="Don't Come"
                  sublabel="Against the come"
                  amount={bets.dontCome}
                  disabled={phase !== 'point'}
                  onClick={() => placeBet('dontCome')}
                  illegal={illegalZone === 'dontCome'}
                  onHoverChange={(h, id) => setHoverZone(h ? id : null)}
                  style={{ flex: 1, minHeight: 110 }}
                />
              </div>

              {/* Don't Pass + Odds row */}
              <div style={{ display: 'flex', gap: 8 }}>
                <BetZone
                  id="dontPass"
                  label="Don't Pass · Bar 12"
                  sublabel="Against the shooter"
                  amount={bets.dontPass}
                  disabled={!isLegal('dontPass') && bets.dontPass === 0 && phase !== 'comeOut'}
                  onClick={() => placeBet('dontPass')}
                  illegal={illegalZone === 'dontPass'}
                  onHoverChange={(h, id) => setHoverZone(h ? id : null)}
                  style={{ flex: 1.3 }}
                />
                {oddsActive ? (
                  <BetZone
                    id={oddsVariant + 'Odds'}
                    label={oddsVariant === 'pass' ? 'Pass Odds' : "Don't Pass Odds"}
                    sublabel="0% house edge"
                    hint={`max ${tweaks.maxOddsMultiplier}× base`}
                    amount={oddsAmount}
                    onClick={() => placeBet(oddsVariant + 'Odds')}
                    illegal={illegalZone === oddsVariant + 'Odds'}
                    onHoverChange={(h, id) => setHoverZone(h ? id : null)}
                    style={{ flex: 1.3 }}
                  />
                ) : (
                  <div style={{
                    flex: 1.3,
                    border: '1px dashed rgba(201,162,106,.18)',
                    borderRadius: 10,
                    padding: '12px 14px',
                    fontSize: 10, letterSpacing: '.24em',
                    color: 'rgba(201,162,106,.4)',
                    textTransform: 'uppercase',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>Odds — Make a pass / don't bet first</div>
                )}
              </div>

              {/* Roll messages line */}
              {rollMessages.length > 0 && (
                <div style={{
                  display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center',
                  fontSize: 10, letterSpacing: '.12em',
                  fontFamily: "'JetBrains Mono', monospace",
                  color: 'var(--ivory-dim)',
                  marginTop: -2
                }}>
                  {rollMessages.map((m, i) => (
                    <span key={i} style={{
                      padding: '3px 8px',
                      background: m.includes('+$')
                        ? 'rgba(126,219,156,.15)' : m.includes('-$')
                        ? 'rgba(255,107,90,.15)' : 'rgba(201,162,106,.15)',
                      border: '1px solid ' + (m.includes('+$') ? 'rgba(126,219,156,.3)' : m.includes('-$') ? 'rgba(255,107,90,.3)' : 'rgba(201,162,106,.3)'),
                      borderRadius: 4,
                      color: m.includes('+$') ? '#9eddb8' : m.includes('-$') ? '#ff9286' : 'var(--ivory)'
                    }}>{m}</span>
                  ))}
                </div>
              )}

              {/* Result banner */}
              {resultBanner && resultBanner.kind && (
                <ResultBanner kind={resultBanner.kind} total={resultBanner.total} totalWon={resultBanner.totalWon} />
              )}

              {/* Hover tooltip */}
              <BetTooltip id={hoverZone} info={hoverInfo} />
            </div>

            {/* Hint panel — own row between felt and action zone */}
            {hint && (
              <div style={{ position: 'relative', padding: '0 22px', flexShrink: 0 }}>
                <HintPanel hint={hint} expanded={hintExpanded} onLearnMore={() => setHintExpanded(e => !e)} />
              </div>
            )}

            {/* Bottom action zone */}
            <div style={{
              position: 'relative', zIndex: 5,
              padding: '12px 26px 18px',
              display: 'flex', alignItems: 'center', gap: 16,
              justifyContent: 'space-between',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {CHIP_DEFS.map(c => (
                  <Chip
                    key={c.value}
                    value={c.value}
                    size={56}
                    onClick={() => setSelectedChip(c.value)}
                    raised={selectedChip === c.value}
                    disabled={bankroll < c.value}
                  />
                ))}
              </div>

              <div style={{
                display: 'flex', gap: 10, alignItems: 'center'
              }}>
                <SmallBtn
                  onClick={clearAllBets}
                  disabled={!hasClearableBets(bets, phase)}
                >Clear</SmallBtn>
                <SmallBtn
                  onClick={rebetFromLast}
                  disabled={!lastBets || bankroll < window.CR_RULES.totalAtRisk(lastBets) || (phase !== 'comeOut' && phase !== 'point')}
                >Rebet ↺</SmallBtn>
                <button
                  onClick={rollDice}
                  disabled={!canRoll() || phase === 'rolling' || phase === 'resolving'}
                  style={{
                    padding: '16px 36px',
                    background: canRoll() && phase !== 'rolling' && phase !== 'resolving'
                      ? 'linear-gradient(180deg, #f5d896, #c9a26a)'
                      : 'rgba(40,28,18,.4)',
                    color: canRoll() && phase !== 'rolling' && phase !== 'resolving' ? '#1a1208' : 'rgba(255,255,255,.3)',
                    border: '1px solid ' + (canRoll() && phase !== 'rolling' && phase !== 'resolving' ? 'rgba(245,216,150,1)' : 'rgba(201,162,106,.2)'),
                    borderRadius: 12,
                    fontFamily: "'Playfair Display', serif",
                    fontStyle: 'italic',
                    fontSize: 22, fontWeight: 700,
                    letterSpacing: '.04em',
                    cursor: canRoll() && phase !== 'rolling' && phase !== 'resolving' ? 'pointer' : 'not-allowed',
                    boxShadow: canRoll() && phase !== 'rolling' && phase !== 'resolving' ? '0 14px 28px rgba(230,197,144,.45), inset 0 1px 0 rgba(255,255,255,.5)' : 'none',
                    transition: 'all .2s',
                    whiteSpace: 'nowrap'
                  }}
                >{phase === 'rolling' ? 'Rolling…' : 'Roll Dice →'}</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <TweaksPanel title="Craps Tweaks">
        <TweakSection label="Players" />
        <TweakText label="Your name" value={tweaks.playerName} onChange={v => setTweak('playerName', v)} />
        <TweakSelect label="Stickman" value={tweaks.dealerName} onChange={v => setTweak('dealerName', v)}
          options={[
            { value: 'Marcus',  label: 'Marcus (dry, deadpan)' },
            { value: 'Melissa', label: 'Melissa (warm, flirty)' }
          ]} />
        <TweakSection label="Game" />
        <TweakToggle label="Strategy hints" value={tweaks.showHints} onChange={v => setTweak('showHints', v)} />
        <TweakToggle label="Sound" value={tweaks.soundOn} onChange={v => setTweak('soundOn', v)} />
        <TweakSelect label="Max odds" value={String(tweaks.maxOddsMultiplier)}
          onChange={v => setTweak('maxOddsMultiplier', Number(v))}
          options={[
            { value: '1', label: '1×' },
            { value: '2', label: '2×' },
            { value: '3', label: '3× (default)' },
            { value: '5', label: '5×' }
          ]} />
        <TweakNumber label="Starting bankroll" value={tweaks.startingBankroll} onChange={v => setTweak('startingBankroll', Number(v))} min={100} max={100000} step={100} />
        <TweakButton label="Reset bankroll" onClick={() => {
          setBankroll(tweaks.startingBankroll);
          setStats({ rolls: 0, passWins: 0, dontPassWins: 0, comeWins: 0, bestBankroll: tweaks.startingBankroll });
          setStreak(0); setLossStreak(0);
        }} />
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
          onReload={() => {
            const v = window.CASINO_BANKROLL ? window.CASINO_BANKROLL.reload() : tweaks.startingBankroll;
            setBankroll(v);
            setShowBrokeModal(false);
          }}
        />
      )}
    </div>
  );
}

function hasClearableBets(bets, phase) {
  if (phase === 'comeOut') return bets.pass > 0 || bets.dontPass > 0 || bets.field > 0;
  if (phase === 'point') {
    if (bets.field > 0) return true;
    for (const n of POINT_NUMBERS) if (bets.place[n] > 0) return true;
  }
  return false;
}

function SmallBtn({ children, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '10px 16px',
      background: 'rgba(20,12,6,.85)',
      color: disabled ? 'rgba(255,255,255,.3)' : 'var(--ivory)',
      border: '1px solid rgba(201,162,106,.35)',
      borderRadius: 8,
      fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase',
      fontWeight: 600,
      cursor: disabled ? 'not-allowed' : 'pointer',
      fontFamily: 'inherit'
    }}>{children}</button>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
