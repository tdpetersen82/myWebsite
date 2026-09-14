// node lab/dirt-jumper/tests/crash.cjs /path/to/phaser-3.80.1.js
// Runs the exact bundled Matter engine, without a browser or a second engine version.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
if(!process.argv[2]) throw Error('Pass a local copy of the game\'s unminified Phaser 3.80.1 build.');
const source=fs.readFileSync(process.argv[2],'utf8'),modules=new Map();
function bundled(id) {
    if(modules.has(id)) return modules.get(id).exports;
    const marker='/***/ '+id+':';
    const start=source.indexOf(marker);
    assert(start>=0,'Bundled module '+id+' exists');
    const bodyStart=source.indexOf('=> {',start)+4;
    const bodyEnd=source.indexOf('/***/ }),',bodyStart);
    const module={exports:{}};modules.set(id,module);
    new Function('module','exports','__webpack_require__',source.slice(bodyStart,bodyEnd))(module,module.exports,bundled);
    return module.exports;
}
const Matter=bundled(19933);
const parts=JSON.parse(fs.readFileSync(path.join(__dirname,'../assets/rider-atlas.json')));
const context=vm.createContext({console,assert,Phaser:{Math:{Clamp:(x,a,b)=>Math.max(a,Math.min(b,x))},Physics:{Matter:{Matter}}},parts});
for(const name of ['config','Bike','BikeArt','CrashRig'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/'+name+'.js'),'utf8'),context);
vm.runInContext(`
const scene={cache:{json:{get:()=>parts}},textures:{get:()=>({has:()=>true})},add:{image:()=>{
    const sprite={};for(const method of ['setDepth','setTint','setOrigin','setPosition','setScale','setRotation'])sprite[method]=()=>sprite;return sprite;
}}};
for(const velocity of [200,500,820]) for(const slope of [0,0.15,-0.1]) for(const angle of [-75,0,75,160]) {
    const terrain={heightAt:x=>slope*x};
    const bike=new Bike(null,CONFIG.STATS,0);bike.y=0;bike.angle=angle;bike.vx=velocity;bike.vy=350;
    const art=new BikeArt(scene);art.update(bike);
    const crash=new CrashRig(art,bike,terrain);
    const start=crash.focus().x;
    let maxAngle=0;
    for(let i=0;i<600;i++) {
        crash.update(1000/120);
        for(const body of crash.dynamic) {
            assert(Number.isFinite(body.position.x+body.position.y+body.angle));
            assert(body.position.y<terrain.heightAt(body.position.x)+8,JSON.stringify({check:'terrain',velocity,slope,i,position:body.position,label:body.label,angle:body.angle}));
        }
        maxAngle=Math.max(maxAngle,Math.abs(crash.links.torso.body.angle));
    }
    assert(crash.focus().x>start+20,'impact momentum carries rider forward');
    assert(maxAngle>0.5,'rider tumbles instead of freezing');
    assert(Math.hypot(crash.focus().x-crash.frame.position.x,crash.focus().y-crash.frame.position.y)>8,'rider separates from bike');
    assert(crash.engine.world.bodies.length<230,'bounded crash world');
    crash.destroy();assert.equal(crash.engine.world.bodies.length,0);
}
console.log('PASS: 36 Matter crash scenarios; momentum, rider/bike separation, tumbling, terrain contact, finite state and cleanup.');
`,context);
