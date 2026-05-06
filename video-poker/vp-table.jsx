/* eslint-disable */
// Table-side components: FeltBackdrop, BrassRail, Paytable, ResultBanner, HintPanel, CoinSelector, DealDrawButton.

const PAYTABLE_ORDER = [
  'royal-flush','straight-flush','four-of-a-kind','full-house','flush',
  'straight','three-of-a-kind','two-pair','jacks-or-better'
];

function FeltBackdrop() {
  return (
    <div style={{
      position:'absolute', inset:0,
      background:`
        radial-gradient(ellipse at 50% 30%, var(--felt-1) 0%, var(--felt-2) 60%, #061a13 100%)`,
      borderRadius:18,
      boxShadow:'inset 0 0 80px rgba(0,0,0,.5)',
      overflow:'hidden'
    }}>
      <div style={{
        position:'absolute', inset:0, opacity:.18,
        backgroundImage:'repeating-linear-gradient(45deg, rgba(255,255,255,.04) 0 2px, transparent 2px 4px)',
        pointerEvents:'none'
      }}/>
    </div>
  );
}

function BrassRail({ bankroll, hands, wins, royals, best, showHints, onToggleHints }) {
  const winRate = hands ? Math.round(wins/hands*100) : null;
  return (
    <div style={{
      display:'flex', alignItems:'stretch',
      margin:'14px 22px 0',
      padding:'10px 18px',
      background:'linear-gradient(180deg, rgba(35,22,10,.75), rgba(20,12,6,.85))',
      border:'1px solid rgba(201,162,106,.35)',
      borderRadius:10,
      backdropFilter:'blur(10px)',
      boxShadow:'0 8px 22px rgba(0,0,0,.4), inset 0 1px 0 rgba(230,197,144,.15)',
      gap:0,
      zIndex:5, position:'relative'
    }}>
      <a href="../casino/" title="Back to casino"
        style={{
          display:'inline-flex', alignItems:'center', gap:6,
          alignSelf:'center',
          marginRight:14,
          padding:'8px 14px',
          background:'rgba(20,12,6,.6)',
          color:'var(--brass-2)',
          border:'1px solid rgba(201,162,106,.5)',
          borderRadius:999,
          fontSize:10, fontWeight:700, letterSpacing:'.18em',
          textTransform:'uppercase', textDecoration:'none', whiteSpace:'nowrap',
          transition:'all .2s', boxShadow:'0 2px 6px rgba(0,0,0,.3)'
        }}>← Lobby</a>

      <a href="../casino/" title="Back to casino"
        style={{
          display:'flex', alignItems:'center', gap:12, paddingRight:18,
          borderRight:'1px solid rgba(201,162,106,.2)',
          textDecoration:'none', color:'inherit'
        }}>
        <div style={{
          width:32, height:32, borderRadius:'50%',
          background:'radial-gradient(circle at 35% 30%, #f5d896, #8c6a3f 75%)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontFamily:"'Playfair Display', serif",
          color:'#1a1208', fontSize:14, fontWeight:800, fontStyle:'italic',
          boxShadow:'inset 0 1px 0 rgba(255,255,255,.4), 0 2px 6px rgba(0,0,0,.4)'
        }}>L</div>
        <div>
          <div style={{
            fontFamily:"'Playfair Display', serif",
            fontSize:17, color:'var(--brass-2)',
            fontStyle:'italic', fontWeight:600, letterSpacing:'.02em', lineHeight:1
          }}>Limestone Games</div>
          <div style={{ fontSize:9, letterSpacing:'.32em', color:'var(--ivory-dim)', textTransform:'uppercase', marginTop:3 }}>
            Vegas Strip · Video Poker
          </div>
        </div>
      </a>

      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'flex-end', gap:0 }}>
        <RailStat label="Bankroll" value={`$${bankroll.toLocaleString()}`} accent />
        <RailStat label="Hands"    value={hands || '—'} />
        <RailStat label="Wins"     value={wins || '—'} />
        <RailStat label="Royals"   value={royals || '—'} highlight={royals > 0} />
        <RailStat label="Peak"     value={`$${best.toLocaleString()}`} small />
        <button
          onClick={onToggleHints}
          title={showHints ? 'Hide basic-strategy hints' : 'Show basic-strategy hints'}
          style={{
            marginLeft:14,
            padding:'8px 14px',
            background: showHints ? 'linear-gradient(180deg, #e6c590, #c9a26a)' : 'rgba(20,12,6,.6)',
            color: showHints ? '#1a1208' : 'var(--brass-2)',
            border:'1px solid rgba(201,162,106,.5)',
            borderRadius:999,
            fontSize:10, fontWeight:700, letterSpacing:'.18em',
            textTransform:'uppercase', cursor:'pointer', whiteSpace:'nowrap',
            transition:'all .2s',
            boxShadow: showHints ? '0 4px 10px rgba(230,197,144,.35)' : '0 2px 6px rgba(0,0,0,.3)'
          }}>
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
      <div style={{ fontSize:8, letterSpacing:'.28em', color:'var(--ivory-dim)', textTransform:'uppercase', fontWeight:600 }}>{label}</div>
      <div style={{
        fontFamily: accent ? "'Playfair Display', serif" : "'JetBrains Mono', monospace",
        fontSize: accent ? 22 : (small ? 13 : 15),
        color: accent ? 'var(--brass-2)' : (highlight ? '#ffb347' : '#fff'),
        fontWeight: accent ? 600 : 500,
        fontStyle: accent ? 'italic' : 'normal',
        lineHeight:1.1, marginTop:2
      }}>{value}</div>
    </div>
  );
}

