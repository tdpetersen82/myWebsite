import {drawMachines} from './machine-art.mjs';
import {W,H,R,DT,walls,slings,createWorld,tip,step,launch,serve} from './physics.mjs';
const $=id=>document.getElementById(id),canvas=$('table'),ctx=canvas.getContext('2d'),w=createWorld();
let best=0;try{best=Math.max(0,Number(localStorage.getItem('quarryPinballBestRally'))||0);}catch{}
const keys=new Set(),pointers=new Map();let accumulator=0,last=0,trail=[];
function input(){const holds=new Set([...Array.from(keys,k=>mapping[k]),...pointers.values()]);return {left:holds.has('left'),right:holds.has('right'),launch:holds.has('launch')};}
function save(){if(w.age>best){best=w.age;try{localStorage.setItem('quarryPinballBestRally',String(best));}catch{}}}
function reset(){if(w.state==='playing'||w.state==='drained')save();serve(w);trail=[];clear();}
function clear(){keys.clear();pointers.clear();w.charge=0;}
function pause(value=!w.paused){w.paused=value;clear();$('pause').textContent=w.paused?'Resume':'Pause';}
function releaseLaunch(){if(w.state==='drained')reset();else launch(w);}
const mapping={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',Space:'launch'};
addEventListener('keydown',e=>{if(/INPUT|BUTTON|SUMMARY|SELECT|TEXTAREA/.test(e.target.tagName))return;if(mapping[e.code]){e.preventDefault();if(!w.paused)keys.add(e.code);}if(!e.repeat&&e.code==='KeyP')pause();if(!e.repeat&&e.code==='KeyR')reset();});
addEventListener('keyup',e=>{const k=mapping[e.code];if(k){e.preventDefault();const held=keys.delete(e.code);if(k==='launch'&&held&&!input().launch)releaseLaunch();}});
for(const b of document.querySelectorAll('[data-control]')){
 b.addEventListener('pointerdown',e=>{e.preventDefault();if(w.paused)return;canvas.focus({preventScroll:true});b.setPointerCapture(e.pointerId);pointers.set(e.pointerId,b.dataset.control);});
 b.addEventListener('pointerup',e=>{const k=pointers.get(e.pointerId);pointers.delete(e.pointerId);if(k==='launch'&&!input().launch)releaseLaunch();});
 const cancel=e=>{pointers.delete(e.pointerId);if(b.dataset.control==='launch'&&!input().launch)w.charge=0;};
 b.addEventListener('pointercancel',cancel);b.addEventListener('lostpointercapture',cancel);
}
$('pause').onclick=()=>{pause();canvas.focus({preventScroll:true});};$('reset').onclick=()=>{reset();canvas.focus({preventScroll:true});};
addEventListener('blur',()=>pause(true));document.addEventListener('visibilitychange',()=>{if(document.hidden)pause(true);});
function resize(){const width=$('viewport').parentElement.clientWidth-24,available=Math.max(230,innerHeight-190),scale=Math.min(width/W,available/H,1);$('viewport').style.width=W*scale+'px';$('viewport').style.height=H*scale+'px';$('stage').style.transform=`scale(${scale})`;const dpr=Math.min(devicePixelRatio||1,2);canvas.width=W*dpr;canvas.height=H*dpr;canvas.style.width=W+'px';canvas.style.height=H+'px';ctx.setTransform(dpr,0,0,dpr,0,0);}
new ResizeObserver(resize).observe($('viewport').parentElement);addEventListener('resize',resize);resize();
function line(points,color,width=2,dash=[]){ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();ctx.setLineDash([]);}
function text(s,x,y,size=12,color='#8dada9',align='center'){ctx.fillStyle=color;ctx.font=`${size}px system-ui`;ctx.textAlign=align;ctx.fillText(s,x,y);}
function draw(){
 ctx.fillStyle='#1c2b2e';ctx.fillRect(0,0,W,H);
 for(let x=20;x<W;x+=30)line([[x,0],[x,H]],'#28383a',.6);
 for(let y=0;y<H;y+=30)line([[0,y],[W,y]],'#28383a',.6);
 text('L I M E S T O N E   /   Q U A R R Y',288,81,12,'#b0b9aa');
 drawMachines(ctx,w,line,text);
 if($('guides').checked){line([[260,715],[432,450]],'#d9b46565',2,[8,10]);line([[350,715],[135,410]],'#d9b46565',2,[8,10]);line([[350,715],[137,155]],'#78b9b050',2,[8,10]);line([[76,480],[72,195],[125,83],[446,83],[491,132],[500,440]],'#78b9b050',2,[8,10]);}
 text('HAUL ROAD / ORBIT',285,42,10);text('PHASE 02 — MACHINERY ONLINE',295,545,11,'#688e88');
 ctx.lineCap='round';for(const a of walls){line([[a[0],a[1]],[a[2],a[3]]],'#0c1618',12);line([[a[0],a[1]],[a[2],a[3]]],'#b1b6a4',5);}
 line([[530,155],[530,255]],'#d6b36b',2,[5,6]);
 for(let i=0;i<slings.length;i++){const s=slings[i];ctx.beginPath();s.points.forEach(([x,y],j)=>j?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=w.slingCooldown[i]>.02?'#d8bb76':'#596b62';ctx.fill();ctx.strokeStyle='#d0c497';ctx.lineWidth=3;ctx.stroke();}
 text('SLING',145,674,9,'#f2e2bb');text('SLING',443,674,9,'#f2e2bb');
 for(const f of w.flippers){const t=tip(f);line([[f.x,f.y],[t.x,t.y]],'#111b1e',27);line([[f.x,f.y],[t.x,t.y]],'#d6b264',20);line([[f.x,f.y],[t.x,t.y]],'#ecd497',3);ctx.beginPath();ctx.arc(f.x,f.y,5,0,Math.PI*2);ctx.fillStyle='#5f6250';ctx.fill();}
 text('DRAIN',300,863,11,'#c2977a');text('OUT',65,735,9,'#c2977a');text('OUT',505,735,9,'#c2977a');
 const b=w.ball;trail.forEach((p,i)=>{ctx.beginPath();ctx.arc(p.x,p.y,2,0,Math.PI*2);ctx.fillStyle=`rgba(191,220,220,${i/trail.length*.15})`;ctx.fill();});
 if(w.state!=='drained'){ctx.beginPath();ctx.arc(b.x+3,b.y+4,R+1,0,Math.PI*2);ctx.fillStyle='#0007';ctx.fill();const g=ctx.createRadialGradient(b.x-3,b.y-4,1,b.x,b.y,R);g.addColorStop(0,'#fff');g.addColorStop(.45,'#d7e4e4');g.addColorStop(1,'#5d7c82');ctx.fillStyle=g;ctx.beginPath();ctx.arc(b.x,b.y,R,0,Math.PI*2);ctx.fill();}
 if(w.paused||w.state==='drained'){ctx.fillStyle='#102025dc';ctx.fillRect(115,450,375,95);text(w.paused?'PAUSED':'BALL DRAINED',300,490,24,'#eed49a');text(w.paused?'Resume when you’re ready.':'Launch or press R for another ball.',300,518,12,'#bacdc5');}
 $('timer').textContent=w.age.toFixed(1)+'s';$('best').textContent=best.toFixed(1)+'s';const label=w.paused?'Table paused':w.state==='plunger'?'Hold launch · release to shoot':w.state==='drained'?'New ball ready when you are':(w.time<w.noticeUntil?w.notice:'Find your next shot');if($('status').textContent!==label)$('status').textContent=label;
 const c=w.machines.counts;$('machine-status').textContent=`Slabs ${c.rocks} · Crusher ${c.crusher} · Conveyor ${c.conveyor} · Siding ${c.siding} · Orbits ${c.orbit}`;
 $('power').style.width=w.charge*100+'%';const holds=input();for(const el of document.querySelectorAll('[data-control]'))el.classList.toggle('active',!!holds[el.dataset.control]);
}
function frame(now){const elapsed=last?Math.min((now-last)/1000,.05):0;last=now;accumulator+=elapsed;while(accumulator>=DT){step(w,input());if(w.events.some(e=>e.type==='drain'))save();accumulator-=DT;}if(w.state==='playing'&&!w.paused){trail.push({x:w.ball.x,y:w.ball.y});if(trail.length>16)trail.shift();}draw();requestAnimationFrame(frame);}
requestAnimationFrame(frame);
