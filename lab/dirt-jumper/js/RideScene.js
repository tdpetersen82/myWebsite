// Dirt Jumper — Phase 1 ride scene.
// Endless downhill: drop in, pump the track, send the jumps, stomp the landings.
// One generic bike; off-angle landing = bail = run ends. No tricks/upgrades yet.

class RideScene extends Phaser.Scene {
    constructor() { super({ key: 'RideScene' }); }

    init(data = {}) {
        this.autoStart = !!data.autoStart;
        this.started = false;
        this.runOver = false;
        this.paused = false;
        this.muted = this.muted || false;
        this._leaving = false;
    }

    preload() {
        this.load.image('rider-art', 'assets/rider-atlas-v1.png');
        this.load.json('rider-atlas', 'assets/rider-atlas.json');
    }

    create() {
        const W = CONFIG.WIDTH, H = CONFIG.HEIGHT;
        this.time.paused = false;

        // sky backdrop (fixed to the camera)
        this.bg = this.add.graphics().setScrollFactor(0).setDepth(0);
        this._drawSky();
        this.scenery = new Scenery(this);

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
        this.bikeArt = new BikeArt(this);
        this.bikeArt.update(this.bike);
        this.crash = null;

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

        // Each finger owns a control; releasing one never cancels another.
        if (this.input.manager.pointers.length < 4) this.input.addPointer(4 - this.input.manager.pointers.length);
        this._touchControls = new Map();
        const setTouch = pointer => {
            const action = pointer.y < CONFIG.HEIGHT - 100 ? 'pump'
                : pointer.x < 140 ? 'left' : pointer.x < 280 ? 'right' : 'pump';
            this._touchControls.set(pointer.id, action);
        };
        this.input.on('pointerdown', pointer => {
            if (!this.started) { this._dropIn(); return; }
            if (this.runOver) { this._restart(); return; }
            if (this.paused) { this._togglePause(); return; }
            setTouch(pointer);
        });
        this.input.on('pointermove', pointer => {
            if (pointer.isDown && this._touchControls.has(pointer.id)) setTouch(pointer);
        });
        const releaseTouch = pointer => this._touchControls.delete(pointer.id);
        this.input.on('pointerup', releaseTouch);
        this.input.on('pointerupoutside', releaseTouch);
        this.input.on('gameout', () => this._touchControls.clear());
        const onBlur = () => {
            this._touchControls.clear();
            if (this.started && !this.runOver && !this.paused) this._togglePause();
        };
        this.game.events.on('blur', onBlur);
        this.events.once('shutdown', () => this.game.events.off('blur', onBlur));
        try { this.best = Number(localStorage.getItem(CONFIG.BEST_KEY)) || 0; }
        catch (_) { this.best = 0; }

        this._initAudio();
        this._buildHUD();
        this._updateMute();

        // camera
        this.cam = this.cameras.main;
        this.cam.setBackgroundColor('#3a5a72');
        this._snapCamera();
        if (this.autoStart) this._dropIn();

        this.events.on('shutdown', () => { this._teardownAudio(); if (this.crash) this.crash.destroy(); });
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
            if (b.justGoodPump) { this._whoomp(); this._tick('PUMP +', CONFIG.COLORS.CLEAN); }
            if (b.justGoodRelease) { this._blip(230, 380, 0.12, 'sine', 0.08); this._tick('LIGHT +', CONFIG.COLORS.PERFECT); }
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
        this.scenery.draw(left);
        this.terrain.draw(this.terrainG, left, right, bottom);
        this.particles.draw(this.dustG);
        this.bikeG.clear();
        const groundY = this.terrain.heightAt(this.bike.x);
        const altitude = Math.max(0, groundY - this.bike.y);
        this.bikeG.fillStyle(0x282c24, 0.22 * Math.max(0.2, 1 - altitude / 220));
        this.bikeG.fillEllipse(this.bike.x, groundY + 3, Math.max(20, 68 - altitude * 0.16), 7);
        if (this.crash) this.crash.update(dtMs);
        else this.bikeArt.update(this.bike);

        this._updateHUD();
    }

