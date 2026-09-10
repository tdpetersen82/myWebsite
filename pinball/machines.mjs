// Geometry and mechanisms only. Shipment rules and points belong to Phase 3.
export const rocks = [
  [120,365,155,375], [120,410,155,420], [120,455,155,465],
];
export const bumpers = [
  {x:235,y:200,r:32}, {x:320,y:190,r:32}, {x:280,y:275,r:32},
];
export const scoop = {x:140,y:155,r:19};
export const rollovers = [210,285,360];
export const orbitPath = [[105,300],[105,195],[120,150],[155,110],[300,85],[440,110],[475,150],[485,195],[485,300]];
export const laneDividers = [185,260,335,385].map(x=>[x,110,x,145]);
export const rampPath = [[432,450],[432,340],[418,260],[450,220],[490,250],[502,360],[502,545],[460,650],[420,700],[380,713]];

export function resetMachines(w) {
  w.machines = {
    down:[false,false,false], rockReset:0, bumperFlash:[0,0,0], lanes:[false,false,false],
    laneContacts:[false,false,false], laneReset:0, scoopLock:0, orbit:null,
    counts:{rocks:0,banks:0,crusher:0,conveyor:0,siding:0,orbit:0,lanes:0},
  };
  w.transport=null;
  w.notice='Machinery ready';
  w.noticeUntil=0;
}

function announce(w,type,message,index) {
  w.events.push({type,index});w.notice=message;w.noticeUntil=w.time+2;
}

export function alongPath(points,t) {
  const lengths=points.slice(1).map((p,i)=>Math.hypot(p[0]-points[i][0],p[1]-points[i][1]));
  let distance=Math.max(0,Math.min(1,t))*lengths.reduce((a,b)=>a+b,0);
  for(let i=0;i<lengths.length;i++) {
    if(distance<=lengths[i]||i===lengths.length-1) {
      const f=distance/lengths[i];return {x:points[i][0]+f*(points[i+1][0]-points[i][0]),y:points[i][1]+f*(points[i+1][1]-points[i][1])};
    }
    distance-=lengths[i];
  }
}

// Elevated ramp travel and scoop dwell are explicit ball states, frozen by the table pause.
export function tickMachines(w,dt) {
  const m=w.machines,b=w.ball;
  m.scoopLock=Math.max(0,m.scoopLock-dt);
  m.bumperFlash=m.bumperFlash.map(t=>Math.max(0,t-dt));
  if(m.rockReset>0) {
    m.rockReset=Math.max(0,m.rockReset-dt);
    if(m.rockReset===0) {
      if(b.x>95&&b.x<180&&b.y>340&&b.y<490)m.rockReset=.1;
      else {m.down.fill(false);announce(w,'bank-reset','Rock bank raised');}
    }
  }
  if(m.laneReset>0) {m.laneReset=Math.max(0,m.laneReset-dt);if(m.laneReset===0)m.lanes.fill(false);}
  if(!w.transport)return false;
  const t=w.transport;t.elapsed+=dt;
  if(t.type==='ramp'||t.type==='launch')Object.assign(b,alongPath(t.path,t.elapsed/t.duration),{vx:0,vy:0});
  else Object.assign(b,{x:scoop.x,y:scoop.y,vx:0,vy:0});
  if(t.elapsed>=t.duration) {
    if(t.type==='launch') {
      Object.assign(b,{x:t.lane,y:125,vx:0,vy:180});w.launchFeed=false;
      announce(w,'launch-return','Ball in play');
    } else if(t.type==='ramp') {
      Object.assign(b,{x:380,y:713,vx:-100,vy:130});
      announce(w,'ramp-return','Conveyor return · right flipper');
    } else {
      Object.assign(b,{x:165,y:190,vx:230,vy:220});m.scoopLock=.8;
      announce(w,'scoop-release','Siding kickout');
    }
    w.transport=null;
  }
  return true;
}

