const State = { MENU: 0, PLAYING: 1, FELL: 2, WON: 3, GAMEOVER: 4 };

class GameManager {
    constructor(engine, canvas) {
        this.engine = engine;
        this.canvas = canvas;
        this.currentLevel = 0;
        this.lives = CONFIG.LIVES;
        this.timer = 0;
        this.state = State.MENU;
        this.scene = null;
        this.boardBuilder = null;
        this.physics = null;
        this.ball = null;
        this._ready = false;

        this.tilt = new TiltController(canvas);
        this.ui = new UIOverlay();

        // Bind buttons immediately — guard handlers with _ready check
        this.bindButtons();

        // Show loading state in menu
        const loadingEl = document.getElementById('loading-text');
        if (loadingEl) loadingEl.style.display = 'block';
        const startBtn = document.getElementById('btn-start');
        if (startBtn) startBtn.disabled = true;

        this.initScene().then(() => {
            this._ready = true;
            if (loadingEl) loadingEl.style.display = 'none';
            if (startBtn) { startBtn.disabled = false; startBtn.textContent = 'Start Game'; }
            this.ui.showMenu();
            this.ui.updateLives(this.lives);
            engine.runRenderLoop(() => this.animate());
            window.addEventListener('resize', () => engine.resize());
        });
    }

    async initScene() {
        this.scene = new BABYLON.Scene(this.engine);
        this.scene.clearColor = new BABYLON.Color4(0.1, 0.1, 0.18, 1);
        // Match Three.js right-handed coordinate system so camera orientation aligns
        this.scene.useRightHandedSystem = true;

        // Physics
        const havok = await HavokPhysics();
        const havokPlugin = new BABYLON.HavokPlugin(true, havok);
        this.scene.enablePhysics(new BABYLON.Vector3(0, -CONFIG.GRAVITY, 0), havokPlugin);

        // Camera — same orientation as Three.js (start top-left, goal bottom-right)
        const camera = new BABYLON.ArcRotateCamera('cam',
            Math.PI / 2,   // alpha — +Z side, matches Three.js camera position
            Math.PI / 5,   // beta (angle from top)
            CONFIG.CAMERA_HEIGHT,
            BABYLON.Vector3.Zero(), this.scene);
        camera.inputs.clear();

        // Lighting
        const ambient = new BABYLON.HemisphericLight('ambient', new BABYLON.Vector3(0, 1, 0), this.scene);
        ambient.intensity = 0.4;

        const dirLight = new BABYLON.DirectionalLight('dir', new BABYLON.Vector3(-1, -3, 1).normalize(), this.scene);
        dirLight.position = new BABYLON.Vector3(-8, 20, 8);
        dirLight.intensity = 0.8;

        const shadowGen = new BABYLON.ShadowGenerator(2048, dirLight);
        shadowGen.useBlurExponentialShadowMap = true;
        shadowGen.blurKernel = 16;
        this.shadowGen = shadowGen;

        this.loadLevel(0);
    }

    loadLevel(index) {
        if (this.boardBuilder) this.boardBuilder.dispose();
        if (this.ball) this.ball.dispose();

        const level = MAZE_LEVELS[index];
        this.boardBuilder = new BoardBuilder(this.scene, level);
        this.physics = new PhysicsWorld(this.scene, this.boardBuilder);
        this.ball = new BallController(this.scene, this.physics, this.boardBuilder.startPos, this.boardBuilder.group);

        this.shadowGen.addShadowCaster(this.ball.mesh);
        this.boardBuilder.group.getChildMeshes().forEach(m => {
            m.receiveShadows = true;
        });

        this.ui.updateLevel(level.name);
        this.ui.updateBest(index);
    }

