// ============================================================
// Q*bert — Game Configuration
// ============================================================

const CONFIG = {
    WIDTH: 800,
    HEIGHT: 600,

    // Pyramid
    PYRAMID_ROWS: 7,
    CUBE_WIDTH: 64,
    CUBE_HEIGHT: 32,
    CUBE_DEPTH: 40,
    PYRAMID_OFFSET_X: 400,
    PYRAMID_OFFSET_Y: 80,

    // Player
    LIVES: 3,
    JUMP_DURATION: 300,   // ms for jump animation
    INVINCIBLE_TIME: 2000,

    // Enemies
    COILY_SPAWN_INTERVAL: 8000,
    SLICK_SAM_SPAWN_INTERVAL: 10000,
    ENEMY_JUMP_DURATION: 400,
    COILY_CHASE_INTERVAL: 1200,
    SLICK_SAM_JUMP_INTERVAL: 1500,

    // Flying discs
    DISC_RIDE_DURATION: 1200,

    // Scoring
    SCORE_COLOR_CHANGE: 25,
    SCORE_COILY_KILL: 500,
    SCORE_SLICK_SAM_CATCH: 300,
    SCORE_LEVEL_BONUS: 1000,
    SCORE_DISC_BONUS: 50,

    // Difficulty per level
    LEVELS: [
        // Level 1: single color change
        {
            startColor: 0,
            targetColor: 1,
            maxColor: 1,
            revertsOnExtra: false,
            coilySpeed: 1400,
            slickSamSpeed: 1800,
            maxEnemies: 2,
            discCount: 2
        },
        // Level 2: single color change, faster
        {
            startColor: 0,
            targetColor: 1,
            maxColor: 1,
            revertsOnExtra: false,
            coilySpeed: 1200,
            slickSamSpeed: 1600,
            maxEnemies: 3,
            discCount: 2
        },
        // Level 3: two color changes needed
        {
            startColor: 0,
            targetColor: 2,
            maxColor: 2,
            revertsOnExtra: false,
            coilySpeed: 1100,
            slickSamSpeed: 1500,
            maxEnemies: 3,
            discCount: 2
        },
        // Level 4: two changes, colors revert on extra hop
        {
            startColor: 0,
            targetColor: 2,
            maxColor: 2,
            revertsOnExtra: true,
            coilySpeed: 1000,
            slickSamSpeed: 1400,
            maxEnemies: 4,
            discCount: 3
        },
        // Level 5: cycling colors (3 states), revert
        {
            startColor: 0,
            targetColor: 2,
            maxColor: 2,
            revertsOnExtra: true,
            coilySpeed: 900,
            slickSamSpeed: 1300,
            maxEnemies: 4,
            discCount: 3
        },
        // Level 6+: hard
        {
            startColor: 0,
            targetColor: 2,
            maxColor: 2,
            revertsOnExtra: true,
            coilySpeed: 800,
            slickSamSpeed: 1200,
            maxEnemies: 5,
            discCount: 3
        }
    ],

    // Color palettes per level (index = color state)
    // Each entry: { top, left, right }
    COLOR_PALETTES: [
        // Palette 0 (levels 1-2)
        [
            { top: 0x4444ff, left: 0x2222aa, right: 0x3333cc },  // State 0: blue
            { top: 0xffff00, left: 0xccaa00, right: 0xddcc00 },  // State 1: yellow
            { top: 0xff4444, left: 0xaa2222, right: 0xcc3333 },  // State 2: red
        ],
        // Palette 1 (levels 3-4)
        [
            { top: 0x44cc44, left: 0x228822, right: 0x33aa33 },  // State 0: green
            { top: 0xff8800, left: 0xcc6600, right: 0xdd7700 },  // State 1: orange
            { top: 0xff44ff, left: 0xaa22aa, right: 0xcc33cc },  // State 2: magenta
        ],
        // Palette 2 (levels 5+)
        [
            { top: 0x00cccc, left: 0x008888, right: 0x00aaaa },  // State 0: cyan
            { top: 0xffcc00, left: 0xcc9900, right: 0xddbb00 },  // State 1: gold
            { top: 0xff2222, left: 0xaa1111, right: 0xcc1a1a },  // State 2: bright red
        ]
    ],

    // Get level config (clamp to last defined)
    getLevelConfig(level) {
        const idx = Math.min(level - 1, this.LEVELS.length - 1);
        return this.LEVELS[idx];
    },

    // Get color palette for level
    getColorPalette(level) {
        const paletteIdx = Math.min(Math.floor((level - 1) / 2), this.COLOR_PALETTES.length - 1);
        return this.COLOR_PALETTES[paletteIdx];
    }
};
