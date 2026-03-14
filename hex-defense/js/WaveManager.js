// WaveManager.js — Wave definitions and enemy spawning (35 waves)

const WAVE_DEFS = [
    // Wave 1-5: Introduction
    { enemies: [{ type: 'scout', count: 6 }], interval: 0.8 },
    { enemies: [{ type: 'scout', count: 8 }, { type: 'soldier', count: 2 }], interval: 0.75 },
    { enemies: [{ type: 'soldier', count: 4 }, { type: 'scout', count: 6 }, { type: 'swarm', count: 3 }], interval: 0.7 },
    { enemies: [{ type: 'soldier', count: 6 }, { type: 'scout', count: 8 }], interval: 0.65 },
    { enemies: [{ type: 'boss', count: 1 }, { type: 'scout', count: 10 }], interval: 0.8 },

    // Wave 6-10: Escalation — tanks, splitters, swarms
    { enemies: [{ type: 'tank', count: 3 }, { type: 'soldier', count: 6 }, { type: 'swarm', count: 5 }], interval: 0.65 },
    { enemies: [{ type: 'splitter', count: 5 }, { type: 'scout', count: 10 }], interval: 0.6 },
    { enemies: [{ type: 'swarm', count: 15 }, { type: 'soldier', count: 4 }], interval: 0.35 },
    { enemies: [{ type: 'tank', count: 4 }, { type: 'splitter', count: 5 }, { type: 'scout', count: 8 }], interval: 0.55 },
    { enemies: [{ type: 'boss', count: 2 }, { type: 'tank', count: 4 }, { type: 'swarm', count: 8 }], interval: 0.6 },

    // Wave 11-15: Challenge — healer introduced
    { enemies: [{ type: 'healer', count: 2 }, { type: 'soldier', count: 10 }, { type: 'splitter', count: 4 }], interval: 0.5 },
    { enemies: [{ type: 'tank', count: 6 }, { type: 'splitter', count: 6 }, { type: 'swarm', count: 6 }], interval: 0.5 },
    { enemies: [{ type: 'swarm', count: 30 }], interval: 0.2 },
    { enemies: [{ type: 'healer', count: 3 }, { type: 'tank', count: 8 }, { type: 'soldier', count: 6 }], interval: 0.45 },
    { enemies: [{ type: 'boss', count: 3 }, { type: 'healer', count: 2 }, { type: 'splitter', count: 6 }], interval: 0.55 },

    // Wave 16-20: Endgame begins — boss+healer combos, large swarms
    { enemies: [{ type: 'tank', count: 10 }, { type: 'splitter', count: 8 }, { type: 'swarm', count: 10 }], interval: 0.35 },
    { enemies: [{ type: 'soldier', count: 15 }, { type: 'tank', count: 6 }, { type: 'healer', count: 3 }], interval: 0.35 },
    { enemies: [{ type: 'swarm', count: 25 }, { type: 'splitter', count: 10 }], interval: 0.25 },
    { enemies: [{ type: 'boss', count: 3 }, { type: 'healer', count: 3 }, { type: 'tank', count: 6 }], interval: 0.4 },
    { enemies: [{ type: 'boss', count: 4 }, { type: 'tank', count: 8 }, { type: 'splitter', count: 10 }], interval: 0.35 },

    // Wave 21-25: Gauntlet — all types, high counts
    { enemies: [{ type: 'swarm', count: 35 }, { type: 'healer', count: 4 }], interval: 0.18 },
    { enemies: [{ type: 'tank', count: 12 }, { type: 'soldier', count: 15 }, { type: 'splitter', count: 8 }], interval: 0.3 },
    { enemies: [{ type: 'boss', count: 3 }, { type: 'swarm', count: 20 }, { type: 'healer', count: 3 }], interval: 0.3 },
    { enemies: [{ type: 'splitter', count: 15 }, { type: 'tank', count: 10 }, { type: 'swarm', count: 15 }], interval: 0.25 },
    { enemies: [{ type: 'boss', count: 5 }, { type: 'healer', count: 4 }, { type: 'soldier', count: 10 }], interval: 0.35 },

    // Wave 26-30: Survival — very dense
    { enemies: [{ type: 'swarm', count: 40 }, { type: 'soldier', count: 20 }], interval: 0.15 },
    { enemies: [{ type: 'tank', count: 15 }, { type: 'healer', count: 5 }, { type: 'splitter', count: 12 }], interval: 0.25 },
    { enemies: [{ type: 'boss', count: 4 }, { type: 'swarm', count: 30 }, { type: 'tank', count: 8 }], interval: 0.2 },
    { enemies: [{ type: 'splitter', count: 20 }, { type: 'healer', count: 5 }, { type: 'soldier', count: 15 }], interval: 0.2 },
    { enemies: [{ type: 'boss', count: 6 }, { type: 'tank', count: 12 }, { type: 'healer', count: 4 }], interval: 0.3 },

    // Wave 31-35: Final stand — multi-boss waves with healer support
    { enemies: [{ type: 'swarm', count: 50 }, { type: 'healer', count: 6 }, { type: 'tank', count: 10 }], interval: 0.15 },
    { enemies: [{ type: 'boss', count: 5 }, { type: 'splitter', count: 18 }, { type: 'swarm', count: 20 }], interval: 0.2 },
    { enemies: [{ type: 'tank', count: 18 }, { type: 'healer', count: 6 }, { type: 'soldier', count: 20 }], interval: 0.18 },
    { enemies: [{ type: 'boss', count: 6 }, { type: 'healer', count: 5 }, { type: 'swarm', count: 25 }], interval: 0.2 },
    { enemies: [{ type: 'boss', count: 8 }, { type: 'tank', count: 15 }, { type: 'healer', count: 6 }, { type: 'splitter', count: 12 }], interval: 0.2 },
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

        // Build spawn queue
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
