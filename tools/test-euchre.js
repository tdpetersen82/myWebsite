#!/usr/bin/env node
/*
 * Headless rules test for /euchre/.
 *
 * The game is a self-contained IIFE inside euchre/index.html, so this pulls the
 * inline <script> out, runs it against a minimal DOM stub with synchronous
 * timers, and then drives seat 0 through window.__euchre. That exercises the
 * real bidding/play/scoring code — not a copy of it.
 *
 *   node tools/test-euchre.js [hands]          seat 0 bids and plays at random
 *   node tools/test-euchre.js [hands] --auto   all four seats use the game's own
 *                                              evaluator, so the euchre rate and
 *                                              point spread reflect real balance
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const HANDS = parseInt(process.argv[2], 10) || 3000;
const AUTO = process.argv.includes('--auto');
const SRC = path.join(__dirname, '..', 'euchre', 'index.html');

// ── minimal DOM ──────────────────────────────────────────────────────────
function makeEl(tag) {
  const el = {
    tagName: (tag || 'div').toUpperCase(),
    children: [], style: {}, dataset: {}, _cls: new Set(),
    _text: '', _html: '', onclick: null, _listeners: {},
    get className() { return [...this._cls].join(' '); },
    set className(v) { this._cls = new Set(String(v).split(/\s+/).filter(Boolean)); },
    classList: null,
    get textContent() { return this._text; },
    set textContent(v) { this._text = String(v); },
    get innerHTML() { return this._html; },
    set innerHTML(v) { this._html = String(v); this.children = []; },
    parentElement: null,
    appendChild(c) { this.children.push(c); c.parentElement = this; return c; },
    setAttribute() {}, getAttribute() { return null; },
    addEventListener(t, fn) { (this._listeners[t] = this._listeners[t] || []).push(fn); },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    closest() { return null; },
    focus() {}, click() { if (this.onclick) this.onclick(); },
  };
  el.classList = {
    add: (...c) => c.forEach(x => el._cls.add(x)),
    remove: (...c) => c.forEach(x => el._cls.delete(x)),
    contains: (c) => el._cls.has(c),
    toggle: (c) => (el._cls.has(c) ? el._cls.delete(c) : el._cls.add(c)),
  };
  return el;
}

const elements = {};
const getEl = (id) => {
  if (!elements[id]) {
    const el = makeEl('div');
    el.parentElement = makeEl('div'); // the page reads .parentElement.style when scaling
    elements[id] = el;
  }
  return elements[id];
};

const document = {
  getElementById: getEl,
  createElement: makeEl,
  querySelector: () => makeEl('div'),
  querySelectorAll: () => [],
  documentElement: { clientWidth: 1200, style: {} },
  addEventListener() {},
};

const store = {};
const sandbox = {
  document,
  console,
  Math, JSON, Object, Array, String, Number, Boolean, Error, Date,
  parseInt, parseFloat, isNaN,
  localStorage: {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
  },
  // Synchronous timers: the AI cascades run to completion inline.
  setTimeout: (fn) => { fn(); return 0; },
  clearTimeout: () => {},
  getComputedStyle: () => ({ getPropertyValue: () => '82' }),
  requestAnimationFrame: (fn) => { fn(); return 0; },
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.window.innerWidth = 1200;
sandbox.window.innerHeight = 900;
sandbox.window.addEventListener = () => {};
// The card sprite helper the page loads from ../casino/casino-cards.js
sandbox.window.CASINO_CARDS = { faceStyle: () => ({}) };

// ── pull the inline game script out of the page ──────────────────────────
const html = fs.readFileSync(SRC, 'utf8');
const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)]
  .map(m => m[1])
  .filter(s => s.includes("'use strict'") && s.includes('__euchre'));
if (scripts.length !== 1) {
  console.error(`Expected exactly 1 game script, found ${scripts.length}. Did the page structure change?`);
  process.exit(1);
}

vm.createContext(sandbox);
try {
  vm.runInContext(scripts[0], sandbox, { filename: 'euchre-inline.js' });
} catch (e) {
  console.error('Game script threw on load:\n', e);
  process.exit(1);
}

const E = sandbox.window.__euchre;
if (!E || !E.state) { console.error('__euchre test API missing'); process.exit(1); }

// ── drive it ─────────────────────────────────────────────────────────────
const fails = [];
const seen = { hands: 0, misdeal: 0, euchred: 0, march: 0, aloneMarch: 0, alonePartial: 0, single: 0, games: 0 };
const pointsSeen = new Set();
let prevScore = [0, 0];

const fail = (msg) => { if (fails.length < 25) fails.push(msg); };
const rnd = (n) => Math.floor(Math.random() * n);

E.newGame();

for (let step = 0; step < HANDS * 400; step++) {
  const s = E.state();
  if (seen.hands >= HANDS) break;

  // Everyone passed twice — dead hand, no score, next dealer.
  if (s.phase === 'handover' && s.maker < 0) {
    if (s.teamScore[0] !== prevScore[0] || s.teamScore[1] !== prevScore[1]) {
      fail(`misdeal changed the score to ${s.teamScore}`);
    }
    seen.misdeal++;
    E.startHand();
    continue;
  }

  if (s.phase === 'handover') {
    const d0 = s.teamScore[0] - prevScore[0], d1 = s.teamScore[1] - prevScore[1];
    const mt = (s.maker === 0 || s.maker === 2) ? 0 : 1;
    const makerTricks = s.tricksWon[mt === 0 ? 0 : 1] + s.tricksWon[mt === 0 ? 2 : 3];
    const total = s.tricksWon.reduce((a, b) => a + b, 0);

    if (total !== 5) fail(`hand ${s.handNo}: tricks total ${total}, expected 5`);
    if (d0 < 0 || d1 < 0) fail(`hand ${s.handNo}: negative delta ${d0}/${d1}`);
    if (d0 > 0 && d1 > 0) fail(`hand ${s.handNo}: both teams scored (${d0}/${d1})`);
    const gained = d0 + d1;
    pointsSeen.add(gained);

    const makerGained = (mt === 0 ? d0 : d1);
    const defGained = (mt === 0 ? d1 : d0);
    if (makerTricks >= 3) {
      const expect = makerTricks === 5 ? (s.alone ? 4 : 2) : 1;
      if (makerGained !== expect) fail(`hand ${s.handNo}: makers took ${makerTricks}${s.alone ? ' alone' : ''}, scored ${makerGained}, expected ${expect}`);
      if (defGained !== 0) fail(`hand ${s.handNo}: defenders scored ${defGained} while makers made it`);
      if (makerTricks === 5) { s.alone ? seen.aloneMarch++ : seen.march++; }
      else { s.alone ? seen.alonePartial++ : seen.single++; }
    } else {
      if (defGained !== 2) fail(`hand ${s.handNo}: euchre paid ${defGained}, expected 2`);
      if (makerGained !== 0) fail(`hand ${s.handNo}: euchred makers scored ${makerGained}`);
      seen.euchred++;
    }
    if (s.alone && s.sittingOut < 0) fail(`hand ${s.handNo}: alone but nobody sitting out`);
    if (s.alone && s.tricksWon[s.sittingOut] !== 0) fail(`hand ${s.handNo}: sitting-out seat won tricks`);

    seen.hands++;
    prevScore = [s.teamScore[0], s.teamScore[1]];

    const over = s.teamScore[0] >= 10 || s.teamScore[1] >= 10;
    if (over) { seen.games++; prevScore = [0, 0]; E.newGame(); }
    else E.startHand();
    continue;
  }

  if (s.phase === 'bid1' || s.phase === 'bid2') {
    if (s.current !== 0) { fail('stalled: AI turn did not advance synchronously'); break; }
    if (AUTO) {
      // Seat 0 bids with the same evaluator the computer seats use, so the
      // resulting euchre rate reflects the game's balance, not the driver's.
      if (s.phase === 'bid1') {
        const sc = E.evalOrderUp(0);
        if (sc >= E.BID.order) E.callTrump(0, s.upSuit, sc >= E.BID.aloneOrder); else E.passBid();
      } else {
        const { suit, score } = E.bestNamedSuit(0);
        if (score >= E.BID.name) E.callTrump(0, suit, score >= E.BID.aloneName); else E.passBid();
      }
      continue;
    }
    const r = Math.random();
    if (s.phase === 'bid1') {
      if (r < 0.40) E.callTrump(0, s.upSuit, r < 0.07);
      else E.passBid();
    } else {
      const suits = ['s', 'h', 'd', 'c'].filter(x => x !== s.upSuit);
      if (r < 0.45) E.callTrump(0, suits[rnd(suits.length)], r < 0.08);
      else E.passBid();
    }
    continue;
  }

  if (s.phase === 'discard') {
    E.humanDiscard(s.hands[0][rnd(s.hands[0].length)]);
    continue;
  }

  if (s.phase === 'playing') {
    if (s.current !== 0) { fail('stalled: play did not reach seat 0'); break; }
    const legal = E.legalMoves(0);
    if (!legal.length) { fail('no legal moves for seat 0'); break; }
    // Legality invariant: if seat 0 can follow the led suit, every legal card must follow it.
    if (s.trick.length) {
      const led = E.effSuit(s.trick[0].card, s.trump);
      const canFollow = s.hands[0].some(c => E.effSuit(c, s.trump) === led);
      if (canFollow && !legal.every(c => E.effSuit(c, s.trump) === led)) {
        fail(`illegal option offered: must follow ${led}`);
      }
    }
    if (AUTO) E.aiPlay(0); else E.playCard(0, legal[rnd(legal.length)]);
    continue;
  }

  break;
}

console.log(`\nEuchre engine — ${seen.hands} scored hands, ${seen.games} full games, ${seen.misdeal} misdeals`);
console.log(`  single point : ${seen.single}`);
console.log(`  march (2)    : ${seen.march}`);
console.log(`  alone 3-4 (1): ${seen.alonePartial}`);
console.log(`  alone march  : ${seen.aloneMarch}`);
console.log(`  euchred (2)  : ${seen.euchred}`);
console.log(`  point values : ${[...pointsSeen].sort().join(', ')}`);
if (fails.length) {
  console.error(`\n✗ ${fails.length} FAILURES:`);
  fails.forEach(f => console.error('   ' + f));
  process.exit(1);
}
console.log('\n✓ all invariants held');
