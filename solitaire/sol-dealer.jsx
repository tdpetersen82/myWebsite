/* eslint-disable */
// Dealer panel — same architecture as blackjack, voice dictionary tuned for solitaire host.

const DEALER_NAMES = ['Melissa', 'Marcus'];

// Solitaire is a single-player game; the "dealer" is repurposed as a casino host
// who sets the table, comments on plays, and gives hints when asked.
const DEALER_VOICES = {
  Melissa: {
    greet: [
      "Welcome back to my table, {p}. Fresh deck, fresh chances.",
      "Evening, {p}. Let me lay it out for you.",
      "Pull up a chair, {p}. I'll deal you a Klondike.",
      "{p}! Right on time. The cards are warm."
    ],
    deal_done: [
      "There you go. Twenty-eight cards, your move.",
      "Layout's ready. Find me an ace, {p}.",
      "Cards are out. Take your time."
    ],
    foundation_first_ace: [
      "There's an ace! Off it goes — that's how we start.",
      "First ace up. The foundations are open for business.",
      "Ace to the rack. Build it, {p}."
    ],
    foundation_progress: [
      "Up the foundation. Nice.",
      "Another one home. Keep stacking.",
      "Smooth. The rack's filling.",
      "Good eye, {p}."
    ],
    column_cleared: [
      "Empty column! That's prime real estate, {p} — save it for a king.",
      "Column open. Big move.",
      "Cleared one. Now we're cooking."
    ],
    king_to_empty: [
      "King takes the throne. Smart placement.",
      "K to the empty column. That's the play.",
      "Big card, big slot. Nice."
    ],
    smart_move: [
      "Pretty.",
      "I see you, {p}.",
      "Crisp move.",
      "That's the line."
    ],
    lucky_pull: [
      "Right card, right time.",
      "The deck likes you tonight.",
      "Lucky, lucky."
    ],
    stock_cycle: [
      "Around again, {p}. Watch your wallet.",
      "Recycling the stock. Costs you a fiver after this.",
      "Through the deck. Anything jumping out?"
    ],
    stuck: [
      "I think you're locked up, {p}. Want a fresh deal?",
      "No moves I can see. Maybe time for a new hand.",
      "Tough deal. Some hands just don't break."
    ],
    hint_offered: [
      "Try this one, {p}.",
      "There. See it?",
      "That's the move I'd play.",
      "Look — right there."
    ],
    hint_draw: [
      "Pull from the deck, {p}. Nothing useful out yet.",
      "Try a fresh card. The board's quiet right now.",
      "Tap the stock — see what flips.",
      "Need a new card. Draw one."
    ],
    hint_recycle: [
      "Flip the waste back over, {p}. Worth another pass.",
      "Recycle the deck. Costs you, but it's all you've got.",
      "Send it through again."
    ],
    undo_used: [
      "Take it back. Costs five.",
      "Rewind. House charges, of course.",
      "All right, undo. We've all been there."
    ],
    win: [
      "YOU GOT IT, {p}! Beautiful play.",
      "Cleared the deck! Drinks are on me.",
      "Victory! That's a Klondike, friend.",
      "{p}, that was poetry. The rack is full."
    ],
    near_win: [
      "Almost there. Don't choke now.",
      "One more push, {p}.",
      "Smell the felt, you've got this."
    ],
    new_deal: [
      "Fresh shoe. Let's run it back.",
      "New deal coming up.",
      "Reshuffling. Stretch your fingers."
    ],
    after_tip: [
      "You remembered. You're the best, {p}.",
      "Tipped again? Generous.",
      "Cheers, {p}. Let's find you an ace."
    ],
    idle_long: [
      "Take your time, {p}. Cards aren't going anywhere.",
      "Whenever you're ready. Need a hint?",
      "Stuck? Tap the hint button.",
      "Penny for your thoughts, {p}?"
    ],
    idle: [
      "Your move, {p}.",
      "Find me an ace.",
      "Take your time.",
      "What do you see?"
    ]
  },
  Marcus: {
    greet: [
      "{p}. Sit. Let's see what the deck does tonight.",
      "Evening. Marcus. I'll set the layout.",
      "Cards are warm. Klondike, single deck, your call on the draw.",
      "Twelve years dealing. Show me a clean win, {p}."
    ],
    deal_done: [
      "Layout's down.",
      "Cards out. Your move.",
      "Read it."
    ],
    foundation_first_ace: [
      "Ace. Goes up.",
      "First foundation card. Build from there.",
      "Ace away. Good."
    ],
    foundation_progress: [
      "Up.",
      "Foundation.",
      "Climbs.",
      "Stacks."
    ],
    column_cleared: [
      "Column open. King territory.",
      "Empty slot. Use it well.",
      "Cleared."
    ],
    king_to_empty: [
      "K in the empty. Right call.",
      "Throne filled.",
      "Clean."
    ],
    smart_move: [
      "Good.",
      "Tight.",
      "I see it.",
      "Yep."
    ],
    lucky_pull: [
      "Lucky.",
      "Deck cooperated.",
      "Right card."
    ],
    stock_cycle: [
      "Around again. Five-dollar pass after this.",
      "Recycling stock.",
      "Through the deck."
    ],
    stuck: [
      "Looks locked. New deal?",
      "No moves left. Want a fresh shoe?",
      "Hand's dead. Reshuffle."
    ],
    hint_offered: [
      "There.",
      "That one.",
      "Try it.",
      "See it now?"
    ],
    hint_draw: [
      "Draw one.",
      "Pull from the deck.",
      "Tap the stock.",
      "Need a fresh card."
    ],
    hint_recycle: [
      "Flip the waste back.",
      "Recycle. It'll cost you.",
      "Through the deck again."
    ],
    undo_used: [
      "Undo. Five.",
      "Rewound. House gets paid.",
      "Back one."
    ],
    win: [
      "Cleared. Nice work, {p}.",
      "Klondike. Pay the table.",
      "All home. Good run.",
      "Done. Clean win."
    ],
    near_win: [
      "Close. Don't blow it.",
      "Almost.",
      "One more push."
    ],
    new_deal: [
      "Fresh deck.",
      "Reshuffle.",
      "New layout coming."
    ],
    after_tip: [
      "Appreciated.",
      "Thanks. Noted.",
      "Generous."
    ],
    idle_long: [
      "Whenever, {p}.",
      "Take your time.",
      "Hint's there if you need it."
    ],
    idle: [
      "Your move.",
      "Find an ace.",
      "Read the board."
    ]
  }
};

