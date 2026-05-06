/* eslint-disable */
// Felt, chips, bet circles, action buttons, hint panel, paytable, result banner.

const TCP_CHIP_DEFS = [
  { value: 5,    color: '#c0392b', edge: '#7a1f15', label: '$5'   },
  { value: 25,   color: '#2e7d4f', edge: '#194530', label: '$25'  },
  { value: 100,  color: '#1f3a6a', edge: '#0e1f3d', label: '$100' },
  { value: 500,  color: '#5b2a7a', edge: '#321444', label: '$500' }
];

function Chip({ value, size = 56, onClick, disabled, label }) {
  const def = TCP_CHIP_DEFS.find(c => c.value === value) || TCP_CHIP_DEFS[0];
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
        opacity: disabled ? .35 : 1,
        background: 'transparent',
        transition: 'transform .18s ease',
        outline: 'none'
      }}
      onMouseEnter={e => !disabled && (e.currentTarget.style.transform = 'translateY(-8px) scale(1.04)')}
      onMouseLeave={e => !disabled && (e.currentTarget.style.transform = 'none')}
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

function BetCircle({ label, amount, active, glow, onClick, dimmed, badge, size = 110 }) {
  const interactive = !!onClick;
  const borderColor = active
    ? 'rgba(245,216,150,.95)'
    : amount > 0
      ? 'rgba(230,197,144,.7)'
      : 'rgba(230,197,144,.35)';
  return (
    <button
      onClick={onClick}
      disabled={!interactive}
      className={glow ? 'glow-pulse' : ''}
      style={{
        position: 'relative',
        width: size, height: size,
        borderRadius: '50%',
        border: `2px ${active ? 'solid' : 'dashed'} ${borderColor}`,
        background: 'radial-gradient(circle, rgba(0,0,0,.4), transparent)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 0, cursor: interactive ? 'pointer' : 'default',
        opacity: dimmed ? .55 : 1,
        transition: 'all .2s ease',
        outline: 'none',
        fontFamily: 'inherit',
        color: 'inherit'
      }}
    >
      <div style={{
        fontSize: 9, letterSpacing: '.28em', color: active ? 'var(--brass-2)' : 'var(--brass)',
        textTransform: 'uppercase', marginBottom: 4, fontWeight: 600
      }}>{label}</div>
      <div style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: 22, fontWeight: 700,
        color: amount > 0 ? 'var(--brass-2)' : 'rgba(230,197,144,.4)'
      }}>${amount}</div>
      {badge && (
        <div style={{
          position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
          fontSize: 9, letterSpacing: '.22em', textTransform: 'uppercase', fontWeight: 700,
          background: 'linear-gradient(180deg, #f5d896, #c9a26a)',
          color: '#1a1208',
          padding: '2px 9px', borderRadius: 4,
          boxShadow: '0 4px 10px rgba(230,197,144,.45)',
          whiteSpace: 'nowrap'
        }}>{badge}</div>
      )}
    </button>
  );
}

