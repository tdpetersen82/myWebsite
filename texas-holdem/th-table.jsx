/* eslint-disable */
// Texas Hold'em — table chrome, action zone, hint panel, lobby modal,
// chip displays, brass rail. Mirrors the visual language of bj-table.jsx but
// adapted for the multi-seat table.

const TH_CHIP_DEFS = [
  { value: 1,    color: '#cdcdcd', edge: '#7a7a7a', label: '$1'   },
  { value: 5,    color: '#c0392b', edge: '#7a1f15', label: '$5'   },
  { value: 25,   color: '#2e7d4f', edge: '#194530', label: '$25'  },
  { value: 100,  color: '#1f3a6a', edge: '#0e1f3d', label: '$100' },
  { value: 500,  color: '#5b2a7a', edge: '#321444', label: '$500' },
  { value: 1000, color: '#1a1410', edge: '#000',    label: '$1K'  }
];

const TH_BUYIN_TIERS = [
  { buyin: 100,  sb: 1,  bb: 2,  name: '$100 buy-in', subtitle: '$1 / $2 blinds' },
  { buyin: 500,  sb: 5,  bb: 10, name: '$500 buy-in', subtitle: '$5 / $10 blinds' },
  { buyin: 1000, sb: 10, bb: 20, name: '$1,000 buy-in', subtitle: '$10 / $20 blinds' }
];

function THFeltBackdrop() {
  return (
    <div style={{
      position:'absolute', inset:0, borderRadius: 18, overflow:'hidden',
      background: `
        radial-gradient(ellipse 110% 75% at 50% 38%, #1a5040 0%, #0e3a2e 45%, #0a2a21 80%),
        #0a2a21
      `,
      boxShadow:'var(--shadow-deep), inset 0 0 0 1px rgba(201,162,106,.18), inset 0 0 80px rgba(0,0,0,.5)'
    }}>
      <svg style={{position:'absolute', inset:0, width:'100%', height:'100%', opacity:.4}}>
        <filter id="thn">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/>
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .12 0"/>
        </filter>
        <rect width="100%" height="100%" filter="url(#thn)"/>
      </svg>
      <svg style={{ position:'absolute', inset: 0, width:'100%', height:'100%', pointerEvents:'none' }} viewBox="0 0 1000 700" preserveAspectRatio="none">
        <defs>
          <linearGradient id="tharc" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#e6c590" stopOpacity=".55"/>
            <stop offset="100%" stopColor="#8c6a3f" stopOpacity=".4"/>
          </linearGradient>
        </defs>
        <ellipse cx="500" cy="350" rx="430" ry="245" fill="none" stroke="url(#tharc)" strokeWidth="1.5"/>
        <ellipse cx="500" cy="350" rx="440" ry="255" fill="none" stroke="rgba(0,0,0,.35)" strokeWidth=".5"/>
      </svg>
    </div>
  );
}

function THFeltLogo() {
  return (
    <div style={{
      position:'absolute', right: 22, bottom: 18,
      pointerEvents:'none', textAlign:'right', opacity: .35
    }}>
      <div style={{
        fontFamily:"'Playfair Display', serif",
        fontSize: 14, letterSpacing:'.18em',
        color:'var(--brass-2)', fontStyle:'italic',
        fontWeight: 600, lineHeight: 1
      }}>Limestone</div>
      <div style={{ fontSize: 8, letterSpacing:'.4em', color:'var(--brass)', marginTop: 4 }}>
        TEXAS HOLD'EM · NL · 4-MAX
      </div>
    </div>
  );
}