function pickLine(key, ctx = {}) {
  const dealer = ctx.dealer || 'Melissa';
  const voice = DEALER_VOICES[dealer] || DEALER_VOICES.Melissa;
  const lines = voice[key] || voice.idle;
  const line = lines[Math.floor(Math.random() * lines.length)];
  return line.replace(/\{p\}/g, ctx.player || 'friend').replace(/\{d\}/g, dealer);
}

function DealerPortrait({ expression = 'idle', shift = 0, gender = 'female', idle = false, mood = 0 }) {
  const file = expression;
  const src = `assets/dealers/${gender}/${file}.jpg`;
  const [layers, setLayers] = React.useState(() => [{ key: 0, src, opacity: 1, blur: 0 }]);
  const counter = React.useRef(0);
  const lastSrc = React.useRef(src);

  React.useEffect(() => {
    if (lastSrc.current === src) return;
    lastSrc.current = src;
    counter.current += 1;
    const newKey = counter.current;
    setLayers(prev => [
      ...prev.map(l => ({ ...l, opacity: 0, blur: 6 })),
      { key: newKey, src, opacity: 0, blur: 6 }
    ]);
    const raf = requestAnimationFrame(() => {
      setLayers(prev => prev.map(l => l.key === newKey ? { ...l, opacity: 1, blur: 0 } : l));
    });
    const t = setTimeout(() => {
      setLayers(prev => prev.filter(l => l.key === newKey));
    }, 520);
    return () => { cancelAnimationFrame(raf); clearTimeout(t); };
  }, [src]);

  const m = Math.max(-1, Math.min(1, mood));
  const sat = (1.05 + m * 0.25).toFixed(3);
  const bright = (1 + m * 0.06).toFixed(3);
  const animClass = idle ? 'breathe' : '';

  return (
    <div style={{
      position:'absolute', inset:0,
      overflow:'hidden',
      borderRadius: 'inherit'
    }}>
      {layers.map(layer => (
        <img
          key={layer.key}
          src={layer.src}
          alt="dealer"
          onError={(e) => { e.currentTarget.src = `assets/dealers/female/${file}.jpg`; }}
          className={animClass}
          style={{
            position:'absolute',
            left:'50%',
            top: `${shift}px`,
            transform:'translateX(-50%)',
            height:'120%',
            objectFit:'cover',
            objectPosition:'center top',
            opacity: layer.opacity,
            transition: 'opacity .45s ease, filter .45s ease',
            filter: `blur(${layer.blur}px) saturate(${sat}) contrast(1.02) brightness(${bright})`
          }}
        />
      ))}
      <div style={{
        position:'absolute', inset:0,
        background:'radial-gradient(ellipse at 50% 35%, transparent 50%, rgba(0,0,0,.55) 100%)',
        pointerEvents:'none'
      }} />
      <div style={{
        position:'absolute', left:0, right:0, top:0, height: 90,
        background:'linear-gradient(180deg, rgba(0,0,0,.55), transparent)',
        pointerEvents:'none'
      }} />
      <div style={{
        position:'absolute', left:0, right:0, bottom:0, height: 220,
        background:'linear-gradient(0deg, var(--ink-2) 8%, rgba(15,12,8,.85) 35%, transparent 100%)',
        pointerEvents:'none'
      }} />
    </div>
  );
}

