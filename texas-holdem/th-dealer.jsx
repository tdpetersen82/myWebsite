/* eslint-disable */
// Dealer panel + opponent seat for Texas Hold'em.
// - DealerStrip: small portrait strip on the left of the table — reuses
//   blackjack/assets/dealers/{female,male}/*.png.
// - OpponentSeat: avatar + name + stack + bet for each AI opponent.

const TH_DEALER_NAMES = ['Melissa', 'Marcus'];

const TH_DEALER_VOICES = {
  Melissa: {
    greet: [
      "Welcome to the Hold'em table, {p}.",
      "{p}! Pull up, the cards are warm.",
      "Evening, {p}. Three sharks tonight — be careful.",
      "Look who's back. Cards on the deal."
    ],
    deal:        ["Cards are out.", "Hole cards. Eyes up.", "Two for everyone."],
    flop:        ["Here's the flop.", "Three on the felt.", "Flop's out."],
    turn:        ["Turn card.", "Fourth street.", "Here's the turn."],
    river:       ["River.", "Last card.", "Fifth street, in."],
    showdown:    ["Showdown.", "Cards on their backs.", "Let's see them."],
    youWin:      ["{p} takes it.", "Pot's yours, {p}.", "Nice hand."],
    youLose:     ["Pot goes that way.", "Tough one, {p}.", "Next one."],
    youFold:     ["{p} folds.", "Mucked.", "Folded — live to see another."],
    everyoneFold:["Take it down, {p}.", "No callers — pot's yours.", "{p} wins uncontested."],
    bet_huge:    ["{p} bets big — pit's watching.", "Statement bet.", "Whoa. Big one."],
    raise:       ["{p} raises.", "Up it goes."],
    allin:       ["{p} all-in. Spine of the night.", "All-in. Decision time.", "{p} shoves."],
    idle:        ["Your action, {p}.", "Bet up when you're ready.", "{p} to act."]
  },
  Marcus: {
    greet: [
      "{p}. Sit. Cards.",
      "Marcus dealing. Three opponents.",
      "Take a seat, {p}. Cards in two.",
      "Hold'em. Sit.",
    ],
    deal:        ["Cards.", "Hole.", "Out they go."],
    flop:        ["Flop.", "Three on the felt.", "Out."],
    turn:        ["Turn.", "Fourth street."],
    river:       ["River.", "Last card."],
    showdown:    ["Showdown.", "Backs."],
    youWin:      ["{p}. Yours.", "Take it.", "Good hand."],
    youLose:     ["Theirs.", "Tough.", "Next hand."],
    youFold:     ["Folded.", "Mucked.", "Out."],
    everyoneFold:["Yours, {p}.", "Take it.", "Uncontested."],
    bet_huge:    ["Big bet.", "That's a real one.", "Now I'm awake."],
    raise:       ["{p} raises.", "Up."],
    allin:       ["{p}. All-in.", "Shove. Decision."],
    idle:        ["Action, {p}.", "Your move.", "Bet up."]
  }
};

function thPickLine(key, ctx = {}) {
  const dealer = ctx.dealer || 'Melissa';
  const voice = TH_DEALER_VOICES[dealer] || TH_DEALER_VOICES.Melissa;
  const lines = voice[key] || voice.idle || ['…'];
  const line = lines[Math.floor(Math.random() * lines.length)];
  return line.replace(/\{p\}/g, ctx.player || 'friend').replace(/\{d\}/g, dealer);
}

