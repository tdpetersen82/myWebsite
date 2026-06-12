/* eslint-disable */
// Felt, brass rail, betting board, chip rack, coach bar, result banner,
// history strip. Bet definitions/odds math live in rl-bets.js.

const CHIP_DEFS = [
  { value: 5,    label: '$5',  bg: 'radial-gradient(circle at 35% 30%, #ff6b6b, #c0392b 70%, #7d1d12)', edge: '#ffd1d1' },
  { value: 25,   label: '$25', bg: 'radial-gradient(circle at 35% 30%, #5dd592, #1e8449 70%, #0e4d2a)', edge: '#bfeacd' },
  { value: 100,  label: '$100',bg: 'radial-gradient(circle at 35% 30%, #6cb4f5, #1f6fa5 70%, #103e5e)', edge: '#cfe6f7' },
  { value: 500,  label: '$500',bg: 'radial-gradient(circle at 35% 30%, #c89bef, #6c3483 70%, #3a1c4d)', edge: '#e6d2f3' },
];

function FeltBackdrop() {
  return (
    <div style={{
      position:'absolute', inset:0,
      background:`
        radial-gradient(ellipse at 50% 30%, #1a4f3a 0%, #0e3527 60%, #061a13 100%)
      `,
      borderRadius: 18,
      overflow: 'hidden'
    }}>
      <div style={{
        position:'absolute', inset:0,
        background:`
          repeating-linear-gradient(45deg, rgba(255,255,255,.012) 0 2px, transparent 2px 4px),
          repeating-linear-gradient(-45deg, rgba(255,255,255,.012) 0 2px, transparent 2px 4px)
        `,
        opacity: .4,
        pointerEvents:'none'
      }} />
    </div>
  );
}

function FeltLogo() {
  return (
    <div style={{
      position:'absolute',
      right: 24, bottom: 18,
      textAlign: 'right',
      opacity: .15,
      pointerEvents: 'none'
    }}>
      <div style={{
        fontFamily:"'Playfair Display', serif",
        fontSize: 20, fontStyle:'italic', fontWeight: 600,
        color:'var(--brass-2)', lineHeight: 1
      }}>Limestone</div>
      <div style={{
        fontSize: 8, letterSpacing:'.32em', textTransform:'uppercase',
        color:'var(--brass-2)', marginTop: 4
      }}>Roulette · 35:1 · Single Zero</div>
    </div>
  );
}

