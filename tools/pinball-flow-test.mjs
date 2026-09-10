import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const elements=new Map(),events={},storage=new Map();let raf,clock=0;
const context=new Proxy({}, {get:(_,k)=>k==='createRadialGradient'?()=>({addColorStop(){}}):()=>{},set:()=>true});
function el(id){if(!elements.has(id))elements.set(id,{id,style:{},checked:true,textContent:'',clientWidth:600,handlers:{},dataset:{},classList:{toggle(){}},setAttribute(){},parentElement:{clientWidth:600},addEventListener(k,f){this.handlers[k]=f;},getContext(){return context;},setPointerCapture(){},focus(){}});return elements.get(id);}
const buttons=['left','right','launch'].map(k=>{const b=el(k);b.dataset.control=k;return b;});
globalThis.document={getElementById:el,querySelectorAll:()=>buttons,addEventListener:(k,f)=>events[k]=f,hidden:false};
globalThis.addEventListener=(k,f)=>events[k]=f;globalThis.innerHeight=900;globalThis.innerWidth=1200;globalThis.devicePixelRatio=1;globalThis.ResizeObserver=class{observe(){}};globalThis.requestAnimationFrame=f=>raf=f;
globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
const source=(await readFile(new URL('../pinball/game.mjs',import.meta.url),'utf8')).replace("'./sound.mjs'",JSON.stringify(new URL('../pinball/sound.mjs',import.meta.url).href)).replace("'./quarry-art.mjs'",JSON.stringify(new URL('../pinball/quarry-art.mjs',import.meta.url).href)).replace("'./rules.mjs'",JSON.stringify(new URL('../pinball/rules.mjs',import.meta.url).href)).replace("'./machine-art.mjs'",JSON.stringify(new URL('../pinball/machine-art.mjs',import.meta.url).href)).replace("'./physics.mjs'",JSON.stringify(new URL('../pinball/physics.mjs',import.meta.url).href))+'\nexport const inspect=()=>({w,input:input(),best,shift});';
const {inspect}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const key=(type,code)=>events[type]({code,target:{tagName:'CANVAS'},preventDefault(){}});
const pointer=(control,type,pointerId)=>el(control).handlers[type]({pointerId,preventDefault(){}});
function frames(n){for(let i=0;i<n;i++){clock+=1000/120;raf(clock);}}
key('keydown','KeyA');key('keydown','ArrowLeft');key('keyup','KeyA');assert(inspect().input.left,'second keyboard binding stays held');key('keyup','ArrowLeft');
pointer('left','pointerdown',1);pointer('right','pointerdown',2);assert(inspect().input.left&&inspect().input.right);pointer('left','pointercancel',1);assert(!inspect().input.left&&inspect().input.right);pointer('right','pointerup',2);
pointer('launch','pointerdown',3);frames(60);assert(inspect().w.charge>0);pointer('launch','pointercancel',3);assert.equal(inspect().w.state,'plunger');assert.equal(inspect().w.charge,0);
key('keydown','Space');frames(120);key('keyup','Space');assert.equal(inspect().w.state,'playing');
events.blur();const b={...inspect().w.ball};frames(120);assert.deepEqual(inspect().w.ball,b);assert(!inspect().input.left&&!inspect().input.launch);
el('pause').onclick();
for(let ball=1;ball<=3;ball++){
  for(let attempt=0;attempt<3&&!['between','over'].includes(inspect().shift.status);attempt++){
    if(inspect().shift.status==='ready'){key('keydown','Space');key('keyup','Space');}
    frames(4800);
  }
  assert.equal(inspect().shift.status,ball===3?'over':'between');
  assert.equal(inspect().shift.ball,ball);
  if(ball<3){el('continue').onclick();assert.equal(inspect().shift.status,'ready');}
}
assert(inspect().shift.score>0);const record=JSON.parse(storage.get('quarryPinballRecord'));assert.equal(record.shifts,1);assert.equal(record.best,inspect().shift.score);
frames(240);assert.equal(JSON.parse(storage.get('quarryPinballRecord')).shifts,1,'completed shift only saved once');
el('mute').onclick();assert.equal(JSON.parse(storage.get('quarryPinballPreferences')).muted,true);el('motion').checked=true;el('motion').onchange();
el('continue').onclick();assert.equal(inspect().shift.ball,1);assert.equal(inspect().shift.score,0);
await import('data:text/javascript;base64,'+Buffer.from(source+'\n// reload').toString('base64'));frames(1);assert.equal(el('best').textContent,record.best.toLocaleString());assert.equal(el('mute').textContent,'Sound off');assert.equal(el('motion').checked,true);
console.log('Pinball full shift passed: keyboard/touch cancellation, pause, three balls with saves, bonus transitions, restart, and high-score reload.');
