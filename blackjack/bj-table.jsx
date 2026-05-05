/* eslint-disable */
// Table — felt, hands, betting circle, chip rack, action buttons, hint panel

const CHIP_DEFS = [
  { value: 5,    color: '#c0392b', edge: '#7a1f15', label: '$5'   },
  { value: 25,   color: '#2e7d4f', edge: '#194530', label: '$25'  },
  { value: 100,  color: '#1f3a6a', edge: '#0e1f3d', label: '$100' },
  { value: 500,  color: '#5b2a7a', edge: '#321444', label: '$500' },
  { value: 1000, color: '#1a1410', edge: '#000',    label: '$1K'  }
];

function Chip({ value, size = 64, onClick, disabled, raised, label }) {
  const def = CHIP_DEFS.find(c => c.value === value) || CHIP_DEFS[0];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        position:'relative',
        width: size, height: size,
        borderRadius:'50%',
        padding:0, border:'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? .35 : 1,
        background: 'transparent',
        transform: raised ? 'translateY(-6px)' : 'none',
        transition:'transform .18s ease',
        outline:'none'
      }}
      onMouseEnter={e => !disabled && (e.currentTarget.style.transform = 'translateY(-8px) scale(1.04)')}
      onMouseLeave={e => !disabled && (e.currentTarget.style.transform = raised ? 'translateY(-6px)' : 'none')}
    >
      <div className="chip-3d" style={{
        width:'100%', height:'100%', borderRadius:'50%',
        background: `radial-gradient(circle at 35% 30%, ${def.color}, ${def.edge} 75%)`,
        display:'flex', alignItems:'center', justifyContent:'center',
        position:'relative'
      }}>
        {/* edge dashes */}
        {Array.from({length:8}).map((_,i)=>(
          <div key={i} style={{
            position:'absolute', left:'50%', top:'50%',
            width: 4, height: size * 0.18,
            background:'rgba(255,255,255,.85)',
            transformOrigin:'center',
            transform:`translate(-50%,-50%) rotate(${i*45}deg) translateY(-${size*0.42}px)`,
            borderRadius: 2
          }} />
        ))}
        {/* inner ring */}
        <div style={{
          position:'absolute', inset: size*0.16,
          borderRadius:'50%',
          border:'1.5px dashed rgba(255,255,255,.55)',
          background: `radial-gradient(circle at 40% 35%, rgba(255,255,255,.18), transparent 60%), ${def.color}`,
          boxShadow:'inset 0 1px 0 rgba(255,255,255,.3), inset 0 -2px 0 rgba(0,0,0,.25)',
          display:'flex', alignItems:'center', justifyContent:'center',
          color:'#fff',
          fontFamily:"'Playfair Display', serif",
          fontWeight: 700,
          fontSize: size * 0.26,
          textShadow:'0 1px 2px rgba(0,0,0,.5)'
        }}>
          {label || def.label}
        </div>
      </div>
    </button>
  );
}

function ChipStack({ chips, onClear }) {
  // chips: array of values placed (e.g. [25, 25, 100])
  if (!chips.length) return null;
  return (
    <div style={{
      position:'relative', width: 64, height: 64 + chips.length * 4,
      display:'flex', flexDirection:'column-reverse', alignItems:'center'
    }}>
      {chips.map((v, i) => (
        <div key={i} className="chip-place" style={{
          position:'absolute',
          bottom: i * 4,
          animationDelay: `${i * 0.04}s`
        }}>
          <Chip value={v} size={64} disabled />
        </div>
      ))}
    </div>
  );
}

function HandValue({ value, soft, isBust, isBJ, label }) {
  const color = isBust ? '#ff6b5a' : isBJ ? '#ffd97a' : '#fff';
  return (
    <div style={{
      display:'inline-flex', alignItems:'center', gap: 10,
      padding:'4px 14px',
      background:'rgba(0,0,0,.45)',
      backdropFilter:'blur(6px)',
      borderRadius: 999,
      border:`1px solid ${isBJ ? 'rgba(255,217,122,.6)' : 'rgba(255,255,255,.15)'}`,
      boxShadow: isBJ ? '0 0 20px rgba(255,217,122,.35)' : 'none'
    }}>
      <span style={{
        fontSize: 10, letterSpacing:'.2em', color:'var(--ivory-dim)',
        textTransform:'uppercase', fontWeight: 600
      }}>{label}</span>
      <span style={{
        fontFamily:"'Playfair Display', serif",
        fontSize: 22, fontWeight: 700, color, lineHeight: 1
      }}>
        {isBJ ? 'BJ' : value}{soft && !isBJ && !isBust ? <span style={{ fontSize: 13, opacity:.7, fontWeight:500 }}>&nbsp;soft</span> : null}
      </span>
      {isBust && <span style={{ fontSize: 10, fontWeight: 700, color:'#ff6b5a', letterSpacing:'.2em' }}>BUST</span>}
    </div>
  );
}