// Compact dealer pane on the left of the main felt: portrait + speech bubble.
function THDealerStrip({ name, gender = 'female', expression = 'idle', message }) {
  const src = `../blackjack/assets/dealers/${gender}/${expression}.png`;
  return (
    <div style={{
      width: 200, height: '100%',
      position: 'relative',
      borderRadius: 14,
      overflow: 'hidden',
      background: '#1a1208',
      boxShadow: 'var(--shadow-deep), inset 0 0 0 1px rgba(201,162,106,.18)'
    }}>
      <img
        src={src}
        alt={name}
        onError={(e) => { e.currentTarget.src = `../blackjack/assets/dealers/female/idle.png`; }}
        style={{
          position:'absolute', left:'50%', top: 0,
          height:'100%',
          transform:'translateX(-50%)',
          objectFit:'cover',
          objectPosition:'center top',
          filter:'saturate(1.05) contrast(1.02)'
        }}
      />
      {/* vignette */}
      <div style={{
        position:'absolute', inset: 0,
        background:'radial-gradient(ellipse at 50% 35%, transparent 50%, rgba(0,0,0,.6) 100%)',
        pointerEvents:'none'
      }} />
      <div style={{
        position:'absolute', left:0, right:0, top:0, height: 70,
        background:'linear-gradient(180deg, rgba(0,0,0,.55), transparent)',
        pointerEvents:'none'
      }} />
      <div style={{
        position:'absolute', left:0, right:0, bottom:0, height: 240,
        background:'linear-gradient(0deg, rgba(15,12,8,.95) 12%, rgba(15,12,8,.7) 38%, transparent 100%)',
        pointerEvents:'none'
      }} />

      {/* Nameplate */}
      <div style={{
        position:'absolute', top: 12, left: 12, right: 12,
        zIndex: 3
      }}>
        <div style={{
          padding:'6px 12px',
          background:'linear-gradient(180deg, rgba(20,12,6,.85), rgba(10,6,3,.85))',
          border:'1px solid rgba(201,162,106,.45)',
          borderRadius: 999,
          backdropFilter:'blur(6px)',
          boxShadow:'0 6px 14px rgba(0,0,0,.45)',
          display:'inline-flex', alignItems:'center', gap: 8
        }}>
          <span style={{ fontSize: 9, letterSpacing:'.22em', color:'var(--ivory-dim)', textTransform:'uppercase' }}>Dealer</span>
          <span style={{
            fontFamily:"'Playfair Display', serif",
            fontSize: 16, lineHeight: 1, color:'var(--brass-2)', fontWeight: 600
          }}>{name}</span>
        </div>
      </div>

      {/* Speech bubble */}
      {message && (
        <div style={{
          position:'absolute', left: 14, right: 14, bottom: 16,
          zIndex: 3
        }}>
          <THSpeechBubble text={message} dealerName={name} />
        </div>
      )}
    </div>
  );
}

function THSpeechBubble({ text, dealerName, compact = false }) {
  const [shown, setShown] = React.useState('');
  const [done, setDone] = React.useState(false);
  React.useEffect(() => {
    setShown(''); setDone(false);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setShown(text.slice(0, i));
      if (i >= text.length) { clearInterval(id); setDone(true); }
    }, compact ? 14 : 18);
    return () => clearInterval(id);
  }, [text]);

  return (
    <div className="chat-pop" key={text} style={{
      background:'linear-gradient(180deg, rgba(255,253,246,.97), rgba(244,236,216,.97))',
      color:'#1a1410',
      padding: compact ? '8px 12px 9px' : '12px 14px 13px',
      borderRadius: 12,
      boxShadow:'0 10px 22px rgba(0,0,0,.45), 0 0 0 1px rgba(201,162,106,.5)'
    }}>
      {dealerName && (
        <div style={{
          fontSize: 10, fontWeight: 700, letterSpacing:'.18em',
          color:'var(--brass-deep)', textTransform:'uppercase', marginBottom: 3
        }}>{dealerName}</div>
      )}
      <div style={{
        fontFamily:"'Playfair Display', serif",
        fontSize: compact ? 13 : 15, lineHeight: 1.32,
        fontStyle:'italic',
        color:'#1a1410'
      }} className={done ? '' : 'blink-cursor'}>
        {shown || ' '}
      </div>
    </div>
  );
}

// Avatar / monogram fallback for an opponent. archetype.color sets the tint.
function THOpponentAvatar({ archetype, size = 64 }) {
  const src = `assets/opponents/${archetype.id}/idle.png`;
  const [imgFailed, setImgFailed] = React.useState(false);
  return (
    <div style={{
      width: size, height: size,
      borderRadius: '50%',
      overflow:'hidden',
      background: `radial-gradient(circle at 35% 30%, ${archetype.color}, ${archetype.color}aa 80%)`,
      boxShadow: `0 0 0 2px rgba(20,12,6,.85), 0 6px 14px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.25)`,
      display:'flex', alignItems:'center', justifyContent:'center',
      position:'relative'
    }}>
      {!imgFailed && (
        <img
          src={src}
          alt={archetype.name}
          onError={() => setImgFailed(true)}
          style={{ width:'100%', height:'100%', objectFit:'cover' }}
        />
      )}
      {imgFailed && (
        <span style={{
          fontFamily:"'Playfair Display', serif",
          fontStyle:'italic',
          fontSize: size * 0.42,
          fontWeight: 700,
          color:'#1a1208',
          textShadow:'0 1px 0 rgba(255,255,255,.25)',
          letterSpacing:'.02em'
        }}>{archetype.initials}</span>
      )}
    </div>
  );
}

function THStackChip({ amount, size = 12 }) {
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap: 4,
      padding:'2px 8px',
      borderRadius: 999,
      background:'rgba(20,12,6,.7)',
      border:'1px solid rgba(201,162,106,.35)',
      fontSize: 11, color:'var(--brass-2)', fontWeight: 600,
      letterSpacing:'.05em',
      fontFamily:"'JetBrains Mono', monospace"
    }}>
      <span style={{
        width: size, height: size,
        borderRadius:'50%',
        background:'radial-gradient(circle at 35% 30%, #e6c590, #8c6a3f 75%)',
        border:'1px solid #5a3f1f',
        boxShadow:'0 1px 2px rgba(0,0,0,.4)'
      }}/>
      ${amount.toLocaleString()}
    </span>
  );
}