function BrassRail({ bankroll, biggestWin, spinsPlayed, spinsWon, peak, showHints, onToggleHints, compact }) {
  const winRate = spinsPlayed ? Math.round(spinsWon / spinsPlayed * 100) : null;
  if (compact) {
    return (
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        margin:'8px 10px 0', padding:'6px 10px',
        background:'linear-gradient(180deg, rgba(35,22,10,.75), rgba(20,12,6,.85))',
        border:'1px solid rgba(201,162,106,.35)', borderRadius: 10,
        boxShadow:'0 8px 22px rgba(0,0,0,.4), inset 0 1px 0 rgba(230,197,144,.15)',
        zIndex: 5, position:'relative'
      }}>
        <a href="../casino/" style={{
          padding:'6px 10px', background:'rgba(20,12,6,.6)', color:'var(--brass-2)',
          border:'1px solid rgba(201,162,106,.5)', borderRadius: 999,
          fontSize: 9, fontWeight: 700, letterSpacing:'.14em', textTransform:'uppercase',
          textDecoration:'none', whiteSpace:'nowrap'
        }}>← Lobby</a>
        <div style={{ display:'flex', alignItems:'baseline', gap: 6 }}>
          <span style={{ fontSize: 8, letterSpacing:'.24em', color:'var(--ivory-dim)', textTransform:'uppercase' }}>Bankroll</span>
          <span style={{ fontFamily:"'Playfair Display', serif", fontStyle:'italic', fontWeight: 700, fontSize: 19, color:'var(--brass-2)' }}>${bankroll.toLocaleString()}</span>
        </div>
        <button onClick={onToggleHints} style={{
          padding:'6px 10px',
          background: showHints ? 'linear-gradient(180deg, #e6c590, #c9a26a)' : 'rgba(20,12,6,.6)',
          color: showHints ? '#1a1208' : 'var(--brass-2)',
          border:'1px solid rgba(201,162,106,.5)', borderRadius: 999,
          fontSize: 9, fontWeight: 700, letterSpacing:'.14em', textTransform:'uppercase',
          cursor:'pointer', whiteSpace:'nowrap'
        }}>{showHints ? '✦ Coach' : 'Coach'}</button>
      </div>
    );
  }
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
            Vegas Strip · Single Zero
          </div>
        </div>
      </a>

      <div style={{ flex: 1, display:'flex', alignItems:'center', justifyContent:'flex-end', gap: 0 }}>
        <RailStat label="Bankroll" value={`$${bankroll.toLocaleString()}`} accent />
        <RailStat label="Biggest" value={biggestWin > 0 ? `$${biggestWin.toLocaleString()}` : '—'} highlight={biggestWin >= 500} />
        <RailStat label="Spins" value={spinsPlayed || '—'} />
        <RailStat label="Win Rate" value={winRate !== null ? `${winRate}%` : '—'} />
        <RailStat label="Peak" value={`$${peak.toLocaleString()}`} small />
        <button
          onClick={onToggleHints}
          title={showHints ? 'Hide the odds coach' : 'Show the odds coach'}
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
      <div style={{ fontSize: 8, letterSpacing:'.28em', color:'var(--ivory-dim)', textTransform:'uppercase', fontWeight: 600 }}>{label}</div>
      <div style={{
        fontFamily: accent ? "'Playfair Display', serif" : "'JetBrains Mono', monospace",
        fontSize: accent ? 22 : (small ? 13 : 15),
        fontStyle: accent ? 'italic' : 'normal',
        fontWeight: accent ? 700 : 500,
        color: highlight ? '#ffb347' : (accent ? 'var(--brass-2)' : 'var(--ivory)'),
        lineHeight: 1.1, marginTop: 2
      }}>{value}</div>
    </div>
  );
}

function HistoryStrip({ history }) {
  return (
    <div style={{
      display:'flex', alignItems:'center', gap: 6,
      padding:'8px 12px',
      background:'rgba(15,12,8,.55)',
      border:'1px solid rgba(201,162,106,.25)',
      borderRadius: 999,
      minHeight: 38
    }}>
      <span style={{ fontSize: 9, letterSpacing:'.24em', textTransform:'uppercase', color:'var(--ivory-dim)', marginRight: 4 }}>Last</span>
      {history.length === 0 && (
        <span style={{ fontSize: 12, fontStyle:'italic', color:'var(--ivory-dim)', fontFamily:"'Playfair Display', serif" }}>—</span>
      )}
      {history.slice(0, 12).map((n, i) => {
        const isZero = n === 0;
        const isRedN = !isZero && RED_NUMBERS.includes(n);
        const bg = isZero ? '#0e6e3a' : (isRedN ? '#a52a2a' : '#1a1410');
        return (
          <span key={i} style={{
            display:'inline-flex', alignItems:'center', justifyContent:'center',
            width: 22, height: 22, borderRadius: '50%',
            background: bg,
            border: '1px solid rgba(201,162,106,.4)',
            color:'var(--ivory)',
            fontSize: 11, fontWeight: 700,
            fontFamily:"'JetBrains Mono', monospace",
            opacity: 1 - i * 0.06
          }}>{n}</span>
        );
      })}
    </div>
  );
}

function ResultBigNumber({ result }) {
  if (result == null) {
    return (
      <div style={{
        width: 110, height: 110,
        display:'flex', alignItems:'center', justifyContent:'center',
        border:'1px dashed rgba(201,162,106,.35)',
        borderRadius: 14,
        color:'var(--ivory-dim)',
        fontFamily:"'Playfair Display', serif",
        fontSize: 14, fontStyle:'italic'
      }}>awaiting spin</div>
    );
  }
  const isZero = result === 0;
  const isRedN = !isZero && RED_NUMBERS.includes(result);
  const bg = isZero ? 'linear-gradient(180deg,#1f8a4d,#0a4423)' : (isRedN ? 'linear-gradient(180deg,#c0392b,#6e1d1d)' : 'linear-gradient(180deg,#1a1410,#000)');
  return (
    <div className="banner-in" key={result} style={{
      width: 110, height: 110,
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      borderRadius: 14,
      background: bg,
      border:'2px solid var(--brass-2)',
      boxShadow:'0 0 0 1px rgba(0,0,0,.5), 0 18px 40px rgba(0,0,0,.6), 0 0 30px rgba(230,197,144,.35)',
      color:'var(--ivory)',
      fontFamily:"'Playfair Display', serif",
      fontWeight: 700,
      lineHeight: 1
    }}>
      <div style={{ fontSize: 56, fontStyle:'italic' }}>{result}</div>
      <div style={{ fontSize: 9, letterSpacing:'.28em', textTransform:'uppercase', marginTop: 4, color: 'var(--brass-2)' }}>
        {isZero ? 'Zero' : (isRedN ? 'Red' : 'Black')}
      </div>
    </div>
  );
}