function ActionButton({ label, onClick, hint, disabled, accent, sub }) {
  const isHint = hint;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        position:'relative',
        padding:'14px 22px',
        minWidth: 110,
        background: disabled
          ? 'rgba(20,12,6,.45)'
          : isHint
            ? 'linear-gradient(180deg, #f5d896, #c9a26a)'
            : 'linear-gradient(180deg, rgba(40,28,18,.95), rgba(20,12,6,.95))',
        color: disabled ? 'rgba(255,255,255,.3)' : isHint ? '#1a1208' : 'var(--ivory)',
        border: `1px solid ${isHint ? 'rgba(230,197,144,.9)' : 'rgba(201,162,106,.35)'}`,
        borderRadius: 12,
        fontSize: 13,
        fontWeight: 600,
        letterSpacing:'.16em',
        textTransform:'uppercase',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all .18s ease',
        boxShadow: isHint
          ? '0 8px 24px rgba(230,197,144,.4), inset 0 1px 0 rgba(255,255,255,.4)'
          : '0 6px 14px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.06)',
        fontFamily:'inherit'
      }}
      onMouseEnter={e => {
        if (disabled) return;
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = isHint
          ? '0 12px 30px rgba(230,197,144,.55), inset 0 1px 0 rgba(255,255,255,.4)'
          : '0 10px 20px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.1)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = isHint
          ? '0 8px 24px rgba(230,197,144,.4), inset 0 1px 0 rgba(255,255,255,.4)'
          : '0 6px 14px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.06)';
      }}
    >
      {isHint && (
        <span style={{
          position:'absolute', top: -8, right: 10,
          fontSize: 9, padding:'2px 6px',
          background:'#1a1208', color:'#e6c590',
          borderRadius: 4, letterSpacing:'.18em',
          border:'1px solid rgba(230,197,144,.5)'
        }}>HINT</span>
      )}
      <div style={{ fontFamily:"'Playfair Display', serif", fontStyle:'italic', fontSize: 18, letterSpacing:'.04em', textTransform:'none', fontWeight:600 }}>{label}</div>
      {sub && <div style={{ fontSize: 9, opacity:.7, marginTop: 2, letterSpacing:'.2em' }}>{sub}</div>}
    </button>
  );
}

// Decorative full-width felt background with brass arc
function FeltBackdrop() {
  return (
    <div style={{
      position:'absolute', inset:0, borderRadius: 18, overflow:'hidden',
      background: `
        radial-gradient(ellipse 110% 75% at 50% 38%, #1a5040 0%, #0e3a2e 45%, #0a2a21 80%),
        #0a2a21
      `,
      boxShadow:'var(--shadow-deep), inset 0 0 0 1px rgba(201,162,106,.18), inset 0 0 80px rgba(0,0,0,.5)'
    }}>
      {/* felt texture */}
      <div style={{
        position:'absolute', inset: 0,
        backgroundImage: 'url(assets/table/felt.png)',
        backgroundSize: 'cover',
        opacity: .25,
        mixBlendMode: 'overlay'
      }} />
      {/* subtle noise */}
      <svg style={{position:'absolute', inset:0, width:'100%', height:'100%', opacity:.5}}>
        <filter id="n">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/>
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .12 0"/>
        </filter>
        <rect width="100%" height="100%" filter="url(#n)"/>
      </svg>
      {/* brass border arcs */}
      <svg style={{ position:'absolute', inset: 0, width:'100%', height:'100%', pointerEvents:'none' }} viewBox="0 0 1000 700" preserveAspectRatio="none">
        <defs>
          <linearGradient id="arc" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#e6c590" stopOpacity=".75"/>
            <stop offset="100%" stopColor="#8c6a3f" stopOpacity=".55"/>
          </linearGradient>
        </defs>
        <ellipse cx="500" cy="-200" rx="700" ry="850" fill="none" stroke="url(#arc)" strokeWidth="1.5"/>
        <ellipse cx="500" cy="-200" rx="710" ry="860" fill="none" stroke="rgba(0,0,0,.5)" strokeWidth=".5"/>
      </svg>
    </div>
  );
}

