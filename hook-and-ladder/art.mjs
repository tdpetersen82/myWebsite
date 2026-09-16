// Canvas artwork. The city and the incident board share one night-shift palette.
import { W, H, TILE, PITCH, BLOCKS_X, BLOCKS_Y, blockAt, roofPoint } from './engine.mjs?v=20260916g';
const TAU = Math.PI * 2;
function rect(c,x,y,w,h,r=0){c.beginPath();c.roundRect(x,y,w,h,r);}
function glow(c,x,y,r,color){const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}
export function paintCity(c,world) {
  c.fillStyle='#101e29';c.fillRect(0,0,W,H);
  // Wet asphalt: quiet texture, tire grooves, and warm lane paint.
  c.fillStyle='#152631';
  for(let i=0;i<1200;i++)c.fillRect((i*7919)%W,(i*3253)%H,2+(i%3),1);
  c.strokeStyle='#607078';c.lineWidth=1;c.setLineDash([10,12]);
  for(let n=0;n<5;n++){
    const x=(1.5+n*PITCH)*TILE;c.beginPath();c.moveTo(x,0);c.lineTo(x,H);c.stroke();
  }
  for(let n=0;n<3;n++){
    const y=(1.5+n*PITCH)*TILE;c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke();
  }
  c.setLineDash([]);
  // Intersections are open asphalt, with zebra crossings beside the curbs.
  for(let r=0;r<3;r++)for(let col=0;col<5;col++){
    const x=col*PITCH*TILE,y=r*PITCH*TILE;
    c.fillStyle='#14242e';c.fillRect(x+6,y+6,108,108);
  }
  for(let by=0;by<BLOCKS_Y;by++)for(let bx=0;bx<BLOCKS_X;bx++){
    const b=blockAt(bx,by),x=b.col*TILE,y=b.row*TILE;
    c.fillStyle='#314650';rect(c,x,y,160,160,7);c.fill();
    c.strokeStyle='#668086';c.lineWidth=2;rect(c,x+1,y+1,158,158,6);c.stroke();
    c.strokeStyle='#425862';c.lineWidth=1;
    for(let k=20;k<160;k+=20){c.beginPath();c.moveTo(x+k,y+1);c.lineTo(x+k,y+7);c.moveTo(x+1,y+k);c.lineTo(x+7,y+k);c.stroke();}
    c.fillStyle='#87918a';
    for(let k=0;k<6;k++){
      c.fillRect(x-91+k*13,y-15,8,5);c.fillRect(x-15,y-91+k*13,5,8);
      c.fillRect(x+173,y+18+k*13,5,8);c.fillRect(x+18+k*13,y+173,8,5);
    }
    // Lamps cast pools of light without introducing invisible obstacles.
    for(const [lx,ly] of [[x+5,y+5],[x+155,y+155]]){
      glow(c,lx,ly,48,'rgba(255,211,130,.11)');c.fillStyle='#efc882';c.fillRect(lx-2,ly-2,4,4);
    }
  }
  for(const p of world.parks){
    const x=p.col*TILE+8,y=p.row*TILE+8;
    c.fillStyle='#173d37';rect(c,x,y,144,144,9);c.fill();
    c.strokeStyle='#527066';c.lineWidth=7;c.beginPath();c.moveTo(x+5,y+110);c.bezierCurveTo(x+40,y+30,x+90,y+120,x+140,y+25);c.stroke();
    c.fillStyle='#254d47';c.beginPath();c.ellipse(x+85,y+55,25,17,-.4,0,TAU);c.fill();
    c.strokeStyle='#4b8178';c.lineWidth=2;c.stroke();
  }
  for(const t of world.trees){
    c.fillStyle='#0b2725';c.beginPath();c.ellipse(t.x+5,t.y+7,t.r*1.2,t.r,0,0,TAU);c.fill();
    for(let i=0;i<3;i++){c.fillStyle=['#23584b','#347461','#4c8c70'][i];c.beginPath();c.arc(t.x-i*2,t.y-i*3,t.r-i*3,0,TAU);c.fill();}
  }
  for(const b of world.buildings)building(c,b);
  c.font='600 8px monospace';c.fillStyle='#758c96';c.textAlign='center';
  const streets=['HARBOR','UNION','STATION','CANAL'];
  for(let i=0;i<4;i++)c.fillText(streets[i]+' ST',(5+i*7)*TILE,325);
}
function building(c,b){
  const x=b.col*TILE+8,y=b.row*TILE+7,w=b.w*TILE-16,h=b.h*TILE-16;
  const colors=[['#385469','#263c50'],['#52635e','#334b49'],['#665c57','#443f42'],['#475e70','#293f53']][b.id%4];
  c.fillStyle='rgba(0,7,15,.45)';rect(c,x+9,y+12,w,h,3);c.fill();
  c.fillStyle='#192c38';rect(c,x,y+7,w,h,3);c.fill();
  // A visible street-facing facade makes the rooftops read as buildings.
  c.fillStyle=colors[1];c.fillRect(x,y+h-8,w,16);
  for(let k=8;k<w-5;k+=13){c.fillStyle=(k+b.id)%3?'#d9b271':'#708b8e';c.fillRect(x+k,y+h-2,5,5);}
  const roof=c.createLinearGradient(x,y,x+w,y+h);roof.addColorStop(0,colors[0]);roof.addColorStop(1,colors[1]);
  c.fillStyle=roof;rect(c,x,y,w,h-7,3);c.fill();
  c.strokeStyle='#789199';c.lineWidth=2;rect(c,x+2,y+2,w-4,h-11,2);c.stroke();
  c.strokeStyle='rgba(6,21,31,.45)';c.lineWidth=1;
  for(let yy=y+14;yy<y+h-10;yy+=17){c.beginPath();c.moveTo(x+5,yy);c.lineTo(x+w-5,yy);c.stroke();}
  // HVAC housings, conduits and a roof access hatch.
  c.fillStyle='#142c39';c.fillRect(x+12,y+13,22,16);c.fillStyle='#6f8790';c.fillRect(x+10,y+10,22,16);
  c.fillStyle='#2d4856';for(let k=0;k<4;k++)c.fillRect(x+13+k*4,y+12,2,11);
  c.strokeStyle='#829291';c.lineWidth=2;c.beginPath();c.moveTo(x+31,y+19);c.lineTo(x+w-13,y+19);c.lineTo(x+w-13,y+38);c.stroke();
  c.fillStyle='#233d4b';c.fillRect(x+w-26,y+h-33,15,15);c.strokeStyle='#829697';c.strokeRect(x+w-26,y+h-33,15,15);
  if(b.id%5===0){
    const name=['HOTEL','MARKET','DEPOT'][b.id%3];c.fillStyle='#122c3a';c.fillRect(x+6,y+h-17,w-12,12);
    c.fillStyle='#efbd7e';c.font='bold 8px monospace';c.textAlign='center';c.fillText(name,x+w/2,y+h-8);
  }
}
function flame(c,x,y,size,t,seed){
  glow(c,x,y,size*3,'rgba(255,100,30,.3)');
  for(let i=0;i<3;i++){
    const h=size*(1.8+.3*Math.sin(t*9+seed+i*2)),w=size*(1-i*.25),ox=(i-1)*size*.28;
    c.fillStyle=['#f04c29','#ff9637','#ffe7a1'][i];c.beginPath();c.moveTo(x+ox-w,y+size*.5);
    c.bezierCurveTo(x+ox-w*1.3,y-h*.25,x+ox+Math.sin(t*6+seed)*w,y-h*.5,x+ox+w*.2,y-h);
    c.bezierCurveTo(x+ox+w*.5,y-h*.35,x+ox+w*1.4,y,x+ox+w*.6,y+size*.5);c.closePath();c.fill();
  }
  for(let i=0;i<4;i++){
    const age=(t*.7+i*.23+seed)%1;c.globalAlpha=1-age;c.fillStyle='#ffcf74';c.fillRect(x+Math.sin(i*7+t)*size*.8,y-age*size*4,2,3);
  }c.globalAlpha=1;
}
function person(c,x,y,t,color='#ffd5aa'){
  c.fillStyle='rgba(0,0,0,.3)';c.beginPath();c.ellipse(x,y+12,11,4,0,0,TAU);c.fill();
  c.strokeStyle='#a3efd0';c.lineWidth=5;c.lineCap='round';
  c.beginPath();c.moveTo(x,y-3);c.lineTo(x,y+7);c.moveTo(x-7,y+15);c.lineTo(x,y+7);c.lineTo(x+7,y+15);c.stroke();
  c.beginPath();c.moveTo(x-11,y-9-Math.sin(t*6)*4);c.lineTo(x,y);c.lineTo(x+11,y-8);c.stroke();
  c.fillStyle=color;c.beginPath();c.arc(x,y-11,6,0,TAU);c.fill();
}
export function drawWorldFire(c,f,t){
  const b=f.building;
  glow(c,b.cx,b.cy,Math.max(b.w,b.h)*TILE,'rgba(240,102,34,.14)');
  for(const target of f.targets){
    if(target.hp<=0)continue;const p=roofPoint(target.at),x=(b.col+p.u*b.w)*TILE,y=(b.row+p.v*b.h)*TILE;
    if(target.kind==='fire')flame(c,x,y,7+target.hp*5,t,target.at*10);else{c.save();c.translate(x,y);c.scale(.65,.65);person(c,0,0,t);c.restore();}
  }
}

export function drawCars(c,cars){
  for(const car of cars){
    c.save();c.translate(car.x+car.w/2,car.y+car.h/2);c.rotate(car.heading ?? (car.dir==='v'?Math.PI/2:0));
    c.fillStyle='#061019';rect(c,-18,-8,37,20,5);c.fill();
    c.fillStyle=car.color;rect(c,-17,-8,34,16,4);c.fill();
    c.fillStyle='#142b38';rect(c,-8,-6,15,12,3);c.fill();
    c.fillStyle='#a2c0c9';c.fillRect(5,-5,2,10);c.fillStyle='#d8dbc2';c.fillRect(14,-6,2,3);c.fillRect(14,3,2,3);
    c.fillStyle='#b84942';c.fillRect(-17,-6,2,3);c.fillRect(-17,3,2,3);c.restore();
  }
}
