/* eslint-disable */
// Stickman / dealer panel — portrait, expression-driven, speech bubble.
// Craps-specific dialogue. Portrait assets are shared with blackjack and
// referenced via `../blackjack/assets/...` (matches the three-card-poker
// pattern).

const CR_DEALER_NAMES = ['Marcus', 'Melissa'];

const CR_DEALER_VOICES = {
  Marcus: {
    greet: [
      "{p}. Sit. Pick a chip.",
      "Evening. Marcus on the stick tonight.",
      "Bet up when you're ready, {p}.",
      "Twelve years on the box. Show me something.",
      "Cards are warm. Dice are warmer."
    ],
    idle: [
      "Bet up.",
      "Chips when ready.",
      "Your move, {p}.",
      "Pass line, don't pass, field. Pick.",
      "Place your bets."
    ],
    idle_long: [
      "Whenever you're ready.",
      "Take your time, {p}.",
      "I'll be here.",
      "Dice aren't going anywhere."
    ],
    bet_low: [
      "Modest. Fine.",
      "Low bet noted.",
      "Conservative. Lasts longer."
    ],
    bet_high: [
      "Real bet.",
      "All right then.",
      "Now I'm awake."
    ],
    bet_huge: [
      "Big swing. Hope you slept on it.",
      "That's a statement bet.",
      "Pit's looking. Don't blame me when they do."
    ],
    pass: [
      "Pass line. Classic.",
      "Pass it is.",
      "Best bet at the table. Smart."
    ],
    dont_pass: [
      "Dark side. Bold.",
      "Don't pass. Lower edge. I respect it.",
      "Betting against the room. OK."
    ],
    field: [
      "Field. One-roll.",
      "House loves the field.",
      "Field's tempting. Edge is rough."
    ],
    place: [
      "Place bet up.",
      "Number locked in.",
      "Place it. Six and eight pay best."
    ],
    come: [
      "Come bet's out.",
      "Come bet rides.",
      "Builds coverage. Smart."
    ],
    odds: [
      "Odds behind. Best move.",
      "Zero edge. Smart.",
      "Maxing odds. That's the play."
    ],
    roll: [
      "Coming out.",
      "Dice up.",
      "Here we go.",
      "Shooter shoots."
    ],
    point_set: [
      "Point is {pt}. Hit it.",
      "Point's {pt}. Roll it before the seven.",
      "{pt} the point.",
      "Mark {pt}. Off and on."
    ],
    natural: [
      "Seven, winner!",
      "Eleven, paid.",
      "Natural. Pay the line.",
      "Pass wins."
    ],
    craps: [
      "Craps. Line away.",
      "Crap out. Tough.",
      "No good. Come-out's brutal.",
      "Two/three/twelve. Sorry."
    ],
    point_made: [
      "Point made. Pay the line.",
      "{pt}. Winner. Pay the front.",
      "Made it. Nice roll, {p}.",
      "Pass wins. Pay it."
    ],
    seven_out: [
      "Seven out. Line away.",
      "Out seven. Take it down.",
      "Sevened. New shooter.",
      "Seven. Sorry, {p}."
    ],
    field_win: [
      "Field pays.",
      "Field's good.",
      "Pay the field."
    ],
    place_win: [
      "Place bet pays.",
      "Place hits.",
      "Pay the place."
    ],
    come_set: [
      "Come bet rides on the {pt}.",
      "Come moves to {pt}.",
      "{pt}'s a come point now."
    ],
    come_won: [
      "Come pays.",
      "Come bet wins.",
      "Pay the come."
    ],
    losing_streak: [
      "Rough patch. Bet smaller.",
      "Variance. It turns.",
      "Don't tilt. Breathe."
    ],
    streak2: [
      "Two for two.",
      "Heating up.",
      "Back to back."
    ],
    streak3: [
      "Three straight. Watch yourself.",
      "Hot shooter.",
      "Three in a row. Don't push it."
    ],
    streak5: [
      "Five. Real heater.",
      "Five wins. Tip your stickman.",
      "Streak's real now."
    ],
    rebet: [
      "Same again. Got it.",
      "Repeat bet. Sure."
    ],
    after_tip: [
      "Appreciated.",
      "Thanks. I'll remember.",
      "Generous. Noted."
    ]
  },
  Melissa: {
    greet: [
      "Welcome to the dice, {p}. Roll something fun for me.",
      "Evening, {p}. The bones are feeling friendly.",
      "{p}! Pull up a chair. I just chalked the dice.",
      "Look who's here. Pick a chip, {p} — let's see what the table thinks."
    ],
    idle: [
      "Place your chips when you're ready, {p}.",
      "Take your time. The dice'll wait.",
      "Bet up, sweetie. The night is young.",
      "Pass, don't pass, field — pick your poison."
    ],
    idle_long: [
      "Take your time, {p}. Dice aren't going anywhere.",
      "Whenever you're ready.",
      "Penny for your thoughts, {p}?"
    ],
    bet_low: [
      "Testing the waters, I see.",
      "Easy does it. Smart, {p}.",
      "Conservative tonight? I respect it."
    ],
    bet_high: [
      "Now we're talking.",
      "Ooh, feeling lucky?",
      "{p}, you're trying to make my night interesting."
    ],
    bet_huge: [
      "Whew. Bold. Don't say I didn't warn you.",
      "Big spender alert. Pit boss is watching.",
      "That's a serious bet, {p}."
    ],
    pass: [
      "Pass line. The classic. Good call, {p}.",
      "Pass it is. Let's hit a natural.",
      "Best edge at the table. Smart."
    ],
    dont_pass: [
      "Dark side, hmm? You're playing dirty.",
      "Don't pass. I won't tell anyone, {p}.",
      "Betting against the room. Bold."
    ],
    field: [
      "Field bet. One and done — let's see.",
      "Field's flashy. House loves it.",
      "{p}, the field is tempting but it bites."
    ],
    place: [
      "Place bet locked. Six and eight are sweet.",
      "Number's covered.",
      "Place it. I'll roll for it, {p}."
    ],
    come: [
      "Come bet riding. I like a stacker.",
      "Come bet's out. Coverage is sexy.",
      "Building action. Smart, {p}."
    ],
    odds: [
      "Odds behind! That's the play.",
      "Zero house edge. Now you're cooking.",
      "Maxing odds, {p}? My kind of player."
    ],
    roll: [
      "Coming out!",
      "Dice up!",
      "Here we go, {p}.",
      "Shooter shoots! ✨"
    ],
    point_set: [
      "Point is {pt}, {p}. Make it before the seven!",
      "Point's {pt}. The hard part starts now.",
      "{pt} the point. Off and on, baby.",
      "Mark {pt}. Let's hit it again."
    ],
    natural: [
      "SEVEN, winner! Pay the line.",
      "Eleven, paid. {p}, you read me right.",
      "Natural off the come-out. Beautiful.",
      "Pass wins! ✨"
    ],
    craps: [
      "Craps. The deck's cruel sometimes.",
      "Crap out. Shake it off, {p}.",
      "No good. Try again — fresh come-out.",
      "Two/three/twelve. Tough start."
    ],
    point_made: [
      "Point MADE! Pay the front, {p}!",
      "{pt}! You did it, {p}!",
      "Made the point. Beautiful roll.",
      "Pass wins! ✨ Tip your stickman."
    ],
    seven_out: [
      "Seven out. Line away. Sorry, {p}.",
      "Out seven. The dice turn cold sometimes.",
      "Sevened. New shooter — but you can re-bet.",
      "Seven. Hurts. Variance is a beast."
    ],
    field_win: [
      "Field pays! Quick win.",
      "Field's good, {p}.",
      "Field hits."
    ],
    place_win: [
      "Place bet pays. Nicely done.",
      "Place hits. Take the win.",
      "Pay the place, {p}."
    ],
    come_set: [
      "Come bet rides on the {pt} now, {p}.",
      "Come moves to {pt}.",
      "{pt}'s a come point. Take odds!"
    ],
    come_won: [
      "Come pays. Stack growing.",
      "Come bet wins. ✨",
      "Pay the come, {p}."
    ],
    losing_streak: [
      "Tough patch. The dice'll turn.",
      "Hang in, {p}. Variance is real.",
      "Don't tilt. Breathe. Bet smaller."
    ],
    streak2: [
      "Two in a row. Don't get cocky, {p}.",
      "Heater starting. I see you.",
      "Back-to-back. Dice are friendly."
    ],
    streak3: [
      "Three! {p}, you're getting dangerous.",
      "Hat trick. Pit boss is taking notes.",
      "Three straight. Tip your dealer. ✨"
    ],
    streak5: [
      "Five in a row?! {p}, are you cheating?",
      "Five. I should be nervous. I AM nervous.",
      "Whatever you're drinking, get me one. Five straight."
    ],
    rebet: [
      "Same as last? Got it.",
      "The usual, {p}? Coming up."
    ],
    after_tip: [
      "You remembered. You're the best, {p}. ✨",
      "Tipped again? Marry me. (Kidding. Mostly.)",
      "Generous. Let me find you a hot table."
    ]
  }
};

