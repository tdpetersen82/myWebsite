import assert from 'node:assert/strict';
import { createGame, startLevel, step, tileAt, FLOOR, placeBomb } from '../dynamine/engine.mjs';

for (const count of [1, 2, 3]) {
  const g = createGame({ mode: 'adventure', players: count, seed: 42 });
  assert.equal(g.players.length, count);
  for (const level of [1, 2, 5, 6, 10]) {
    startLevel(g, level);
    g.status = 'playing';
    assert.equal(new Set(g.players.map((p) => `${p.x},${p.y}`)).size, count);
    for (const p of g.players) {
      assert.ok(p.alive);
      assert.equal(tileAt(g, Math.floor(p.x), Math.floor(p.y)), FLOOR);
      assert.ok(placeBomb(g, p));
    }
  }
  startLevel(g, 1);
  g.status = 'playing';
  g.enemies.forEach((e) => {
    e.alive = false;
  });
  g.door.open = true;
  const last = g.players.at(-1);
  last.x = g.door.x + 0.5;
  last.y = g.door.y + 0.5;
  step(g, 1 / 60, []);
  assert.equal(g.status, 'cleared', 'any teammate can complete the mine');
}
const battle = createGame({ mode: 'battle', players: 3, seed: 42 });
assert.equal(battle.players.length, 3);
assert.equal(battle.players[2].color, 'green');
battle.status = 'playing';
battle.players[0].alive = false;
step(battle, 1 / 60, []);
assert.equal(battle.status, 'playing', 'two survivors must keep fighting');
battle.players[1].alive = false;
step(battle, 1 / 60, []);
assert.equal(battle.roundWinner, 2);
assert.equal(battle.players[2].wins, 1);
console.log('Multiplayer spawns, progression, exit and three-way victory passed');
