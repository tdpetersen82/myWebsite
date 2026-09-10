import {serve,launch} from './physics.mjs';

export const STAGES=['QUARRY','CRUSH','LOAD','SHIP'];
export const RECORD_KEY='quarryPinballRecord';
const VALUES={rock:250,crusher:100,ramp:1000,scoop:500,rollover:100,sling:25};
export function readRecord(storage){
  try{const r=JSON.parse(storage.getItem(RECORD_KEY));return {best:valid(r?.best),bestShipments:valid(r?.bestShipments),shifts:valid(r?.shifts)};}catch{return {best:0,bestShipments:0,shifts:0};}
}
function valid(n){return Number.isSafeInteger(n)&&n>=0?n:0;}
export function createShift(){return {status:'ready',ball:1,score:0,shipments:0,stage:0,rocks:[false,false,false],crushed:0,multiplier:1,bonusBase:0,bonusTotal:0,bonusPaid:0,bonusElapsed:0,saveRemaining:0,saveUsed:false,skillLane:0,skillAvailable:true,shotAge:0,combo:0,comboRemaining:0,message:'Three balls. Build your first shipment.',messageRemaining:3,completed:false};}
function say(s,message){s.message=message;s.messageRemaining=2.5;}
export function objective(s){
  return [`Quarry: ${s.rocks.filter(v=>!v).length} rock slabs remaining`,`Crusher: ${5-s.crushed} more hits`,'Shoot the conveyor to load','Shoot the siding to ship'][s.stage];
}
function prepare(s,w){
  serve(w);w.machines.down=s.stage===0?[...s.rocks]:[false,false,false];
  s.status='ready';s.combo=0;s.comboRemaining=0;
}
export function startShift(w){const s=createShift();w.paused=false;prepare(s,w);return s;}
export function launchShift(s,w){
  if(w.paused)return false;
  if(s.status==='between'){
    s.ball++;s.multiplier=1;s.bonusBase=0;s.bonusTotal=0;s.bonusPaid=0;s.bonusElapsed=0;
    s.saveUsed=false;s.saveRemaining=0;s.skillAvailable=true;s.skillLane=(s.ball-1)%3;s.shotAge=0;prepare(s,w);
    return false;
  }
  if(s.status!=='ready'||!launch(w))return false;
  s.status='playing';s.saveRemaining=s.saveUsed?0:7;s.shotAge=0;
  say(s,s.saveUsed?'Ball saved · back to work':`Skill shot: survey lane ${s.skillLane+1}`);
  return true;
}
export function handleEvent(s,w,e){
  if(s.status!=='playing')return;
  s.score+=VALUES[e.type]||0;
  if(e.type==='rock'){
    s.bonusBase+=200;
    if(s.stage===0){s.rocks[e.index]=true;if(s.rocks.every(Boolean)){s.stage=1;s.crushed=0;say(s,'Stone released · shoot the crusher');}}
  }
  if(e.type==='crusher'){
    s.bonusBase+=100;
    if(s.stage===1&&++s.crushed>=5){s.stage=2;say(s,'Load processed · shoot the conveyor');}
  }
  if(e.type==='ramp'){
    s.bonusBase+=500;
    if(s.stage===2){s.stage=3;say(s,'Wagon ready · shoot the siding');}
  }
  if(e.type==='scoop'&&s.stage===3){
    const jackpot=10000+s.shipments*5000;s.score+=jackpot;s.shipments++;s.bonusBase+=2000;
    s.stage=0;s.rocks.fill(false);s.crushed=0;
    w.machines.down.fill(true);w.machines.rockReset=.4;
    say(s,`Shipment ${s.shipments} dispatched · +${jackpot.toLocaleString()}`);
  }
  if(e.type==='rollover'&&s.skillAvailable){
    if(s.shotAge<=12&&e.index===s.skillLane){s.score+=3000;say(s,'Survey skill shot · +3,000');}
    s.skillAvailable=false;
  }
  if(e.type==='lanes'){
    s.multiplier=({1:2,2:3,3:5,5:5})[s.multiplier];say(s,`Survey complete · ${s.multiplier}× bonus`);
  }
  if(e.type==='orbit'){
    s.combo=s.comboRemaining>0?Math.min(5,s.combo+1):1;s.comboRemaining=8;
    const award=1500*s.combo;s.score+=award;say(s,`Haul combo ${s.combo} · +${award.toLocaleString()}`);
  }
  if(e.type==='drain'){
    if(s.saveRemaining>0&&!s.saveUsed){
      s.saveUsed=true;s.saveRemaining=0;s.skillAvailable=false;
      const machines=w.machines;serve(w);w.machines=machines;w.machines.orbit=null;s.status='ready';
      say(s,'BALL SAVED · launch the same ball again');
    }else{
      s.status='bonus';s.saveRemaining=0;s.comboRemaining=0;s.bonusTotal=s.bonusBase*s.multiplier;s.bonusPaid=0;s.bonusElapsed=0;
      say(s,`Ball ${s.ball} complete · counting bonus`);
    }
  }
}
export function tickShift(s,w,dt){
  if(w.paused)return;
  s.messageRemaining=Math.max(0,s.messageRemaining-dt);
  if(s.status==='playing'){
    s.saveRemaining=Math.max(0,s.saveRemaining-dt);s.comboRemaining=Math.max(0,s.comboRemaining-dt);
    s.shotAge+=dt;if(s.shotAge>12)s.skillAvailable=false;
    for(const e of w.events)handleEvent(s,w,e);
  }else if(s.status==='bonus'){
    s.bonusElapsed+=dt;
    const paid=Math.min(s.bonusTotal,Math.floor(s.bonusTotal*s.bonusElapsed/2));
    s.score+=paid-s.bonusPaid;s.bonusPaid=paid;
    if(s.bonusElapsed>=2){s.status=s.ball===3?'over':'between';s.completed=s.status==='over';}
  }
}
export function saveRecord(s,record,storage){
  const updated={best:Math.max(record.best,s.score),bestShipments:Math.max(record.bestShipments,s.shipments),shifts:record.shifts+(s.completed?1:0)};
  try{storage.setItem(RECORD_KEY,JSON.stringify(updated));}catch{}
  s.completed=false;return updated;
}