function crPickLine(key, ctx = {}) {
  const dealer = ctx.dealer || 'Marcus';
  const voice = CR_DEALER_VOICES[dealer] || CR_DEALER_VOICES.Marcus;
  const lines = voice[key] || voice.idle;
  const line = lines[Math.floor(Math.random() * lines.length)];
  return line
    .replace(/\{p\}/g, ctx.player || 'friend')
    .replace(/\{d\}/g, dealer)
    .replace(/\{pt\}/g, ctx.point != null ? ctx.point : 'the point');
}

// Map roll outcome to dealer expression so portrait + dialogue stay aligned.
function crOutcomeToExpression(bannerKind, totalWon) {
  if (bannerKind === 'natural')    return 'happy';
  if (bannerKind === 'point_made') return 'shocked';
  if (bannerKind === 'seven_out')  return 'sad';
  if (bannerKind === 'craps')      return 'sad';
  if (bannerKind === 'point_set')  return 'idle';
  if (totalWon > 0)  return 'happy';
  if (totalWon < 0)  return 'sad';
  return 'idle';
}

function CRDealerPortrait({ expression = 'idle', shift = 0, gender = 'male', idle = false, mood = 0 }) {
  const file = expression;
  const src = `../blackjack/assets/dealers/${gender}/${file}.png`;
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
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: 'inherit' }}>
      {layers.map(layer => (
        <img
          key={layer.key}
          src={layer.src}
          alt="stickman"
          onError={(e) => { e.currentTarget.src = `../blackjack/assets/dealers/male/idle.png`; }}
          className={animClass}
          style={{
            position: 'absolute',
            left: '50%',
            top: `${shift}px`,
            transform: 'translateX(-50%)',
            height: '120%',
            objectFit: 'cover',
            objectPosition: 'center top',
            opacity: layer.opacity,
            transition: 'opacity .45s ease, filter .45s ease',
            filter: `blur(${layer.blur}px) saturate(${sat}) contrast(1.02) brightness(${bright})`
          }}
        />
      ))}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 50% 35%, transparent 50%, rgba(0,0,0,.55) 100%)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 0, height: 90,
        background: 'linear-gradient(180deg, rgba(0,0,0,.55), transparent)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, height: 220,
        background: 'linear-gradient(0deg, var(--ink-2) 8%, rgba(15,12,8,.85) 35%, transparent 100%)',
        pointerEvents: 'none'
      }} />
    </div>
  );
}

