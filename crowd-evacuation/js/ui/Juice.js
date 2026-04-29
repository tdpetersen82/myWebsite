// Juice: small reusable tween helpers for game-feel polish.
// All functions take a Phaser scene + target object. Side-effect only.

const Juice = (function () {

    // Hover scale: button grows on pointerover, shrinks back on pointerout.
    function hoverScale(scene, obj, factor = 1.05) {
        if (!obj || obj._juiceHoverApplied) return;
        obj._juiceHoverApplied = true;
        const orig = { sx: obj.scaleX || 1, sy: obj.scaleY || 1 };
        obj.on('pointerover', () => {
            scene.tweens.add({ targets: obj, scaleX: orig.sx * factor, scaleY: orig.sy * factor, duration: 120, ease: 'Quad.easeOut' });
        });
        obj.on('pointerout', () => {
            scene.tweens.add({ targets: obj, scaleX: orig.sx, scaleY: orig.sy, duration: 120, ease: 'Quad.easeOut' });
        });
    }

    // Click punch: brief squash on pointerdown.
    function clickPunch(scene, obj, factor = 0.92) {
        if (!obj || obj._juiceClickApplied) return;
        obj._juiceClickApplied = true;
        obj.on('pointerdown', () => {
            scene.tweens.add({
                targets: obj, scaleX: factor, scaleY: factor,
                duration: 70, yoyo: true, ease: 'Quad.easeIn',
            });
        });
    }

    // Slide-in: fade-up element from below its target Y.
    function slideIn(scene, obj, fromOffsetY = 30, duration = 280) {
        if (!obj) return;
        const targetY = obj.y;
        obj.y = targetY + fromOffsetY;
        obj.alpha = 0;
        scene.tweens.add({
            targets: obj, y: targetY, alpha: 1, duration, ease: 'Quart.easeOut',
        });
    }

    // Slide-in from above (good for HUD banners / modals appearing).
    function slideInTop(scene, obj, fromOffsetY = -30, duration = 280) {
        slideIn(scene, obj, fromOffsetY, duration);
    }

    // Pop in: scale 0 → 1 with ease-back overshoot.
    function popIn(scene, obj, duration = 320) {
        if (!obj) return;
        obj.setScale(0);
        obj.alpha = 0;
        scene.tweens.add({
            targets: obj, scaleX: 1, scaleY: 1, alpha: 1,
            duration, ease: 'Back.easeOut',
        });
    }

    // Drop with bounce — used for stars on results screen.
    function drop(scene, obj, fromOffsetY = -80, duration = 600, delay = 0) {
        if (!obj) return;
        const targetY = obj.y;
        obj.y = targetY + fromOffsetY;
        obj.alpha = 0;
        scene.tweens.add({
            targets: obj, alpha: 1, duration: duration / 4, delay, ease: 'Quad.easeIn',
        });
        scene.tweens.add({
            targets: obj, y: targetY, duration, delay, ease: 'Bounce.easeOut',
        });
    }

    // Number count-up tween. Pass a text object that has setText.
    function countUp(scene, textObj, from, to, duration = 800, formatter = null) {
        if (!textObj) return;
        const fmt = formatter || (n => `${Math.round(n)}`);
        const state = { v: from };
        textObj.setText(fmt(from));
        scene.tweens.add({
            targets: state, v: to, duration, ease: 'Quad.easeOut',
            onUpdate: () => textObj.setText(fmt(state.v)),
        });
    }

    // Continuous breathing pulse — gentle scale up/down.
    function pulse(scene, obj, peakScale = 1.04, periodMs = 1800) {
        if (!obj || obj._juicePulseApplied) return;
        obj._juicePulseApplied = true;
        const baseSx = obj.scaleX || 1, baseSy = obj.scaleY || 1;
        scene.tweens.add({
            targets: obj,
            scaleX: baseSx * peakScale, scaleY: baseSy * peakScale,
            duration: periodMs / 2, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });
    }

    // Bob — vertical floating animation.
    function bob(scene, obj, amplitude = 2, periodMs = 3000) {
        if (!obj || obj._juiceBobApplied) return;
        obj._juiceBobApplied = true;
        const baseY = obj.y;
        scene.tweens.add({
            targets: obj, y: baseY + amplitude,
            duration: periodMs / 2, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });
    }

    // Apply standard interactivity to an arbitrary clickable object.
    // Wires hover scale + click punch + cursor + click sound.
    function makeButton(scene, obj, opts = {}) {
        const { hoverFactor = 1.05, clickFactor = 0.92, sound = 'click' } = opts;
        obj.setInteractive({ useHandCursor: true });
        hoverScale(scene, obj, hoverFactor);
        clickPunch(scene, obj, clickFactor);
        obj.on('pointerdown', () => {
            if (sound && window.exodusAudio) {
                window.exodusAudio[sound]?.();
            }
        });
    }

    // Camera shake helper (Phaser native but with sane defaults).
    function shake(scene, ms = 200, intensity = 0.005) {
        scene.cameras?.main?.shake(ms, intensity);
    }
    function flash(scene, ms = 200, r = 255, g = 255, b = 255) {
        scene.cameras?.main?.flash(ms, r, g, b);
    }

    // Hit-pause: freeze sim time briefly. Caller must check scene._frozenUntil
    // in its update loop.
    function hitPause(scene, ms = 80) {
        const now = (scene.time && scene.time.now) || performance.now();
        scene._frozenUntil = now + ms;
    }
    function isFrozen(scene) {
        const now = (scene.time && scene.time.now) || performance.now();
        return scene._frozenUntil && now < scene._frozenUntil;
    }

    return {
        hoverScale, clickPunch, slideIn, slideInTop, popIn, drop, countUp,
        pulse, bob, makeButton, shake, flash, hitPause, isFrozen,
    };
})();
