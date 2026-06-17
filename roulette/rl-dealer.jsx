/* eslint-disable */
// Croupier panel — large portrait, expression-driven, speech bubble (roulette voice library)

const DEALER_NAMES = ['Melissa', 'Marcus'];

const DEALER_VOICES = {
  Melissa: {
    greet: [
      "Welcome to my wheel, {p}. Let it ride.",
      "Evening, {p}. Place your chips and let the wheel decide.",
      "Look who's back. The ball missed you, {p}.",
      "{p}! I was hoping you'd swing by. Care to tempt fortune?"
    ],
    bet_low: [
      "Toe in the water, then.",
      "Modest. Safer that way.",
      "Easy bet, {p}. Nothing wrong with patience."
    ],
    bet_mid: [
      "Now we're talking. Real chips on the felt.",
      "I like where this is going.",
      "{p}'s feeling brave. Good."
    ],
    bet_high: [
      "Heavy chips, {p}. The wheel respects courage.",
      "Big spender. Pit boss is glancing over.",
      "Whew. Bold move. Let me know if you need a drink."
    ],
    no_more_bets: [
      "No more bets, {p}. Hold your breath.",
      "Bets are closed. Let's see what she does.",
      "That's it — wheel's spinning."
    ],
    spin: [
      "Round and round…",
      "Here we go. Eyes on the ball.",
      "Let the wheel decide."
    ],
    result_red: [
      "Red {n}. The hot side wins.",
      "{n}, red. Fortune favors the bold.",
      "Red — {n}."
    ],
    result_black: [
      "Black {n}. Cool as ever.",
      "{n}, black. Quiet little number.",
      "Black — {n}."
    ],
    result_zero: [
      "Zero. The house breathes a little easier.",
      "Green zero. Sorry, {p} — that one's for the casino.",
      "And it's zero. The cruelest pocket on the wheel."
    ],
    win_small: [
      "Yours, {p}. Take it.",
      "Nice call. The chips slide your way.",
      "There you go. Modest, but yours."
    ],
    win_big: [
      "{p}! That's a beautiful payout.",
      "Big winner. The pit just looked up.",
      "Look at you. Reading the wheel like a book."
    ],
    win_straight: [
      "STRAIGHT UP! {p}, that was a thirty-five-to-one bullseye.",
      "On the number?! {p}, do you have a crystal ball?",
      "Straight up hit. The whole table is jealous."
    ],
    lose: [
      "Not this time, {p}. The wheel's stubborn.",
      "Tough one. House gathers it up.",
      "Better luck next spin."
    ],
    push: [
      "All even. Your chips come back to you.",
      "A wash — stake returned, {p}.",
      "Nobody wins, nobody bleeds. Again?"
    ],
    lose_streak: [
      "Cold streak. Bet smaller, ride it out.",
      "She's against you tonight. Don't tilt, {p}.",
      "Variance, {p}. The wheel evens out — eventually."
    ],
    bust: [
      "That's the last of your chips, {p}. The cage can sort you out.",
      "Felt's empty. Cash out at your profile and come back swinging.",
      "Cleared out. Happens to the best of them — see the cashier, {p}."
    ],
    after_tip: [
      "You remembered. You're the best, {p}. ✨",
      "Tipped again? I'll save you the warm pocket.",
      "Generous as always. Spin's on me."
    ],
    idle_long: [
      "Take your time, {p}. The wheel waits.",
      "Whenever you're ready.",
      "Want a top-off on that drink?",
      "Penny for your thoughts, {p}?"
    ],
    idle: [
      "Place your chips when you're ready, {p}.",
      "Pick a number. Pick a color. Pick anything.",
      "The felt is open, {p}."
    ]
  },
  Marcus: {
    greet: [
      "{p}. Sit. The wheel's warm.",
      "Evening. Marcus on the wheel tonight.",
      "Chips on the felt when you're ready, {p}.",
      "Played thousands of spins. Let's add another, {p}."
    ],
    bet_low: [
      "Modest. Fine.",
      "Low bet. Noted.",
      "Conservative. Smart sometimes."
    ],
    bet_mid: [
      "That'll do.",
      "Real bet. Good.",
      "Now I'm watching."
    ],
    bet_high: [
      "Big swing. Hope you slept on it.",
      "That's a statement, not a bet.",
      "Pit's looking. Don't blame me."
    ],
    no_more_bets: [
      "No more bets.",
      "Hands off. Spinning.",
      "Bets closed."
    ],
    spin: [
      "Wheel's up.",
      "Watch the ball.",
      "Spinning."
    ],
    result_red: [
      "Red {n}.",
      "{n}, red.",
      "Red — {n}."
    ],
    result_black: [
      "Black {n}.",
      "{n}, black.",
      "Black — {n}."
    ],
    result_zero: [
      "Zero. House.",
      "Green zero. Outside bets gone.",
      "Zero — tough."
    ],
    win_small: [
      "Yours.",
      "You take it.",
      "Pays."
    ],
    win_big: [
      "Nice payout.",
      "Big win. Earned.",
      "Pays well."
    ],
    win_straight: [
      "Straight up. Thirty-five to one.",
      "On the number. Clean.",
      "Bullseye."
    ],
    lose: [
      "House.",
      "Not yours.",
      "Tough."
    ],
    push: [
      "Even. Stake back.",
      "A wash.",
      "Nobody wins."
    ],
    lose_streak: [
      "Rough patch. Bet smaller.",
      "Variance. It turns.",
      "Don't tilt."
    ],
    bust: [
      "Out of chips. See the cage.",
      "Cleared. Cash out, regroup.",
      "That's the felt. Cashier's that way."
    ],
    after_tip: [
      "Appreciated.",
      "Thanks. Noted.",
      "Generous."
    ],
    idle_long: [
      "Whenever you're ready.",
      "Take your time, {p}.",
      "I'll be here."
    ],
    idle: [
      "Bet up.",
      "Chips when ready.",
      "Your move, {p}."
    ]
  }
};

