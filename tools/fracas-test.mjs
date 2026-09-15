#!/usr/bin/env node
// Headless rules test for /fracas/ (engine.mjs). Run after any engine edit:
//   node tools/fracas-test.mjs
// Proves correctness of the rules (layout, blasts, movement, doors, timers,
// sudden death, the computer miner). It says nothing about feel.
import {
  createGame, step, drainEvents, placeBomb, blastCells, dangerMap, tileAt, bombAt, fireAt,
  FLOOR, WALL, BRICK, W, H, RULES, ENEMY, ITEM, startLevel,
} from '../fracas/engine.mjs';

let passed = 0, failed = 0;
function check(name, cond, detail = '') {
  if (cond) { passed++; return; }
  failed++;
  console.log('  FAIL', name, detail);
}
const DT = 1 / 60;
function run(state, seconds, inputs = () => [{ held: [] }]) {
  const events = [];
  for (let t = 0; t < seconds; t += DT) {
    step(state, DT, inputs(state));
    events.push(...drainEvents(state));
  }
  return events;
}
function skipIntro(state) { run(state, 1.7); check('intro ends in playing', state.status === 'playing'); }
function teleport(p, x, y) { p.x = x + 0.5; p.y = y + 0.5; }
function clearEnemies(state) { state.enemies.forEach(e => { e.alive = false; }); }

// ---------------------------------------------------------------- layout
console.log('layout');
for (let seed = 1; seed <= 25; seed++) {
  const s = createGame({ seed });
  let ok = true;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const border = x === 0 || y === 0 || x === W - 1 || y === H - 1;
    const pillar = x % 2 === 0 && y % 2 === 0;
    const t = tileAt(s, x, y);
    if ((border || pillar) && t !== WALL) ok = false;
    if (!(border || pillar) && t === WALL) ok = false;
  }
  check('walls only on border + pillars (seed ' + seed + ')', ok);
  check('spawn L is clear', tileAt(s, 1, 1) === FLOOR && tileAt(s, 2, 1) === FLOOR && tileAt(s, 1, 2) === FLOOR);
  // Every non-wall tile is reachable from the spawn once bricks are cleared.
  const seen = new Set(['1,1']), q = [[1, 1]];
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = nx + ',' + ny;
      if (tileAt(s, nx, ny) !== WALL && !seen.has(k)) { seen.add(k); q.push([nx, ny]); }
    }
  }
  let nonWall = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (tileAt(s, x, y) !== WALL) nonWall++;
  check('maze fully connected', seen.size === nonWall, seen.size + ' vs ' + nonWall);
  check('door hides under a brick', tileAt(s, s.door.x, s.door.y) === BRICK);
  check('items hide under bricks', [...s.items.keys()].every(k => s.grid[k] === BRICK));
  check('enemies spawn on floor away from the miner', s.enemies.every(e => tileAt(s, Math.floor(e.x), Math.floor(e.y)) === FLOOR && e.x + e.y >= 7));
}
{
  const a = createGame({ seed: 99 }), b = createGame({ seed: 99 });
  run(a, 20); run(b, 20);
  check('same seed → same world', JSON.stringify(a.grid) === JSON.stringify(b.grid) && JSON.stringify(a.enemies) === JSON.stringify(b.enemies));
}

