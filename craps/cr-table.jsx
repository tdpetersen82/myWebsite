/* eslint-disable */
// Visual primitives for the craps felt — chips, dice, place cells, bet zones,
// brass rail, hint panel, result banner.

const { useState, useEffect, useRef } = React;

const CHIP_DEFS = window.CR_RULES.CHIP_DEFS;

// ── Chip ────────────────────────────────────────────────────────────────────
function Chip({ value, size = 64, onClick, disabled, raised, label }) {
  const def = CHIP_DEFS.find(c => c.value === value) || CHIP_DEFS[0];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        position: 'relative',
        width: size, height: size,
        borderRadius: '50%',
        padding: 0, border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.35 : 1,
        background: 'transparent',
        transform: raised ? 'translateY(-6px)' : 'none',
        transition: 'transform .18s ease',
        outline: 'none'
      }}
      onMouseEnter={e => !disabled && (e.currentTarget.style.transform = 'translateY(-8px) scale(1.04)')}
      onMouseLeave={e => !disabled && (e.currentTarget.style.transform = raised ? 'translateY(-6px)' : 'none')}
    >
      <div className="chip-3d" style={{
        width: '100%', height: '100%', borderRadius: '50%',
        background: `radial-gradient(circle at 35% 30%, ${def.color}, ${def.edge} 75%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative'
      }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{
            position: 'absolute', left: '50%', top: '50%',
            width: 4, height: size * 0.18,
            background: 'rgba(255,255,255,.85)',
            transformOrigin: 'center',
            transform: `translate(-50%,-50%) rotate(${i * 45}deg) translateY(-${size * 0.42}px)`,
            borderRadius: 2
          }} />
        ))}
        <div style={{
          position: 'absolute', inset: size * 0.16,
          borderRadius: '50%',
          border: '1.5px dashed rgba(255,255,255,.55)',
          background: `radial-gradient(circle at 40% 35%, rgba(255,255,255,.18), transparent 60%), ${def.color}`,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.3), inset 0 -2px 0 rgba(0,0,0,.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff',
          fontFamily: "'Playfair Display', serif",
          fontWeight: 700,
          fontSize: size * 0.26,
          textShadow: '0 1px 2px rgba(0,0,0,.5)'
        }}>
          {label || def.label}
        </div>
      </div>
    </button>
  );
}

// Compact stake indicator shown inside bet zones.
function ChipBadge({ amount, size = 28, label }) {
  if (!amount) return null;
  // Pick the largest chip that fits; e.g., $250 → $100; $5 → $5.
  let def = CHIP_DEFS[0];
  for (const c of CHIP_DEFS) if (amount >= c.value) def = c;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 10px 3px 4px',
      background: 'rgba(8,4,2,.85)',
      border: '1px solid rgba(201,162,106,.5)',
      borderRadius: 999,
      boxShadow: '0 4px 10px rgba(0,0,0,.4)'
    }}>
      <div style={{
        width: size, height: size,
        borderRadius: '50%',
        background: `radial-gradient(circle at 35% 30%, ${def.color}, ${def.edge} 75%)`,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,.25), 0 1px 2px rgba(0,0,0,.4)',
        border: '1.5px dashed rgba(255,255,255,.55)'
      }} />
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 12, fontWeight: 700, color: '#f5d896',
        letterSpacing: '.04em'
      }}>{label != null ? label : '$' + amount}</span>
    </div>
  );
}

// ── Die / DiceTray ──────────────────────────────────────────────────────────
const PIPS = {
  1: [[50, 50]],
  2: [[27, 27], [73, 73]],
  3: [[27, 27], [50, 50], [73, 73]],
  4: [[27, 27], [73, 27], [27, 73], [73, 73]],
  5: [[27, 27], [73, 27], [50, 50], [27, 73], [73, 73]],
  6: [[27, 25], [73, 25], [27, 50], [73, 50], [27, 75], [73, 75]]
};

function Die({ value, rolling }) {
  const [face, setFace] = useState(value);
  useEffect(() => {
    if (rolling) {
      const id = setInterval(() => setFace(1 + Math.floor(Math.random() * 6)), 60);
      return () => clearInterval(id);
    }
    setFace(value);
  }, [rolling, value]);

  return (
    <div className={rolling ? 'die-rolling' : 'die-landed'} style={{
      width: 72, height: 72, borderRadius: 12,
      background: 'linear-gradient(180deg, #fffaf0, #ece1c8)',
      boxShadow: 'inset 0 -3px 0 rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.6), 0 8px 18px rgba(0,0,0,.5)',
      position: 'relative'
    }}>
      {PIPS[face].map(([x, y], i) => (
        <div key={i} style={{
          position: 'absolute', left: `${x}%`, top: `${y}%`,
          width: 12, height: 12, borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 30%, #4a3826, #1a1208 80%)',
          transform: 'translate(-50%,-50%)',
          boxShadow: 'inset 0 1px 1px rgba(0,0,0,.5)'
        }} />
      ))}
    </div>
  );
}

function DiceTray({ dice, rolling }) {
  return (
    <div style={{
      display: 'inline-flex', gap: 14, padding: '20px 28px',
      background: 'radial-gradient(ellipse at 50% 30%, rgba(60,30,12,.4), rgba(8,4,2,.7))',
      borderRadius: 16,
      border: '1.5px solid rgba(201,162,106,.45)',
      boxShadow: 'inset 0 0 30px rgba(0,0,0,.6), 0 8px 18px rgba(0,0,0,.4)'
    }}>
      <Die value={dice.a} rolling={rolling} />
      <Die value={dice.b} rolling={rolling} />
    </div>
  );
}

// ── FeltBackdrop ────────────────────────────────────────────────────────────
function FeltBackdrop() {
  return (
    <div style={{
      position: 'absolute', inset: 0, borderRadius: 18, overflow: 'hidden',
      background: `
        radial-gradient(ellipse 110% 75% at 50% 38%, #1a5040 0%, #0e3a2e 45%, #0a2a21 80%),
        #0a2a21
      `,
      boxShadow: 'var(--shadow-deep), inset 0 0 0 1px rgba(201,162,106,.18), inset 0 0 80px rgba(0,0,0,.5)'
    }}>
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.5 }}>
        <filter id="cr-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .12 0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#cr-noise)" />
      </svg>
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} viewBox="0 0 1000 700" preserveAspectRatio="none">
        <defs>
          <linearGradient id="cr-arc" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#e6c590" stopOpacity=".75" />
            <stop offset="100%" stopColor="#8c6a3f" stopOpacity=".55" />
          </linearGradient>
        </defs>
        <ellipse cx="500" cy="-200" rx="700" ry="850" fill="none" stroke="url(#cr-arc)" strokeWidth="1.5" />
        <ellipse cx="500" cy="-200" rx="710" ry="860" fill="none" stroke="rgba(0,0,0,.5)" strokeWidth=".5" />
      </svg>
    </div>
  );
}

function FeltLogo() {
  return (
    <div style={{
      position: 'absolute', right: 22, bottom: 18,
      pointerEvents: 'none',
      textAlign: 'right',
      opacity: 0.42
    }}>
      <div style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: 14, letterSpacing: '.18em',
        color: 'var(--brass-2)',
        fontStyle: 'italic',
        fontWeight: 600,
        lineHeight: 1
      }}>Limestone</div>
      <div style={{
        fontSize: 8, letterSpacing: '.4em',
        color: 'var(--brass)',
        marginTop: 4
      }}>CRAPS · 3× ODDS</div>
    </div>
  );
}

// ── BrassRail ───────────────────────────────────────────────────────────────
function BrassRail({ bankroll, streak, rolls, peak, showHints, onToggleHints, soundOn, onToggleSound }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'stretch',
      margin: '14px 22px 0',
      padding: '10px 18px',
      background: 'linear-gradient(180deg, rgba(35,22,10,.75), rgba(20,12,6,.85))',
      border: '1px solid rgba(201,162,106,.35)',
      borderRadius: 10,
      backdropFilter: 'blur(10px)',
      boxShadow: '0 8px 22px rgba(0,0,0,.4), inset 0 1px 0 rgba(230,197,144,.15)',
      gap: 0,
      zIndex: 5, position: 'relative'
    }}>
      <a
        href="../casino/"
        title="Back to casino"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          alignSelf: 'center',
          marginRight: 14,
          padding: '8px 14px',
          background: 'rgba(20,12,6,.6)',
          color: 'var(--brass-2)',
          border: '1px solid rgba(201,162,106,.5)',
          borderRadius: 999,
          fontSize: 10, fontWeight: 700, letterSpacing: '.18em',
          textTransform: 'uppercase',
          textDecoration: 'none',
          whiteSpace: 'nowrap',
          transition: 'all .2s',
          boxShadow: '0 2px 6px rgba(0,0,0,.3)'
        }}
      >← Lobby</a>

      <a
        href="../casino/"
        title="Back to casino"
        style={{
          display: 'flex', alignItems: 'center', gap: 12, paddingRight: 18,
          borderRight: '1px solid rgba(201,162,106,.2)',
          textDecoration: 'none', color: 'inherit'
        }}
      >
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 30%, #f5d896, #8c6a3f 75%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'Playfair Display', serif",
          color: '#1a1208', fontSize: 14, fontWeight: 800,
          fontStyle: 'italic',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.4), 0 2px 6px rgba(0,0,0,.4)'
        }}>L</div>
        <div>
          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 17, color: 'var(--brass-2)',
            fontStyle: 'italic', fontWeight: 600, letterSpacing: '.02em', lineHeight: 1
          }}>Limestone Games</div>
          <div style={{ fontSize: 9, letterSpacing: '.32em', color: 'var(--ivory-dim)', textTransform: 'uppercase', marginTop: 3 }}>
            Vegas Strip · Craps Pit
          </div>
        </div>
      </a>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0 }}>
        <RailStat label="Bankroll" value={`$${bankroll.toLocaleString()}`} accent />
        <RailStat label="Streak" value={streak > 0 ? `🔥 ×${streak}` : '—'} highlight={streak >= 3} />
        <RailStat label="Rolls" value={rolls || '—'} />
        <RailStat label="Peak" value={`$${peak.toLocaleString()}`} small />
        <button
          onClick={onToggleSound}
          title={soundOn ? 'Sound on' : 'Sound off'}
          style={{
            marginLeft: 10,
            padding: '8px 12px',
            background: soundOn ? 'linear-gradient(180deg, #e6c590, #c9a26a)' : 'rgba(20,12,6,.6)',
            color: soundOn ? '#1a1208' : 'var(--brass-2)',
            border: '1px solid rgba(201,162,106,.5)',
            borderRadius: 999,
            fontSize: 12, fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all .2s'
          }}
        >{soundOn ? '🔊' : '🔇'}</button>
        <button
          onClick={onToggleHints}
          title={showHints ? 'Hide strategy hints' : 'Show strategy hints'}
          style={{
            marginLeft: 8,
            padding: '8px 14px',
            background: showHints
              ? 'linear-gradient(180deg, #e6c590, #c9a26a)'
              : 'rgba(20,12,6,.6)',
            color: showHints ? '#1a1208' : 'var(--brass-2)',
            border: '1px solid rgba(201,162,106,.5)',
            borderRadius: 999,
            fontSize: 10, fontWeight: 700, letterSpacing: '.18em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all .2s',
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
      padding: '4px 18px',
      borderLeft: '1px solid rgba(201,162,106,.18)',
      textAlign: 'right',
      minWidth: small ? 80 : 100
    }}>
      <div style={{ fontSize: 8, letterSpacing: '.28em', color: 'var(--ivory-dim)', textTransform: 'uppercase', fontWeight: 600 }}>{label}</div>
      <div style={{
        fontFamily: accent ? "'Playfair Display', serif" : "'JetBrains Mono', monospace",
        fontSize: accent ? 22 : (small ? 13 : 15),
        color: highlight ? '#ffb347' : accent ? 'var(--brass-2)' : '#fff',
        fontWeight: accent ? 700 : 500,
        lineHeight: 1.1, marginTop: 2,
        fontStyle: accent ? 'italic' : 'normal'
      }}>{value}</div>
    </div>
  );
}

// ── BetZone (generic clickable rectangular area) ────────────────────────────
function BetZone({ id, label, sublabel, hint, amount, disabled, illegal, isPoint, onClick, onHoverChange, children, style, badgeAmount }) {
  const baseStyle = {
    position: 'relative',
    padding: '12px 14px',
    background: isPoint
      ? 'linear-gradient(180deg, rgba(80,52,18,.5), rgba(40,24,10,.55))'
      : 'rgba(20,12,6,.32)',
    border: isPoint
      ? '1.5px solid rgba(245,216,150,.85)'
      : '1px solid rgba(201,162,106,.4)',
    borderRadius: 10,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    transition: 'all .15s ease',
    boxShadow: isPoint
      ? 'inset 0 0 30px rgba(245,216,150,.15), 0 0 18px rgba(245,216,150,.25)'
      : 'inset 0 1px 0 rgba(255,255,255,.05)',
    color: 'var(--ivory)',
    overflow: 'hidden',
    ...style
  };
  return (
    <div
      data-bet-zone={id}
      className={illegal ? 'zone-illegal' : ''}
      style={baseStyle}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => onHoverChange && onHoverChange(true, id)}
      onMouseLeave={() => onHoverChange && onHoverChange(false, id)}
    >
      {label && (
        <div style={{
          fontFamily: "'Playfair Display', serif",
          fontStyle: 'italic',
          fontSize: 17, fontWeight: 600,
          color: isPoint ? '#f5d896' : '#fff',
          letterSpacing: '.04em',
          textShadow: '0 1px 3px rgba(0,0,0,.6)'
        }}>{label}</div>
      )}
      {sublabel && (
        <div style={{
          fontSize: 9, letterSpacing: '.24em',
          color: 'var(--ivory-dim)', textTransform: 'uppercase',
          marginTop: 2
        }}>{sublabel}</div>
      )}
      {hint && (
        <div style={{
          fontSize: 10, letterSpacing: '.06em',
          color: 'rgba(245,216,150,.7)',
          fontFamily: "'JetBrains Mono', monospace",
          marginTop: 4
        }}>{hint}</div>
      )}
      {disabled && (
        <div style={{
          position: 'absolute', top: 6, right: 8,
          fontSize: 11, color: 'rgba(255,255,255,.5)'
        }}>🔒</div>
      )}
      {amount > 0 && (
        <div style={{
          position: 'absolute', right: 8, bottom: 8
        }}>
          <ChipBadge amount={amount} size={22} label={badgeAmount != null ? '$' + badgeAmount : '$' + amount} />
        </div>
      )}
      {children}
    </div>
  );
}

// ── PlaceNumberCell — shows place + come + dontCome stacks for one number ──
function PlaceNumberCell({ n, isPoint, totals, onClickPlace, onClickComeOdds, onClickDontComeOdds, disabled, onHoverChange }) {
  const placePay = window.CR_RULES.PLACE_PAYOUTS[n];
  const placeStr = `${placePay.num}:${placePay.den}`;
  return (
    <div
      data-place-cell={n}
      style={{
        position: 'relative',
        flex: 1,
        height: 175,
        padding: '10px 8px 8px',
        background: isPoint
          ? 'linear-gradient(180deg, rgba(80,52,18,.5), rgba(40,24,10,.55))'
          : 'rgba(20,12,6,.32)',
        border: isPoint
          ? '1.5px solid rgba(245,216,150,.85)'
          : '1px solid rgba(201,162,106,.4)',
        borderRadius: 10,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'all .15s ease',
        boxShadow: isPoint
          ? 'inset 0 0 30px rgba(245,216,150,.18), 0 0 18px rgba(245,216,150,.3)'
          : 'inset 0 1px 0 rgba(255,255,255,.05)',
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4
      }}
      onClick={disabled ? undefined : onClickPlace}
      onMouseEnter={() => onHoverChange && onHoverChange(true, 'place' + n)}
      onMouseLeave={() => onHoverChange && onHoverChange(false, 'place' + n)}
    >
      <div style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: 32, fontWeight: 700,
        color: isPoint ? '#f5d896' : '#fff',
        lineHeight: 1,
        textShadow: '0 1px 4px rgba(0,0,0,.6)'
      }}>{n}</div>
      <div style={{ fontSize: 8, letterSpacing: '.18em', color: 'var(--ivory-dim)', textTransform: 'uppercase' }}>
        Place {placeStr}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center', marginTop: 4 }}>
        {totals.place > 0 && (
          <Pill label="P" amount={totals.place} color="#f5d896" />
        )}
        {totals.comePoint > 0 && (
          <Pill
            label={'C' + (totals.comeOdds > 0 ? `+O${totals.comeOdds}` : '')}
            amount={totals.comePoint}
            color="#9eddb8"
            onClick={(e) => { e.stopPropagation(); if (onClickComeOdds) onClickComeOdds(); }}
            title="Click to add come odds"
          />
        )}
        {totals.dontPoint > 0 && (
          <Pill
            label={'D' + (totals.dontOdds > 0 ? `+O${totals.dontOdds}` : '')}
            amount={totals.dontPoint}
            color="#ff9286"
            onClick={(e) => { e.stopPropagation(); if (onClickDontComeOdds) onClickDontComeOdds(); }}
            title="Click to lay don't-come odds"
          />
        )}
      </div>

      {isPoint && (
        <div style={{
          position: 'absolute', top: 4, left: '50%', transform: 'translateX(-50%)',
          width: 32, height: 32, borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 30%, #fff, #e6e0d2 70%)',
          color: '#0e3a2e',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9, fontWeight: 800, letterSpacing: '.1em',
          boxShadow: '0 0 16px rgba(245,216,150,.7), inset 0 -2px 0 rgba(0,0,0,.15)',
          border: '2px solid #2a1a08'
        }}>ON</div>
      )}
    </div>
  );
}

function Pill({ label, amount, color, onClick, title }) {
  return (
    <div
      onClick={onClick}
      title={title}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '2px 8px',
        background: 'rgba(8,4,2,.85)',
        border: `1px solid ${color}40`,
        borderRadius: 999,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10, fontWeight: 700, color,
        boxShadow: '0 2px 6px rgba(0,0,0,.4)',
        cursor: onClick ? 'pointer' : 'inherit'
      }}
    >
      <span>{label}</span>
      <span style={{ color: '#fff' }}>${amount}</span>
    </div>
  );
}

// ── HintPanel ───────────────────────────────────────────────────────────────
function HintPanel({ hint, onLearnMore, expanded }) {
  if (!hint) return null;
  const headerLabel =
    hint.kind === 'caution' ? 'Caution' :
    hint.kind === 'odds' ? 'Best move' :
    hint.kind === 'come' ? 'Suggested' :
    hint.kind === 'note' ? 'Note' :
    hint.kind === 'roll' ? 'Ready' :
    'Strategy';
  const riskColor =
    hint.riskClass === 'risk-good' ? '#9eddb8' :
    hint.riskClass === 'risk-bad' ? '#ff9286' : '#e6c590';
  return (
    <div style={{
      padding: '8px 14px',
      background: 'linear-gradient(180deg, rgba(20,12,6,.85), rgba(10,6,3,.85))',
      borderRadius: 10,
      border: '1px solid rgba(230,197,144,.4)',
      boxShadow: '0 6px 18px rgba(0,0,0,.4)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', gap: 12,
      minHeight: 36
    }}>
      <span style={{
        fontSize: 9, letterSpacing: '.24em', color: 'var(--brass)', textTransform: 'uppercase',
        display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#e6c590' }} />
        {headerLabel}
      </span>
      <span style={{
        fontFamily: "'Playfair Display', serif",
        fontStyle: 'italic',
        fontSize: 16, fontWeight: 600, color: '#fff',
        whiteSpace: 'nowrap', flexShrink: 0
      }}>{hint.action}</span>
      <span style={{
        fontSize: 11, color: 'var(--ivory-dim)', lineHeight: 1.3,
        flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
      }}>{hint.explanation}</span>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9, letterSpacing: '.18em',
        color: riskColor, textTransform: 'uppercase',
        flexShrink: 0
      }}>{hint.riskLabel}</span>
      {hint.detail && (
        <button
          onClick={onLearnMore}
          style={{
            background: 'transparent', border: 'none', color: 'var(--brass)',
            cursor: 'pointer', fontFamily: 'inherit', fontSize: 9,
            letterSpacing: '.18em', textTransform: 'uppercase',
            flexShrink: 0
          }}
        >{expanded ? 'Less ▴' : 'More ▾'}</button>
      )}
      {expanded && hint.detail && (
        <div style={{
          position: 'absolute', left: 12, right: 12, bottom: '100%',
          marginBottom: 6,
          padding: '12px 14px',
          background: 'linear-gradient(180deg, rgba(20,12,6,.96), rgba(10,6,3,.96))',
          border: '1px solid rgba(230,197,144,.4)',
          borderRadius: 10,
          boxShadow: '0 -10px 24px rgba(0,0,0,.5)',
          fontSize: 12, color: 'var(--ivory-dim)', lineHeight: 1.5,
          zIndex: 8
        }}>{hint.detail}</div>
      )}
    </div>
  );
}

// ── ResultBanner ────────────────────────────────────────────────────────────
function ResultBanner({ kind, total, totalWon }) {
  if (!kind) return null;
  const map = {
    natural:    { title: 'NATURAL',   sub: total === 7 ? 'Seven on the come-out' : 'Eleven on the come-out', color: '#ffd97a', glow: '#ffd97a' },
    craps:      { title: 'CRAPS',     sub: `Came out on ${total}`, color: '#f29a8c', glow: '#c0392b' },
    point_set:  { title: 'POINT IS ' + total, sub: 'Roll the point before a seven', color: '#9eddb8', glow: '#9eddb8' },
    point_made: { title: 'POINT MADE', sub: totalWon > 0 ? `+$${totalWon}` : 'Pass line wins', color: '#ffd97a', glow: '#ffd97a' },
    seven_out:  { title: 'SEVEN OUT', sub: 'Line away — new shooter', color: '#f29a8c', glow: '#c0392b' },
    win:        { title: 'WIN',       sub: totalWon > 0 ? `+$${totalWon}` : 'Hit', color: '#9eddb8', glow: '#9eddb8' },
    lose:       { title: 'LOSE',      sub: 'Bets cleared', color: '#f29a8c', glow: '#c0392b' },
    push:       { title: 'PUSH',      sub: 'Bet returned', color: '#e6c590', glow: '#c9a26a' }
  };
  const m = map[kind] || map.win;
  return (
    <div className="banner-in" key={kind + '-' + total + '-' + totalWon} style={{
      position: 'absolute',
      top: 110,
      left: '50%', transform: 'translateX(-50%)',
      padding: '14px 36px',
      background: 'linear-gradient(180deg, rgba(15,10,5,.94), rgba(8,4,2,.94))',
      border: `1px solid ${m.glow}`,
      borderRadius: 6,
      textAlign: 'center',
      boxShadow: `0 0 50px -10px ${m.glow}, 0 14px 30px rgba(0,0,0,.5)`,
      zIndex: 6,
      pointerEvents: 'none'
    }}>
      <div style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: 28, fontWeight: 700, color: m.color,
        letterSpacing: '.18em', fontStyle: 'italic'
      }}>{m.title}</div>
      <div style={{ fontSize: 11, letterSpacing: '.3em', color: 'var(--ivory-dim)', marginTop: 2 }}>{m.sub}</div>
    </div>
  );
}

// ── Tooltip overlay ─────────────────────────────────────────────────────────
function BetTooltip({ id, info }) {
  if (!id || !info) return null;
  return (
    <div style={{
      position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
      zIndex: 10,
      padding: '8px 14px',
      background: 'rgba(8,4,2,.92)',
      border: '1px solid rgba(201,162,106,.5)',
      borderRadius: 8,
      backdropFilter: 'blur(6px)',
      pointerEvents: 'none',
      whiteSpace: 'nowrap'
    }}>
      <div style={{
        fontFamily: "'Playfair Display', serif",
        fontStyle: 'italic',
        fontSize: 13, fontWeight: 600, color: '#f5d896'
      }}>{info.name}</div>
      <div style={{ fontSize: 10, color: 'var(--ivory-dim)', marginTop: 2 }}>
        Pays {info.payout} · Edge {info.edge.toFixed(2)}%
      </div>
    </div>
  );
}

// ── BrokeModal ──────────────────────────────────────────────────────────────
function BrokeModal({ playerName, onReload }) {
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
          {`The dice cleaned you out, ${playerName || 'friend'}.`}
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

// ── NameModal ───────────────────────────────────────────────────────────────
function NameModal({ initialName = '', onSave, onCancel }) {
  const [name, setName] = useState(initialName);
  const inputRef = useRef(null);
  useEffect(() => {
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
        <div style={{ fontSize: 10, letterSpacing: '.32em', textTransform: 'uppercase', color: 'var(--ivory-dim)', marginBottom: 6 }}>Limestone Games</div>
        <div style={{
          fontFamily: "'Playfair Display', serif", fontStyle: 'italic',
          fontSize: 22, color: 'var(--brass-2)',
          marginBottom: 20, lineHeight: 1.3
        }}>
          {initialName ? 'Changing names tonight?' : 'What should the stickman call you?'}
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
            fontSize: 19, fontStyle: 'italic',
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
          }}>Step up to the rail →</button>
        </div>
      </form>
    </div>
  );
}

Object.assign(window, {
  Chip, ChipBadge,
  Die, DiceTray,
  FeltBackdrop, FeltLogo,
  BrassRail,
  BetZone, PlaceNumberCell,
  HintPanel, ResultBanner, BetTooltip,
  BrokeModal, NameModal
});
