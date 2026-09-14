// Dirt Jumper — Phase 1 ride scene.
// Endless downhill: drop in, pump the track, send the jumps, stomp the landings.
// One generic bike; off-angle landing = bail = run ends. No tricks/upgrades yet.

class RideScene extends Phaser.Scene {
    constructor() { super({ key: 'RideScene' }); }

    init() {
        this.started = false;
        this.runOver = false;
        this.paused = false;
        this.muted = false;
        this._leaving = false;
    }

    create() {
        const W = CONFIG.WIDTH, H = CONFIG.HEIGHT;

        // sky backdrop (fixed to the camera)
        this.bg = this.add.graphics().setScrollFactor(0).setDepth(0);
        this._drawSky();

        // world layers
        this.terrainG = this.add.graphics().setDepth(2);
        this.dustG = this.add.graphics().setDepth(3);
        this.bikeG = this.add.graphics().setDepth(4);

        // model: deterministic per run (Date seed in the real game; fixed is fine too)
        const seed = (Date.now ? (Date.now() & 0x7fffffff) : 12345) >>> 0;
        this.terrain = new Terrain(this, seed);
        this.bike = new Bike(this, CONFIG.STATS, CONFIG.TERRAIN.startFlat * 0.5);
        this.bike.y = this.terrain.heightAt(this.bike.x);
        this.particles = new ParticleField();

        // input
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keys = this.input.keyboard.addKeys({
            s: Phaser.Input.Keyboard.KeyCodes.S,
            a: Phaser.Input.Keyboard.KeyCodes.A,
            d: Phaser.Input.Keyboard.KeyCodes.D
        });
        this.input.keyboard.on('keydown-R', () => this._restart());
        this.input.keyboard.on('keydown-P', () => this._togglePause());
        this.input.keyboard.on('keydown-ESC', () => this._togglePause());
        this.input.keyboard.on('keydown-M', () => { this.muted = !this.muted; this._updateMute(); });
        this.input.keyboard.on('keydown-SPACE', () => this._onConfirm());
        this.input.keyboard.on('keydown-ENTER', () => this._onConfirm());

        // Single pointer handler: a tap starts/restarts; once running, holding a
        // finger pumps. The start tap itself does NOT pump (it just drops in).
        this._touchPump = false;
        this.input.on('pointerdown', () => {
            if (!this.started) { this._dropIn(); return; }
            if (this.runOver) { this._restart(); return; }
            this._touchPump = true;
        });
        // Clear the pump latch on EVERY release/exit path — not just 'pointerup'.
        // A finger that slides off the canvas fires 'pointerupoutside'/'gameout'
        // (not 'pointerup'), which would otherwise leave the bike auto-pumping.
        const releaseTouch = () => { this._touchPump = false; };
        this.input.on('pointerup', releaseTouch);
        this.input.on('pointerupoutside', releaseTouch);
        this.input.on('gameout', releaseTouch);

        this._initAudio();
        this._buildHUD();

        // camera
        this.cam = this.cameras.main;
        this.cam.setBackgroundColor('#3a5a72');
        this._snapCamera();

        this.events.on('shutdown', () => this._teardownAudio());
    }

    // ============ update ============
    update(time, delta) {
        if (this.paused) return;
        const dtMs = Math.min(delta, 50);

        if (this.started && !this.runOver) {
            const input = this._readInput();
            const b = this.bike;
            b.update(dtMs, this.terrain, input);

            // reactions to one-frame events
            if (b.justGoodPump) { this._whoomp(); this._tick('+SPD', CONFIG.COLORS.CLEAN); }
            if (b.justPop) { this._whoomp(1.25); }
            if (b.lastLanding) this._onLanding(b.lastLanding);

            // cosmetic dust on the ground at speed
            if (!b.airborne && b.speed > 120) this.particles.wheelDust(b.x, b.y, b.speed);

            if (b.crashed && !this.runOver) this._endRun();
        }

        this.particles.update(dtMs / 1000);

        // camera follow
        this._followCamera(dtMs / 1000);

        // stream + cull terrain around the camera
        this.terrain._ensure(this.cam.scrollX + CONFIG.WIDTH);
        this.terrain.cull(this.cam.scrollX);

        // draw
        const left = this.cam.scrollX, right = left + CONFIG.WIDTH, bottom = this.cam.scrollY + CONFIG.HEIGHT;
        this.terrain.draw(this.terrainG, left, right, bottom);
        this.particles.draw(this.dustG);
        this.bikeG.clear();
        this.bike.draw(this.bikeG);

        this._updateHUD();
    }

