// Real Matter rigid bodies take over on a bail; the tuned riding controller
// stays independent. Sprites are shared with BikeArt, not replaced by debug shapes.
class CrashRig {
    constructor(art, bike, terrain, matter = Phaser.Physics.Matter.Matter) {
        this.art = art;
        this.M = matter;
        this.engine = matter.Engine.create({enableSleeping:true});
        this.engine.gravity.y = 1.5;
        this.elapsed = 0;
        this.accumulator = 0;
        this.links = {};
        this.pose = JSON.parse(JSON.stringify(art.pose));
        this.dynamic = [];
        const M = matter;
        const opts = {friction:0.65, frictionAir:0.009, restitution:0.18, collisionFilter:{group:-1,category:1,mask:0xffffffff}};
        const add = body => { M.Composite.add(this.engine.world,body); this.dynamic.push(body); return body; };
        const joint = (a,b,at,stiffness=0.9) => M.Composite.add(this.engine.world,M.Constraint.create({
            bodyA:a,bodyB:b,pointA:{x:at.x-a.position.x,y:at.y-a.position.y},
            pointB:{x:at.x-b.position.x,y:at.y-b.position.y},length:0,stiffness,damping:0.18
        }));
        // Thick, overlapping static terrain strips make fast wheel/limb impacts
        // solid and keep the ragdoll on the same track the bike was riding.
        for (let x=bike.x-600;x<bike.x+2600;x+=16) {
            const y0=terrain.heightAt(x),y1=terrain.heightAt(x+16);
            const vertices=[{x,y:y0},{x:x+16,y:y1},{x:x+16,y:y1+100},{x,y:y0+100}];
            const floor=M.Bodies.fromVertices(x+8,(y0+y1)/2+50,[vertices],{isStatic:true,friction:0.8,restitution:0.12});
            M.Composite.add(this.engine.world,floor);
        }
        for (const id of ['torso','upperArm','forearm','thigh','shin','farUpperArm','farForearm','farThigh','farShin']) {
            const p=this.pose[id],length=Math.hypot(p.b.x-p.a.x,p.b.y-p.a.y);
            const body=add(M.Bodies.rectangle((p.a.x+p.b.x)/2,(p.a.y+p.b.y)/2,
                Math.max(4,p.width*0.7),length,{...opts,angle:Math.atan2(p.b.y-p.a.y,p.b.x-p.a.x)-Math.PI/2,chamfer:{radius:2}}));
            this.links[id]={body,length,p};
        }
        const torso=this.links.torso;
        joint(torso.body,this.links.upperArm.body,this.pose.upperArm.a);
        joint(torso.body,this.links.farUpperArm.body,this.pose.farUpperArm.a);
        joint(torso.body,this.links.thigh.body,this.pose.thigh.a);
        joint(torso.body,this.links.farThigh.body,this.pose.farThigh.a);
        for (const [upper,lower] of [['upperArm','forearm'],['farUpperArm','farForearm'],['thigh','shin'],['farThigh','farShin']]) {
            joint(this.links[upper].body,this.links[lower].body,this.pose[upper].b);
        }
        const headPose=this.pose.head;
        const headOffset={x:Math.sin(headPose.rotation)*7,y:-Math.cos(headPose.rotation)*7};
        this.head=add(M.Bodies.circle(headPose.anchor.x+headOffset.x,headPose.anchor.y+headOffset.y,6.5,{...opts,angle:headPose.rotation}));
        joint(torso.body,this.head,headPose.anchor);
        const rear=this.pose.rearWheel.anchor,front=this.pose.frontWheel.anchor;
        const angle=bike.angle*Math.PI/180;
        this.frame=add(M.Bodies.rectangle((rear.x+front.x)/2+Math.sin(angle)*10,
            (rear.y+front.y)/2-Math.cos(angle)*10,52,13,{...opts,angle}));
        this.rearWheel=add(M.Bodies.circle(rear.x,rear.y,15,{...opts,friction:0.9}));
        this.frontWheel=add(M.Bodies.circle(front.x,front.y,15,{...opts,friction:0.9}));
        joint(this.frame,this.rearWheel,rear,0.98);
        joint(this.frame,this.frontWheel,front,0.98);
        // The riding model grades a landing at its contact origin. With a bad
        // angle one wheel can already be below that origin: lift the intact rig
        // clear before handing it to the solver instead of spawning inside dirt.
        let lift=0;
        for(const body of this.dynamic) {
            for(const vertex of body.vertices) lift=Math.max(lift,vertex.y-terrain.heightAt(vertex.x)+1);
        }
        if(lift>0) for(const body of this.dynamic) M.Body.translate(body,{x:0,y:-lift});
        const vx=Math.max(2,Math.min(13,Math.abs(bike.vx)/60));
        const vy=Math.max(-3,Math.min(4,bike.vy/60));
        for (const body of this.dynamic) {
            const bicycle=body===this.frame||body===this.rearWheel||body===this.frontWheel;
            M.Body.setVelocity(body,{x:vx+(bicycle?0:2),y:bicycle?vy:-3.5});
            M.Body.setAngularVelocity(body,bicycle?0.13:0.09);
        }
    }

    local(body,x,y) {
        const c=Math.cos(body.angle),s=Math.sin(body.angle);
        return {x:body.position.x+x*c-y*s,y:body.position.y+x*s+y*c};
    }

    update(deltaMs) {
        this.accumulator += this.elapsed < 6000 ? Math.min(deltaMs,50) : 0;
        const step=1000/120;
        while(this.accumulator>=step) {
            this.M.Engine.update(this.engine,step);
            this.accumulator-=step;
            this.elapsed+=step;
        }
        for(const [id,{body,length,p}] of Object.entries(this.links)) {
            this.art.bone(id,p.partName,this.local(body,0,-length/2),this.local(body,0,length/2),p.width);
        }
        this.art.anchored('head','head',this.local(this.head,0,7),17,this.head.angle);
        for (const [id,parent] of [['shoe','shin'],['farShoe','farShin']]) {
            const link=this.links[parent];
            this.art.anchored(id,'shoe',this.local(link.body,0,link.length/2),this.pose[id].width,link.body.angle);
        }
        this.art.anchored('rearWheel','wheel',this.rearWheel.position,32,this.rearWheel.angle);
        this.art.anchored('frontWheel','wheel',this.frontWheel.position,32,this.frontWheel.angle);
        this.art.anchored('frame','frame',this.local(this.frame,-32,10),this.art.parts.frame.displayWidth,this.frame.angle);
        const crown=this.local(this.frame,19,-12),axle=this.frontWheel.position;
        const d=Math.max(1,Math.hypot(crown.x-axle.x,crown.y-axle.y));
        const seal={x:axle.x+(crown.x-axle.x)*14/d,y:axle.y+(crown.y-axle.y)*14/d};
        this.art.bone('forkUpper','forkUpper',crown,seal,5);
        this.art.bone('forkLower','forkLower',seal,axle,5.8);
        this.art.anchored('bars','bars',this.local(this.frame,17,-16),15,this.frame.angle);
    }

    focus() { return this.links.torso.body.position; }
    destroy() {
        this.M.Composite.clear(this.engine.world,false);
        this.M.Engine.clear(this.engine);
    }
}