function THBrassRail({
  bankroll, tableStack, blinds, handsPlayed, biggestPot,
  showHints, onToggleHints, onLeave
}) {
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
      <a href="../casino/" title="Back to casino" style={{
        display:'inline-flex', alignItems:'center', gap: 6,
        alignSelf:'center', marginRight: 14,
        padding:'8px 14px',
        background:'rgba(20,12,6,.6)', color:'var(--brass-2)',
        border:'1px solid rgba(201,162,106,.5)', borderRadius: 999,
        fontSize: 10, fontWeight: 700, letterSpacing:'.18em',
        textTransform:'uppercase', textDecoration:'none', whiteSpace:'nowrap'
      }}>← Lobby</a>
      <a href="../casino/" title="Back to casino" style={{
        display:'flex', alignItems:'center', gap: 12, paddingRight: 18,
        borderRight:'1px solid rgba(201,162,106,.2)',
        textDecoration:'none', color:'inherit'
      }}>
        <div style={{
          width: 32, height: 32, borderRadius:'50%',
          background:'radial-gradient(circle at 35% 30%, #f5d896, #8c6a3f 75%)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontFamily:"'Playfair Display', serif",
          color:'#1a1208', fontSize: 14, fontWeight: 800, fontStyle:'italic'
        }}>L</div>
        <div>
          <div style={{
            fontFamily:"'Playfair Display', serif",
            fontSize: 17, color:'var(--brass-2)',
            fontStyle:'italic', fontWeight: 600, lineHeight: 1
          }}>Limestone Hold'em</div>
          <div style={{ fontSize: 9, letterSpacing:'.32em', color:'var(--ivory-dim)', textTransform:'uppercase', marginTop: 3 }}>
            4-Max · No-Limit · Cash
          </div>
        </div>
      </a>

      <div style={{ flex: 1, display:'flex', alignItems:'center', justifyContent:'flex-end', gap: 0 }}>
        <THRailStat label="Bankroll" value={`$${bankroll.toLocaleString()}`} accent />
        <THRailStat label="At table" value={tableStack != null ? `$${tableStack.toLocaleString()}` : '—'} />
        <THRailStat label="Blinds" value={blinds || '—'} small />
        <THRailStat label="Hands" value={handsPlayed || '—'} small />
        <THRailStat label="Biggest pot" value={biggestPot ? `$${biggestPot.toLocaleString()}` : '—'} small />
        <button
          onClick={onToggleHints}
          title={showHints ? 'Hide hint panel' : 'Show hint panel'}
          style={{
            marginLeft: 14,
            padding:'8px 14px',
            background: showHints
              ? 'linear-gradient(180deg, #e6c590, #c9a26a)'
              : 'rgba(20,12,6,.6)',
            color: showHints ? '#1a1208' : 'var(--brass-2)',
            border:'1px solid rgba(201,162,106,.5)', borderRadius: 999,
            fontSize: 10, fontWeight: 700, letterSpacing:'.18em',
            textTransform:'uppercase', cursor:'pointer', whiteSpace:'nowrap'
          }}
        >{showHints ? '✦ Hints' : 'Hints Off'}</button>
        {onLeave && (
          <button
            onClick={onLeave}
            title="Cash out and return to lobby"
            style={{
              marginLeft: 8,
              padding:'8px 14px',
              background:'rgba(20,12,6,.6)', color:'var(--ivory-dim)',
              border:'1px solid rgba(201,162,106,.4)', borderRadius: 999,
              fontSize: 10, fontWeight: 700, letterSpacing:'.18em',
              textTransform:'uppercase', cursor:'pointer', whiteSpace:'nowrap'
            }}
          >Cash out</button>
        )}
      </div>
    </div>
  );
}

function THRailStat({ label, value, accent, small }) {
  return (
    <div style={{
      padding:'4px 16px',
      borderLeft:'1px solid rgba(201,162,106,.18)',
      textAlign:'right',
      minWidth: small ? 80 : 100
    }}>
      <div style={{ fontSize: 8, letterSpacing:'.28em', color:'var(--ivory-dim)', textTransform:'uppercase', fontWeight: 600 }}>{label}</div>
      <div style={{
        fontFamily: accent ? "'Playfair Display', serif" : "'JetBrains Mono', monospace",
        fontSize: accent ? 20 : (small ? 12 : 14),
        color: accent ? 'var(--brass-2)' : '#fff',
        fontWeight: accent ? 700 : 500,
        lineHeight: 1.1, marginTop: 2,
        fontStyle: accent ? 'italic' : 'normal'
      }}>{value}</div>
    </div>
  );
}

