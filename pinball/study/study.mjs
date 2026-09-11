import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
import {RoundedBoxGeometry} from './vendor/RoundedBoxGeometry.js';
const canvas=document.querySelector('#scene'),status=document.querySelector('#status');
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});}catch(e){document.querySelector('#error').hidden=false;document.querySelector('#error').textContent='This study needs WebGL 2. Open this page in a browser with hardware acceleration enabled.';throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.9;
const scene=new THREE.Scene();scene.background=new THREE.Color('#0b131a');scene.fog=new THREE.FogExp2('#0b131a',.018);
const camera=new THREE.PerspectiveCamera(38,innerWidth/innerHeight,.1,100);camera.position.set(12,15,19);
const controls=new OrbitControls(camera,canvas);controls.target.set(0,.6,-.2);controls.enableDamping=true;controls.minDistance=8;controls.maxDistance=34;controls.maxPolarAngle=Math.PI*.46;controls.minPolarAngle=.18;controls.update();
// Softbox environment gives the metal true reflected highlights, not painted streaks.
const env=new THREE.Scene();env.background=new THREE.Color('#39434b');
for(const [x,y,z,sx,sy,sz,color,intensity] of [[-7,7,0,2,9,14,'#ffe9b8',4],[8,5,0,2,10,15,'#d4eaff',3],[0,10,-7,16,1,4,'#fff3d8',5]]){
 const box=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),new THREE.MeshBasicMaterial({color:new THREE.Color(color).multiplyScalar(intensity)}));box.position.set(x,y,z);env.add(box);
}
const pmrem=new THREE.PMREMGenerator(renderer);const environment=pmrem.fromScene(env,.04);scene.environment=environment.texture;scene.environmentIntensity=.65;pmrem.dispose();
const hemi=new THREE.HemisphereLight('#cde8ff','#3e2716',.4);scene.add(hemi);
const sun=new THREE.DirectionalLight('#ffe6b0',3.5);sun.position.set(-7,12,5);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-12;sun.shadow.camera.right=12;sun.shadow.camera.top=12;sun.shadow.camera.bottom=-12;sun.shadow.normalBias=.035;sun.shadow.bias=-.0001;scene.add(sun);
const rim=new THREE.DirectionalLight('#9ed8f2',1.4);rim.position.set(8,6,-6);scene.add(rim);
const mat=(color,metalness=0,roughness=.5)=>new THREE.MeshStandardMaterial({color,metalness,roughness});
const brass=mat('#b99b52',.88,.23),chrome=mat('#d8e4e8',1,.14),darkSteel=mat('#233c45',.8,.35),rubber=mat('#101b20',.05,.7),ivory=mat('#ede2bf',.1,.3),wood=mat('#30261b',.05,.45);
function mesh(geo,material,x=0,y=0,z=0,parent=scene){const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function box(w,h,d,material,x,y,z,parent=scene){return mesh(new RoundedBoxGeometry(w,h,d,2,.045),material,x,y,z,parent);}
function cyl(rt,rb,h,material,x,y,z,parent=scene){return mesh(new THREE.CylinderGeometry(rt,rb,h,64),material,x,y,z,parent);}
function ring(r,t,material,x,y,z,parent=scene){const m=mesh(new THREE.TorusGeometry(r,t,12,96),material,x,y,z,parent);m.rotation.x=Math.PI/2;return m;}
function rod(a,b,r,material,parent=scene){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),m=mesh(new THREE.CylinderGeometry(r,r,av.distanceTo(bv),10),material,0,0,0,parent);m.position.copy(av).add(bv).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),bv.sub(av).normalize());return m;}
function label(text,w=512,h=128,color='#eedcb0',background='#162d35'){
 const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.fillStyle=background;x.fillRect(0,0,w,h);x.strokeStyle='#b99b52';x.lineWidth=5;x.strokeRect(5,5,w-10,h-10);x.fillStyle=color;x.textAlign='center';x.textBaseline='middle';x.font=`600 ${Math.floor(h*.33)}px Georgia`;x.fillText(text,w/2,h/2);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
const floorMap=new THREE.TextureLoader().load('../assets/quarry-playfield-v2.jpg');floorMap.colorSpace=THREE.SRGBColorSpace;floorMap.anisotropy=renderer.capabilities.getMaxAnisotropy();
box(15,.7,13.2,wood,0,-.5,0);const bed=mesh(new THREE.PlaneGeometry(14.6,12.8),new THREE.MeshStandardMaterial({map:floorMap,roughness:.45,metalness:.12}),0,-.12,0);bed.rotation.x=-Math.PI/2;
for(const x of [-7.4,7.4]){box(.26,.7,13.2,wood,x,0,0);box(.08,.06,13.15,brass,x,.39,0);}
box(15,.7,.28,wood,0,0,-6.5);box(15,.7,.28,wood,0,0,6.5);box(14.8,.07,.07,brass,0,.38,6.35);
const plaque=mesh(new THREE.PlaneGeometry(6,1),new THREE.MeshStandardMaterial({map:label('LIMESTONE  /  THE QUARRY'),roughness:.38,metalness:.2}),0,.01,5.7);plaque.rotation.x=-Math.PI/2;
// Layered limestone blocks with deterministic mineral speckle and strata texture.
let seed=173;function rand(){seed=(seed*16807)%2147483647;return(seed-1)/2147483646;}
const stoneCanvas=document.createElement('canvas');stoneCanvas.width=stoneCanvas.height=512;const sc=stoneCanvas.getContext('2d');sc.fillStyle='#bdaf92';sc.fillRect(0,0,512,512);
for(let i=0;i<25000;i++){const v=Math.floor(120+rand()*120);sc.fillStyle=`rgba(${v},${v-9},${v-27},${.1+rand()*.3})`;sc.fillRect(rand()*512,rand()*512,1+rand()*5,1+rand()*3);}
for(let y=12;y<512;y+=24+rand()*35){sc.strokeStyle='#655d443a';sc.lineWidth=1+rand()*3;sc.beginPath();sc.moveTo(0,y);for(let x=0;x<=512;x+=30)sc.lineTo(x,y+rand()*8);sc.stroke();}
const stoneMap=new THREE.CanvasTexture(stoneCanvas);stoneMap.colorSpace=THREE.SRGBColorSpace;stoneMap.wrapS=stoneMap.wrapT=THREE.RepeatWrapping;stoneMap.anisotropy=8;
const rockPhoto=floorMap.clone();rockPhoto.repeat.set(.22,.32);rockPhoto.offset.set(.01,.38);rockPhoto.needsUpdate=true;
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
const ball=mesh(new THREE.SphereGeometry(.19,40,28),new THREE.MeshStandardMaterial({color:'#ffffff',metalness:1,roughness:.08}));
let paused=matchMedia('(prefers-reduced-motion: reduce)').matches,time=0,last=0,lastZone=-1,hiddenPause=false;
const pauseButton=document.querySelector('#pause');pauseButton.textContent=paused?'Play motion':'Pause motion';
function pulse(i){bumperGroups[i].pulse=1;}
document.querySelector('#strike').onclick=()=>{bumperGroups.forEach((_,i)=>pulse(i));status.textContent='Bumper compression & amber light';};
pauseButton.onclick=()=>{paused=!paused;pauseButton.textContent=paused?'Play motion':'Pause motion';};
document.querySelector('#view').onclick=()=>{camera.position.set(0,18,21);controls.target.set(0,.7,0);controls.update();};
document.querySelector('#close').onclick=()=>{camera.position.set(7,7,10);controls.target.set(0,.8,-.1);controls.update();};
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}
addEventListener('resize',resize);document.addEventListener('visibilitychange',()=>{hiddenPause=document.hidden;last=0;});
const freePath=new THREE.CatmullRomCurve3([new THREE.Vector3(-4.3,.2,3.7),new THREE.Vector3(-2.4,.2,1.43),new THREE.Vector3(-.4,.2,1.7),new THREE.Vector3(.1,.2,-.77),new THREE.Vector3(1.2,.2,1.8),new THREE.Vector3(2.3,.2,1.58),new THREE.Vector3(3.8,.2,3),new THREE.Vector3(4.5,.65,4.6)]);
function frame(now){requestAnimationFrame(frame);const dt=last?Math.min((now-last)/1000,.04):0;last=now;
 if(!paused&&!hiddenPause)time+=dt;
 const phase=time%14;
 if(phase<8){ball.position.copy(point(phase/8,0,.15));lastZone=-1;if(!paused)status.textContent='Steel ball · elevated wire ramp';}
 else{const t=(phase-8)/6;ball.position.copy(freePath.getPointAt(t));let zone=t<.3?0:t<.65?1:2;if(zone!==lastZone&&!paused){pulse(zone);lastZone=zone;}if(!paused)status.textContent='Steel ball · bumper return demonstration';}
 ball.rotation.x=time*3;
 for(const b of bumperGroups){if(!paused&&!hiddenPause)b.pulse=Math.max(0,b.pulse-dt*4);b.cap.position.y=.86-b.pulse*.12;b.light.intensity=6+b.pulse*13;b.amber.emissiveIntensity=.24+b.pulse*.8;}
 controls.update();renderer.render(scene,camera);
}
status.textContent=paused?'Motion paused · drag to inspect':'Ready · drag to inspect';requestAnimationFrame(frame);
