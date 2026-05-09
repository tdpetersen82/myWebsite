/* eslint-disable */
// Shared casino stats — single source of truth for cross-game lifetime
// counters, peaks, rare events, and per-game volume. Stored in localStorage
// as one JSON blob under "casinoStats" with atomic writes.
//
// Lifetime stats persist across runs; the "run" sub-tree resets on every
// "Cash out & start over" (from the profile page).
//
// One-shot migration seeds lifetime.perGame from existing legacy keys
// (rouletteStats, videoPokerStats, crapsStats, threeCardPokerStats,
// texasHoldemStats, solitaireStats) and seeds peakBankrollEver from the
// current casinoBankroll. Legacy keys are left in place so a stale tab
// continues to work mid-rollout.
(function () {
  const KEY = 'casinoStats';
  const SCHEMA = 1;
  const STARTING = 1000;
  let migrated = false;

  function newRunId() {
    try {
      if (crypto && crypto.randomUUID) return crypto.randomUUID();
    } catch (e) {}
    return 'r-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function defaults() {
    return {
      schemaVersion: SCHEMA,
      lifetime: {
        netWon: 0,
        peakBankrollEver: STARTING,
        biggestPayout: { amount: 0, game: null, when: 0 },
        runsPlayed: 0,
        bestRunPeak: STARTING,
        rare: {
          royalFlushes: 0,
          blackjacks: 0,
          straightFlushes: 0,
          slotJackpots: 0,
          pointsMade: 0,
        },
        perGame: {
          blackjack:      { handsPlayed: 0, handsWon: 0, biggestWin: 0 },
          roulette:       { spinsPlayed: 0, spinsWon: 0, biggestWin: 0 },
          videoPoker:     { handsPlayed: 0, handsWon: 0, biggestWin: 0 },
          solitaire:      { gamesPlayed: 0, gamesWon: 0 },
          craps:          { rollsPlayed: 0, passWins: 0, biggestWin: 0 },
          threeCardPoker: { handsPlayed: 0, handsWon: 0, biggestWin: 0, biggestPP: 0 },
          texasHoldem:    { handsPlayed: 0, handsWon: 0, biggestPot: 0, biggestWin: 0 },
          slotMachine:    { spinsPlayed: 0, biggestWin: 0 },
        },
      },
      run: {
        runId: newRunId(),
        peakBankroll: STARTING,
        handsPlayed: 0,
        winStreak: 0,
        startedAt: Date.now(),
      },
    };
  }

  function readBlob() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function writeBlob(blob) {
    try { localStorage.setItem(KEY, JSON.stringify(blob)); } catch (e) {}
  }

  function deepClone(o) { return JSON.parse(JSON.stringify(o)); }

  function migrateIfNeeded() {
    if (migrated) return;
    migrated = true;
    const existing = readBlob();
    if (existing && existing.schemaVersion === SCHEMA) {
      if (existing.run && !existing.run.runId) {
        existing.run.runId = newRunId();
        writeBlob(existing);
      }
      return;
    }

    const blob = defaults();

    try {
      const bk = parseInt(localStorage.getItem('casinoBankroll'), 10);
      if (isFinite(bk) && bk > blob.lifetime.peakBankrollEver) blob.lifetime.peakBankrollEver = bk;
    } catch (e) {}

    try {
      const rl = JSON.parse(localStorage.getItem('rouletteStats') || 'null');
      const s = rl && rl.stats;
      if (s) {
        blob.lifetime.perGame.roulette.spinsPlayed = s.spinsPlayed || 0;
        blob.lifetime.perGame.roulette.spinsWon   = s.spinsWon   || 0;
        blob.lifetime.perGame.roulette.biggestWin = s.biggestWin || 0;
      }
    } catch (e) {}

    try {
      const vp = JSON.parse(localStorage.getItem('videoPokerStats') || 'null');
      const s = vp && vp.stats;
      if (s) {
        blob.lifetime.perGame.videoPoker.handsPlayed = s.handsPlayed || 0;
        blob.lifetime.perGame.videoPoker.handsWon   = s.handsWon   || 0;
        if (typeof s.biggestBankroll === 'number' && s.biggestBankroll > STARTING) {
          blob.lifetime.perGame.videoPoker.biggestWin = s.biggestBankroll - STARTING;
        }
        if (typeof s.royalFlushes === 'number') {
          blob.lifetime.rare.royalFlushes = s.royalFlushes;
        }
      }
    } catch (e) {}

    try {
      const cr = JSON.parse(localStorage.getItem('crapsStats') || 'null');
      if (cr) {
        blob.lifetime.perGame.craps.rollsPlayed = cr.rolls || cr.rollsPlayed || 0;
        blob.lifetime.perGame.craps.passWins   = cr.passWins || 0;
      }
    } catch (e) {}

    try {
      const tcp = JSON.parse(localStorage.getItem('threeCardPokerStats') || 'null');
      if (tcp) {
        blob.lifetime.perGame.threeCardPoker.handsPlayed = tcp.played || tcp.handsPlayed || 0;
        blob.lifetime.perGame.threeCardPoker.handsWon   = tcp.won    || tcp.handsWon   || 0;
        blob.lifetime.perGame.threeCardPoker.biggestPP  = tcp.biggestPP || 0;
        if (typeof tcp.peak === 'number' && tcp.peak > STARTING) {
          blob.lifetime.perGame.threeCardPoker.biggestWin = tcp.peak - STARTING;
        }
      }
    } catch (e) {}

    try {
      const th = JSON.parse(localStorage.getItem('texasHoldemStats') || 'null');
      if (th) {
        blob.lifetime.perGame.texasHoldem.handsPlayed = th.handsPlayed || 0;
        blob.lifetime.perGame.texasHoldem.handsWon   = th.handsWon   || 0;
        blob.lifetime.perGame.texasHoldem.biggestWin = th.biggestWin || 0;
        blob.lifetime.perGame.texasHoldem.biggestPot = th.biggestPot || 0;
      }
    } catch (e) {}

    try {
      const sol = JSON.parse(localStorage.getItem('solitaireStats') || 'null');
      if (sol) {
        blob.lifetime.perGame.solitaire.gamesPlayed = sol.gamesPlayed || 0;
        blob.lifetime.perGame.solitaire.gamesWon   = sol.gamesWon   || 0;
      }
    } catch (e) {}

    writeBlob(blob);
  }

  function read() {
    migrateIfNeeded();
    return deepClone(readBlob() || defaults());
  }

  // game ids (camelCase): blackjack, roulette, videoPoker, solitaire, craps,
  // threeCardPoker, texasHoldem, slotMachine
  // evt: { kind, won, payout, rare, pot, pp }
  function recordEvent(game, evt) {
    migrateIfNeeded();
    const blob = readBlob() || defaults();
    const lt = blob.lifetime;
    if (!lt.perGame[game]) return;
    const g = lt.perGame[game];

    const won = !!(evt && evt.won);
    const payout = Math.max(0, Number(evt && evt.payout) || 0);

    if (game === 'blackjack' || game === 'videoPoker' || game === 'threeCardPoker' || game === 'texasHoldem') {
      g.handsPlayed = (g.handsPlayed || 0) + 1;
      if (won) g.handsWon = (g.handsWon || 0) + 1;
      if (payout > (g.biggestWin || 0)) g.biggestWin = payout;
    } else if (game === 'roulette') {
      g.spinsPlayed = (g.spinsPlayed || 0) + 1;
      if (won) g.spinsWon = (g.spinsWon || 0) + 1;
      if (payout > (g.biggestWin || 0)) g.biggestWin = payout;
    } else if (game === 'craps') {
      g.rollsPlayed = (g.rollsPlayed || 0) + 1;
      if (won) g.passWins = (g.passWins || 0) + 1;
      if (payout > (g.biggestWin || 0)) g.biggestWin = payout;
    } else if (game === 'solitaire') {
      g.gamesPlayed = (g.gamesPlayed || 0) + 1;
      if (won) g.gamesWon = (g.gamesWon || 0) + 1;
    } else if (game === 'slotMachine') {
      g.spinsPlayed = (g.spinsPlayed || 0) + 1;
      if (payout > (g.biggestWin || 0)) g.biggestWin = payout;
    }

    if (game === 'texasHoldem' && evt && evt.pot != null) {
      const pot = Math.max(0, Number(evt.pot) || 0);
      if (pot > (g.biggestPot || 0)) g.biggestPot = pot;
    }
    if (game === 'threeCardPoker' && evt && evt.pp != null) {
      const pp = Math.max(0, Number(evt.pp) || 0);
      if (pp > (g.biggestPP || 0)) g.biggestPP = pp;
    }

    if (payout > (lt.biggestPayout.amount || 0)) {
      lt.biggestPayout = { amount: payout, game, when: Date.now() };
    }

    if (evt && evt.rare) {
      const r = evt.rare;
      if (r === 'royalFlush')      lt.rare.royalFlushes  = (lt.rare.royalFlushes  || 0) + 1;
      else if (r === 'blackjack')      lt.rare.blackjacks      = (lt.rare.blackjacks      || 0) + 1;
      else if (r === 'straightFlush')  lt.rare.straightFlushes = (lt.rare.straightFlushes || 0) + 1;
      else if (r === 'slotJackpot')    lt.rare.slotJackpots    = (lt.rare.slotJackpots    || 0) + 1;
      else if (r === 'pointMade')      lt.rare.pointsMade      = (lt.rare.pointsMade      || 0) + 1;
    }

    blob.run.handsPlayed = (blob.run.handsPlayed || 0) + 1;
    blob.run.winStreak = won ? (blob.run.winStreak || 0) + 1 : 0;

    writeBlob(blob);
  }

  function recordPeak(bankroll) {
    migrateIfNeeded();
    const n = Math.floor(Number(bankroll) || 0);
    if (!isFinite(n) || n <= 0) return;
    const blob = readBlob() || defaults();
    let changed = false;
    if (n > (blob.lifetime.peakBankrollEver || 0)) {
      blob.lifetime.peakBankrollEver = n;
      changed = true;
    }
    if (n > (blob.run.peakBankroll || 0)) {
      blob.run.peakBankroll = n;
      changed = true;
    }
    if (changed) writeBlob(blob);
  }

  function bankRun(finalBankroll) {
    migrateIfNeeded();
    const blob = readBlob() || defaults();
    const final = Math.floor(Number(finalBankroll) || 0);
    blob.lifetime.netWon = (blob.lifetime.netWon || 0) + (final - STARTING);
    blob.lifetime.runsPlayed = (blob.lifetime.runsPlayed || 0) + 1;
    if ((blob.run.peakBankroll || 0) > (blob.lifetime.bestRunPeak || 0)) {
      blob.lifetime.bestRunPeak = blob.run.peakBankroll;
    }
    blob.run = {
      runId: newRunId(),
      peakBankroll: STARTING,
      handsPlayed: 0,
      winStreak: 0,
      startedAt: Date.now(),
    };
    writeBlob(blob);
  }

  function resetAll() {
    writeBlob(defaults());
  }

  window.CASINO_STATS = {
    KEY,
    SCHEMA,
    STARTING,
    read,
    recordEvent,
    recordPeak,
    bankRun,
    resetAll,
  };
})();
