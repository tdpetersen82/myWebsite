// Animal Detective — questions and Maddie's voice lines.
// Each question is a predicate against an animal record (see animals.js).
// Categories: body | habitat | food | people

window.AD_QUESTIONS = [
  // ── Body & Size ───────────────────────────────────────────────────────
  { id: "is-mammal",          category: "body",    text: "Is it a mammal?",                          fn: a => a.class === "mammal" },
  { id: "is-bird",            category: "body",    text: "Is it a bird?",                            fn: a => a.class === "bird" },
  { id: "bigger-than-person", category: "body",    text: "Is it bigger than a person?",              fn: a => a.size === "large" || a.size === "huge" },
  { id: "smaller-than-cat",   category: "body",    text: "Is it smaller than a cat?",                fn: a => a.size === "tiny" || a.size === "small" },
  { id: "has-wings",          category: "body",    text: "Does it have wings?",                      fn: a => a.hasWings },
  { id: "has-feathers",       category: "body",    text: "Does it have feathers?",                   fn: a => a.hasFeathers },
  { id: "has-scales",         category: "body",    text: "Does it have scales?",                     fn: a => a.hasScales },
  { id: "has-fur",            category: "body",    text: "Does it have fur?",                        fn: a => a.hasFur },
  { id: "stripes-or-spots",   category: "body",    text: "Does it have stripes or spots?",           fn: a => a.hasStripes || a.hasSpots },

  // ── Habitat ────────────────────────────────────────────────────────────
  { id: "lives-ocean",        category: "habitat", text: "Does it live in the ocean?",               fn: a => a.habitat.includes("ocean") },
  { id: "lives-cold",         category: "habitat", text: "Does it live where it's cold and snowy?",  fn: a => a.habitat.includes("arctic") || a.habitat.includes("mountain") },
  { id: "lives-jungle",       category: "habitat", text: "Does it live in the jungle?",              fn: a => a.habitat.includes("jungle") },
  { id: "lives-desert",       category: "habitat", text: "Does it live in the desert?",              fn: a => a.habitat.includes("desert") },
  { id: "can-fly",            category: "habitat", text: "Can it fly?",                              fn: a => a.canFly },
  { id: "lives-in-water",     category: "habitat", text: "Does it live in water?",                   fn: a => a.livesInWater },
  { id: "can-swim",           category: "habitat", text: "Can it swim?",                             fn: a => a.canSwim },
  { id: "can-climb-trees",    category: "habitat", text: "Can it climb trees?",                      fn: a => a.canClimbTrees },

  // ── Food & Behavior ────────────────────────────────────────────────────
  { id: "eats-meat",          category: "food",    text: "Does it eat meat?",                        fn: a => a.diet === "carnivore" || a.diet === "omnivore" },
  { id: "only-plants",        category: "food",    text: "Does it only eat plants?",                 fn: a => a.diet === "herbivore" },
  { id: "lays-eggs",          category: "food",    text: "Does it lay eggs?",                        fn: a => a.laysEggs },
  { id: "is-nocturnal",       category: "food",    text: "Is it active at night?",                   fn: a => a.isNocturnal },
  { id: "hibernates",         category: "food",    text: "Does it hibernate in winter?",             fn: a => a.hibernates },
  { id: "is-loud",            category: "food",    text: "Is it loud?",                              fn: a => a.isLoud },
  { id: "has-shell",          category: "food",    text: "Does it have a shell?",                    fn: a => a.hasShell },

  // ── People ─────────────────────────────────────────────────────────────
  { id: "is-pet",             category: "people",  text: "Could it be a pet?",                       fn: a => a.type === "pet" },
  { id: "on-farm",            category: "people",  text: "Would you find it on a farm?",             fn: a => a.type === "farm" },
  { id: "at-zoo",             category: "people",  text: "Would you see it at the zoo?",             fn: a => a.type === "zoo" },
  { id: "black-and-white",    category: "people",  text: "Is it usually black and white?",           fn: a => a.isBlackAndWhite },
  { id: "has-horns",          category: "people",  text: "Does it have horns or tusks?",             fn: a => a.hasHorns },
  { id: "many-legs",          category: "people",  text: "Does it have more than 4 legs?",           fn: a => a.legs > 4 },
];

window.AD_CATEGORIES = [
  { id: "body",    label: "Body & Size",     emoji: "🦴" },
  { id: "habitat", label: "Habitat",         emoji: "🏞️" },
  { id: "food",    label: "Food & Behavior", emoji: "🍽️" },
  { id: "people",  label: "People",          emoji: "🏡" },
];

window.MADDIE_LINES = {
  greet: [
    "Hi! I'm Zookeeper Maddie. I'm thinking of an animal — can you crack the case?",
    "Welcome, detective! I picked an animal. Ask me questions to find out which one!",
    "A new mystery animal! Ask me yes-or-no questions to figure it out.",
    "I've got an animal in mind. Twenty questions to guess it — let's go!",
  ],
  yes: [
    "Yes!",
    "That's right!",
    "Mhm — bingo!",
    "Yep!",
    "You got it!",
    "Affirmative, detective.",
    "Yes indeed!",
  ],
  no: [
    "Nope!",
    "Not this one.",
    "Hmm, no.",
    "Afraid not.",
    "Nope — keep going!",
    "Negative, partner.",
    "Not quite.",
  ],
  thinking: [
    "Hmm...",
    "Let me check my notes...",
    "Just a sec...",
  ],
  milestone_5: [
    "You're doing great — keep narrowing it down!",
    "Five questions in — nice work, detective!",
  ],
  milestone_10: [
    "Halfway there!",
    "Ten down, ten to go.",
  ],
  milestone_15: [
    "Getting close to twenty!",
    "Five questions left — make 'em count!",
  ],
  milestone_19: [
    "One more question, then you've gotta guess!",
    "Last question, detective!",
  ],
  win: [
    "YES! You cracked it! It's a {name}!",
    "You got it! It's a {name}!",
    "Case closed — it's a {name}!",
    "Bingo! A {name}, exactly!",
  ],
  lose_close: [
    "So close! It was a {name}!",
    "Aww — it was a {name}! Try another one?",
    "Twenty questions used up. It was a {name}!",
  ],
  lose_wrong: [
    "Good try — the answer was a {name}!",
    "Not quite — it was a {name}!",
    "Close one! It was a {name}!",
  ],
};