// Per-seat panel for an AI opponent (top row).
function THOpponentSeat({
  archetype, name, stack, bet, status, isActive, isButton, blindLabel,
  hole, holeRevealed = false, message
}) {
  const folded = status === 'folded';
  const allin = status === 'allin';
  const dim = folded;
  return (
    <div style={{
      width: 230,
      padding:'10px 12px 12px',
      background: isActive
        ? 'linear-gradient(180deg, rgba(245,216,150,.18), rgba(20,12,6,.65))'
        : 'linear-gradient(180deg, rgba(35,22,10,.7), rgba(20,12,6,.85))',
      borderRadius: 14,
      border: isActive ? '1.5px solid rgba(245,216,150,.7)' : '1px solid rgba(201,162,106,.35)',
      boxShadow: isActive
        ? '0 8px 22px rgba(230,197,144,.25), inset 0 1px 0 rgba(230,197,144,.18)'
        : '0 6px 14px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.06)',
      backdropFilter:'blur(6px)',
      transition: 'all .25s ease',
      opacity: dim ? 0.55 : 1,
      position:'relative'
    }}>
      {/* Speech bubble (above) */}
      {message && (
        <div style={{
          position:'absolute', left: 8, right: 8, top: -54,
          zIndex: 5
        }}>
          <THSpeechBubble text={message} dealerName={archetype.shortName} compact />
        </div>
      )}

      <div style={{ display:'flex', alignItems:'center', gap: 10 }}>
        <THOpponentAvatar archetype={archetype} size={50} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily:"'Playfair Display', serif",
            fontSize: 16, fontWeight: 700, color:'var(--brass-2)',
            lineHeight: 1.05,
            display:'flex', alignItems:'baseline', gap: 6,
            whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'
          }}>
            {name}
            {isButton && (
              <span style={{
                fontSize: 9, fontWeight: 800, padding:'2px 5px',
                background:'#fff', color:'#1a1208',
                borderRadius: 4, letterSpacing:'.1em'
              }}>D</span>
            )}
            {blindLabel && (
              <span style={{
                fontSize: 9, fontWeight: 700, padding:'2px 5px',
                background:'rgba(230,197,144,.25)', color:'var(--brass-2)',
                border:'1px solid rgba(230,197,144,.5)',
                borderRadius: 4, letterSpacing:'.1em'
              }}>{blindLabel}</span>
            )}
          </div>
          <div style={{
            fontSize: 9, letterSpacing:'.18em',
            color:'var(--ivory-dim)', textTransform:'uppercase',
            marginTop: 2
          }}>{archetype.tagline}</div>
        </div>
      </div>

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop: 10, gap: 6 }}>
        <div style={{ display:'flex', flexDirection:'column', gap: 4 }}>
          <THStackChip amount={stack} />
          {bet > 0 && (
            <span style={{
              fontSize: 10, color:'var(--brass-2)', fontWeight: 600,
              letterSpacing:'.1em', fontFamily:"'JetBrains Mono', monospace",
              padding:'2px 6px',
              background:'rgba(40,28,18,.55)',
              border:'1px solid rgba(230,197,144,.35)',
              borderRadius: 6
            }}>BET ${bet}</span>
          )}
        </div>
        <div style={{ display:'flex', gap: 4 }}>
          {hole && hole.length === 2 ? (
            hole.map((c, i) => (
              <THCard
                key={c.id || i}
                card={c}
                faceDown={!holeRevealed}
                w={36} h={50}
                dealIndex={i}
                fromX={0} fromY={-150}
                dim={dim}
              />
            ))
          ) : (
            <>
              <div style={{
                width: 36, height: 50,
                border:'2px dashed rgba(201,162,106,.25)',
                borderRadius: 7,
                background:'rgba(0,0,0,.18)'
              }}/>
              <div style={{
                width: 36, height: 50,
                border:'2px dashed rgba(201,162,106,.25)',
                borderRadius: 7,
                background:'rgba(0,0,0,.18)'
              }}/>
            </>
          )}
        </div>
      </div>

      {(folded || allin) && (
        <div style={{
          position:'absolute', top: 8, right: 8,
          fontSize: 9, fontWeight: 800, padding:'3px 8px',
          background: folded ? 'rgba(120,30,30,.85)' : 'rgba(245,216,150,.95)',
          color: folded ? '#fff' : '#1a1208',
          borderRadius: 4, letterSpacing:'.16em', textTransform:'uppercase'
        }}>{folded ? 'Folded' : 'All-in'}</div>
      )}
    </div>
  );
}

Object.assign(window, {
  THDealerStrip, THOpponentSeat, THOpponentAvatar, THSpeechBubble, THStackChip,
  TH_DEALER_NAMES, TH_DEALER_VOICES, thPickLine
});