// ---------------------------------------------------------------- blasts
console.log('blasts');
{
  const s = createGame({ seed: 3 });
  skipIntro(s);
  const p = s.players[0];
  // Carve a known corridor: row 1 from x=1..5 floor, brick at (6,1), floor beyond it.
  for (let x = 1; x <= 7; x++) s.grid[1 * W + x] = FLOOR;
  s.grid[1 * W + 6] = BRICK; s.grid[1 * W + 7] = FLOOR;
  teleport(p, 3, 1); p.range = 4;
  const cells = blastCells(s, 3, 1, 4);
  const has = (x, y) => cells.some(c => c[0] === x && c[1] === y);
  check('ray reaches the brick', has(6, 1));
  check('ray stops at the brick', !has(7, 1));
  check('ray stops at the outer wall', !has(0, 1) && has(1, 1));
  check('ray blocked by pillar below (3,2 is floor, 3,3 floor, then...)', has(3, 2));
  check('placeBomb works on floor', placeBomb(s, p));
  check('second bomb refused (1 max)', !placeBomb(s, p));
  check('bomb can be walked off but not re-entered', (() => {
    run(s, 0.4, () => [{ held: ['right'] }]);
    const left = Math.floor(p.x) === 4;
    run(s, 0.5, () => [{ held: ['left'] }]);
    return left && Math.floor(p.x) === 4 && p.x < 4.5;
  })());
  // Move to safety two tiles away before it goes off.
  run(s, 0.6, () => [{ held: ['right'] }]);
  teleport(p, 1, 3);
  const ev = run(s, 1.0);
  check('bomb explodes after its fuse', ev.some(e => e.type === 'explode'));
  check('brick at (6,1) destroyed', tileAt(s, 6, 1) === FLOOR && ev.some(e => e.type === 'brick' && e.x === 6));
  check('brick score awarded', s.score >= RULES.brickScore);
  check('fire lingers then clears', !fireAt(s, 3, 1));
}
{
  // Chain reaction: two bombs in line, the first triggers the second early.
  const s = createGame({ mode: 'battle', seed: 5 });
  skipIntro(s);
  for (let x = 1; x <= 5; x++) s.grid[1 * W + x] = FLOOR;
  const p = s.players[0]; p.maxBombs = 2; p.range = 2;
  teleport(p, 1, 1); placeBomb(s, p);
  run(s, 0.8);
  teleport(p, 3, 1); placeBomb(s, p);
  teleport(p, 1, 5);
  const ev = run(s, 1.3);
  check('chain reaction fires both bombs together', ev.filter(e => e.type === 'explode').length === 2 && s.bombs.length === 0);
}

// ---------------------------------------------------------------- movement
console.log('movement');
{
  const s = createGame({ seed: 11 });
  skipIntro(s); clearEnemies(s);
  const p = s.players[0];
  run(s, 0.5, () => [{ held: ['down'] }]);
  check('walks down the open column', p.y > 2 && Math.abs(p.x - 1.5) < 1e-6);
  teleport(p, 1, 1);
  run(s, 1 / 60 * 8, () => [{ held: ['right'] }]);
  check('moving right along row 1', p.x > 1.5 && Math.abs(p.y - 1.5) < 1e-6);
  const xBefore = p.x;
  // Pre-turn: down is open at column 1 (1,2 is floor); wizard slides back and turns.
  run(s, 0.5, () => [{ held: ['down', 'right'] }]);
  check('pre-turn slides back to the lane and turns down', Math.abs(p.x - 1.5) < 1e-6 && p.y > 1.6, `x=${p.x.toFixed(2)} y=${p.y.toFixed(2)} from ${xBefore.toFixed(2)}`);
  // Blocked turn falls through to the other held key.
  teleport(p, 2, 1); s.grid[1 * W + 3] = FLOOR;
  run(s, 0.2, () => [{ held: ['down', 'right'] }]);
  check('turn into a pillar is ignored, keeps moving right', p.x > 2.5 && Math.abs(p.y - 1.5) < 1e-6);
  // Leaning into a wall stops at the hitbox limit.
  teleport(p, 1, 1);
  run(s, 1, () => [{ held: ['left'] }]);
  check('leans into the wall but stays in its tile', Math.floor(p.x) === 1 && p.x < 1.5);
  check('speed = base tiles per second', (() => {
    teleport(p, 1, 1); for (let y = 1; y < H - 1; y++) s.grid[y * W + 1] = FLOOR;
    run(s, 1, () => [{ held: ['down'] }]);
    // Column 1 cleared to the bottom; three tiles per second.
    return Math.abs(p.y - (1.5 + RULES.baseSpeed)) < 0.05;
  })());
}

