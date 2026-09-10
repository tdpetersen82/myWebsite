import assert from 'node:assert/strict';
import {QuarryEffects} from '../pinball/quarry-art.mjs';
import {QuarrySound} from '../pinball/sound.mjs';

const fx=new QuarryEffects();
for(let i=0;i<40;i++)fx.hit('rock',100,200,false);
assert(fx.particles.length<=80,'dust is bounded');
fx.hit('shipment',0,0,false);assert(fx.departure>0);fx.tick(4,false);assert.equal(fx.departure,0);assert.equal(fx.particles.length,0);
fx.hit('rock',0,0,true);fx.hit('shipment',0,0,true);assert.equal(fx.particles.length,0);assert.equal(fx.departure,0);
fx.hit('rock',0,0,false);fx.tick(.01,true);assert.equal(fx.particles.length,0,'switching to reduced motion clears existing effects');

let voices=0,created=0;
const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}});
const node=()=>({connect(){},disconnect(){},gain:param(),frequency:param()});
class AudioMock{
  constructor(){created++;this.currentTime=0;this.state='suspended';this.sampleRate=8000;this.destination={};}
  resume(){this.state='running';return Promise.resolve();}
  suspend(){this.state='suspended';return Promise.resolve();}
  createGain(){return node();}
  createOscillator(){return {...node(),start(){voices++;},stop(){}};}
  createBuffer(_,length){return {getChannelData:()=>new Float32Array(length)};}
  createBufferSource(){return {...node(),start(){voices++;}};}
  createBiquadFilter(){return node();}
}
globalThis.AudioContext=AudioMock;
const sound=new QuarrySound();sound.play('flipper');assert.equal(created,0,'no audio context before interaction');sound.unlock();assert.equal(created,1);
for(const kind of ['flipper','launch','rock','crusher','sling','ramp','scoop','rollover','drain','orbit','shipment'])sound.play(kind);
assert(voices>10,'each sound cue schedules audio');const count=voices;sound.play('flipper');assert.equal(voices,count,'rapid duplicate impacts are throttled');
sound.mute(true);sound.ctx.currentTime=1;sound.play('shipment');assert.equal(voices,count);assert.equal(sound.bus.gain.value,0);
sound.mute(false);sound.pause(true);sound.play('shipment');assert.equal(voices,count,'pause silences new cues');sound.pause(false);sound.play('shipment');assert(voices>count);
delete globalThis.AudioContext;assert.doesNotThrow(()=>new QuarrySound().unlock(),'silent fallback without Web Audio');
console.log('Presentation checks passed: bounded effects, reduced motion, gesture-only audio, cue scheduling, throttling, mute, pause and silent fallback.');
