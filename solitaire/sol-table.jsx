/* eslint-disable */
// Solitaire table — felt, brass rail, stock/waste, foundations, tableau columns.

const SUIT_COLORS = { '♠':'#0c1611', '♣':'#0c1611', '♥':'#c0392b', '♦':'#c0392b' };

function FeltBackdrop({ children }) {
  return (
    <div style={{
      position:'absolute', inset:0, borderRadius: 18, overflow:'hidden',
      background: `
        radial-gradient(ellipse 110% 75% at 50% 38%, #1a5040 0%, #0e3a2e 45%, #0a2a21 80%),
        #0a2a21
      `,
      boxShadow:'var(--shadow-deep), inset 0 0 0 1px rgba(201,162,106,.18), inset 0 0 80px rgba(0,0,0,.5)'
    }}>
      <div style={{
        position:'absolute', inset: 0,
        backgroundImage: 'url(assets/table/felt.png)',
        backgroundSize: 'cover',
        opacity: .25,
        mixBlendMode: 'overlay'
      }} />
      <svg style={{position:'absolute', inset:0, width:'100%', height:'100%', opacity:.5}}>
        <filter id="solnoise">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/>
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .12 0"/>
        </filter>
        <rect width="100%" height="100%" filter="url(#solnoise)"/>
      </svg>
      {children}
    </div>
  );
}

function RailButton({ label, onClick, disabled, accent, sub, glow }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        position:'relative',
        padding:'6px 10px',
        minWidth: 56,
        background: disabled
          ? 'rgba(20,12,6,.45)'
          : accent
            ? 'linear-gradient(180deg, #f5d896, #c9a26a)'
            : 'linear-gradient(180deg, rgba(40,28,18,.95), rgba(20,12,6,.95))',
        color: disabled ? 'rgba(255,255,255,.3)' : accent ? '#1a1208' : 'var(--ivory)',
        border: `1px solid ${accent ? 'rgba(230,197,144,.9)' : 'rgba(201,162,106,.35)'}`,
        borderRadius: 9,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing:'.14em',
        textTransform:'uppercase',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all .18s ease',
        boxShadow: accent
          ? '0 6px 16px rgba(230,197,144,.4), inset 0 1px 0 rgba(255,255,255,.4)'
          : '0 4px 10px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.06)',
        fontFamily:'inherit',
        animation: glow ? 'glowPulse 1.6s ease-in-out infinite' : 'none'
      }}
      onMouseEnter={e => {
        if (disabled) return;
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'none';
      }}
    >
      <div>{label}</div>
      {sub && <div style={{ fontSize: 8, opacity:.7, marginTop: 1, letterSpacing:'.18em' }}>{sub}</div>}
    </button>
  );
}

function ScoreBoard({ score, moves, time, best }) {
  const stat = (label, value, color) => (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', minWidth: 46 }}>
      <div style={{ fontSize: 8, letterSpacing:'.22em', textTransform:'uppercase', color:'var(--ivory-dim)', fontWeight: 600 }}>{label}</div>
      <div style={{
        fontFamily:"'Playfair Display', serif",
        fontSize: 16, fontWeight: 700, color: color || 'var(--ivory)', lineHeight: 1.1, letterSpacing:'.02em'
      }}>{value}</div>
    </div>
  );
  const dollar = (n) => (n >= 0 ? '+$' : '-$') + Math.abs(n);
  return (
    <div style={{
      display:'flex', alignItems:'center', gap: 12,
      padding:'6px 12px',
      background:'rgba(0,0,0,.45)',
      backdropFilter:'blur(6px)',
      borderRadius: 12,
      border:'1px solid rgba(201,162,106,.3)'
    }}>
      {stat('Score', dollar(score), score >= 0 ? 'var(--brass-2)' : '#ff8a7a')}
      {stat('Time', time)}
      {stat('Moves', moves)}
      {stat('Best', best == null ? '—' : dollar(best), 'var(--brass-2)')}
    </div>
  );
}

