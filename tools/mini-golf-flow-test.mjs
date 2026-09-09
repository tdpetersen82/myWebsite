import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {HOLES,simulate,DT,speed} from '../mini-golf/physics.mjs';
const elements=new Map(),events={},storage=new Map();let raf,clock=0;
const gradient={addColorStop(){}};
const context=new Proxy({}, {get:(o,k)=>o[k]??(k==='createRadialGradient'?()=>gradient:()=>{})});
function element(id){if(!elements.has(id))elements.set(id,{id,style:{},hidden:false,disabled:false,value:'0',textContent:'',innerHTML:'',clientWidth:600,handlers:{},parentElement:{clientWidth:600},addEventListener(k,f){this.handlers[k]=f;},append(){},setAttribute(){},focus(){},setPointerCapture(){},hasPointerCapture(){return true;},releasePointerCapture(){},getBoundingClientRect(){return {left:0,top:0,width:600,height:640};},getContext(){return context;}});return elements.get(id);}
globalThis.document={getElementById:element,createElement:()=>element(Math.random()),hidden:false,addEventListener:(k,f)=>events[k]=f};globalThis.window=globalThis;globalThis.innerHeight=1000;globalThis.addEventListener=(k,f)=>events[k]=f;globalThis.ResizeObserver=class{observe(){}};globalThis.requestAnimationFrame=f=>raf=f;globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
const src=(await readFile(new URL('../mini-golf/game.mjs',import.meta.url),'utf8')).replace("'./physics.mjs'",JSON.stringify(new URL('../mini-golf/physics.mjs',import.meta.url).href))+ '\nexport const inspect=()=>({index,ball:{...ball},strokes,scores:[...scores],state,time,practice});';
const {inspect}=await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
function frame(){clock+=1000/120;raf(clock);}
function putt(a,p){const c=element('course');c.handlers.pointerdown({pointerType:'mouse',button:0,pointerId:1,clientX:300,clientY:300,preventDefault(){}});c.handlers.pointermove({pointerId:1,clientX:300-Math.cos(a)*p*160,clientY:300-Math.sin(a)*p*160});c.handlers.pointerup({pointerId:1});}
function roll(){for(let i=0;i<3500&&inspect().state==='rolling';i++)frame();assert.notEqual(inspect().state,'rolling','ball settles');}
function solve(s){const hole=HOLES[s.index];let frontier=[{ball:s.ball,time:s.time,shots:[]}],seen=new Set();for(let depth=0;depth<5;depth++){const next=[];for(const e of frontier){let a=Math.atan2(hole.cup.y-e.ball.y,hole.cup.x-e.ball.x),ideal=Math.sqrt(144*Math.hypot(hole.cup.x-e.ball.x,hole.cup.y-e.ball.y))/560;for(const angle of [a,...Array.from({length:48},(_,k)=>k*Math.PI/24)])for(const p of [ideal*.94,ideal,ideal*1.05,.15,.25,.4,.6,.8,1].filter(p=>p>0&&p<=1)){const r=simulate(hole,e.ball,angle,p,e.time);const shots=[...e.shots,[angle,p]];if(r.ball.sunk)return shots;if(r.event==='water')continue;const key=Math.round(r.ball.x/22)+','+Math.round(r.ball.y/22);if(seen.has(key))continue;seen.add(key);next.push({ball:r.ball,time:e.time+r.path.length*6*DT,shots});}}frontier=next.sort((a,b)=>Math.hypot(a.ball.x-hole.cup.x,a.ball.y-hole.cup.y)-Math.hypot(b.ball.x-hole.cup.x,b.ball.y-hole.cup.y)).slice(0,65);}return null;}
element('primary').onclick();assert.equal(inspect().state,'ready');
// Pointer cancellation must not spend a stroke.
element('course').handlers.pointerdown({pointerType:'touch',pointerId:7,clientX:200,clientY:200,preventDefault(){}});element('course').handlers.pointercancel();assert.equal(inspect().strokes,0);
putt(-Math.PI/2,.48);element('pause').onclick();const paused=inspect().ball;for(let i=0;i<50;i++)frame();assert.deepEqual(inspect().ball,paused);element('primary').onclick();roll();assert.equal(inspect().state,'result');assert.equal(inspect().scores[0],1);assert(!storage.has('miniGolfRecord'));
element('primary').onclick();
for(let hole=1;hole<9;hole++){for(let tries=0;tries<10&&inspect().state==='ready';tries++){const route=solve(inspect());assert(route,`UI hole ${hole+1} is solvable`);putt(...route[0]);roll();}assert.equal(inspect().state,'result');if(hole<8)element('primary').onclick();}
const record=JSON.parse(storage.get('miniGolfRecord'));assert.equal(record.rounds,1);assert.equal(record.best,inspect().scores.reduce((a,b)=>a+b,0));assert(element('restart').disabled);
element('secondary').onclick();element('practice-hole').value='0';element('practice').onclick();assert(inspect().practice);putt(-Math.PI/2,.48);roll();assert.equal(inspect().state,'result');assert.deepEqual(JSON.parse(storage.get('miniGolfRecord')),record);
element('secondary').onclick();element('practice-hole').value='5';element('practice').onclick();putt(-Math.PI/2,.24);roll();if(inspect().state==='ready'){putt(-Math.PI/2,.24);roll();}assert.equal(inspect().practice,true);assert.equal(inspect().strokes,3,'water adds a penalty stroke');assert(inspect().ball.y>400,'water returns to last safe shot');
for(let i=0;i<12&&inspect().state==='ready';i++){putt(Math.PI/2,.03);roll();}
assert.equal(inspect().state,'result');assert.equal(inspect().strokes,12);assert.deepEqual(JSON.parse(storage.get('miniGolfRecord')),record);
await import('data:text/javascript;base64,'+Buffer.from(src+'\n// reload').toString('base64'));assert.equal(element('best').textContent,record.best+' shots');
console.log('Full nine-hole round, pointer aiming, cancellation, pause/resume, score saving and practice isolation passed. Best:',record.best);
