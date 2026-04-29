// SpriteFactory: generates all game textures procedurally at boot.
// Call SpriteFactory.generate(scene) ONCE in MenuScene.preload.
// All sprites are 16×24 unless noted (top-down character size).
// Body blocks are drawn in a marker color (0xff00ff) and tinted at runtime;
// other elements (head, helmet, shadow, etc.) are baked.

const SpriteFactory = (function () {
    const TINT_MARKER = 0xff00ff;   // body color slot, replaced via setTint

    // Skin tones for demographic head colors
    const SKIN = {
        normal:    0xfde68a,
        elderly:   0xe7d4b5,
        child:     0xfde68a,
        wheelchair:0xfde68a,
        drunk:     0xfde68a,
    };

    function _shadow(g) {
        g.fillStyle(0x000000, 0.32);
        g.fillEllipse(8, 22, 12, 3);
    }

    function _head(g, skinColor) {
        g.fillStyle(skinColor, 1);
        g.fillCircle(8, 5, 3);
        g.lineStyle(1, 0x000000, 0.7);
        g.strokeCircle(8, 5, 3);
        // hair tuft
        g.fillStyle(0x4a3216, 0.65);
        g.fillRect(6, 2, 4, 2);
    }

    function _torso(g, bodyColor = TINT_MARKER) {
        g.fillStyle(bodyColor, 1);
        g.fillRect(5, 8, 6, 8);
        g.lineStyle(1, 0x000000, 0.7);
        g.strokeRect(5, 8, 6, 8);
    }

    function _legs(g, leftY, rightY) {
        g.fillStyle(0x222222, 1);
        g.fillRect(5, leftY, 2, 4);
        g.fillRect(9, rightY, 2, 4);
    }

    // Generate four-frame walk cycle for a generic agent type.
    // Frame phases:
    //   0: legs even, body at 0
    //   1: left leg forward, body up 1px
    //   2: legs even, body at 0
    //   3: right leg forward, body up 1px
    function _genWalkCycle(scene, key, skinColor, bobAmount = 1) {
        const g = scene.make.graphics({ x: 0, y: 0, add: false });
        const frames = [
            { left: 17, right: 17, bob: 0 },
            { left: 16, right: 18, bob: -bobAmount },
            { left: 17, right: 17, bob: 0 },
            { left: 18, right: 16, bob: -bobAmount },
        ];
        frames.forEach((f, i) => {
            g.clear();
            _shadow(g);
            // Apply bob: shift everything except shadow up by `bob` pixels.
            const dy = f.bob;
            g.translateCanvas?.(0, dy);
            // (Phaser Graphics doesn't support translateCanvas; emulate via offset args.)
            // Re-draw with offsets baked in.
            g.fillStyle(SKIN.normal, 1).fillCircle(8, 5 + dy, 3);
            g.lineStyle(1, 0x000000, 0.7); g.strokeCircle(8, 5 + dy, 3);
            g.fillStyle(0x4a3216, 0.65).fillRect(6, 2 + dy, 4, 2);
            // torso (body color is tint marker → tinted at runtime)
            g.fillStyle(TINT_MARKER, 1).fillRect(5, 8 + dy, 6, 8);
            g.lineStyle(1, 0x000000, 0.7).strokeRect(5, 8 + dy, 6, 8);
            // arms (subtle, swing opposite of legs)
            const armLeft = i === 1 ? 10 + dy : i === 3 ? 8 + dy : 9 + dy;
            const armRight = i === 1 ? 8 + dy : i === 3 ? 10 + dy : 9 + dy;
            g.fillStyle(SKIN.normal, 1);
            g.fillRect(3, armLeft, 2, 3);
            g.fillRect(11, armRight, 2, 3);
            // legs
            _legs(g, f.left, f.right);
            // override head color if non-default
            if (skinColor !== SKIN.normal) {
                g.fillStyle(skinColor, 1).fillCircle(8, 5 + dy, 3);
                g.lineStyle(1, 0x000000, 0.7); g.strokeCircle(8, 5 + dy, 3);
                g.fillStyle(0x4a3216, 0.65).fillRect(6, 2 + dy, 4, 2);
            }
            g.generateTexture(`${key}-${i}`, 16, 24);
        });
        g.destroy();
    }

    function _genElderly(scene) {
        // Hunched: head/body shifted down 1px, smaller bob, gray hair
        const g = scene.make.graphics({ x: 0, y: 0, add: false });
        for (let i = 0; i < 4; i++) {
            g.clear();
            _shadow(g);
            const bob = (i === 1 || i === 3) ? 0 : 0;        // very mild
            const yOff = 1;
            g.fillStyle(SKIN.elderly, 1).fillCircle(8, 6 + yOff, 3);
            g.lineStyle(1, 0x000000, 0.7); g.strokeCircle(8, 6 + yOff, 3);
            g.fillStyle(0xb0aaa0, 1).fillRect(6, 4 + yOff, 4, 2); // gray hair
            g.fillStyle(TINT_MARKER, 1).fillRect(5, 9 + yOff, 6, 7);
            g.lineStyle(1, 0x000000, 0.7).strokeRect(5, 9 + yOff, 6, 7);
            // legs alternate slowly
            const leftY = (i === 1) ? 17 : 18;
            const rightY = (i === 3) ? 17 : 18;
            _legs(g, leftY, rightY);
            g.generateTexture(`agent-elderly-${i}`, 16, 24);
        }
        g.destroy();
    }

    function _genChild(scene) {
        // Smaller silhouette, faster bob, no hair tuft
        const g = scene.make.graphics({ x: 0, y: 0, add: false });
        for (let i = 0; i < 4; i++) {
            g.clear();
            g.fillStyle(0x000000, 0.3); g.fillEllipse(8, 22, 9, 2);
            const bob = (i % 2 === 1) ? -1 : 0;
            g.fillStyle(SKIN.child, 1).fillCircle(8, 7 + bob, 2.6);
            g.lineStyle(1, 0x000000, 0.7); g.strokeCircle(8, 7 + bob, 2.6);
            g.fillStyle(0x6b3f22, 0.9).fillRect(6, 5 + bob, 4, 2); // brown hair
            g.fillStyle(TINT_MARKER, 1).fillRect(6, 10 + bob, 4, 7);
            g.lineStyle(1, 0x000000, 0.7).strokeRect(6, 10 + bob, 4, 7);
            // small legs
            const leftY = (i === 1) ? 16 : 17;
            const rightY = (i === 3) ? 16 : 17;
            g.fillStyle(0x222222, 1);
            g.fillRect(6, leftY + bob, 1.5, 4);
            g.fillRect(9, rightY + bob, 1.5, 4);
            g.generateTexture(`agent-child-${i}`, 16, 24);
        }
        g.destroy();
    }

    function _genWheelchair(scene) {
        const g = scene.make.graphics({ x: 0, y: 0, add: false });
        for (let i = 0; i < 4; i++) {
            g.clear();
            g.fillStyle(0x000000, 0.32); g.fillEllipse(8, 22, 14, 3);
            // upper body
            g.fillStyle(SKIN.wheelchair, 1).fillCircle(8, 5, 3);
            g.lineStyle(1, 0x000000, 0.7); g.strokeCircle(8, 5, 3);
            g.fillStyle(0x4a3216, 0.65).fillRect(6, 2, 4, 2);
            g.fillStyle(TINT_MARKER, 1).fillRect(5, 8, 6, 7);
            g.lineStyle(1, 0x000000, 0.7).strokeRect(5, 8, 6, 7);
            // wheel — animated rotation by frame index
            const wheelColor = 0x222222;
            g.fillStyle(wheelColor, 1).fillCircle(3, 18, 2.5);
            g.fillCircle(13, 18, 2.5);
            // spokes rotate
            g.lineStyle(1, 0xaaaaaa, 1);
            const spokeAngle = (i / 4) * Math.PI;
            for (let s = 0; s < 4; s++) {
                const a = spokeAngle + (s * Math.PI / 2);
                g.lineBetween(3, 18, 3 + Math.cos(a) * 2, 18 + Math.sin(a) * 2);
                g.lineBetween(13, 18, 13 + Math.cos(a) * 2, 18 + Math.sin(a) * 2);
            }
            g.generateTexture(`agent-wheelchair-${i}`, 16, 24);
        }
        g.destroy();
    }

    function _genDrunk(scene) {
        // Wobbly: x-offset varies per frame, larger sway
        const g = scene.make.graphics({ x: 0, y: 0, add: false });
        for (let i = 0; i < 4; i++) {
            g.clear();
            _shadow(g);
            const wobble = i === 1 ? -1 : (i === 3 ? 1 : 0);
            const bob = (i % 2 === 1) ? -1 : 0;
            g.fillStyle(SKIN.drunk, 1).fillCircle(8 + wobble, 5 + bob, 3);
            g.lineStyle(1, 0x000000, 0.7); g.strokeCircle(8 + wobble, 5 + bob, 3);
            // messy hair
            g.fillStyle(0x6b3f22, 0.7).fillRect(5 + wobble, 1 + bob, 5, 3);
            g.fillStyle(TINT_MARKER, 1).fillRect(5 + wobble, 8 + bob, 6, 8);
            g.lineStyle(1, 0x000000, 0.7).strokeRect(5 + wobble, 8 + bob, 6, 8);
            const leftY = (i === 1) ? 16 : 18;
            const rightY = (i === 3) ? 16 : 18;
            _legs(g, leftY, rightY);
            g.generateTexture(`agent-drunk-${i}`, 16, 24);
        }
        g.destroy();
    }

    function _genMarshal(scene) {
        // Distinct: hi-vis vest (yellow tinted), red belt, blue helmet
        const g = scene.make.graphics({ x: 0, y: 0, add: false });
        for (let i = 0; i < 4; i++) {
            g.clear();
            g.fillStyle(0x000000, 0.36); g.fillEllipse(8, 22, 13, 3);
            const bob = (i % 2 === 1) ? -1 : 0;
            // helmet (blue + white shine)
            g.fillStyle(0x1e40af, 1).fillCircle(8, 5 + bob, 3.4);
            g.lineStyle(1, 0x000000, 0.7); g.strokeCircle(8, 5 + bob, 3.4);
            g.fillStyle(0xffffff, 0.55).fillCircle(7, 4 + bob, 1.2);
            // vest (high-vis yellow — tint marker for runtime panic flush)
            g.fillStyle(0xfbbf24, 1).fillRect(4, 8 + bob, 8, 9);
            g.lineStyle(1, 0x000000, 0.8).strokeRect(4, 8 + bob, 8, 9);
            // red belt stripe
            g.fillStyle(0xef4444, 1).fillRect(4, 13 + bob, 8, 1.5);
            // legs
            const leftY = (i === 1) ? 16 : 18;
            const rightY = (i === 3) ? 16 : 18;
            _legs(g, leftY, rightY);
            // arms
            g.fillStyle(SKIN.normal, 1);
            g.fillRect(3, 9 + bob, 2, 3);
            g.fillRect(11, 9 + bob, 2, 3);
            g.generateTexture(`marshal-${i}`, 16, 24);
        }
        g.destroy();
    }

    function _genInjured(scene) {
        const g = scene.make.graphics({ x: 0, y: 0, add: false });
        g.clear();
        g.fillStyle(0x000000, 0.4); g.fillEllipse(8, 22, 14, 4);
        // slumped body
        g.fillStyle(SKIN.normal, 1).fillCircle(8, 12, 3);
        g.lineStyle(1, 0x000000, 0.7); g.strokeCircle(8, 12, 3);
        g.fillStyle(0x666666, 1).fillRect(4, 14, 9, 6);
        g.lineStyle(1, 0x000000, 0.8).strokeRect(4, 14, 9, 6);
        // red cross
        g.fillStyle(0xef4444, 1);
        g.fillRect(7, 16, 3, 1);
        g.fillRect(8, 15, 1, 3);
        g.generateTexture('agent-injured', 16, 24);
        g.destroy();
    }

    function _genFire(scene) {
        // 4-frame flickering flame, 32×32
        const g = scene.make.graphics({ x: 0, y: 0, add: false });
        for (let i = 0; i < 4; i++) {
            g.clear();
            const flicker = i;
            // outer flame (orange)
            g.fillStyle(0xff6b1a, 0.85);
            const wobble = (flicker * 2) % 5 - 2;
            g.fillEllipse(16 + wobble, 18, 18, 22);
            // inner flame (yellow)
            g.fillStyle(0xfff080, 0.95);
            g.fillEllipse(16, 18 + (i % 2), 11, 14);
            // core (white-hot)
            g.fillStyle(0xffffff, 1);
            g.fillEllipse(16, 20, 5, 7);
            // sparks
            g.fillStyle(0xffd066, 1);
            g.fillCircle(16 + (i * 3 - 4), 6 + (i % 2), 1.5);
            g.fillCircle(16 - (i * 2 - 3), 8 - (i % 3), 1);
            g.generateTexture(`fire-${i}`, 32, 32);
        }
        g.destroy();
    }

    function _genTiles(scene) {
        const g = scene.make.graphics({ x: 0, y: 0, add: false });

        // Floor — three subtle variants
        for (let v = 0; v < 3; v++) {
            g.clear();
            const base = [0xddd5c8, 0xd5cdbf, 0xe2dad0][v];
            g.fillStyle(base, 1).fillRect(0, 0, 32, 32);
            // darker speckle
            g.fillStyle(0x000000, 0.06);
            for (let s = 0; s < 14; s++) {
                const x = ((v + 1) * 7 + s * 5) % 32;
                const y = ((v + 2) * 11 + s * 7) % 32;
                g.fillRect(x, y, 1, 1);
            }
            // subtle grout grid
            g.fillStyle(0x000000, 0.05);
            g.fillRect(0, 15, 32, 1);
            g.fillRect(15, 0, 1, 32);
            g.generateTexture(`tile-floor-${v}`, 32, 32);
        }

        // Wall — brick pattern
        g.clear();
        g.fillStyle(0x2a2a3a, 1).fillRect(0, 0, 32, 32);
        // bricks
        g.lineStyle(1, 0x000000, 0.5);
        for (let row = 0; row < 4; row++) {
            const offset = (row % 2) * 8;
            for (let col = 0; col < 4; col++) {
                const x = col * 8 + offset - 4;
                const y = row * 8;
                g.strokeRect(x, y, 8, 8);
            }
        }
        // mortar highlights
        g.fillStyle(0xffffff, 0.05);
        g.fillRect(0, 0, 32, 1);
        g.generateTexture('tile-wall', 32, 32);

        // Exit — green with chevron, 4-frame pulse
        for (let i = 0; i < 4; i++) {
            g.clear();
            const pulse = (i / 4);
            // base
            g.fillStyle(0x4ade80, 1).fillRect(0, 0, 32, 32);
            // glow ring
            g.lineStyle(2, 0xa7f3d0, 0.5 + pulse * 0.3);
            g.strokeRect(2, 2, 28, 28);
            // chevrons (down arrows)
            g.fillStyle(0x166534, 0.85);
            const cy = 16 + Math.sin(i * Math.PI / 2) * 2;
            g.fillTriangle(8, cy - 4, 16, cy + 4, 24, cy - 4);
            g.fillTriangle(8, cy - 8, 16, cy, 24, cy - 8);
            g.generateTexture(`tile-exit-${i}`, 32, 32);
        }
        g.destroy();
    }

    function _genSign(scene) {
        // 4 directional signs, 24×24
        const dirs = [
            { name: 'N', tip: { x: 12, y: 4 }, base: { x: 12, y: 18 } },
            { name: 'E', tip: { x: 20, y: 12 }, base: { x: 6, y: 12 } },
            { name: 'S', tip: { x: 12, y: 20 }, base: { x: 12, y: 6 } },
            { name: 'W', tip: { x: 4, y: 12 }, base: { x: 18, y: 12 } },
        ];
        const g = scene.make.graphics({ x: 0, y: 0, add: false });
        for (const d of dirs) {
            g.clear();
            // disc background
            g.fillStyle(0x4ade80, 1).fillCircle(12, 12, 9);
            g.lineStyle(2, 0xffffff, 1).strokeCircle(12, 12, 9);
            // arrow
            g.lineStyle(3, 0x064e3b, 1);
            g.lineBetween(d.base.x, d.base.y, d.tip.x, d.tip.y);
            // arrowhead
            g.fillStyle(0x064e3b, 1);
            const dx = d.tip.x - d.base.x;
            const dy = d.tip.y - d.base.y;
            const len = Math.hypot(dx, dy);
            const ux = dx / len, uy = dy / len;
            const nx = -uy, ny = ux;
            g.fillTriangle(
                d.tip.x, d.tip.y,
                d.tip.x - ux * 5 + nx * 4, d.tip.y - uy * 5 + ny * 4,
                d.tip.x - ux * 5 - nx * 4, d.tip.y - uy * 5 - ny * 4,
            );
            g.generateTexture(`sign-${d.name}`, 24, 24);
        }
        g.destroy();
    }

    function _genPa(scene) {
        // PA speaker, 24×24
        const g = scene.make.graphics({ x: 0, y: 0, add: false });
        g.clear();
        // speaker box
        g.fillStyle(0xfbbf24, 1).fillRect(6, 6, 12, 12);
        g.lineStyle(1.5, 0x000000, 0.85).strokeRect(6, 6, 12, 12);
        // grille
        g.fillStyle(0x000000, 0.6).fillCircle(12, 12, 4);
        g.fillStyle(0xfbbf24, 1).fillCircle(12, 12, 1.5);
        // sound waves to the right
        g.lineStyle(1.5, 0xfbbf24, 0.9);
        g.beginPath(); g.arc(16, 12, 5, -Math.PI / 4, Math.PI / 4); g.strokePath();
        g.beginPath(); g.arc(16, 12, 8, -Math.PI / 4, Math.PI / 4); g.strokePath();
        g.generateTexture('pa-speaker', 24, 24);
        g.destroy();
    }

    function _genParticles(scene) {
        const g = scene.make.graphics({ x: 0, y: 0, add: false });
        // 4×4 white puff (smoke/dust)
        g.clear();
        g.fillStyle(0xffffff, 1).fillCircle(2, 2, 2);
        g.generateTexture('puff', 4, 4);
        // 2×2 spark
        g.clear();
        g.fillStyle(0xffffff, 1).fillRect(0, 0, 2, 2);
        g.generateTexture('spark', 2, 2);
        // 6×6 confetti
        g.clear();
        g.fillStyle(0xffffff, 1).fillRect(0, 0, 6, 4);
        g.generateTexture('confetti', 6, 4);
        g.destroy();
    }

    function generate(scene) {
        if (window._exodusSpritesGenerated) return;
        window._exodusSpritesGenerated = true;

        // Walk-cycle agents (5 demographics)
        _genWalkCycle(scene, 'agent-normal', SKIN.normal, 1);
        _genElderly(scene);
        _genChild(scene);
        _genWheelchair(scene);
        _genDrunk(scene);

        // Other actors
        _genMarshal(scene);
        _genInjured(scene);

        // World
        _genFire(scene);
        _genTiles(scene);
        _genSign(scene);
        _genPa(scene);

        // Particles
        _genParticles(scene);
    }

    // Helper for SimScene: pick the texture key for an agent + walk frame
    function agentTextureKey(agent, frame) {
        if (agent.state === 'INJURED') return 'agent-injured';
        const f = frame & 3;
        switch (agent.type) {
            case 'elderly':    return `agent-elderly-${f}`;
            case 'child':      return `agent-child-${f}`;
            case 'wheelchair': return `agent-wheelchair-${f}`;
            case 'drunk':      return `agent-drunk-${f}`;
            default:           return `agent-normal-${f}`;
        }
    }

    // Body color tint per agent (multiplied with the texture's tint marker).
    // Modulated by panic for the "panic flush" toward red.
    function agentTint(agent, colorblind = false) {
        if (agent.state === 'INJURED') return 0xffffff;
        // Demographic base body color
        let r, g, b;
        switch (agent.type) {
            case 'elderly':    r = 0x78; g = 0x71; b = 0x6c; break;
            case 'child':      r = 0xfb; g = 0xbf; b = 0x24; break;
            case 'wheelchair': r = 0x93; g = 0x33; b = 0xea; break;
            case 'drunk':      r = 0xa8; g = 0x55; b = 0xf7; break;
            default:
                if (colorblind) {
                    // Blue→yellow gradient
                    r = Math.floor(0x33 + agent.panic * (0xfb - 0x33));
                    g = Math.floor(0x80 + agent.panic * (0xbf - 0x80));
                    b = Math.floor(0xee - agent.panic * (0xee - 0x24));
                } else {
                    // Green→red gradient
                    r = Math.floor(0x4a + agent.panic * (0xff - 0x4a));
                    g = Math.floor(0xde - agent.panic * (0xde - 0x44));
                    b = Math.floor(0x80 - agent.panic * (0x80 - 0x44));
                }
                return (r << 16) | (g << 8) | b;
        }
        // Demographic types: lift toward red as panic rises.
        const pf = agent.panic;
        r = Math.min(0xff, r + Math.floor(pf * (0xff - r) * 0.6));
        g = Math.max(0x00, g - Math.floor(pf * g * 0.2));
        b = Math.max(0x00, b - Math.floor(pf * b * 0.3));
        return (r << 16) | (g << 8) | b;
    }

    return { generate, agentTextureKey, agentTint };
})();
