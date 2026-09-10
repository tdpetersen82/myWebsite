import {resetMachines,tickMachines,collideMachines} from './machines.mjs';
// Quarry prototype table. World units are pixels; simulation is independent of rendering.
export const W=600,H=900,R=9,DT=1/240,MAX_SPEED=1900;
export const walls=[
  [45,835,35,200],[35,200,55,110],[55,110,110,55],[110,55,465,55],
  [465,55,520,95],[520,95,565,155],[565,155,565,865],
  [530,255,530,865],[530,865,565,865],
  // Lower guides leave open outlanes and a central drain.
  [85,590,90,680],[90,680,200,750],
  [490,590,485,680],[485,680,400,750],
  [45,835,155,880],[520,835,445,880],
];
export const slings=[
  {points:[[110,575],[170,695],[115,660]],normal:{x:1,y:-.5}},
  {points:[[470,575],[415,695],[470,660]],normal:{x:-1,y:-.5}},
];
export function createWorld(){const w={ball:{x:548,y:848,vx:0,vy:0},state:'plunger',time:0,age:0,charge:0,drains:0,paused:false,flippers:[{x:200,y:760,angle:.46,omega:0,side:1},{x:400,y:760,angle:Math.PI-.46,omega:0,side:-1}],slingCooldown:[0,0],events:[]};resetMachines(w);return w;}
export function tip(f){return {x:f.x+86*Math.cos(f.angle),y:f.y+86*Math.sin(f.angle)};}
export function serve(w){w.ball={x:548,y:848,vx:0,vy:0};w.state='plunger';w.charge=0;w.age=0;resetMachines(w);}
export function launch(w,power=w.charge){if(w.state!=='plunger'||w.paused)return false;w.ball.vy=-(1220+230*Math.max(0,Math.min(1,power)));w.state='playing';w.charge=0;return true;}
export function closest(x,y,ax,ay,bx,by){const dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy||1)));return {x:ax+t*dx,y:ay+t*dy};}
// Capsule contact includes angular surface velocity, so a rising bat actually strikes the ball.
export function contact(b,ax,ay,bx,by,radius=0,restitution=.68,motion=null){
  const q=closest(b.x,b.y,ax,ay,bx,by),dx=b.x-q.x,dy=b.y-q.y,d=Math.hypot(dx,dy),limit=R+radius;
  if(d>=limit)return false;
  let nx=d>1e-7?dx/d:0,ny=d>1e-7?dy/d:-1;
  b.x=q.x+nx*(limit+.001);b.y=q.y+ny*(limit+.001);
  const sx=motion?-motion.omega*(q.y-motion.y):0,sy=motion?motion.omega*(q.x-motion.x):0;
  const relative=(b.vx-sx)*nx+(b.vy-sy)*ny;
  if(relative<0){b.vx-=(1+restitution)*relative*nx;b.vy-=(1+restitution)*relative*ny;
    const tangent=(b.vx-sx)*-ny+(b.vy-sy)*nx,friction=motion?.075:.012;
    b.vx+=ny*tangent*friction;b.vy-=nx*tangent*friction;
  }
  return relative<0;
}
function microstep(w,input,dt){
  for(let i=0;i<2;i++){const f=w.flippers[i],held=i===0?input.left:input.right,target=i===0?(held?-.43:.46):(held?Math.PI+.43:Math.PI-.46),delta=target-f.angle;
    const step=Math.sign(delta)*Math.min(Math.abs(delta),(held?22:13)*dt);f.omega=step/dt;f.angle+=step;
  }
  if(w.state!=='playing')return;
  const b=w.ball;w.age+=dt;if(tickMachines(w,dt))return;const previous={x:b.x,y:b.y};b.vy+=880*dt;b.vx*=Math.exp(-.055*dt);b.vy*=Math.exp(-.055*dt);b.x+=b.vx*dt;b.y+=b.vy*dt;
  collideMachines(w,previous,contact);
  if(w.transport)return;
  for(const a of walls)contact(b,...a);
  // One-way shooter gate: launched balls exit left; balls on the table cannot re-enter.
  if(b.x<530)contact(b,530,155,530,255,0,.55);
  for(let i=0;i<slings.length;i++){
    const s=slings[i];w.slingCooldown[i]=Math.max(0,w.slingCooldown[i]-dt);
    for(let j=0;j<3;j++){const a=s.points[j],c=s.points[(j+1)%3];if(contact(b,...a,...c,0,.8)&&w.slingCooldown[i]===0){
      b.vx+=s.normal.x*270;b.vy-=220;w.slingCooldown[i]=.12;w.events.push({type:'sling',index:i});
    }}
  }
  for(const f of w.flippers){const t=tip(f);contact(b,f.x,f.y,t.x,t.y,10,.48,f);}
  const v=Math.hypot(b.vx,b.vy);if(v>MAX_SPEED){b.vx*=MAX_SPEED/v;b.vy*=MAX_SPEED/v;}
  if(b.y>H+R){w.state='drained';w.drains++;w.events.push({type:'drain',age:w.age});}
}
export function step(w,input={},dt=DT){
  w.events=[];if(w.paused)return;
  if(!Number.isFinite(dt)||dt<=0||dt>.05)throw new RangeError('Use fixed steps of at most 50 ms');
  w.time+=dt;if(w.state==='plunger'&&input.launch)w.charge=Math.min(1,w.charge+dt*.8);
  // At max speed, travel <2 world units per substep; flipper tips travel <2.2.
  const count=Math.ceil(dt/(1/960));for(let i=0;i<count;i++)microstep(w,input,dt/count);
}