// Exact-odds coach — roulette's version of the blackjack EV coach. Every
// figure is computed over the 37 pockets, not estimated.
function CoachBar({ bets, visible, portrait }) {
  if (!visible) return null;
  const out = computeOutcomes(bets);

  const shell = {
    margin: portrait ? '0 10px' : '0 24px',
    padding: portrait ? '8px 12px' : '10px 16px',
    background:'linear-gradient(180deg, rgba(20,12,6,.92), rgba(10,6,3,.96))',
    border:'1px solid rgba(201,162,106,.45)',
    borderRadius: 10,
    boxShadow:'0 12px 28px rgba(0,0,0,.45)',
    display:'flex', alignItems:'center', gap: portrait ? 10 : 16,
    position:'relative', zIndex: 6
  };
  const kicker = {
    fontSize: 8.5, letterSpacing:'.26em', textTransform:'uppercase',
    color:'var(--brass)', fontWeight: 700, whiteSpace:'nowrap'
  };

  if (!out) {
    return (
      <div style={shell}>
        <span style={kicker}>✦ Coach</span>
        <span style={{
          fontFamily:"'Playfair Display', serif", fontStyle:'italic',
          fontSize: portrait ? 12.5 : 14, color:'var(--ivory)', lineHeight: 1.3
        }}>
          {portrait
            ? 'Pick your variance — every bet pays the house the same 2.7%.'
            : 'Every bet on this wheel gives the house the same 2.7% — pick your variance, not your edge. Outside bets hit almost half the time; a straight number hits once in 37 but pays 35:1.'}
        </span>
      </div>
    );
  }

  const w = Math.round(out.winP * 100);
  const p = Math.round(out.pushP * 100);
  const l = 100 - w - p;
  const evTxt = out.ev < 0 ? `−$${Math.abs(out.ev).toFixed(2)}` : `+$${out.ev.toFixed(2)}`;

  return (
    <div style={shell}>
      <span style={kicker}>✦ Coach</span>
      <span style={{
        fontFamily:"'Playfair Display', serif", fontStyle:'italic',
        fontSize: portrait ? 12.5 : 14.5, color:'var(--ivory)', whiteSpace:'nowrap'
      }}>
        Out of 100 spins like this: <b style={{ color:'#9eddb8' }}>win {w}</b>{p > 0 && <span>, <b style={{ color:'#ffd27a' }}>even {p}</b></span>}, <b style={{ color:'#ff9286' }}>lose {l}</b>
      </span>
      <div style={{ flex: 1, minWidth: 40, height: 8, borderRadius: 4, overflow:'hidden', display:'flex', boxShadow:'inset 0 1px 2px rgba(0,0,0,.5)' }}>
        <div style={{ width: `${w}%`, background:'linear-gradient(180deg,#9eddb8,#3f8f63)' }} />
        {p > 0 && <div style={{ width: `${p}%`, background:'linear-gradient(180deg,#ffd27a,#a87f2e)' }} />}
        <div style={{ width: `${l}%`, background:'linear-gradient(180deg,#ff9286,#8e3226)' }} />
      </div>
      {!portrait && (
        <span style={{ fontSize: 10.5, fontFamily:"'JetBrains Mono', monospace", color:'var(--ivory-dim)', whiteSpace:'nowrap' }}>
          {out.covered}/37 covered{out.hasZero ? ' · zero in' : ''} · best +${out.bestProfit.toLocaleString()}
        </span>
      )}
      <span style={{
        fontSize: portrait ? 11 : 12, fontFamily:"'JetBrains Mono', monospace",
        color: 'var(--ivory)', whiteSpace:'nowrap',
        padding: portrait ? '3px 8px' : '4px 10px', borderRadius: 8,
        background:'rgba(142,50,38,.25)', border:'1px solid rgba(255,146,134,.3)'
      }}>{portrait ? `${evTxt} avg` : `${evTxt} / spin avg`}</span>
    </div>
  );
}

