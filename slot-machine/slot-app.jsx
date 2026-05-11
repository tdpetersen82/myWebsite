/* global React, ReactDOM, SlotReel */
/* eslint-disable */

const PREFS_KEY = 'slotMachinePrefs';
const SESSION_KEY = 'slotMachineSession';
const BET_OPTIONS = [1, 5, 25, 100];
const SPIN_DURATION = 1100;
const REEL_STAGGER = 250;
const TOTAL_SPIN = SPIN_DURATION + REEL_STAGGER * 2 + 200;
const CELL_PX = 160;
const PAYTABLE_CELL_PX = 36;
const HISTORY_CELL_PX = 28;
const MAX_HISTORY = 14;

function loadPrefs() {
  try {
    const raw = JSON.parse(localStorage.getItem(PREFS_KEY) || 'null');
    if (raw && typeof raw === 'object') {
      const themeId = ['classic', 'lucky', 'mythic'].indexOf(raw.themeId) >= 0
        ? raw.themeId : 'classic';
      const bet = BET_OPTIONS.indexOf(Number(raw.bet)) >= 0 ? Number(raw.bet) : 5;
      return { themeId: themeId, bet: bet };
    }
  } catch (e) {}
  return { themeId: 'classic', bet: 5 };
}

function freshSession() {
  return {
    spins: 0,
    wagered: 0,
    won: 0,
    biggest: 0,
    hits: 0,
    jackpots: 0,
    streak: 0,            // positive = consecutive wins, negative = consecutive losses
    bestStreak: 0,
    worstStreak: 0,
    startedAt: Date.now(),
    history: []           // newest first
  };
}

function loadSession() {
  try {
    const raw = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    if (raw && typeof raw === 'object' && typeof raw.spins === 'number') {
      return Object.assign(freshSession(), raw);
    }
  } catch (e) {}
  return freshSession();
}

function saveSession(s) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch (e) {}
}

function fmtUsd(n) {
  const sign = n < 0 ? '-' : '';
  return sign + '$' + Math.abs(n).toLocaleString();
}

function fmtSignedUsd(n) {
  if (n === 0) return '$0';
  return (n > 0 ? '+$' : '-$') + Math.abs(n).toLocaleString();
}

function relativeTime(ts, now) {
  const ms = Math.max(0, now - ts);
  if (ms < 60000) return Math.max(1, Math.round(ms / 1000)) + 's';
  if (ms < 3600000) return Math.round(ms / 60000) + 'm';
  return Math.round(ms / 3600000) + 'h';
}