function THPotDisplay({ pot, sidePots = [] }) {
  return (
    <div style={{
      display:'flex', flexDirection:'column', alignItems:'center', gap: 4,
      padding:'8px 18px',
      background:'linear-gradient(180deg, rgba(20,12,6,.7), rgba(10,6,3,.85))',
      border:'1px solid rgba(230,197,144,.4)',
      borderRadius: 999,
      backdropFilter:'blur(6px)',
      boxShadow:'0 6px 18px rgba(0,0,0,.4), inset 0 1px 0 rgba(230,197,144,.15)'
    }}>
      <div style={{ fontSize: 9, letterSpacing:'.3em', color:'var(--brass)', textTransform:'uppercase', fontWeight: 700 }}>Pot</div>
      <div style={{
        fontFamily:"'Playfair Display', serif",
        fontStyle:'italic',
        fontSize: 24, fontWeight: 700, color:'var(--brass-2)',
        lineHeight: 1
      }}>${pot.toLocaleString()}</div>
      {sidePots.length > 0 && (
        <div style={{ fontSize: 10, color:'var(--ivory-dim)', letterSpacing:'.1em' }}>
          {sidePots.map((p, i) => `Side ${i+1}: $${p.amount}`).join(' · ')}
        </div>
      )}
    </div>
  );
}

function THCommunityCards({ board, phase, glowIdx = [] }) {
  const slots = 5;
  const revealed = board.length;
  const cards = [];
  for (let i = 0; i < slots; i++) {
    const c = board[i];
    cards.push(
      <THCard
        key={i}
        card={c}
        w={84} h={118}
        dealIndex={i}
        fromX={-180} fromY={-40}
        glow={glowIdx.includes(i)}
      />
    );
  }
  return (
    <div style={{
      display:'flex', justifyContent:'center', gap: 10,
      padding:'12px 16px',
      borderRadius: 14
    }}>
      {cards}
    </div>
  );
}

