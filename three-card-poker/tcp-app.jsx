/* eslint-disable */
// Three Card Poker — main app, phase machine, deal/decision/resolve flow.

const { useState, useEffect, useRef, useMemo } = React;

const TCP_TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "playerName": "Alex",
  "dealerName": "Melissa",
  "showHints": true,
  "soundOn": false
}/*EDITMODE-END*/;

const TCP_STATS_KEY = 'threeCardPokerStats';
const TCP_TWEAKS_KEY = 'threeCardPokerTweaks';
const TCP_MIN_BET = 5;
const TCP_MAX_BET = 500;

function ensureDeck(deck) {
  if (!deck || deck.length < 10) return TCP_DECK.shuffle(TCP_DECK.build());
  return deck;
}

function App() {
  const [tweaks, setTweak] = useTweaks(TCP_TWEAK_DEFAULTS);

  // Bankroll lives in shared casino store
  const [bankroll, setBankroll] = useState(() =>
    (window.CASINO_BANKROLL ? window.CASINO_BANKROLL.read() : 1000)
  );

  // Stats — load once, persist on change
  const [stats, setStats] = useState(() => {
    try {
      const raw = localStorage.getItem(TCP_STATS_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        return {
          played: s.handsPlayed || s.played || 0,
          won: s.handsWon || s.won || 0,
          bonuses: s.anteBonuses || s.bonuses || 0,
          peak: s.biggestBankroll || s.peak || 1000,
          biggestPP: s.biggestPP || 0
        };
      }
    } catch (e) {}
    return { played: 0, won: 0, bonuses: 0, peak: 1000, biggestPP: 0 };
  });
  const [streak, setStreak] = useState(0);
  const [showBrokeModal, setShowBrokeModal] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);

  // Mirror bankroll into shared store and persist stats.
  useEffect(() => {
    if (window.CASINO_BANKROLL) window.CASINO_BANKROLL.write(bankroll);
  }, [bankroll]);

  useEffect(() => {
    localStorage.setItem(TCP_STATS_KEY, JSON.stringify(stats));
  }, [stats]);

  // Player name persistence (matches BJ pattern)
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

  // Round state
  // phase: 'betting' | 'dealing' | 'decision' | 'revealing' | 'resolved'
  const [phase, setPhase] = useState('betting');
  const [deck, setDeck] = useState(() => TCP_DECK.shuffle(TCP_DECK.build()));
  const [betTarget, setBetTarget] = useState('ante'); // 'ante' | 'pairplus'
  const [anteBet, setAnteBet] = useState(0);
  const [pairPlusBet, setPairPlusBet] = useState(0);
  const [playBet, setPlayBet] = useState(0);
  const [lastBets, setLastBets] = useState({ ante: 0, pairPlus: 0 });
  const [playerCards, setPlayerCards] = useState([]);
  const [dealerCards, setDealerCards] = useState([]);
  const [dealerRevealed, setDealerRevealed] = useState(false);
  const [resolution, setResolution] = useState(null);

  // Dealer messaging
  const [expression, setExpression] = useState('idle');
  const [message, setMessage] = useState('');
  const [isIdle, setIsIdle] = useState(false);
  const [mood, setMood] = useState(0);
  const idleTimerRef = useRef(null);

  const ctx = { player: tweaks.playerName, dealer: tweaks.dealerName };

  function nudgeMood(delta) {
    setMood(m => Math.max(-1, Math.min(1, m + delta)));
  }

  function say(key, expr) {
    setMessage(tcpPickLine(key, ctx));
    if (expr) {
      setExpression(expr);
      const moodDelta = expr === 'happy' ? 0.18
        : expr === 'shocked' ? 0.10
        : expr === 'sad' ? -0.18
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

  // Initial greeting + on dealer/player change
  useEffect(() => {
    setMessage(tcpPickLine('greet', { player: tweaks.playerName, dealer: tweaks.dealerName }));
    setExpression('idle');
  }, [tweaks.dealerName, tweaks.playerName]);

  // Idle behavior — after 12s of betting inactivity, prompt
  useEffect(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (phase === 'betting' && anteBet === 0 && pairPlusBet === 0) {
      idleTimerRef.current = setTimeout(() => {
        setIsIdle(true);
        setMessage(tcpPickLine('idle_long', ctx));
      }, 12000);
    } else {
      setIsIdle(false);
    }
    return () => { if (idleTimerRef.current) clearTimeout(idleTimerRef.current); };
  }, [phase, anteBet, pairPlusBet, message]);

  // Broke detection
  useEffect(() => {
    if (phase === 'betting' && bankroll < TCP_MIN_BET && anteBet === 0 && pairPlusBet === 0) {
      setShowBrokeModal(true);
    } else if (bankroll >= TCP_MIN_BET && showBrokeModal) {
      setShowBrokeModal(false);
    }
  }, [phase, bankroll, anteBet, pairPlusBet]);

  function totalCommittedBets() {
    return anteBet + pairPlusBet + playBet;
  }

  // ── Betting actions ──
  function addChip(value) {
    if (phase !== 'betting') return;
    if (bankroll < value) return;
    if (betTarget === 'ante') {
      // Ante max + reserve for play bet (= ante)
      const newAnte = anteBet + value;
      // Need to keep enough for an equal Play bet later: reserve = newAnte
      const requiredFromBankroll = value + value; // chip itself is going down, but we also reserve same for Play
      // Actually bankroll already accounts for past ante (deducted). So:
      // remaining bankroll must be >= value (chip) + value (future play if user plays).
      if (newAnte > TCP_MAX_BET) return;
      if (bankroll < value + newAnte) {
        // not enough for chip + matching play bet; soft-warn but allow if at least chip fits
        if (bankroll < value) return;
        // allow but cap — the play bet handler will degrade gracefully later
      }
      setAnteBet(newAnte);
      setBankroll(br => br - value);
    } else {
      const newPP = pairPlusBet + value;
      if (newPP > TCP_MAX_BET) return;
      if (bankroll < value) return;
      setPairPlusBet(newPP);
      setBankroll(br => br - value);
    }
    if (tweaks.soundOn) TCP_SFX.chip();
    setIsIdle(false);
    const newTotal = anteBet + pairPlusBet + value;
    if (betTarget === 'pairplus' && pairPlusBet === 0) say('bet_pp', 'happy');
    else if (newTotal >= 500) say('bet_huge', 'shocked');
    else if (newTotal >= 100 || value >= 100) say('bet_high', 'happy');
    else say('bet_low', 'idle');
  }

  function clearBet() {
    if (phase !== 'betting') return;
    setBankroll(br => br + anteBet + pairPlusBet);
    setAnteBet(0);
    setPairPlusBet(0);
    say('idle', 'idle');
  }

  function rebet() {
    const { ante, pairPlus } = lastBets;
    if (ante === 0 && pairPlus === 0) return;
    if (bankroll < ante + pairPlus) return;
    setAnteBet(ante);
    setPairPlusBet(pairPlus);
    setBankroll(br => br - ante - pairPlus);
    say('rebet', 'happy');
  }

  function deal() {
    // Use the most recent value of anteBet via a functional update — this guard
    // protects against stale closures called from the chained "Rebet & Deal" flow.
    if (anteBet < TCP_MIN_BET && lastBets.ante < TCP_MIN_BET) return;
    if (tweaks.soundOn) {
      TCP_SFX.deal();
      [0, 200, 400, 600, 800, 1000].forEach(d => setTimeout(() => TCP_SFX.card(), d));
    }
    setLastBets({ ante: anteBet, pairPlus: pairPlusBet });

    let workingDeck = ensureDeck(deck);
    const draws = [];
    for (let i = 0; i < 6; i++) {
      const [taken, rest] = TCP_DECK.deal(workingDeck, 1);
      draws.push(taken[0]);
      workingDeck = rest;
    }
    // Player gets indices 0,2,4 — Dealer gets 1,3,5 (alternating deal)
    const pCards = [draws[0], draws[2], draws[4]];
    const dCards = [draws[1], draws[3], draws[5]];

    setDeck(workingDeck);
    setPlayerCards(pCards);
    setDealerCards(dCards);
    setDealerRevealed(false);
    setResolution(null);
    setPlayBet(0);
    setPhase('dealing');
    setExpression('deal');
    say('deal', 'deal');

    setTimeout(() => {
      setPhase('decision');
      // Inject a hint flavor based on hand strength.
      const ev = TCP_HAND.evaluate(pCards);
      if (ev.rank >= TCP_HAND.RANKS.PAIR) say('decision_strong', 'idle');
      else if (TCP_STRATEGY.shouldPlay(pCards)) say('decision_marginal', 'idle');
      else say('decision_weak', 'idle');
    }, 1500);
  }

  // ── Decision actions ──
  function play() {
    if (phase !== 'decision') return;
    let actualPlay = anteBet;
    if (bankroll < anteBet) {
      // Edge case: bankroll too low for full Play bet — degrade to whatever's left.
      actualPlay = bankroll;
    }
    setPlayBet(actualPlay);
    setBankroll(br => br - actualPlay);
    if (tweaks.soundOn) TCP_SFX.chip();
    setPhase('revealing');
    setDealerRevealed(true);

    // After flip animation, resolve.
    setTimeout(() => resolve(actualPlay, false), 1100);
  }

  function fold() {
    if (phase !== 'decision') return;
    if (tweaks.soundOn) TCP_SFX.fold();
    setPhase('revealing');
    // Quietly reveal dealer for the visual
    setDealerRevealed(true);
    setTimeout(() => resolve(0, true), 700);
  }

  function resolve(actualPlay, folded) {
    const result = TCP_HAND.payouts(
      playerCards, dealerCards,
      { ante: anteBet, play: actualPlay, pairPlus: pairPlusBet },
      folded
    );

    setBankroll(br => br + result.totalReturn);
    setResolution(result);
    setPhase('resolved');

    // Stats
    setStats(s => ({
      played: s.played + 1,
      won: s.won + (result.kind === 'win' || result.kind === 'no-qualify' || result.kind === 'bonus-win' ? 1 : 0),
      bonuses: s.bonuses + (result.anteBonus > 0 ? 1 : 0),
      peak: Math.max(s.peak, bankroll + result.totalReturn),
      biggestPP: Math.max(s.biggestPP, result.pairPlus)
    }));

    if (result.net > 0) {
      setStreak(st => st + 1);
      if (tweaks.soundOn) {
        if (result.anteBonus > 0 || result.pairPlus > 0) TCP_SFX.bonus();
        else TCP_SFX.win();
      }
    } else if (result.net < 0) {
      setStreak(0);
      if (tweaks.soundOn) TCP_SFX.lose();
    } else {
      if (tweaks.soundOn) TCP_SFX.push();
    }

    // Pick the most flavorful dealer line for the outcome.
    setTimeout(() => {
      const ev = TCP_HAND.evaluate(playerCards);
      const ppMult = TCP_HAND.getPairPlusPayout(playerCards);
      const expr = tcpOutcomeToExpression(result.kind, result.anteBonus > 0 || result.pairPlus > 0);

      // Layer of preference: SF/trips bonus first, PP big hits, then main outcome.
      if (folded) {
        if (result.pairPlus > 0) say('fold_pp_save', 'happy');
        else say('fold', 'idle');
        return;
      }

      if (result.anteBonus > 0) {
        if (ev.rank === TCP_HAND.RANKS.STRAIGHT_FLUSH) { say('bonus_straight_flush', 'shocked'); return; }
        if (ev.rank === TCP_HAND.RANKS.THREE_OF_A_KIND) { say('bonus_trips', 'shocked'); return; }
        if (ev.rank === TCP_HAND.RANKS.STRAIGHT) { say('bonus_straight', 'happy'); return; }
      }
      if (result.pairPlus > 0) {
        if (ppMult === TCP_HAND.PAIR_PLUS.STRAIGHT_FLUSH) { say('pp_sf', 'shocked'); return; }
        if (ppMult === TCP_HAND.PAIR_PLUS.THREE_OF_A_KIND) { say('pp_trips', 'shocked'); return; }
        if (ppMult === TCP_HAND.PAIR_PLUS.STRAIGHT) { say('pp_straight', 'happy'); return; }
        if (ppMult === TCP_HAND.PAIR_PLUS.FLUSH) { say('pp_flush', 'happy'); return; }
        if (ppMult === TCP_HAND.PAIR_PLUS.PAIR) { say('pp_pair', 'idle'); return; }
      }

      switch (result.kind) {
        case 'win': say('win', expr); break;
        case 'lose': say('lose', expr); break;
        case 'push': say('push', expr); break;
        case 'no-qualify': say('dealer_no_qualify', expr); break;
        case 'bonus-win': say('win', expr); break;
        default: say('idle', 'idle');
      }
    }, 700);
  }

  function nextRound() {
    setAnteBet(0);
    setPairPlusBet(0);
    setPlayBet(0);
    setPlayerCards([]);
    setDealerCards([]);
    setDealerRevealed(false);
    setResolution(null);
    setPhase('betting');
    if (deck.length < 10) setDeck(TCP_DECK.shuffle(TCP_DECK.build()));
    setMessage(tcpPickLine('idle', ctx));
    setExpression('idle');
  }

  // ── Hint memo ──
  const hint = useMemo(() => {
    if (!tweaks.showHints) return null;
    if (phase === 'betting') {
      return TCP_STRATEGY.bettingHint(bankroll);
    }
    if (phase === 'decision' && playerCards.length === 3) {
      return TCP_STRATEGY.getRecommendation(playerCards);
    }
    return null;
  }, [tweaks.showHints, phase, playerCards, bankroll]);

  const playerHandDesc = playerCards.length === 3 ? TCP_HAND.describe(playerCards) : '';
  const dealerHandDesc = dealerRevealed && dealerCards.length === 3 ? TCP_HAND.describe(dealerCards) : '';
  const dealerQualifies = dealerRevealed && dealerCards.length === 3 ? TCP_HAND.dealerQualifies(dealerCards) : null;

  const hintAction = hint?.action;

  const dealerGender = tweaks.dealerName === 'Marcus' ? 'male' : 'female';

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
        <DealerPanel
          name={tweaks.dealerName}
          gender={dealerGender}
          expression={expression}
          message={message}
          playerName={tweaks.playerName}
          isIdle={isIdle}
          mood={mood}
          onEditName={() => setShowNameModal(true)}
        />

        <div style={{
          flex: 1, position: 'relative', minWidth: 800
        }}>
          <FeltBackdrop />

          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>

            <BrassRail
              bankroll={bankroll}
              streak={streak}
              played={stats.played}
              won={stats.won}
              peak={stats.peak}
              showHints={tweaks.showHints}
              onToggleHints={() => setTweak('showHints', !tweaks.showHints)}
            />

            <div style={{
              flex: 1, position: 'relative',
              padding: '4px 32px 0',
              display: 'flex', flexDirection: 'column'
            }}>
              <FeltLogo />

              {/* Dealer area */}
              <div style={{ marginTop: 12, textAlign: 'center', position: 'relative', zIndex: 3 }}>
                {dealerRevealed && dealerHandDesc && (
                  <HandLabel label="Dealer" description={dealerHandDesc} />
                )}
                {dealerRevealed && dealerQualifies === false && (
                  <div style={{ marginTop: 6 }}>
                    <NoQualifyPill />
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12, minHeight: 110 }}>
                  {dealerCards.map((c, i) => (
                    <PlayingCard
                      key={c.id}
                      rank={c.rank} suit={c.suit}
                      faceDown={!dealerRevealed}
                      dealIndex={i * 2 + 1}
                      fromX={140} fromY={-220}
                    />
                  ))}
                </div>
              </div>

              {/* Result banner */}
              {resolution && phase === 'resolved' && (
                <ResultBanner
                  kind={resolution.kind}
                  payout={Math.abs(resolution.net)}
                  anteBonus={resolution.anteBonus}
                  pairPlus={resolution.pairPlus}
                />
              )}

              {/* Bet circles */}
              <div style={{
                position: 'absolute', left: 0, right: 0, bottom: 240,
                display: 'flex', justifyContent: 'center', gap: 28, zIndex: 3
              }}>
                <BetCircle
                  label="Pair Plus"
                  amount={pairPlusBet}
                  active={betTarget === 'pairplus' && phase === 'betting'}
                  glow={resolution && resolution.pairPlus > 0}
                  badge={resolution && resolution.pairPlus > 0 ? `+$${resolution.pairPlus}` : null}
                  onClick={phase === 'betting' ? () => setBetTarget('pairplus') : null}
                  dimmed={phase !== 'betting' && pairPlusBet === 0}
                />
                <BetCircle
                  label="Ante"
                  amount={anteBet}
                  active={betTarget === 'ante' && phase === 'betting'}
                  glow={resolution && resolution.anteBonus > 0}
                  badge={resolution && resolution.anteBonus > 0 ? `BONUS +$${resolution.anteBonus}` : null}
                  onClick={phase === 'betting' ? () => setBetTarget('ante') : null}
                />
                <BetCircle
                  label="Play"
                  amount={playBet}
                  dimmed={playBet === 0}
                />
              </div>

              {/* Player area */}
              <div style={{
                position: 'absolute', left: 0, right: 0, bottom: 110,
                textAlign: 'center', zIndex: 3
              }}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 10, minHeight: 110 }}>
                  {playerCards.map((c, i) => (
                    <PlayingCard
                      key={c.id}
                      rank={c.rank} suit={c.suit}
                      dealIndex={i * 2}
                      fromX={140} fromY={-360}
                      glow={resolution && (resolution.kind === 'win' || resolution.kind === 'bonus-win')}
                    />
                  ))}
                </div>
                {playerCards.length === 3 && (
                  <HandLabel
                    label={tweaks.playerName}
                    description={playerHandDesc}
                    isStrong={(() => {
                      const ev = TCP_HAND.evaluate(playerCards);
                      return ev.rank >= TCP_HAND.RANKS.STRAIGHT;
                    })()}
                  />
                )}
              </div>

              {phase !== 'betting' && <PaytablePanel playerHand={playerCards.length === 3 ? playerCards : null} />}

              <HintPanel hint={hint} />
            </div>

            {/* Bottom action zone */}
            <div style={{
              position: 'relative', zIndex: 5,
              padding: '18px 26px 22px',
              minHeight: 200,
              display: 'flex', flexDirection: 'column', gap: 14
            }}>
              {phase === 'betting' && (
                <BettingZone
                  anteBet={anteBet}
                  pairPlusBet={pairPlusBet}
                  bankroll={bankroll}
                  betTarget={betTarget}
                  onSetTarget={setBetTarget}
                  onChip={addChip}
                  onClear={clearBet}
                  onRebet={rebet}
                  onDeal={deal}
                  hasLast={lastBets.ante > 0 || lastBets.pairPlus > 0}
                />
              )}

              {phase === 'decision' && (
                <ActionZone
                  hintAction={hintAction}
                  canPlay={bankroll >= anteBet}
                  onPlay={play}
                  onFold={fold}
                  betAmount={anteBet}
                />
              )}

              {(phase === 'dealing' || phase === 'revealing') && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  height: 100,
                  fontSize: 13, letterSpacing: '.3em', color: 'var(--ivory-dim)', textTransform: 'uppercase'
                }}>
                  <span style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: 'var(--brass)',
                    marginRight: 12,
                    animation: 'glowPulse 1s ease-in-out infinite'
                  }} />
                  {phase === 'dealing' ? 'Dealing…' : 'Revealing dealer…'}
                </div>
              )}

              {phase === 'resolved' && (
                <ResolvedZone
                  onContinue={nextRound}
                  onRebet={() => { nextRound(); setTimeout(rebet, 50); setTimeout(deal, 100); }}
                  hasLast={lastBets.ante > 0}
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
            options={[
              { value: 'Melissa', label: 'Melissa (warm, flirty)' },
              { value: 'Marcus', label: 'Marcus (dry, deadpan)' }
            ]} />
        </TweakSection>
        <TweakSection title="Game">
          <TweakToggle label="Strategy hints" value={tweaks.showHints} onChange={v => setTweak('showHints', v)} />
          <TweakToggle label="Sound" value={tweaks.soundOn} onChange={v => setTweak('soundOn', v)} />
          <TweakButton label="Reload bankroll" onClick={() => {
            const v = window.CASINO_BANKROLL ? window.CASINO_BANKROLL.reload() : 1000;
            setBankroll(v);
            setStats({ played: 0, won: 0, bonuses: 0, peak: v, biggestPP: 0 });
            setStreak(0);
          }} />
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
          message={`The table cleaned you out, ${tweaks.playerName}.`}
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

function BettingZone({ anteBet, pairPlusBet, bankroll, betTarget, onSetTarget, onChip, onClear, onRebet, onDeal, hasLast }) {
  const total = anteBet + pairPlusBet;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <BetTargetButton active={betTarget === 'ante'} onClick={() => onSetTarget('ante')}>Ante</BetTargetButton>
          <BetTargetButton active={betTarget === 'pairplus'} onClick={() => onSetTarget('pairplus')}>Pair Plus</BetTargetButton>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {TCP_CHIP_DEFS.map(c => (
            <Chip key={c.value} value={c.value} size={56} onClick={() => onChip(c.value)} disabled={bankroll < c.value} />
          ))}
        </div>
      </div>

      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        fontSize: 10, letterSpacing: '.28em', color: 'var(--brass)', textTransform: 'uppercase'
      }}>
        <span>Total bet</span>
        <span style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 26, color: total > 0 ? 'var(--brass-2)' : 'rgba(230,197,144,.4)',
          fontStyle: 'italic', fontWeight: 700,
          letterSpacing: '0'
        }}>${total}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end', minWidth: 200 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <SmallBtn onClick={onClear} disabled={!total}>Clear</SmallBtn>
          <SmallBtn onClick={onRebet} disabled={!hasLast}>Rebet ↺</SmallBtn>
        </div>
        <button
          onClick={onDeal}
          disabled={anteBet < TCP_MIN_BET}
          style={{
            padding: '18px 44px',
            background: anteBet >= TCP_MIN_BET ? 'linear-gradient(180deg, #f5d896, #c9a26a)' : 'rgba(40,28,18,.4)',
            color: anteBet >= TCP_MIN_BET ? '#1a1208' : 'rgba(255,255,255,.3)',
            border: `1px solid ${anteBet >= TCP_MIN_BET ? 'rgba(245,216,150,1)' : 'rgba(201,162,106,.2)'}`,
            borderRadius: 12,
            fontFamily: "'Playfair Display', serif",
            fontStyle: 'italic',
            fontSize: 24, fontWeight: 700,
            letterSpacing: '.04em',
            cursor: anteBet >= TCP_MIN_BET ? 'pointer' : 'not-allowed',
            boxShadow: anteBet >= TCP_MIN_BET ? '0 14px 28px rgba(230,197,144,.45), inset 0 1px 0 rgba(255,255,255,.5)' : 'none',
            transition: 'all .2s'
          }}
        >Deal Cards →</button>
      </div>
    </div>
  );
}