function SpeechBubble({ text, dealerName = 'Melissa' }) {
  const [shown, setShown] = React.useState('');
  const [done, setDone] = React.useState(false);
  React.useEffect(() => {
    setShown(''); setDone(false);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setShown(text.slice(0, i));
      if (i >= text.length) { clearInterval(id); setDone(true); }
    }, 18);
    return () => clearInterval(id);
  }, [text]);

  return (
    <div className="chat-pop" key={text} style={{
      position:'relative',
      opacity: 1,
      background:'linear-gradient(180deg, rgba(255,253,246,.97), rgba(244,236,216,.97))',
      color:'#1a1410',
      padding:'14px 18px 16px',
      borderRadius: 14,
      boxShadow:'0 14px 30px rgba(0,0,0,.45), 0 2px 0 rgba(255,255,255,.5) inset, 0 0 0 1px rgba(201,162,106,.5)',
      maxWidth: 320,
      minHeight: 70
    }}>
      <div style={{
        fontSize: 11, fontWeight: 600, letterSpacing:'.16em',
        color:'var(--brass-deep)', textTransform:'uppercase', marginBottom: 4
      }}>{dealerName}</div>
      <div style={{
        fontFamily:"'Playfair Display', serif",
        fontSize: 17, lineHeight: 1.35,
        fontStyle:'italic',
        color:'#1a1410'
      }} className={done ? '' : 'blink-cursor'}>
        {shown || ' '}
      </div>
      <div style={{
        position:'absolute',
        top: -10, left: 36,
        width: 0, height: 0,
        borderLeft: '10px solid transparent',
        borderRight: '10px solid transparent',
        borderBottom: '12px solid rgba(255,253,246,.97)',
        filter:'drop-shadow(0 -1px 1px rgba(0,0,0,.15))'
      }} />
    </div>
  );
}