function THActionZone({
  toCall, currentBet, myCurrentBet, minRaise, myStack, pot, bigBlind,
  raiseAmount, setRaiseAmount,
  hint,
  onFold, onCheckCall, onRaise
}) {
  const canCheck = toCall <= 0;
  const callPossible = toCall > 0;
  const callIsAllIn = toCall >= myStack;
  const minRaiseTotal = currentBet + minRaise;
  const minRaiseAdd = Math.max(minRaiseTotal - myCurrentBet, bigBlind);
  const maxRaiseAdd = myStack;
  const ha = hint?.action;

  // Prevent invalid raise amount.
  const adjustedRaise = Math.max(minRaiseAdd, Math.min(maxRaiseAdd, raiseAmount || minRaiseAdd));

  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap: 14, paddingTop: 4, flexWrap:'wrap' }}>
      <THActionButton
        label="Fold" sub="Muck the hand"
        onClick={onFold}
        hint={ha === 'Fold'}
      />
      <THActionButton
        label={canCheck ? 'Check' : (callIsAllIn ? `Call $${myStack} (All-in)` : `Call $${toCall}`)}
        sub={canCheck ? 'No bet to face' : `Match the bet`}
        onClick={onCheckCall}
        hint={canCheck ? ha === 'Check' : ha === 'Call'}
      />
      <THActionButton
        label={adjustedRaise >= maxRaiseAdd ? `All-in $${maxRaiseAdd}` : (canCheck ? `Bet $${adjustedRaise}` : `Raise $${adjustedRaise}`)}
        sub={canCheck ? 'Open the pot' : 'Pressure the table'}
        onClick={() => onRaise(adjustedRaise)}
        hint={ha === 'Raise' || ha === 'Bet'}
        disabled={maxRaiseAdd <= 0}
      />
      <div style={{
        display:'flex', flexDirection:'column', gap: 6,
        padding:'8px 14px',
        background:'rgba(20,12,6,.6)',
        border:'1px solid rgba(201,162,106,.3)',
        borderRadius: 10,
        minWidth: 240
      }}>
        <div style={{ fontSize: 9, letterSpacing:'.22em', color:'var(--brass)', textTransform:'uppercase', fontWeight: 700 }}>
          {canCheck ? 'Bet size' : 'Raise size'}
        </div>
        <input
          type="range"
          min={minRaiseAdd}
          max={maxRaiseAdd}
          step={Math.max(1, Math.floor(bigBlind / 2))}
          value={adjustedRaise}
          onChange={e => setRaiseAmount(Number(e.target.value))}
          style={{ width:'100%' }}
        />
        <div style={{ display:'flex', gap: 6 }}>
          {[0.5, 0.75, 1, 1.5, 2].map(mul => {
            const target = Math.round(pot * mul) + (canCheck ? 0 : toCall);
            const clamped = Math.max(minRaiseAdd, Math.min(maxRaiseAdd, target));
            return (
              <button key={mul} onClick={() => setRaiseAmount(clamped)} style={{
                flex: 1,
                padding:'4px 6px',
                background:'rgba(40,28,18,.7)',
                color:'var(--brass-2)',
                border:'1px solid rgba(201,162,106,.3)',
                borderRadius: 6,
                fontSize: 10, fontWeight: 600, letterSpacing:'.08em',
                textTransform:'uppercase', cursor:'pointer',
                fontFamily:'inherit'
              }}>{mul === 1 ? 'Pot' : `${mul}×P`}</button>
            );
          })}
          <button onClick={() => setRaiseAmount(maxRaiseAdd)} style={{
            flex: 1,
            padding:'4px 6px',
            background:'linear-gradient(180deg, #c0392b, #7a1f15)',
            color:'#fff',
            border:'1px solid rgba(192,57,43,.5)',
            borderRadius: 6,
            fontSize: 10, fontWeight: 700, letterSpacing:'.08em',
            textTransform:'uppercase', cursor:'pointer',
            fontFamily:'inherit'
          }}>All-in</button>
        </div>
      </div>
    </div>
  );
}

function THActionButton({ label, sub, onClick, hint, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        position:'relative',
        padding:'14px 22px',
        minWidth: 150,
        background: disabled
          ? 'rgba(20,12,6,.45)'
          : hint
            ? 'linear-gradient(180deg, #f5d896, #c9a26a)'
            : 'linear-gradient(180deg, rgba(40,28,18,.95), rgba(20,12,6,.95))',
        color: disabled ? 'rgba(255,255,255,.3)' : hint ? '#1a1208' : 'var(--ivory)',
        border: `1px solid ${hint ? 'rgba(230,197,144,.9)' : 'rgba(201,162,106,.35)'}`,
        borderRadius: 12,
        fontFamily: 'inherit',
        cursor: disabled ? 'not-allowed' : 'pointer',
        boxShadow: hint
          ? '0 8px 24px rgba(230,197,144,.4), inset 0 1px 0 rgba(255,255,255,.4)'
          : '0 6px 14px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.06)',
        transition:'all .18s ease'
      }}
    >
      {hint && (
        <span style={{
          position:'absolute', top: -8, right: 10,
          fontSize: 9, padding:'2px 6px',
          background:'#1a1208', color:'#e6c590',
          borderRadius: 4, letterSpacing:'.18em',
          border:'1px solid rgba(230,197,144,.5)'
        }}>HINT</span>
      )}
      <div style={{
        fontFamily:"'Playfair Display', serif", fontStyle:'italic',
        fontSize: 18, letterSpacing:'.04em', fontWeight: 600
      }}>{label}</div>
      {sub && <div style={{ fontSize: 9, opacity:.7, marginTop: 2, letterSpacing:'.2em', textTransform:'uppercase' }}>{sub}</div>}
    </button>
  );
}