// ---------------------------------------------------------------- death, lives, respawn
console.log('lives');
{
  const s = createGame({ seed: 4 });
  skipIntro(s); clearEnemies(s);
  const p = s.players[0];
  placeBomb(s, p);
  const ev = run(s, 2.2);
  check('standing on your bomb kills you', ev.some(e => e.type === 'death' && e.cause === 'fire') && !p.alive);
  check('a life is lost', s.lives === 2);
  run(s, RULES.respawnDelay + 0.1);
  check('respawn at the corner with protection', p.alive && Math.floor(p.x) === 1 && Math.floor(p.y) === 1 && p.invulnUntil > s.time);
  placeBomb(s, p);
  run(s, 2.2);
  check('protection ends before the next blast lands', !p.alive && s.lives === 1);
  run(s, RULES.respawnDelay + 0.1);
  p.shield = true;
  placeBomb(s, p);
  const ev2 = run(s, 2.2);
  check('shield absorbs one hit', p.alive && !p.shield && ev2.some(e => e.type === 'shieldPop'));
  run(s, 1.5);
  placeBomb(s, p);
  const ev3 = run(s, 2.2);
  check('last life → game over', s.status === 'over' && ev3.some(e => e.type === 'gameOver'));
}

// ---------------------------------------------------------------- enemies, door, level clear
console.log('door');
{
  const s = createGame({ seed: 8 });
  skipIntro(s);
  const p = s.players[0];
  // Blow up the door's brick: stand next to it with a clear floor.
  const d = s.door;
  const side = tileAt(s, d.x - 1, d.y) !== WALL ? [d.x - 1, d.y] : [d.x, d.y - 1];
  s.grid[side[1] * W + side[0]] = FLOOR;
  teleport(p, side[0], side[1]);
  check('door starts hidden', !d.revealed);
  placeBomb(s, p);
  teleport(p, 1, 1); p.invulnUntil = s.time + 3;
  let ev = run(s, 2.2);
  check('door revealed by the blast', d.revealed && ev.some(e => e.type === 'door'));
  check('door stays shut while enemies live', !d.open);
  // Kill enemies with fire directly.
  const before = s.score;
  s.enemies.forEach(e => { s.fires.set(Math.floor(e.y) * W + Math.floor(e.x), s.time + 0.3); });
  ev = run(s, 0.2);
  check('enemies in fire die and score', s.enemies.every(e => !e.alive) && ev.filter(e => e.type === 'kill').length === s.enemies.length && s.score > before);
  check('door opens once the maze is clear', d.open && ev.some(e => e.type === 'doorOpen'));
  const lvl = s.level, sc = s.score;
  teleport(p, d.x, d.y);
  ev = run(s, 0.1);
  check('entering the open door clears the level with a bonus', ev.some(e => e.type === 'levelClear') && s.status === 'cleared' && s.score >= sc + RULES.levelBonus);
  run(s, 2.6);
  check('next level starts', s.level === lvl + 1 && s.status === 'intro' && s.enemies.length > 0);
  check('powers carry over between levels', p.range >= 1 && p.alive);
}
{
  const s = createGame({ seed: 12 });
  skipIntro(s);
  s.timer = 0.2;
  const before = s.enemies.length;
  const ev = run(s, 0.5);
  check('timer zero → hurry + sparks', ev.some(e => e.type === 'hurry') && s.enemies.length > before && s.enemies.some(e => e.type === 'spark'));
  check('sparks never spawn on the miner', s.enemies.filter(e => e.type === 'spark').every(e => Math.abs(e.x - 1.5) >= 2 || Math.abs(e.y - 1.5) >= 2));
}
{
  const s = createGame({ seed: 13 });
  skipIntro(s); clearEnemies(s);
  const p = s.players[0];
  const k = 2 * W + 1;   // (1,2) is floor
  s.items.set(k, { type: ITEM.FIRE, hidden: false });
  run(s, 0.5, () => [{ held: ['down'] }]);
  check('item picked up: range +1 and score', p.range === 2 && !s.items.has(k) && s.score >= RULES.itemScore);
  s.items.set(3 * W + 1, { type: ITEM.SPEED, hidden: false });
  run(s, 0.5, () => [{ held: ['down'] }]);
  check('speed item speeds you up', p.speedItems === 1);
  const levelBefore = s.level;
  check('enemy contact kills', (() => {
    s.enemies.push({ type: 'bat', x: p.x, y: p.y, dir: 'up', alive: true, deadAt: -1, walkPhase: 0, moving: false, speed: 0, decideAtCentre: true, atNode: false });
    const ev = run(s, 0.1);
    return ev.some(e => e.type === 'death' && e.cause === 'bat');
  })());
  check('level unchanged by death', s.level === levelBefore);
  // Spawn camping: a bat parked on the corner can't kill a respawned miner who hasn't moved.
  run(s, RULES.respawnDelay + RULES.invulnTime + 0.5);
  s.enemies.push({ type: 'bat', x: 1.5, y: 1.5, dir: 'up', alive: true, deadAt: -1, walkPhase: 0, moving: false, speed: 0, decideAtCentre: true, atNode: false });
  const livesBefore = s.lives;
  run(s, 1.0);
  check('idle respawned miner is safe from a camping critter', p.alive && s.lives === livesBefore);
  run(s, 0.2, () => [{ held: ['down'] }]);
  check('…until they move', !p.alive && s.lives === livesBefore - 1);
  s.enemies.pop();
}
{
  // Enemies keep moving and never enter walls or bricks over a long run.
  const s = createGame({ seed: 21 });
  skipIntro(s);
  s.players[0].invulnUntil = 1e9;
  let bad = 0;
  const start = s.enemies.map(e => [e.x, e.y]), far = s.enemies.map(() => 0);
  for (let t = 0; t < 30; t += DT) {
    step(s, DT, [{ held: [] }]); drainEvents(s);
    s.enemies.forEach((e, i) => {
      if (e.alive && tileAt(s, Math.floor(e.x), Math.floor(e.y)) !== FLOOR) bad++;
      far[i] = Math.max(far[i], Math.abs(e.x - start[i][0]) + Math.abs(e.y - start[i][1]));
    });
  }
  const moved = far.filter(d => d > 2).length;
  check('enemies stay on the floor', bad === 0, bad + ' bad frames');
  check('enemies actually roam', moved === s.enemies.length, moved + '/' + s.enemies.length);
  check('extra life at the first score step', (() => {
    const g = createGame({ seed: 2 }); const lives = g.lives;
    g.score = RULES.extraLifeAt[0] - 5;
    skipIntro(g); clearEnemies(g);
    g.enemies.push({ type: 'bat', x: 5.5, y: 5.5, dir: 'up', alive: true, deadAt: -1, walkPhase: 0, moving: false, speed: 0, decideAtCentre: true, atNode: false });
    g.fires.set(5 * W + 5, g.time + 0.3);
    const ev = run(g, 0.1);
    return g.lives === lives + 1 && ev.some(e => e.type === 'extraLife');
  })());
}