function BrassRail({
  score, moves, time, best,
  onUndo, canUndo,
  onRedo, canRedo,
  onHint,
  onAutoComplete, canAutoComplete,
  onNewDeal
}) {
  return (
    <div style={{
      position:'absolute', top: 14, left: 18, right: 60, height: 56, zIndex: 5,
      display:'flex', alignItems:'center', gap: 10
    }}>
      <a href="../casino/" title="Back to casino" style={{
        display:'inline-flex', alignItems:'center',
        padding:'6px 12px',
        background:'rgba(20,12,6,.6)',
        color:'var(--brass-2)',
        border:'1px solid rgba(201,162,106,.5)',
        borderRadius: 999,
        fontSize: 10, fontWeight: 700, letterSpacing:'.18em',
        textTransform:'uppercase', textDecoration:'none', whiteSpace:'nowrap',
        boxShadow:'0 2px 6px rgba(0,0,0,.3)'
      }}>← Lobby</a>
      <a href="../casino/" title="Back to casino" style={{
        display:'flex', alignItems:'center', gap: 10, paddingRight: 14,
        borderRight:'1px solid rgba(201,162,106,.2)',
        textDecoration:'none', color:'inherit'
      }}>
        <div style={{
          width: 28, height: 28, borderRadius:'50%',
          background:'radial-gradient(circle at 35% 30%, #f5d896, #8c6a3f 75%)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontFamily:"'Playfair Display', serif",
          color:'#1a1208', fontSize: 14, fontWeight: 800, fontStyle:'italic',
          boxShadow:'inset 0 1px 0 rgba(255,255,255,.4), 0 2px 6px rgba(0,0,0,.4)'
        }}>L</div>
        <div>
          <div style={{
            fontFamily:"'Playfair Display', serif",
            fontSize: 15, color:'var(--brass-2)',
            fontStyle:'italic', fontWeight: 600, letterSpacing:'.02em', lineHeight: 1, whiteSpace:'nowrap'
          }}>Limestone Games</div>
          <div style={{ fontSize: 8, letterSpacing:'.28em', color:'var(--ivory-dim)', textTransform:'uppercase', marginTop: 3, whiteSpace:'nowrap' }}>
            Klondike · Private Table 07
          </div>
        </div>
      </a>
      <ScoreBoard score={score} moves={moves} time={time} best={best} />
      <div style={{ display:'flex', gap: 6, marginLeft:'auto' }}>
        <RailButton label="Undo" sub="⌘Z" onClick={onUndo} disabled={!canUndo} />
        <RailButton label="Redo" sub="⌘⇧Z" onClick={onRedo} disabled={!canRedo} />
        <RailButton label="Hint" onClick={onHint} />
        {canAutoComplete && (
          <RailButton label="Auto-finish" accent onClick={onAutoComplete} glow />
        )}
        <RailButton label="Deal" onClick={onNewDeal} />
      </div>
    </div>
  );
}