function THHintPanel({ hint, label, equity, potOdds }) {
  if (!hint) return null;
  return (
    <div style={{
      position:'absolute', right: 14, top: 14,
      width: 260,
      padding:'12px 14px',
      background:'linear-gradient(180deg, rgba(20,12,6,.95), rgba(10,6,3,.95))',
      borderRadius: 10,
      border:'1px solid rgba(230,197,144,.4)',
      boxShadow:'0 14px 28px rgba(0,0,0,.5)',
      backdropFilter:'blur(8px)',
      zIndex: 6
    }}>
      <div style={{
        fontSize: 9, letterSpacing:'.24em', color:'var(--brass)', textTransform:'uppercase',
        marginBottom: 4, display:'flex', alignItems:'center', gap: 6
      }}>
        <span style={{ width: 6, height: 6, borderRadius:'50%', background:'#e6c590' }} />
        Recommendation
      </div>
      <div style={{
        fontFamily:"'Playfair Display', serif", fontStyle:'italic',
        fontSize: 22, fontWeight: 600, color:'#fff',
        marginBottom: 6
      }}>{hint.action}</div>
      <div style={{ fontSize: 11, color:'var(--ivory-dim)', lineHeight: 1.4, marginBottom: 8 }}>
        {hint.explanation}
      </div>
      {label && (
        <div style={{
          marginTop: 6, paddingTop: 8,
          borderTop:'1px solid rgba(230,197,144,.18)',
          fontSize: 11, color:'var(--ivory-dim)'
        }}>
          <div style={{ fontFamily:"'Playfair Display', serif", fontSize: 13, color:'var(--brass-2)' }}>{label}</div>
        </div>
      )}
      {(equity != null || potOdds != null) && (
        <div style={{
          marginTop: 8, paddingTop: 8,
          borderTop: '1px solid rgba(230,197,144,.18)',
          display:'flex', gap: 12,
          fontFamily:"'JetBrains Mono', monospace",
          fontSize: 10, letterSpacing:'.12em',
          color:'var(--brass)'
        }}>
          {equity != null && <span>EQUITY {Math.round(equity * 100)}%</span>}
          {potOdds != null && potOdds > 0 && <span>POT ODDS {Math.round(potOdds * 100)}%</span>}
          {hint.position && <span>· {hint.position.toUpperCase()}</span>}
        </div>
      )}
    </div>
  );
}