function ActionButton({ label, onClick, hint, disabled, sub }) {
  const isHint = hint;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        position: 'relative',
        padding: '14px 22px',
        minWidth: 130,
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
        letterSpacing: '.16em',
        textTransform: 'uppercase',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all .18s ease',
        boxShadow: isHint
          ? '0 8px 24px rgba(230,197,144,.4), inset 0 1px 0 rgba(255,255,255,.4)'
          : '0 6px 14px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.06)',
        fontFamily: 'inherit'
      }}
      onMouseEnter={e => {
        if (disabled) return;
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
    >
      {isHint && (
        <span style={{
          position: 'absolute', top: -8, right: 10,
          fontSize: 9, padding: '2px 6px',
          background: '#1a1208', color: '#e6c590',
          borderRadius: 4, letterSpacing: '.18em',
          border: '1px solid rgba(230,197,144,.5)'
        }}>HINT</span>
      )}
      <div style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontSize: 18, letterSpacing: '.04em', textTransform: 'none', fontWeight: 600 }}>{label}</div>
      {sub && <div style={{ fontSize: 9, opacity: .7, marginTop: 2, letterSpacing: '.2em' }}>{sub}</div>}
    </button>
  );
}

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
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'url(../blackjack/assets/table/felt.png)',
        backgroundSize: 'cover',
        opacity: .25,
        mixBlendMode: 'overlay'
      }} />
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: .5 }}>
        <filter id="tcpn">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .12 0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#tcpn)" />
      </svg>
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} viewBox="0 0 1000 700" preserveAspectRatio="none">
        <defs>
          <linearGradient id="tcparc" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#e6c590" stopOpacity=".75" />
            <stop offset="100%" stopColor="#8c6a3f" stopOpacity=".55" />
          </linearGradient>
        </defs>
        <ellipse cx="500" cy="-200" rx="700" ry="850" fill="none" stroke="url(#tcparc)" strokeWidth="1.5" />
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
      opacity: .42
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
      }}>THREE CARD POKER · 4-3-1 · Q-HIGH</div>
    </div>
  );
}

