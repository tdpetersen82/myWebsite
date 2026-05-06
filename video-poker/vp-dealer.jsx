/* eslint-disable */
// Dealer panel — Melissa as host at the video-poker machine.
// Mood-driven crossfading portrait + speech bubble + nameplate + Now-serving + Tip pills.

const DEALER_NAMES = ['Melissa', 'Marcus'];

const DEALER_VOICES = {
  Melissa: {
    greet: [
      "Pull up a seat, {p}. The machine's been waiting.",
      "Evening, {p}. Coins down when you're ready.",
      "There you are. Let's chase a Royal tonight, {p}.",
      "{p}! I saved you the lucky seat."
    ],
    bet_low: [
      "Easing in. Smart.",
      "Penny ante for now, hm?",
      "One coin. Toe in the water."
    ],
    bet_mid: [
      "Three coins. Now we're playing.",
      "Stepping it up. I see you.",
      "Mid-stakes. Solid choice."
    ],
    bet_high: [
      "Four coins. Bold but smart.",
      "Going deep. I respect it.",
      "Almost max. The Royal's looking better and better."
    ],
    bet_max: [
      "MAX BET! That's how you chase a Royal, {p}.",
      "Five coins — full Royal payoff in play.",
      "Maximum bet. Now the machine has to pay attention."
    ],
    deal: [
      "Five fresh ones.",
      "Cards out. Eyes up.",
      "Here we go.",
      "Let's see what we're working with."
    ],
    draw: [
      "Drawing. Hold your breath, {p}.",
      "Replacements coming.",
      "Let's see what the deck thinks.",
      "Fingers crossed."
    ],
    hold_none: [
      "Throwing them all back? Bold.",
      "Fresh start. I admire the optimism."
    ],
    hold_all: [
      "Standing pat. Confident.",
      "Holding everything. Gut call?"
    ],
    result_royal: [
      "ROYAL FLUSH. {p}. ROYAL. FLUSH.",
      "Oh — {p}. Look at that. ROYAL.",
      "Royal Flush! I might cry, {p}. Genuinely.",
      "{p}, that's the dream. Right there."
    ],
    result_straight_flush: [
      "STRAIGHT FLUSH! Just shy of a Royal.",
      "Straight Flush, {p}! Beautiful.",
      "Oh that's pretty. Straight Flush!"
    ],
    result_four_kind: [
      "FOUR of a kind! Big payday.",
      "Quads, {p}. Look at that.",
      "Four of a kind. Machine's being kind tonight."
    ],
    result_full_house: [
      "Full House. Nicely played.",
      "House is full, {p}.",
      "Good hold. Full boat."
    ],
    result_flush: [
      "Flush! All five same suit.",
      "Suited up, {p}. Nice flush.",
      "Flush. Tidy."
    ],
    result_straight: [
      "Straight, {p}. Clean.",
      "Five in a row. Good draw.",
      "Straight pays. Take it."
    ],
    result_three_kind: [
      "Three of a kind. Solid.",
      "Trips, {p}. Pays nicely.",
      "Three of a kind. I'll take it."
    ],
    result_two_pair: [
      "Two pair. Decent return.",
      "Two pair, {p}. Pays your bet back, plus.",
      "Pair of pairs. Not bad."
    ],
    result_jacks: [
      "Jacks or better. Bet returned.",
      "High pair. Even money.",
      "Pays. Even-up."
    ],
    lose: [
      "Nothing this time, {p}.",
      "Tough deal. Reload.",
      "No pair. The deck was stingy.",
      "Empty draw. Try again."
    ],
    losing_streak: [
      "Cold streak. Bet smaller, ride it out.",
      "Variance, {p}. It turns.",
      "Don't tilt. Breathe. The Royal's still in the deck.",
      "Tough patch. Lower the bet, recover."
    ],
    bust: [
      "Out of chips. House gives you a fresh stake — try again, {p}.",
      "Bankroll wipe. Fresh thousand on the house. Bet smarter.",
      "Reset. Take it as a sign."
    ],
    after_tip: [
      "You remembered. ✨",
      "Generous, {p}. Let me find you a hot deal.",
      "Tipped again? I'm flattered.",
      "Sweet of you. Royal's coming, I can feel it."
    ],
    idle_long: [
      "Take your time, {p}. Coins aren't going anywhere.",
      "Whenever you're ready.",
      "Want a drink while you think?",
      "Penny for your thoughts, {p}?"
    ],
    idle: [
      "Coins down when you're ready, {p}.",
      "Bet up. The machine's primed.",
      "Five coins gets you the full Royal payout — just so you know."
    ]
  },

  // Marcus — stubbed, dryer voice. Same keys as Melissa.
  Marcus: {
    greet: ["{p}. Sit. Bet up.", "Marcus. Dealing video poker tonight.", "Cards are warm. Chips when ready, {p}."],
    bet_low: ["One coin.", "Modest.", "Conservative."],
    bet_mid: ["Three coins. Fine.", "Mid-stakes.", "Reasonable."],
    bet_high: ["Four. That's a real bet.", "Now I'm awake.", "Almost max."],
    bet_max: ["Max bet. Royal pays full.", "Five. Smart.", "All in."],
    deal: ["Cards.", "Out they go.", "Five fresh."],
    draw: ["Drawing.", "Replacements.", "Let's see."],
    hold_none: ["Discard all. Bold."],
    hold_all: ["Standing pat."],
    result_royal: ["Royal Flush. {p}. Real one.", "Royal. Pays the jackpot.", "Royal Flush. Don't see that often."],
    result_straight_flush: ["Straight Flush. Strong.", "Straight Flush. Pays well.", "Five suited and sequential."],
    result_four_kind: ["Four of a kind.", "Quads. Pays.", "Four matching. Solid."],
    result_full_house: ["Full House.", "Boat. Pays nine.", "Full House. Good hold."],
    result_flush: ["Flush.", "All one suit. Pays six.", "Flush. Clean."],
    result_straight: ["Straight.", "Five in a row. Pays four.", "Straight. Pays."],
    result_three_kind: ["Three of a kind.", "Trips.", "Three matching."],
    result_two_pair: ["Two pair.", "Two pair. Pays even.", "Pair of pairs."],
    result_jacks: ["Jacks or better. Even money.", "Pays your bet back.", "High pair."],
    lose: ["No pair.", "Empty hand.", "Nothing.", "Rebuy."],
    losing_streak: ["Cold streak.", "Variance.", "Bet smaller."],
    bust: ["Out. House stakes you again.", "Reset.", "Bankroll restored."],
    after_tip: ["Appreciated.", "Thanks.", "Generous."],
    idle_long: ["Whenever you're ready.", "Take your time.", "I'll be here."],
    idle: ["Bet up.", "Coins when ready.", "Your move."]
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
  const src = `assets/dealers/${gender}/${file}.png`;
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
    <div style={{ position:'absolute', inset:0, overflow:'hidden', borderRadius:'inherit' }}>
      {layers.map(layer => (
        <img
          key={layer.key}
          src={layer.src}
          alt="dealer"
          onError={(e) => { e.currentTarget.src = `assets/dealers/female/${file}.png`; }}
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
      <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 50% 35%, transparent 50%, rgba(0,0,0,.55) 100%)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', left:0, right:0, top:0, height:90, background:'linear-gradient(180deg, rgba(0,0,0,.55), transparent)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', left:0, right:0, bottom:0, height:220, background:'linear-gradient(0deg, var(--ink-2) 8%, rgba(15,12,8,.85) 35%, transparent 100%)', pointerEvents:'none' }} />
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
      opacity:1,
      background:'linear-gradient(180deg, rgba(255,253,246,.97), rgba(244,236,216,.97))',
      color:'#1a1410',
      padding:'14px 18px 16px',
      borderRadius:14,
      boxShadow:'0 14px 30px rgba(0,0,0,.45), 0 2px 0 rgba(255,255,255,.5) inset, 0 0 0 1px rgba(201,162,106,.5)',
      maxWidth:320, minHeight:70
    }}>
      <div style={{ fontSize:11, fontWeight:600, letterSpacing:'.16em', color:'var(--brass-deep)', textTransform:'uppercase', marginBottom:4 }}>{dealerName}</div>
      <div style={{ fontFamily:"'Playfair Display', serif", fontSize:17, lineHeight:1.35, fontStyle:'italic', color:'#1a1410' }} className={done ? '' : 'blink-cursor'}>
        {shown || ' '}
      </div>
      <div style={{
        position:'absolute', top:-10, left:36, width:0, height:0,
        borderLeft:'10px solid transparent', borderRight:'10px solid transparent',
        borderBottom:'12px solid rgba(255,253,246,.97)',
        filter:'drop-shadow(0 -1px 1px rgba(0,0,0,.15))'
      }} />
    </div>
  );
}

