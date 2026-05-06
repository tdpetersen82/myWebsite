/* eslint-disable */
// Dealer panel — portraits, expression-driven, speech bubble. Three Card
// Poker–specific dialogue. Portrait assets live with blackjack and are
// referenced via `../blackjack/assets/...`.

const TCP_DEALER_NAMES = ['Melissa', 'Marcus'];

const TCP_DEALER_VOICES = {
  Melissa: {
    greet: [
      "Welcome to the three-card table, {p}. Let's see what fortune has tonight.",
      "{p}! Right on time. The deck is feeling friendly.",
      "Three cards each, {p}. Quick game, big swings — my favorite.",
      "Pull up a chair, {p}. Pair Plus is calling your name."
    ],
    idle: [
      "Place your bets, {p}. Ante and Pair Plus when you're ready.",
      "Take your time. Three cards is over before you know it.",
      "Bet up, {p}. Pair Plus rewards the bold.",
      "The cards aren't going anywhere."
    ],
    idle_long: [
      "Whenever you're ready, {p}.",
      "Need a moment? Take it.",
      "Penny for your thoughts, {p}?"
    ],
    bet_low: [
      "Easing in. Smart.",
      "Conservative tonight, {p}? I respect it.",
      "Cautious money. Lasts longer."
    ],
    bet_high: [
      "Now we're playing.",
      "Ooh, feeling lucky?",
      "{p}, you're trying to make my night interesting."
    ],
    bet_huge: [
      "Whew. Big swing energy. Don't say I didn't warn you.",
      "Now I'm awake. Pit's looking.",
      "That's a serious bet, {p}."
    ],
    bet_pp: [
      "Pair Plus on top. Brave, brave.",
      "Side bet locked. The flush gods love an optimist.",
      "{p} likes a little extra spice."
    ],
    deal: [
      "Three each. Show me what you got.",
      "Cards out. Hold your breath.",
      "Three for you, three for me. ✨",
      "Quick deal. Decide fast."
    ],
    decision_strong: [
      "That's a hand worth backing, {p}.",
      "Ooh — back that one up.",
      "Strong. Play it.",
      "I'd play that all day."
    ],
    decision_marginal: [
      "Edge case. Coin flip from here.",
      "Tough one, {p}. Trust your gut.",
      "Hmm. Could go either way."
    ],
    decision_weak: [
      "I won't tell anyone if you fold, {p}.",
      "Not pretty. Folding's allowed.",
      "Below the line. Cut your losses?"
    ],
    fold: [
      "Smart fold. Living to play another hand.",
      "Folded. Saved you a Play bet.",
      "Wise. Some hands just won't win."
    ],
    fold_pp_save: [
      "Folded — but Pair Plus saved us! ✨",
      "Tough hand, sweet Pair Plus. {p}, you got a freebie.",
      "Folded the main, but the side bet came through."
    ],
    win: [
      "{p}, that was beautifully done.",
      "Nicely played. The chips slide your way.",
      "You read the cards right. Take it.",
      "Clean win, {p}."
    ],
    lose: [
      "Sorry sweetie, mine this time.",
      "House catches a break. Go again?",
      "Tough one, {p}. Variance is a beast.",
      "Mine. We'll get you next hand."
    ],
    push: [
      "Tie game, {p}. Bets stay.",
      "Push. Standoff.",
      "Even money. Same hand twice — that's rare."
    ],
    dealer_no_qualify: [
      "Dealer didn't make it — Ante wins!",
      "I'm short of Queen-high. Play pushes.",
      "{p} — I couldn't qualify. Take your Ante.",
      "No qualify on my end. Free Ante."
    ],
    bonus_straight: [
      "Straight bonus, {p}! Even money on the bonus.",
      "Straight pays a unit. Not bad.",
      "Bonus on the Ante. Nice."
    ],
    bonus_trips: [
      "TRIPS, {p}! Look at you!",
      "Three of a kind. Four-to-one bonus on that.",
      "Trips out the gate. Real hand."
    ],
    bonus_straight_flush: [
      "STRAIGHT FLUSH! {p}, I'm screaming!",
      "Five-to-one bonus. {p}, today's your day!",
      "Straight flush on Ante Bonus. Buy yourself something."
    ],
    pp_pair: [
      "Pair Plus comes in, {p}!",
      "Even money on the side bet.",
      "Pair Plus pays. Welcome bonus."
    ],
    pp_flush: [
      "Flush! Pair Plus loves you, {p}.",
      "Four-to-one on the flush. Healthy.",
      "Flush on the side bet. Sweet."
    ],
    pp_straight: [
      "Six-to-one straight on Pair Plus!",
      "Straight on PP. {p}, that's real money.",
      "Pair Plus straight. Beautiful."
    ],
    pp_trips: [
      "THIRTY to one, {p}! Trips on Pair Plus!",
      "Pair Plus trips. The room just stopped.",
      "30-to-1. Tip your dealer. ✨"
    ],
    pp_sf: [
      "40 TO 1 — {p}, this is YOUR night!",
      "Straight flush on Pair Plus. You made my year.",
      "Forty-to-one. Best bet at the table just hit."
    ],
    rebet: [
      "Same as last? Got it.",
      "The usual, {p}? Coming up.",
      "Repeat bet. Locked."
    ],
    after_tip: [
      "You remembered. You're the best, {p}. ✨",
      "Tipped again? Marry me. (Kidding. Mostly.)",
      "Generous. Let me find you a hot deck."
    ],
    bankrupt: [
      "Out of chips, {p}. Reload?",
      "Tap out. The table got you tonight.",
      "Empty rack, {p}. Lobby or reload — your call."
    ]
  },
  Marcus: {
    greet: [
      "{p}. Sit. Three card poker. Quick game.",
      "Evening. Marcus dealing tonight.",
      "Bet up when you're ready, {p}.",
      "Twelve years on this table. Ante or Pair Plus, your call."
    ],
    idle: [
      "Bet up.",
      "Chips when ready.",
      "Your move, {p}.",
      "Ante or PP. Pick."
    ],
    idle_long: [
      "Whenever you're ready.",
      "Take your time, {p}.",
      "I'll be here."
    ],
    bet_low: [
      "Modest. Fine.",
      "Low bet noted.",
      "Conservative. Lasts."
    ],
    bet_high: [
      "Real bet.",
      "All right then.",
      "Now I'm awake."
    ],
    bet_huge: [
      "Big swing. Hope you slept on it.",
      "Statement bet.",
      "Pit's looking."
    ],
    bet_pp: [
      "Side bet. Bold.",
      "Pair Plus. Higher edge. You know.",
      "Optional but expensive."
    ],
    deal: [
      "Cards.",
      "Three each. Out they go.",
      "Here you are."
    ],
    decision_strong: [
      "Play it.",
      "Strong hand. Back it.",
      "Worth the Play bet."
    ],
    decision_marginal: [
      "Edge case.",
      "Coin flip.",
      "Tough call."
    ],
    decision_weak: [
      "I'd fold.",
      "Below the line.",
      "Not pretty."
    ],
    fold: [
      "Smart fold.",
      "Live to play again.",
      "Folded. Noted."
    ],
    fold_pp_save: [
      "Folded — Pair Plus pays.",
      "Saved by the side bet.",
      "Pair Plus came through."
    ],
    win: [
      "Yours.",
      "Good hand.",
      "You take it."
    ],
    lose: [
      "House.",
      "Mine.",
      "Dealer takes it."
    ],
    push: [
      "Push. Bet stays.",
      "Tie. We go again.",
      "Nobody wins."
    ],
    dealer_no_qualify: [
      "No qualify. Ante pays. Play pushes.",
      "Short of Queen-high. Take your Ante.",
      "Couldn't qualify. Your Ante."
    ],
    bonus_straight: [
      "Straight. Bonus pays one.",
      "Ante bonus on the straight.",
      "Bonus straight."
    ],
    bonus_trips: [
      "Trips. Four to one bonus.",
      "Real hand. Pays on Ante.",
      "Three of a kind. Nice."
    ],
    bonus_straight_flush: [
      "Straight flush. Five to one. Today's your day.",
      "Top bonus. Pays five.",
      "Straight flush. Don't see those often."
    ],
    pp_pair: [
      "Pair Plus pays.",
      "Side bet wins. One to one.",
      "PP comes in."
    ],
    pp_flush: [
      "Flush. Pair Plus four to one.",
      "Side bet flush. Healthy.",
      "Flush pays on PP."
    ],
    pp_straight: [
      "Straight. Six to one on PP.",
      "Pair Plus straight. Real money.",
      "PP straight. Pays well."
    ],
    pp_trips: [
      "Trips on Pair Plus. Thirty to one.",
      "30-to-1. {p}, you remember this one.",
      "Trips PP. Big."
    ],
    pp_sf: [
      "Straight flush. 40 to 1. Buy yourself something.",
      "Forty to one. Best bet at the table.",
      "PP straight flush. {p}, that pays."
    ],
    rebet: [
      "Same again. Got it.",
      "Repeat bet. Sure."
    ],
    after_tip: [
      "Appreciated.",
      "Thanks. I'll remember.",
      "Generous. Noted."
    ],
    bankrupt: [
      "Out of chips. Reload?",
      "Tap out.",
      "Rack's empty."
    ]
  }
};

