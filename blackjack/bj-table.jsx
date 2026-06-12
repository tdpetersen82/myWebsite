/* eslint-disable */
// Table — felt, hands, betting circle, chip rack, action buttons, coach bar

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
  const color = isBust ? 'var(--lose-deep)' : isBJ ? 'var(--gold-hi)' : 'var(--ivory)';
  const showBoth = soft && !isBJ && !isBust;
  const low = showBoth ? value - 10 : null;
  return (
    <div style={{
      display:'inline-flex', alignItems:'baseline', gap: 10,
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
        {isBJ ? 'BJ' : showBoth ? `${low} / ${value}` : value}
      </span>
      {isBust && <span style={{ fontSize: 10, fontWeight: 700, color:'var(--lose-deep)', letterSpacing:'.2em' }}>BUST</span>}
    </div>
  );
}

function ActionButton({ label, onClick, hint, disabled, sub, disabledReason, onBlocked, ghost, kbd, compact }) {
  const isHint = hint && !disabled;
  function handleClick() {
    if (disabled) { if (onBlocked && disabledReason) onBlocked(disabledReason); return; }
    onClick();
  }
  const baseShadow = isHint
    ? '0 8px 24px rgba(230,197,144,.4), inset 0 1px 0 rgba(255,255,255,.4)'
    : ghost ? 'none' : '0 6px 14px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.06)';
  return (
    <button
      onClick={handleClick}
      aria-disabled={disabled || undefined}
      title={disabled && disabledReason ? disabledReason : (kbd && !compact ? `Keyboard: ${kbd}` : undefined)}
      style={{
        position:'relative',
        padding: compact ? '10px 12px' : '13px 20px',
        minWidth: compact ? 78 : 108,
        background: disabled
          ? 'rgba(20,12,6,.45)'
          : isHint
            ? 'linear-gradient(180deg, #f5d896, #c9a26a)'
            : ghost
              ? 'rgba(10,6,3,.35)'
              : 'linear-gradient(180deg, rgba(40,28,18,.95), rgba(20,12,6,.95))',
        color: disabled ? 'rgba(255,255,255,.32)' : isHint ? '#1a1208' : ghost ? 'var(--ivory-dim)' : 'var(--ivory)',
        border: isHint
          ? '1px solid rgba(230,197,144,.9)'
          : ghost
            ? '1px dashed rgba(201,162,106,.4)'
            : '1px solid rgba(201,162,106,.35)',
        borderRadius: 12,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? .5 : 1,
        filter: disabled ? 'saturate(.4)' : 'none',
        transition: 'all .18s ease',
        boxShadow: disabled ? 'none' : baseShadow,
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
        e.currentTarget.style.boxShadow = disabled ? 'none' : baseShadow;
      }}
    >
      {isHint && (
        <span style={{
          position:'absolute', top: -9, right: 10,
          fontSize: 10, padding:'2px 7px',
          background:'#1a1208', color:'#e6c590',
          borderRadius: 6, letterSpacing:'.14em', fontWeight: 600,
          border:'1px solid rgba(230,197,144,.5)'
        }}>COACH</span>
      )}
      <div style={{ fontFamily:"'Playfair Display', serif", fontStyle:'italic', fontSize: compact ? 15 : 18, letterSpacing:'.04em', fontWeight:600 }}>{label}</div>
      {sub && <div style={{ fontSize: compact ? 9 : 10, opacity:.75, marginTop: 2, letterSpacing:'.14em', textTransform:'uppercase', fontVariantNumeric:'tabular-nums' }}>{sub}</div>}
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
        fontSize: 9, letterSpacing:'.32em',
        color:'var(--brass)',
        marginTop: 4
      }}>BLACKJACK · 3:2 · S17</div>
    </div>
  );
}

// ─── Coach bar ──────────────────────────────────────────
// Docked above the action buttons (never floats over cards). Reads as:
// verdict → one-sentence why → odds bars in plain "out of 100 hands" terms.

