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

  // ── Lily portrait (zookeeper sprite) ──────────────────────────────────
  // assets/zookeepersprite.png is a 2x2 grid of expressions:
  //   ┌──────────┬──────────┐
  //   │  happy   │   sad    │   ← top row: smile (yes/win), sad (lose)
  //   ├──────────┼──────────┤
  //   │ thinking │ skeptical│   ← bottom row: thinking (idle), skeptical (no)
  //   └──────────┴──────────┘
  // CSS in index.html maps each expression to a quadrant via background-position.

  function setExpression(expr) {
    state.expression = expr;
    const el = document.getElementById('lily-portrait');
    if (el) el.dataset.expr = expr;
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
