export const W=600,H=640,R=7,DT=1/120,MAX_SPEED=560;
const wall=(x,y,w,h)=>({x,y,w,h});
const base=(name,par,tip,extra={})=>({name,par,tip,start:{x:300,y:555},cup:{x:300,y:85},walls:[],bumpers:[],water:[],sand:[],ramps:[],slopes:[],...extra});
export const HOLES=[
 base('First light',2,'A gentle introduction. Pull back, release, and find your touch.'),
 base('Bank account',3,'The center is blocked. Use the glowing rails to bank around it.',{walls:[wall(190,275,220,28)],cup:{x:400,y:100},start:{x:190,y:550}}),
 base('The dogleg',3,'Two corners. Place your first shot, then turn toward the cup.',{walls:[wall(30,390,350,24),wall(220,215,350,24)],start:{x:120,y:555},cup:{x:470,y:90}}),
 base('Soft landing',3,'Sand slows the ball. Go around it or give your shot a little more power.',{sand:[wall(140,250,320,145)],bumpers:[{x:105,y:180,r:25},{x:495,y:465,r:25}]}),
 base('Clockwork',3,'Wait for the sliding gate, then shoot through the opening.',{walls:[wall(30,300,170,22),wall(400,300,170,22)],gate:{x:205,y:300,w:80,h:22,travel:110,speed:1.3}}),
 base('Island hop',3,'The amber ramp launches you over water. Aim straight and use strong power.',{water:[wall(30,260,450,65)],ramps:[wall(235,380,130,45)],cup:{x:300,y:110}}),
 base('Pinball alley',4,'Bumpers give the ball a little extra kick. Look for the clear lanes.',{bumpers:[{x:200,y:440,r:34},{x:400,y:350,r:34},{x:220,y:250,r:34},{x:380,y:145,r:27}],start:{x:100,y:550},cup:{x:480,y:80}}),
 base('Cross current',4,'The striped floor pushes right. Aim left to compensate.',{slopes:[{...wall(45,220,510,180),ax:95,ay:0}],water:[wall(480,220,90,180)],walls:[wall(30,445,310,22)],start:{x:130,y:555},cup:{x:160,y:95}}),
 base('After hours',4,'A final mix: bank past the wall, time the gate, and avoid the sand.',{walls:[wall(200,435,370,22),wall(30,200,260,22)],sand:[wall(370,260,165,110)],gate:{x:80,y:325,w:110,h:20,travel:230,speed:0.9},bumpers:[{x:385,y:125,r:28}],start:{x:440,y:550},cup:{x:110,y:85}})
];
export function createBall(hole){return {...hole.start,vx:0,vy:0,air:0,rampLock:0,rest:0,sunk:false};}
export function movingWall(h,t){return h.gate?{...h.gate,x:h.gate.x+(Math.sin(t*h.gate.speed)+1)*h.gate.travel/2}:null;}
export function shoot(b,angle,power){if(b.sunk||speed(b)>0)return false;b.vx=Math.cos(angle)*Math.max(0,Math.min(1,power))*MAX_SPEED;b.vy=Math.sin(angle)*Math.max(0,Math.min(1,power))*MAX_SPEED;b.rest=0;return true;}
export const speed=b=>Math.hypot(b.vx,b.vy);
const inside=(b,a)=>b.x>a.x&&b.x<a.x+a.w&&b.y>a.y&&b.y<a.y+a.h;
function rectCollision(b,a){let nx=0,ny=0;const qx=Math.max(a.x,Math.min(b.x,a.x+a.w)),qy=Math.max(a.y,Math.min(b.y,a.y+a.h));let dx=b.x-qx,dy=b.y-qy,d=Math.hypot(dx,dy);if(d>=R)return false;if(d>0){nx=dx/d;ny=dy/d;b.x=qx+nx*(R+.01);b.y=qy+ny*(R+.01);}else{const sides=[{d:b.x-a.x,nx:-1,ny:0,x:a.x-R-.01,y:b.y},{d:a.x+a.w-b.x,nx:1,ny:0,x:a.x+a.w+R+.01,y:b.y},{d:b.y-a.y,nx:0,ny:-1,x:b.x,y:a.y-R-.01},{d:a.y+a.h-b.y,nx:0,ny:1,x:b.x,y:a.y+a.h+R+.01}];const s=sides.sort((a,c)=>a.d-c.d)[0];({nx,ny}=s);b.x=s.x;b.y=s.y;}
const dot=b.vx*nx+b.vy*ny;if(dot<0){b.vx-=1.76*dot*nx;b.vy-=1.76*dot*ny;return true;}return false;}
export function step(b,h,t,dt=DT){
 if(b.sunk)return 'sunk';if(speed(b)===0)return null;
 b.air=Math.max(0,b.air-dt);b.rampLock=Math.max(0,b.rampLock-dt);
 if(!b.air)for(const s of h.slopes)if(inside(b,s)){b.vx+=s.ax*dt;b.vy+=s.ay*dt;}
 const friction=!b.air&&h.sand.some(a=>inside(b,a))?330:b.air?18:72;
 const v=speed(b),nv=Math.max(0,v-friction*dt);if(v){b.vx*=nv/v;b.vy*=nv/v;}
 b.x+=b.vx*dt;b.y+=b.vy*dt;let event=null;
 const boundaries=[wall(0,0,30,H),wall(570,0,30,H),wall(0,0,W,30),wall(0,610,W,30)];
 for(const a of [...boundaries,...(!b.air?h.walls:[])])if(rectCollision(b,a))event='bounce';
 const gate=movingWall(h,t);if(!b.air&&gate&&rectCollision(b,gate))event='bounce';
 if(!b.air)for(const c of h.bumpers){const dx=b.x-c.x,dy=b.y-c.y,d=Math.hypot(dx,dy);if(d<c.r+R){const nx=d?dx/d:1,ny=d?dy/d:0;b.x=c.x+nx*(c.r+R+.1);b.y=c.y+ny*(c.r+R+.1);const dot=b.vx*nx+b.vy*ny;if(dot<0){b.vx-=2*dot*nx;b.vy-=2*dot*ny;const boost=Math.min(1.12,MAX_SPEED/Math.max(speed(b),1));b.vx*=boost;b.vy*=boost;event='bumper';}}}
 if(!b.air&&b.rampLock===0&&speed(b)>210&&h.ramps.some(a=>inside(b,a))){b.air=.75;b.rampLock=1.3;event='jump';}
 if(!b.air&&h.water.some(a=>inside(b,a))){b.vx=0;b.vy=0;return 'water';}
 const d=Math.hypot(b.x-h.cup.x,b.y-h.cup.y);
 if(!b.air&&d<12&&speed(b)<165){b.x=h.cup.x;b.y=h.cup.y;b.vx=0;b.vy=0;b.sunk=true;return 'sunk';}
 if(speed(b)<6){b.vx=0;b.vy=0;b.air=0;return 'rest';}
 return event;
}
export function simulate(h,start,angle,power,time=0,maxSteps=2400){const b={...start};shoot(b,angle,power);const path=[];let event;for(let i=0;i<maxSteps;i++){event=step(b,h,time+i*DT);if(i%6===0)path.push({x:b.x,y:b.y,air:b.air});if(event==='water'||b.sunk||!speed(b))break;}return {ball:b,event,path};}