function THResultBanner({ kind, sub }) {
  if (!kind) return null;
  const map = {
    win:        { title: 'YOU WIN',      color: '#9eddb8', glow:'#9eddb8' },
    win_show:   { title: 'YOU WIN',      color: '#ffd97a', glow:'#ffd97a' },
    win_uncon:  { title: 'POT IS YOURS', color: '#9eddb8', glow:'#9eddb8' },
    lose:       { title: 'POT GOES OUT', color: '#f29a8c', glow:'#c0392b' },
    chop:       { title: 'CHOP IT UP',   color: '#e6c590', glow:'#c9a26a' },
    fold:       { title: 'YOU FOLD',     color: '#e6c590', glow:'#c9a26a' }
  };
  const m = map[kind] || map.lose;
  return (
    <div className="banner-in" style={{
      position:'absolute',
      top: 110,
      left:'50%', transform:'translateX(-50%)',
      padding:'14px 32px',
      background:'linear-gradient(180deg, rgba(15,10,5,.95), rgba(8,4,2,.95))',
      border: `1px solid ${m.glow}`,
      borderRadius: 6,
      textAlign:'center',
      boxShadow: `0 0 50px -10px ${m.glow}, 0 14px 30px rgba(0,0,0,.5)`,
      zIndex: 7
    }}>
      <div style={{
        fontFamily:"'Playfair Display', serif",
        fontSize: 28, fontWeight: 700, color: m.color,
        letterSpacing:'.18em', fontStyle:'italic'
      }}>{m.title}</div>
      {sub && <div style={{ fontSize: 11, letterSpacing:'.3em', color:'var(--ivory-dim)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// Lobby modal — pick a buy-in tier before sitting down.
function THLobbyModal({ bankroll, onJoin, onCancel, defaultName = '' }) {
  const [name, setName] = React.useState(defaultName);
  const [pickedTier, setPickedTier] = React.useState(null);
  const inputRef = React.useRef(null);

  // The shared casino profile loads after first render, so re-seed the input
  // when defaultName arrives (otherwise users see an empty field even though
  // their name is already saved).
  React.useEffect(() => {
    if (defaultName && !name) setName(defaultName);
  }, [defaultName]);

  React.useEffect(() => {
    const id = setTimeout(() => {
      if (!defaultName) inputRef.current?.focus();
    }, 60);
    return () => clearTimeout(id);
  }, []);

  function tryJoin(tier) {
    if (!name.trim()) {
      inputRef.current?.focus();
      return;
    }
    if (bankroll < tier.buyin) return;
    onJoin(tier, name.trim());
  }

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:9000,
      background:'rgba(8,5,2,.7)', backdropFilter:'blur(8px)',
      display:'flex', alignItems:'center', justifyContent:'center'
    }}>
      <div style={{
        background:'linear-gradient(180deg, rgba(35,22,10,.95), rgba(20,12,6,.98))',
        border:'1px solid rgba(201,162,106,.5)', borderRadius:16,
        padding:'28px 32px 24px',
        boxShadow:'0 30px 80px rgba(0,0,0,.7), inset 0 1px 0 rgba(230,197,144,.15)',
        minWidth:520, maxWidth:640
      }}>
        <div style={{ fontSize:10, letterSpacing:'.32em', textTransform:'uppercase', color:'var(--ivory-dim)', textAlign:'center' }}>
          Limestone Hold'em · 4-max · No-limit
        </div>
        <div style={{
          fontFamily:"'Playfair Display', serif", fontStyle:'italic',
          fontSize: 24, color:'var(--brass-2)', textAlign:'center',
          marginTop: 4, marginBottom: 18, lineHeight: 1.25
        }}>Take a seat at the table</div>

        <div style={{
          fontSize: 10, letterSpacing:'.22em', color:'var(--brass)', textTransform:'uppercase',
          fontWeight: 700, marginBottom: 6
        }}>Your name at the table</div>
        <input
          ref={inputRef}
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={20}
          placeholder="Enter your name"
          style={{
            width:'100%',
            padding:'10px 14px',
            background:'rgba(10,6,3,.6)',
            border:'1px solid rgba(201,162,106,.4)',
            borderRadius: 8,
            color:'var(--ivory)',
            fontFamily:"'Playfair Display', serif",
            fontSize: 18, fontStyle:'italic',
            outline:'none', boxSizing:'border-box',
            marginBottom: 18
          }}
        />

        <div style={{
          fontSize: 10, letterSpacing:'.22em', color:'var(--brass)', textTransform:'uppercase',
          fontWeight: 700, marginBottom: 8
        }}>Bankroll: <span style={{ color:'var(--brass-2)' }}>${bankroll.toLocaleString()}</span></div>

        <div style={{ display:'flex', gap: 10 }}>
          {TH_BUYIN_TIERS.map(tier => {
            const affordable = bankroll >= tier.buyin;
            const picked = pickedTier && pickedTier.buyin === tier.buyin;
            return (
              <button
                key={tier.buyin}
                disabled={!affordable}
                onClick={() => setPickedTier(tier)}
                style={{
                  flex: 1, padding:'14px 12px',
                  background: picked
                    ? 'linear-gradient(180deg, #f5d896, #c9a26a)'
                    : (affordable
                      ? 'linear-gradient(180deg, rgba(40,28,18,.85), rgba(20,12,6,.95))'
                      : 'rgba(20,12,6,.5)'),
                  color: picked ? '#1a1208' : (affordable ? 'var(--ivory)' : 'rgba(255,255,255,.3)'),
                  border: picked ? '1px solid rgba(245,216,150,1)' : '1px solid rgba(201,162,106,.35)',
                  borderRadius: 10,
                  fontFamily:'inherit',
                  cursor: affordable ? 'pointer' : 'not-allowed',
                  textAlign:'center'
                }}
              >
                <div style={{
                  fontFamily:"'Playfair Display', serif",
                  fontStyle:'italic', fontSize: 19, fontWeight: 700,
                  letterSpacing:'.04em'
                }}>{tier.name}</div>
                <div style={{
                  fontSize: 11, letterSpacing:'.18em', textTransform:'uppercase',
                  marginTop: 4, opacity: .85
                }}>{tier.subtitle}</div>
                {!affordable && (
                  <div style={{
                    fontSize: 9, letterSpacing:'.18em', textTransform:'uppercase',
                    marginTop: 6, color:'#ff9286'
                  }}>Bankroll too low</div>
                )}
              </button>
            );
          })}
        </div>

        <div style={{ display:'flex', gap: 10, marginTop: 22, justifyContent:'center' }}>
          {onCancel && (
            <button type="button" onClick={onCancel} style={{
              padding:'10px 18px',
              background:'rgba(20,12,6,.6)',
              border:'1px solid rgba(201,162,106,.3)',
              borderRadius: 999,
              color:'var(--ivory-dim)',
              fontSize: 10, fontWeight: 700, letterSpacing:'.18em',
              textTransform:'uppercase', cursor:'pointer', fontFamily:'inherit'
            }}>Cancel</button>
          )}
          <button
            disabled={!pickedTier || !name.trim() || bankroll < (pickedTier?.buyin || 0)}
            onClick={() => pickedTier && tryJoin(pickedTier)}
            style={{
              padding:'10px 26px',
              background: (pickedTier && name.trim() && bankroll >= (pickedTier?.buyin || 0))
                ? 'linear-gradient(180deg, #f5d896, #c9a26a)'
                : 'rgba(201,162,106,.25)',
              border:'1px solid rgba(201,162,106,.5)',
              borderRadius: 999,
              color: (pickedTier && name.trim() && bankroll >= (pickedTier?.buyin || 0)) ? '#1a1208' : 'var(--ivory-dim)',
              fontSize: 10, fontWeight: 700, letterSpacing:'.18em',
              textTransform:'uppercase',
              cursor: (pickedTier && name.trim() && bankroll >= (pickedTier?.buyin || 0)) ? 'pointer' : 'not-allowed',
              fontFamily:'inherit'
            }}>Take a seat →</button>
        </div>
      </div>
    </div>
  );
}

function THBrokeModal({ playerName, message, onReload, onLeave }) {
  return (
    <div style={{
      position:'fixed', inset:0, zIndex:9000,
      background:'rgba(8,5,2,.7)', backdropFilter:'blur(8px)',
      display:'flex', alignItems:'center', justifyContent:'center'
    }}>
      <div style={{
        background:'linear-gradient(180deg, rgba(35,22,10,.95), rgba(20,12,6,.98))',
        border:'1px solid rgba(201,162,106,.5)', borderRadius:16,
        padding:'30px 36px 26px',
        boxShadow:'0 30px 80px rgba(0,0,0,.7)',
        minWidth:380, maxWidth:460,
        textAlign:'center'
      }}>
        <div style={{ fontSize:10, letterSpacing:'.32em', textTransform:'uppercase', color:'var(--ivory-dim)', marginBottom:6 }}>Limestone Hold'em</div>
        <div style={{
          fontFamily:"'Playfair Display', serif", fontStyle:'italic',
          fontSize:24, color:'var(--brass-2)', marginBottom:6, lineHeight:1.25
        }}>Out of chips.</div>
        <div style={{ fontSize:14, color:'var(--ivory-dim)', marginBottom:22, lineHeight:1.4 }}>
          {message || `Your stack is gone, ${playerName || 'friend'}. Reload to keep playing.`}
        </div>
        <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
          <button onClick={onLeave} style={{
            padding:'10px 18px', background:'rgba(20,12,6,.6)',
            border:'1px solid rgba(201,162,106,.3)', borderRadius:999,
            color:'var(--ivory-dim)', fontSize:10, fontWeight:700,
            letterSpacing:'.18em', textTransform:'uppercase',
            cursor:'pointer', fontFamily:'inherit'
          }}>Leave Table</button>
          <button onClick={onReload} style={{
            padding:'10px 22px',
            background:'linear-gradient(180deg, #e6c590, #c9a26a)',
            border:'1px solid rgba(201,162,106,.5)', borderRadius:999,
            color:'#1a1208', fontSize:10, fontWeight:700,
            letterSpacing:'.18em', textTransform:'uppercase',
            cursor:'pointer', fontFamily:'inherit'
          }}>Reload Bankroll</button>
        </div>
      </div>
    </div>
  );
}

function THConfirmModal({ title, body, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm, onCancel }) {
  return (
    <div style={{
      position:'fixed', inset:0, zIndex:9000,
      background:'rgba(8,5,2,.6)', backdropFilter:'blur(6px)',
      display:'flex', alignItems:'center', justifyContent:'center'
    }}>
      <div style={{
        background:'linear-gradient(180deg, rgba(35,22,10,.95), rgba(20,12,6,.98))',
        border:'1px solid rgba(201,162,106,.5)', borderRadius:14,
        padding:'24px 28px 22px',
        minWidth: 360, maxWidth: 440, textAlign:'center'
      }}>
        <div style={{
          fontFamily:"'Playfair Display', serif", fontStyle:'italic',
          fontSize: 20, color:'var(--brass-2)', marginBottom: 8
        }}>{title}</div>
        {body && <div style={{ fontSize: 13, color:'var(--ivory-dim)', marginBottom: 18, lineHeight: 1.4 }}>{body}</div>}
        <div style={{ display:'flex', gap: 10, justifyContent:'center' }}>
          <button onClick={onCancel} style={{
            padding:'9px 16px', background:'rgba(20,12,6,.6)',
            border:'1px solid rgba(201,162,106,.3)', borderRadius: 999,
            color:'var(--ivory-dim)', fontSize: 10, fontWeight: 700,
            letterSpacing:'.18em', textTransform:'uppercase',
            cursor:'pointer', fontFamily:'inherit'
          }}>{cancelLabel}</button>
          <button onClick={onConfirm} style={{
            padding:'9px 20px',
            background:'linear-gradient(180deg, #f5d896, #c9a26a)',
            border:'1px solid rgba(245,216,150,1)', borderRadius: 999,
            color:'#1a1208', fontSize: 10, fontWeight: 700,
            letterSpacing:'.18em', textTransform:'uppercase',
            cursor:'pointer', fontFamily:'inherit'
          }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  TH_CHIP_DEFS, TH_BUYIN_TIERS,
  THFeltBackdrop, THFeltLogo, THBrassRail, THRailStat, THPotDisplay,
  THCommunityCards, THActionZone, THActionButton, THHintPanel, THResultBanner,
  THLobbyModal, THBrokeModal, THConfirmModal
});
