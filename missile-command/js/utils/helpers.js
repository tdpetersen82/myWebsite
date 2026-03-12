// ============================================================
// Missile Command — Utility Helpers
// ============================================================

const Helpers = {
    distance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    },

    angle(x1, y1, x2, y2) {
        return Math.atan2(y2 - y1, x2 - x1);
    },

    lerp(a, b, t) {
        return a + (b - a) * t;
    },

    clamp(val, min, max) {
        return Math.max(min, Math.min(max, val));
    },

    randomRange(min, max) {
        return min + Math.random() * (max - min);
    },

    randomInt(min, max) {
        return Math.floor(min + Math.random() * (max - min + 1));
    },

    randomChoice(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    },

    colorToHex(r, g, b) {
        return (r << 16) | (g << 8) | b;
    },

    hexToRgb(hex) {
        return {
            r: (hex >> 16) & 0xff,
            g: (hex >> 8) & 0xff,
            b: hex & 0xff,
        };
    },

    lerpColor(hex1, hex2, t) {
        const c1 = Helpers.hexToRgb(hex1);
        const c2 = Helpers.hexToRgb(hex2);
        return Helpers.colorToHex(
            Math.round(Helpers.lerp(c1.r, c2.r, t)),
            Math.round(Helpers.lerp(c1.g, c2.g, t)),
            Math.round(Helpers.lerp(c1.b, c2.b, t))
        );
    },

    // Nearest base index (0, 1, 2) to a given x coordinate
    nearestBase(x, bases) {
        let bestIdx = -1;
        let bestDist = Infinity;
        for (let i = 0; i < bases.length; i++) {
            if (bases[i].alive && bases[i].ammo > 0) {
                const d = Math.abs(x - bases[i].x);
                if (d < bestDist) {
                    bestDist = d;
                    bestIdx = i;
                }
            }
        }
        return bestIdx;
    },

    formatNumber(n) {
        return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    },
};