function ResultBanner({ kind, payout }) {
  if (!kind) return null;
  const map = {
    win: { text: `WIN +$${payout}`, color:'#9eddb8', border:'rgba(158,221,184,.6)' },
    bigwin: { text: `BIG WIN +$${payout}`, color:'#ffe79b', border:'rgba(255,231,155,.7)' },
    straight: { text: `STRAIGHT UP +$${payout}`, color:'#ffe79b', border:'rgba(255,231,155,.85)' },
    push: { text: 'EVEN — STAKE BACK', color:'#ffd27a', border:'rgba(255,210,122,.5)' },
    lose: { text: payout > 0 ? `NO WIN −$${payout}` : 'NO WIN', color:'#ff9286', border:'rgba(255,146,134,.5)' }
  };
  const m = map[kind] || map.lose;
  return (
    <div className="banner-in-centered" key={kind + payout} style={{
      position:'absolute', left:'50%', transform:'translateX(-50%)', top: 10,
      padding:'10px 22px',
      background:'rgba(10,6,3,.85)',
      border:`1px solid ${m.border}`,
      borderRadius: 999,
      color: m.color,
      fontFamily:"'Playfair Display', serif",
      fontStyle:'italic', fontWeight: 700,
      fontSize: 18,
      letterSpacing:'.18em',
      boxShadow:'0 14px 30px rgba(0,0,0,.5)'
    }}>{m.text}</div>
  );
}

// ── Betting board ──────────────────────────────────────
// Cell/zone descriptors come from rl-bets.js (shared with the node tests).

// A small hit-spot on a cell edge/vertex for split/street/corner/six-line
// bets. Invisible-ish dot that blooms on hover; shows a mini chip when bet.
function ZoneSpot({ zone, pos, amount, winning, disabled, onPlace }) {
  const P = {
    top:    { top: -11, left: '50%', marginLeft: -9 },
    left:   { left: -11, top: '50%', marginTop: -9 },
    tl:     { left: -11, top: -11 },
    bottom: { bottom: -11, left: '50%', marginLeft: -9 },
    bl:     { left: -11, bottom: -11 }
  }[pos];
  return (
    <div
      className={'zone-spot' + (amount ? ' has-chip' : '') + (winning && amount ? ' winning-spot' : '')}
      title={zoneTitle(zone)}
      onClick={(e) => { e.stopPropagation(); if (!disabled) onPlace(zone); }}
      style={{ position:'absolute', width: 18, height: 18, zIndex: 6, ...P }}
    >
      {amount ? <span className="zone-chip">${amount}</span> : null}
    </div>
  );
}