function pickLine(key, ctx = {}) {
  const dealer = ctx.dealer || 'Melissa';
  const voice = DEALER_VOICES[dealer] || DEALER_VOICES.Melissa;
  const lines = voice[key] || voice.idle;
  const line = lines[Math.floor(Math.random() * lines.length)];
  return line
    .replace(/\{p\}/g, ctx.player || 'friend')
    .replace(/\{d\}/g, dealer)
    .replace(/\{n\}/g, ctx.number != null ? String(ctx.number) : '');
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
    // The old pose stays fully visible underneath while the new one fades in
    // on top — fading both at once left the panel blank mid-swap.
    setLayers(prev => [...prev, { key: newKey, src, opacity: 0, blur: 4 }]);
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
      <span style={{ fontSize: 11, lineHeight: 1, letterSpacing:'.18em', color:'var(--ivory-dim)', textTransform:'uppercase' }}>Your croupier</span>
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
          }}>Now serving</span>
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

// Slim horizontal croupier strip for the portrait/mobile layout — avatar plus
// speech, no full portrait column.
function DealerStrip({ name, message, gender = 'female', expression = 'idle' }) {
  return (
    <div style={{
      display:'flex', alignItems:'center', gap: 12,
      padding:'10px 14px',
      borderRadius: 14,
      background:'linear-gradient(180deg, rgba(26,16,8,.92), rgba(14,8,4,.92))',
      border:'1px solid rgba(201,162,106,.3)',
      boxShadow:'0 10px 24px rgba(0,0,0,.45), inset 0 1px 0 rgba(230,197,144,.12)',
      minHeight: 64
    }}>
      <img
        src={`assets/dealers/${gender}/avatar.jpg`}
        alt=""
        style={{
          width: 46, height: 46, borderRadius:'50%', flexShrink: 0,
          objectFit:'cover', objectPosition:'center top',
          boxShadow:'0 0 0 1.5px rgba(201,162,106,.55), 0 0 10px rgba(201,162,106,.3)',
          filter: expression === 'happy' ? 'saturate(1.2)' : 'none'
        }}
      />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 9, letterSpacing:'.24em', color:'var(--brass)', textTransform:'uppercase', fontWeight: 600 }}>{name} · Croupier</div>
        <div style={{
          fontFamily:"'Playfair Display', serif", fontStyle:'italic',
          fontSize: 14.5, lineHeight: 1.3, color:'var(--ivory)',
          marginTop: 2,
          display:'-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient:'vertical', overflow:'hidden'
        }}>{message || ' '}</div>
      </div>
    </div>
  );
}

Object.assign(window, { DealerPanel, DealerStrip, pickLine, DEALER_VOICES, DEALER_NAMES });