function BetTargetButton({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 14px',
      background: active ? 'linear-gradient(180deg, #f5d896, #c9a26a)' : 'rgba(20,12,6,.85)',
      color: active ? '#1a1208' : 'var(--ivory)',
      border: `1px solid ${active ? 'rgba(245,216,150,.95)' : 'rgba(201,162,106,.35)'}`,
      borderRadius: 8,
      fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase',
      fontWeight: 700, fontFamily: 'inherit',
      cursor: 'pointer',
      transition: 'all .18s ease',
      boxShadow: active ? '0 4px 10px rgba(230,197,144,.35)' : '0 2px 4px rgba(0,0,0,.3)'
    }}>{children}</button>
  );
}

function SmallBtn({ children, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '8px 14px',
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

function ActionZone({ hintAction, canPlay, onPlay, onFold, betAmount }) {
  const ha = hintAction || '';
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, paddingTop: 4 }}>
      <ActionButton label="Play"
        onClick={onPlay}
        hint={ha === 'Play'}
        disabled={!canPlay}
        sub={`+$${betAmount}`} />
      <div style={{ width: 1, height: 60, background: 'rgba(201,162,106,.25)', margin: '0 4px' }} />
      <ActionButton label="Fold"
        onClick={onFold}
        hint={ha === 'Fold'}
        sub="Forfeit Ante" />
    </div>
  );
}