function DealerNameplate({ name, gender = 'female' }) {
  return (
    <div style={{
      display:'inline-flex', alignItems:'center', gap:10,
      padding:'6px 14px 6px 6px',
      background:'linear-gradient(180deg, rgba(20,12,6,.85), rgba(10,6,3,.85))',
      border:'1px solid rgba(201,162,106,.45)',
      borderRadius:999,
      backdropFilter:'blur(6px)',
      boxShadow:'0 8px 18px rgba(0,0,0,.45)'
    }}>
      <img
        src={`assets/dealers/${gender}/avatar.png`}
        alt=""
        style={{ width:30, height:30, borderRadius:'50%', objectFit:'cover', objectPosition:'center top',
          boxShadow:'0 0 0 1px rgba(201,162,106,.55), 0 0 8px rgba(201,162,106,.35)' }}
      />
      <span style={{ fontSize:11, letterSpacing:'.18em', color:'var(--ivory-dim)', textTransform:'uppercase' }}>Your host</span>
      <span style={{ fontFamily:"'Playfair Display', serif", fontSize:19, color:'var(--brass-2)', fontWeight:600, letterSpacing:'.02em' }}>{name}</span>
    </div>
  );
}

function DealerPanel({ name, expression, message, onTipDealer, tipped, playerName, gender = 'female', isIdle = false, mood = 0, onEditName }) {
  return (
    <div style={{
      position:'relative', width:380, height:'100%',
      borderRadius:18, overflow:'hidden',
      background:'#1a1208',
      boxShadow:'var(--shadow-deep), inset 0 0 0 1px rgba(201,162,106,.18)'
    }}>
      <DealerPortrait expression={expression} gender={gender} idle={isIdle} mood={mood} />

      <div style={{ position:'absolute', top:18, left:18, right:18, zIndex:3 }}>
        <DealerNameplate name={name} gender={gender} />
      </div>

      <div style={{ position:'absolute', left:22, right:22, bottom:70, zIndex:4 }}>
        {message && <SpeechBubble text={message} dealerName={name} />}
      </div>

      <div style={{ position:'absolute', left:14, bottom:14, zIndex:3 }}>
        <button
          onClick={onEditName}
          title="Change name"
          style={{
            display:'inline-flex', alignItems:'baseline', gap:6,
            padding:'8px 14px',
            background:'rgba(20,12,6,.7)',
            color:'var(--brass-2)',
            border:'1px solid rgba(201,162,106,.4)',
            borderRadius:999,
            fontFamily:"'Playfair Display', serif",
            fontSize:14, fontStyle:'italic',
            cursor:'pointer',
            backdropFilter:'blur(6px)',
            transition:'all .2s', whiteSpace:'nowrap',
            boxShadow:'0 4px 12px rgba(0,0,0,.4)'
          }}
        >
          <span style={{ fontSize:9, letterSpacing:'.22em', textTransform:'uppercase', color:'var(--ivory-dim)', fontStyle:'normal', fontFamily:'system-ui, sans-serif' }}>Now playing</span>
          {playerName}
        </button>
      </div>

      <div style={{ position:'absolute', right:14, bottom:14, zIndex:3 }}>
        <button
          onClick={onTipDealer}
          style={{
            padding:'8px 14px',
            background: tipped ? 'linear-gradient(180deg, #e6c590, #c9a26a)' : 'rgba(20,12,6,.7)',
            color: tipped ? '#1a1208' : 'var(--brass-2)',
            border:'1px solid rgba(201,162,106,.5)',
            borderRadius:999,
            fontSize:11, fontWeight:700, letterSpacing:'.16em', textTransform:'uppercase',
            cursor:'pointer',
            backdropFilter:'blur(6px)',
            transition:'all .2s', whiteSpace:'nowrap',
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