function PileSlot({ label, w = 84, h = 118, children, onClick, glow, dim, label_sub }) {
  return (
    <div onClick={onClick} style={{
      position:'relative',
      width: w, height: h,
      borderRadius: 10,
      border: '1.5px dashed rgba(201,162,106,.35)',
      background: 'rgba(0,0,0,.18)',
      cursor: onClick ? 'pointer' : 'default',
      animation: glow ? 'glowPulse 1.6s ease-in-out infinite' : 'none',
      opacity: dim ? .5 : 1
    }}>
      {!children && label && (
        <div style={{
          position:'absolute', inset:0,
          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
          color:'rgba(201,162,106,.55)', fontFamily:"'Playfair Display', serif",
          fontSize: 28, fontStyle:'italic', userSelect:'none', pointerEvents:'none'
        }}>
          {label}
          {label_sub && <div style={{ fontSize: 9, marginTop: 4, letterSpacing:'.2em', textTransform:'uppercase', fontStyle:'normal', fontFamily:'inherit' }}>{label_sub}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

function StockPile({ stock, waste, onDraw, drawMode, passes, isHinted }) {
  const empty = stock.length === 0;
  return (
    <div onClick={onDraw} style={{
      position:'relative', width: 84, height: 118,
      borderRadius: 10,
      border: empty ? '1.5px dashed rgba(201,162,106,.55)' : 'none',
      background: empty ? 'rgba(0,0,0,.18)' : 'transparent',
      cursor: 'pointer',
      animation: isHinted ? 'glowPulse 1.6s ease-in-out infinite' : 'none',
      filter: isHinted && !empty ? 'drop-shadow(0 0 18px rgba(230,197,144,.85))' : 'none',
      transition: 'filter .3s ease'
    }}>
      {empty ? (
        <div style={{
          position:'absolute', inset:0,
          display:'flex', alignItems:'center', justifyContent:'center',
          color:'rgba(201,162,106,.6)', fontSize: 28, fontFamily:"'Playfair Display', serif"
        }}>↻</div>
      ) : (
        <>
          {/* layered shadow effect for stack thickness */}
          {stock.length > 1 && (
            <div style={{
              position:'absolute', inset:'-2px -1px 2px 1px',
              borderRadius: 10,
              background: 'rgba(60,30,30,.4)',
              boxShadow: '0 6px 14px rgba(0,0,0,.3)'
            }} />
          )}
          <div style={{ position:'absolute', inset:0 }}>
            <PlayingCard rank="A" suit="♠" faceDown w={84} h={118} />
          </div>
          {stock.length > 1 && (
            <div style={{
              position:'absolute', bottom: 4, right: 6,
              fontSize: 11, fontWeight: 700, color:'var(--brass-2)',
              background:'rgba(0,0,0,.5)', padding:'2px 6px', borderRadius: 4,
              fontFamily:"'JetBrains Mono', monospace", letterSpacing:'.04em'
            }}>{stock.length}</div>
          )}
        </>
      )}
    </div>
  );
}

function WastePile({ waste, drawMode, selection, onSelect, onDblClick, onCardPointerDown, dragSource }) {
  if (!waste.length) {
    return <PileSlot label="·" />;
  }
  const visibleCount = Math.min(drawMode === 3 ? 3 : 1, waste.length);
  const startIdx = waste.length - visibleCount;
  const isSelected = selection && selection.source === 'waste';
  const draggingTop = dragSource && dragSource.source === 'waste';
  return (
    <div style={{ position:'relative', width: 84 + (visibleCount - 1) * 22, height: 118 }}>
      {waste.slice(startIdx).map((card, i) => {
        const absIdx = startIdx + i;
        const isTop = absIdx === waste.length - 1;
        return (
          <div key={card.id} style={{
            position:'absolute', left: i * 22, top: 0
          }}>
            <PlayingCard
              rank={card.rank}
              suit={card.suit}
              w={84}
              h={118}
              selected={isTop && isSelected}
              hidden={isTop && draggingTop}
              onClick={isTop ? onSelect : undefined}
              onDoubleClick={isTop ? onDblClick : undefined}
              onPointerDown={isTop ? onCardPointerDown : undefined}
            />
          </div>
        );
      })}
    </div>
  );
}

function FoundationSlot({ suit, cards, onClick, glow, isHinted }) {
  const top = cards[cards.length - 1];
  if (!top) {
    const color = SUIT_COLORS[suit];
    return (
      <div onClick={onClick} style={{
        position:'relative', width: 84, height: 118, borderRadius: 10,
        border: '1.5px dashed rgba(201,162,106,.4)',
        background: 'rgba(0,0,0,.18)',
        display:'flex', alignItems:'center', justifyContent:'center',
        cursor: onClick ? 'pointer' : 'default',
        animation: (glow || isHinted) ? 'glowPulse 1.6s ease-in-out infinite' : 'none'
      }}>
        <span style={{
          fontSize: 44, color, opacity:.35,
          fontFamily:'serif', lineHeight: 1
        }}>{suit}</span>
      </div>
    );
  }
  return (
    <div onClick={onClick} style={{
      position:'relative', width: 84, height: 118,
      cursor: onClick ? 'pointer' : 'default',
      filter: (glow || isHinted) ? 'drop-shadow(0 0 18px rgba(230,197,144,.85))' : 'none',
      transition: 'filter .3s ease'
    }}>
      <PlayingCard rank={top.rank} suit={top.suit} w={84} h={118} />
    </div>
  );
}

function TableauColumn({ col, cards, selection, hintIds, onCardClick, onEmptyClick }) {
  if (cards.length === 0) {
    return (
      <div onClick={onEmptyClick} style={{
        width: 84, height: 118, borderRadius: 10,
        border: '1.5px dashed rgba(201,162,106,.4)',
        background: 'rgba(0,0,0,.18)',
        display:'flex', alignItems:'center', justifyContent:'center',
        cursor:'pointer'
      }}>
        <span style={{ fontSize: 30, color:'rgba(201,162,106,.4)', fontFamily:"'Playfair Display', serif" }}>♚</span>
      </div>
    );
  }
  const offsets = [];
  let cum = 0;
  for (let i = 0; i < cards.length; i++) {
    offsets.push(cum);
    cum += cards[i].faceUp ? 26 : 8;
  }
  const totalH = offsets[offsets.length - 1] + 118;

  return (
    <div style={{ position:'relative', width: 84, height: Math.max(totalH, 118) }}>
      {cards.map((card, i) => {
        const isSelected = selection
          && selection.source === 'tableau'
          && selection.col === col
          && i >= selection.idx;
        const hinted = hintIds && hintIds.includes(card.id);
        return (
          <div key={card.id} style={{
            position:'absolute', left:0, top: offsets[i] - (isSelected ? 6 : 0),
            transition: 'top .15s ease'
          }}>
            <PlayingCard
              rank={card.rank}
              suit={card.suit}
              faceDown={!card.faceUp}
              w={84} h={118}
              selected={isSelected}
              glow={hinted}
              onClick={() => onCardClick(col, i, card)}
            />
          </div>
        );
      })}
    </div>
  );
}

function WinBanner({ score, time, moves, onNewDeal }) {
  return (
    <div style={{
      position:'absolute', inset:0, zIndex: 50,
      display:'flex', alignItems:'center', justifyContent:'center',
      background:'radial-gradient(ellipse at 50% 50%, rgba(20,40,30,.6) 0%, rgba(0,0,0,.7) 80%)',
      backdropFilter:'blur(2px)'
    }}>
      <div className="banner-in" style={{
        padding:'34px 56px',
        background:'linear-gradient(180deg, rgba(40,28,18,.95), rgba(20,12,6,.95))',
        border:'1px solid rgba(230,197,144,.8)',
        borderRadius: 18,
        boxShadow:'0 30px 80px rgba(0,0,0,.6), 0 0 60px rgba(230,197,144,.3)',
        textAlign:'center', minWidth: 360
      }}>
        <div style={{
          fontSize: 12, letterSpacing:'.4em', color:'var(--brass-2)',
          textTransform:'uppercase', fontWeight: 700, marginBottom: 6
        }}>You cleared the deck</div>
        <div style={{
          fontFamily:"'Playfair Display', serif", fontSize: 56, fontStyle:'italic',
          color:'var(--brass-2)', fontWeight: 700, lineHeight: 1, marginBottom: 14,
          textShadow:'0 4px 20px rgba(230,197,144,.4)'
        }}>Klondike</div>
        <div style={{
          display:'flex', justifyContent:'center', gap: 28,
          paddingTop: 12, paddingBottom: 18,
          borderTop:'1px solid rgba(201,162,106,.25)'
        }}>
          <div>
            <div style={{ fontSize: 9, letterSpacing:'.22em', color:'var(--ivory-dim)', textTransform:'uppercase' }}>Score</div>
            <div style={{ fontFamily:"'Playfair Display', serif", fontSize: 26, color:'var(--brass-2)', fontWeight: 700 }}>+${score}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, letterSpacing:'.22em', color:'var(--ivory-dim)', textTransform:'uppercase' }}>Time</div>
            <div style={{ fontFamily:"'Playfair Display', serif", fontSize: 26, color:'var(--ivory)', fontWeight: 700 }}>{time}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, letterSpacing:'.22em', color:'var(--ivory-dim)', textTransform:'uppercase' }}>Moves</div>
            <div style={{ fontFamily:"'Playfair Display', serif", fontSize: 26, color:'var(--ivory)', fontWeight: 700 }}>{moves}</div>
          </div>
        </div>
        <button onClick={onNewDeal} style={{
          padding:'14px 32px',
          background:'linear-gradient(180deg, #f5d896, #c9a26a)',
          color:'#1a1208',
          border:'1px solid rgba(245,216,150,1)',
          borderRadius: 10,
          fontFamily:"'Playfair Display', serif",
          fontStyle:'italic', fontSize: 18, fontWeight: 700,
          cursor:'pointer',
          boxShadow:'0 8px 22px rgba(230,197,144,.4)'
        }}>New Deal →</button>
      </div>
    </div>
  );
}

function StuckBanner({ onNewDeal, onUndo, canUndo }) {
  return (
    <div style={{
      position:'absolute', left: '50%', bottom: 14, transform:'translateX(-50%)',
      zIndex: 30,
      padding:'12px 20px',
      background:'rgba(80,20,20,.85)',
      border:'1px solid rgba(255,180,160,.6)',
      borderRadius: 12,
      backdropFilter:'blur(6px)',
      display:'flex', alignItems:'center', gap: 14,
      boxShadow:'0 12px 30px rgba(0,0,0,.5)'
    }}>
      <span style={{
        fontFamily:"'Playfair Display', serif", fontSize: 16, fontStyle:'italic',
        color:'#ffd5cc'
      }}>No more legal moves.</span>
      {canUndo && (
        <button onClick={onUndo} style={{
          padding:'6px 14px',
          background:'rgba(20,12,6,.7)',
          color:'var(--ivory)',
          border:'1px solid rgba(201,162,106,.45)',
          borderRadius: 8, fontSize: 11, letterSpacing:'.16em',
          textTransform:'uppercase', fontWeight: 600, cursor:'pointer', fontFamily:'inherit'
        }}>Undo</button>
      )}
      <button onClick={onNewDeal} style={{
        padding:'6px 14px',
        background:'linear-gradient(180deg, #f5d896, #c9a26a)',
        color:'#1a1208', border:'1px solid rgba(245,216,150,1)',
        borderRadius: 8, fontSize: 11, letterSpacing:'.16em',
        textTransform:'uppercase', fontWeight: 700, cursor:'pointer', fontFamily:'inherit'
      }}>New deal</button>
    </div>
  );
}

function NameModal({ initial, onSave, onCancel }) {
  const [v, setV] = React.useState(initial || '');
  return (
    <div style={{
      position:'absolute', inset:0, zIndex: 100,
      background:'rgba(0,0,0,.6)', backdropFilter:'blur(4px)',
      display:'flex', alignItems:'center', justifyContent:'center'
    }}>
      <div style={{
        padding:'24px 32px',
        background:'linear-gradient(180deg, rgba(40,28,18,.97), rgba(20,12,6,.97))',
        border:'1px solid rgba(201,162,106,.5)',
        borderRadius: 14,
        minWidth: 320,
        boxShadow:'0 30px 80px rgba(0,0,0,.7)'
      }}>
        <div style={{ fontSize: 11, letterSpacing:'.22em', color:'var(--brass-2)', textTransform:'uppercase', fontWeight: 700, marginBottom: 10 }}>Your name</div>
        <input
          autoFocus
          value={v}
          onChange={e => setV(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && v.trim()) onSave(v); }}
          placeholder="What should we call you?"
          maxLength={20}
          style={{
            width:'100%', padding:'10px 14px',
            background:'rgba(0,0,0,.4)', color:'var(--ivory)',
            border:'1px solid rgba(201,162,106,.4)',
            borderRadius: 8,
            fontFamily:"'Playfair Display', serif",
            fontSize: 18, outline:'none'
          }}
        />
        <div style={{ display:'flex', gap: 10, marginTop: 14, justifyContent:'flex-end' }}>
          {onCancel && (
            <button onClick={onCancel} style={{
              padding:'8px 18px',
              background:'rgba(20,12,6,.7)', color:'var(--ivory)',
              border:'1px solid rgba(201,162,106,.35)', borderRadius: 8,
              fontSize: 11, letterSpacing:'.16em', textTransform:'uppercase',
              fontWeight: 600, cursor:'pointer', fontFamily:'inherit'
            }}>Cancel</button>
          )}
          <button onClick={() => v.trim() && onSave(v)} style={{
            padding:'8px 18px',
            background:'linear-gradient(180deg, #f5d896, #c9a26a)', color:'#1a1208',
            border:'1px solid rgba(245,216,150,1)', borderRadius: 8,
            fontSize: 11, letterSpacing:'.16em', textTransform:'uppercase',
            fontWeight: 700, cursor:'pointer', fontFamily:'inherit'
          }}>Start playing</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  FeltBackdrop, BrassRail, ScoreBoard, RailButton,
  StockPile, WastePile, FoundationSlot, TableauColumn,
  WinBanner, StuckBanner, NameModal, PileSlot
});
