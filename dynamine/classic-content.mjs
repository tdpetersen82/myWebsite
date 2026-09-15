// Rules documented in Quolnok's Fracas FAQ. Exact speeds/durations are our
// tuning values: the guide specifies effects, not frame timings or maps.
export const JARS = {
  fireball: {effect:'fire',form:'glass',name:'Fireball',color:'#ff853e'},
  fireball4: {effect:'fire',form:'stone',name:'Four-way fireball',color:'#ffe679'},
  electric: {effect:'electric',form:'glass',name:'Electric jar',color:'#effaff'},
  electric4: {effect:'electric',form:'stone',name:'Electric spell',color:'#b9efff',bomb:true},
  teleport: {effect:'teleport',form:'glass',name:'Teleport jar',color:'#a8a9b8'},
  teleport4: {effect:'teleport',form:'stone',name:'Teleport spell',color:'#ba8aff',bomb:true},
  wind: {effect:'wind',form:'glass',name:'Wind jar',color:'#56bfff'},
  wind4: {effect:'wind',form:'stone',name:'Four-way wind',color:'#86deff'},
};
export const PASSWORDS = {MOON:1,EARTH:6,FIRE:11,MAGIC:16,LOVE:21,PINE:26,SPELL:31,BATTLE:36,SMIGGLE:41,TIME:46,STAR:51,POWER:56};
export const passwordForLevel = level => Object.entries(PASSWORDS).find(([,n])=>n===level)?.[0] || null;
export const FEATURE_HINTS = {
  spikes:'Spikes pulse red before extending. Cross while they are retracted.',
  barrier:'Electric barriers pulse on and off, blocking movement and blasts.',
  conveyor:'Moving platforms carry you and your bombs along their arrows.',
  oneway:'One-way arrows allow movement only in the marked direction.',
  gate:'L-shaped flip doors turn when hit by blasts or projectiles.',
};
export function featureActive(state,f) {return (state.time+(f.phase||0))%4>=2;}