function OutcomeBar({ bar }) {
  return (
    <div
      title={`${bar.label}: wins ${bar.win}, pushes ${bar.push}, loses ${bar.lose} of 100 hands`}
      style={{ display:'flex', alignItems:'center', gap: 8 }}
    >
      <span style={{
        width: 62, flexShrink: 0, textAlign:'right',
        fontSize: 9, letterSpacing:'.12em', textTransform:'uppercase', fontWeight: 700,
        color: bar.primary ? 'var(--brass-2)' : 'var(--ivory-dim)'
      }}>{bar.label}</span>
      <div style={{
        flex: 1, height: 12, borderRadius: 6, overflow:'hidden', display:'flex',
        opacity: bar.primary ? 1 : .55,
        boxShadow: bar.primary ? '0 0 0 1px rgba(230,197,144,.55)' : '0 0 0 1px rgba(255,255,255,.1)'
      }}>
        {bar.win > 0 && <div style={{ width:`${bar.win}%`, background:'var(--win)' }} />}
        {bar.push > 0 && <div style={{ width:`${bar.push}%`, background:'var(--push)' }} />}
        {bar.lose > 0 && <div style={{ width:`${bar.lose}%`, background:'var(--lose)' }} />}
      </div>
      <span style={{
        width: 76, flexShrink: 0,
        fontFamily:"'JetBrains Mono', monospace", fontSize: 10,
        fontVariantNumeric:'tabular-nums',
        color: bar.primary ? 'var(--ivory)' : 'var(--ivory-dim)'
      }}>{bar.win} win · {bar.lose} lose</span>
    </div>
  );
}

function InsuranceMeter({ pBJ, breakEven }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap: 5, justifyContent:'center' }}>
      <div style={{ fontSize: 8.5, letterSpacing:'.2em', color:'var(--brass)', textTransform:'uppercase', textAlign:'right' }}>
        Aces hiding a ten · out of 100
      </div>
      <div style={{ position:'relative', height: 14, borderRadius: 7, overflow:'visible',
        background:'rgba(0,0,0,.4)', boxShadow:'0 0 0 1px rgba(255,255,255,.12)' }}>
        <div style={{ position:'absolute', left: 0, top: 0, bottom: 0, width:`${pBJ}%`, background:'var(--lose)', borderRadius:'7px 0 0 7px' }} />
        <div style={{ position:'absolute', left:`${breakEven}%`, top: -3, bottom: -3, width: 2, background:'var(--brass-2)', boxShadow:'0 0 6px rgba(230,197,144,.8)' }} />
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', fontFamily:"'JetBrains Mono', monospace", fontSize: 9.5, color:'var(--ivory-dim)' }}>
        <span style={{ color:'var(--lose)' }}>{pBJ} have it</span>
        <span style={{ color:'var(--brass-2)' }}>{breakEven} = break-even</span>
      </div>
    </div>
  );
}

