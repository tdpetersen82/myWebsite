/* eslint-disable */
// Card rendering — same aesthetic as bj-card.jsx (rank+suit corners + center suit glyph,
// face-card border for J/Q/K). Plus a CardSlot wrapper that handles HOLD toggle + glow.

const SUITS = {
  '♠': { color: '#0c1611', name: 'spade' },
  '♣': { color: '#0c1611', name: 'club' },
  '♥': { color: '#c0392b', name: 'heart' },
  '♦': { color: '#c0392b', name: 'diamond' }
};

function CardCorner({ rank, suit, flip = false }) {
  const color = SUITS[suit].color;
  return (
    <div style={{
      position:'absolute',
      ...(flip ? { bottom:6, right:8, transform:'rotate(180deg)' } : { top:6, left:8 }),
      display:'flex', flexDirection:'column', alignItems:'center',
      lineHeight:1, color
    }}>
      <span style={{
        fontSize: rank === '10' ? 16 : 19,
        fontWeight:700,
        fontFamily:"'Playfair Display', serif",
        letterSpacing:'-.02em'
      }}>{rank}</span>
      <span style={{ fontSize:14, marginTop:1 }}>{suit}</span>
    </div>
  );
}

function CardFace({ rank, suit, w }) {
  const color = SUITS[suit].color;
  const isFace = rank === 'J' || rank === 'Q' || rank === 'K';
  return (
    <div style={{
      position:'absolute', inset:0,
      background:'linear-gradient(180deg, #fffdf6 0%, #f5edd9 100%)',
      borderRadius:10,
      boxShadow:'0 1px 0 rgba(255,255,255,.8) inset, 0 0 0 1px rgba(0,0,0,.1), 0 8px 18px rgba(0,0,0,.35), 0 2px 4px rgba(0,0,0,.2)',
      overflow:'hidden'
    }}>
      <CardCorner rank={rank} suit={suit} />
      <CardCorner rank={rank} suit={suit} flip />

      {!isFace && (
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{
            width: w*0.62, height: w*0.62,
            display:'flex', alignItems:'center', justifyContent:'center',
            background:'radial-gradient(circle, rgba(201,162,106,.18) 0%, transparent 65%)'
          }}>
            <span style={{ fontSize: w*0.6, color, lineHeight:1, fontFamily:'serif' }}>{suit}</span>
          </div>
        </div>
      )}

      {isFace && (
        <div style={{
          position:'absolute', left:14, right:14, top:24, bottom:24,
          border:`1.5px solid ${color}`,
          borderRadius:6,
          background:`repeating-linear-gradient(45deg, ${color}11 0 4px, transparent 4px 8px), linear-gradient(180deg, #fffdf6, #f0e7cf)`,
          display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column'
        }}>
          <div style={{
            fontFamily:"'Playfair Display', serif",
            fontStyle:'italic',
            fontSize: w*0.36, fontWeight:700, color,
            textShadow:'0 1px 0 rgba(0,0,0,.06)', lineHeight:1
          }}>{rank}</div>
          <div style={{ fontSize: w*0.18, color, marginTop:2, fontFamily:'serif' }}>{suit}</div>
        </div>
      )}
    </div>
  );
}

function CardBack() {
  return (
    <div style={{
      position:'absolute', inset:0,
      borderRadius:10,
      background:`
        repeating-linear-gradient(45deg, rgba(255,255,255,.04) 0 6px, transparent 6px 12px),
        repeating-linear-gradient(-45deg, rgba(255,255,255,.04) 0 6px, transparent 6px 12px),
        radial-gradient(circle at 50% 50%, #6e1d1d, #3a0f0f 70%)`,
      boxShadow:'0 0 0 1px rgba(0,0,0,.4), 0 8px 18px rgba(0,0,0,.35), inset 0 0 0 6px rgba(255,255,255,.06), inset 0 0 0 7px rgba(201,162,106,.5), inset 0 0 0 9px rgba(0,0,0,.25)',
      display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden'
    }}>
      <div style={{
        width:'72%', height:'82%',
        border:'1.5px solid rgba(201,162,106,.7)',
        borderRadius:6,
        display:'flex', alignItems:'center', justifyContent:'center',
        background:'radial-gradient(circle at 50% 50%, rgba(201,162,106,.15), transparent 70%)'
      }}>
        <span style={{ fontFamily:"'Playfair Display', serif", fontSize:24, color:'rgba(230,197,144,.85)', fontStyle:'italic', letterSpacing:'.1em' }}>VP</span>
      </div>
    </div>
  );
}

// SUIT_GLYPHS maps card.suit (hearts/diamonds/clubs/spades) to the symbol PlayingCard expects.
const SUIT_GLYPHS = { hearts:'♥', diamonds:'♦', clubs:'♣', spades:'♠' };

// CardSlot — one of five slots in the row. Clickable to toggle hold.
function CardSlot({ card, held, onToggleHold, dealIndex = 0, faceDown = false, justDrew = false, w = 110, h = 156 }) {
  const ranklike = card?.rank;
  const suitGlyph = card ? SUIT_GLYPHS[card.suit] : null;

  return (
    <div style={{ position:'relative', width: w, display:'flex', flexDirection:'column', alignItems:'center', gap: 8 }}>
      <div style={{ height: 22, display:'flex', alignItems:'center' }}>
        {held && (
          <div style={{
            padding:'3px 12px',
            borderRadius:999,
            background:'linear-gradient(180deg, #e6c590, #c9a26a)',
            color:'#1a1208',
            fontSize:10, fontWeight:800, letterSpacing:'.2em', textTransform:'uppercase',
            boxShadow:'0 2px 8px rgba(230,197,144,.4)'
          }}>HOLD</div>
        )}
      </div>
      <div
        onClick={card ? onToggleHold : undefined}
        className={`card-shell ${justDrew ? 'flip-card' : (card ? 'deal-in' : '')} ${held ? 'hold-glow' : ''}`}
        style={{
          width: w, height: h,
          position:'relative',
          cursor: card ? 'pointer' : 'default',
          borderRadius: 10,
          animationDelay: `${dealIndex * 0.12}s`,
          '--from-x': '180px',
          '--from-y': '-280px'
        }}
      >
        {card ? (
          <div className={`card-flip ${faceDown ? 'face-down' : ''}`} style={{ width:'100%', height:'100%', position:'relative' }}>
            <div className="card-face">
              <CardFace rank={ranklike} suit={suitGlyph} w={w} />
            </div>
            <div className="card-back">
              <CardBack />
            </div>
          </div>
        ) : (
          <div style={{
            position:'absolute', inset:0,
            border:'2px dashed rgba(201,162,106,.35)',
            borderRadius:10,
            background:'rgba(0,0,0,.25)'
          }}/>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { CardSlot, SUITS, SUIT_GLYPHS });