    _readInput() {
        const c = this.cursors, k = this.keys;
        return {
            pump: c.down.isDown || k.s.isDown || [...this._touchControls.values()].includes('pump'),
            left: c.left.isDown || k.a.isDown || [...this._touchControls.values()].includes('left'),
            right: c.right.isDown || k.d.isDown || [...this._touchControls.values()].includes('right')
        };
    }

    // ============ camera ============
    _camTarget() {
        const bp = this.crash ? this.crash.focus() : this.bike.bodyPoint();
        return {
            x: bp.x + 190 + Math.min(65, this.bike.speed * 0.08) - CONFIG.WIDTH / 2,        // look ahead (downhill is to the right)
            y: bp.y - CONFIG.HEIGHT * 0.61
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
            this.particles.burst(info.x, info.y, 26, CONFIG.COLORS.DUST, 1.4);
            this.cam.shake(360, 0.014);
            this._crashSfx();
            this._stamp('BAIL', CONFIG.COLORS.BAIL);
            return;
        }
        const colorMap = { perfect: CONFIG.COLORS.PERFECT, clean: CONFIG.COLORS.CLEAN, sketchy: CONFIG.COLORS.SKETCHY };
        const hardness = Phaser.Math.Clamp(info.hardness / 600, 0, 1);
        this.particles.burst(info.x, info.y, 10 + Math.floor(hardness * 18), CONFIG.COLORS.DUST, 0.7 + hardness);
        this.cam.shake(90 + hardness * 100, 0.001 + hardness * 0.003);
        this._thud(hardness);
        if (info.airTime > 0.25) {
            const label = info.grade.toUpperCase();
            this._stamp(label, colorMap[info.grade]);
        }
    }

    _endRun() {
        this.runOver = true;
        this._touchControls.clear();       // a finger held at the crash can't pump into the summary
        const score = this.bike.scoreValue();
        const prev = this.best;
        const isBest = score > prev;
        if (isBest) {
            this.best = score;
            try { localStorage.setItem(CONFIG.BEST_KEY, String(score)); } catch (_) {}
        }
        this.bikeArt.update(this.bike);
        this.crash = new CrashRig(this.bikeArt, this.bike, this.terrain);
        this.time.delayedCall(2300, () => this._showSummary(score, Math.max(prev, score), isBest));
    }

    _restart() {
        if (this._leaving) return;
        this._leaving = true;
        this._teardownAudio();
        this.scene.restart({ autoStart: true });
    }

    _togglePause() {
        if (!this.started || this.runOver) return;
        this._touchControls.clear();       // don't carry a held-finger pump across a pause toggle
        this.paused = !this.paused;
        if (this.paused) { this.time.paused = true; this.tweens.pauseAll(); }
        else { this.time.paused = false; this.tweens.resumeAll(); }
        this.pauseText.setVisible(this.paused);
        this.pausePanel.setVisible(this.paused);
    }

