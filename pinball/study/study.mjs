import * as THREE from 'three';
import {QuarryPhysics} from './physics.mjs';
const collisionSegments=[];
import {OrbitControls} from './vendor/OrbitControls.js';
import {RoundedBoxGeometry} from './vendor/RoundedBoxGeometry.js';
const canvas=document.querySelector('#scene'),status=document.querySelector('#status');
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});}catch(e){document.querySelector('#error').hidden=false;document.querySelector('#error').textContent='This study needs WebGL 2. Open this page in a browser with hardware acceleration enabled.';throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.9;
const scene=new THREE.Scene();scene.background=new THREE.Color('#0b131a');scene.fog=new THREE.FogExp2('#0b131a',.018);
const camera=new THREE.PerspectiveCamera(38,innerWidth/innerHeight,.1,100);camera.position.set(0,25,29);
const controls=new OrbitControls(camera,canvas);controls.target.set(0,.8,3.5);controls.enableDamping=true;controls.minDistance=8;controls.maxDistance=48;controls.maxPolarAngle=Math.PI*.46;controls.minPolarAngle=.18;controls.update();
// Softbox environment gives the metal true reflected highlights, not painted streaks.
const env=new THREE.Scene();env.background=new THREE.Color('#39434b');
for(const [x,y,z,sx,sy,sz,color,intensity] of [[-7,7,0,2,9,14,'#ffe9b8',4],[8,5,0,2,10,15,'#d4eaff',3],[0,10,-7,16,1,4,'#fff3d8',5]]){
 const box=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),new THREE.MeshBasicMaterial({color:new THREE.Color(color).multiplyScalar(intensity)}));box.position.set(x,y,z);env.add(box);
}
const pmrem=new THREE.PMREMGenerator(renderer);const environment=pmrem.fromScene(env,.04);scene.environment=environment.texture;scene.environmentIntensity=.65;pmrem.dispose();
const hemi=new THREE.HemisphereLight('#cde8ff','#3e2716',.4);scene.add(hemi);
const sun=new THREE.DirectionalLight('#ffe6b0',3.5);sun.position.set(-7,12,5);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-12;sun.shadow.camera.right=12;sun.shadow.camera.top=12;sun.shadow.camera.bottom=-18;sun.shadow.normalBias=.035;sun.shadow.bias=-.0001;scene.add(sun);
const rim=new THREE.DirectionalLight('#9ed8f2',1.4);rim.position.set(8,6,-6);scene.add(rim);
const mat=(color,metalness=0,roughness=.5)=>new THREE.MeshStandardMaterial({color,metalness,roughness});
const brass=mat('#b99b52',.88,.23),chrome=mat('#d8e4e8',1,.14),darkSteel=mat('#233c45',.8,.35),rubber=mat('#101b20',.05,.7),ivory=mat('#ede2bf',.1,.3),wood=mat('#30261b',.05,.45);
function mesh(geo,material,x=0,y=0,z=0,parent=scene){const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function box(w,h,d,material,x,y,z,parent=scene){return mesh(new RoundedBoxGeometry(w,h,d,2,.045),material,x,y,z,parent);}
function cyl(rt,rb,h,material,x,y,z,parent=scene){return mesh(new THREE.CylinderGeometry(rt,rb,h,64),material,x,y,z,parent);}
function ring(r,t,material,x,y,z,parent=scene){const m=mesh(new THREE.TorusGeometry(r,t,12,96),material,x,y,z,parent);m.rotation.x=Math.PI/2;return m;}
function rod(a,b,r,material,parent=scene){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),m=mesh(new THREE.CylinderGeometry(r,r,av.distanceTo(bv),10),material,0,0,0,parent);m.position.copy(av).add(bv).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),bv.sub(av).normalize());return m;}
function label(text,w=512,h=128,color='#eedcb0',background='#162d35'){
 const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.fillStyle=background;x.fillRect(0,0,w,h);x.strokeStyle='#b99b52';x.lineWidth=5;x.strokeRect(5,5,w-10,h-10);x.fillStyle=color;x.textAlign='center';x.textBaseline='middle';x.font=`600 ${Math.floor(h*.33)}px Georgia`;x.fillText(text,w/2,h/2,w-36);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
const floorMap=await new THREE.TextureLoader().loadAsync('../assets/quarry-playfield-v2.jpg');floorMap.colorSpace=THREE.SRGBColorSpace;floorMap.anisotropy=renderer.capabilities.getMaxAnisotropy();
box(15,1.4,21.2,wood,0,-.85,4);const bed=mesh(new THREE.PlaneGeometry(14.6,20.8),new THREE.MeshStandardMaterial({map:floorMap,roughness:.45,metalness:.12}),0,-.12,4);bed.rotation.x=-Math.PI/2;
for(const x of [-7.4,7.4]){box(.26,.7,21.2,wood,x,0,4);box(.08,.06,21.15,brass,x,.39,4);}
box(15,.7,.28,wood,0,0,-6.5);box(15,.7,.28,wood,0,0,14.5);box(14.8,.07,.07,brass,0,.38,14.35);
const plaque=mesh(new THREE.PlaneGeometry(6,1),new THREE.MeshStandardMaterial({map:label('LIMESTONE  /  THE QUARRY'),roughness:.38,metalness:.2}),0,.1,13.4);plaque.rotation.x=-Math.PI/2;
// Layered limestone blocks with deterministic mineral speckle and strata texture.
let seed=173;function rand(){seed=(seed*16807)%2147483647;return(seed-1)/2147483646;}
const stoneCanvas=document.createElement('canvas');stoneCanvas.width=stoneCanvas.height=512;const sc=stoneCanvas.getContext('2d');sc.fillStyle='#bdaf92';sc.fillRect(0,0,512,512);
for(let i=0;i<25000;i++){const v=Math.floor(120+rand()*120);sc.fillStyle=`rgba(${v},${v-9},${v-27},${.1+rand()*.3})`;sc.fillRect(rand()*512,rand()*512,1+rand()*5,1+rand()*3);}
for(let y=12;y<512;y+=24+rand()*35){sc.strokeStyle='#655d443a';sc.lineWidth=1+rand()*3;sc.beginPath();sc.moveTo(0,y);for(let x=0;x<=512;x+=30)sc.lineTo(x,y+rand()*8);sc.stroke();}
const stoneMap=new THREE.CanvasTexture(stoneCanvas);stoneMap.colorSpace=THREE.SRGBColorSpace;stoneMap.wrapS=stoneMap.wrapT=THREE.RepeatWrapping;stoneMap.anisotropy=8;
const rockPhoto=floorMap.clone();rockPhoto.repeat.set(.22,.32);rockPhoto.offset.set(.01,.38);
const stoneMaterials=Array.from({length:6},(_,i)=>new THREE.MeshStandardMaterial({color:new THREE.Color().setHSL(.11,.16,.72+i*.03),map:rockPhoto,bumpMap:stoneMap,bumpScale:.14,roughness:.94}));
function cliff(w,h,d,material,x,y,z){
 const geo=new THREE.BoxGeometry(w,h,d,5,5,4),pos=geo.attributes.position;
 for(let i=0;i<pos.count;i++){
  const px=pos.getX(i),py=pos.getY(i),pz=pos.getZ(i);
  const n=Math.sin(px*13.7+py*7.3+pz*5.1)*Math.cos(px*9.1-py*11.3+pz*8.2);
  pos.setXYZ(i,px+n*.10,py+Math.sin(px*8.3+pz*11.2)*.055,pz+n*.14);
 }
 geo.computeVertexNormals();const m=mesh(geo,material,x,y,z);m.rotation.y=(rand()-.5)*.18;return m;
}
for(let layer=0;layer<3;layer++)for(let i=0;i<10;i++){
 const x=-6.5+i*1.4+rand()*.15,z=-4.2-layer*.48;
 cliff(1.4+rand()*.35,.95+rand()*.35,1.3+rand()*.3,stoneMaterials[i%6],x,layer*.85+.35+rand()*.13,z);
}
for(let i=0;i<9;i++)cliff(1+rand()*.5,.7+rand()*1.1,1.1,stoneMaterials[i%6],-6.3,.3+rand()*.2,-3.5+i*.75);
for(let i=0;i<55;i++){const m=mesh(new THREE.DodecahedronGeometry(.08+rand()*.18,0),stoneMaterials[i%6],-6.6+rand()*13,.04,-3.7+rand()*.55);m.rotation.set(rand(),rand(),rand());}
const bumperGroups=[];
for(const [index,x,z] of [[0,-2.4,.4],[1,.1,-1.8],[2,2.3,.55]]){
 const group=new THREE.Group();group.position.set(x,0,z);scene.add(group);
 cyl(1.02,1.08,.14,darkSteel,0,.04,0,group);cyl(.94,1,.15,brass,0,.16,0,group);ring(.91,.055,chrome,0,.25,0,group);
 cyl(.73,.82,.48,chrome,0,.48,0,group);ring(.81,.09,rubber,0,.31,0,group);ring(.83,.065,brass,0,.77,0,group);
 for(let k=0;k<16;k++){const a=k*Math.PI/8;rod([Math.sin(a)*.74,.32,Math.cos(a)*.74],[Math.sin(a)*.74,.75,Math.cos(a)*.74],.022,brass,group);}
 const cap=new THREE.Group();cap.position.y=.86;group.add(cap);
 const amber=new THREE.MeshPhysicalMaterial({color:'#ffab13',roughness:.12,metalness:.02,transmission:.65,thickness:.25,ior:1.48,clearcoat:1,clearcoatRoughness:.12,emissive:'#ff7d09',emissiveIntensity:.24});
 mesh(new THREE.SphereGeometry(.87,64,32,0,Math.PI*2,0,Math.PI/2),amber,0,0,0,cap);
 cyl(.87,.89,.07,brass,0,0,0,cap);ring(.88,.035,chrome,0,.035,0,cap);
 cyl(.18,.24,.16,brass,0,.83,0,cap);mesh(new THREE.SphereGeometry(.105,20,16),new THREE.MeshStandardMaterial({color:'#fff0b1',emissive:'#ffad28',emissiveIntensity:3}),0,.94,0,cap);
 mesh(new THREE.SphereGeometry(.22,24,16),new THREE.MeshStandardMaterial({color:'#ffe5ab',emissive:'#ffb63c',emissiveIntensity:3}),0,1.03,0,group);
 const light=new THREE.PointLight('#ffad32',6,5,2);light.position.set(0,1,0);group.add(light);
 for(let k=0;k<6;k++){const a=k*Math.PI/3;cyl(.055,.055,.04,chrome,Math.sin(a)*.95,.26,Math.cos(a)*.95,group);}
 const sign=mesh(new THREE.PlaneGeometry(1.6,.34),new THREE.MeshStandardMaterial({map:label(['EXCAVATE','PROCESS','DELIVER'][index]),roughness:.45}),x,.015,z+1.28);sign.rotation.x=-Math.PI/2;
 bumperGroups.push({cap,light,amber,pulse:0});
}
// A curved, elevated two-rail wireform with transverse hoops and vertical stanchions.
const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(4.5,.65,4.6),new THREE.Vector3(5.1,1.5,2),new THREE.Vector3(5.15,2.7,-1.8),new THREE.Vector3(3.9,3.35,-3.2),new THREE.Vector3(1.1,3.45,-3.6),new THREE.Vector3(-2.1,3.1,-3),new THREE.Vector3(-4.3,2.45,-1.7),new THREE.Vector3(-4.65,1.7,.6),new THREE.Vector3(-4.3,.55,3.7)]);
function point(t,offset=0,lift=0){const p=curve.getPointAt(t),d=curve.getTangentAt(t),n=new THREE.Vector3(-d.z,0,d.x).normalize();return p.addScaledVector(n,offset).add(new THREE.Vector3(0,lift,0));}
for(const [offset,lift,radius] of [[-.3,0,.045],[.3,0,.045],[-.48,.37,.045],[.48,.37,.045],[-.48,.7,.035],[.48,.7,.035]]){
 const path=new THREE.CatmullRomCurve3(Array.from({length:101},(_,i)=>point(i/100,offset,lift)));mesh(new THREE.TubeGeometry(path,180,radius,10,false),chrome);
}
for(let i=0;i<=45;i++){
 const t=i/45;rod(point(t,-.48,.37).toArray(),point(t,-.3,0).toArray(),.035,chrome);rod(point(t,-.3,0).toArray(),point(t,.3,0).toArray(),.035,chrome);rod(point(t,.3,0).toArray(),point(t,.48,.37).toArray(),.035,chrome);
 if(i%3===0)for(const side of [-1,1])rod(point(t,side*.48,.37).toArray(),point(t,side*.48,.7).toArray(),.035,chrome);
}
for(const t of [.05,.2,.36,.55,.73,.92]){
 const p=point(t,.65);rod([p.x,.05,p.z],[p.x,p.y+.3,p.z],.075,brass);cyl(.24,.28,.08,brass,p.x,.03,p.z);rod([p.x,p.y,p.z],point(t,.3).toArray(),.05,chrome);
}
// Warm quarry work lamps with metal cages.
for(const [x,z] of [[-5.5,-4],[0,-5.3],[5.6,-4],[-6,3.8],[6,3.8]]){
 cyl(.2,.28,.16,brass,x,.07,z);cyl(.12,.13,.48,new THREE.MeshStandardMaterial({color:'#ffe6a2',emissive:'#ffa51a',emissiveIntensity:4}),x,.4,z);
 ring(.18,.025,brass,x,.2,z);ring(.18,.025,brass,x,.65,z);for(let k=0;k<4;k++){const a=k*Math.PI/2;rod([x+Math.sin(a)*.18,.18,z+Math.cos(a)*.18],[x+Math.sin(a)*.18,.66,z+Math.cos(a)*.18],.025,brass);}
 const l=new THREE.PointLight('#ffb14e',3,4,2);l.position.set(x,.6,z);scene.add(l);
}
// Inlaid arrow lamps identify a plausible approach to the bumper cluster.
for(const [x,z] of [[-2.4,3.1],[0,2.6],[2.3,3.2]]){
 const shape=new THREE.Shape();shape.moveTo(0,-.34);shape.lineTo(.25,.2);shape.lineTo(-.25,.2);shape.closePath();
 const insert=mesh(new THREE.ExtrudeGeometry(shape,{depth:.035,bevelEnabled:true,bevelThickness:.035,bevelSize:.05,bevelSegments:2}),brass,x,0,z);insert.rotation.x=-Math.PI/2;
 const lit=mesh(new THREE.ShapeGeometry(shape),new THREE.MeshStandardMaterial({color:'#ffe7a1',emissive:'#ff9e12',emissiveIntensity:1.3}),x,.09,z);lit.rotation.x=-Math.PI/2;lit.scale.setScalar(.68);
}
// Full-table hardware: rails, inlanes, slingshots and articulated flippers.
function rail(points,material=chrome,r=.065){const c=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
 if(points.every(p=>p[1]<=.5)&&points.every(p=>Math.abs(p[0])<6.8)){
 const samples=c.getPoints(80);for(let i=1;i<samples.length;i++)collisionSegments.push({a:[samples[i-1].x,samples[i-1].z],b:[samples[i].x,samples[i].z],r,kick:material===rubber?4:0,key:'sling'+Math.sign(points[0][0])});}
 return mesh(new THREE.TubeGeometry(c,80,r,10,false),material);}