function HintPanel({ hint }) {
  if (!hint) return null;
  const headerLabel =
    hint.kind === 'bet' ? 'Suggested bet' :
    hint.kind === 'side_bet' ? 'Side bet note' :
    'Optimal play says';
  return (
    <div style={{
      position: 'absolute', right: 14, top: 14,
      width: 240,
      padding: '12px 14px',
      background: 'linear-gradient(180deg, rgba(20,12,6,.95), rgba(10,6,3,.95))',
      borderRadius: 10,
      border: '1px solid rgba(230,197,144,.4)',
      boxShadow: '0 14px 28px rgba(0,0,0,.5)',
      backdropFilter: 'blur(8px)',
      zIndex: 5
    }}>
      <div style={{
        fontSize: 9, letterSpacing: '.24em', color: 'var(--brass)', textTransform: 'uppercase',
        marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#e6c590' }} />
        {headerLabel}
      </div>
      <div style={{
        fontFamily: "'Playfair Display', serif",
        fontStyle: 'italic',
        fontSize: 22, fontWeight: 600, color: '#fff',
        marginBottom: 6
      }}>{hint.action}</div>
      <div style={{ fontSize: 11, color: 'var(--ivory-dim)', lineHeight: 1.4 }}>
        {hint.explanation}
      </div>
      {hint.odds && hint.odds.winRate !== undefined && (
        <div style={{
          marginTop: 10, paddingTop: 8,
          borderTop: '1px solid rgba(230,197,144,.18)',
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          fontSize: 9, letterSpacing: '.18em', color: 'var(--brass)', textTransform: 'uppercase',
          display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap'
        }}>
          <span>WIN RATE ≈{hint.odds.winRate}%</span>
        </div>
      )}
    </div>
  );
}

function PaytablePanel({ playerHand }) {
  const handKey = playerHand
    ? (() => {
        const ev = TCP_HAND.evaluate(playerHand);
        return ev.rank;
      })()
    : null;

  const ROW_KEYS = TCP_HAND.RANKS;

  function row(label, key, antePay, ppPay) {
    const active = handKey === key;
    return (
      <tr key={label} style={{
        background: active ? 'rgba(230,197,144,.18)' : 'transparent',
        transition: 'background .25s ease'
      }}>
        <td style={{
          padding: '5px 10px',
          fontFamily: "'Playfair Display', serif",
          fontStyle: 'italic',
          fontSize: 13,
          color: active ? 'var(--brass-2)' : 'var(--ivory)',
          letterSpacing: '.02em'
        }}>{label}</td>
        <td style={{
          padding: '5px 10px',
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          fontSize: 11,
          textAlign: 'right',
          color: active ? 'var(--brass-2)' : 'var(--ivory-dim)'
        }}>{antePay != null ? `${antePay}:1` : '—'}</td>
        <td style={{
          padding: '5px 10px',
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          fontSize: 11,
          textAlign: 'right',
          color: active ? 'var(--brass-2)' : 'var(--ivory-dim)'
        }}>{ppPay != null ? `${ppPay}:1` : '—'}</td>
      </tr>
    );
  }

  return (
    <div style={{
      position: 'absolute', right: 14, bottom: 14,
      width: 240,
      padding: '12px 14px',
      background: 'linear-gradient(180deg, rgba(20,12,6,.95), rgba(10,6,3,.95))',
      borderRadius: 10,
      border: '1px solid rgba(230,197,144,.4)',
      boxShadow: '0 14px 28px rgba(0,0,0,.5)',
      backdropFilter: 'blur(8px)',
      zIndex: 4
    }}>
      <div style={{
        fontSize: 9, letterSpacing: '.24em', color: 'var(--brass)', textTransform: 'uppercase',
        marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#e6c590' }} />
        Paytable
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '0 10px 6px', fontSize: 8, letterSpacing: '.22em', color: 'var(--ivory-dim)', textTransform: 'uppercase', fontWeight: 600 }}>Hand</th>
            <th style={{ textAlign: 'right', padding: '0 10px 6px', fontSize: 8, letterSpacing: '.22em', color: 'var(--ivory-dim)', textTransform: 'uppercase', fontWeight: 600 }}>Ante+</th>
            <th style={{ textAlign: 'right', padding: '0 10px 6px', fontSize: 8, letterSpacing: '.22em', color: 'var(--ivory-dim)', textTransform: 'uppercase', fontWeight: 600 }}>Pair+</th>
          </tr>
        </thead>
        <tbody>
          {row('Straight Flush', ROW_KEYS.STRAIGHT_FLUSH, 5, 40)}
          {row('Three of a Kind', ROW_KEYS.THREE_OF_A_KIND, 4, 30)}
          {row('Straight', ROW_KEYS.STRAIGHT, 1, 6)}
          {row('Flush', ROW_KEYS.FLUSH, null, 4)}
          {row('Pair', ROW_KEYS.PAIR, null, 1)}
        </tbody>
      </table>
      <div style={{
        marginTop: 10, paddingTop: 8,
        borderTop: '1px solid rgba(230,197,144,.18)',
        fontSize: 9, color: 'var(--ivory-dim)', lineHeight: 1.45
      }}>
        Dealer qualifies on Q-high or better. If not, Ante pays 1:1 and Play pushes.
      </div>
    </div>
  );
}

function BrassRail({ bankroll, streak, played, won, peak, showHints, onToggleHints }) {
  const winRate = played ? Math.round(won / played * 100) : null;
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
            Three Card Poker · Table 03
          </div>
        </div>
      </a>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0 }}>
        <RailStat label="Bankroll" value={`$${bankroll.toLocaleString()}`} accent />
        <RailStat label="Streak" value={streak > 0 ? `🔥 ×${streak}` : '—'} highlight={streak >= 3} />
        <RailStat label="Hands" value={played || '—'} />
        <RailStat label="Win Rate" value={winRate !== null ? `${winRate}%` : '—'} />
        <RailStat label="Peak" value={`$${peak.toLocaleString()}`} small />
        <button
          onClick={onToggleHints}
          title={showHints ? 'Hide strategy hints' : 'Show strategy hints'}
          style={{
            marginLeft: 14,
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

function HandLabel({ label, description, isStrong }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 10,
      padding: '4px 14px',
      background: 'rgba(0,0,0,.45)',
      backdropFilter: 'blur(6px)',
      borderRadius: 999,
      border: `1px solid ${isStrong ? 'rgba(255,217,122,.6)' : 'rgba(255,255,255,.15)'}`,
      boxShadow: isStrong ? '0 0 20px rgba(255,217,122,.35)' : 'none'
    }}>
      <span style={{
        fontSize: 10, letterSpacing: '.2em', color: 'var(--ivory-dim)',
        textTransform: 'uppercase', fontWeight: 600
      }}>{label}</span>
      <span style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: 17, fontWeight: 600,
        color: isStrong ? '#ffd97a' : '#fff',
        fontStyle: 'italic',
        lineHeight: 1
      }}>{description}</span>
    </div>
  );
}