    // ============ HUD ============
    _buildHUD() {
        const W = CONFIG.WIDTH, H = CONFIG.HEIGHT;
        const font = 'Arial, Helvetica, sans-serif';
        const mk = (x, y, str, size, color, origin = [0, 0]) => this.add.text(x, y, str, {
            fontFamily: font, fontSize: size + 'px', color, fontStyle: 'bold'
        }).setResolution(2).setScrollFactor(0).setDepth(20).setOrigin(...origin);
        this.hud = {};
        const panel = this.add.graphics().setScrollFactor(0).setDepth(19);
        panel.fillStyle(0x163b3b, 0.85);
        panel.fillRoundedRect(22, 20, 146, 66, 10);
        panel.fillRoundedRect(W - 191, 20, 169, 66, 10);
        this.hud.speed = mk(37, 27, '26', 31, '#fff1d7');
        mk(92, 47, 'MPH', 10, '#baccc0');
        this.hud.distance = mk(37, 66, '0 m', 10, '#baccc0');
        this.hud.score = mk(W - 37, 27, '0', 31, '#fff1d7', [1, 0]);
        this.hud.best = mk(W - 37, 66, 'BEST 0', 10, '#baccc0', [1, 0]);
        this.hud.flow = mk(W / 2, 23, 'FLOW ×1.00', 12, '#183d3b', [0.5, 0]);
        this.flowBar = this.add.graphics().setScrollFactor(0).setDepth(20);
        this.hud.coach = mk(W / 2, 65, '', 12, '#163b3b', [0.5, 0]);
        this.touchLabels = [];
        this.touchPanels = [];
        this.hasTouch = this.sys.game.device.input.touch;
        for (const [x, width, label] of [[22, 106, '← LEAN'], [150, 106, 'LEAN →'], [W - 170, 148, 'PUMP ↓']]) {
            const box = this.add.graphics().setScrollFactor(0).setDepth(19);
            box.fillStyle(0x173c38, 0.82); box.fillRoundedRect(x, H - 80, width, 58, 12);
            box.lineStyle(1, 0xf2d6a8, 0.35); box.strokeRoundedRect(x, H - 80, width, 58, 12);
            box.setVisible(this.hasTouch);
            this.touchPanels.push(box);
            this.touchLabels.push(mk(x + width / 2, H - 51, label, 13, '#fff1d7', [0.5, 0.5]).setVisible(this.hasTouch));
        }
        this.keyboardHint = mk(24, H - 25, '↓ / S  PUMP     ← → / A D  LEAN', 10, '#ddc39f').setVisible(!this.hasTouch);
        this.speedLines = this.add.graphics().setScrollFactor(0).setDepth(18);
        this.pausePanel = this.add.rectangle(W / 2, H / 2, 440, 140, 0x142f31, 0.95)
            .setScrollFactor(0).setDepth(39).setVisible(false);
        this.pauseText = mk(W / 2, H / 2, 'PAUSED\n\nTAP / P / ESC resume    R restart', 19, '#fff1d7', [0.5, 0.5])
            .setDepth(40).setAlign('center').setVisible(false);
        this.muteText = mk(W - 24, H - 8, '', 10, '#ddc39f', [1, 1]).setDepth(40);

        // The title leaves the landscape visible and gives the rider room.
        const card = this.add.graphics().setScrollFactor(0).setDepth(30);
        card.fillStyle(0x163b3b, 0.96); card.fillRoundedRect(460, 118, 460, 332, 16);
        card.fillStyle(0xeda159, 1); card.fillRoundedRect(488, 146, 36, 4, 2);
        const tag = mk(537, 141, 'LIMESTONE TRAILS / 01', 11, '#aac4b7').setDepth(31);
        const title = mk(487, 166, 'DIRT JUMPER', 46, '#fff0d2').setDepth(31);
        const subtitle = mk(490, 225, 'Find the rhythm. Send the next jump.', 16, '#d9ddc9').setDepth(31);
        const help = mk(490, 267, '01   Hold pump down the back of each roller.\n02   Release uphill: carry speed + boost your pop.\n03   Feather lean in the air. Land with the slope.', 12, '#b6cbbd').setDepth(31).setLineSpacing(10);
        card.fillStyle(0xeea15b, 1); card.fillRoundedRect(488, 367, 404, 53, 8);
        const prompt = mk(690, 394, 'DROP IN    /    TAP OR SPACE', 15, '#193b38', [0.5, 0.5]).setDepth(31);
        this._startOverlay = [card, tag, title, subtitle, help, prompt];
    }

