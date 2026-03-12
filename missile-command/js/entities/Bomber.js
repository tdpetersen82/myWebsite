// ============================================================
// Missile Command — Bomber Entity
// ============================================================

class Bomber {
    constructor(type = 'STANDARD', wave = 1) {
        const typeConfig = CONFIG.BOMBER[type] || CONFIG.BOMBER.STANDARD;
        this.type = type;
        this.speed = typeConfig.speed;
        this.health = typeConfig.health;
        this.maxHealth = typeConfig.health;
        this.dropRate = typeConfig.dropRate;
        this.dropCount = typeConfig.dropCount || 1;
        this.points = typeConfig.points;
        this.wave = wave;
        this.dead = false;

        // Direction: left or right
        this.direction = Math.random() < 0.5 ? 1 : -1;
        this.x = this.direction === 1 ? -30 : CONFIG.WIDTH + 30;
        this.y = Helpers.randomRange(40, 120);

        this.dropTimer = Helpers.randomRange(1000, 2000);
        this.bobPhase = Math.random() * Math.PI * 2;

        // For collision
        this.width = 30;
        this.height = 12;
    }

    update(dt) {
        if (this.dead) return;

        this.x += this.direction * this.speed * dt;
        this.bobPhase += dt * 2;

        // Drop timer
        this.dropTimer -= dt * 1000;

        // Off screen
        if ((this.direction === 1 && this.x > CONFIG.WIDTH + 50) ||
            (this.direction === -1 && this.x < -50)) {
            this.dead = true;
        }
    }

    shouldDrop() {
        if (this.dropTimer <= 0) {
            this.dropTimer = this.dropRate;
            return true;
        }
        return false;
    }

    createDropMissiles(cities) {
        const missiles = [];
        const aliveCities = cities.filter(c => c.alive);

        for (let i = 0; i < this.dropCount; i++) {
            let tx, ty;
            if (aliveCities.length > 0) {
                const target = Helpers.randomChoice(aliveCities);
                tx = target.x + Helpers.randomRange(-10, 10);
                ty = CONFIG.GROUND_Y;
            } else {
                tx = Helpers.randomRange(50, CONFIG.WIDTH - 50);
                ty = CONFIG.GROUND_Y;
            }
            const m = new EnemyMissile(
                this.x + Helpers.randomRange(-5, 5),
                this.y + 10,
                tx, ty,
                'BASIC',
                this.wave
            );
            missiles.push(m);
        }
        return missiles;
    }

    hit() {
        this.health--;
        if (this.health <= 0) {
            this.dead = true;
            return true;
        }
        return false;
    }

    contains(x, y, radius) {
        return Math.abs(x - this.x) < (this.width / 2 + radius) &&
               Math.abs(y - this.y) < (this.height / 2 + radius);
    }

    draw(graphics) {
        if (this.dead) return;

        const bobY = this.y + Math.sin(this.bobPhase) * 3;
        const dir = this.direction;

        // Body
        const bodyColor = this.type === 'HEAVY' ? 0x888888 : this.type === 'FAST' ? 0xaaaa66 : 0x999999;
        graphics.fillStyle(bodyColor, 0.9);
        graphics.fillRect(this.x - 15, bobY - 4, 30, 8);

        // Nose
        graphics.fillTriangle(
            this.x + dir * 15, bobY - 3,
            this.x + dir * 15, bobY + 3,
            this.x + dir * 22, bobY
        );

        // Wings
        graphics.fillStyle(0x777777, 0.8);
        graphics.fillTriangle(
            this.x - 5, bobY - 4,
            this.x + 5, bobY - 4,
            this.x, bobY - 12
        );
        graphics.fillTriangle(
            this.x - 5, bobY + 4,
            this.x + 5, bobY + 4,
            this.x, bobY + 10
        );

        // Tail
        graphics.fillStyle(0x666666, 0.8);
        graphics.fillTriangle(
            this.x - dir * 15, bobY - 3,
            this.x - dir * 15, bobY + 3,
            this.x - dir * 20, bobY - 6
        );

        // Engine glow
        graphics.fillStyle(0xff8800, 0.4 + Math.random() * 0.3);
        graphics.fillCircle(this.x - dir * 16, bobY, 3);

        // Health bar for heavy bombers
        if (this.maxHealth > 1 && this.health > 0) {
            const barW = 20;
            const barH = 2;
            const barX = this.x - barW / 2;
            const barY = bobY - 16;
            graphics.fillStyle(0x333333, 0.6);
            graphics.fillRect(barX, barY, barW, barH);
            graphics.fillStyle(0x44ff44, 0.8);
            graphics.fillRect(barX, barY, barW * (this.health / this.maxHealth), barH);
        }
    }
}
