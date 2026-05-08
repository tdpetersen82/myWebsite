/* global React, ReactDOM, SlotReel */
/* eslint-disable */

const PREFS_KEY = 'slotMachinePrefs';
const BET_OPTIONS = [1, 5, 25, 100];
const SPIN_DURATION = 1100;
const REEL_STAGGER = 250;
const TOTAL_SPIN = SPIN_DURATION + REEL_STAGGER * 2 + 200;
const CELL_PX = 160;
const PAYTABLE_CELL_PX = 36;

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

  React.useEffect(function () {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ themeId: themeId, bet: bet }));
  }, [themeId, bet]);

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
      if (result.win > 0) {
        const post = window.CASINO_BANKROLL.read() + result.win;
        window.CASINO_BANKROLL.write(post);
        setBankroll(post);
      }
      setLastResult(result);
    }, TOTAL_SPIN);
  }

  function reload() {
    if (spinning) return;
    const v = window.CASINO_BANKROLL.reload();
    setBankroll(v);
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
          <button type="button" className="slot-reload" onClick={reload} disabled={spinning}>
            Reload $1,000
          </button>
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
        <div className="slot-paytable-title">Pays · 3-of-a-kind on the line</div>
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
        <div className="slot-paytable-foot">
          Wild substitutes for any symbol · single payline · play money only
        </div>
      </div>
    </div>
  );
}

ReactDOM.render(React.createElement(SlotApp), document.getElementById('root'));