function ResolvedZone({ onContinue, onRebet, hasLast }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, paddingTop: 4 }}>
      <button onClick={onContinue} style={{
        padding: '14px 32px',
        background: 'linear-gradient(180deg, rgba(40,28,18,.95), rgba(20,12,6,.95))',
        color: 'var(--ivory)',
        border: '1px solid rgba(201,162,106,.4)',
        borderRadius: 10,
        fontFamily: "'Playfair Display', serif",
        fontStyle: 'italic', fontSize: 18, fontWeight: 600,
        cursor: 'pointer'
      }}>New Hand</button>
      {hasLast && (
        <button onClick={onRebet} style={{
          padding: '14px 32px',
          background: 'linear-gradient(180deg, #f5d896, #c9a26a)',
          color: '#1a1208',
          border: '1px solid rgba(245,216,150,1)',
          borderRadius: 10,
          fontFamily: "'Playfair Display', serif",
          fontStyle: 'italic', fontSize: 18, fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 8px 22px rgba(230,197,144,.4)'
        }}>Rebet & Deal →</button>
      )}
    </div>
  );
}

function BrokeModal({ playerName, message, onReload }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      background: 'rgba(8,5,2,.7)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        background: 'linear-gradient(180deg, rgba(35,22,10,.95), rgba(20,12,6,.98))',
        border: '1px solid rgba(201,162,106,.5)',
        borderRadius: 16,
        padding: '30px 36px 26px',
        boxShadow: '0 30px 80px rgba(0,0,0,.7), inset 0 1px 0 rgba(230,197,144,.15)',
        minWidth: 380, maxWidth: 460,
        textAlign: 'center'
      }}>
        <div style={{ fontSize: 10, letterSpacing: '.32em', textTransform: 'uppercase', color: 'var(--ivory-dim)', marginBottom: 6 }}>Limestone Games</div>
        <div style={{
          fontFamily: "'Playfair Display', serif", fontStyle: 'italic',
          fontSize: 24, color: 'var(--brass-2)', marginBottom: 6, lineHeight: 1.25
        }}>Out of chips.</div>
        <div style={{ fontSize: 14, color: 'var(--ivory-dim)', marginBottom: 22, lineHeight: 1.4 }}>
          {message || `That's the last of it, ${playerName || 'friend'}.`}
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <a href="../casino/" style={{
            padding: '10px 18px',
            background: 'rgba(20,12,6,.6)',
            border: '1px solid rgba(201,162,106,.3)',
            borderRadius: 999, color: 'var(--ivory-dim)',
            fontSize: 10, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase',
            textDecoration: 'none', display: 'inline-block'
          }}>← Lobby</a>
          <button onClick={onReload} style={{
            padding: '10px 22px',
            background: 'linear-gradient(180deg, #e6c590, #c9a26a)',
            border: '1px solid rgba(201,162,106,.5)',
            borderRadius: 999, color: '#1a1208',
            fontSize: 10, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(230,197,144,.4)'
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
      position: 'fixed', inset: 0, zIndex: 9000,
      background: 'rgba(8,5,2,.65)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <form onSubmit={submit} style={{
        background: 'linear-gradient(180deg, rgba(35,22,10,.95), rgba(20,12,6,.98))',
        border: '1px solid rgba(201,162,106,.5)',
        borderRadius: 16,
        padding: '30px 36px 26px',
        boxShadow: '0 30px 80px rgba(0,0,0,.7), inset 0 1px 0 rgba(230,197,144,.15)',
        minWidth: 380, maxWidth: 440,
        textAlign: 'center'
      }}>
        <div style={{
          fontSize: 10, letterSpacing: '.32em', textTransform: 'uppercase',
          color: 'var(--ivory-dim)', marginBottom: 6
        }}>Limestone Games</div>
        <div style={{
          fontFamily: "'Playfair Display', serif",
          fontStyle: 'italic',
          fontSize: 22, color: 'var(--brass-2)',
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
            width: '100%',
            padding: '12px 16px',
            background: 'rgba(10,6,3,.6)',
            border: '1px solid rgba(201,162,106,.4)',
            borderRadius: 10,
            color: 'var(--ivory)',
            fontFamily: "'Playfair Display', serif",
            fontSize: 19,
            fontStyle: 'italic',
            textAlign: 'center',
            outline: 'none',
            boxSizing: 'border-box'
          }}
        />
        <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'center' }}>
          {onCancel && (
            <button type="button" onClick={onCancel} style={{
              padding: '10px 18px',
              background: 'rgba(20,12,6,.6)',
              border: '1px solid rgba(201,162,106,.3)',
              borderRadius: 999,
              color: 'var(--ivory-dim)',
              fontSize: 10, fontWeight: 700, letterSpacing: '.18em',
              textTransform: 'uppercase',
              cursor: 'pointer'
            }}>Cancel</button>
          )}
          <button type="submit" disabled={!name.trim()} style={{
            padding: '10px 22px',
            background: name.trim() ? 'linear-gradient(180deg, #e6c590, #c9a26a)' : 'rgba(201,162,106,.25)',
            border: '1px solid rgba(201,162,106,.5)',
            borderRadius: 999,
            color: name.trim() ? '#1a1208' : 'var(--ivory-dim)',
            fontSize: 10, fontWeight: 700, letterSpacing: '.18em',
            textTransform: 'uppercase',
            cursor: name.trim() ? 'pointer' : 'not-allowed',
            boxShadow: name.trim() ? '0 4px 12px rgba(230,197,144,.4)' : 'none'
          }}>Take a seat →</button>
        </div>
      </form>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
