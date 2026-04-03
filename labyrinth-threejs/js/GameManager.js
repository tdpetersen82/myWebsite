import * as THREE from 'three';
import { CameraManager } from './CameraManager.js';
import { LightingManager } from './LightingManager.js';
import { BoardBuilder } from './BoardBuilder.js';
import { PhysicsWorld } from './PhysicsWorld.js';
import { BallController } from './BallController.js';
import { TiltController } from './TiltController.js';
import { UIOverlay } from './UIOverlay.js';

const State = { MENU: 0, PLAYING: 1, FELL: 2, WON: 3, GAMEOVER: 4 };

class GameManager {
    constructor() {
        this.container = document.getElementById('game-container');
        this.currentLevel = 0;
        this.lives = CONFIG.LIVES;
        this.timer = 0;
        this.state = State.MENU;

        this.initRenderer();
        this.cameraManager = new CameraManager(this.renderer);
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a2e);
        this.lighting = new LightingManager(this.scene);
        this.ui = new UIOverlay(this.container);
        this.tilt = new TiltController(this.renderer.domElement);

        this.loadLevel(0);
        this.ui.showMenu();
        this.ui.updateLives(this.lives);

        this.bindButtons();
        this.clock = new THREE.Clock();
        this.animate();
    }

    initRenderer() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        const w = this.container.clientWidth;
        const h = this.container.clientHeight;
        this.renderer.setSize(w, h);
        this.container.appendChild(this.renderer.domElement);
    }

    loadLevel(index) {
        // Clear existing
        if (this.boardBuilder) {
            this.scene.remove(this.boardBuilder.group);
        }
        if (this.ball) {
            this.scene.remove(this.ball.mesh);
        }

        const level = MAZE_LEVELS[index];
        this.boardBuilder = new BoardBuilder(this.scene, level);
        this.physics = new PhysicsWorld(this.boardBuilder);
        this.ball = new BallController(this.scene, this.physics, this.boardBuilder.startPos);
        this.ui.updateLevel(level.name);
        this.ui.updateBest(index);
    }

    bindButtons() {
        document.getElementById('btn-start').addEventListener('click', () => this.startGame());
        document.getElementById('btn-next').addEventListener('click', () => this.nextLevel());
        document.getElementById('btn-retry-win').addEventListener('click', () => this.retryLevel());
        document.getElementById('btn-retry-go').addEventListener('click', () => this.retryLevel());
        document.getElementById('btn-menu-go').addEventListener('click', () => this.backToMenu());
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
        requestAnimationFrame(() => this.animate());
        const dt = Math.min(this.clock.getDelta(), 0.05);
        const time = this.clock.elapsedTime;

        this.tilt.update();

        if (this.state === State.PLAYING) {
            this.timer += dt;
            this.ui.updateTimer(this.timer);

            this.physics.setGravity(this.tilt.tiltX, this.tilt.tiltZ);
            this.physics.step(dt);
            this.ball.update(dt);

            // Check hole
            if (this.ball.isInHole()) {
                this.ball.startFall();
                this.state = State.FELL;
                this.tilt.active = false;
            }

            // Check goal
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
                    // Reset ball, continue playing
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

        this.renderer.render(this.scene, this.cameraManager.camera);
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
window._game = new GameManager();