function deckSign(text,x,z,w=2.1,h=.45){const m=mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:label(text),roughness:.5}),x,.035,z);m.rotation.x=-Math.PI/2;return m;}
for(const side of [-1,1]){
 const outer=[[side*6.4,.45,-3],[side*6.5,.45,4],[side*6.15,.45,8.5],[side*5.25,.45,11],[side*3,.45,12.3]];
 rail(outer);rail(outer.map(([x,y,z])=>[x,y+.28,z]),brass,.035);
 rail([[side*5.25,.4,4.5],[side*5.35,.4,7.3],[side*4.9,.4,9.2],[side*3.05,.4,10.65]]);
 rail([[side*5.9,.4,6],[side*5.9,.4,8.7],[side*5,.4,10.1],[side*3.45,.4,11.2]]);
 for(const [x,z] of [[5.25,4.5],[5.35,7.3],[4.9,9.2],[3.05,10.65],[5.9,6]]){cyl(.15,.2,.5,chrome,side*x,.2,z);ring(.17,.055,rubber,side*x,.3,z);cyl(.09,.09,.06,brass,side*x,.49,z);}
 const sh=new THREE.Shape();sh.moveTo(side*2.7,9.8);sh.lineTo(side*4.5,6.6);sh.lineTo(side*4.65,9.6);sh.closePath();
 const geo=new THREE.ExtrudeGeometry(sh,{depth:.24,bevelEnabled:true,bevelSize:.08,bevelThickness:.07,bevelSegments:3});geo.rotateX(Math.PI/2);
 mesh(geo,darkSteel,0,.45,0);
 rail([[side*2.7,.5,9.8],[side*3.5,.5,8.1],[side*4.5,.5,6.6]],rubber,.10);
 rail([[side*2.8,.62,9.6],[side*3.55,.62,8.25],[side*4.35,.62,6.95]],brass,.045);
 deckSign('RETURN',side*5.5,8.5,1.1,.28);
}
for(const side of [-1,1]){collisionSegments.push({a:[side*4.5,6.6],b:[side*4.65,9.6],r:.08},{a:[side*4.65,9.6],b:[side*2.7,9.8],r:.08});}
const flippers=[];
for(const side of [-1,1]){
 const pivot=new THREE.Group();pivot.position.set(side*3.05,.3,10.8);scene.add(pivot);pivot.rotation.y=side*.34;
 const sh=new THREE.Shape();sh.moveTo(0,-.34);sh.bezierCurveTo(1,-.29,2.25,-.2,2.3,0);sh.bezierCurveTo(2.25,.2,1,.29,0,.34);sh.absarc(0,0,.34,Math.PI/2,Math.PI*1.5);sh.closePath();
 const geometry=new THREE.ExtrudeGeometry(sh,{depth:.22,bevelEnabled:true,bevelSize:.07,bevelThickness:.05,bevelSegments:3});geometry.rotateX(-Math.PI/2);geometry.scale(-side,1,1);
 mesh(geometry,rubber,0,0,0,pivot);const top=mesh(geometry,ivory,0,.1,0,pivot);top.scale.set(.93,.8,.8);
 cyl(.23,.23,.08,brass,0,.36,0,pivot);cyl(.075,.075,.03,chrome,0,.41,0,pivot);flippers.push({pivot,side,active:false});
}
// Shooter lane and spring-loaded plunger, separated from the return lane.
box(.16,.6,18.5,darkSteel,6.9,.18,3.6);rail([[7.1,.45,12.2],[7.1,.45,3],[6.95,.45,-3],[6.2,.45,-5.7],[3.8,.45,-5.8]]);
rod([7.13,.21,12.3],[7.13,.21,14.8],.075,chrome);cyl(.2,.2,.08,brass,7.13,.2,12.3);
const springPoints=Array.from({length:201},(_,i)=>new THREE.Vector3(7.13+Math.cos(i/200*Math.PI*28)*.17,.23+Math.sin(i/200*Math.PI*28)*.17,12.7+i/200*1.5));
mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(springPoints),240,.025,8,false),chrome);
const knob=mesh(new THREE.SphereGeometry(.27,24,16),brass,7.13,.21,14.9);knob.scale.z=.7;
deckSign('LAUNCH',6.1,12.7,1.2,.35);
// Illuminated mission inserts down the center of the playfield.
const inserts=[];
for(let i=0;i<4;i++){
 const z=4.3+i*1.35,material=new THREE.MeshStandardMaterial({color:i===0?'#ffd68b':'#438b85',emissive:i===0?'#ff9e20':'#14776d',emissiveIntensity:.7,metalness:.15,roughness:.24});
 ring(.3,.045,brass,0,.015,z);cyl(.26,.26,.035,material,0,.018,z);inserts.push(material);deckSign(['EXCAVATE','CRUSH','LOAD','SHIP'][i],1.55,z,1.65,.33);
}
deckSign('QUARRY OPERATIONS',0,2.6,3,.5);
for(let i=0;i<3;i++){
 const x=-3.5+i*.6;box(.4,.55,.18,ivory,x,.22,4.9);box(.31,.12,.03,brass,x,.38,5.01);
}
// Crusher toy: feed hopper, toothed rollers, steel frame and discharge belt.
const crusher=new THREE.Group();crusher.position.set(.3,2.9,-5.05);scene.add(crusher);
for(const x of [-.95,.95])for(const z of [-.55,.55])box(.12,1.4,.12,darkSteel,x,.5,z,crusher);
box(2.25,.2,1.5,brass,0,.08,0,crusher);
const hopper=new THREE.Mesh(new THREE.CylinderGeometry(1.25,.58,.85,4,1,true),darkSteel);hopper.rotation.y=Math.PI/4;hopper.position.y=1.4;hopper.castShadow=true;crusher.add(hopper);
ring(.7,.07,brass,0,1.04,0,crusher);
const rollers=[];
for(const x of [-.36,.36]){
 const roll=new THREE.Group();roll.position.set(x,.55,0);crusher.add(roll);const core=cyl(.28,.28,1.3,chrome,0,0,0,roll);core.rotation.x=Math.PI/2;
 for(let i=0;i<8;i++){const a=i*Math.PI/4;box(.12,.12,1.25,brass,Math.cos(a)*.3,Math.sin(a)*.3,0,roll);}rollers.push(roll);
}
box(1.15,.12,2.2,rubber,0,-.1,1.15,crusher);for(let i=0;i<12;i++)box(1.08,.045,.07,darkSteel,0,-.02,.2+i*.17,crusher);
for(let i=0;i<8;i++)mesh(new THREE.DodecahedronGeometry(.12+rand()*.08),stoneMaterials[i%6],(rand()-.5)*.8,.15,.4+rand()*1.4,crusher);
const crusherSign=mesh(new THREE.PlaneGeometry(2,.4),new THREE.MeshStandardMaterial({map:label('THE CRUSHER')}),0,1.98,.3,crusher);
// Tunnel mouth and a teal settling pool provide different destinations.
const tunnel=new THREE.Group();tunnel.position.set(-5.15,.05,-3.1);scene.add(tunnel);
box(1.65,1.7,.18,rubber,0,.6,0,tunnel);
for(let i=0;i<=8;i++){const a=i/8*Math.PI;const rock=mesh(new THREE.DodecahedronGeometry(.35),stoneMaterials[i%6],Math.cos(a)*.95,.7+Math.sin(a)*.95,.1,tunnel);rock.scale.z=.75;}
deckSign('DEEP CUT',-4.6,-1.7,1.3,.32);
const pool=mesh(new THREE.CircleGeometry(.9,64),new THREE.MeshPhysicalMaterial({color:'#137f7a',metalness:.35,roughness:.12,clearcoat:1}),5.7,.015,-2.7);pool.rotation.x=-Math.PI/2;pool.scale.y=1.5;
for(let i=0;i<16;i++){const a=i/16*Math.PI*2;mesh(new THREE.DodecahedronGeometry(.18),stoneMaterials[i%6],5.7+Math.cos(a),.02,-2.7+Math.sin(a)*1.45);}
// Cabinet apron and a physical backboard with an amber score display.
box(14.5,.12,1.7,darkSteel,0,.02,13.45);
box(13.8,2.5,.45,wood,0,4.7,-6.55);box(13.3,2.1,.1,brass,0,4.7,-6.28);
const screenCanvas=document.createElement('canvas');screenCanvas.width=1536;screenCanvas.height=240;const screenContext=screenCanvas.getContext('2d');const screenTexture=new THREE.CanvasTexture(screenCanvas);screenTexture.colorSpace=THREE.SRGBColorSpace;
const display=mesh(new THREE.PlaneGeometry(12.9,1.85),new THREE.MeshBasicMaterial({map:screenTexture}),0,4.75,-6.2);
function drawDisplay(){const ctx=screenContext;ctx.fillStyle='#071716';ctx.fillRect(0,0,1536,240);ctx.textAlign='center';ctx.fillStyle='#d8c18b';ctx.font='26px Georgia';ctx.fillText('L I M E S T O N E   /   T H E   Q U A R R Y',768,46);ctx.fillStyle='#ffc15d';ctx.font='bold 90px monospace';ctx.fillText(game.score.toLocaleString('en-US',{minimumIntegerDigits:6}),768,146);ctx.font='20px monospace';ctx.fillStyle='#94bbb0';ctx.fillText(`BALL ${game.ballNumber} / 3    •    BEST ${best.toLocaleString('en-US')}    •    ${game.mode==='over'?'SHIFT COMPLETE':game.mode==='ready'?'SPACE TO LAUNCH':'QUARRY OPERATIONS'}`,768,202);screenTexture.needsUpdate=true;}
const game=new QuarryPhysics(collisionSegments);
let best=0;try{best=Number(localStorage.getItem('limestone-quarry-3d-best'))||0;}catch{}
drawDisplay();
const pressed=new Set();
let paused=false,time=0,last=0,accumulator=0;
const pauseButton=document.querySelector('#pause');
const launchButton=document.querySelector('#launch');
function launch(){if(paused)return;game.launch();drawDisplay();}
launchButton.onclick=launch;
function pause(){paused=!paused;pauseButton.textContent=paused?'Resume':'Pause';accumulator=0;}
pauseButton.onclick=pause;
addEventListener('keydown',e=>{
 if(['ArrowLeft','ArrowRight','KeyA','KeyD','Space','KeyP'].includes(e.code)){e.preventDefault();pressed.add(e.code);if(!e.repeat&&e.code==='Space')launch();if(!e.repeat&&e.code==='KeyP')pause();}
});
addEventListener('keyup',e=>pressed.delete(e.code));
addEventListener('blur',()=>{pressed.clear();if(game.mode==='live'||game.mode==='ramp'||game.mode==='launch'){paused=true;pauseButton.textContent='Resume';}});
document.addEventListener('visibilitychange',()=>{last=0;accumulator=0;pressed.clear();if(document.hidden&&game.mode!=='ready'){paused=true;pauseButton.textContent='Resume';}});
const ball=mesh(new THREE.SphereGeometry(.19,40,28),new THREE.MeshStandardMaterial({color:'#ffffff',metalness:1,roughness:.08}));
// A constrained shooter feed is separate from free play, like a physical covered lane.
const launchPath=new THREE.CatmullRomCurve3([[7.13,.22,12],[7.13,.22,4],[7.05,.25,-2.6],[6.2,3.7,-4.4],[4.8,3.7,-4],[3.7,.22,-2.7]].map(p=>new THREE.Vector3(...p)));
for(const offset of [-.25,.25]){const path=new THREE.CatmullRomCurve3(launchPath.getPoints(100).map(p=>p.add(new THREE.Vector3(offset,.05,0))));mesh(new THREE.TubeGeometry(path,140,.04,8,false),chrome);}
function playerView(){camera.position.set(0,25,29);controls.target.set(0,.7,3.7);controls.update();}
document.querySelector('#view').onclick=playerView;
document.querySelector('#close').onclick=()=>{camera.position.set(7,7,10);controls.target.set(0,.8,-.1);controls.update();};
function resize(){const h=Math.max(240,innerHeight-document.querySelector('.panel').offsetHeight-38);camera.aspect=innerWidth/h;camera.updateProjectionMatrix();renderer.setSize(innerWidth,h);}
addEventListener('resize',resize);resize();playerView();
let lastScore=-1,lastMode='',lastNumber=0;
function frame(now){requestAnimationFrame(frame);const dt=last?Math.min((now-last)/1000,.05):0;last=now;
 if(!paused&&!document.hidden){time+=dt;accumulator+=dt;
 while(accumulator>=1/240){game.step(1/240,pressed.has('KeyA')||pressed.has('ArrowLeft'),pressed.has('KeyD')||pressed.has('ArrowRight'));accumulator-=1/240;}
 }
 for(const event of game.events.splice(0)){if(event.kind==='bumper')bumperGroups[event.index].pulse=1;}
 if(game.score>best){best=game.score;try{localStorage.setItem('limestone-quarry-3d-best',String(best));}catch{}}
 if(game.score!==lastScore||game.mode!==lastMode||game.ballNumber!==lastNumber){drawDisplay();lastScore=game.score;lastMode=game.mode;lastNumber=game.ballNumber;}
 status.textContent=paused?'Paused · P to resume':game.mode==='ready'?`Ball ${game.ballNumber} · Space to launch`:game.mode==='over'?`Shift complete · ${game.score.toLocaleString()} points`:game.mode==='ramp'?'Wire ramp · delivery run':`Ball ${game.ballNumber} · ${game.score.toLocaleString()} points`;
 launchButton.textContent=game.mode==='over'?'New game':'Launch · Space';launchButton.disabled=!['ready','over'].includes(game.mode)||paused;
 if(game.mode==='launch')ball.position.copy(launchPath.getPointAt(Math.min(1,game.route)));
 else if(game.mode==='ramp')ball.position.copy(point(Math.min(1,game.route),0,.15));
 else ball.position.set(game.x,.22,game.z);
 ball.visible=game.mode!=='over';ball.rotation.x+=paused?0:game.vz*dt/.19;ball.rotation.z-=paused?0:game.vx*dt/.19;
 for(const b of bumperGroups){if(!paused)b.pulse=Math.max(0,b.pulse-dt*4);b.cap.position.y=.86-b.pulse*.12;b.light.intensity=6+b.pulse*13;b.amber.emissiveIntensity=.24+b.pulse*.8;}
 for(let i=0;i<flippers.length;i++)flippers[i].pivot.rotation.y=game.flippers[i].angle;
 if(!paused){rollers.forEach((r,i)=>r.rotation.z=time*(i?1:-1));inserts.forEach((m,i)=>m.emissiveIntensity=.35+Math.max(0,Math.sin(time*2-i*.9))*.9);}
 controls.update();renderer.render(scene,camera);
}
requestAnimationFrame(frame);
