// Fantastic Contraption — Part Factory
class PartFactory {
    static createWheel(x, y, type) {
        const isMotored = type !== CONFIG.PART_FREE_WHEEL;
        // Create as dynamic first so mass/inertia are computed, then make static
        const body = Matter.Bodies.circle(x, y, CONFIG.WHEEL_RADIUS, {
            isStatic: false,
            density: CONFIG.WHEEL_DENSITY,
            friction: CONFIG.WHEEL_FRICTION,
            restitution: CONFIG.WHEEL_RESTITUTION,
            frictionAir: 0.005,
            slop: 0.05,
            collisionFilter: {
                category: CONFIG.CAT_USER_PART,
                mask: CONFIG.CAT_TERRAIN | CONFIG.CAT_USER_PART | CONFIG.CAT_WATER_ROD | CONFIG.CAT_PAYLOAD
            },
            label: 'wheel'
        });
        Matter.Body.setStatic(body, true);

        return {
            type: type,
            body: body,
            endpoints: [
                { localOffset: { x: 0, y: 0 }, worldPos: { x: x, y: y } }
            ],
            constraints: [],
            buildPos: { x: x, y: y },
            buildAngle: 0,
            isMotored: isMotored,
            motorDir: type === CONFIG.PART_CW_WHEEL ? 1 : (type === CONFIG.PART_CCW_WHEEL ? -1 : 0)
        };
    }

    static createRod(x1, y1, x2, y2, isWater) {
        const cx = (x1 + x2) / 2;
        const cy = (y1 + y2) / 2;
        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        const category = isWater ? CONFIG.CAT_WATER_ROD : CONFIG.CAT_USER_PART;
        const mask = isWater
            ? (CONFIG.CAT_TERRAIN | CONFIG.CAT_USER_PART | CONFIG.CAT_PAYLOAD)
            : (CONFIG.CAT_TERRAIN | CONFIG.CAT_USER_PART | CONFIG.CAT_WATER_ROD | CONFIG.CAT_PAYLOAD);

        // Create as dynamic first so mass/inertia are computed, then make static
        const body = Matter.Bodies.rectangle(cx, cy, length, CONFIG.ROD_THICKNESS, {
            isStatic: false,
            density: CONFIG.ROD_DENSITY,
            friction: CONFIG.ROD_FRICTION,
            restitution: CONFIG.ROD_RESTITUTION,
            frictionAir: 0.005,
            slop: 0.05,
            angle: angle,
            collisionFilter: {
                category: category,
                mask: mask
            },
            label: isWater ? 'water_rod' : 'rod'
        });
        Matter.Body.setStatic(body, true);

        const halfLen = length / 2;

        return {
            type: isWater ? CONFIG.PART_WATER_ROD : CONFIG.PART_ROD,
            body: body,
            endpoints: [
                {
                    localOffset: { x: -halfLen, y: 0 },
                    worldPos: { x: x1, y: y1 }
                },
                {
                    localOffset: { x: halfLen, y: 0 },
                    worldPos: { x: x2, y: y2 }
                }
            ],
            constraints: [],
            buildPos: { x: cx, y: cy },
            buildAngle: angle,
            length: length,
            isMotored: false,
            motorDir: 0
        };
    }

    static isWheelType(type) {
        return type === CONFIG.PART_CW_WHEEL ||
               type === CONFIG.PART_CCW_WHEEL ||
               type === CONFIG.PART_FREE_WHEEL;
    }

    static isRodType(type) {
        return type === CONFIG.PART_ROD || type === CONFIG.PART_WATER_ROD;
    }
}
