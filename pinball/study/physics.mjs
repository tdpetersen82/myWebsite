// Fixed-step planar pinball simulation. Coordinates match the Three.js playfield.
export const BUMPERS=[[-2.4,.4],[.1,-1.8],[2.3,.55]];
export class QuarryPhysics {
 constructor(segments=[],slings=[]){this.segments=segments;this.slings=slings;this.flippers=[{side:-1,angle:-.34},{side:1,angle:.34}];this.reset();}
 reset(){this.crushes=0;this.combo=0;this.comboTime=0;this.score=0;this.ballNumber=1;this.saveAvailable=true;this.events=[];this.cooldowns={};this.serve();}
 serve(){this.x=7.13;this.z=12;this.vx=0;this.vz=0;this.mode='ready';this.combo=0;this.comboTime=0;this.route=0;this.age=0;}
 launch(){if(this.mode==='over')this.reset();if(this.mode!=='ready')return;this.mode='launch';this.route=0;}
 award(points,kind,index=-1){this.score+=points;this.events.push({kind,index,points});}
 contact(ax,az,bx,bz,r=.065,kick=0,key='wall',surfaceX=0,surfaceZ=0){
 const dx=bx-ax,dz=bz-az,t=Math.max(0,Math.min(1,((this.x-ax)*dx+(this.z-az)*dz)/(dx*dx+dz*dz||1)));
 const cx=ax+t*dx,cz=az+t*dz,ex=this.x-cx,ez=this.z-cz,d=Math.hypot(ex,ez),limit=.19+r;
 if(d>=limit)return false;
 const nx=d>1e-8?ex/d:0,nz=d>1e-8?ez/d:-1;this.x=cx+nx*(limit+.001);this.z=cz+nz*(limit+.001);
 const incoming=(this.vx-surfaceX)*nx+(this.vz-surfaceZ)*nz;
 if(incoming<0){this.vx-=(1.8*incoming)*nx;this.vz-=(1.8*incoming)*nz;
 if(kick&&!(this.cooldowns[key]>0)){this.vx+=nx*kick;this.vz+=nz*kick;this.cooldowns[key]=.2;return true;}}
 return false;
 }
 solidSling({points,key}){
 let inside=false,best=null;
 for(let i=0,j=points.length-1;i<points.length;j=i++){
 const [ax,az]=points[j],[bx,bz]=points[i];
 if((az>this.z)!==(bz>this.z)&&this.x<(bx-ax)*(this.z-az)/(bz-az)+ax)inside=!inside;
 const dx=bx-ax,dz=bz-az,t=Math.max(0,Math.min(1,((this.x-ax)*dx+(this.z-az)*dz)/(dx*dx+dz*dz)));
 const x=ax+t*dx,z=az+t*dz,d=Math.hypot(this.x-x,this.z-z);
 if(!best||d<best.d)best={x,z,d,front:j<points.length-2};
 }
 if(!inside&&best.d>=.291)return;
 let nx=(this.x-best.x)/(best.d||1),nz=(this.z-best.z)/(best.d||1);
 if(inside){nx=-nx;nz=-nz;}if(best.d<1e-8){nx=key.endsWith('-1')?1:-1;nz=0;}
 this.x=best.x+nx*.292;this.z=best.z+nz*.292;
 const incoming=this.vx*nx+this.vz*nz;
 if(incoming<0){this.vx-=1.8*incoming*nx;this.vz-=1.8*incoming*nz;
 if(best.front&&!this.cooldowns[key]){this.vx+=nx*4;this.vz+=nz*4;this.cooldowns[key]=.2;this.award(100,'sling');}}
 }
 step(dt,left=false,right=false){
 for(const key in this.cooldowns)this.cooldowns[key]=Math.max(0,this.cooldowns[key]-dt);
 this.comboTime=Math.max(0,this.comboTime-dt);if(!this.comboTime)this.combo=0;
 for(const f of this.flippers){const active=f.side<0?left:right,old=f.angle,target=f.side*(active?-.38:.34);f.angle+=(target-f.angle)*Math.min(1,dt*28);f.omega=(f.angle-old)/dt;f.pressed=active&&!f.active;f.held=active?(f.held||0)+dt:0;f.active=active;}
 if(this.mode==='ready'||this.mode==='over')return;
 if(this.mode==='cradle'){
 const f=this.flippers.find(f=>f.side===this.cradleSide);this.x=f.side*1.7;this.z=9.95;this.vx=this.vz=0;
 if(!f.active){this.mode='live';this.vz=1.5;this.cooldowns.catch=.35;}return;
 }
 if(this.mode==='crusher'){
 this.route+=dt/2.4;if(this.route>=1){this.mode='live';this.x=-1.7;this.z=9.4;this.vx=0;this.vz=2;this.cooldowns.catch=0;}return;
 }
 if(this.mode==='launch'){this.route+=dt/1.65;if(this.route>=1){this.mode='live';this.x=3.7;this.z=-2.7;this.vx=-6;this.vz=4;this.age=0;}return;}
 if(this.mode==='ramp'){this.route+=dt/2.5;if(this.route>=1){this.mode='live';this.x=-4.3;this.z=3.7;this.vx=.8;this.vz=5;this.cooldowns.ramp=1;this.award(2500,'ramp');}return;}
 this.age+=dt;
 // A deliberate hold catches a gentle return; release and tap to choose a shot.
 for(const f of this.flippers){
 if(Math.abs(this.x-f.side*1.7)<.7&&this.z>9.55&&this.z<10.65&&this.vz>0){
 if(f.pressed){const aim=-f.side*(Math.abs(this.x)-1.7)*2.4;const travel=.34;this.vx=(aim-this.x)/travel;this.vz=(5.8-this.z)/travel-3.8*travel/2;this.cooldowns.catch=.45;this.cooldowns['flipper'+f.side]=.2;this.events.push({kind:'flip'});}
 else if(f.held>.18&&this.vz<8&&!this.cooldowns.catch){this.mode='cradle';this.cradleSide=f.side;this.events.push({kind:'catch'});return;}
 }
 }
 this.vz+=3.8*dt;this.vx*=Math.exp(-.05*dt);this.vz*=Math.exp(-.05*dt);this.x+=this.vx*dt;this.z+=this.vz*dt;
 if(this.vz<-3&&Math.abs(this.x)<.85&&this.z<5.95&&this.z>5.5){this.mode='crusher';this.route=0;this.combo=Math.min(5,this.combo+1);this.comboTime=18;this.crushes++;this.award(5000*this.combo,'crusher');return;}
 // Closed upper wall and side walls; the only exit is the bottom drain.
 this.contact(-6.45,-3.1,6.45,-3.1,.07);this.contact(-6.6,-3.1,-6.6,12.8,.07);this.contact(6.6,-3.1,6.6,12.8,.07);
 for(const s of this.segments){if(this.contact(...s.a,...s.b,s.r,s.kick||0,s.key)&&s.kick)this.award(100,'sling');}
 for(const sling of this.slings)this.solidSling(sling);
 BUMPERS.forEach(([x,z],i)=>{if(this.contact(x,z,x,z,1.02,6,'bumper'+i))this.award(500,'bumper',i);});
 for(let i=0;i<3;i++)if(this.contact(-3.7+i*.6,4.9,-3.3+i*.6,4.9,.1,1,'target'+i))this.award(250,'target',i);
 for(const f of this.flippers){const ax=f.side*3.05,az=10.8,dx=-f.side*2.3*Math.cos(f.angle),dz=f.side*2.3*Math.sin(f.angle);
 const rx=this.x-ax,rz=this.z-az;
 const hit=this.contact(ax,az,ax+dx,az+dz,.25,f.active?3:0,'flipper'+f.side,f.omega*rz,-f.omega*rx);
 if(hit&&this.z<11.5){this.vz=Math.min(this.vz,-12);this.vx+=-f.side*2;}
 }
 // Enter the elevated wireform only through its mouth while travelling uphill.
 if(!this.cooldowns.ramp&&this.vz<-3&&Math.abs(this.x-4.5)<.48&&Math.abs(this.z-4.6)<.35){this.mode='ramp';this.route=0;return;}
 const speed=Math.hypot(this.vx,this.vz);if(speed>23){this.vx*=23/speed;this.vz*=23/speed;}
 if(this.z>12.7){if(this.age<6&&this.saveAvailable){this.saveAvailable=false;this.serve();this.events.push({kind:'save'});}else if(this.ballNumber<3){this.ballNumber++;this.saveAvailable=true;this.serve();this.events.push({kind:'drain'});}else{this.mode='over';this.events.push({kind:'over'});}}
 }
}