function DealerNameplate({ name, gender = 'female' }) {
  return (
    <div style={{
      display:'inline-flex', alignItems:'center', gap: 10,
      padding:'6px 14px 6px 6px',
      background:'linear-gradient(180deg, rgba(20,12,6,.85), rgba(10,6,3,.85))',
      border:'1px solid rgba(201,162,106,.45)',
      borderRadius: 999,
      backdropFilter:'blur(6px)',
      boxShadow:'0 8px 18px rgba(0,0,0,.45)'
    }}>
      <img
        src={`assets/dealers/${gender}/avatar.jpg`}
        alt=""
        style={{
          width: 30, height: 30, borderRadius: '50%',
          objectFit: 'cover', objectPosition: 'center top',
          boxShadow:'0 0 0 1px rgba(201,162,106,.55), 0 0 8px rgba(201,162,106,.35)'
        }}
      />
      <span style={{ fontSize: 11, lineHeight: 1, letterSpacing:'.18em', color:'var(--ivory-dim)', textTransform:'uppercase' }}>Your host</span>
      <span style={{
        fontFamily:"'Playfair Display', serif",
        fontSize: 19, lineHeight: 1, color:'var(--brass-2)', fontWeight: 600, letterSpacing:'.02em'
      }}>{name}</span>
    </div>
  );
}

function DealerPanel({ name, expression, message, onTipDealer, tipped, playerName, gender = 'female', isIdle = false, mood = 0, onEditName }) {
  return (
    <div style={{
      position:'relative',
      width: 380,
      height: '100%',
      borderRadius: 18,
      overflow:'hidden',
      background:'#1a1208',
      boxShadow:'var(--shadow-deep), inset 0 0 0 1px rgba(201,162,106,.18)'
    }}>
      <DealerPortrait expression={expression} gender={gender} idle={isIdle} mood={mood} />

      <div style={{ position:'absolute', top: 18, left: 18, right: 18, zIndex: 3 }}>
        <DealerNameplate name={name} gender={gender} />
      </div>

      <div style={{
        position:'absolute', left: 22, right: 22, bottom: 70, zIndex: 4
      }}>
        {message && <SpeechBubble text={message} dealerName={name} />}
      </div>

      <div style={{
        position:'absolute', left: 14, bottom: 14, zIndex: 3
      }}>
        <button
          onClick={onEditName}
          title="Change name"
          style={{
            display:'inline-flex', alignItems:'baseline', gap: 6,
            padding:'8px 14px',
            background:'rgba(20,12,6,.7)',
            color:'var(--brass-2)',
            border:'1px solid rgba(201,162,106,.4)',
            borderRadius: 999,
            fontFamily:"'Playfair Display', serif",
            fontSize: 14, fontStyle:'italic',
            cursor:'pointer',
            backdropFilter:'blur(6px)',
            transition:'all .2s',
            whiteSpace:'nowrap',
            boxShadow:'0 4px 12px rgba(0,0,0,.4)'
          }}
        >
          <span style={{
            fontSize: 9, letterSpacing:'.22em', textTransform:'uppercase',
            color:'var(--ivory-dim)', fontStyle:'normal', fontFamily:'system-ui, sans-serif'
          }}>Now playing</span>
          {playerName}
        </button>
      </div>

      <div style={{
        position:'absolute', right: 14, bottom: 14, zIndex: 3
      }}>
        <button
          onClick={onTipDealer}
          style={{
            padding:'8px 14px',
            background: tipped ? 'linear-gradient(180deg, #e6c590, #c9a26a)' : 'rgba(20,12,6,.7)',
            color: tipped ? '#1a1208' : 'var(--brass-2)',
            border:'1px solid rgba(201,162,106,.5)',
            borderRadius: 999,
            fontSize: 11, fontWeight: 700, letterSpacing:'.16em',
            textTransform:'uppercase',
            cursor:'pointer',
            backdropFilter:'blur(6px)',
            transition: 'all .2s',
            whiteSpace:'nowrap',
            boxShadow:'0 4px 12px rgba(0,0,0,.4)'
          }}
        >
          {tipped ? '✓ Thanks!' : '✦ Tip $5'}
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { DealerPanel, pickLine, DEALER_VOICES, DEALER_NAMES });