    bindButtons() {
        document.getElementById('btn-start').addEventListener('click', () => {
            if (!this._ready) return;
            this.startGame();
        });
        document.getElementById('btn-next').addEventListener('click', () => {
            if (!this._ready) return;
            this.nextLevel();
        });
        document.getElementById('btn-retry-win').addEventListener('click', () => {
            if (!this._ready) return;
            this.retryLevel();
        });
        document.getElementById('btn-retry-go').addEventListener('click', () => {
            if (!this._ready) return;
            this.retryLevel();
        });
        document.getElementById('btn-menu-go').addEventListener('click', () => {
            if (!this._ready) return;
            this.backToMenu();
        });
    }

    startGame() {
        this.ui.hideMenu();
        this.lives = CONFIG.LIVES;
        this.timer = 0;
        this.state = State.PLAYING;
        this.tilt.active = true;
        this.ball.reset();
        this.ui.updateLives(this.lives);
    }

    nextLevel() {
        this.currentLevel = (this.currentLevel + 1) % MAZE_LEVELS.length;
        this.loadLevel(this.currentLevel);
        this.ui.hideWin();
        this.lives = CONFIG.LIVES;
        this.timer = 0;
        this.state = State.PLAYING;
        this.tilt.active = true;
        this.ball.reset();
        this.ui.updateLives(this.lives);
    }

    retryLevel() {
        this.loadLevel(this.currentLevel);
        this.ui.hideWin();
        this.ui.hideGameOver();
        this.lives = CONFIG.LIVES;
        this.timer = 0;
        this.state = State.PLAYING;
        this.tilt.active = true;
        this.ball.reset();
        this.ui.updateLives(this.lives);
    }

    backToMenu() {
        this.ui.hideGameOver();
        this.ui.hideWin();
        this.currentLevel = 0;
        this.loadLevel(0);
        this.state = State.MENU;
        this.tilt.active = false;
        this.ball.reset();
        this.ui.showMenu();
    }

    animate() {
        const dt = Math.min(this.engine.getDeltaTime() / 1000, 0.05);
        const time = performance.now() / 1000;

        this.tilt.update();

        if (this.state === State.PLAYING) {
            this.timer += dt;
            this.ui.updateTimer(this.timer);

            this.physics.setGravity(this.tilt.tiltX, this.tilt.tiltZ);
            this.ball.update(dt);

            if (this.ball.isInHole()) {
                this.ball.startFall();
                this.state = State.FELL;
                this.tilt.active = false;
            }

            if (this.ball.isOnGoal(this.boardBuilder.goalPos)) {
                this.state = State.WON;
                this.tilt.active = false;
                this.onWin();
            }
        } else if (this.state === State.FELL) {
            const done = this.ball.update(dt);
            if (done) {
                this.lives--;
                this.ui.updateLives(this.lives);
                if (this.lives <= 0) {
                    this.state = State.GAMEOVER;
                    this.ui.showGameOver();
                } else {
                    this.ball.restorePhysics();
                    this.ball.reset();
                    this.state = State.PLAYING;
                    this.tilt.active = true;
                }
            }
        }

        // Cosmetic board tilt — amplified for visible feedback
        if (this.boardBuilder) {
            this.boardBuilder.group.rotation.z = -this.tilt.tiltX * CONFIG.VISUAL_TILT_MULT;
            this.boardBuilder.group.rotation.x = this.tilt.tiltZ * CONFIG.VISUAL_TILT_MULT;
            this.boardBuilder.update(time);
        }

        this.scene.render();
    }

    onWin() {
        const key = CONFIG.LS_PREFIX + 'best_level_' + this.currentLevel;
        const prev = localStorage.getItem(key);
        const prevBest = prev ? parseFloat(prev) : Infinity;
        const isNewBest = this.timer < prevBest;
        if (isNewBest) {
            localStorage.setItem(key, this.timer.toFixed(2));
        }
        const best = isNewBest ? this.timer : prevBest;
        this.ui.showWin(this.timer, best, isNewBest);
        this.ui.updateBest(this.currentLevel);
    }
}

// Init
window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('renderCanvas');
    const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
    window._game = new GameManager(engine, canvas);
});
