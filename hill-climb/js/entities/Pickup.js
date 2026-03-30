class PickupManager {
    constructor(scene) {
        this.scene = scene;
        this.pickups = [];
        this.lastFuelX = 0;
        this.lastCoinX = 0;
    }

    update(cameraX, terrain) {
        const rightBound = cameraX + CONFIG.WIDTH + 200;
        const leftBound = cameraX - 200;

        // Spawn fuel cans ahead
        while (this.lastFuelX < rightBound) {
            this.lastFuelX += CONFIG.FUEL_PICKUP_INTERVAL * (0.7 + Math.random() * 0.6);
            if (this.lastFuelX < 300) continue; // no pickups at start
            const surfaceY = terrain.getSurfaceY(this.lastFuelX);
            this.spawnPickup(this.lastFuelX, surfaceY - 30, 'fuel');
        }

        // Spawn coins ahead
        while (this.lastCoinX < rightBound) {
            this.lastCoinX += CONFIG.COIN_INTERVAL * (0.5 + Math.random() * 1.0);
            if (this.lastCoinX < 200) continue;
            const surfaceY = terrain.getSurfaceY(this.lastCoinX);
            // Some coins on ground, some in air
            const airOffset = Math.random() > 0.5 ? 30 + Math.random() * 60 : 0;
            this.spawnPickup(this.lastCoinX, surfaceY - 25 - airOffset, 'coin');
        }

        // Remove off-screen pickups
        this.pickups = this.pickups.filter(p => {
            if (p.x < leftBound || p.collected) {
                p.sprite.destroy();
                if (p.body) this.scene.matter.world.remove(p.body);
                return false;
            }
            return true;
        });
    }

    spawnPickup(x, y, type) {
        let sprite;
        if (type === 'fuel') {
            sprite = this.scene.add.image(x, y, 'pickups', 'fuel');
            sprite.setDepth(8);
        } else {
            sprite = this.scene.add.sprite(x, y, 'pickups', 'coin_0');
            sprite.setDepth(8);
            // Animate through 8 coin frames
            if (!this.scene.anims.exists('coin_spin')) {
                this.scene.anims.create({
                    key: 'coin_spin',
                    frames: Array.from({ length: 8 }, (_, i) => ({
                        key: 'pickups', frame: `coin_${i}`
                    })),
                    frameRate: 10,
                    repeat: -1,
                });
            }
            sprite.play('coin_spin');
        }

        // Sensor body for collection detection
        const body = this.scene.matter.add.circle(x, y, 18, {
            isSensor: true,
            isStatic: true,
            label: type === 'fuel' ? 'fuelPickup' : 'coinPickup',
            collisionFilter: { category: 0x0004, mask: 0x0002 },
        });

        const pickup = { x, y, type, sprite, body, collected: false };
        this.pickups.push(pickup);

        // Float bob for coins
        if (type === 'coin') {
            this.scene.tweens.add({
                targets: sprite,
                y: y - 5,
                duration: 800,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
            });
        }
    }

    checkCollection(bikePos) {
        const collected = [];
        const collectDist = 35;

        this.pickups.forEach(p => {
            if (p.collected) return;
            const dx = p.x - bikePos.x;
            const dy = p.y - bikePos.y;
            if (dx * dx + dy * dy < collectDist * collectDist) {
                p.collected = true;
                collected.push(p.type);

                // Collection animation
                this.scene.tweens.add({
                    targets: p.sprite,
                    y: p.sprite.y - 40,
                    alpha: 0,
                    scale: 1.5,
                    duration: 300,
                    onComplete: () => {
                        p.sprite.destroy();
                    }
                });
            }
        });

        return collected;
    }

    destroy() {
        this.pickups.forEach(p => {
            p.sprite.destroy();
            if (p.body) this.scene.matter.world.remove(p.body);
        });
        this.pickups = [];
    }
}
