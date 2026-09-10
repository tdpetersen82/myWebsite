export class QuarrySound {
  constructor(muted=false){this.muted=muted;this.ctx=null;this.bus=null;this.last=new Map();}
  unlock(){
    if(this.muted)return;
    try{
      const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;
      if(!Audio)return;
      if(!this.ctx){this.ctx=new Audio();this.bus=this.ctx.createGain();this.bus.gain.value=.18;this.bus.connect(this.ctx.destination);}
      this.ctx.resume()?.catch(()=>{});
    }catch{}
  }
  mute(value){this.muted=value;if(this.bus)this.bus.gain.value=value?0:.18;if(!value)this.unlock();}
  pause(value){if(!this.ctx)return;try{(value?this.ctx.suspend():!this.muted?this.ctx.resume():null)?.catch(()=>{});}catch{}}
  tone(hz,duration,volume=.3,type='sine',delay=0,end=hz){
    const c=this.ctx,o=c.createOscillator(),g=c.createGain(),at=c.currentTime+delay;
    o.type=type;o.frequency.setValueAtTime(hz,at);o.frequency.exponentialRampToValueAtTime(end,at+duration);
    g.gain.setValueAtTime(.001,at);g.gain.linearRampToValueAtTime(volume,at+.008);g.gain.exponentialRampToValueAtTime(.001,at+duration);
    o.connect(g);g.connect(this.bus);o.start(at);o.stop(at+duration+.01);o.onended=()=>{o.disconnect();g.disconnect();};
  }
  grit(duration=.1){
    const c=this.ctx,buffer=c.createBuffer(1,Math.ceil(c.sampleRate*duration),c.sampleRate),data=buffer.getChannelData(0);
    let seed=19;for(let i=0;i<data.length;i++){seed=(seed*16807)%2147483647;data[i]=(seed/1073741824-1)*Math.pow(1-i/data.length,3);}
    const n=c.createBufferSource(),filter=c.createBiquadFilter(),g=c.createGain();n.buffer=buffer;filter.type='lowpass';filter.frequency.value=1500;g.gain.value=.4;n.connect(filter);filter.connect(g);g.connect(this.bus);n.start();n.onended=()=>{n.disconnect();filter.disconnect();g.disconnect();};
  }
  play(kind){
    if(this.muted||!this.ctx||this.ctx.state!=='running')return;
    const t=this.ctx.currentTime;if(t-(this.last.get(kind)??-10)<.055)return;this.last.set(kind,t);
    if(kind==='shipment'){this.tone(185,.8,.25,'triangle');this.tone(247,.8,.2,'triangle',.06);this.tone(370,.7,.14,'sine',.12);}
    else if(kind==='flipper')this.tone(145,.07,.4,'triangle',0,65);
    else if(kind==='launch')this.tone(90,.22,.35,'sawtooth',0,330);
    else if(kind==='rock'||kind==='bank'){this.grit(.16);this.tone(110,.12,.3,'triangle',0,55);}
    else if(kind==='crusher'){this.grit(.065);this.tone(460,.12,.25,'sine',0,180);}
    else if(kind==='sling')this.tone(235,.1,.3,'triangle',0,90);
    else if(kind==='ramp')this.tone(100,.45,.12,'sawtooth',0,180);
    else if(kind==='scoop'||kind==='scoop-release')this.tone(130,.15,.35,'triangle',0,55);
    else if(kind==='rollover'||kind==='lanes')this.tone(kind==='lanes'?880:620,.18,.2);
    else if(kind==='drain')this.tone(180,.35,.2,'sine',0,60);
    else if(kind==='orbit')this.tone(350,.2,.18,'triangle',0,700);
  }
}
