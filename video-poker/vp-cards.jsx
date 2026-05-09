/* eslint-disable */
// Card rendering — same aesthetic as bj-card.jsx (rank+suit corners + center suit glyph,
// face-card border for J/Q/K). Plus a CardSlot wrapper that handles HOLD toggle + glow.

const SUITS = {
  '♠': { color: '#0c1611', name: 'spade' },
  '♣': { color: '#0c1611', name: 'club' },
  '♥': { color: '#c0392b', name: 'heart' },
  '♦': { color: '#c0392b', name: 'diamond' }
};

function CardCorner({ rank, suit, flip = false, w = 110 }) {
  const color = SUITS[suit].color;
  const rankFs = rank === '10' ? Math.round(w * 0.19) : Math.round(w * 0.23);
  const suitFs = Math.round(w * 0.19);
  return (
    <div style={{
      position:'absolute',
      ...(flip ? { bottom:6, right:8, transform:'rotate(180deg)' } : { top:6, left:8 }),
      display:'flex', flexDirection:'column', alignItems:'center',
      lineHeight:1, color
    }}>
      <span style={{
        fontSize: rankFs,
        fontWeight:700,
        fontFamily:"'Playfair Display', serif",
        letterSpacing:'-.02em'
      }}>{rank}</span>
      <span style={{ fontSize: suitFs, marginTop:1 }}>{suit}</span>
    </div>
  );
}

function CardFace({ rank, suit, w }) {
  return (
    <div style={{
      position:'absolute', inset:0,
      background:'#fffdf6',
      borderRadius:10,
      boxShadow:'0 1px 0 rgba(255,255,255,.8) inset, 0 0 0 1px rgba(0,0,0,.1), 0 8px 18px rgba(0,0,0,.35), 0 2px 4px rgba(0,0,0,.2)',
      overflow:'hidden',
      ...window.CASINO_CARDS.faceStyle(rank, suit)
    }} />
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
      <img src="../assets/logo-96.png" alt="" style={{ width:'52%', height:'auto', filter:'drop-shadow(0 2px 4px rgba(0,0,0,.6))' }}/>
    </div>
  );
}

// SUIT_GLYPHS maps card.suit (hearts/diamonds/clubs/spades) to the symbol PlayingCard expects.
const SUIT_GLYPHS = { hearts:'♥', diamonds:'♦', clubs:'♣', spades:'♠' };

// CardSlot — one of five slots in the row. Clickable to toggle hold.
function CardSlot({ card, held, onToggleHold, dealIndex = 0, faceDown = false, justDrew = false, w = 110, h = 155 }) {
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