    _updateHUD() {
        const b = this.bike;
        const mph = Math.round(b.speed * 0.12 / 1.609344); // convert the existing speed scale to miles/hour
        this.hud.speed.setText(String(mph));
        this.hud.distance.setText(Math.floor(b.distance / 10) + ' m');
        this.hud.score.setText(String(b.scoreValue()));
        const best = this.best;
        this.hud.best.setText('BEST ' + Math.max(best, b.scoreValue()));

        this.hud.flow.setText('FLOW ×' + (1 + b.flow * CONFIG.FLOW_SCORE_MULT).toFixed(2));
        this.flowBar.clear();
        this.flowBar.fillStyle(0x173c38, 0.15); this.flowBar.fillRoundedRect(410, 44, 140, 5, 2);
        if (b.flow > 0) {
            this.flowBar.fillStyle(0x285a4e, 1);
            this.flowBar.fillRoundedRect(410, 44, Math.max(4, 140 * b.flow / CONFIG.FLOW_MAX), 5, 2);
        }

        const input = this._readInput();
        this.touchLabels.forEach((label, i) => label.setColor(
            input[['left', 'right', 'pump'][i]] ? CONFIG.COLORS.PERFECT : CONFIG.COLORS.HUD));
        const slope = this.terrain.slopeAt(b.x);
        this.hud.coach.setText(!this.started || this.runOver ? '' : b.airborne
            ? 'AIR  /  FEATHER YOUR LEAN'
            : slope > 0.025 ? '↓  PUMP'
            : slope < -0.025 ? (b.releasePower > 0 ? '↑  LIGHT / CARRY SPEED' : '↑  RELEASE') : 'FIND YOUR FLOW');
        this.hud.coach.setColor('#23483f');

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
        const t = this.add.text(this.bike.x, this.bike.y - 98, label, {
            fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '30px', color, fontStyle: 'bold'
        }).setDepth(12).setOrigin(0.5).setScale(0.6);
        this.tweens.add({ targets: t, scale: 1, duration: 160, ease: 'Back.easeOut' });
        this.tweens.add({ targets: t, alpha: 0, y: t.y - 40, delay: 500, duration: 450, onComplete: () => t.destroy() });
    }

    // tiny pump tick near the bike
    _tick(label, color) {
        const t = this.add.text(this.bike.x - 6, this.bike.y - 88, label, {
            fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '13px', color, fontStyle: 'bold'
        }).setDepth(12).setOrigin(0.5).setAlpha(0.9);
        this.tweens.add({ targets: t, alpha: 0, y: t.y - 22, duration: 420, onComplete: () => t.destroy() });
    }

    _showSummary(score, best, isBest) {
        const W = CONFIG.WIDTH, H = CONFIG.HEIGHT;
        const mono = 'Arial, Helvetica, sans-serif';
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
        add(H * 0.58, 'DISTANCE ' + Math.floor(this.bike.distance / 10) + 'm   •   BEST ' + best, 14, CONFIG.COLORS.HUD);
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
        const steps = 128;
        for (let i = 0; i < steps; i++) {
            const t = i / (steps - 1);
            const c = Phaser.Display.Color.Interpolate.ColorWithColor(
                Phaser.Display.Color.IntegerToColor(CONFIG.COLORS.SKY_TOP),
                Phaser.Display.Color.IntegerToColor(CONFIG.COLORS.SKY_BOT),
                steps - 1, i);
            g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
            g.fillRect(0, (H / steps) * i, W, H / steps + 1);
        }

    }

    // ============ tiny WebAudio SFX (folded in for Phase 1) ============
    _initAudio() {
        try { this.actx = new (window.AudioContext || window.webkitAudioContext)(); }
        catch (e) { this.actx = null; }
    }
    _teardownAudio() {
        if (this.actx) { this.actx.close().catch(() => {}); this.actx = null; }
    }
    _updateMute() { this.muteText.setText(this.muted ? 'MUTED  /  M' : 'P  PAUSE    R  RESTART    M  SOUND'); }

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