    _readInput() {
        const c = this.cursors, k = this.keys;
        return {
            pump: c.down.isDown || k.s.isDown || this._touchPump,
            left: c.left.isDown || k.a.isDown,
            right: c.right.isDown || k.d.isDown
        };
    }

    // ============ camera ============
    _camTarget() {
        const bp = this.bike.bodyPoint();
        return {
            x: bp.x + 150 - CONFIG.WIDTH / 2,        // look ahead (downhill is to the right)
            y: bp.y - CONFIG.HEIGHT * 0.52
        };
    }
    _snapCamera() {
        const t = this._camTarget();
        this.cam.setScroll(t.x, t.y);
    }
    _followCamera(dt) {
        const t = this._camTarget();
        const lerp = Math.min(1, dt * 6);
        this.cam.setScroll(
            this.cam.scrollX + (t.x - this.cam.scrollX) * lerp,
            this.cam.scrollY + (t.y - this.cam.scrollY) * lerp
        );
    }

    // ============ events ============
    _onConfirm() {
        if (!this.started) { this._dropIn(); return; }
        if (this.runOver) { this._restart(); return; }
    }

    _dropIn() {
        this.started = true;
        if (this.actx && this.actx.state === 'suspended') this.actx.resume();
        if (this._startOverlay) { this._startOverlay.forEach(o => o.destroy()); this._startOverlay = null; }
    }

    _onLanding(info) {
        if (info.grade === 'bail') {
            this.particles.burst(info.x, info.y, 26, CONFIG.COLORS.BAIL, 1.4);
            this.cam.shake(360, 0.014);
            this._crashSfx();
            this._stamp('BAIL', CONFIG.COLORS.BAIL);
            return;
        }
        const colorMap = { perfect: CONFIG.COLORS.PERFECT, clean: CONFIG.COLORS.CLEAN, sketchy: CONFIG.COLORS.SKETCHY };
        const hardness = Phaser.Math.Clamp(info.hardness / 600, 0, 1);
        this.particles.burst(info.x, info.y, 10 + Math.floor(hardness * 18), CONFIG.COLORS.DUST, 0.7 + hardness);
        this.cam.shake(120 + hardness * 220, 0.003 + hardness * 0.008);
        this._thud(hardness);
        if (info.airTime > 0.25) {
            const label = info.grade.toUpperCase();
            this._stamp(label, colorMap[info.grade]);
        }
    }

    _endRun() {
        this.runOver = true;
        this._touchPump = false;       // a finger held at the crash can't pump into the summary
        const score = this.bike.scoreValue();
        const prev = parseInt(localStorage.getItem(CONFIG.BEST_KEY) || '0', 10) || 0;
        const isBest = score > prev;
        if (isBest) localStorage.setItem(CONFIG.BEST_KEY, String(score));
        this._showSummary(score, Math.max(prev, score), isBest);
    }

    _restart() {
        if (this._leaving) return;
        this._leaving = true;
        this._teardownAudio();
        this.scene.restart();
    }

    _togglePause() {
        if (!this.started || this.runOver) return;
        this._touchPump = false;       // don't carry a held-finger pump across a pause toggle
        this.paused = !this.paused;
        if (this.paused) { this.time.paused = true; this.tweens.pauseAll(); }
        else { this.time.paused = false; this.tweens.resumeAll(); }
        this.pauseText.setVisible(this.paused);
    }