function ResultBanner({ kind, payout, anteBonus, pairPlus }) {
  if (!kind) return null;
  const map = {
    win:          { title: 'YOU WIN',         sub: `+$${payout}`,                  color: '#9eddb8', glow: '#9eddb8' },
    lose:         { title: 'DEALER WINS',     sub: `-$${Math.abs(payout)}`,        color: '#f29a8c', glow: '#c0392b' },
    push:         { title: 'PUSH',            sub: 'Bets returned',                color: '#e6c590', glow: '#c9a26a' },
    'no-qualify': { title: 'DEALER OUT',      sub: `Ante wins · Play pushes · +$${payout}`, color: '#e6c590', glow: '#e6c590' },
    fold:         { title: 'FOLDED',          sub: `-$${Math.abs(payout)}`,        color: '#cba879', glow: '#8c6a3f' },
    'bonus-win':  { title: 'BONUS WIN',       sub: `+$${payout}`,                  color: '#ffd97a', glow: '#ffd97a' }
  };
  const m = map[kind] || map.lose;
  return (
    <div className="banner-in" style={{
      position: 'absolute',
      top: 110,
      left: '50%', transform: 'translateX(-50%)',
      padding: '16px 38px',
      background: 'linear-gradient(180deg, rgba(15,10,5,.92), rgba(8,4,2,.92))',
      border: `1px solid ${m.glow}`,
      borderRadius: 6,
      textAlign: 'center',
      boxShadow: `0 0 50px -10px ${m.glow}, 0 14px 30px rgba(0,0,0,.5)`,
      zIndex: 6,
      minWidth: 280
    }}>
      <div style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: 30, fontWeight: 700, color: m.color,
        letterSpacing: '.18em', fontStyle: 'italic'
      }}>{m.title}</div>
      <div style={{ fontSize: 11, letterSpacing: '.3em', color: 'var(--ivory-dim)', marginTop: 4 }}>{m.sub}</div>
      {(anteBonus > 0 || pairPlus > 0) && (
        <div style={{
          marginTop: 10, paddingTop: 8,
          borderTop: '1px solid rgba(230,197,144,.2)',
          display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap'
        }}>
          {anteBonus > 0 && (
            <span style={{
              fontSize: 10, letterSpacing: '.22em', textTransform: 'uppercase',
              color: '#ffd97a', fontWeight: 700
            }}>ANTE BONUS +${anteBonus}</span>
          )}
          {pairPlus > 0 && (
            <span style={{
              fontSize: 10, letterSpacing: '.22em', textTransform: 'uppercase',
              color: '#ffd97a', fontWeight: 700
            }}>PAIR PLUS +${pairPlus}</span>
          )}
        </div>
      )}
    </div>
  );
}

function NoQualifyPill() {
  return (
    <div style={{
      display: 'inline-block',
      padding: '4px 12px',
      background: 'rgba(35,22,10,.85)',
      border: '1px solid rgba(230,197,144,.55)',
      borderRadius: 999,
      fontSize: 9, letterSpacing: '.28em', textTransform: 'uppercase',
      color: 'var(--brass-2)', fontWeight: 700,
      boxShadow: '0 4px 12px rgba(0,0,0,.4)'
    }}>Dealer doesn't qualify · Play pushes</div>
  );
}

Object.assign(window, {
  Chip, BetCircle, ActionButton,
  FeltBackdrop, FeltLogo,
  HintPanel, PaytablePanel,
  BrassRail, HandLabel,
  ResultBanner, NoQualifyPill,
  TCP_CHIP_DEFS
});
