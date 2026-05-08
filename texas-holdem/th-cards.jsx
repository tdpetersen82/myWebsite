/* eslint-disable */
// Card rendering for Texas Hold'em. Mirrors the look of blackjack/bj-card.jsx
// but renders at multiple sizes (community vs. hole vs. opponent mini-card).

const TH_SUITS = {
  '♠': { color: '#0c1611', name: 'spade' },
  '♣': { color: '#0c1611', name: 'club' },
  '♥': { color: '#c0392b', name: 'heart' },
  '♦': { color: '#c0392b', name: 'diamond' }
};

const TH_SUIT_GLYPHS = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };

function THCardCorner({ rank, suit, w, flip = false }) {
  const color = TH_SUITS[suit].color;
  const fontSize = w < 60 ? (rank === '10' ? 13 : 15) : (rank === '10' ? 16 : 19);
  const suitSize = w < 60 ? 12 : 15;
  return (
    <div style={{
      position: 'absolute',
      ...(flip
        ? { bottom: w < 60 ? 4 : 6, right: w < 60 ? 5 : 8, transform: 'rotate(180deg)' }
        : { top: w < 60 ? 4 : 6, left: w < 60 ? 5 : 8 }),
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      lineHeight: 1, color
    }}>
      <span style={{
        fontSize,
        fontWeight: 700,
        fontFamily: "'Playfair Display', serif",
        letterSpacing: '-.02em'
      }}>{rank}</span>
      <span style={{ fontSize: suitSize, marginTop: 1 }}>{suit}</span>
    </div>
  );
}

function THCardFace({ rank, suit, w }) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: '#fffdf6',
      borderRadius: 10,
      boxShadow: '0 1px 0 rgba(255,255,255,.8) inset, 0 0 0 1px rgba(0,0,0,.1), 0 8px 18px rgba(0,0,0,.35), 0 2px 4px rgba(0,0,0,.2)',
      overflow: 'hidden',
      ...window.CASINO_CARDS.faceStyle(rank, suit)
    }} />
  );
}

function THCardBack() {
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
      <div style={{
        width: '72%', height: '82%',
        border: '1.5px solid rgba(201,162,106,.7)',
        borderRadius: 6,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'radial-gradient(circle at 50% 50%, rgba(201,162,106,.15), transparent 70%)'
      }}>
        <span style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 18, color: 'rgba(230,197,144,.85)',
          fontStyle: 'italic', letterSpacing: '.1em'
        }}>LG</span>
      </div>
    </div>
  );
}

// THCard: takes either a card object {rank, suit (long form)} or {rank, suit (glyph)}.
function THCard({ card, faceDown = false, w = 78, h = 110, dealIndex = 0, fromX = 360, fromY = -240, glow = false, dim = false }) {
  if (!card) {
    return (
      <div style={{
        width: w, height: h,
        border: '2px dashed rgba(201,162,106,.25)',
        borderRadius: 10,
        background: 'rgba(0,0,0,.18)'
      }}/>
    );
  }
  const suitGlyph = card.suit && card.suit.length > 1 ? TH_SUIT_GLYPHS[card.suit] : card.suit;
  return (
    <div className="card-shell deal-in" style={{
      width: w, height: h, position: 'relative',
      animationDelay: `${dealIndex * 0.10}s`,
      '--from-x': `${fromX}px`,
      '--from-y': `${fromY}px`,
      filter: glow ? 'drop-shadow(0 0 16px rgba(230,197,144,.7))' : (dim ? 'grayscale(.6) brightness(.7)' : 'none'),
      transition: 'filter .3s ease',
      opacity: dim ? 0.6 : 1
    }}>
      <div className={`card-flip ${faceDown ? 'face-down' : ''}`} style={{
        width: '100%', height: '100%', position: 'relative'
      }}>
        <div className="card-face">
          <THCardFace rank={card.rank} suit={suitGlyph} w={w} />
        </div>
        <div className="card-back">
          <THCardBack />
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { THCard, THCardFace, THCardBack, TH_SUITS, TH_SUIT_GLYPHS });
