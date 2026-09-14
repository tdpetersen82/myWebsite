// Generated bitmap art on the existing articulated rider / hardtail physics rig.
// Atlas rectangles and joint anchors are defined in assets/rider-atlas.json.
class BikeArt {
    constructor(scene) {
        this.scene = scene;
        this.parts = scene.cache.json.get('rider-atlas');
        const texture = scene.textures.get('rider-art');
        for (const [name, part] of Object.entries(this.parts)) {
            if (!texture.has(name)) texture.add(name, 0, ...part.rect);
        }
        this.sprites = {};
        this.pose = {};
        const order = [
            ['farThigh', 'thigh'], ['farShin', 'shin'], ['farShoe', 'shoe'],
            ['farUpperArm', 'upperArm'], ['farForearm', 'forearm'],
            ['rearWheel', 'wheel'], ['frontWheel', 'wheel'], ['frame', 'frame'],
            ['forkUpper', 'forkUpper'], ['forkLower', 'forkLower'], ['bars', 'bars'],
            ['thigh', 'thigh'], ['shin', 'shin'], ['shoe', 'shoe'], ['torso', 'torso'],
            ['head', 'head'], ['upperArm', 'upperArm'], ['forearm', 'forearm']
        ];
        for (const [id, part] of order) {
            const sprite = scene.add.image(0, 0, 'rider-art', part).setDepth(4);
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
        const sy = distance / Math.hypot(bx-ax, by-ay);
        const authoredAngle = Math.atan2((by-ay)*sy, (bx-ax)*sx);
        sprite.setOrigin(ax/p.rect[2], ay/p.rect[3]).setPosition(a.x,a.y)
            .setScale(sx,sy).setRotation(Math.atan2(b.y-a.y,b.x-a.x)-authoredAngle);
    }

    anchored(id, partName, anchor, width, rotation) {
        this.pose[id] = {partName,anchor:{...anchor},width,rotation};
        const p = this.parts[partName];
        this.sprites[id].setOrigin(...p.origin).setPosition(anchor.x,anchor.y)
            .setScale(width/p.rect[2]).setRotation(rotation);
    }

    update(bike) {
        const angle = bike.angle*Math.PI/180;
        const pitch = bike.forkCompression/64;
        const c = Math.cos(angle), s = Math.sin(angle);
        const pc = Math.cos(pitch), ps = Math.sin(pitch);
        const world = ([x,y], frame = true) => {
            if (frame) {
                const px=x+32,py=y+16;
                x=-32+px*pc-py*ps; y=-16+px*ps+py*pc;
            }
            return {x:bike.x+x*c-y*s,y:bike.y+x*s+y*c};
        };
        const joint = (a,b,length,bend=1) => {
            const dx=b[0]-a[0],dy=b[1]-a[1],d=Math.max(0.001,Math.hypot(dx,dy));
            const h=Math.sqrt(Math.max(0,length*length-d*d/4));
            return [(a[0]+b[0])/2-dy/d*h*bend,(a[1]+b[1])/2+dx/d*h*bend];
        };
        const q = Math.max(-0.3,Math.min(1.15,bike.compress));
        const hip = [-14-q*5+bike.bodyShift*4,-50+q*11];
        const shoulder = [3+q*5+bike.bodyShift*3,-70+q*14];
        const grip=[23,-45],foot=[-2,-17],farFoot=[-10,-21];
        const farHip=[hip[0]-3,hip[1]];
        const knee=joint(hip,foot,21,-1),farKnee=joint(farHip,farFoot,20,-1);
        const elbow=joint(shoulder,grip,17),farShoulder=[shoulder[0]-3,shoulder[1]+2];
        const farElbow=joint(farShoulder,grip,17);
        const bone=(id,name,a,b,width)=>this.bone(id,name,world(a),world(b),width);
        bone('farThigh','thigh',farHip,farKnee,9);
        bone('farShin','shin',farKnee,farFoot,6.5);
        this.anchored('farShoe','shoe',world(farFoot),12,angle+pitch);
        bone('farUpperArm','upperArm',farShoulder,farElbow,6.5);
        bone('farForearm','forearm',farElbow,grip,5.5);
        for (const [id,x] of [['rearWheel',-32],['frontWheel',32]]) {
            this.anchored(id,'wheel',world([x,-16],false),32,angle+bike.distance/16);
        }
        // Frame anchor mapping is authored separately from the rider's bones.
        const frame = this.parts.frame;
        const rear=world([-32,-16]);
        this.anchored('frame','frame',rear,frame.displayWidth,angle+pitch);
        const crown=world([19,-38]);
        const axle=world([32,-16],false);
        const d=Math.hypot(crown.x-axle.x,crown.y-axle.y);
        const seal={x:axle.x+(crown.x-axle.x)*14/d,y:axle.y+(crown.y-axle.y)*14/d};
        this.bone('forkUpper','forkUpper',crown,seal,5);
        this.bone('forkLower','forkLower',seal,axle,5.8);
        this.anchored('bars','bars',world([17,-42]),15,angle+pitch);
        bone('thigh','thigh',hip,knee,10);
        bone('shin','shin',knee,foot,7);
        this.anchored('shoe','shoe',world(foot),13,angle+pitch);
        bone('torso','torso',shoulder,hip,18);
        this.anchored('head','head',world([shoulder[0]+5-bike.bodyShift*2,shoulder[1]-2-q]),17,angle+pitch);
        bone('upperArm','upperArm',shoulder,elbow,7);
        bone('forearm','forearm',elbow,grip,6);
    }
}
