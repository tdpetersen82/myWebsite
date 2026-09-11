import {CatmullRomCurve3,Vector3} from './vendor/three.module.min.js';
export const GROUND_RAILS=[];
for(const side of [-1,1]){
 const add=(points,r=.065,kick=0)=>GROUND_RAILS.push({points:points.map(([x,y,z])=>[side*x,y,z]),r,kick,key:'sling'+side});
 add([[6.4,.45,-3],[6.5,.45,4],[6.15,.45,8.5],[5.25,.45,11],[3,.45,12.3]]);
 add([[5.25,.4,4.5],[5.5,.4,7.3],[5.5,.4,9.8],[4.6,.4,10],[2.1,.4,10.35]]);

 add([[2.9,.5,9.2],[3.5,.5,8.1],[4.5,.5,6.6]],.1,4);
}
export function railCurve(points){return new CatmullRomCurve3(points.map(p=>new Vector3(...p)),false,'catmullrom',0);}
export function makeCollisions(){const segments=[];for(const rail of GROUND_RAILS){if(rail.kick)continue;const points=railCurve(rail.points).getPoints(80);for(let i=1;i<points.length;i++)segments.push({a:[points[i-1].x,points[i-1].z],b:[points[i].x,points[i].z],r:rail.r,kick:rail.kick,key:rail.key});}
 return segments;}
export const SLINGS=GROUND_RAILS.filter(r=>r.kick).map(r=>({key:r.key,points:[...railCurve(r.points).getPoints(80).map(p=>[p.x,p.z]),[Math.sign(r.points[0][0])*4.65,9.3]]}));