function BettingBoard({ bets, onPlace, winningNumber, disabled, portrait }) {
  const cells = React.useMemo(buildCells, []);
  const zones = React.useMemo(buildInsideZones, []);
  const orient = portrait ? 'port' : 'land';

  const zonesByHost = React.useMemo(() => {
    const m = {};
    zones.forEach(z => {
      const a = z[orient];
      (m[a.host] = m[a.host] || []).push(z);
    });
    return m;
  }, [zones, orient]);

  // Build bet amount lookup
  const amounts = {};
  bets.forEach(b => { amounts[b.id] = (amounts[b.id] || 0) + b.amount; });

  const cellZones = (n) => (zonesByHost[n] || []).map(z => (
    <ZoneSpot
      key={z.id}
      zone={z}
      pos={z[orient].pos}
      amount={amounts[z.id]}
      winning={winningNumber != null && z.numbers.includes(winningNumber)}
      disabled={disabled}
      onPlace={onPlace}
    />
  ));

  const cellBg = (c) => {
    if (c.kind === 'zero') return 'linear-gradient(180deg,#1f8a4d,#0e4d2a)';
    if (c.kind === 'number') return c.isRed ? 'linear-gradient(180deg,#a52a2a,#6e1d1d)' : 'linear-gradient(180deg,#1a1410,#000)';
    if (c.kind === 'col' || c.kind === 'dozen') return 'rgba(10,6,3,.55)';
    if (c.kind === 'even') {
      if (c.forceColor === 'red') return 'linear-gradient(180deg,#a52a2a,#6e1d1d)';
      if (c.forceColor === 'black') return 'linear-gradient(180deg,#1a1410,#000)';
      return 'rgba(10,6,3,.55)';
    }
    return 'rgba(10,6,3,.4)';
  };

  const isWinning = (c) => winningNumber != null && c.numbers.includes(winningNumber);

  // ── Portrait: zero on top, streets run downward, dozens rail on the right ──
  if (portrait) {
    const numberCells = cells.filter(c => c.kind === 'number');
    return (
      <div style={{
        position:'relative',
        padding: '12px 12px 10px 16px',
        background: 'linear-gradient(180deg, rgba(0,0,0,.18), rgba(0,0,0,.05))',
        border: '1px solid rgba(201,162,106,.35)',
        borderRadius: 14,
        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.4)'
      }}>
        <div style={{
          display:'grid',
          gridTemplateColumns: 'repeat(3, 1fr) 34px',
          gridTemplateRows: `26px repeat(12, 25px) 28px`,
          gap: 3,
          alignItems:'stretch'
        }}>
          {/* Zero across the top */}
          <div
            className={'bet-cell' + (isWinning(cells[0]) ? ' winning' : '') + (disabled ? ' disabled' : '')}
            onClick={() => !disabled && onPlace(cells[0])}
            style={{
              gridColumn: '1 / span 3', gridRow: 1,
              background: cellBg(cells[0]),
              border:'1px solid rgba(201,162,106,.45)', borderRadius: 8,
              display:'flex', alignItems:'center', justifyContent:'center',
              color:'var(--ivory)', fontFamily:"'Playfair Display', serif",
              fontSize: 17, fontWeight: 700, fontStyle:'italic', position:'relative'
            }}
          >0
            {amounts['0'] && <div className="table-chip">${amounts['0']}</div>}
          </div>

          {numberCells.map(c => {
            const n = c.numbers[0];
            return (
              <div
                key={c.id}
                className={'bet-cell' + (isWinning(c) ? ' winning' : '') + (disabled ? ' disabled' : '')}
                onClick={() => !disabled && onPlace(c)}
                style={{
                  gridColumn: (n - 1) % 3 + 1, gridRow: Math.ceil(n / 3) + 1,
                  background: cellBg(c),
                  border:'1px solid rgba(201,162,106,.45)', borderRadius: 5,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  color:'var(--ivory)', fontFamily:"'JetBrains Mono', monospace",
                  fontSize: 13, fontWeight: 700, position:'relative'
                }}
              >{c.label}
                {amounts[c.id] && <div className="table-chip">${amounts[c.id]}</div>}
                {cellZones(n)}
              </div>
            );
          })}

          {/* Dozens down the right side */}
          {cells.filter(c => c.kind === 'dozen').map((c, i) => (
            <div
              key={c.id}
              className={'bet-cell' + (isWinning(c) ? ' winning' : '') + (disabled ? ' disabled' : '')}
              onClick={() => !disabled && onPlace(c)}
              style={{
                gridColumn: 4, gridRow: `${2 + i * 4} / span 4`,
                background: cellBg(c),
                border:'1px solid rgba(201,162,106,.45)', borderRadius: 5,
                display:'flex', alignItems:'center', justifyContent:'center',
                color:'var(--ivory)', fontFamily:"'Playfair Display', serif",
                fontSize: 12, fontStyle:'italic', fontWeight: 600,
                writingMode:'vertical-rl', position:'relative'
              }}
            >{c.label}
              {amounts[c.id] && <div className="table-chip">${amounts[c.id]}</div>}
            </div>
          ))}

          {/* Column bets along the bottom */}
          {cells.filter(c => c.kind === 'col').map((c, i) => (
            <div
              key={c.id}
              className={'bet-cell' + (isWinning(c) ? ' winning' : '') + (disabled ? ' disabled' : '')}
              onClick={() => !disabled && onPlace(c)}
              style={{
                gridColumn: 3 - i, gridRow: 14,
                background: cellBg(c),
                border:'1px solid rgba(201,162,106,.45)', borderRadius: 5,
                display:'flex', alignItems:'center', justifyContent:'center',
                color:'var(--brass-2)', fontFamily:"'JetBrains Mono', monospace",
                fontSize: 11, fontWeight: 700, letterSpacing:'.1em', position:'relative'
              }}
            >{c.label}
              {amounts[c.id] && <div className="table-chip">${amounts[c.id]}</div>}
            </div>
          ))}
        </div>

        {/* Even-money: two rows of three */}
        <div style={{ marginTop: 4, display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gridAutoRows: 28, gap: 3 }}>
          {cells.filter(c => c.kind === 'even').map(c => (
            <div
              key={c.id}
              className={'bet-cell' + (isWinning(c) ? ' winning' : '') + (disabled ? ' disabled' : '')}
              onClick={() => !disabled && onPlace(c)}
              style={{
                background: cellBg(c),
                border:'1px solid rgba(201,162,106,.45)', borderRadius: 5,
                display:'flex', alignItems:'center', justifyContent:'center',
                color: c.forceColor ? 'var(--ivory)' : 'var(--brass-2)',
                fontFamily:"'JetBrains Mono', monospace",
                fontSize: 11, fontWeight: 700, letterSpacing:'.1em', position:'relative'
              }}
            >{c.label}
              {amounts[c.id] && <div className="table-chip">${amounts[c.id]}</div>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position:'relative',
      padding: 14,
      background: 'linear-gradient(180deg, rgba(0,0,0,.18), rgba(0,0,0,.05))',
      border: '1px solid rgba(201,162,106,.35)',
      borderRadius: 14,
      boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.4)'
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '34px repeat(12, 1fr) 38px',
        gridTemplateRows: 'repeat(3, 56px)',
        gap: 4,
        alignItems:'stretch'
      }}>
        {/* Zero spanning 3 rows */}
        <div
          className={'bet-cell' + (isWinning(cells[0]) ? ' winning' : '') + (disabled ? ' disabled' : '')}
          onClick={() => !disabled && onPlace(cells[0])}
          style={{
            gridColumn: 1, gridRow: '1 / span 3',
            background: cellBg(cells[0]),
            border:'1px solid rgba(201,162,106,.45)',
            borderRadius: 8,
            display:'flex', alignItems:'center', justifyContent:'center',
            color:'var(--ivory)',
            fontFamily:"'Playfair Display', serif",
            fontSize: 22, fontWeight: 700, fontStyle:'italic'
          }}
        >0
          {amounts[cells[0].id] && <div className="table-chip">${amounts[cells[0].id]}</div>}
        </div>

        {/* Number cells */}
        {cells.filter(c => c.kind === 'number').map(c => (
          <div
            key={c.id}
            className={'bet-cell' + (isWinning(c) ? ' winning' : '') + (disabled ? ' disabled' : '')}
            onClick={() => !disabled && onPlace(c)}
            style={{
              gridColumn: c.gridCol + 1, gridRow: c.gridRow + 1,
              background: cellBg(c),
              border:'1px solid rgba(201,162,106,.45)',
              borderRadius: 6,
              display:'flex', alignItems:'center', justifyContent:'center',
              color:'var(--ivory)',
              fontFamily:"'JetBrains Mono', monospace",
              fontSize: 15, fontWeight: 700
            }}
          >{c.label}
            {amounts[c.id] && <div className="table-chip">${amounts[c.id]}</div>}
            {cellZones(c.numbers[0])}
          </div>
        ))}

        {/* Column 2:1 cells */}
        {cells.filter(c => c.kind === 'col').map((c, i) => (
          <div
            key={c.id}
            className={'bet-cell' + (isWinning(c) ? ' winning' : '') + (disabled ? ' disabled' : '')}
            onClick={() => !disabled && onPlace(c)}
            style={{
              gridColumn: 14, gridRow: i + 1,
              background: cellBg(c),
              border:'1px solid rgba(201,162,106,.45)',
              borderRadius: 6,
              display:'flex', alignItems:'center', justifyContent:'center',
              color:'var(--brass-2)',
              fontFamily:"'JetBrains Mono', monospace",
              fontSize: 12, fontWeight: 700, letterSpacing:'.1em'
            }}
          >{c.label}
            {amounts[c.id] && <div className="table-chip">${amounts[c.id]}</div>}
          </div>
        ))}
      </div>

      {/* Dozens row */}
      <div style={{
        marginTop: 6, display:'grid',
        gridTemplateColumns: '34px repeat(3, 1fr) 38px',
        gap: 4
      }}>
        <div /> {/* spacer under zero */}
        {cells.filter(c => c.kind === 'dozen').map(c => (
          <div
            key={c.id}
            className={'bet-cell' + (isWinning(c) ? ' winning' : '') + (disabled ? ' disabled' : '')}
            onClick={() => !disabled && onPlace(c)}
            style={{
              background: cellBg(c),
              border:'1px solid rgba(201,162,106,.45)',
              borderRadius: 6, height: 44,
              display:'flex', alignItems:'center', justifyContent:'center',
              color:'var(--ivory)',
              fontFamily:"'Playfair Display', serif",
              fontSize: 16, fontStyle:'italic', fontWeight: 600
            }}
          >{c.label}
            {amounts[c.id] && <div className="table-chip">${amounts[c.id]}</div>}
          </div>
        ))}
        <div /> {/* spacer under col bets */}
      </div>

      {/* Even-money row */}
      <div style={{
        marginTop: 4, display:'grid',
        gridTemplateColumns: '34px repeat(6, 1fr) 38px',
        gap: 4
      }}>
        <div />
        {cells.filter(c => c.kind === 'even').map(c => (
          <div
            key={c.id}
            className={'bet-cell' + (isWinning(c) ? ' winning' : '') + (disabled ? ' disabled' : '')}
            onClick={() => !disabled && onPlace(c)}
            style={{
              background: cellBg(c),
              border:'1px solid rgba(201,162,106,.45)',
              borderRadius: 6, height: 40,
              display:'flex', alignItems:'center', justifyContent:'center',
              color: c.forceColor ? 'var(--ivory)' : 'var(--brass-2)',
              fontFamily:"'JetBrains Mono', monospace",
              fontSize: 13, fontWeight: 700, letterSpacing:'.12em'
            }}
          >{c.label}
            {amounts[c.id] && <div className="table-chip">${amounts[c.id]}</div>}
          </div>
        ))}
        <div />
      </div>
    </div>
  );
}

// ── Chip rack ───────────────────────────────────────────

function ChipRack({ selected, onSelect, bankroll, size = 56 }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap: size < 56 ? 10 : 14 }}>
      <div style={{
        fontSize: 9, letterSpacing:'.28em', textTransform:'uppercase',
        color:'var(--ivory-dim)', writingMode:'vertical-rl', transform:'rotate(180deg)'
      }}>Chips</div>
      {CHIP_DEFS.map(c => {
        const disabled = bankroll < c.value;
        const isSel = selected === c.value;
        return (
          <button
            key={c.value}
            disabled={disabled}
            onClick={() => onSelect(c.value)}
            className="chip-3d"
            title={`Shortcut: ${CHIP_DEFS.indexOf(c) + 1}`}
            style={{
              width: size, height: size,
              background: c.bg,
              border: `3px ${isSel ? 'solid' : 'dashed'} ${c.edge}`,
              color:'#1a1208',
              fontFamily:"'JetBrains Mono', monospace",
              fontWeight: 800, fontSize: size < 56 ? 11 : 14,
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.35 : 1,
              outline: isSel ? '2px solid var(--brass-2)' : 'none',
              outlineOffset: isSel ? 4 : 0,
              transform: isSel ? 'translateY(-4px)' : 'none',
              transition:'transform .15s, outline-offset .15s'
            }}
          >{c.label}</button>
        );
      })}
    </div>
  );
}

Object.assign(window, {
  CHIP_DEFS, FeltBackdrop, FeltLogo, BrassRail, RailStat, HistoryStrip,
  ResultBigNumber, CoachBar, ResultBanner, BettingBoard, ChipRack, ZoneSpot
});
