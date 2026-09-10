import {drawQuarry,QuarryEffects} from './quarry-art.mjs';
import {QuarrySound} from './sound.mjs';
import {startShift,launchShift,tickShift,objective,STAGES,readRecord,saveRecord} from './rules.mjs';
import {drawMachines} from './machine-art.mjs';
import {W,H,R,DT,walls,slings,createWorld,tip,step} from './physics.mjs';
const $=id=>document.getElementById(id),canvas=$('table'),ctx=canvas.getContext('2d'),w=createWorld();
let shift=startShift(w),record=readRecord(localStorage),best=record.best;
let prefs={muted:false,reduced:globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false};
try{const p=JSON.parse(localStorage.getItem('quarryPinballPreferences'));if(p){if(typeof p.muted==='boolean')prefs.muted=p.muted;if(typeof p.reduced==='boolean')prefs.reduced=p.reduced;}}catch{}
const sound=new QuarrySound(prefs.muted),fx=new QuarryEffects();
$('motion').checked=prefs.reduced;
function preference(){try{localStorage.setItem('quarryPinballPreferences',JSON.stringify(prefs));}catch{}$('mute').textContent=prefs.muted?'Sound off':'Sound on';$('mute').setAttribute('aria-pressed',String(prefs.muted));}
$('mute').onclick=()=>{prefs.muted=!prefs.muted;sound.mute(prefs.muted);if(w.paused)sound.pause(true);preference();};
$('motion').onchange=()=>{prefs.reduced=$('motion').checked;trail=[];fx.reset();preference();};preference();
const keys=new Set(),pointers=new Map();let accumulator=0,last=0,trail=[];
function input(){const holds=new Set([...Array.from(keys,k=>mapping[k]),...pointers.values()]);return {left:holds.has('left'),right:holds.has('right'),launch:holds.has('launch')};}
function reset(){shift=startShift(w);trail=[];fx.reset();sound.pause(false);clear();$('pause').textContent='Pause';}
function clear(){keys.clear();pointers.clear();w.charge=0;}
function pause(value=!w.paused){w.paused=value;sound.pause(value);clear();$('pause').textContent=w.paused?'Resume':'Pause';}
function releaseLaunch(){if(shift.status==='over'&&!w.paused)reset();else if(launchShift(shift,w))sound.play('launch');}
const mapping={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',Space:'launch'};
addEventListener('keydown',e=>{if(/INPUT|BUTTON|SUMMARY|SELECT|TEXTAREA/.test(e.target.tagName))return;if(!e.repeat&&e.code==='KeyM')$('mute').onclick();if(mapping[e.code]){if(!w.paused)sound.unlock();e.preventDefault();if(!w.paused)keys.add(e.code);}if(!e.repeat&&e.code==='KeyP')pause();if(!e.repeat&&e.code==='KeyR')reset();});
addEventListener('keyup',e=>{const k=mapping[e.code];if(k){e.preventDefault();const held=keys.delete(e.code);if(k==='launch'&&held&&!input().launch)releaseLaunch();}});
for(const b of document.querySelectorAll('[data-control]')){
 b.addEventListener('pointerdown',e=>{e.preventDefault();if(w.paused)return;sound.unlock();canvas.focus({preventScroll:true});b.setPointerCapture(e.pointerId);pointers.set(e.pointerId,b.dataset.control);});
 b.addEventListener('pointerup',e=>{const k=pointers.get(e.pointerId);pointers.delete(e.pointerId);if(k==='launch'&&!input().launch)releaseLaunch();});
 const cancel=e=>{pointers.delete(e.pointerId);if(b.dataset.control==='launch'&&!input().launch)w.charge=0;};
 b.addEventListener('pointercancel',cancel);b.addEventListener('lostpointercapture',cancel);
}
$('continue').onclick=()=>{releaseLaunch();canvas.focus({preventScroll:true});};
$('pause').onclick=()=>{pause();canvas.focus({preventScroll:true});};$('reset').onclick=()=>{reset();canvas.focus({preventScroll:true});};
addEventListener('blur',()=>pause(true));document.addEventListener('visibilitychange',()=>{if(document.hidden)pause(true);});
function resize(){const width=$('viewport').parentElement.clientWidth-24,available=Math.max(230,innerHeight-($('viewport').offsetTop??150)-70),scale=Math.min(width/W,available/H,1.2);$('viewport').style.width=W*scale+'px';$('viewport').style.height=H*scale+'px';$('stage').style.transform=`scale(${scale})`;const dpr=Math.min(devicePixelRatio||1,2);canvas.width=W*dpr;canvas.height=H*dpr;canvas.style.width=W+'px';canvas.style.height=H+'px';ctx.setTransform(dpr,0,0,dpr,0,0);}
new ResizeObserver(resize).observe($('viewport').parentElement);addEventListener('resize',resize);resize();
function line(points,color,width=2,dash=[]){ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();ctx.setLineDash([]);}
function text(s,x,y,size=12,color='#8dada9',align='center'){ctx.fillStyle=color;ctx.font=`${size}px system-ui`;ctx.textAlign=align;ctx.fillText(s,x,y);}
function draw(){
 drawQuarry(ctx,w,shift,fx,prefs.reduced,line,text);
 drawMachines(ctx,w,line,text,prefs.reduced?0:fx.time,prefs.reduced);
 fx.draw(ctx);
 if($('guides').checked){line([[260,715],[432,450]],'#d9b46565',2,[8,10]);line([[350,715],[135,410]],'#d9b46565',2,[8,10]);line([[350,715],[137,155]],'#78b9b050',2,[8,10]);line([[76,480],[72,195],[125,83],[446,83],[491,132],[500,440]],'#78b9b050',2,[8,10]);}
 text('HAUL ROAD / ORBIT',285,42,10);text(STAGES[shift.stage]+' / SHIPMENT '+(shift.shipments+1),295,545,12,'#d9bd75');
 const lamps=[[175,420],[365,265],[475,435],[173,168]];lamps.forEach(([x,y],i)=>{ctx.beginPath();ctx.arc(x,y,6,0,Math.PI*2);ctx.fillStyle=i===shift.stage?'#ffd16f':'#435a55';ctx.fill();});
 if(shift.skillAvailable){ctx.beginPath();ctx.arc([210,285,360][shift.skillLane],125,14,0,Math.PI*2);ctx.strokeStyle='#f8d17e';ctx.lineWidth=2;ctx.stroke();}
 ctx.lineCap='round';for(const a of walls){line([[a[0],a[1]],[a[2],a[3]]],'#0c1618',12);line([[a[0],a[1]],[a[2],a[3]]],'#d0c09b',5);}
 line([[530,155],[530,255]],'#d6b36b',2,[5,6]);
 for(let i=0;i<slings.length;i++){const s=slings[i];ctx.beginPath();s.points.forEach(([x,y],j)=>j?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=!prefs.reduced&&w.slingCooldown[i]>.02?'#d8bb76':'#a99350';ctx.fill();ctx.strokeStyle='#d0c497';ctx.lineWidth=3;ctx.stroke();}
 text('LOADER',145,674,9,'#f2e2bb');text('LOADER',443,674,9,'#f2e2bb');
 for(const f of w.flippers){const t=tip(f);line([[f.x,f.y],[t.x,t.y]],'#111b1e',27);line([[f.x,f.y],[t.x,t.y]],'#d6b264',20);line([[f.x,f.y],[t.x,t.y]],'#ecd497',3);ctx.beginPath();ctx.arc(f.x,f.y,5,0,Math.PI*2);ctx.fillStyle='#5f6250';ctx.fill();}
 text('DRAIN',300,863,11,'#c2977a');text('OUT',65,735,9,'#c2977a');text('OUT',505,735,9,'#c2977a');
 const b=w.ball;trail.forEach((p,i)=>{ctx.beginPath();ctx.arc(p.x,p.y,2,0,Math.PI*2);ctx.fillStyle=`rgba(191,220,220,${i/trail.length*.15})`;ctx.fill();});
 if(w.state!=='drained'){ctx.beginPath();ctx.arc(b.x+3,b.y+4,R+1,0,Math.PI*2);ctx.fillStyle='#0007';ctx.fill();const g=ctx.createRadialGradient(b.x-3,b.y-4,1,b.x,b.y,R);g.addColorStop(0,'#fff');g.addColorStop(.45,'#d7e4e4');g.addColorStop(1,'#5d7c82');ctx.fillStyle=g;ctx.beginPath();ctx.arc(b.x,b.y,R,0,Math.PI*2);ctx.fill();}
 if(w.paused||['bonus','between','over'].includes(shift.status)){
   ctx.fillStyle='#102025ee';ctx.fillRect(75,445,450,150);
   const heading=w.paused?'PAUSED':shift.status==='over'?'SHIFT COMPLETE':shift.status==='bonus'?'COUNTING BONUS':'BALL '+shift.ball+' COMPLETE';
   text(heading,300,483,23,'#eed49a');
   text(w.paused?'Resume when you’re ready.':shift.status==='over'?shift.score.toLocaleString()+' points · '+shift.shipments+' shipments':shift.bonusBase.toLocaleString()+' × '+shift.multiplier+' = '+shift.bonusTotal.toLocaleString(),300,520,16,'#bacdc5');
   text(w.paused?'':shift.status==='bonus'?'+'+shift.bonusPaid.toLocaleString():shift.status==='over'?'Launch to start a new shift':'Launch to serve the next ball',300,554,12,'#e0c37a');
 }
 $('timer').textContent=shift.score.toLocaleString();$('best').textContent=best.toLocaleString();
 const label=w.paused?'Table paused':shift.messageRemaining>0?shift.message:shift.status==='ready'?'Hold launch · release to shoot':shift.status==='playing'&&shift.saveRemaining>0?'BALL SAVE · '+Math.ceil(shift.saveRemaining)+'s':objective(shift);
 if($('status').textContent!==label)$('status').textContent=label;
 $('objective').textContent=objective(shift);
 $('machine-status').textContent=`Ball ${shift.ball} / 3 · Shipments ${shift.shipments} · Bonus ${shift.multiplier}× · Next shipment ${(10000+shift.shipments*5000).toLocaleString()}`;
 $('shift-summary').hidden=!['bonus','between','over'].includes(shift.status);
 $('shift-summary').textContent=shift.status==='over'?`Shift complete: ${shift.score.toLocaleString()} points, ${shift.shipments} shipments. Best: ${best.toLocaleString()}.`:`Ball ${shift.ball} bonus: ${shift.bonusBase.toLocaleString()} × ${shift.multiplier} = ${shift.bonusTotal.toLocaleString()}. Counted: ${shift.bonusPaid.toLocaleString()}.`;
 $('continue').hidden=!['between','over'].includes(shift.status);$('continue').textContent=shift.status==='over'?'Play another shift':'Serve ball '+(shift.ball+1);
 $('launch-label').textContent=shift.status==='over'?'NEW SHIFT':shift.status==='between'?'NEXT BALL':shift.status==='bonus'?'BONUS…':shift.status==='ready'&&w.charge>0?'LANE '+(Math.min(2,Math.floor(w.charge*3))+1):'LAUNCH';
 $('power').style.width=w.charge*100+'%';const holds=input();for(const el of document.querySelectorAll('[data-control]'))el.classList.toggle('active',!!holds[el.dataset.control]);
}
let previousControls={};
function frame(now){const elapsed=last?Math.min((now-last)/1000,.05):0;last=now;accumulator+=elapsed;while(accumulator>=DT){const controls=input(),shipments=shift.shipments;step(w,controls);tickShift(shift,w,DT);if(!w.paused){fx.tick(DT,prefs.reduced);for(const e of w.events){sound.play(e.type);if(['rock','crusher','sling'].includes(e.type))fx.hit(e.type,w.ball.x,w.ball.y,prefs.reduced);}if(shift.shipments>shipments){fx.hit('shipment',0,0,prefs.reduced);sound.play('shipment');}for(const side of ['left','right'])if(controls[side]&&!previousControls[side])sound.play('flipper');previousControls=controls;}if(shift.completed||(shift.score>best&&shift.status!=='bonus')){record=saveRecord(shift,record,localStorage);best=record.best;}accumulator-=DT;}if(w.state==='playing'&&!w.paused&&!prefs.reduced){trail.push({x:w.ball.x,y:w.ball.y});if(trail.length>16)trail.shift();}draw();requestAnimationFrame(frame);}
requestAnimationFrame(frame);
