const CONFIG = {
    // Camera
    CAMERA_FOV: 45,
    CAMERA_DISTANCE: 6,
    CAMERA_HEIGHT: 2.5,
    CAMERA_TARGET_Y: 1.0,

    // Model
    HORSE_MODEL_PATH: 'models/horse.gltf',
    HORSE_TARGET_HEIGHT: 2.0,

    // Lighting
    AMBIENT_INTENSITY: 0.6,
    DIR_LIGHT_INTENSITY: 1.2,
    DIR_LIGHT_POS: [5, 10, 7],
    HEMISPHERE_SKY: 0x87ceeb,
    HEMISPHERE_GROUND: 0x362907,

    // Gameplay
    FEED_COOLDOWN_MS: 2000,
    HAPPINESS_DECAY: 0.3,
    MAX_HAPPINESS: 100,
    INITIAL_HAPPINESS: 50,

    // Food definitions
    FOODS: {
        apple:  { color: 0xff2020, emoji: '🍎', happiness: 20, name: 'Apple' },
        carrot: { color: 0xff8c00, emoji: '🥕', happiness: 15, name: 'Carrot' },
        hay:    { color: 0xc8a84e, emoji: '🌾', happiness: 10, name: 'Hay' },
        sugar:  { color: 0xffffff, emoji: '🧊', happiness: 25, name: 'Sugar Cube' },
    },

    // Particles
    PARTICLE_COUNT: 40,
    PARTICLE_LIFETIME: 1.2,

    // localStorage keys
    LS_FEED_COUNT: 'horse_feeding_total_fed',
    LS_HAPPINESS: 'horse_feeding_happiness',

    // Scene
    BG_COLOR: 0x87ceeb,
    GROUND_COLOR: 0x4a7c2e,
    GROUND_SIZE: 30,

    // Animations
    CROSSFADE_DURATION: 0.3,
    EAT_DURATION: 2.5,
    FOOD_FLIGHT_DURATION: 0.8,
    FOOD_SHRINK_DURATION: 0.6,
};