function tcpPickLine(key, ctx = {}) {
  const dealer = ctx.dealer || 'Melissa';
  const voice = TCP_DEALER_VOICES[dealer] || TCP_DEALER_VOICES.Melissa;
  const lines = voice[key] || voice.idle;
  const line = lines[Math.floor(Math.random() * lines.length)];
  return line.replace(/\{p\}/g, ctx.player || 'friend').replace(/\{d\}/g, dealer);
}

// Map outcome shorthand to dealer expression so portrait + line stay aligned.
function tcpOutcomeToExpression(kind, hasBonus) {
  if (kind === 'win') return 'sad';
  if (kind === 'lose') return 'happy';
  if (kind === 'push') return 'idle';
  if (kind === 'no-qualify') return 'sad';
  if (kind === 'fold') return 'idle';
  if (kind === 'bonus-win') return hasBonus ? 'shocked' : 'sad';
  return 'idle';
}

function TCPDealerPortrait({ expression = 'idle', shift = 0, gender = 'female', idle = false, mood = 0 }) {
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
    <div style={{
      position: 'absolute', inset: 0,
      overflow: 'hidden',
      borderRadius: 'inherit'
    }}>
      {layers.map(layer => (
        <img
          key={layer.key}
          src={layer.src}
          alt="dealer"
          onError={(e) => { e.currentTarget.src = `../blackjack/assets/dealers/female/${file}.png`; }}
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

function TCPSpeechBubble({ text, dealerName = 'Melissa' }) {
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

function TCPDealerNameplate({ name, gender = 'female' }) {
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
      <span style={{ fontSize: 11, lineHeight: 1, letterSpacing: '.18em', color: 'var(--ivory-dim)', textTransform: 'uppercase' }}>Your dealer</span>
      <span style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: 19, lineHeight: 1, color: 'var(--brass-2)', fontWeight: 600, letterSpacing: '.02em'
      }}>{name}</span>
    </div>
  );
}

function DealerPanel({ name, expression, message, playerName, gender = 'female', isIdle = false, mood = 0, onEditName }) {
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
      <TCPDealerPortrait expression={expression} gender={gender} idle={isIdle} mood={mood} />

      <div style={{ position: 'absolute', top: 18, left: 18, right: 18, zIndex: 3 }}>
        <TCPDealerNameplate name={name} gender={gender} />
      </div>

      <div style={{
        position: 'absolute', left: 22, right: 22, bottom: 70, zIndex: 4
      }}>
        {message && <TCPSpeechBubble text={message} dealerName={name} />}
      </div>

      <div style={{
        position: 'absolute', left: 14, bottom: 14, zIndex: 3
      }}>
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
          }}>Now serving</span>
          {playerName}
        </button>
      </div>
    </div>
  );
}

Object.assign(window, {
  DealerPanel,
  tcpPickLine,
  tcpOutcomeToExpression,
  TCP_DEALER_VOICES,
  TCP_DEALER_NAMES
});