// ---------------------------------------------------------------- battle
console.log('battle');
{
  const s = createGame({ mode: 'battle', seed: 30 });
  skipIntro(s);
  check('two miners in opposite corners', s.players.length === 2 && Math.floor(s.players[1].x) === W - 2 && Math.floor(s.players[1].y) === H - 2);
  check('no door in battle', s.door === null);
  s.timer = RULES.suddenDeathAt + 0.1;
  let ev = run(s, 0.3);
  check('sudden death announced', ev.some(e => e.type === 'suddenDeath') && s.suddenDeath);
  ev = run(s, 0.6);
  check('walls start dropping at (1,1)', tileAt(s, 1, 1) === WALL && ev.some(e => e.type === 'wallDrop'));
  check('the blue miner standing there is crushed → red wins the round', ev.some(e => e.type === 'death' && e.cause === 'crushed' && e.player === 0) && s.status === 'roundEnd' && s.players[1].wins === 1);
  run(s, 3);
  check('a fresh round begins with powers reset', s.round === 2 && s.players.every(p => p.alive && p.range === 1));
  // Wall closes bombs + items
  skipIntro(s);
  s.timer = RULES.suddenDeathAt;
  s.items.set(1 * W + 2, { type: ITEM.FIRE, hidden: false });
  teleport(s.players[0], 5, 5); teleport(s.players[1], 7, 5);
  run(s, RULES.suddenDeathStep * 2.5);
  check('a dropped wall removes the item on it', !s.items.has(1 * W + 2));
  // Complete spiral leaves the centre free
  const drops = run(s, RULES.suddenDeathStep * 200).filter(e => e.type === 'wallDrop');
  check('spiral never buries the centre tile', drops.length > 50 && !drops.some(e => e.x === Math.floor(W / 2) && e.y === Math.floor(H / 2)));
}
{
  const s = createGame({ mode: 'battle', seed: 31 });
  skipIntro(s);
  const [a, b] = s.players;
  a.range = 3; teleport(a, 1, 1); teleport(b, 3, 1);
  for (let x = 1; x <= 4; x++) s.grid[1 * W + x] = FLOOR;
  placeBomb(s, a);
  run(s, 0.5, () => [{ held: ['down'] }, { held: [] }]);
  teleport(a, 1, 4);
  const ev = run(s, 2);
  check('blasting the other miner wins the round', ev.some(e => e.type === 'roundEnd' && e.winner === 0) && a.wins === 1);
  a.wins = RULES.battleWinsNeeded - 1;
  run(s, 3); skipIntro(s);
  teleport(a, 1, 1); teleport(b, 3, 1); a.range = 3;
  for (let x = 1; x <= 4; x++) s.grid[1 * W + x] = FLOOR;
  placeBomb(s, a); s.grid[5 * W + 5] = FLOOR; teleport(a, 5, 5);
  const ev2 = run(s, 5.5);
  check('third round win ends the match', s.status === 'over' && ev2.some(e => e.type === 'matchOver' && e.winner === 0));
}
{
  // Both wizards in one blast → draw, nobody scores.
  const s = createGame({ mode: 'battle', seed: 32 });
  skipIntro(s);
  const [a, b] = s.players;
  for (let x = 1; x <= 4; x++) s.grid[1 * W + x] = FLOOR;
  a.range = 3; teleport(a, 1, 1); teleport(b, 3, 1);
  placeBomb(s, a);
  const ev = run(s, 2.2);
  check('mutual blast is a draw', ev.some(e => e.type === 'roundEnd' && e.winner === null) && a.wins === 0 && b.wins === 0);
}

