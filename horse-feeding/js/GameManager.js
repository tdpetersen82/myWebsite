import * as THREE from 'three';
import { SceneSetup } from './SceneSetup.js';
import { HorseLoader } from './HorseLoader.js';
import { FoodManager } from './FoodManager.js';
import { ParticleEffects } from './ParticleEffects.js';
import { UIManager } from './UIManager.js';

class GameManager {
    constructor() {
        this.container = document.getElementById('game-container');
        this.sceneSetup = new SceneSetup(this.container);
        this.horse = new HorseLoader(this.sceneSetup.scene);
        this.food = new FoodManager(this.sceneSetup.scene);
        this.particles = new ParticleEffects(this.sceneSetup.scene);
        this.ui = new UIManager();
        this.clock = new THREE.Clock();
        this.saveTimer = 0;
        this.feedingInProgress = false;
        this.currentFeedType = null;

        this.ui.onFeedCallback = (foodType) => this.startFeeding(foodType);
        this.setupClickToFeed();

        this.loadHorse();
    }

    setupClickToFeed() {
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        this.sceneSetup.renderer.domElement.addEventListener('click', (e) => {
            if (this.feedingInProgress || this.ui.cooldown) return;
            if (!this.horse.model) return;

            const rect = this.sceneSetup.renderer.domElement.getBoundingClientRect();
            mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

            raycaster.setFromCamera(mouse, this.sceneSetup.camera);
            const intersects = raycaster.intersectObject(this.horse.model, true);

            if (intersects.length > 0) {
                this.startFeeding(this.ui.selectedFood);
            }
        });
    }

    async loadHorse() {
        try {
            await this.horse.load((progress) => {
                this.ui.setLoadingProgress(progress);
            });
            this.ui.hideLoading();
            this.animate();
        } catch (err) {
            console.error('Failed to load horse model:', err);
        }
    }

    startFeeding(foodType) {
        if (this.feedingInProgress) return;
        this.feedingInProgress = true;
        this.currentFeedType = foodType;

        this.ui.startCooldown();

        // Launch food toward horse mouth
        const target = this.horse.mouthPosition.clone();
        this.food.feed(foodType, target);
    }

    handleFoodEvent(event) {
        if (!event) return;

        if (event.event === 'arrived') {
            // Food reached the horse - start eating animation
            this.horse.playEat(() => {
                // After eating, play a small reaction
                this.horse.playReaction();
            });
            // Particle burst
            this.particles.burst(event.position, event.color);
            // Update score
            this.ui.addFeed(this.currentFeedType);
        } else if (event.event === 'consumed') {
            // Food fully consumed
            this.feedingInProgress = false;
            this.currentFeedType = null;
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        const delta = this.clock.getDelta();

        // Update systems
        this.horse.update(delta);
        const foodEvent = this.food.update(delta);
        this.handleFoodEvent(foodEvent);
        this.particles.update(delta);

        // Happiness decay
        this.ui.decayHappiness(delta);

        // Periodic save
        this.saveTimer += delta;
        if (this.saveTimer > 5) {
            this.saveTimer = 0;
            this.ui.saveState();
        }

        // Render
        this.sceneSetup.render();
    }
}

// Start the game
new GameManager();
