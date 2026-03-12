// ============================================================
// Missile Command — Enemy Missile Entity
// ============================================================

class EnemyMissile {
    constructor(startX, startY, targetX, targetY, type = 'BASIC', wave = 1) {
        this.startX = startX;
        this.startY = startY;
        this.x = startX;
        this.y = startY;
        this.targetX = targetX;
        this.targetY = targetY;
        this.type = type;
        this.wave = wave;
        this.dead = false;
        this.hitGround = false;

        const typeConfig = CONFIG.ENEMY[type] || CONFIG.ENEMY.BASIC;
        this.baseSpeed = (40 + wave * 8) * typeConfig.speed;
        this.health = typeConfig.health;
        this.maxHealth = typeConfig.health;
        this.points = typeConfig.points;
        this.color = typeConfig.color;
        this.trailColor = typeConfig.trail;

        const dist = Helpers.distance(startX, startY, targetX, targetY);
        this.dx = (targetX - startX) / dist;
        this.dy = (targetY - startY) / dist;

        // MIRV
        this.isMIRV = type === 'MIRV';
        this.mirvSplit = false;
        this.splitY = Helpers.randomRange(startY + (targetY - startY) * 0.3, startY + (targetY - startY) * 0.6);

        // Stealth
        this.isStealth = type === 'STEALTH';
        this.stealthFlicker = 0;

        // Trail
        this.trail = [{ x: startX, y: startY }];
        this.trailTimer = 0;
    }

    update(dt, speedMultiplier = 1) {
        if (this.dead) return;

        const speed = this.baseSpeed * speedMultiplier;
        this.x += this.dx * speed * dt;
        this.y += this.dy * speed * dt;

        // Trail
        this.trailTimer += dt * 1000;
        if (this.trailTimer > 30) {
            this.trail.push({ x: this.x, y: this.y });
            if (this.trail.length > 25) this.trail.shift();
            this.trailTimer = 0;
        }

        // Stealth flicker
        if (this.isStealth) {
            this.stealthFlicker = Math.sin(Date.now() * 0.01) > 0.85 ? 1 : 0.05;
        }

        // MIRV split check
        if (this.isMIRV && !this.mirvSplit && this.y >= this.splitY) {
            this.mirvSplit = true;
        }

        // Hit ground
        if (this.y >= CONFIG.GROUND_Y) {
            this.y = CONFIG.GROUND_Y;
            this.hitGround = true;
            this.dead = true;
        }
    }

    hit() {
        this.health--;
        if (this.health <= 0) {
            this.dead = true;
            return true;
        }
        return false;
    }

    shouldSplit() {
        return this.isMIRV && this.mirvSplit && !this.dead;
    }

    createSplitMissiles(cities) {
        const splitCount = CONFIG.ENEMY.MIRV.splitCount || 3;
        const children = [];
        const aliveCities = cities.filter(c => c.alive);

        for (let i = 0; i < splitCount; i++) {
            let tx, ty;
            if (aliveCities.length > 0) {
                const target = Helpers.randomChoice(aliveCities);
                tx = target.x + Helpers.randomRange(-15, 15);
                ty = CONFIG.GROUND_Y;
            } else {
                tx = Helpers.randomRange(50, CONFIG.WIDTH - 50);
                ty = CONFIG.GROUND_Y;
            }
            const child = new EnemyMissile(this.x, this.y, tx, ty, 'BASIC', this.wave);
            child.baseSpeed *= 1.2;
            child.points = 30;
            children.push(child);
        }
        this.dead = true;
        return children;
    }

    draw(graphics) {
        if (this.dead) return;

        const alpha = this.isStealth ? this.stealthFlicker : 1;

        // Trail
        for (let i = 1; i < this.trail.length; i++) {
            const trailAlpha = (i / this.trail.length) * 0.5 * alpha;
            const width = this.type === 'FAST' ? 1 : 1.5;
            graphics.lineStyle(width, this.trailColor, trailAlpha);
            graphics.lineBetween(
                this.trail[i - 1].x, this.trail[i - 1].y,
                this.trail[i].x, this.trail[i].y
            );
        }

        // Line from last trail to current
        if (this.trail.length > 0) {
            graphics.lineStyle(this.type === 'FAST' ? 1 : 1.5, this.color, 0.7 * alpha);
            const last = this.trail[this.trail.length - 1];
            graphics.lineBetween(last.x, last.y, this.x, this.y);
        }

        // Missile head
        graphics.fillStyle(this.color, alpha);
        const headSize = this.type === 'ARMORED' ? 4 : 3;
        graphics.fillCircle(this.x, this.y, headSize);

        // Armored ring
        if (this.type === 'ARMORED' && this.health > 1) {
            graphics.lineStyle(1.5, 0xccddee, 0.6);
            graphics.strokeCircle(this.x, this.y, headSize + 2);
            if (this.health > 2) {
                graphics.lineStyle(1, 0xeeeeff, 0.4);
                graphics.strokeCircle(this.x, this.y, headSize + 4);
            }
        }

        // MIRV indicator
        if (this.isMIRV && !this.mirvSplit) {
            graphics.fillStyle(0xff00ff, 0.5 + Math.sin(Date.now() * 0.01) * 0.3);
            graphics.fillCircle(this.x, this.y, 5);
        }

        // Ground target indicator
        if (!this.isStealth) {
            graphics.fillStyle(this.color, 0.15 * alpha);
            graphics.fillCircle(this.targetX, CONFIG.GROUND_Y, 3);
        }
    }
}
