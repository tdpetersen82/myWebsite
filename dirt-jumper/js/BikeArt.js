// Generated bitmap art on the existing articulated rider / hardtail physics rig.
// Atlas rectangles and joint anchors are defined in assets/rider-atlas.json.
class BikeArt {
    constructor(scene) {
        this.scene = scene;
        this.parts = scene.cache.json.get('rider-atlas');
        const texture = scene.textures.get('rider-render');
        for (const [name, part] of Object.entries(this.parts)) {
            if (!texture.has(name)) texture.add(name, 0, ...part.rect);
        }
        this.sprites = {};
        this.pose = {};
        this.flightOffset = null;
        const order = [
            ['farThigh', 'thigh'], ['farShin', 'shin'], ['farShoe', 'shoe'],
            ['farUpperArm', 'upperArm'], ['farForearm', 'forearm'],
            ['rearWheel', 'wheel'], ['frontWheel', 'wheel'], ['frame', 'frame'],
            ['forkUpper', 'forkUpper'], ['forkLower', 'forkLower'], ['bars', 'bars'],
            ['thigh', 'thigh'], ['shin', 'shin'], ['shoe', 'shoe'], ['torso', 'torso'],
            ['head', 'head'], ['upperArm', 'upperArm'], ['forearm', 'forearm']
        ];
        for (const [id, part] of order) {
            const sprite = scene.add.image(0, 0, 'rider-render', part).setDepth(4);
            if (id.startsWith('far')) sprite.setTint(0xa2afb2);
            this.sprites[id] = sprite;
        }
    }

    // Map two authored texture joints to two world-space joints. Width has its
    // own anatomical scale, so sleeves don't inflate as an elbow bends.
    bone(id, partName, a, b, width) {
        this.pose[id] = {partName,a:{...a},b:{...b},width};
        const p = this.parts[partName], sprite = this.sprites[id];
        const [ax, ay, bx, by] = p.joints;
        const distance = Math.hypot(b.x-a.x, b.y-a.y);
        const sx = width / p.rect[2];
        // Account for the scaled horizontal joint offset when solving length.
        const sy = Math.sqrt(Math.max(0.0001,distance*distance-Math.pow((bx-ax)*sx,2))) / Math.abs(by-ay);
        const authoredAngle = Math.atan2((by-ay)*sy, (bx-ax)*sx);
        sprite.setOrigin(ax/p.rect[2], ay/p.rect[3]).setPosition(a.x,a.y)
            .setScale(sx,sy).setRotation(Math.atan2(b.y-a.y,b.x-a.x)-authoredAngle);
    }

    anchored(id, partName, anchor, width, rotation) {
        this.pose[id] = {partName,anchor:{...anchor},width,rotation};
        const p = this.parts[partName];
        this.sprites[id].setOrigin(...p.origin).setPosition(anchor.x,anchor.y)
            .setScale(width/p.rect[2],width/(partName==='wheel'?p.rect[3]:p.rect[2])).setRotation(rotation);
    }

    texturePoint(id, x, y) {
        const p=this.pose[id];
        const part=this.parts[p.partName];
        let ox,oy,sx,sy,angle,position;
        if(p.a) {
            const [ax,ay,bx,by]=part.joints;
            const d=Math.hypot(p.b.x-p.a.x,p.b.y-p.a.y);
            sx=p.width/part.rect[2];
            sy=Math.sqrt(Math.max(0.0001,d*d-Math.pow((bx-ax)*sx,2)))/Math.abs(by-ay);
            angle=Math.atan2(p.b.y-p.a.y,p.b.x-p.a.x)-Math.atan2((by-ay)*sy,(bx-ax)*sx);
            ox=ax;oy=ay;position=p.a;
        } else {
            [ox,oy]=part.origin.map((v,i)=>v*part.rect[i+2]);
            sx=p.width/part.rect[2]*(p.scaleXFactor ?? 1);sy=p.width/(p.partName==='wheel'?part.rect[3]:part.rect[2]);angle=p.rotation;position=p.anchor;
        }
        const dx=(x-ox)*sx,dy=(y-oy)*sy;
        return {x:position.x+dx*Math.cos(angle)-dy*Math.sin(angle),y:position.y+dx*Math.sin(angle)+dy*Math.cos(angle)};
    }

