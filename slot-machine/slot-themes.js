/* eslint-disable */
// Three visual themes for the slot machine. Mechanics are identical across
// themes — only the sprite row + accent palette differs. spriteRow is the
// 0-indexed row in assets/sprites.png (256px per row); symbolNames are display
// labels read out for accessibility and the paytable hint card.
window.SLOT_THEMES = [
  {
    id: 'classic',
    name: 'Classic',
    accent: '#c9a26a',
    accentDim: '#8c6a3f',
    spriteRow: 0,
    symbolNames: ['Cherries', 'Plum', 'Lemon', 'Bell', 'BAR', 'Seven']
  },
  {
    id: 'lucky',
    name: 'Lucky',
    accent: '#e6c590',
    accentDim: '#a07a30',
    spriteRow: 1,
    symbolNames: ['Clover', 'Horseshoe', 'Bell', 'BAR', 'Triple BAR', 'Lucky 7']
  },
  {
    id: 'mythic',
    name: 'Mythic',
    accent: '#b59ce6',
    accentDim: '#6b4cb0',
    spriteRow: 2,
    symbolNames: ['Coin', 'Scroll', 'Gem', 'Sword', 'Crown', 'Dragon']
  }
];
