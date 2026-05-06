// Animal Detective — game logic, character renderer, and UI.
// Depends on globals from questions.js and animals.js loaded earlier.

(function () {
  'use strict';

  const KEYS = {
    BEST: 'kids-animal-detective-best-questions',
    STREAK: 'kids-animal-detective-streak',
    WINS: 'kids-animal-detective-wins',
    LOSSES: 'kids-animal-detective-losses',
    CASES: 'kids-animal-detective-cases',
  };

  const MAX_QUESTIONS = 20;
  const TYPE_SPEED_MS = 22;
  const RESPONSE_HOLD_MS = 1900;

  const state = {
    animal: null,
    asked: new Set(),
    activeTab: 'body',
    phase: 'asking',           // asking | guessing | revealed
    responding: false,
    typewriterTimer: null,
    expression: 'idle',
    caseNumber: 1,
  };

  // ── Storage helpers ────────────────────────────────────────────────────
  function readNum(key) {
    return parseInt(localStorage.getItem(key) || '0', 10);
  }
  function writeNum(key, val) {
    localStorage.setItem(key, String(val));
  }

  // ── Utilities ──────────────────────────────────────────────────────────
  function pickLine(key, ctx) {
    const lines = (window.LILY_LINES || {})[key] || [];
    if (!lines.length) return '';
    const line = lines[Math.floor(Math.random() * lines.length)];
    return line.replace('{name}', (ctx && ctx.name) || '');
  }

  function pickAnimal() {
    const animals = window.AD_ANIMALS;
    return animals[Math.floor(Math.random() * animals.length)];
  }

  // ── Lily SVG renderer ──────────────────────────────────────────────────
  // Body and face shape are constant; eyes + mouth swap by expression.

  const LILY_BASE = `
    <ellipse cx="200" cy="540" rx="125" ry="14" fill="rgba(0,0,0,.13)"/>

    <!-- coat -->
    <path d="M40 552 Q40 380 200 380 Q360 380 360 552 Z" fill="#4F8AAD"/>
    <path d="M40 552 Q40 380 200 380 Q360 380 360 552 Z" fill="url(#coatHi)" opacity="0.35"/>
    <!-- coat lapels -->
    <path d="M155 380 L200 430 L150 470 L130 430 Z" fill="#3C6F8B"/>
    <path d="M245 380 L200 430 L250 470 L270 430 Z" fill="#3C6F8B"/>
    <!-- collar -->
    <path d="M165 380 L200 410 L235 380 L200 425 Z" fill="#FAFAFA"/>
    <!-- bow tie -->
    <path d="M180 422 L200 432 L220 422 L220 444 L200 434 L180 444 Z" fill="#FF8FA3"/>
    <circle cx="200" cy="433" r="3" fill="#D43A6E"/>

    <!-- neck -->
    <rect x="180" y="345" width="40" height="40" fill="#F4D2A9"/>

    <!-- magnifying glass tucked at side -->
    <g transform="translate(78, 440) rotate(-26)">
      <line x1="22" y1="22" x2="56" y2="56" stroke="#8C6A3F" stroke-width="9" stroke-linecap="round"/>
      <line x1="22" y1="22" x2="56" y2="56" stroke="#FFD93D" stroke-width="6" stroke-linecap="round"/>
      <circle cx="0" cy="0" r="32" fill="rgba(255,255,255,.55)" stroke="#FFD93D" stroke-width="7"/>
    </g>

    <!-- ears -->
    <ellipse cx="92" cy="220" rx="13" ry="20" fill="#F4D2A9"/>
    <ellipse cx="308" cy="220" rx="13" ry="20" fill="#F4D2A9"/>

    <!-- head -->
    <ellipse cx="200" cy="218" rx="108" ry="122" fill="#F4D2A9"/>
    <ellipse cx="200" cy="218" rx="108" ry="122" fill="url(#faceShade)" opacity="0.5"/>

    <!-- hair back -->
    <path d="M92 200 Q92 88 200 88 Q308 88 308 200 L308 290 Q282 298 240 298 L160 298 Q118 298 92 290 Z" fill="#5C3A21"/>

    <!-- hair lock side right -->
    <path d="M295 195 Q310 240 290 290 Q283 270 285 235 Z" fill="#4A2D1A"/>
    <!-- hair lock side left -->
    <path d="M105 195 Q90 240 110 290 Q117 270 115 235 Z" fill="#4A2D1A"/>

    <!-- bangs -->
    <path d="M115 165 Q160 110 200 120 Q244 110 285 165 Q260 158 218 162 Q176 166 152 175 Q132 178 115 165 Z" fill="#5C3A21"/>

    <!-- headband -->
    <path d="M105 168 Q200 138 295 168 L295 188 Q200 158 105 188 Z" fill="#3FB6BC"/>
    <circle cx="288" cy="172" r="9" fill="#FFD93D"/>
    <circle cx="288" cy="172" r="4" fill="#FF4F8B"/>

    <!-- cheeks -->
    <ellipse cx="135" cy="262" rx="14" ry="9" fill="#FFB7C7" opacity="0.6"/>
    <ellipse cx="265" cy="262" rx="14" ry="9" fill="#FFB7C7" opacity="0.6"/>

    <!-- nose -->
    <path d="M196 250 Q200 262 206 252" fill="none" stroke="#C49A77" stroke-width="2.5" stroke-linecap="round"/>
  `;

  const LILY_FACES = {
    idle: `
      <path d="M138 198 Q160 192 178 198" fill="none" stroke="#3D2517" stroke-width="4" stroke-linecap="round"/>
      <path d="M222 198 Q244 192 262 198" fill="none" stroke="#3D2517" stroke-width="4" stroke-linecap="round"/>
      <ellipse cx="160" cy="225" rx="9" ry="11" fill="#1F1A2E"/>
      <ellipse cx="240" cy="225" rx="9" ry="11" fill="#1F1A2E"/>
      <ellipse cx="158" cy="221" rx="3" ry="3.5" fill="#fff"/>
      <ellipse cx="238" cy="221" rx="3" ry="3.5" fill="#fff"/>
      <path d="M178 295 Q200 308 222 295" fill="none" stroke="#1F1A2E" stroke-width="4" stroke-linecap="round"/>
    `,
    thinking: `
      <path d="M138 192 Q158 184 178 192" fill="none" stroke="#3D2517" stroke-width="4" stroke-linecap="round"/>
      <path d="M222 192 Q244 184 262 192" fill="none" stroke="#3D2517" stroke-width="4" stroke-linecap="round"/>
      <ellipse cx="166" cy="222" rx="9" ry="11" fill="#1F1A2E"/>
      <ellipse cx="246" cy="222" rx="9" ry="11" fill="#1F1A2E"/>
      <ellipse cx="170" cy="217" rx="3" ry="3.5" fill="#fff"/>
      <ellipse cx="250" cy="217" rx="3" ry="3.5" fill="#fff"/>
      <ellipse cx="200" cy="298" rx="9" ry="6" fill="#1F1A2E"/>
      <circle cx="305" cy="135" r="6" fill="#1F1A2E" opacity="0.5"/>
      <circle cx="332" cy="118" r="9" fill="#1F1A2E" opacity="0.55"/>
      <circle cx="362" cy="92" r="20" fill="#fff" stroke="#1F1A2E" stroke-width="3"/>
      <text x="362" y="103" text-anchor="middle" font-size="26" font-family="Bricolage Grotesque, serif" font-weight="700" fill="#1F1A2E">?</text>
    `,
    yes: `
      <path d="M138 188 Q160 184 178 192" fill="none" stroke="#3D2517" stroke-width="4" stroke-linecap="round"/>
      <path d="M222 192 Q244 184 262 188" fill="none" stroke="#3D2517" stroke-width="4" stroke-linecap="round"/>
      <path d="M147 232 Q160 215 175 232" fill="none" stroke="#1F1A2E" stroke-width="6" stroke-linecap="round"/>
      <path d="M225 232 Q240 215 253 232" fill="none" stroke="#1F1A2E" stroke-width="6" stroke-linecap="round"/>
      <path d="M163 290 Q200 322 237 290 Q200 320 163 290 Z" fill="#1F1A2E"/>
      <path d="M170 295 Q200 312 230 295 Q200 314 170 295 Z" fill="#FF4F8B"/>
      <text x="350" y="180" font-size="44">👍</text>
    `,
    no: `
      <path d="M138 200 Q160 206 178 198" fill="none" stroke="#3D2517" stroke-width="4" stroke-linecap="round"/>
      <path d="M222 198 Q244 206 262 200" fill="none" stroke="#3D2517" stroke-width="4" stroke-linecap="round"/>
      <path d="M148 226 L172 226" stroke="#1F1A2E" stroke-width="6" stroke-linecap="round"/>
      <path d="M228 226 L252 226" stroke="#1F1A2E" stroke-width="6" stroke-linecap="round"/>
      <path d="M178 300 L222 300" stroke="#1F1A2E" stroke-width="5" stroke-linecap="round"/>
      <text x="345" y="180" font-size="44">🤔</text>
    `,
    win: `
      <path d="M138 184 Q160 178 178 188" fill="none" stroke="#3D2517" stroke-width="4" stroke-linecap="round"/>
      <path d="M222 188 Q244 178 262 184" fill="none" stroke="#3D2517" stroke-width="4" stroke-linecap="round"/>
      <text x="160" y="240" text-anchor="middle" font-size="36" fill="#FFD93D" stroke="#1F1A2E" stroke-width="1.5">★</text>
      <text x="240" y="240" text-anchor="middle" font-size="36" fill="#FFD93D" stroke="#1F1A2E" stroke-width="1.5">★</text>
      <ellipse cx="200" cy="298" rx="18" ry="16" fill="#1F1A2E"/>
      <ellipse cx="200" cy="304" rx="13" ry="8" fill="#FF4F8B"/>
      <text x="80" y="120" font-size="32">✨</text>
      <text x="320" y="135" font-size="28">✨</text>
      <text x="55" y="220" font-size="22">✨</text>
      <text x="345" y="240" font-size="22">✨</text>
    `,
    lose: `
      <path d="M138 208 Q158 196 178 204" fill="none" stroke="#3D2517" stroke-width="4" stroke-linecap="round"/>
      <path d="M222 204 Q242 196 262 208" fill="none" stroke="#3D2517" stroke-width="4" stroke-linecap="round"/>
      <ellipse cx="160" cy="228" rx="8" ry="10" fill="#1F1A2E"/>
      <ellipse cx="240" cy="228" rx="8" ry="10" fill="#1F1A2E"/>
      <ellipse cx="158" cy="225" rx="2.5" ry="3" fill="#fff"/>
      <ellipse cx="238" cy="225" rx="2.5" ry="3" fill="#fff"/>
      <path d="M163 240 Q156 268 168 274 Q178 268 167 240 Z" fill="#6DD5FA" opacity="0.85"/>
      <path d="M178 308 Q200 294 222 308" fill="none" stroke="#1F1A2E" stroke-width="4" stroke-linecap="round"/>
    `,
  };

  function lilySvg(expression) {
    const face = LILY_FACES[expression] || LILY_FACES.idle;
    return `
      <svg viewBox="0 0 400 580" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="coatHi" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#fff" stop-opacity="0.4"/>
            <stop offset="1" stop-color="#fff" stop-opacity="0"/>
          </linearGradient>
          <radialGradient id="faceShade" cx="50%" cy="35%" r="60%">
            <stop offset="0" stop-color="#fff" stop-opacity="0.5"/>
            <stop offset="0.7" stop-color="#fff" stop-opacity="0"/>
            <stop offset="1" stop-color="#A07050" stop-opacity="0.25"/>
          </radialGradient>
        </defs>
        ${LILY_BASE}
        ${face}
      </svg>
    `;
  }

  function setExpression(expr) {
    state.expression = expr;
    const el = document.getElementById('lily-portrait');
    if (el) el.innerHTML = lilySvg(expr);
  }

  // ── Speech bubble typewriter ──────────────────────────────────────────
  function setSpeech(text) {
    if (state.typewriterTimer) {
      clearInterval(state.typewriterTimer);
      state.typewriterTimer = null;
    }
    const el = document.getElementById('speech-text');
    if (!el) return;
    el.textContent = '';
    el.classList.add('blink-cursor');
    const chars = Array.from(text);
    let i = 0;
    state.typewriterTimer = setInterval(() => {
      if (i >= chars.length) {
        clearInterval(state.typewriterTimer);
        state.typewriterTimer = null;
        return;
      }
      el.textContent += chars[i];
      i++;
    }, TYPE_SPEED_MS);
  }

  // ── Tabs and questions ────────────────────────────────────────────────
  function renderTabs() {
    const tabsEl = document.getElementById('question-tabs');
    if (!tabsEl) return;
    tabsEl.innerHTML = window.AD_CATEGORIES.map(c =>
      `<button class="qtab ${c.id === state.activeTab ? 'active' : ''}" data-tab="${c.id}" type="button">
        <span class="te">${c.emoji}</span><span class="tl">${c.label}</span>
      </button>`
    ).join('');
    tabsEl.querySelectorAll('.qtab').forEach(b => {
      b.addEventListener('click', () => {
        state.activeTab = b.dataset.tab;
        renderTabs();
        renderQuestions();
      });
    });
  }

  function renderQuestions() {
    const grid = document.getElementById('question-grid');
    if (!grid) return;
    const qs = window.AD_QUESTIONS.filter(q => q.category === state.activeTab);
    grid.innerHTML = qs.map(q => {
      const asked = state.asked.has(q.id);
      return `<button class="qbtn ${asked ? 'asked' : ''}" data-id="${q.id}" type="button" ${asked ? 'disabled' : ''}>
        <span class="qmark">?</span>
        <span class="qtext">${q.text}</span>
      </button>`;
    }).join('');
    grid.querySelectorAll('.qbtn:not(.asked)').forEach(b => {
      b.addEventListener('click', () => askQuestion(b.dataset.id));
    });
  }

  function updateCounter() {
    const counterEl = document.getElementById('q-counter');
    if (counterEl) counterEl.textContent = `${state.asked.size} / ${MAX_QUESTIONS}`;
    const fill = document.getElementById('q-progress');
    if (fill) fill.style.width = `${(state.asked.size / MAX_QUESTIONS) * 100}%`;
  }

  function askQuestion(id) {
    if (state.responding) return;
    if (state.phase !== 'asking') return;
    if (state.asked.has(id)) return;

    const q = window.AD_QUESTIONS.find(x => x.id === id);
    if (!q) return;

    state.asked.add(id);
    state.responding = true;
    const yes = q.fn(state.animal);

    setExpression(yes ? 'yes' : 'no');
    setSpeech(pickLine(yes ? 'yes' : 'no'));

    updateCounter();
    renderQuestions();

    setTimeout(() => {
      state.responding = false;
      const count = state.asked.size;

      if (count === MAX_QUESTIONS) {
        openGuess(true);
        return;
      }

      setExpression('idle');

      let milestoneKey = null;
      if (count === 5) milestoneKey = 'milestone_5';
      else if (count === 10) milestoneKey = 'milestone_10';
      else if (count === 15) milestoneKey = 'milestone_15';
      else if (count === MAX_QUESTIONS - 1) milestoneKey = 'milestone_19';

      if (milestoneKey) setSpeech(pickLine(milestoneKey));
    }, RESPONSE_HOLD_MS);
  }

  // ── Guess modal ────────────────────────────────────────────────────────
  function openGuess(forced) {
    if (state.phase === 'revealed') return;
    state.phase = 'guessing';

    const cancelBtn = document.getElementById('btn-cancel-guess');
    cancelBtn.style.display = forced ? 'none' : '';

    const titleEl = document.getElementById('guess-title');
    titleEl.textContent = forced
      ? "20 questions used! Time to make your guess."
      : "Pick your answer";

    const sub = document.getElementById('guess-sub');
    sub.textContent = forced
      ? "Tap the animal you think Lily is thinking of."
      : "Type to filter, then tap the animal you think Lily is thinking of.";

    document.getElementById('guess-modal').classList.add('show');

    setExpression('thinking');
    setSpeech("Hmm... who do you think I am?");

    renderGuessGrid('');
    const search = document.getElementById('guess-search');
    search.value = '';
    setTimeout(() => search.focus(), 100);
  }

  function renderGuessGrid(filter) {
    const grid = document.getElementById('guess-grid');
    if (!grid) return;
    const f = (filter || '').toLowerCase().trim();
    const animals = window.AD_ANIMALS
      .filter(a => !f || a.name.toLowerCase().includes(f))
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
    grid.innerHTML = animals.map(a =>
      `<button class="guess-tile" data-slug="${a.slug}" type="button">
        <span class="ge">${a.emoji}</span>
        <span class="gn">${a.name}</span>
      </button>`
    ).join('');
    grid.querySelectorAll('.guess-tile').forEach(b => {
      b.addEventListener('click', () => makeGuess(b.dataset.slug));
    });
    if (animals.length === 0) {
      grid.innerHTML = `<div class="guess-empty">No animals match "${filter}"</div>`;
    }
  }

  function closeGuess() {
    if (state.phase !== 'guessing') return;
    state.phase = 'asking';
    document.getElementById('guess-modal').classList.remove('show');
    setExpression('idle');
    setSpeech("OK — keep asking! What's next?");
  }

  function makeGuess(slug) {
    const guessed = window.AD_ANIMALS.find(a => a.slug === slug);
    const correct = state.animal.slug === slug;
    document.getElementById('guess-modal').classList.remove('show');
    endRound(correct, correct ? 'correct' : 'wrong', guessed);
  }

  // ── Round end / reveal ─────────────────────────────────────────────────
  function endRound(won, reason, guessedAnimal) {
    state.phase = 'revealed';
    const animal = state.animal;
    const used = state.asked.size;

    const wins = readNum(KEYS.WINS);
    const losses = readNum(KEYS.LOSSES);
    let streak = readNum(KEYS.STREAK);
    let best = readNum(KEYS.BEST);

    if (won) {
      writeNum(KEYS.WINS, wins + 1);
      streak = streak + 1;
      writeNum(KEYS.STREAK, streak);
      if (best === 0 || used < best) {
        writeNum(KEYS.BEST, used);
      }
      setExpression('win');
      setSpeech(pickLine('win', { name: animal.name }));
    } else {
      writeNum(KEYS.LOSSES, losses + 1);
      writeNum(KEYS.STREAK, 0);
      setExpression('lose');
      const lineKey = reason === 'wrong' ? 'lose_wrong' : 'lose_close';
      setSpeech(pickLine(lineKey, { name: animal.name }));
    }

    updateBadges();

    setTimeout(() => showRevealCard(animal, won, used, guessedAnimal, reason), 1100);
  }

  function classTint(cls) {
    const tints = {
      mammal: 'linear-gradient(160deg, #FFE5C2 0%, #FFB58A 100%)',
      bird: 'linear-gradient(160deg, #FFF1A8 0%, #FFC76A 100%)',
      reptile: 'linear-gradient(160deg, #C7F2C0 0%, #7BC97B 100%)',
      amphibian: 'linear-gradient(160deg, #C7F2C0 0%, #6DD5FA 100%)',
      fish: 'linear-gradient(160deg, #C2EBFF 0%, #6DD5FA 100%)',
      invertebrate: 'linear-gradient(160deg, #FFD7E5 0%, #FF8FA3 100%)',
    };
    return tints[cls] || tints.mammal;
  }

  function showRevealCard(animal, won, used, guessedAnimal, reason) {
    const overlay = document.getElementById('reveal-overlay');
    const tag = `${animal.class.toUpperCase()} · ${animal.size.toUpperCase()} · ${(animal.habitat[0] || '').toUpperCase()}`;
    const stamp = won ? 'CASE CRACKED!' : 'CASE FILE';
    const used_label = `${used} question${used === 1 ? '' : 's'} used`;
    const subText = won
      ? `You cracked it in ${used} question${used === 1 ? '' : 's'}!`
      : (reason === 'wrong' && guessedAnimal
        ? `You guessed ${guessedAnimal.name}, but it was a ${animal.name}.`
        : `It was a ${animal.name} all along.`);

    overlay.innerHTML = `
      <div class="reveal-card" style="background: ${classTint(animal.class)}">
        <div class="reveal-stamp ${won ? 'won' : 'lost'}">${stamp}</div>
        <div class="reveal-emoji-frame">
          <div class="reveal-emoji">${animal.emoji}</div>
        </div>
        <div class="reveal-name">${animal.name}</div>
        <div class="reveal-tag">${tag}</div>
        <div class="reveal-fact">${animal.fact}</div>
        <div class="reveal-sub">${subText}</div>
        <div class="reveal-meta">${used_label} · Case #${String(state.caseNumber).padStart(3, '0')}</div>
        <div class="reveal-actions">
          <button class="rb primary" id="btn-play-again" type="button">Play again →</button>
          <a class="rb ghost" href="../kids/">More games</a>
        </div>
      </div>
    `;
    overlay.classList.add('show');

    document.getElementById('btn-play-again').addEventListener('click', newRound);
  }

  // ── Top-bar badges ─────────────────────────────────────────────────────
  function updateBadges() {
    const streakEl = document.getElementById('streak-val');
    if (streakEl) streakEl.textContent = readNum(KEYS.STREAK);
    const bestEl = document.getElementById('best-val');
    if (bestEl) {
      const v = readNum(KEYS.BEST);
      bestEl.textContent = v > 0 ? v : '—';
    }
    const winsEl = document.getElementById('wins-val');
    if (winsEl) winsEl.textContent = readNum(KEYS.WINS);
  }

  // ── New round ──────────────────────────────────────────────────────────
  function newRound() {
    state.animal = pickAnimal();
    state.asked = new Set();
    state.activeTab = 'body';
    state.phase = 'asking';
    state.responding = false;
    state.caseNumber = readNum(KEYS.CASES) + 1;
    writeNum(KEYS.CASES, state.caseNumber);

    document.getElementById('reveal-overlay').classList.remove('show');
    document.getElementById('guess-modal').classList.remove('show');

    const caseEl = document.getElementById('case-num');
    if (caseEl) caseEl.textContent = `Case #${String(state.caseNumber).padStart(3, '0')}`;

    setExpression('idle');
    setSpeech(pickLine('greet'));

    renderTabs();
    renderQuestions();
    updateCounter();
    updateBadges();
  }

  // ── INIT ───────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btn-guess').addEventListener('click', () => openGuess(false));
    document.getElementById('btn-cancel-guess').addEventListener('click', closeGuess);

    const search = document.getElementById('guess-search');
    if (search) {
      search.addEventListener('input', () => renderGuessGrid(search.value));
    }

    newRound();
  });
})();
