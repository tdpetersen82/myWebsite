# Blackjack Game Implementation Plan

## Status: NOT STARTED - Only planning was completed.

## Tech Stack
- **DOM + CSS + GSAP** for rich card animations (3D flips, dealing, confetti)
- **CDN**: `https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js`
- **CDN**: `https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js`
- Single file: `blackjack/index.html` (all CSS/JS embedded)

## Visual Design
- **BRIGHT colors only, NO dark colors**
- Background: emerald felt gradient `#2ecc71` → `#27ae60`
- Cards: white `#fff`, 12px border-radius, box-shadow
- Card backs: coral/orange gradient pattern `#ff6b6b` → `#ee5a24`
- Suits: red `#e74c3c` (hearts/diamonds), navy `#2c3e50` (spades/clubs)
- Chips: $5 red, $25 green, $100 blue, $500 purple
- Buttons: vibrant gradients (Hit=blue, Stand=amber, Double=green, Split=purple)
- Hint panel: soft blue `#ebf5fb` with blue accent border

## Game Rules (Standard Las Vegas)
- 6-deck shoe, reshuffled at 75% penetration
- Dealer stands on soft 17
- Blackjack pays 3:2
- Double down on any two cards
- Split any pair (up to 3 splits = 4 hands)
- Split aces get one card each
- Insurance when dealer shows Ace (pays 2:1)
- Surrender available (early)
- Starting bankroll: $1,000
- Chip denominations: $5, $25, $100, $500
- Min bet $5, Max bet $500

## Hint System (Basic Strategy)
- Toggle ON/OFF button in header
- When ON during player's turn, shows panel with:
  - **Recommended action** in bold (HIT, STAND, DOUBLE, SPLIT, SURRENDER)
  - **Explanation** of why (1-2 sentences based on probabilities/strategy logic)
- Full basic strategy lookup table: hard totals, soft totals, pairs vs dealer upcard
- Persisted in localStorage

## Animations (GSAP)
1. Card dealing: slide from shoe position, 0.4s staggered
2. Card flip: 3D CSS perspective rotateY, 0.4s
3. Chip betting: bounce/slide with elastic ease
4. Win: canvas-confetti burst + chips sliding back
5. Blackjack: golden glow + confetti explosion
6. Bust: cards shake + red flash

## Audio (Web Audio API)
- Card deal: white noise burst 0.08s
- Card flip: snap at 800Hz 0.05s
- Chip place: clink at 1200Hz triangle 0.06s
- Win: C-E-G arpeggio 0.3s
- Lose: descending 400→200Hz 0.2s
- Blackjack: C-E-G-C fanfare 0.5s

## Auto-scaling
```js
(function() {
    const wrapper = document.getElementById('game-wrapper');
    function resize() {
        const W = 960, H = 640;
        const s = Math.min(window.innerWidth / W, window.innerHeight / H, 1);
        wrapper.style.transform = `scale(${s})`;
        wrapper.style.transformOrigin = 'top center';
        wrapper.style.marginTop = Math.max(0, (window.innerHeight - H * s) / 2) + 'px';
    }
    window.addEventListener('resize', resize);
    resize();
})();
```

## Game State Machine
```
BETTING → DEALING → PLAYER_TURN → DEALER_TURN → RESOLUTION → BETTING
                         ↓
                   SPLIT (sub-hands)
```

## localStorage
- Key: `blackjackStats`
- Stores: bankroll, hands played, hands won, blackjacks, biggest win, biggest bankroll

## Integration (when game is complete)
1. Add card to `index.html` under "Strategy & Puzzles":
```html
<div class="game-card">
    <span class="badge-new">NEW</span>
    <div class="game-icon-wrap">🃏</div>
    <h2>Blackjack</h2>
    <p>Beat the dealer to 21 with basic strategy hints!</p>
    <a href="blackjack/" class="play-button">Play</a>
</div>
```

2. Add to `nav.js` GAME_CATALOG under Strategy & Puzzles:
```js
{ name: 'Blackjack', icon: '\u{1F0CF}', url: 'blackjack/' },
```

## UI Layout (960x640 game area)
```
┌──────────────────────────────────────────┐
│  ♠ Blackjack    Bankroll: $1000  [Hints] │
│          [Dealer's Cards]                │
│          Dealer: 17                      │
│          [Player's Cards]                │
│          Player: 15                      │
│   [Hit] [Stand] [Double] [Split]         │
│   ┌─ Hint Panel ────────────────────┐   │
│   │ HIT — With 15 vs dealer's 10,  │   │
│   │ hitting gives you better EV     │   │
│   └─────────────────────────────────┘   │
│   [$5] [$25] [$100] [$500]  Bet: $25    │
│   Stats: W:12 L:8 BJ:3  [Deal] [Clear]  │
└──────────────────────────────────────────┘
```
