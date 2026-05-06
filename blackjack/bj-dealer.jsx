/* eslint-disable */
// Dealer panel — large portrait, expression-driven, speech bubble

const DEALER_NAMES = ['Melissa', 'Marcus'];

// Each dealer has their own voice — Melissa is warm/flirty, Marcus is dry/deadpan
const DEALER_VOICES = {
  Melissa: {
    greet: [
      "Welcome back to my table, {p}. The cards have missed you.",
      "Evening, {p}. Cocktail's on the house tonight — but the chips aren't.",
      "Look who's here. Pull up a chair, {p} — let's see what the deck thinks of you.",
      "{p}! Right on time. I was just shuffling something special."
    ],
    bet_low: [
      "Testing the waters, I see.",
      "Easy does it. Smart player.",
      "Conservative tonight, {p}? I respect it."
    ],
    bet_high: [
      "Now we're talking. Big swing energy.",
      "Ooh, feeling lucky? Let's find out.",
      "{p}, you're trying to make my night interesting."
    ],
    bet_huge: [
      "Whew. Bold. Don't say I didn't warn you, {p}.",
      "All right, big spender. Pit boss is watching now.",
      "That's a serious bet. Let me know if you need a drink."
    ],
    deal: [
      "Cards out. Good luck.",
      "Here we go. Eyes up.",
      "Two for you, two for me. Fair's fair."
    ],
    hit: [
      "Bold. I like it.",
      "Risk it for the biscuit.",
      "Let's see what the shoe gives you.",
      "One more. Living dangerously."
    ],
    stand: [
      "Locked in. Smart.",
      "Standing firm. My turn.",
      "Confidence. Noted."
    ],
    double: [
      "DOUBLE? You're playing my game now.",
      "All in on one card. I love it.",
      "{p} doubles down. The room just leaned in."
    ],
    split: [
      "Splitting them up. Two chances to break my heart.",
      "Two hands now. Twice the fun.",
      "Smart split, {p}."
    ],
    surrender: [
      "Calling it early. No shame in that.",
      "Half back, half mine. Live to play again.",
      "Wise. That hand was ugly."
    ],
    insurance: [
      "Insurance? Cautious, cautious.",
      "Hedging your bet. Reasonable, with my ace showing."
    ],
    bust: [
      "Oof. Twenty-two. The cards are cruel.",
      "Twenty-three. So close.",
      "Bust. Shake it off, {p} — next hand resets."
    ],
    player_bj: [
      "BLACKJACK! Beautiful, {p}. Three to two — pays you handsome.",
      "Natural twenty-one. The deck likes you tonight.",
      "{p}! Look at that. Pure poetry."
    ],
    player_win: [
      "Nicely done. The chips slide your way.",
      "You read me right. Take it.",
      "{p} takes the round. I'll get you next time."
    ],
    streak2: [
      "Two in a row. Don't get cocky now, {p}.",
      "Heater starting. I see you.",
      "Back-to-back. The shoe's being generous."
    ],
    streak3: [
      "Three! {p}, you're getting dangerous.",
      "Hat trick. The pit boss is taking notes.",
      "Three straight. Tip your dealer. ✨"
    ],
    streak5: [
      "Five in a row?! {p}, are you counting cards?",
      "Five. I should be nervous. I AM nervous.",
      "Whatever you're drinking, get me one. Five straight."
    ],
    dealer_win: [
      "Mine, this time. The house catches a break.",
      "Sorry, {p}. The deal favored me.",
      "Tough one. We go again?"
    ],
    push: [
      "Push. Nobody loses, nobody wins.",
      "Standoff. Bets stay where they are.",
      "Tied. Honorable, that."
    ],
    dealer_bust: [
      "And… I'm out. Twenty-two.",
      "Twenty-three on the dealer. Pay the table.",
      "I broke. Your hand wins."
    ],
    losing_streak: [
      "Tough patch. The deck'll turn — it always does.",
      "Hang in, {p}. Variance is a beast.",
      "Don't tilt. Breathe. Bet smaller, recover."
    ],
    after_tip: [
      "You remembered. You're the best, {p}. ✨",
      "Tipped again? Marry me. (Kidding. Mostly.)",
      "Generous. Let me find you a hot deck."
    ],
    idle_long: [
      "Take your time, {p}. Cards aren't going anywhere.",
      "Whenever you're ready.",
      "Want a top-off on that drink?",
      "Penny for your thoughts, {p}?"
    ],
    idle: [
      "Place your chips when you're ready, {p}.",
      "Take your time. The shoe's not going anywhere.",
      "Bet up, {p}. The night is young."
    ],
    rebet: [
      "Same as last? Got it.",
      "The usual, {p}? Coming up."
    ]
  },
  Marcus: {
    greet: [
      "{p}. Sit. Let's play.",
      "Evening. Marcus. I'll be dealing.",
      "Cards are warm. Bet up when you're ready, {p}.",
      "Twelve years at this table. Show me something new tonight, {p}."
    ],
    bet_low: [
      "Modest. Fine.",
      "Low bet noted.",
      "Conservative. I respect it."
    ],
    bet_high: [
      "That's a real bet.",
      "All right then.",
      "Now I'm awake."
    ],
    bet_huge: [
      "Big swing. Hope you slept on it.",
      "Pit's looking. Don't blame me when they do.",
      "That's not a bet, that's a statement."
    ],
    deal: [
      "Cards.",
      "Out they go.",
      "Here you are."
    ],
    hit: [
      "Hit.",
      "One more. Sure.",
      "Coming up."
    ],
    stand: [
      "Stand. Noted.",
      "Holding. My turn.",
      "Locked."
    ],
    double: [
      "Double. Bold.",
      "Doubling. One card only.",
      "Big move."
    ],
    split: [
      "Split confirmed.",
      "Two hands. Play them both well.",
      "Splitting."
    ],
    surrender: [
      "Half back. Smart, sometimes.",
      "Surrender. Live to fight.",
      "Tough hand. Wise call."
    ],
    insurance: [
      "Insurance offered. Take it or leave it.",
      "Hedging. Up to you."
    ],
    bust: [
      "Bust.",
      "Over. Tough.",
      "Cards didn't cooperate."
    ],
    player_bj: [
      "Blackjack. Pays three to two.",
      "Natural. Nicely played.",
      "Twenty-one off the deal. Clean."
    ],
    player_win: [
      "Yours.",
      "You take it.",
      "Good hand."
    ],
    streak2: [
      "Two for two.",
      "Heating up.",
      "Back to back."
    ],
    streak3: [
      "Three straight. Watch yourself.",
      "Hot streak.",
      "Three. Don't push it."
    ],
    streak5: [
      "Five. I see you, {p}.",
      "Five wins. Keep your head.",
      "Streak's real now."
    ],
    dealer_win: [
      "House.",
      "Mine.",
      "Dealer takes it."
    ],
    push: [
      "Push. Bet stays.",
      "Tie. We go again.",
      "Nobody wins."
    ],
    dealer_bust: [
      "Dealer busts. Pay the table.",
      "Out. Yours.",
      "I broke. You win."
    ],
    losing_streak: [
      "Rough patch. Bet smaller.",
      "Variance. It turns.",
      "Don't tilt."
    ],
    after_tip: [
      "Appreciated.",
      "Thanks. I'll remember.",
      "Generous. Noted."
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
    ],
    rebet: [
      "Same again. Got it.",
      "Repeat bet. Sure."
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
      {/* vignette */}
      <div style={{
        position:'absolute', inset:0,
        background:'radial-gradient(ellipse at 50% 35%, transparent 50%, rgba(0,0,0,.55) 100%)',
        pointerEvents:'none'
      }} />
      {/* top fade */}
      <div style={{
        position:'absolute', left:0, right:0, top:0, height: 90,
        background:'linear-gradient(180deg, rgba(0,0,0,.55), transparent)',
        pointerEvents:'none'
      }} />
      {/* bottom fade — masks painted decoration */}
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
        {shown || '\u00A0'}
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
        src={`assets/dealers/${gender}/avatar.png`}
        alt=""
        style={{
          width: 30, height: 30, borderRadius: '50%',
          objectFit: 'cover', objectPosition: 'center top',
          boxShadow:'0 0 0 1px rgba(201,162,106,.55), 0 0 8px rgba(201,162,106,.35)'
        }}
      />
      <span style={{ fontSize: 11, lineHeight: 1, letterSpacing:'.18em', color:'var(--ivory-dim)', textTransform:'uppercase' }}>Your dealer</span>
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

Object.assign(window, { DealerPanel, pickLine, DEALER_VOICES, DEALER_NAMES });