    // ============ HUD ============
    _buildHUD() {
        const W = CONFIG.WIDTH, H = CONFIG.HEIGHT;
        const mono = 'JetBrains Mono, Courier New, monospace';
        const mk = (x, y, str, size, color, origin) => this.add.text(x, y, str, {
            fontFamily: mono, fontSize: size + 'px', color, fontStyle: 'bold'
        }).setScrollFactor(0).setDepth(20).setOrigin(origin ? origin[0] : 0, origin ? origin[1] : 0);

        this.hud = {};
        this.hud.speed = mk(14, 12, 'SPEED 0', 16, CONFIG.COLORS.HUD);
        this.hud.speedUnit = mk(14, 34, 'km/h', 11, CONFIG.COLORS.HUD_DIM);
        this.hud.score = mk(W - 14, 12, 'SCORE 0', 18, '#ffffff', [1, 0]);
        this.hud.best = mk(W - 14, 36, 'BEST 0', 12, CONFIG.COLORS.HUD_DIM, [1, 0]);
        this.hud.flow = mk(W / 2, 12, '', 15, CONFIG.COLORS.ACCENT, [0.5, 0]);

        // speed-lines layer (fixed)
        this.speedLines = this.add.graphics().setScrollFactor(0).setDepth(18);

        // pause text
        this.pauseText = this.add.text(W / 2, H / 2, 'PAUSED\nP / ESC resume   •   R restart', {
            fontFamily: mono, fontSize: '22px', color: '#ffffff', align: 'center', fontStyle: 'bold'
        }).setScrollFactor(0).setDepth(40).setOrigin(0.5).setVisible(false);

        // mute indicator
        this.muteText = this.add.text(W - 14, H - 10, '', {
            fontFamily: mono, fontSize: '11px', color: '#ff8a6a'
        }).setScrollFactor(0).setDepth(40).setOrigin(1, 1);

        // drop-in overlay
        const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x05080c, 0.45).setScrollFactor(0).setDepth(30);
        const title = this.add.text(W / 2, H * 0.36, 'DIRT JUMPER', {
            fontFamily: mono, fontSize: '40px', color: '#ffffff', fontStyle: 'bold', letterSpacing: 3
        }).setScrollFactor(0).setDepth(31).setOrigin(0.5);
        const prompt = this.add.text(W / 2, H * 0.50, 'TAP / SPACE — DROP IN', {
            fontFamily: mono, fontSize: '18px', color: CONFIG.COLORS.ACCENT, fontStyle: 'bold'
        }).setScrollFactor(0).setDepth(31).setOrigin(0.5);
        const help = this.add.text(W / 2, H * 0.62,
            'hold ↓ / S  pump  (release at a lip to pop)\n←  →  rotate in the air to match your landing', {
            fontFamily: mono, fontSize: '13px', color: CONFIG.COLORS.HUD_DIM, align: 'center'
        }).setScrollFactor(0).setDepth(31).setOrigin(0.5);
        this.tweens.add({ targets: prompt, alpha: { from: 1, to: 0.4 }, duration: 700, yoyo: true, repeat: -1 });
        this._startOverlay = [dim, title, prompt, help];
    }

    _updateHUD() {
        const b = this.bike;
        const kmh = Math.round(b.speed * 0.12);     // arbitrary readable scale
        this.hud.speed.setText('SPEED ' + kmh);
        this.hud.score.setText('SCORE ' + b.scoreValue());
        const best = parseInt(localStorage.getItem(CONFIG.BEST_KEY) || '0', 10) || 0;
        this.hud.best.setText('BEST ' + Math.max(best, b.scoreValue()));

        if (b.flow >= 1) {
            const lvl = b.flow.toFixed(1);
            this.hud.flow.setText('FLOW x' + (1 + b.flow * CONFIG.FLOW_SCORE_MULT).toFixed(2));
        } else this.hud.flow.setText('');

        // speed lines at high speed
        this.speedLines.clear();
        if (this.started && !this.runOver && b.speed > 760) {
            const intensity = Phaser.Math.Clamp((b.speed - 760) / 290, 0, 1);
            this.speedLines.lineStyle(2, 0xffffff, 0.12 * intensity);
            for (let i = 0; i < 6; i++) {
                const yy = 60 + i * 70 + (i % 2) * 24;
                this.speedLines.beginPath();
                this.speedLines.moveTo(CONFIG.WIDTH - 30, yy);
                this.speedLines.lineTo(CONFIG.WIDTH - 30 - 50 * intensity, yy);
                this.speedLines.strokePath();
            }
        }
    }

    // floating grade stamp (world-anchored above the bike, drifts up)
    _stamp(label, color) {
        const t = this.add.text(this.bike.x, this.bike.y - 70, label, {
            fontFamily: 'JetBrains Mono, monospace', fontSize: '30px', color, fontStyle: 'bold'
        }).setDepth(12).setOrigin(0.5).setScale(0.6);
        this.tweens.add({ targets: t, scale: 1, duration: 160, ease: 'Back.easeOut' });
        this.tweens.add({ targets: t, alpha: 0, y: t.y - 40, delay: 500, duration: 450, onComplete: () => t.destroy() });
    }

    // tiny pump tick near the bike
    _tick(label, color) {
        const t = this.add.text(this.bike.x - 6, this.bike.y - 44, label, {
            fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', color, fontStyle: 'bold'
        }).setDepth(12).setOrigin(0.5).setAlpha(0.9);
        this.tweens.add({ targets: t, alpha: 0, y: t.y - 22, duration: 420, onComplete: () => t.destroy() });
    }

    _showSummary(score, best, isBest) {
        const W = CONFIG.WIDTH, H = CONFIG.HEIGHT;
        const mono = 'JetBrains Mono, monospace';
        const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x05080c, 0).setScrollFactor(0).setDepth(34);
        this.tweens.add({ targets: dim, fillAlpha: 0.62, duration: 260 });
        const els = [dim];
        const add = (y, str, size, color, origin) => {
            const o = this.add.text(W / 2, y, str, { fontFamily: mono, fontSize: size + 'px', color, fontStyle: 'bold' })
                .setScrollFactor(0).setDepth(35).setOrigin(0.5, origin == null ? 0.5 : origin);
            els.push(o); return o;
        };
        add(H * 0.30, 'RUN OVER', 13, '#ff8a6a');
        add(H * 0.42, String(score), 52, '#ffffff');
        add(H * 0.50, 'SCORE', 11, CONFIG.COLORS.HUD_DIM);
        add(H * 0.58, 'DISTANCE ' + Math.floor(this.bike.distance) + 'm   •   BEST ' + best, 14, CONFIG.COLORS.HUD);
        if (isBest) {
            const nb = add(H * 0.65, '★ NEW BEST ★', 14, CONFIG.COLORS.PERFECT);
            this.tweens.add({ targets: nb, alpha: { from: 1, to: 0.4 }, duration: 600, yoyo: true, repeat: -1 });
        }
        const again = add(H * 0.76, 'TAP / SPACE / R — RIDE AGAIN', 15, CONFIG.COLORS.ACCENT);
        this.tweens.add({ targets: again, alpha: { from: 1, to: 0.5 }, duration: 700, yoyo: true, repeat: -1 });
    }

    // ============ sky ============
    _drawSky() {
        const W = CONFIG.WIDTH, H = CONFIG.HEIGHT;
        const g = this.bg;
        const steps = 24;
        for (let i = 0; i < steps; i++) {
            const t = i / (steps - 1);
            const c = Phaser.Display.Color.Interpolate.ColorWithColor(
                Phaser.Display.Color.IntegerToColor(CONFIG.COLORS.SKY_TOP),
                Phaser.Display.Color.IntegerToColor(CONFIG.COLORS.SKY_BOT),
                steps - 1, i);
            g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
            g.fillRect(0, (H / steps) * i, W, H / steps + 1);
        }
        // distant ridge
        g.fillStyle(CONFIG.COLORS.HILL_FAR, 0.5);
        g.beginPath();
        g.moveTo(0, H * 0.62);
        for (let x = 0; x <= W; x += 40) {
            g.lineTo(x, H * 0.62 + Math.sin(x * 0.012) * 22 - 18);
        }
        g.lineTo(W, H); g.lineTo(0, H); g.closePath(); g.fillPath();
    }

    // ============ tiny WebAudio SFX (folded in for Phase 1) ============
    _initAudio() {
        try { this.actx = new (window.AudioContext || window.webkitAudioContext)(); }
        catch (e) { this.actx = null; }
    }
    _teardownAudio() { /* short one-shots; nothing persistent to stop */ }
    _updateMute() { this.muteText.setText(this.muted ? 'MUTED' : ''); }

    _blip(freq, freq2, dur, type, vol) {
        if (this.muted || !this.actx) return;
        if (this.actx.state === 'suspended') this.actx.resume();
        const ctx = this.actx, now = ctx.currentTime;
        const osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.type = type || 'sine';
        osc.frequency.setValueAtTime(freq, now);
        if (freq2) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq2), now + dur);
        gain.gain.setValueAtTime(vol || 0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(now); osc.stop(now + dur + 0.02);
    }
    _whoomp(boost) { this._blip(150 * (boost || 1), 70, 0.16, 'sine', 0.18); }
    _thud(hard) { this._blip(120, 50, 0.12 + hard * 0.1, 'triangle', 0.12 + hard * 0.14); }
    _crashSfx() {
        this._blip(90, 24, 0.5, 'sawtooth', 0.28);
        this._blip(1800, 120, 0.25, 'square', 0.08);
    }
}
