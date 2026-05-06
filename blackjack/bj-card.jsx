/* eslint-disable */
// Playing card component — refined classical face design

const SUITS = {
  '♠': { color: '#0c1611', name: 'spade' },
  '♣': { color: '#0c1611', name: 'club' },
  '♥': { color: '#c0392b', name: 'heart' },
  '♦': { color: '#c0392b', name: 'diamond' }
};

const RANK_DISPLAY = {
  'A':'A','2':'2','3':'3','4':'4','5':'5','6':'6','7':'7','8':'8','9':'9','10':'10',
  'J':'J','Q':'Q','K':'K'
};

function CardCorner({ rank, suit, flip = false }) {
  const color = SUITS[suit].color;
  return (
    <div style={{
      position: 'absolute',
      ...(flip ? { bottom: 6, right: 8, transform: 'rotate(180deg)' } : { top: 6, left: 8 }),
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      lineHeight: 1, color
    }}>
      <span style={{
        fontSize: rank === '10' ? 14 : 17,
        fontWeight: 700,
        fontFamily: "'Playfair Display', serif",
        letterSpacing: '-.02em'
      }}>{rank}</span>
      <span style={{ fontSize: 13, marginTop: 1 }}>{suit}</span>
    </div>
  );
}

function CardFace({ rank, suit, w, h }) {
  const color = SUITS[suit].color;
  const isFace = rank === 'J' || rank === 'Q' || rank === 'K';

  return (
    <div style={{
      position:'absolute', inset:0,
      background: 'linear-gradient(180deg, #fffdf6 0%, #f5edd9 100%)',
      borderRadius: 10,
      boxShadow: '0 1px 0 rgba(255,255,255,.8) inset, 0 0 0 1px rgba(0,0,0,.1), 0 8px 18px rgba(0,0,0,.35), 0 2px 4px rgba(0,0,0,.2)',
      overflow:'hidden'
    }}>
      <CardCorner rank={rank} suit={suit} />
      <CardCorner rank={rank} suit={suit} flip />

      {/* Center artwork */}
      {!isFace && (
        <div style={{
          position:'absolute', inset:0, display:'flex',
          alignItems:'center', justifyContent:'center'
        }}>
          <div style={{
            position:'relative',
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
          position:'absolute', left: 14, right: 14, top: 24, bottom: 24,
          border:`1.5px solid ${color}`,
          borderRadius: 6,
          background: `repeating-linear-gradient(45deg, ${color}11 0 4px, transparent 4px 8px), linear-gradient(180deg, #fffdf6, #f0e7cf)`,
          display:'flex', alignItems:'center', justifyContent:'center',
          flexDirection:'column'
        }}>
          <div style={{
            fontFamily:"'Playfair Display', serif",
            fontStyle:'italic',
            fontSize: w*0.36,
            fontWeight: 700,
            color,
            textShadow:'0 1px 0 rgba(0,0,0,.06)',
            lineHeight: 1
          }}>{rank}</div>
          <div style={{ fontSize: w*0.18, color, marginTop: 2, fontFamily:'serif' }}>{suit}</div>
        </div>
      )}
    </div>
  );
}

function CardBack({ design = 'damask' }) {
  return (
    <div style={{
      position:'absolute', inset:0,
      borderRadius: 10,
      background: `
        repeating-linear-gradient(45deg, rgba(255,255,255,.04) 0 6px, transparent 6px 12px),
        repeating-linear-gradient(-45deg, rgba(255,255,255,.04) 0 6px, transparent 6px 12px),
        radial-gradient(circle at 50% 50%, #6e1d1d, #3a0f0f 70%)
      `,
      boxShadow: '0 0 0 1px rgba(0,0,0,.4), 0 8px 18px rgba(0,0,0,.35), inset 0 0 0 6px rgba(255,255,255,.06), inset 0 0 0 7px rgba(201,162,106,.5), inset 0 0 0 9px rgba(0,0,0,.25)',
      display:'flex',alignItems:'center',justifyContent:'center',
      overflow:'hidden'
    }}>
      <div style={{
        width:'72%',height:'82%',
        border:'1.5px solid rgba(201,162,106,.7)',
        borderRadius:6,
        display:'flex',alignItems:'center',justifyContent:'center',
        background:'radial-gradient(circle at 50% 50%, rgba(201,162,106,.15), transparent 70%)'
      }}>
        <span style={{
          fontFamily:"'Playfair Display', serif",
          fontSize: 24, color:'rgba(230,197,144,.85)',
          fontStyle:'italic', letterSpacing:'.1em'
        }}>LG</span>
      </div>
    </div>
  );
}

function PlayingCard({ rank, suit, faceDown = false, w = 78, h = 110, dealIndex = 0, fromX = 360, fromY = -240, glow = false }) {
  return (
    <div className="card-shell deal-in" style={{
      width:w, height:h, position:'relative',
      animationDelay: `${dealIndex * 0.12}s`,
      '--from-x': `${fromX}px`,
      '--from-y': `${fromY}px`,
      filter: glow ? 'drop-shadow(0 0 18px rgba(230,197,144,.7))' : 'none',
      transition: 'filter .3s ease'
    }}>
      <div className={`card-flip ${faceDown ? 'face-down' : ''}`} style={{
        width:'100%', height:'100%', position:'relative'
      }}>
        <div className="card-face">
          <CardFace rank={rank} suit={suit} w={w} h={h} />
        </div>
        <div className="card-back">
          <CardBack />
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { PlayingCard, CardBack, CardFace, SUITS });
