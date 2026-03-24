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

        // Warhead glow animation
        this.glowPhase = Math.random() * Math.PI * 2;
    }

    update(dt, speedMultiplier = 1) {
        if (this.dead) return;

        const speed = this.baseSpeed * speedMultiplier;
        this.x += this.dx * speed * dt;
        this.y += this.dy * speed * dt;
        this.glowPhase += dt * 8;

        // Trail
        this.trailTimer += dt * 1000;
        if (this.trailTimer > 25) {
            this.trail.push({ x: this.x, y: this.y });
            if (this.trail.length > 28) this.trail.shift();
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

        // Trail glow (outer)
        for (let i = 1; i < this.trail.length; i++) {
            const trailAlpha = (i / this.trail.length) * 0.3 * alpha;
            graphics.lineStyle(5, this.trailColor, trailAlpha);
            graphics.lineBetween(
                this.trail[i - 1].x, this.trail[i - 1].y,
                this.trail[i].x, this.trail[i].y
            );
        }

        // Trail core
        for (let i = 1; i < this.trail.length; i++) {
            const trailAlpha = (i / this.trail.length) * 0.55 * alpha;
            const width = this.type === 'FAST' ? 1 : 1.5;
            graphics.lineStyle(width, this.trailColor, trailAlpha);
            graphics.lineBetween(
                this.trail[i - 1].x, this.trail[i - 1].y,
                this.trail[i].x, this.trail[i].y
            );
        }

        // Line from last trail to current
        if (this.trail.length > 0) {
            graphics.lineStyle(this.type === 'FAST' ? 1 : 1.5, this.color, 0.75 * alpha);
            const last = this.trail[this.trail.length - 1];
            graphics.lineBetween(last.x, last.y, this.x, this.y);
        }

        // Warhead glow
        const glowSize = 6 + Math.sin(this.glowPhase) * 1.5;
        graphics.fillStyle(this.color, 0.15 * alpha);
        graphics.fillCircle(this.x, this.y, glowSize);

        // Warhead shape (diamond/triangle instead of circle)
        const headSize = this.type === 'ARMORED' ? 4.5 : 3.5;
        graphics.fillStyle(this.color, alpha);

        // Draw diamond warhead pointing in travel direction
        const angle = Math.atan2(this.dy, this.dx);
        const tipX = this.x + Math.cos(angle) * headSize;
        const tipY = this.y + Math.sin(angle) * headSize;
        const backX = this.x - Math.cos(angle) * headSize * 0.6;
        const backY = this.y - Math.sin(angle) * headSize * 0.6;
        const perpX = Math.cos(angle + Math.PI / 2) * headSize * 0.5;
        const perpY = Math.sin(angle + Math.PI / 2) * headSize * 0.5;

        graphics.fillTriangle(
            tipX, tipY,
            backX + perpX, backY + perpY,
            backX - perpX, backY - perpY
        );

        // Bright core
        graphics.fillStyle(0xffffff, 0.6 * alpha);
        graphics.fillCircle(this.x, this.y, 1.5);

        // Armored ring
        if (this.type === 'ARMORED' && this.health > 1) {
            graphics.lineStyle(1.5, 0xccddee, 0.6 * alpha);
            graphics.strokeCircle(this.x, this.y, headSize + 2);
            if (this.health > 2) {
                graphics.lineStyle(1, 0xeeeeff, 0.35 * alpha);
                graphics.strokeCircle(this.x, this.y, headSize + 4.5);
            }
        }

        // MIRV indicator
        if (this.isMIRV && !this.mirvSplit) {
            const mirvPulse = 0.5 + Math.sin(this.glowPhase * 0.8) * 0.3;
            graphics.fillStyle(0xff00ff, mirvPulse * alpha);
            graphics.fillCircle(this.x, this.y, 5.5);
            graphics.lineStyle(1, 0xff44ff, mirvPulse * 0.5 * alpha);
            graphics.strokeCircle(this.x, this.y, 7);
        }

        // Ground target indicator
        if (!this.isStealth) {
            graphics.fillStyle(this.color, 0.25 * alpha);
            graphics.fillCircle(this.targetX, CONFIG.GROUND_Y, 4);
            // Small crosshair
            graphics.lineStyle(0.5, this.color, 0.2 * alpha);
            graphics.lineBetween(this.targetX - 5, CONFIG.GROUND_Y, this.targetX + 5, CONFIG.GROUND_Y);
        }
    }
}
