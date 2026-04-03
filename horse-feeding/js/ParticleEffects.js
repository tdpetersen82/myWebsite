import * as THREE from 'three';

export class ParticleEffects {
    constructor(scene) {
        this.scene = scene;
        this.systems = [];
    }

    burst(position, color) {
        const count = CONFIG.PARTICLE_COUNT;
        const positions = new Float32Array(count * 3);
        const velocities = [];
        const geometry = new THREE.BufferGeometry();

        for (let i = 0; i < count; i++) {
            positions[i * 3] = position.x;
            positions[i * 3 + 1] = position.y;
            positions[i * 3 + 2] = position.z;

            velocities.push(new THREE.Vector3(
                (Math.random() - 0.5) * 3,
                Math.random() * 2 + 1,
                (Math.random() - 0.5) * 3
            ));
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            color: color,
            size: 0.06,
            transparent: true,
            opacity: 1,
            sizeAttenuation: true,
            depthWrite: false,
        });

        const points = new THREE.Points(geometry, material);
        this.scene.add(points);

        this.systems.push({
            points,
            velocities,
            elapsed: 0,
            lifetime: CONFIG.PARTICLE_LIFETIME,
        });
    }

    update(delta) {
        for (let i = this.systems.length - 1; i >= 0; i--) {
            const sys = this.systems[i];
            sys.elapsed += delta;

            if (sys.elapsed >= sys.lifetime) {
                this.scene.remove(sys.points);
                sys.points.geometry.dispose();
                sys.points.material.dispose();
                this.systems.splice(i, 1);
                continue;
            }

            const positions = sys.points.geometry.attributes.position.array;
            const t = sys.elapsed / sys.lifetime;

            for (let j = 0; j < sys.velocities.length; j++) {
                const vel = sys.velocities[j];
                positions[j * 3] += vel.x * delta;
                positions[j * 3 + 1] += vel.y * delta - 4.9 * delta * sys.elapsed; // gravity
                positions[j * 3 + 2] += vel.z * delta;
            }

            sys.points.geometry.attributes.position.needsUpdate = true;
            sys.points.material.opacity = 1 - t;
            sys.points.material.size = 0.06 * (1 - t * 0.5);
        }
    }
}
