// Regression: the player's secured win must remain the headline after a bust.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(require.resolve('../crash/crash-app.js'), 'utf8');
const start = source.indexOf('    // headline multiplier');
const end = source.indexOf('\n  function drawBettingOverlay', start);
const draw = 'function drawResult(){' + source.slice(start, end);
for (const portrait of [false, true]) {
  for (const outcome of [{won:true,profit:25,at:2}, {won:false,amount:25}, null]) {
    const text = [];
    const context = {
      portrait, busted:true, padL:40, padT:52, gw:400, gh:200,
      lastOutcome:outcome, round:{crash:3}, GREEN:'green', RED:'red', IVORY:'white', MONO:'mono', DISPLAY:'display',
      fmt:n=>'$'+n, fmtSigned:n=>'+$'+n, fmtMult:n=>n.toFixed(2)+'x',
      ctx:{fillText:(value)=>text.push(value)}
    };
    vm.runInNewContext(draw + '\ndrawResult();', context);
    if (outcome?.won) {
      assert.equal(text[0], 'C A S H E D   O U T');
      assert.equal(text[1], '+$25');
      assert.ok(text.includes('Flight ended at 3.00x'));
      assert.ok(!text.some(t=>t.includes('B U S T E D') || t.includes('You lost')));
    } else assert.equal(text[0], outcome ? 'B U S T E D' : 'F L I G H T   E N D E D');
  }
}
console.log('Crash result rendering: win, loss, spectator on desktop and phone passed.');