function FeltLogo() {
  // Bottom-right crest, subtle, out of card-deal zone
  return (
    <div style={{
      position:'absolute', right: 22, bottom: 18,
      pointerEvents:'none',
      textAlign:'right',
      opacity:.42
    }}>
      <div style={{
        fontFamily:"'Playfair Display', serif",
        fontSize: 14, letterSpacing:'.18em',
        color:'var(--brass-2)',
        fontStyle:'italic',
        fontWeight: 600,
        lineHeight: 1
      }}>Limestone</div>
      <div style={{
        fontSize: 8, letterSpacing:'.4em',
        color:'var(--brass)',
        marginTop: 4
      }}>BLACKJACK · 3:2 · S17</div>
    </div>
  );
}

function HintPanel({ hint }) {
  if (!hint) return null;
  return (
    <div style={{
      position:'absolute', right: 14, top: 14,
      width: 220,
      padding:'12px 14px',
      background:'linear-gradient(180deg, rgba(20,12,6,.95), rgba(10,6,3,.95))',
      borderRadius: 10,
      border:'1px solid rgba(230,197,144,.4)',
      boxShadow:'0 14px 28px rgba(0,0,0,.5)',
      backdropFilter:'blur(8px)',
      zIndex: 5
    }}>
      <div style={{
        fontSize: 9, letterSpacing:'.24em', color:'var(--brass)', textTransform:'uppercase',
        marginBottom: 4, display:'flex', alignItems:'center', gap: 6
      }}>
        <span style={{ width: 6, height: 6, borderRadius:'50%', background:'#e6c590' }} />
        Basic strategy says
      </div>
      <div style={{
        fontFamily:"'Playfair Display', serif",
        fontStyle:'italic',
        fontSize: 22, fontWeight: 600, color:'#fff',
        marginBottom: 6
      }}>{hint.action}</div>
      <div style={{ fontSize: 11, color:'var(--ivory-dim)', lineHeight: 1.4 }}>
        {hint.explanation}
      </div>
    </div>
  );
}

function ResultBanner({ kind, payout }) {
  if (!kind) return null;
  const map = {
    blackjack: { title: 'BLACKJACK', sub: `You won $${payout}`, color:'#ffd97a', glow:'#ffd97a' },
    win:       { title: 'YOU WIN',   sub: `+$${payout}`, color:'#9eddb8', glow:'#9eddb8' },
    push:      { title: 'PUSH',      sub: 'Bet returned', color:'#e6c590', glow:'#c9a26a' },
    lose:      { title: 'DEALER WINS', sub: `-$${payout}`, color:'#f29a8c', glow:'#c0392b' },
    bust:      { title: 'BUST',      sub: `-$${payout}`, color:'#f29a8c', glow:'#c0392b' },
  };
  const m = map[kind];
  return (
    <div className="banner-in" style={{
      position:'absolute',
      top: 110,
      left:'50%', transform:'translateX(-50%)',
      padding:'16px 38px',
      background:'linear-gradient(180deg, rgba(15,10,5,.92), rgba(8,4,2,.92))',
      border: `1px solid ${m.glow}`,
      borderRadius: 6,
      textAlign:'center',
      boxShadow: `0 0 50px -10px ${m.glow}, 0 14px 30px rgba(0,0,0,.5)`,
      zIndex: 6
    }}>
      <div style={{
        fontFamily:"'Playfair Display', serif",
        fontSize: 32, fontWeight: 700, color: m.color,
        letterSpacing:'.18em', fontStyle:'italic'
      }}>{m.title}</div>
      <div style={{ fontSize: 11, letterSpacing:'.3em', color:'var(--ivory-dim)', marginTop: 2 }}>{m.sub}</div>
    </div>
  );
}

Object.assign(window, {
  Chip, ChipStack, HandValue, ActionButton,
  FeltBackdrop, FeltLogo, HintPanel, ResultBanner, CHIP_DEFS
});
