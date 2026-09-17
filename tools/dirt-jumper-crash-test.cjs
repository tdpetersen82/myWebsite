// node tools/dirt-jumper-crash-test.cjs /path/to/phaser-3.80.1.js
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
const parts=JSON.parse(fs.readFileSync(path.join(__dirname,'../dirt-jumper/assets/rider-atlas.json')));
const context=vm.createContext({console,assert,Phaser:{Math:{Clamp:(x,a,b)=>Math.max(a,Math.min(b,x))},Physics:{Matter:{Matter}}},parts});
for(const name of ['config','Bike','BikeArt','CrashRig'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../dirt-jumper/js/'+name+'.js'),'utf8'),context);
vm.runInContext(`
const scene={cache:{json:{get:()=>parts}},textures:{get:()=>({has:()=>true})},add:{image:()=>{
    const sprite={};for(const method of ['setDepth','setTint','setOrigin','setPosition','setScale','setRotation'])sprite[method]=()=>sprite;return sprite;
}}};
// Validate rendered texture joints, not only the skeleton's intended endpoints.
for(const squat of [-0.3,0,0.85,1.15]) for(const fork of [0,2.2,5.2]) for(const angle of [-75,0,75]) {
    const bike=new Bike(null,CONFIG.STATS,0);bike.compress=squat;bike.forkCompression=fork;bike.angle=angle;
    const art=new BikeArt(scene);art.update(bike);
    for(const [id,pose] of Object.entries(art.pose)) {
        if(!pose.a)continue;
        const [ax,ay,bx,by]=parts[pose.partName].joints;
        const start=art.texturePoint(id,ax,ay),end=art.texturePoint(id,bx,by);
        assert(Math.hypot(start.x-pose.a.x,start.y-pose.a.y)<1e-7,'upper texture joint is attached');
        assert(Math.hypot(end.x-pose.b.x,end.y-pose.b.y)<1e-7,'lower texture joint is attached');
    }
    for(const [id,length] of [['torso',27],['thigh',23],['shin',23],['upperArm',20],['forearm',20]]) {
        const p=art.pose[id];assert(Math.abs(Math.hypot(p.b.x-p.a.x,p.b.y-p.a.y)-length)<0.001,'rigid '+id+' length');
    }
    const rear=art.pose.rearWheel.anchor,dropout=art.pose.frame.anchor;
    assert(Math.hypot(rear.x-dropout.x,rear.y-dropout.y)<0.001,'rear axle stays in hardtail dropout');
    assert.equal(art.pose.rearWheel.width,40,'wheel proportions');
    const collar=art.texturePoint('torso',...parts.torso.neck);
    assert(Math.hypot(collar.x-art.pose.head.anchor.x,collar.y-art.pose.head.anchor.y)<1e-7,'helmet follows actual collar');
    const grip=art.texturePoint('bars',...parts.bars.grip);
    assert(Math.hypot(grip.x-art.pose.forearm.b.x,grip.y-art.pose.forearm.b.y)<1e-7,'hands reach rendered handlebar grips');
    const upper=art.pose.forkUpper;
    assert(Math.abs(Math.hypot(upper.b.x-upper.a.x,upper.b.y-upper.a.y)-12)<1e-7,'fork upper stays rigid through travel');
    const crown=art.texturePoint('frame',...parts.frame.crown);
    assert(Math.hypot(crown.x-art.pose.forkUpper.a.x,crown.y-art.pose.forkUpper.a.y)<1e-7,'fork joins rendered headtube');
}
console.log('PASS: 36 sprite poses; exact joint endpoints, collar, grips and fork attachment.');
for(const velocity of [200,500,820]) for(const slope of [0,0.15,-0.1]) for(const angle of [-75,0,75,160]) {
    const terrain={heightAt:x=>slope*x};
    const bike=new Bike(null,CONFIG.STATS,0);bike.y=0;bike.angle=angle;bike.vx=velocity;bike.vy=350;
    const art=new BikeArt(scene);art.update(bike);
    const crash=new CrashRig(art,bike,terrain);
    const start=crash.focus().x;
    let maxAngle=0,maxSeparationChange=0;
    const offset={x:crash.focus().x-crash.frame.position.x,y:crash.focus().y-crash.frame.position.y};
    for(let i=0;i<600;i++) {
        crash.update(1000/120);
        for(const body of crash.dynamic) {
            assert(Number.isFinite(body.position.x+body.position.y+body.angle));
            assert(body.position.y<terrain.heightAt(body.position.x)+8,JSON.stringify({check:'terrain',velocity,slope,i,position:body.position,label:body.label,angle:body.angle}));
        }
        maxSeparationChange=Math.max(maxSeparationChange,Math.hypot(crash.focus().x-crash.frame.position.x-offset.x,crash.focus().y-crash.frame.position.y-offset.y));
        maxAngle=Math.max(maxAngle,Math.abs(crash.links.torso.body.angle));
    }
    assert(crash.focus().x>start+20,'impact momentum carries rider forward');
    assert(maxAngle>0.5,'rider tumbles instead of freezing');
    assert(maxSeparationChange>8,'rider moves independently of bike during crash, even if they settle together');
    assert(crash.engine.world.bodies.length<230,'bounded crash world');
    crash.destroy();assert.equal(crash.engine.world.bodies.length,0);
}
console.log('PASS: 36 Matter crash scenarios; momentum, rider/bike separation, tumbling, terrain contact, finite state and cleanup.');
`,context);