function CoachBar({ hint, compact }) {
  if (!hint) return null;
  const kicker =
    hint.kind === 'insurance' ? 'Side bet offered' :
    hint.kind === 'bet' ? 'Before you bet' :
    'Coach says';

  const verdictBlock = (
    <div style={{ flexShrink: 0, minWidth: compact ? 0 : 150, alignSelf:'center' }}>
      <div style={{
        fontSize: 9, letterSpacing:'.24em', color:'var(--brass)', textTransform:'uppercase',
        display:'flex', alignItems:'center', gap: 6, marginBottom: 2
      }}>
        <span style={{ width: 6, height: 6, borderRadius:'50%', background:'#e6c590', flexShrink: 0 }} />
        {kicker}
      </div>
      <div style={{
        fontFamily:"'Playfair Display', serif", fontStyle:'italic',
        fontSize: compact ? 19 : 23, fontWeight: 600, color:'var(--ivory)', lineHeight: 1.1
      }}>{hint.action}</div>
      {hint.textbookNote && (
        <div style={{
          fontSize: 10.5, fontStyle:'italic', color:'var(--brass-2)', opacity:.9, marginTop: 3, maxWidth: 220, lineHeight: 1.35
        }}>{hint.textbookNote}</div>
      )}
    </div>
  );

  const whyBlock = (
    <div style={{
      flex: 1, alignSelf:'center', minWidth: 0,
      fontSize: compact ? 11.5 : 12.5, lineHeight: 1.45, color:'var(--ivory-dim)'
    }}>{hint.why}</div>
  );

  let evidenceBlock = null;
  if (hint.kind === 'insurance' && hint.insurance) {
    evidenceBlock = (
      <div style={{ width: compact ? '100%' : 280, flexShrink: 0, alignSelf:'center' }}>
        <InsuranceMeter pBJ={hint.insurance.pBJ} breakEven={hint.insurance.breakEven} />
      </div>
    );
  } else if (hint.bars && hint.bars.length > 0) {
    evidenceBlock = (
      <div style={{ width: compact ? '100%' : 330, flexShrink: 0, display:'flex', flexDirection:'column', gap: 5, justifyContent:'center' }}>
        <div style={{ fontSize: 8.5, letterSpacing:'.2em', color:'var(--brass)', textTransform:'uppercase', textAlign:'right' }}>
          Out of 100 hands like this
        </div>
        {hint.bars.map(b => <OutcomeBar key={b.label} bar={b} />)}
        {(hint.chip || hint.moneyLine) && (
          <div style={{ display:'flex', justifyContent:'flex-end', gap: 8, alignItems:'center', flexWrap:'wrap' }}>
            {hint.chip && (
              <span style={{
                padding:'2px 10px', borderRadius: 999,
                background:'rgba(230,197,144,.12)', border:'1px solid rgba(230,197,144,.3)',
                fontSize: 10, color:'var(--brass-2)', fontWeight: 600, letterSpacing:'.04em'
              }}>{hint.chip}</span>
            )}
            {hint.moneyLine && <span style={{ fontSize: 10.5, color:'var(--ivory-dim)' }}>{hint.moneyLine}</span>}
          </div>
        )}
      </div>
    );
  } else if (hint.stats && hint.stats.length > 0) {
    evidenceBlock = (
      <div style={{ display:'flex', flexShrink: 0, alignSelf:'center' }}>
        {hint.stats.map((s, i) => (
          <div key={s.label} style={{
            padding:'2px 16px', textAlign:'center',
            borderLeft: i > 0 ? '1px solid rgba(230,197,144,.14)' : 'none'
          }}>
            <div style={{ fontSize: 8.5, letterSpacing:'.16em', color:'var(--brass)', textTransform:'uppercase' }}>{s.label}</div>
            <div style={{ fontFamily:"'JetBrains Mono', monospace", fontSize: 15, color:'var(--ivory)', marginTop: 2, fontVariantNumeric:'tabular-nums' }}>{s.value}</div>
          </div>
        ))}
      </div>
    );
  }

  // Hi-lo shoe count — verdict first (bets follow the true count, plays stay
  // on the chart), then the tally with its conversion shown, then the why.
  let countBlock = null;
  if (hint.count) {
    const c = hint.count;
    const tc = c.trueCount;
    const fmt = (n, d = 0) => (n > 0 ? '+' : '') + n.toFixed(d);
    const edgeTxt = c.edge >= 0 ? `you +${c.edge.toFixed(1)}%` : `house ${Math.abs(c.edge).toFixed(1)}%`;
    const read = tc >= 2 ? {
      word: 'PRESS YOUR BETS', color: 'var(--win)',
      meaning: hint.kind === 'bet'
        ? `${edgeTxt} — the big bet is the play`
        : `${edgeTxt} — chart as usual, press the next bet`
    } : tc <= -1 ? {
      word: 'BET THE FLOOR', color: 'var(--lose)',
      meaning: `${edgeTxt} — minimum bets until the shuffle`
    } : {
      word: 'FLAT BET', color: 'var(--ivory-dim)',
      meaning: `${edgeTxt} — play the chart, keep bets steady`
    };
    countBlock = (
      <div
        title={'Hi-lo: your running tally counts every card seen this shoe (2-6 = +1, 7-9 = 0, tens & aces = -1). Raw it means little — divide by the decks still to come to get the TRUE count, the density of what’s left. Each +1 true is worth about +0.5% to you. Bets follow the true count; playing decisions stay on the chart.'}
        style={{ flexShrink: 0, alignSelf:'center', textAlign: compact ? 'left' : 'right',
          display:'flex', flexDirection:'column', gap: 3, cursor:'help' }}
      >
        <div style={{ fontSize: 8.5, letterSpacing:'.2em', color:'var(--brass)', textTransform:'uppercase' }}>
          Shoe count · <span style={{ color: read.color, fontWeight: 700 }}>{read.word}</span>
        </div>
        <div style={{ fontFamily:"'JetBrains Mono', monospace", fontSize: 11.5, color:'var(--ivory)', fontVariantNumeric:'tabular-nums' }}>
          running {fmt(c.running)} ÷ {c.decksLeft.toFixed(1)} decks = true {fmt(tc, 1)}
        </div>
        <div style={{ fontFamily:"'JetBrains Mono', monospace", fontSize: 9.5, color:'var(--ivory-dim)', fontVariantNumeric:'tabular-nums' }}>
          {read.meaning}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display:'flex',
      flexDirection: compact ? 'column' : 'row',
      gap: compact ? 8 : 18,
      padding: compact ? '10px 14px' : '10px 18px',
      background:'linear-gradient(180deg, rgba(20,12,6,.92), rgba(10,6,3,.92))',
      border:'1px solid rgba(230,197,144,.35)',
      borderRadius: 12,
      boxShadow:'0 12px 26px rgba(0,0,0,.45), inset 0 1px 0 rgba(230,197,144,.1)',
      minHeight: compact ? 0 : 76
    }}>
      {verdictBlock}
      {!compact && <div style={{ width: 1, alignSelf:'stretch', background:'rgba(201,162,106,.2)', flexShrink: 0 }} />}
      {whyBlock}
      {evidenceBlock}
      {countBlock && !compact && <div style={{ width: 1, alignSelf:'stretch', background:'rgba(201,162,106,.2)', flexShrink: 0 }} />}
      {countBlock}
    </div>
  );
}

