/* eslint-disable */
// Playing card — port of bj-card.jsx, adapted for 3CP.

const TCP_SUITS = {
  '♠': { color: '#0c1611' },
  '♣': { color: '#0c1611' },
  '♥': { color: '#c0392b' },
  '♦': { color: '#c0392b' }
};

function TCPCardCorner({ rank, suit, flip = false, w = 78 }) {
  const color = TCP_SUITS[suit].color;
  const rankFs = rank === '10' ? Math.round(w * 0.19) : Math.round(w * 0.23);
  const suitFs = Math.round(w * 0.19);
  return (
    <div style={{
      position: 'absolute',
      ...(flip ? { bottom: 6, right: 8, transform: 'rotate(180deg)' } : { top: 6, left: 8 }),
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      lineHeight: 1, color
    }}>
      <span style={{
        fontSize: rankFs,
        fontWeight: 700,
        fontFamily: "'Playfair Display', serif",
        letterSpacing: '-.02em'
      }}>{rank}</span>
      <span style={{ fontSize: suitFs, marginTop: 1 }}>{suit}</span>
    </div>
  );
}

function TCPCardFace({ rank, suit, w }) {
  const color = TCP_SUITS[suit].color;
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'linear-gradient(180deg, #fffdf6 0%, #f5edd9 100%)',
      borderRadius: 10,
      boxShadow: '0 1px 0 rgba(255,255,255,.8) inset, 0 0 0 1px rgba(0,0,0,.1), 0 8px 18px rgba(0,0,0,.35), 0 2px 4px rgba(0,0,0,.2)',
      overflow: 'hidden'
    }}>
      <TCPCardCorner rank={rank} suit={suit} w={w} />
      <TCPCardCorner rank={rank} suit={suit} w={w} flip />

      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center'
      }}>
        <div style={{
          position: 'relative',
          width: w * 0.62, height: w * 0.62,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'radial-gradient(circle, rgba(201,162,106,.18) 0%, transparent 65%)'
        }}>
          <span style={{ fontSize: w * 0.6, color, lineHeight: 1, fontFamily: 'serif' }}>{suit}</span>
        </div>
      </div>
    </div>
  );
}

function TCPCardBack() {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      borderRadius: 10,
      background: `
        repeating-linear-gradient(45deg, rgba(255,255,255,.04) 0 6px, transparent 6px 12px),
        repeating-linear-gradient(-45deg, rgba(255,255,255,.04) 0 6px, transparent 6px 12px),
        radial-gradient(circle at 50% 50%, #6e1d1d, #3a0f0f 70%)
      `,
      boxShadow: '0 0 0 1px rgba(0,0,0,.4), 0 8px 18px rgba(0,0,0,.35), inset 0 0 0 6px rgba(255,255,255,.06), inset 0 0 0 7px rgba(201,162,106,.5), inset 0 0 0 9px rgba(0,0,0,.25)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden'
    }}>
      <img src="../assets/logo-96.png" alt="" style={{
        width: '52%', height: 'auto',
        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.6))'
      }}/>
    </div>
  );
}

function PlayingCard({ rank, suit, faceDown = false, w = 78, h = 110, dealIndex = 0, fromX = 360, fromY = -240, glow = false }) {
  return (
    <div className="card-shell deal-in" style={{
      width: w, height: h, position: 'relative',
      animationDelay: `${dealIndex * 0.12}s`,
      '--from-x': `${fromX}px`,
      '--from-y': `${fromY}px`,
      filter: glow ? 'drop-shadow(0 0 18px rgba(230,197,144,.7))' : 'none',
      transition: 'filter .3s ease'
    }}>
      <div className={`card-flip ${faceDown ? 'face-down' : ''}`} style={{
        width: '100%', height: '100%', position: 'relative'
      }}>
        <div className="card-face">
          <TCPCardFace rank={rank} suit={suit} w={w} h={h} />
        </div>
        <div className="card-back">
          <TCPCardBack />
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { PlayingCard, TCP_SUITS });
