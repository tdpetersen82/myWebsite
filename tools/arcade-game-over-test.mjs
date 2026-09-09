import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const games = ['block-puzzle','pong','breakout','space-invaders','asteroids','simon','spacex-lander','lunar-lander','missile-command','defender'];
const shared = fs.readFileSync('arcade/game-over.js','utf8');
new vm.Script(shared);
const recommendations = vm.runInNewContext('(' + shared.match(/const related = (\{[\s\S]*?\n  \});/)[1] + ')');
for (const game of games) {
  const html = fs.readFileSync(game+'/index.html','utf8');
  assert.equal((html.match(/src="\.\.\/arcade\/game-over.js/g)||[]).length,1,game+' loads panel once');
  assert(html.includes('../arcade/game-over.css'),game+' loads styles');
  for(const [,attrs,body] of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
    if(!attrs.includes('src=')&&!attrs.includes('application/ld+json')) new vm.Script(body,{filename:game+'/index.html'});
  }
  assert.equal(recommendations[game].length,3);
  assert.equal(new Set(recommendations[game]).size,3);
  for(const next of recommendations[game]) {
    assert.notEqual(next,game);
    assert(fs.existsSync(next+'/index.html'));
    assert(fs.existsSync('assets/thumbs/'+next+'-arcade-20260909.png'));
  }
}
for(const game of ['simon','defender','missile-command','lunar-lander']) {
  const file=game+'/js/scenes/GameOverScene.js';
  const src=fs.readFileSync(file,'utf8');new vm.Script(src,{filename:file});
  assert(src.includes('ArcadeGameOver.show('));assert(src.includes("this.events.once('shutdown'"));
}
const lunar=fs.readFileSync('lunar-lander/js/scenes/GameOverScene.js','utf8');
assert(lunar.includes('if (!this.result.success && this.lives <= 0)'));
// Execute the actual vanilla game-over functions with lightweight renderer stubs.
for(const game of games.slice(0,4)) {
  const src=fs.readFileSync(game+'/index.html','utf8');
  const fn=src.match(/function gameOver\(\) \{([\s\S]*?)\n        \}/)[0];
  let shown, restarted=0;
  const sandbox={score:123,gameRunning:true,isGameOver:false,gameLoop:0,
    cancelAnimationFrame(){},playGameOverSound(){},canvas:{width:800,height:600},
    ctx:new Proxy({}, {get:()=>()=>{}}),
    window:{ArcadeGameOver:{show(o){shown=o;}},gameAPI:{restart(){restarted++;}}}};
  vm.runInNewContext(fn+'; gameOver();',sandbox);
  assert.equal(sandbox.gameRunning,false);
  assert.equal(shown.score,123);
  shown.restart();assert.equal(restarted,1);
}
new vm.Script(fs.readFileSync('spacex-lander/js/scenes/RunScene.js','utf8'));
console.log('PASS: 10 game integrations, 30 recommendation assets, vanilla end/restart hooks, Phaser syntax, and Lunar Lander final-life gating.');
