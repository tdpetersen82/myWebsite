// WaveManager.js — Wave definitions and enemy spawning

const WAVE_DEFS = [
    // Wave 1-5: Introduction
    { enemies: [{ type: 'scout', count: 6 }], interval: 0.8 },
    { enemies: [{ type: 'scout', count: 8 }, { type: 'soldier', count: 2 }], interval: 0.7 },
    { enemies: [{ type: 'soldier', count: 6 }, { type: 'scout', count: 4 }], interval: 0.7 },
    { enemies: [{ type: 'soldier', count: 8 }, { type: 'scout', count: 6 }], interval: 0.6 },
    { enemies: [{ type: 'boss', count: 1 }, { type: 'scout', count: 8 }], interval: 0.8 },

    // Wave 6-10: Escalation
    { enemies: [{ type: 'tank', count: 3 }, { type: 'soldier', count: 6 }], interval: 0.7 },
    { enemies: [{ type: 'splitter', count: 5 }, { type: 'scout', count: 8 }], interval: 0.6 },
    { enemies: [{ type: 'tank', count: 4 }, { type: 'splitter', count: 4 }], interval: 0.6 },
    { enemies: [{ type: 'soldier', count: 10 }, { type: 'tank', count: 3 }, { type: 'scout', count: 8 }], interval: 0.5 },
    { enemies: [{ type: 'boss', count: 2 }, { type: 'tank', count: 4 }], interval: 0.7 },

    // Wave 11-15: Challenge
    { enemies: [{ type: 'splitter', count: 8 }, { type: 'soldier', count: 8 }], interval: 0.5 },
    { enemies: [{ type: 'tank', count: 6 }, { type: 'splitter', count: 6 }], interval: 0.5 },
    { enemies: [{ type: 'scout', count: 25 }], interval: 0.2 },
    { enemies: [{ type: 'tank', count: 8 }, { type: 'soldier', count: 10 }], interval: 0.4 },
    { enemies: [{ type: 'boss', count: 3 }, { type: 'splitter', count: 6 }], interval: 0.6 },

    // Wave 16-20: Endgame
    { enemies: [{ type: 'tank', count: 10 }, { type: 'splitter', count: 8 }], interval: 0.35 },
    { enemies: [{ type: 'soldier', count: 15 }, { type: 'tank', count: 6 }, { type: 'scout', count: 12 }], interval: 0.3 },
    { enemies: [{ type: 'splitter', count: 12 }, { type: 'tank', count: 8 }], interval: 0.3 },
    { enemies: [{ type: 'boss', count: 3 }, { type: 'tank', count: 12 }, { type: 'soldier', count: 10 }], interval: 0.35 },
    { enemies: [{ type: 'boss', count: 6 }, { type: 'tank', count: 8 }, { type: 'splitter', count: 12 }], interval: 0.3 },
];

export const TOTAL_WAVES = WAVE_DEFS.length;
export const BUILD_PHASE_DURATION = 12; // seconds

export class WaveManager {
    constructor() {
        this.currentWave = 0;
        this.spawnQueue = [];
        this.spawnTimer = 0;
        this.spawnInterval = 0;
        this.waveActive = false;
        this.allSpawned = false;
    }

    getWaveDef(waveNum) {
        if (waveNum < 1 || waveNum > WAVE_DEFS.length) return null;
        return WAVE_DEFS[waveNum - 1];
    }

    getNextWavePreview(waveNum) {
        const def = this.getWaveDef(waveNum);
        if (!def) return [];
        return def.enemies.map(e => ({ type: e.type, count: e.count }));
    }

    isBossWave(waveNum) {
        const def = this.getWaveDef(waveNum);
        if (!def) return false;
        return def.enemies.some(e => e.type === 'boss');
    }

    startWave(waveNum) {
        const def = this.getWaveDef(waveNum);
        if (!def) return;

        this.currentWave = waveNum;
        this.spawnQueue = [];
        this.spawnInterval = def.interval;
        this.spawnTimer = 0;
        this.waveActive = true;
        this.allSpawned = false;

        // Build spawn queue (shuffled order for variety)
        for (const group of def.enemies) {
            for (let i = 0; i < group.count; i++) {
                this.spawnQueue.push(group.type);
            }
        }

        // Shuffle spawn order (but keep bosses at end)
        const bosses = this.spawnQueue.filter(t => t === 'boss');
        const others = this.spawnQueue.filter(t => t !== 'boss');
        this.shuffleArray(others);
        this.spawnQueue = [...others, ...bosses];
    }

    shuffleArray(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }

    update(dt) {
        if (!this.waveActive || this.allSpawned) return null;

        this.spawnTimer += dt;
        if (this.spawnTimer >= this.spawnInterval && this.spawnQueue.length > 0) {
            this.spawnTimer = 0;
            const type = this.spawnQueue.shift();

            if (this.spawnQueue.length === 0) {
                this.allSpawned = true;
            }
            return type;
        }
        return null;
    }

    isWaveComplete(activeEnemyCount) {
        return this.allSpawned && activeEnemyCount === 0;
    }
}