function CRSpeechBubble({ text, dealerName = 'Marcus' }) {
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
      position: 'relative',
      opacity: 1,
      background: 'linear-gradient(180deg, rgba(255,253,246,.97), rgba(244,236,216,.97))',
      color: '#1a1410',
      padding: '14px 18px 16px',
      borderRadius: 14,
      boxShadow: '0 14px 30px rgba(0,0,0,.45), 0 2px 0 rgba(255,255,255,.5) inset, 0 0 0 1px rgba(201,162,106,.5)',
      maxWidth: 320,
      minHeight: 70
    }}>
      <div style={{
        fontSize: 11, fontWeight: 600, letterSpacing: '.16em',
        color: 'var(--brass-deep)', textTransform: 'uppercase', marginBottom: 4
      }}>{dealerName}</div>
      <div style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: 17, lineHeight: 1.35,
        fontStyle: 'italic',
        color: '#1a1410'
      }} className={done ? '' : 'blink-cursor'}>
        {shown || ' '}
      </div>
      <div style={{
        position: 'absolute',
        top: -10, left: 36,
        width: 0, height: 0,
        borderLeft: '10px solid transparent',
        borderRight: '10px solid transparent',
        borderBottom: '12px solid rgba(255,253,246,.97)',
        filter: 'drop-shadow(0 -1px 1px rgba(0,0,0,.15))'
      }} />
    </div>
  );
}