function ResultBanner({ kind, payout, netLoss }) {
  if (!kind) return null;
  const fmt = n => (Number(n) || 0).toLocaleString();
  const map = {
    blackjack: { title: 'BLACKJACK', sub: `Paid 3:2 — you won $${fmt(payout)}`, color:'var(--gold-hi)', glow:'#ffd97a' },
    win:       { title: 'YOU WIN',   sub: `+$${fmt(payout)}`, color:'var(--win)', glow:'#9eddb8' },
    push:      { title: 'PUSH',      sub: 'Bet returned', color:'#e6c590', glow:'#c9a26a' },
    lose:      { title: 'DEALER WINS', sub: `-$${fmt(payout)}`, color:'var(--lose)', glow:'#c0392b' },
    bust:      { title: 'BUST',      sub: `-$${fmt(payout)}`, color:'var(--lose)', glow:'#c0392b' },
    surrender: { title: 'SURRENDER', sub: `Half back · -$${fmt(netLoss != null ? netLoss : payout)}`, color:'#e6c590', glow:'#c9a26a' },
  };
  const m = map[kind];
  return (
    <div className="banner-in" style={{
      position:'absolute',
      top:'44%',
      left:'50%', transform:'translate(-50%,-50%)',
      padding:'16px 38px',
      background:'linear-gradient(180deg, rgba(15,10,5,.94), rgba(8,4,2,.94))',
      border: `1px solid ${m.glow}`,
      outline:'1px solid rgba(230,197,144,.25)',
      outlineOffset: 3,
      borderRadius: 10,
      textAlign:'center',
      boxShadow: `0 0 50px -10px ${m.glow}, 0 14px 30px rgba(0,0,0,.5)`,
      zIndex: 6
    }}>
      <div style={{
        fontFamily:"'Playfair Display', serif",
        fontSize: 30, fontWeight: 700, color: m.color,
        letterSpacing:'.18em', textIndent:'.18em'
      }}>{m.title}</div>
      <div style={{ fontSize: 11, letterSpacing:'.3em', color:'var(--ivory-dim)', marginTop: 3 }}>{m.sub}</div>
    </div>
  );
}

Object.assign(window, {
  Chip, ChipStack, HandValue, ActionButton,
  FeltBackdrop, FeltLogo, CoachBar, OutcomeBar, InsuranceMeter, ResultBanner, CHIP_DEFS
});