function Paytable({ coinsBet, winningKey }) {
  return (
    <div style={{
      margin:'14px 22px 0',
      padding:'8px 6px',
      background:'linear-gradient(180deg, rgba(20,12,6,.6), rgba(10,6,3,.7))',
      border:'1px solid rgba(201,162,106,.3)',
      borderRadius:10,
      boxShadow:'0 6px 18px rgba(0,0,0,.35), inset 0 1px 0 rgba(230,197,144,.1)'
    }}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontFamily:'system-ui, sans-serif' }}>
        <thead>
          <tr style={{ borderBottom:'1px solid rgba(201,162,106,.25)' }}>
            <th style={{ textAlign:'left', padding:'4px 12px', fontSize:9, letterSpacing:'.28em', color:'var(--ivory-dim)', textTransform:'uppercase', fontWeight:600 }}>Hand</th>
            {[1,2,3,4,5].map(c => (
              <th key={c} style={{
                padding:'4px 0',
                fontSize:9, letterSpacing:'.18em', color: c === coinsBet ? '#1a1208' : 'var(--ivory-dim)',
                textTransform:'uppercase', fontWeight:700,
                background: c === coinsBet ? 'linear-gradient(180deg, #e6c590, #c9a26a)' : 'transparent',
                borderTopLeftRadius: c === coinsBet ? 4 : 0,
                borderTopRightRadius: c === coinsBet ? 4 : 0
              }}>{c} coin{c === 1 ? '' : 's'}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PAYTABLE_ORDER.map(key => {
            const row = VP_HAND.PAYTABLE[key];
            const isActive = winningKey === key;
            return (
              <tr key={key} style={{
                borderBottom:'1px solid rgba(201,162,106,.08)',
                background: isActive ? 'rgba(230,197,144,.18)' : 'transparent',
                transition:'background .3s'
              }}>
                <td style={{
                  padding:'4px 12px',
                  fontFamily:"'Playfair Display', serif",
                  fontStyle:'italic',
                  fontSize:14, color: isActive ? 'var(--brass-2)' : 'var(--ivory)',
                  fontWeight: isActive ? 700 : 500
                }}>{row.name}</td>
                {[0,1,2,3,4].map(i => (
                  <td key={i} style={{
                    textAlign:'center', padding:'4px 0',
                    fontFamily:"'JetBrains Mono', monospace",
                    fontSize:13,
                    color: i + 1 === coinsBet ? 'var(--brass-2)' : 'var(--ivory)',
                    fontWeight: i + 1 === coinsBet ? 700 : 500,
                    background: i + 1 === coinsBet ? 'rgba(230,197,144,.08)' : 'transparent'
                  }}>{row.pay[i]}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ResultBanner({ name, payout }) {
  if (!name) return null;
  const isWin = payout > 0;
  return (
    <div className="banner-in" style={{
      position:'absolute', top: 64, left:'50%', transform:'translateX(-50%)',
      padding:'12px 28px',
      borderRadius:8,
      background: isWin
        ? 'linear-gradient(180deg, rgba(230,197,144,.95), rgba(201,162,106,.95))'
        : 'linear-gradient(180deg, rgba(80,30,30,.9), rgba(60,20,20,.9))',
      color: isWin ? '#1a1208' : '#f4ecd8',
      fontFamily:"'Playfair Display', serif",
      fontSize:18, fontStyle:'italic', fontWeight:700,
      letterSpacing:'.18em', textTransform:'uppercase',
      boxShadow:'0 14px 32px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.3)',
      zIndex:8, whiteSpace:'nowrap'
    }}>
      {name}{isWin ? ` +${payout}` : ''}
    </div>
  );
}

function HintPanel({ rec }) {
  if (!rec || !rec.action) return null;
  const riskColor = rec.riskClass === 'risk-good' ? '#9eddb8'
    : rec.riskClass === 'risk-bad' ? '#ff9286' : 'var(--brass-2)';
  return (
    <div style={{
      position:'absolute', top:14, right:22,
      maxWidth:300,
      padding:'12px 14px',
      background:'linear-gradient(180deg, rgba(20,12,6,.92), rgba(10,6,3,.95))',
      border:'1px solid rgba(201,162,106,.45)',
      borderRadius:10,
      boxShadow:'0 8px 22px rgba(0,0,0,.5), inset 0 1px 0 rgba(230,197,144,.15)',
      zIndex:6
    }}>
      <div style={{ fontSize:9, letterSpacing:'.28em', color:'var(--ivory-dim)', textTransform:'uppercase', fontWeight:600, marginBottom:4 }}>
        Basic strategy says
      </div>
      <div style={{
        fontFamily:"'Playfair Display', serif",
        fontStyle:'italic',
        fontSize:16, color:'var(--brass-2)',
        marginBottom:6
      }}>{rec.action}</div>
      <div style={{ fontSize:11, color:'var(--ivory-dim)', lineHeight:1.45, marginBottom:6 }}>
        {rec.explanation}
      </div>
      {rec.riskLabel && (
        <div style={{
          display:'inline-block',
          padding:'2px 8px',
          fontSize:9, letterSpacing:'.16em', textTransform:'uppercase', fontWeight:700,
          color: riskColor,
          border:`1px solid ${riskColor}40`,
          background:`${riskColor}15`,
          borderRadius:999
        }}>{rec.riskLabel}</div>
      )}
    </div>
  );
}

function CoinSelector({ coins, onChange, onBetMax, disabled }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
      <div style={{ fontSize:9, letterSpacing:'.28em', color:'var(--ivory-dim)', textTransform:'uppercase', fontWeight:600, marginRight:6 }}>
        Coins
      </div>
      {[1,2,3,4,5].map(n => (
        <button
          key={n}
          disabled={disabled}
          onClick={() => onChange(n)}
          style={{
            width:38, height:38, borderRadius:'50%',
            background: coins === n ? 'linear-gradient(180deg, #e6c590, #c9a26a)' : 'rgba(20,12,6,.6)',
            color: coins === n ? '#1a1208' : 'var(--brass-2)',
            border:'1px solid rgba(201,162,106,.5)',
            fontFamily:"'JetBrains Mono', monospace",
            fontSize:13, fontWeight:700,
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
            boxShadow: coins === n ? '0 4px 12px rgba(230,197,144,.4)' : 'none',
            transition:'all .2s'
          }}>{n}</button>
      ))}
      <button
        disabled={disabled}
        onClick={onBetMax}
        style={{
          marginLeft:8, padding:'10px 16px',
          background:'rgba(20,12,6,.6)',
          color:'var(--brass-2)',
          border:'1px solid rgba(201,162,106,.5)',
          borderRadius:8,
          fontSize:10, fontWeight:700, letterSpacing:'.18em', textTransform:'uppercase',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1
        }}>Bet Max</button>
    </div>
  );
}

function DealDrawButton({ phase, canDeal, onClick }) {
  const label = phase === 'holding' ? 'Draw' : 'Deal';
  const enabled = (phase === 'betting' && canDeal) || phase === 'holding';
  return (
    <button
      disabled={!enabled}
      onClick={onClick}
      style={{
        padding:'14px 38px',
        background: enabled
          ? 'linear-gradient(180deg, #e6c590, #c9a26a)'
          : 'rgba(20,12,6,.5)',
        color: enabled ? '#1a1208' : 'var(--ivory-dim)',
        border:'1px solid rgba(201,162,106,.6)',
        borderRadius:10,
        fontFamily:"'Playfair Display', serif",
        fontSize:18, fontStyle:'italic', fontWeight:700,
        letterSpacing:'.16em', textTransform:'uppercase',
        cursor: enabled ? 'pointer' : 'not-allowed',
        boxShadow: enabled
          ? '0 14px 28px rgba(230,197,144,.45), inset 0 1px 0 rgba(255,255,255,.5)'
          : 'none',
        transition:'all .2s'
      }}>
      {label} →
    </button>
  );
}

Object.assign(window, { FeltBackdrop, BrassRail, Paytable, ResultBanner, HintPanel, CoinSelector, DealDrawButton });
