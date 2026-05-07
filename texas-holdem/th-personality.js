/* eslint-disable */
// Texas Hold'em AI personalities — archetypes + voice lines.
// Exposed as window.TH_PERSONALITY.
(function () {
  // VPIP/PFR are tendencies, not strict probabilities. They modulate the
  // preflop range and the threshold above which we'll voluntarily put money
  // in the pot.
  const ARCHETYPES = {
    'tight-tom': {
      id: 'tight-tom',
      name: 'Tight Tom',
      shortName: 'Tom',
      tagline: 'Folds. Folds. Raises.',
      color: '#5a8fbf',
      initials: 'TT',
      vpip: 0.18,
      pfr: 0.14,
      aggression: 0.4,   // 0=passive, 1=hyper-aggressive
      bluff: 0.05,
      callDownLooseness: 0.7, // 1.0 = call at exactly correct odds; <1 needs better
      raiseSizingMul: 1.0,
    },
    'loose-lucy': {
      id: 'loose-lucy',
      name: 'Loose Lucy',
      shortName: 'Lucy',
      tagline: 'Anything could be a hand.',
      color: '#e07ca8',
      initials: 'LL',
      vpip: 0.42,
      pfr: 0.12,
      aggression: 0.25,
      bluff: 0.12,
      callDownLooseness: 1.4,
      raiseSizingMul: 0.85,
    },
    'maniac-mike': {
      id: 'maniac-mike',
      name: 'Maniac Mike',
      shortName: 'Mike',
      tagline: 'Re-raise everything.',
      color: '#d97a4a',
      initials: 'MM',
      vpip: 0.58,
      pfr: 0.38,
      aggression: 0.92,
      bluff: 0.32,
      callDownLooseness: 1.1,
      raiseSizingMul: 1.45,
    }
  };

  const VOICE_LINES = {
    'tight-tom': {
      sit:        ['Cards.', 'Mm.', "Let's see what I get."],
      fold:       ['Out.', 'Mucking.', 'Not this one.', 'Garbage.'],
      check:      ['Check.', 'Pass.'],
      call:       ['Call.', "I'll see it.", 'Sure.'],
      raise_small:['Bump it.', 'Up.', 'Two-bet.'],
      raise_big:  ['Re-raise.', 'I have something.', "Let's find out."],
      allin:      ['All-in. I have it.', 'Stack in. Pay me.'],
      win:        ['Take it down.', 'Mine.', 'Good hand.'],
      bad_beat:   ["You're kidding.", 'How.', 'Of course.'],
      bluff_caught:["Just the one time.", "Run-good.", "Whatever."],
      preflop_3bet:['Three-bet.', 'Up again.'],
      think:      ['…', 'Hmm.', 'Working it out.']
    },
    'loose-lucy': {
      sit:        ["Hi everyone! Let's gamble.", 'Ooh new hand!', 'I love these cards.'],
      fold:       ["Maybe next one!", 'Mucking, too bad.', 'Aw, garbage.'],
      check:      ['Check it!', 'Free card please.'],
      call:       ["I'll call!", "Why not, let's see.", 'Curious.'],
      raise_small:['Tiny raise!', "Let's bump it.", 'A little raise.'],
      raise_big:  ['Big raise!', 'I have something cute.', "Let's get it in!"],
      allin:      ['All-in! Eek!', 'YOLO!', "I'm shoving!"],
      win:        ["I won! Cute.", 'Yay me!', 'Lucky!'],
      bad_beat:   ['Aww no!', 'How did that hit?', 'Heartbreaker.'],
      bluff_caught:['Caught me!', 'Hee hee.', 'You got me.'],
      preflop_3bet:['Three-bet!', 'Bouncing back.'],
      think:      ['Hmmmm…', 'What do I do here.', 'Tough one.']
    },
    'maniac-mike': {
      sit:        ['LETS GO.', 'New hand, new bluff.', 'Bring it.'],
      fold:       ['FINE. Fold.', 'You got it. This time.', 'Pass — for now.'],
      check:      ['Check. Trapping.', 'Boring. Check.'],
      call:       ['Sure, call.', 'Pay to see.', "I'll look you up."],
      raise_small:['Raise!', 'Bump.', 'Pop it.'],
      raise_big:  ['BIG RAISE.', 'Fire it.', 'Re-raise!'],
      allin:      ['ALL-IN!', 'Stacks in. Make a decision.', "Let's gamble!"],
      win:        ["TOLD YOU.", 'Easy game.', 'Pay me.'],
      bad_beat:   ['ARE YOU KIDDING.', 'Outdraw city.', 'Of course.'],
      bluff_caught:['Yeah I had nothing.', 'Caught. Whatever.', 'Worth a shot.'],
      preflop_3bet:['THREE-BET. Reraise.', 'Up up up.'],
      think:      ['…calculating…', 'What can I represent…', 'Hmm.']
    }
  };

  function pickLine(archetypeId, key) {
    const v = VOICE_LINES[archetypeId] || VOICE_LINES['tight-tom'];
    const lines = v[key] || v.sit || [''];
    return lines[Math.floor(Math.random() * lines.length)];
  }

  // Default lineup for a 4-handed table. Player + 3 AI.
  const DEFAULT_LINEUP = ['tight-tom', 'loose-lucy', 'maniac-mike'];

  window.TH_PERSONALITY = { ARCHETYPES, VOICE_LINES, DEFAULT_LINEUP, pickLine };
})();
