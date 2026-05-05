/* eslint-disable */
// Felt, brass rail, betting board, chip rack, hint panel, result banner, history strip.

const PAYOUTS = {
  straight: 35, split: 17, street: 11, corner: 8, sixline: 5,
  dozen: 2, column: 2, red: 1, black: 1, odd: 1, even: 1, low: 1, high: 1
};

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

function BrassRail({ bankroll, biggestWin, spinsPlayed, spinsWon, peak, showHints, onToggleHints }) {
  const winRate = spinsPlayed ? Math.round(spinsWon / spinsPlayed * 100) : null;
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
            Vegas Strip · Wheel of Fortune 12
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

function HintPanel({ hint }) {
  if (!hint) return null;
  return (
    <div style={{
      position:'absolute', top: 10, right: 10,
      maxWidth: 280, zIndex: 6,
      padding:'12px 14px',
      background:'linear-gradient(180deg, rgba(20,12,6,.92), rgba(10,6,3,.96))',
      border:'1px solid rgba(201,162,106,.5)',
      borderRadius: 10,
      boxShadow:'0 18px 40px rgba(0,0,0,.5)'
    }}>
      <div style={{ fontSize: 9, letterSpacing:'.28em', textTransform:'uppercase', color:'var(--ivory-dim)', marginBottom: 4 }}>
        Basic Strategy Says
      </div>
      <div style={{
        fontFamily:"'Playfair Display', serif",
        fontStyle:'italic',
        fontSize: 16,
        color:'var(--brass-2)',
        marginBottom: 6,
        lineHeight: 1.2
      }}>{hint.action}</div>
      <div style={{ fontSize: 12, color:'var(--ivory)', lineHeight: 1.4, fontStyle:'italic', fontFamily:"'Playfair Display', serif" }}>
        {hint.explanation}
      </div>
      {hint.detail && (
        <div style={{ fontSize: 10, color:'var(--ivory-dim)', marginTop: 6, letterSpacing:'.05em', fontFamily:"'JetBrains Mono', monospace" }}>
          {hint.detail}
        </div>
      )}
    </div>
  );
}

function ResultBanner({ kind, payout }) {
  if (!kind) return null;
  const map = {
    win: { text: `WIN +$${payout}`, color:'#9eddb8', border:'rgba(158,221,184,.6)' },
    bigwin: { text: `BIG WIN +$${payout}`, color:'#ffe79b', border:'rgba(255,231,155,.7)' },
    straight: { text: `STRAIGHT UP +$${payout}`, color:'#ffe79b', border:'rgba(255,231,155,.85)' },
    push: { text: 'EVEN', color:'#ffd27a', border:'rgba(255,210,122,.5)' },
    lose: { text: 'NO WIN', color:'#ff9286', border:'rgba(255,146,134,.5)' }
  };
  const m = map[kind] || map.lose;
  return (
    <div className="banner-in" key={kind + payout} style={{
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

const RED_SET = new Set(RED_NUMBERS);

function buildCells() {
  // returns array of cell descriptors with id, type, numbers, layout grid coords
  const cells = [];

  // Zero — spans 3 rows on the left side
  cells.push({ id:'0', type:'straight', numbers:[0], label:'0', kind:'zero' });

  // Numbers 1-36 in 3 rows × 12 cols.
  // Row A (top): 3,6,...,36 ; Row B: 2,5,...,35 ; Row C: 1,4,...,34
  for (let col = 0; col < 12; col++) {
    for (let row = 0; row < 3; row++) {
      const n = col * 3 + (3 - row);
      cells.push({
        id: 'n' + n, type:'straight', numbers:[n], label: String(n),
        kind: 'number', isRed: RED_SET.has(n), gridCol: col + 1, gridRow: row
      });
    }
  }

  // Column bets at right end (3 rows beyond column 12)
  for (let row = 0; row < 3; row++) {
    const colNumbers = [];
    for (let col = 0; col < 12; col++) {
      colNumbers.push(col * 3 + (3 - row));
    }
    cells.push({ id: 'col' + (3 - row), type: 'column', numbers: colNumbers, label: '2:1', kind:'col' });
  }

  // Dozens row (under numbers)
  cells.push({ id:'dz1', type:'dozen', numbers: range(1,12), label:'1st 12', kind:'dozen' });
  cells.push({ id:'dz2', type:'dozen', numbers: range(13,24), label:'2nd 12', kind:'dozen' });
  cells.push({ id:'dz3', type:'dozen', numbers: range(25,36), label:'3rd 12', kind:'dozen' });

  // Even-money row
  cells.push({ id:'low',   type:'low',   numbers: range(1,18),  label:'1-18',  kind:'even' });
  cells.push({ id:'even',  type:'even',  numbers: rangeFilter(2,36, n => n%2===0), label:'EVEN', kind:'even' });
  cells.push({ id:'red',   type:'red',   numbers: RED_NUMBERS,  label:'◆ RED', kind:'even', forceColor:'red' });
  cells.push({ id:'black', type:'black', numbers: rangeFilter(1,36, n => !RED_SET.has(n)), label:'◆ BLK', kind:'even', forceColor:'black' });
  cells.push({ id:'odd',   type:'odd',   numbers: rangeFilter(1,36, n => n%2===1), label:'ODD',  kind:'even' });
  cells.push({ id:'high',  type:'high',  numbers: range(19,36), label:'19-36', kind:'even' });

  return cells;
}

function range(a, b) { const r = []; for (let i = a; i <= b; i++) r.push(i); return r; }
function rangeFilter(a, b, fn) { return range(a,b).filter(fn); }

function BettingBoard({ bets, onPlace, winningNumber, disabled }) {
  const cells = React.useMemo(buildCells, []);

  // Build bet amount lookup
  const amounts = {};
  bets.forEach(b => { amounts[b.id] = (amounts[b.id] || 0) + b.amount; });

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

function ChipRack({ selected, onSelect, bankroll }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap: 14 }}>
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
            style={{
              width: 56, height: 56,
              background: c.bg,
              border: `3px ${isSel ? 'solid' : 'dashed'} ${c.edge}`,
              color:'#1a1208',
              fontFamily:"'JetBrains Mono', monospace",
              fontWeight: 800, fontSize: 14,
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

// ── Hint logic (port of strategy.js) ────────────────────

const BET_INFO = {
  straight: { name:'Straight Up', payout:'35:1', probability:'2.7%' },
  split:    { name:'Split',       payout:'17:1', probability:'5.4%' },
  street:   { name:'Street',      payout:'11:1', probability:'8.1%' },
  corner:   { name:'Corner',      payout:'8:1',  probability:'10.8%' },
  sixline:  { name:'Six Line',    payout:'5:1',  probability:'16.2%' },
  dozen:    { name:'Dozen',       payout:'2:1',  probability:'32.4%' },
  column:   { name:'Column',      payout:'2:1',  probability:'32.4%' },
  red:      { name:'Red',         payout:'1:1',  probability:'48.6%' },
  black:    { name:'Black',       payout:'1:1',  probability:'48.6%' },
  odd:      { name:'Odd',         payout:'1:1',  probability:'48.6%' },
  even:     { name:'Even',        payout:'1:1',  probability:'48.6%' },
  low:      { name:'Low (1-18)',  payout:'1:1',  probability:'48.6%' },
  high:     { name:'High (19-36)',payout:'1:1',  probability:'48.6%' }
};

function makeHint(bets) {
  if (!bets || bets.length === 0) {
    return {
      action: 'Place a bet',
      explanation: 'Outside bets (Red/Black, Odd/Even) hit nearly half the time — friendliest place to start.',
      detail: 'House edge: 2.7% (single zero)'
    };
  }
  const totalBet = bets.reduce((s,b)=>s+b.amount,0);
  const coverage = new Set();
  bets.forEach(b => b.numbers.forEach(n => coverage.add(n)));
  const cov = coverage.size;
  const covPct = (cov / 37 * 100).toFixed(1);
  const hasZero = coverage.has(0);

  // primary type
  const totals = {};
  bets.forEach(b => { totals[b.type] = (totals[b.type] || 0) + b.amount; });
  let primary = null, max = 0;
  for (const k in totals) if (totals[k] > max) { max = totals[k]; primary = k; }
  const info = BET_INFO[primary] || BET_INFO.straight;

  let action;
  if (cov >= 25) action = 'High coverage';
  else if (cov >= 13) action = 'Moderate coverage';
  else action = 'Low coverage';

  const explanation = bets.length === 1
    ? `${info.name} — pays ${info.payout} with ${info.probability} chance.`
    : `${bets.length} bets covering ${cov} of 37 numbers (${covPct}%). Total wagered $${totalBet}.`;
  const detail = `${cov}/37 covered · ${hasZero ? 'zero included' : 'no zero coverage'} · ${info.payout}`;
  return { action, explanation, detail };
}

Object.assign(window, {
  PAYOUTS, CHIP_DEFS, FeltBackdrop, FeltLogo, BrassRail, RailStat, HistoryStrip,
  ResultBigNumber, HintPanel, ResultBanner, BettingBoard, ChipRack, makeHint,
  BET_INFO
});