// ---------------------------------------------------------------- the computer
console.log('computer');
{
  let selfDeaths = 0, roundsWon = 0, rounds = 0, slowest = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const s = createGame({ mode: 'battle', cpu: true, seed });
    let t = 0, roundStart = 0;
    while (t < 400 && s.status !== 'over') {
      step(s, DT, [{ held: [] }]);
      for (const e of drainEvents(s)) {
        if (e.type === 'death' && e.player === 1) selfDeaths++;
        if (e.type === 'round') roundStart = t;
        if (e.type === 'roundEnd') { rounds++; if (e.winner === 1) roundsWon++; slowest = Math.max(slowest, t - roundStart); }
      }
      t += DT;
    }
  }
  check('the computer never dies to its own bombs (40 matches)', selfDeaths === 0, selfDeaths + ' deaths');
  check('the computer wins every round against a miner who never moves', rounds > 0 && roundsWon === rounds, roundsWon + '/' + rounds);
  check('…and does it before sudden death', slowest < RULES.battleTime - RULES.suddenDeathAt + 2, slowest.toFixed(1) + 's');
}
{
  // Danger map: a bomb's own tile and rays are timed; bricks shield tiles behind them.
  const s = createGame({ mode: 'battle', seed: 33 });
  skipIntro(s);
  for (let x = 1; x <= 4; x++) s.grid[1 * W + x] = FLOOR;
  s.grid[1 * W + 3] = BRICK;
  const p = s.players[0]; p.range = 3; teleport(p, 1, 1); placeBomb(s, p);
  const d = dangerMap(s);
  check('danger on the bomb tile and open ray', Math.abs(d[1 * W + 1] - RULES.bombFuse) < 0.05 && d[1 * W + 2] < Infinity);
  check('brick shields the tile behind it', d[1 * W + 4] === Infinity);
  check('the blocked side (wall) stays safe', d[1 * W + 0] === Infinity);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