function SlotApp() {
  const ENGINE = window.SLOT_ENGINE;
  const THEMES = window.SLOT_THEMES;

  const initial = loadPrefs();
  const [themeId, setThemeId] = React.useState(initial.themeId);
  const [bet, setBet] = React.useState(initial.bet);
  const [bankroll, setBankroll] = React.useState(window.CASINO_BANKROLL.read());
  const [stops, setStops] = React.useState([0, 7, 14]);
  const [spinning, setSpinning] = React.useState(false);
  const [lastResult, setLastResult] = React.useState(null);
  const [session, setSession] = React.useState(loadSession);
  const [, setNowTick] = React.useState(0);

  React.useEffect(function () {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ themeId: themeId, bet: bet }));
  }, [themeId, bet]);

  React.useEffect(function () { saveSession(session); }, [session]);

  // Re-render every 30s so "12s ago"/"3m ago" labels tick along.
  React.useEffect(function () {
    const id = setInterval(function () { setNowTick(function (n) { return n + 1; }); }, 30000);
    return function () { clearInterval(id); };
  }, []);

  const theme = THEMES.find(function (t) { return t.id === themeId; }) || THEMES[0];
  const canSpin = !spinning && bankroll >= bet;

  function spin() {
    if (!canSpin) return;
    const postBet = bankroll - bet;
    window.CASINO_BANKROLL.write(postBet);
    setBankroll(postBet);
    setLastResult(null);

    const newStops = [ENGINE.spinReel(), ENGINE.spinReel(), ENGINE.spinReel()];
    const result = ENGINE.evaluatePayout(newStops, bet);
    setStops(newStops);
    setSpinning(true);

    setTimeout(function () {
      setSpinning(false);
      let postBalance = postBet;
      if (result.win > 0) {
        const post = window.CASINO_BANKROLL.read() + result.win;
        window.CASINO_BANKROLL.write(post);
        setBankroll(post);
        postBalance = post;
      }
      if (window.CASINO_STATS) {
        window.CASINO_STATS.recordEvent('slotMachine', {
          won: result.win > 0,
          payout: Math.max(0, result.win),
          rare: result.kind === 'jackpot' ? 'slotJackpot' : null,
        });
        window.CASINO_STATS.recordPeak(postBalance);
      }
      setLastResult(result);

      // Record session stats + history
      setSession(function (prev) {
        const won = result.win > 0;
        const prevStreak = prev.streak;
        const nextStreak = won
          ? (prevStreak >= 0 ? prevStreak + 1 : 1)
          : (prevStreak <= 0 ? prevStreak - 1 : -1);
        const newEntry = {
          ts: Date.now(),
          bet: bet,
          win: result.win,
          kind: result.kind,
          symbols: result.symbols,
          themeRow: theme.spriteRow
        };
        const history = [newEntry].concat(prev.history).slice(0, MAX_HISTORY);
        return {
          spins: prev.spins + 1,
          wagered: prev.wagered + bet,
          won: prev.won + result.win,
          biggest: Math.max(prev.biggest, result.win),
          hits: prev.hits + (won ? 1 : 0),
          jackpots: prev.jackpots + (result.kind === 'jackpot' ? 1 : 0),
          streak: nextStreak,
          bestStreak: Math.max(prev.bestStreak, nextStreak),
          worstStreak: Math.min(prev.worstStreak, nextStreak),
          startedAt: prev.startedAt,
          history: history
        };
      });
    }, TOTAL_SPIN);
  }

  function resetSession() {
    setSession(freshSession());
    setLastResult(null);
  }

  // Build the paytable rows for the current theme. Highest payout first.
  const paytableRows = [5, 4, 3, 2, 1, 0].map(function (i) {
    return {
      symIdx: i,
      label: theme.symbolNames[i],
      mult: ENGINE.PAYOUTS[i],
      isWild: i === ENGINE.WILD
    };
  });

  const net = session.won - session.wagered;
  const hitRate = session.spins > 0
    ? Math.round((session.hits / session.spins) * 100)
    : 0;
  const avgWin = session.hits > 0
    ? Math.round(session.won / session.hits)
    : 0;
  const now = Date.now();

  return (
    <div className="slot-root">
      <div className="slot-topbar">
        <a className="slot-back" href="../casino/">‹ Casino</a>
        <h1 className="slot-title">
          Slot Machine
          <span className="slot-title-sub">{theme.name}</span>
        </h1>
        <div className="slot-bank">
          <div className="slot-bank-amt" id="slot-bank-amt">${bankroll.toLocaleString()}</div>
          <a className="slot-reload" href="../profile/?from=slot-machine">
            Cash out · profile
          </a>
        </div>
      </div>

      <div className="slot-tabs" role="tablist" aria-label="Slot theme">
        {THEMES.map(function (t) {
          const active = t.id === themeId;
          return (
            <button type="button"
              key={t.id}
              role="tab"
              aria-selected={active}
              className={'slot-tab' + (active ? ' active' : '')}
              style={active
                ? { borderColor: t.accent, color: t.accent, boxShadow: '0 0 0 1px ' + t.accent + '50' }
                : null}
              disabled={spinning}
              onClick={function () { setThemeId(t.id); }}>
              {t.name}
            </button>
          );
        })}
      </div>

      <div className="slot-stage">
        <div className="slot-main">
          <div className="slot-frame" style={{ borderColor: theme.accentDim }}>
            <div className="slot-frame-shine" />
            <div className="slot-reels">
              {[0, 1, 2].map(function (i) {
                return (
                  <SlotReel
                    key={i}
                    targetStop={stops[i]}
                    isSpinning={spinning}
                    themeRow={theme.spriteRow}
                    cellPx={CELL_PX}
                    delay={i * REEL_STAGGER}
                  />
                );
              })}
            </div>
            <div className="slot-payline" style={{ color: theme.accent }}>
              <span className="slot-payline-arrow left" />
              <span className="slot-payline-line" />
              <span className="slot-payline-arrow right" />
            </div>
            {lastResult && lastResult.win > 0 && (
              <div className={'slot-win-banner ' + lastResult.kind}
                style={{ color: theme.accent, borderColor: theme.accent }}>
                <span className="slot-win-tag">
                  {lastResult.kind === 'jackpot' ? 'JACKPOT' : 'WIN'}
                </span>
                <span className="slot-win-amt">+${lastResult.win.toLocaleString()}</span>
              </div>
            )}
            {lastResult && lastResult.win === 0 && (
              <div className="slot-noresult" aria-live="polite">no match — try again</div>
            )}
          </div>

          <div className="slot-controls">
            <div className="slot-bet-group">
              <div className="slot-bet-label">Bet</div>
              <div className="slot-bets">
                {BET_OPTIONS.map(function (b) {
                  const active = b === bet;
                  return (
                    <button type="button"
                      key={b}
                      className={'slot-chip' + (active ? ' active' : '')}
                      disabled={spinning}
                      onClick={function () { setBet(b); }}
                      aria-pressed={active}>
                      ${b}
                    </button>
                  );
                })}
              </div>
            </div>
            <button type="button"
              className="slot-spin"
              disabled={!canSpin}
              onClick={spin}
              style={{ background: 'linear-gradient(180deg, ' + theme.accent + ', ' + theme.accentDim + ')' }}>
              <span className="slot-spin-label">{spinning ? 'Spinning…' : 'Spin'}</span>
              <span className="slot-spin-bet">${bet}</span>
            </button>
          </div>

          <div className="slot-paytable" aria-label="Paytable">
            <div className="slot-paytable-title">
              Pays · 3-of-a-kind on the line · Wild substitutes for any symbol · RTP ~93.6%
            </div>
            <div className="slot-paytable-grid">
              {paytableRows.map(function (row) {
                return (
                  <div key={row.symIdx} className={'slot-pt-row' + (row.isWild ? ' wild' : '')}>
                    <span className="slot-pt-sym" style={{
                      width: PAYTABLE_CELL_PX + 'px',
                      height: PAYTABLE_CELL_PX + 'px',
                      backgroundPosition:
                        (-row.symIdx * PAYTABLE_CELL_PX) + 'px ' +
                        (-theme.spriteRow * PAYTABLE_CELL_PX) + 'px',
                      backgroundSize:
                        (6 * PAYTABLE_CELL_PX) + 'px ' +
                        (3 * PAYTABLE_CELL_PX) + 'px'
                    }} />
                    <span className="slot-pt-name">{row.label}</span>
                    <span className="slot-pt-mult" style={{ color: theme.accent }}>
                      ×{row.mult}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <aside className="slot-sidebar" aria-label="Session info">

          <div className="slot-stats-card">
            <div className="slot-card-head">
              <span className="slot-card-title">This session</span>
              <button type="button"
                className="slot-reset"
                onClick={resetSession}
                disabled={session.spins === 0}
                title="Reset session stats">Reset</button>
            </div>
            <div className="slot-stats-grid">
              <div className="slot-stat">
                <span className="slot-stat-l">Spins</span>
                <span className="slot-stat-v">{session.spins}</span>
              </div>
              <div className="slot-stat">
                <span className="slot-stat-l">Hit rate</span>
                <span className="slot-stat-v">{hitRate}%</span>
              </div>
              <div className="slot-stat">
                <span className="slot-stat-l">Wagered</span>
                <span className="slot-stat-v">{fmtUsd(session.wagered)}</span>
              </div>
              <div className="slot-stat">
                <span className="slot-stat-l">Won</span>
                <span className="slot-stat-v">{fmtUsd(session.won)}</span>
              </div>
              <div className="slot-stat">
                <span className="slot-stat-l">Net</span>
                <span className={'slot-stat-v ' + (net > 0 ? 'pos' : (net < 0 ? 'neg' : ''))}>
                  {fmtSignedUsd(net)}
                </span>
              </div>
              <div className="slot-stat">
                <span className="slot-stat-l">Biggest hit</span>
                <span className="slot-stat-v">{session.biggest > 0 ? fmtUsd(session.biggest) : '—'}</span>
              </div>
              <div className="slot-stat">
                <span className="slot-stat-l">Streak</span>
                <span className={'slot-stat-v ' + (session.streak > 0 ? 'pos' : (session.streak < 0 ? 'neg' : ''))}>
                  {session.streak === 0 ? '—'
                    : session.streak > 0 ? '+' + session.streak + 'W'
                    : Math.abs(session.streak) + 'L'}
                </span>
              </div>
              <div className="slot-stat">
                <span className="slot-stat-l">Jackpots</span>
                <span className={'slot-stat-v ' + (session.jackpots > 0 ? 'pos' : '')}>
                  {session.jackpots}
                </span>
              </div>
            </div>
          </div>

          <div className="slot-history-card">
            <div className="slot-card-head">
              <span className="slot-card-title">Recent spins</span>
              <span className="slot-card-meta">last {Math.min(session.history.length, MAX_HISTORY)}</span>
            </div>
            <div className="slot-history-list">
              {session.history.length === 0 && (
                <div className="slot-history-empty">No spins yet. Hit Spin to start tracking.</div>
              )}
              {session.history.map(function (h, idx) {
                const isWin = h.win > 0;
                const isJackpot = h.kind === 'jackpot';
                return (
                  <div key={h.ts + '-' + idx}
                    className={'slot-history-row' + (isJackpot ? ' jackpot' : (isWin ? ' win' : ''))}>
                    <div className="slot-history-syms">
                      {h.symbols.map(function (sIdx, j) {
                        return (
                          <span key={j} className="slot-history-sym" style={{
                            width: HISTORY_CELL_PX + 'px',
                            height: HISTORY_CELL_PX + 'px',
                            backgroundPosition:
                              (-sIdx * HISTORY_CELL_PX) + 'px ' +
                              (-h.themeRow * HISTORY_CELL_PX) + 'px',
                            backgroundSize:
                              (6 * HISTORY_CELL_PX) + 'px ' +
                              (3 * HISTORY_CELL_PX) + 'px'
                          }} />
                        );
                      })}
                    </div>
                    <div className="slot-history-mid">
                      <span className="bet">${h.bet}</span>
                      <span className="ts">{relativeTime(h.ts, now)} ago</span>
                    </div>
                    <div className={'slot-history-payout ' + (isJackpot ? 'jackpot' : (isWin ? 'win' : 'loss'))}>
                      {isWin ? '+$' + h.win.toLocaleString() : '−$' + h.bet}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

ReactDOM.render(React.createElement(SlotApp), document.getElementById('root'));