export function collideMachines(w,previous,contact) {
  const b=w.ball,m=w.machines;
  for(const rail of laneDividers)contact(b,...rail,1.5,.55);
  if(w.launchFeed&&previous.y>=175&&b.y<175&&b.x>530) {
    const lane=rollovers[Math.min(2,Math.floor(w.launchPower*3))];
    w.transport={type:'launch',elapsed:0,duration:.65,lane,path:[[b.x,b.y],[548,145],[510,95],[440,75],[lane,90],[lane,125]]};
    b.vx=0;b.vy=0;announce(w,'launch-feed','Launch feed · survey lanes');return;
  }
  for(let i=1;i<orbitPath.length;i++)contact(b,...orbitPath[i-1],...orbitPath[i],1.5,.8);
  // The ramp throat only accepts an upward, sufficiently strong shot.
  if(previous.y>=450&&b.y<450&&b.x>=405&&b.x<=460) {
    if(b.vy< -350) {
      w.transport={type:'ramp',elapsed:0,duration:1.9,path:[[b.x,450],...rampPath.slice(1)]};
      Object.assign(b,{y:450,vx:0,vy:0});m.counts.conveyor++;
      announce(w,'ramp','Conveyor running · safe return');return;
    }
    b.y=459.01;b.vy=Math.abs(b.vy)*.65+80;
    announce(w,'ramp-reject','More power for the conveyor');
  }
  if(m.scoopLock===0&&Math.hypot(b.x-scoop.x,b.y-scoop.y)<scoop.r) {
    w.transport={type:'scoop',elapsed:0,duration:.85};
    Object.assign(b,{x:scoop.x,y:scoop.y,vx:0,vy:0});m.counts.siding++;
    announce(w,'scoop','Siding capture · kickout ready');return;
  }
  for(let i=0;i<rocks.length;i++) {
    if(!m.down[i]&&contact(b,...rocks[i],4,.78)) {
      m.down[i]=true;m.counts.rocks++;announce(w,'rock',`Rock slab ${i+1} dropped`,i);
      if(m.down.every(Boolean)) {m.counts.banks++;m.rockReset=1.8;announce(w,'bank','Rock bank cleared · resetting');}
    }
  }
  for(let i=0;i<bumpers.length;i++) {
    const c=bumpers[i];
    if(contact(b,c.x,c.y,c.x,c.y,c.r,.9)&&m.bumperFlash[i]===0) {
      const dx=b.x-c.x,dy=b.y-c.y,d=Math.hypot(dx,dy);
      b.vx+=dx/d*290;b.vy+=dy/d*290;m.bumperFlash[i]=.1;m.counts.crusher++;
      announce(w,'crusher','Crusher impact',i);
    }
  }
  for(let i=0;i<rollovers.length;i++) {
    const inside=Math.abs(b.x-rollovers[i])<23&&b.y>=110&&b.y<=140;
    if(inside&&!m.laneContacts[i]) {
      m.lanes[i]=true;announce(w,'rollover',`Survey lane ${i+1} lit`,i);
      if(m.lanes.every(Boolean)&&m.laneReset===0) {m.counts.lanes++;m.laneReset=1.5;announce(w,'lanes','All survey lanes lit');}
    }
    m.laneContacts[i]=inside;
  }
  // Three checkpoints require travel up one side, over the crown, down the other.
  const left=b.x<100&&b.y>260&&b.y<340,right=b.x>480&&b.x<530&&b.y>260&&b.y<340;
  if((left||right)&&b.vy<0&&!m.orbit)m.orbit={side:left?'left':'right',crown:false,expires:w.time+4};
  if(m.orbit) {
    if(w.time>m.orbit.expires)m.orbit=null;
    else {
      if(b.y<100&&b.x>180&&b.x<420)m.orbit.crown=true;
      if(m.orbit.crown&&b.vy>0&&((m.orbit.side==='left'&&right)||(m.orbit.side==='right'&&left))) {
        m.counts.orbit++;m.orbit=null;announce(w,'orbit','Haul road orbit complete');
      }
    }
  }
}