function CRDealerNameplate({ name, gender = 'male' }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 10,
      padding: '6px 14px 6px 6px',
      background: 'linear-gradient(180deg, rgba(20,12,6,.85), rgba(10,6,3,.85))',
      border: '1px solid rgba(201,162,106,.45)',
      borderRadius: 999,
      backdropFilter: 'blur(6px)',
      boxShadow: '0 8px 18px rgba(0,0,0,.45)'
    }}>
      <img
        src={`../blackjack/assets/dealers/${gender}/avatar.png`}
        alt=""
        style={{
          width: 30, height: 30, borderRadius: '50%',
          objectFit: 'cover', objectPosition: 'center top',
          boxShadow: '0 0 0 1px rgba(201,162,106,.55), 0 0 8px rgba(201,162,106,.35)'
        }}
      />
      <span style={{ fontSize: 11, lineHeight: 1, letterSpacing: '.18em', color: 'var(--ivory-dim)', textTransform: 'uppercase' }}>Stickman</span>
      <span style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: 19, lineHeight: 1, color: 'var(--brass-2)', fontWeight: 600, letterSpacing: '.02em'
      }}>{name}</span>
    </div>
  );
}

function CRDealerPanel({ name, expression, message, onTipDealer, tipped, playerName, gender, isIdle = false, mood = 0, onEditName }) {
  const g = gender || (name === 'Melissa' ? 'female' : 'male');
  return (
    <div style={{
      position: 'relative',
      width: 380,
      height: '100%',
      borderRadius: 18,
      overflow: 'hidden',
      background: '#1a1208',
      boxShadow: 'var(--shadow-deep), inset 0 0 0 1px rgba(201,162,106,.18)'
    }}>
      <CRDealerPortrait expression={expression} gender={g} idle={isIdle} mood={mood} />

      <div style={{ position: 'absolute', top: 18, left: 18, right: 18, zIndex: 3 }}>
        <CRDealerNameplate name={name} gender={g} />
      </div>

      <div style={{ position: 'absolute', left: 22, right: 22, bottom: 70, zIndex: 4 }}>
        {message && <CRSpeechBubble text={message} dealerName={name} />}
      </div>

      <div style={{ position: 'absolute', left: 14, bottom: 14, zIndex: 3 }}>
        <button
          onClick={onEditName}
          title="Change name"
          style={{
            display: 'inline-flex', alignItems: 'baseline', gap: 6,
            padding: '8px 14px',
            background: 'rgba(20,12,6,.7)',
            color: 'var(--brass-2)',
            border: '1px solid rgba(201,162,106,.4)',
            borderRadius: 999,
            fontFamily: "'Playfair Display', serif",
            fontSize: 14, fontStyle: 'italic',
            cursor: 'pointer',
            backdropFilter: 'blur(6px)',
            transition: 'all .2s',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(0,0,0,.4)'
          }}
        >
          <span style={{
            fontSize: 9, letterSpacing: '.22em', textTransform: 'uppercase',
            color: 'var(--ivory-dim)', fontStyle: 'normal', fontFamily: 'system-ui, sans-serif'
          }}>Now playing</span>
          {playerName}
        </button>
      </div>

      <div style={{ position: 'absolute', right: 14, bottom: 14, zIndex: 3 }}>
        <button
          onClick={onTipDealer}
          style={{
            padding: '8px 14px',
            background: tipped ? 'linear-gradient(180deg, #e6c590, #c9a26a)' : 'rgba(20,12,6,.7)',
            color: tipped ? '#1a1208' : 'var(--brass-2)',
            border: '1px solid rgba(201,162,106,.5)',
            borderRadius: 999,
            fontSize: 11, fontWeight: 700, letterSpacing: '.16em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            backdropFilter: 'blur(6px)',
            transition: 'all .2s',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(0,0,0,.4)'
          }}
        >
          {tipped ? '✓ Thanks!' : '✦ Tip $5'}
        </button>
      </div>
    </div>
  );
}

Object.assign(window, {
  CRDealerPanel,
  crPickLine,
  crOutcomeToExpression,
  CR_DEALER_VOICES,
  CR_DEALER_NAMES
});
