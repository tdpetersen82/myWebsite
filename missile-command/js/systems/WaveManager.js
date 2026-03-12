// ============================================================
// Missile Command — Wave Manager
// ============================================================

class WaveManager {
    constructor(difficulty) {
        this.difficulty = difficulty || CONFIG.DIFFICULTY.NORMAL;
        this.wave = 0;
        this.state = 'idle'; // idle, spawning, intermission, bonus, boss
        this.enemyMissilesRemaining = 0;
        this.enemyMissilesTotal = 0;
        this.spawnTimer = 0;
        this.spawnInterval = 0;
        this.bomberTimer = 0;
        this.satelliteTimer = 0;
        this.waveAnnouncementTimer = 0;
        this.intermissionTimer = 0;
        this.bonusWaveTimer = 0;
    }

    setDifficulty(diff) {
        this.difficulty = diff;
    }

    startNextWave() {
        this.wave++;
        this.state = 'announcement';
        this.waveAnnouncementTimer = 2000;

        // Calculate wave parameters
        const d = this.difficulty;
        this.enemyMissilesTotal = Math.min(
            d.missileCountBase + this.wave * d.missileCountPerWave,
            d.missileCountMax
        );
        this.enemyMissilesRemaining = this.enemyMissilesTotal;
        this.spawnInterval = Math.max(300, 1500 - this.wave * 60);
        this.spawnTimer = 500; // Brief delay before first spawn

        this.bomberTimer = this.wave >= 5 ? Helpers.randomRange(5000, 10000) : Infinity;
        this.satelliteTimer = this.wave >= 8 ? Helpers.randomRange(8000, 15000) : Infinity;
    }

    startBonusWave() {
        this.state = 'bonus';
        this.bonusWaveTimer = 15000; // 15 seconds of bonus
        this.enemyMissilesRemaining = 30;
        this.enemyMissilesTotal = 30;
        this.spawnInterval = 300;
        this.spawnTimer = 200;
    }

    isWaveComplete() {
        return this.enemyMissilesRemaining <= 0 && this.state === 'spawning';
    }

    isBonusWave() {
        return this.wave > 0 && this.wave % 5 === 0;
    }

    isBossWave() {
        return this.wave > 0 && this.wave % 10 === 0;
    }

    getWaveLabel() {
        if (this.isBossWave()) return 'BOSS WAVE ' + this.wave;
        if (this.isBonusWave()) return 'BONUS WAVE';
        return 'WAVE ' + this.wave;
    }

    getWaveSubtitle() {
        if (this.isBossWave()) return 'Prepare for heavy assault!';
        if (this.isBonusWave()) return 'Unlimited ammo — shoot for points!';
        if (this.wave <= 2) return 'Incoming missiles detected';
        if (this.wave <= 5) return 'MIRV missiles detected';
        if (this.wave <= 8) return 'Bombers approaching';
        return 'Full-scale attack incoming!';
    }

    update(dt) {
        const dtMs = dt * 1000;

        switch (this.state) {
            case 'announcement':
                this.waveAnnouncementTimer -= dtMs;
                if (this.waveAnnouncementTimer <= 0) {
                    if (this.isBonusWave()) {
                        this.startBonusWave();
                    } else {
                        this.state = 'spawning';
                    }
                }
                break;

            case 'bonus':
                this.bonusWaveTimer -= dtMs;
                this.spawnTimer -= dtMs;
                if (this.bonusWaveTimer <= 0 || this.enemyMissilesRemaining <= 0) {
                    this.state = 'intermission';
                    this.intermissionTimer = 3000;
                }
                break;

            case 'spawning':
                this.spawnTimer -= dtMs;
                if (this.bomberTimer < Infinity) this.bomberTimer -= dtMs;
                if (this.satelliteTimer < Infinity) this.satelliteTimer -= dtMs;
                break;

            case 'intermission':
                this.intermissionTimer -= dtMs;
                break;
        }
    }

    shouldSpawnMissile() {
        if ((this.state !== 'spawning' && this.state !== 'bonus') || this.enemyMissilesRemaining <= 0) return false;
        if (this.spawnTimer <= 0) {
            this.spawnTimer = this.spawnInterval;
            this.enemyMissilesRemaining--;
            return true;
        }
        return false;
    }

    shouldSpawnBomber() {
        if (this.state !== 'spawning' || this.wave < 5) return false;
        if (this.bomberTimer <= 0) {
            this.bomberTimer = Helpers.randomRange(8000, 15000);
            return true;
        }
        return false;
    }

    shouldSpawnSatellite() {
        if (this.state !== 'spawning' || this.wave < 8) return false;
        if (this.satelliteTimer <= 0) {
            this.satelliteTimer = Helpers.randomRange(15000, 25000);
            return true;
        }
        return false;
    }

    isIntermissionComplete() {
        return this.state === 'intermission' && this.intermissionTimer <= 0;
    }

    startIntermission() {
        this.state = 'intermission';
        this.intermissionTimer = 4000;
    }

    getEnemyType() {
        const roll = Math.random();
        if (this.isBossWave()) {
            if (roll < 0.3) return 'MIRV';
            if (roll < 0.5) return 'ARMORED';
            if (roll < 0.65) return 'FAST';
            if (roll < 0.75) return 'STEALTH';
            return 'BASIC';
        }
        if (this.wave >= 10 && roll < 0.1) return 'STEALTH';
        if (this.wave >= 7 && roll < 0.2) return 'ARMORED';
        if (this.wave >= 5 && roll < 0.3) return 'FAST';
        if (this.wave >= 3 && roll < 0.25) return 'MIRV';
        return 'BASIC';
    }

    getBomberType() {
        if (this.isBossWave()) return Math.random() < 0.5 ? 'HEAVY' : 'STANDARD';
        if (this.wave >= 10 && Math.random() < 0.3) return 'HEAVY';
        if (this.wave >= 8 && Math.random() < 0.2) return 'FAST';
        return 'STANDARD';
    }

    getSpeedMultiplier() {
        return this.difficulty.speedMultiplier;
    }

    getProgress() {
        if (this.enemyMissilesTotal === 0) return 1;
        return 1 - (this.enemyMissilesRemaining / this.enemyMissilesTotal);
    }
}
