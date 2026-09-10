import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const elements=new Map(),events={},storage=new Map();let raf,clock=0;
const context=new Proxy({}, {get:(_,k)=>k==='createRadialGradient'?()=>({addColorStop(){}}):()=>{},set:()=>true});
function el(id){if(!elements.has(id))elements.set(id,{id,style:{},checked:true,textContent:'',clientWidth:600,handlers:{},dataset:{},classList:{toggle(){}},parentElement:{clientWidth:600},addEventListener(k,f){this.handlers[k]=f;},getContext(){return context;},setPointerCapture(){},focus(){}});return elements.get(id);}
const buttons=['left','right','launch'].map(k=>{const b=el(k);b.dataset.control=k;return b;});
globalThis.document={getElementById:el,querySelectorAll:()=>buttons,addEventListener:(k,f)=>events[k]=f,hidden:false};
globalThis.addEventListener=(k,f)=>events[k]=f;globalThis.innerHeight=900;globalThis.devicePixelRatio=1;globalThis.ResizeObserver=class{observe(){}};globalThis.requestAnimationFrame=f=>raf=f;
globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
const source=(await readFile(new URL('../pinball/game.mjs',import.meta.url),'utf8')).replace("'./physics.mjs'",JSON.stringify(new URL('../pinball/physics.mjs',import.meta.url).href))+'\nexport const inspect=()=>({w,input:input(),best});';
const {inspect}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const key=(type,code)=>events[type]({code,target:{tagName:'CANVAS'},preventDefault(){}});
const pointer=(control,type,pointerId)=>el(control).handlers[type]({pointerId,preventDefault(){}});
function frames(n){for(let i=0;i<n;i++){clock+=1000/120;raf(clock);}}
key('keydown','KeyA');key('keydown','ArrowLeft');key('keyup','KeyA');assert(inspect().input.left,'second keyboard binding stays held');key('keyup','ArrowLeft');
pointer('left','pointerdown',1);pointer('right','pointerdown',2);assert(inspect().input.left&&inspect().input.right);pointer('left','pointercancel',1);assert(!inspect().input.left&&inspect().input.right);pointer('right','pointerup',2);
pointer('launch','pointerdown',3);frames(60);assert(inspect().w.charge>0);pointer('launch','pointercancel',3);assert.equal(inspect().w.state,'plunger');assert.equal(inspect().w.charge,0);
key('keydown','Space');frames(120);key('keyup','Space');assert.equal(inspect().w.state,'playing');
events.blur();const b={...inspect().w.ball};frames(120);assert.deepEqual(inspect().w.ball,b);assert(!inspect().input.left&&!inspect().input.launch);
el('pause').onclick();frames(2400);assert.equal(inspect().w.state,'drained');assert(Number(storage.get('quarryPinballBestRally'))>0);
key('keydown','Space');key('keyup','Space');assert.equal(inspect().w.state,'plunger');
await import('data:text/javascript;base64,'+Buffer.from(source+'\n// reload').toString('base64'));frames(1);assert.notEqual(el('best').textContent,'0.0s');
console.log('Pinball controls passed: keyboard aliases, simultaneous pointers, cancellation, launch, blur/pause, re-serve and persistent rally record.');
