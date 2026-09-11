// Short synthesized mechanical sounds; audio begins only after user input.
export class QuarryAudio {
 constructor(){this.enabled=true;}
 unlock(){if(!this.context)this.context=new AudioContext();if(this.context.state==='suspended')this.context.resume().catch(()=>{});}
 play(kind){if(!this.enabled||!this.context)return;const c=this.context,t=c.currentTime;
 const notes=kind==='crusher'?[110,220,330,440]:kind==='bumper'?[420]:kind==='catch'?[180]:kind==='flip'?[85]:kind==='launch'?[130,260]:[240];
 notes.forEach((hz,i)=>{const o=c.createOscillator(),g=c.createGain(),start=t+i*.08;o.type=kind==='crusher'?'sawtooth':'triangle';o.frequency.setValueAtTime(hz,start);o.frequency.exponentialRampToValueAtTime(hz*.6,start+.16);g.gain.setValueAtTime(0,start);g.gain.linearRampToValueAtTime(.045,start+.008);g.gain.exponentialRampToValueAtTime(.001,start+.22);o.connect(g);g.connect(c.destination);o.start(start);o.stop(start+.24);});}
}