    update(bike) {
        const angle = bike.angle*Math.PI/180;
        const pitch = bike.forkCompression/64;
        const c = Math.cos(angle), s = Math.sin(angle);
        const pc = Math.cos(pitch), ps = Math.sin(pitch);
        const chassis = ([x,y], frame = true) => {
            if (frame) {
                const px=x+32,py=y+16;
                x=-32+px*pc-py*ps; y=-16+px*ps+py*pc;
            }
            y -= 4; // 40px tires: keep the contact patch at the physics origin.
            return {x,y};
        };
        let center = {x:0,y:0};
        const airborne = bike.airborne || bike.crashed;
        if (!airborne) this.flightOffset = null;
        const world = (point, frame=true) => {
            const p=chassis(point,frame);
            if (!airborne) return {x:bike.x+p.x*c-p.y*s,y:bike.y+p.x*s+p.y*c};
            const dx=p.x-center.x,dy=p.y-center.y;
            return {x:bike.x+this.flightOffset.x+dx*c-dy*s,y:bike.y+this.flightOffset.y+dx*s+dy*c};
        };
        const joint = (a,b,length,bend=1) => {
            const dx=b[0]-a[0],dy=b[1]-a[1],d=Math.max(0.001,Math.hypot(dx,dy));
            const h=Math.sqrt(Math.max(0,length*length-d*d/4));
            return [(a[0]+b[0])/2-dy/d*h*bend,(a[1]+b[1])/2+dx/d*h*bend];
        };
        const frame=this.parts.frame;
        const frameScale=frame.displayWidth/frame.rect[2];
        const frameLocal=([x,y])=>[-32+(x-frame.origin[0]*frame.rect[2])*frameScale,-16+(y-frame.origin[1]*frame.rect[3])*frameScale];
        const stem=frameLocal(frame.stem),crownLocal=frameLocal(frame.crown);
        const bars=this.parts.bars,barsWidth=12,barsScale=barsWidth/bars.rect[2];
        let grip=[stem[0]+(bars.grip[0]-bars.origin[0]*bars.rect[2])*barsScale,
            stem[1]+(bars.grip[1]-bars.origin[1]*bars.rect[3])*barsScale];
        const trick = (bike.activeTricks || []).find(t => t.name !== 'backflip');
        const pulse = trick ? Math.sin(Math.PI*trick.progress) : 0;
        const tail = trick && trick.name === 'tailwhip';
        const swing = tail ? Math.PI*2*trick.progress : (bike.whipYaw || 0);
        const bank = tail ? 0 : Math.sin(swing)*0.28;
        const swingPoint = ([x,y]) => {
            const dx=x-stem[0],dy=y-stem[1];
            const px=dx*Math.cos(swing);
            return [stem[0]+px*Math.cos(bank)-dy*Math.sin(bank),stem[1]+px*Math.sin(bank)+dy*Math.cos(bank)];
        };
        if (!tail) {
            const dx=grip[0]-stem[0],dy=grip[1]-stem[1];
            grip=[stem[0]+dx*Math.cos(bank)-dy*Math.sin(bank),stem[1]+dx*Math.sin(bank)+dy*Math.cos(bank)];
        }
        const bikeWorld = (point,frame=true) => world(tail ? point : swingPoint(point),frame);
        const pedal=tail ? frameLocal(frame.pedal) : swingPoint(frameLocal(frame.pedal));
        const oppositePedal = frameLocal([2*frame.crank[0]-frame.pedal[0],2*frame.crank[1]-frame.pedal[1]]);
        const farPedal = tail ? oppositePedal : swingPoint(oppositePedal);
        const shoe=this.parts.shoe,shoeWidth=14;
        const ankleHeight=(shoe.rect[3]*(1-shoe.origin[1]))*shoeWidth/shoe.rect[2];
        // Put the ball of each foot over opposite ends of the crank.
        const foot=[pedal[0]-5,pedal[1]-ankleHeight],farFoot=[farPedal[0]-5,farPedal[1]-ankleHeight];
        if (tail) { foot[0]-=12*pulse; foot[1]-=20*pulse; farFoot[0]+=15*pulse; farFoot[1]-=24*pulse; }
        const q = Math.max(-0.3,Math.min(1.15,bike.compress));
        const hip = [-12-q*5+bike.bodyShift*2,-53+q*9];
        // Hinge a rigid torso at the hip; do not stretch the shirt as we pump.
        // Keep both pedals reachable before solving fixed-length leg bones.
        for (const ankle of [foot,farFoot]) {
            const dx=hip[0]-ankle[0],dy=hip[1]-ankle[1],d=Math.hypot(dx,dy);
            if(d>45) { hip[0]=ankle[0]+dx*45/d; hip[1]=ankle[1]+dy*45/d; }
        }
        const torsoAngle = -Math.PI/4 + q*0.17;
        const shoulder = [hip[0]+27*Math.cos(torsoAngle),hip[1]+27*Math.sin(torsoAngle)];
        const farHip=[hip[0]-3,hip[1]];
        const knee=joint(hip,foot,23,-1),farKnee=joint(farHip,farFoot,23,-1);
        const elbow=joint(shoulder,grip,20),farShoulder=[shoulder[0]-3,shoulder[1]+2];
        const farElbow=joint(farShoulder,grip,20);
        // Approximate mass distribution (80 kg rider, 12 kg bike). Recompute
        // the pose's center as the rider tucks, but keep its flight path fixed.
        // This counter-translates the bike under the rider instead of moving
        // the rotation pivot when arms and legs bend.
        const mid=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2];
        const masses=[
            [35,mid(hip,shoulder)], [10,hip], [5,[shoulder[0]+4,shoulder[1]-8]],
            [5,mid(hip,knee)],[5,mid(knee,foot)],[5,mid(farHip,farKnee)],[5,mid(farKnee,farFoot)],
            [2.5,mid(shoulder,elbow)],[2.5,mid(elbow,grip)],
            [2.5,mid(farShoulder,farElbow)],[2.5,mid(farElbow,grip)],
            [8,swingPoint([0,-24])],[2,swingPoint([-32,-16])],[2,tail?[32,-16]:swingPoint([32,-16]),false]
        ];
        for(const [mass,point,frame=true] of masses) {
            const p=chassis(point,frame);center.x+=mass*p.x/92;center.y+=mass*p.y/92;
        }
        this.massCenter = {...center};
        if(airborne && !this.flightOffset) this.flightOffset={x:center.x*c-center.y*s,y:center.x*s+center.y*c};
        const bone=(id,name,a,b,width)=>this.bone(id,name,world(a),world(b),width);
        bone('farThigh','thigh',farHip,farKnee,9);
        bone('farShin','shin',farKnee,farFoot,6.5);
        this.anchored('farShoe','shoe',world(farFoot),14,angle+pitch);
        bone('farUpperArm','upperArm',farShoulder,farElbow,6.5);
        bone('farForearm','forearm',farElbow,grip,5.5);
        for (const [id,x] of [['rearWheel',-32],['frontWheel',32]]) {
            this.anchored(id,'wheel',world(x === -32 || !tail ? swingPoint([x,-16]) : [x,-16],id==='rearWheel'),40,angle+bank+(Math.abs(swing)>0.01 ? 0 : bike.distance/20));
        }
        // Frame anchor mapping is authored separately from the rider's bones.
        const rear=world(swingPoint([-32,-16]));
        this.anchored('frame','frame',rear,frame.displayWidth,angle+pitch+bank);
        // Side-view projection of yaw around the steering axis. The frame
        // swings horizontally beneath the rider, never over their head.
        this.sprites.frame.setScale(frameScale*Math.cos(swing),frameScale);
        this.pose.frame.scaleXFactor=Math.cos(swing);
        if (tail || Math.abs(swing)>0.001) this.sprites.rearWheel.setScale(40/this.parts.wheel.rect[2]*Math.max(0.18,Math.abs(Math.cos(swing))),40/this.parts.wheel.rect[3]);
        if (!tail && Math.abs(swing)>0.001) this.sprites.frontWheel.setScale(40/this.parts.wheel.rect[2]*Math.cos(swing),40/this.parts.wheel.rect[3]);
        const crown=bikeWorld(crownLocal);
        const axle=bikeWorld([32,-16],false);
        const d=Math.hypot(crown.x-axle.x,crown.y-axle.y);
        const seal={x:axle.x+(crown.x-axle.x)*14/d,y:axle.y+(crown.y-axle.y)*14/d};
        // The rigid upper keeps its length; the lower draws over the stanchion.
        const upperTip={x:crown.x+(axle.x-crown.x)*12/d,y:crown.y+(axle.y-crown.y)*12/d};
        this.bone('forkUpper','forkUpper',crown,upperTip,5);
        this.bone('forkLower','forkLower',seal,axle,5.8);
        this.anchored('bars','bars',world(stem),barsWidth,angle+pitch+bank);
        bone('thigh','thigh',hip,knee,10);
        bone('shin','shin',knee,foot,7);
        this.anchored('shoe','shoe',world(foot),shoeWidth,angle+pitch);
        bone('torso','torso',shoulder,hip,16);
        this.anchored('head','head',this.texturePoint('torso',...this.parts.torso.neck),16,angle+pitch);
        bone('upperArm','upperArm',shoulder,elbow,7);
        bone('forearm','forearm',elbow,grip,7);
    }
}
