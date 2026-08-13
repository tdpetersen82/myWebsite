/* eslint-disable */
// Player Profile page controller. Reads CASINO_BANKROLL + CASINO_STATS +
// CASINO_PLAYER, renders all sections, and is the ONLY place "Cash out &
// start over" runs.
(function () {
  const $ = (id) => document.getElementById(id);
  const fmt = (n) => '$' + Math.max(0, Math.floor(Number(n) || 0)).toLocaleString();
  const num = (n) => Math.max(0, Math.floor(Number(n) || 0)).toLocaleString();

  // Casino per-game card config: id → { name, href, tag, fields(stats) }
  const CASINO_GAMES = [
    { id: 'blackjack',      name: 'Blackjack',      href: '../blackjack/',        tag: 'Cards' },
    { id: 'roulette',       name: 'Roulette',       href: '../roulette/',         tag: 'Wheel' },
    { id: 'videoPoker',     name: 'Video Poker',    href: '../video-poker/',      tag: 'Cards' },
    { id: 'solitaire',      name: 'Solitaire',      href: '../solitaire/',        tag: 'Cards' },
    { id: 'craps',          name: 'Craps',          href: '../craps/',            tag: 'Dice'  },
    { id: 'threeCardPoker', name: 'Three Card',     href: '../three-card-poker/', tag: 'Cards' },
    { id: 'texasHoldem',    name: "Texas Hold'em",  href: '../texas-holdem/',     tag: 'Cards' },
    { id: 'slotMachine',    name: 'Slot Machine',   href: '../slot-machine/',     tag: 'Reels' },
  ];

  // Skeleton section config: each row reads a localStorage key. `transform`
  // converts the raw value into a display string (defaults to plain int).
  function readBest(key) {
    const n = parseInt(localStorage.getItem(key), 10);
    return isFinite(n) && n > 0 ? n : null;
  }
  function readStatsKey(key, transform) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      return transform ? transform(obj) : obj;
    } catch (e) { return null; }
  }
  // Head-to-head games keep separate win/loss counters; null only when neither
  // side has a value, so a losing record still counts as "played".
  function readRecord(winKey, lossKey) {
    const w = readBest(winKey), l = readBest(lossKey);
    if (w == null && l == null) return null;
    return (w || 0) + '–' + (l || 0);
  }
  // Games with several boards/difficulties store { variant: seconds }.
  function readBestTime(key) {
    const obj = readStatsKey(key);
    if (!obj) return null;
    const times = Object.keys(obj).map(k => obj[k]).filter(v => typeof v === 'number' && v > 0);
    return times.length ? Math.min.apply(null, times) : null;
  }
  function fmtTime(secs) {
    const s = Math.round(secs);
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }
  // wins vs (games - wins) for games that only bank a total-played counter.
  function recordFromTotals(winKey, gamesKey) {
    const w = readBest(winKey), g = readBest(gamesKey);
    if (g == null) return null;
    return (w || 0) + '–' + Math.max(0, g - (w || 0));
  }

  const ARCADE_ROWS = [
    { name: 'Snake',          href: '../snake/',          best: () => readBest('snakeHighScore') },
    { name: 'Pong',           href: '../pong/',           best: () => readBest('pongHighScore') },
    { name: 'Breakout',       href: '../breakout/',       best: () => readBest('breakoutHighScore') },
    { name: 'Asteroids',      href: '../asteroids/',      best: () => readBest('asteroidsHighScore') },
    { name: 'Frogger',        href: '../frogger/',        best: () => readBest('froggerHighScore') },
    { name: 'Defender',       href: '../defender/',       best: () => readBest('defenderHighScore') },
    { name: 'Missile Command',href: '../missile-command/',best: () => readBest('missileCommandHighScore') },
    { name: 'Lunar Lander',   href: '../lunar-lander/',   best: () => readBest('lunarLanderHighScore') },
    { name: 'SpaceX Lander',  href: '../spacex-lander/',  best: () => readBest('spacexLanderHighScore') },
    { name: 'Simon',          href: '../simon/',          best: () => readBest('simonHighScore') },
    { name: 'Space Invaders', href: '../space-invaders/', best: () => readBest('spaceInvadersHighScore') },
    { name: 'Block Puzzle',   href: '../block-puzzle/',   best: () => readBest('blockPuzzleHighScore') },
  ];

  const KIDS_ROWS = [
    // Pup Quiz banks a JSON record, not a bare number — best daily streak.
    { name: 'Pup Quiz',             href: '../dogs/play.html',        best: () => {
        const r = readStatsKey('pupQuizDaily');
        return r && r.best ? r.best : null;
      },
      formatBest: (n) => n + (n === 1 ? ' day' : ' days') },
    { name: 'Bubble Pop',         href: '../bubble-pop/',         best: () => readBest('kids-bubble-pop-best') },
    { name: 'Memory Match',       href: '../memory-match/',       best: () => readBest('kids-memory-match-best-hard-80'),
      formatBest: (n) => n + ' moves' },
    { name: 'Counting Critters',  href: '../counting-critters/',  best: () => readBest('kids-counting-critters-best') },
    { name: 'Shape Sorter',       href: '../shape-sorter/',       best: () => readBest('kids-shape-sorter-best') },
    { name: 'Animal Detective',   href: '../animal-detective/',   best: () => readBest('animalDetectiveBest') },
    { name: 'Tic-Tac-Toe',        href: '../tic-tac-toe/',        best: () => readBest('ticTacToeBestStreak'),
      formatBest: (n) => n + ' streak' },
    { name: 'Go Fish',            href: '../go-fish/',            best: () => recordFromTotals('goFishWins', 'goFishGames') },
    { name: 'Crazy Eights',       href: '../crazy-eights/',       best: () => recordFromTotals('crazyEightsWins', 'crazyEightsGames') },
  ];

  const STRAT_ROWS = [
    { name: 'Chess',                href: '../chess/',                best: () => readRecord('chessGamesWon', 'chessGamesLost') },
    { name: 'Checkers',             href: '../checkers/',             best: () => readRecord('checkersGamesWon', 'checkersGamesLost') },
    { name: 'Othello',              href: '../othello/',              best: () => readRecord('othelloGamesWon', 'othelloGamesLost') },
    { name: 'Connect 4',            href: '../connect-4/',            best: () => readRecord('connect4GamesWon', 'connect4GamesLost') },
    { name: 'Backgammon',           href: '../backgammon/',           best: () => readRecord('backgammonGamesWon', 'backgammonGamesLost') },
    { name: 'Mancala',              href: '../mancala/',              best: () => readRecord('mancalaGamesWon', 'mancalaGamesLost') },
    { name: 'Chinese Checkers',     href: '../chinese-checkers/',     best: () => readRecord('chineseCheckersGamesWon', 'chineseCheckersGamesLost') },
    { name: 'Ultimate Tic-Tac-Toe', href: '../ultimate-tic-tac-toe/', best: () => readRecord('ultimateTicTacToeGamesWon', 'ultimateTicTacToeGamesLost') },
    { name: 'Dots & Boxes',         href: '../connect-dots/',         best: () => readStatsKey('dotsBoxesStats', s => s && (s.wins != null) ? `${s.wins}–${s.losses || 0}` : null) },
    { name: '2048',                 href: '../2048/',                 best: () => readBest('2048HighScore') },
    { name: 'Yahtzee',              href: '../yahtzee/',              best: () => readBest('yahtzeeHighScore') },
    { name: 'Farkle',               href: '../farkle/',               best: () => readBest('farkleHighScore') },
    { name: 'Sudoku',               href: '../sudoku/',               best: () => readBestTime('sudokuBestTimes'),
      formatBest: fmtTime },
    { name: 'Minesweeper',          href: '../minesweeper/',          best: () => readBestTime('minesweeperBestTimes'),
      formatBest: fmtTime },
    { name: 'Word Search',          href: '../word-search/',          best: () => readBestTime('wordSearchBest'),
      formatBest: fmtTime },
    { name: 'Mahjong Solitaire',    href: '../mahjong/',              best: () => readBest('mahjongGamesWon'),
      formatBest: (n) => n + (n === 1 ? ' clear' : ' clears') },
    { name: 'Hangman',              href: '../hangman/',              best: () => readBest('hangmanHighScore'),
      formatBest: (n) => n + ' streak' },
  ];

  const RARE_KEYS = [
    { id: 'prof-rare-royal', key: 'royalFlushes' },
    { id: 'prof-rare-bj',    key: 'blackjacks' },
    { id: 'prof-rare-sf',    key: 'straightFlushes' },
    { id: 'prof-rare-jp',    key: 'slotJackpots' },
    { id: 'prof-rare-pt',    key: 'pointsMade' },
  ];

  // Per-game card field renderers: return [{label, value}, ...]
  function renderGameFields(id, g) {
    const fmtPay = (v) => v > 0 ? '+' + fmt(v) : '—';
    if (id === 'blackjack' || id === 'videoPoker' || id === 'threeCardPoker' || id === 'texasHoldem') {
      const wr = (g.handsPlayed || 0) > 0 ? Math.round(100 * (g.handsWon || 0) / g.handsPlayed) + '%' : '—';
      const fields = [
        { l: 'Hands', v: num(g.handsPlayed) },
        { l: 'Wins',  v: num(g.handsWon) },
        { l: 'Win rate', v: wr },
        { l: 'Best win', v: fmtPay(g.biggestWin) },
      ];
      if (id === 'threeCardPoker') fields.push({ l: 'Pair Plus', v: fmtPay(g.biggestPP) });
      if (id === 'texasHoldem')   fields.push({ l: 'Biggest pot', v: fmtPay(g.biggestPot) });
      return fields;
    }
    if (id === 'roulette') {
      const wr = (g.spinsPlayed || 0) > 0 ? Math.round(100 * (g.spinsWon || 0) / g.spinsPlayed) + '%' : '—';
      return [
        { l: 'Spins', v: num(g.spinsPlayed) },
        { l: 'Wins',  v: num(g.spinsWon) },
        { l: 'Win rate', v: wr },
        { l: 'Best spin', v: fmtPay(g.biggestWin) },
      ];
    }
    if (id === 'craps') {
      return [
        { l: 'Rolls', v: num(g.rollsPlayed) },
        { l: 'Pass wins', v: num(g.passWins) },
        { l: 'Best roll', v: fmtPay(g.biggestWin) },
      ];
    }
    if (id === 'solitaire') {
      const wr = (g.gamesPlayed || 0) > 0 ? Math.round(100 * (g.gamesWon || 0) / g.gamesPlayed) + '%' : '—';
      return [
        { l: 'Games', v: num(g.gamesPlayed) },
        { l: 'Wins',  v: num(g.gamesWon) },
        { l: 'Win rate', v: wr },
      ];
    }
    if (id === 'slotMachine') {
      return [
        { l: 'Spins', v: num(g.spinsPlayed) },
        { l: 'Best spin', v: fmtPay(g.biggestWin) },
      ];
    }
    return [];
  }

  function gameLabel(id) {
    const g = CASINO_GAMES.find(c => c.id === id);
    return g ? g.name : id;
  }

  function renderCasinoCards(stats) {
    const grid = $('prof-casino-grid');
    if (!grid) return;
    grid.innerHTML = '';
    for (const g of CASINO_GAMES) {
      const data = stats.lifetime.perGame[g.id] || {};
      const fields = renderGameFields(g.id, data);
      const a = document.createElement('a');
      a.className = 'prof-game';
      a.href = g.href;
      a.innerHTML = `
        <div class="prof-game-head">
          <h4>${g.name}</h4>
          <span class="prof-game-tag">${g.tag}</span>
        </div>
        <div class="prof-game-meta">
          ${fields.map(f => `<div><div>${f.l}</div><div class="v">${f.v}</div></div>`).join('')}
        </div>
        <div class="prof-game-foot"><span></span><span class="play">Take a seat →</span></div>
      `;
      grid.appendChild(a);
    }
  }

  function renderSkeleton(gridId, rows) {
    const grid = $(gridId);
    if (!grid) return 0;
    grid.innerHTML = '';
    let withScore = 0;
    for (const r of rows) {
      const raw = r.best();
      const value = raw == null ? null : (r.formatBest ? r.formatBest(raw) : (typeof raw === 'number' ? raw.toLocaleString() : String(raw)));
      const a = document.createElement('a');
      a.className = 'prof-skel-row';
      a.href = r.href;
      a.innerHTML = `<span class="name">${r.name}</span><span class="v ${value == null ? 'muted' : ''}">${value == null ? '—' : value}</span>`;
      grid.appendChild(a);
      if (value != null) withScore++;
    }
    return withScore;
  }

  function update() {
    const stats = window.CASINO_STATS.read();
    const lt = stats.lifetime;
    const run = stats.run;
    const bankroll = window.CASINO_BANKROLL.read();
    const name = window.CASINO_PLAYER.read();

    // Header
    $('prof-name-display').textContent = name || 'Friend';
    const runs = lt.runsPlayed || 0;
    $('prof-runs-summary').textContent = runs === 0
      ? 'No runs banked yet'
      : runs === 1
        ? '1 run banked · ' + (lt.netWon >= 0 ? '+' : '−') + fmt(Math.abs(lt.netWon)) + ' lifetime'
        : runs + ' runs banked · ' + (lt.netWon >= 0 ? '+' : '−') + fmt(Math.abs(lt.netWon)) + ' lifetime';
    $('prof-run-status').textContent = run.handsPlayed > 0 ? 'Run in progress · ' + run.handsPlayed + ' plays' : 'Fresh run';

    // Hero strip
    $('prof-bankroll').textContent = fmt(bankroll);
    $('prof-bankroll-sub').textContent = bankroll < window.CASINO_BANKROLL.MIN_PLAYABLE
      ? 'Out of chips — cash out to reload'
      : bankroll === window.CASINO_BANKROLL.STARTING ? 'Starting stake' : 'Active run';
    $('prof-peak-ever').textContent = fmt(lt.peakBankrollEver);
    const netWonAbs = Math.abs(lt.netWon || 0);
    $('prof-net-won').textContent = (lt.netWon >= 0 ? '+' : '−') + fmt(netWonAbs);
    $('prof-runs').textContent = num(runs);

    // Run row
    $('prof-run-peak').textContent = fmt(run.peakBankroll);
    $('prof-run-hands').textContent = num(run.handsPlayed);
    $('prof-run-streak').textContent = num(run.winStreak);

    // Lifetime highlights
    const bp = lt.biggestPayout || {};
    if (bp.amount > 0) {
      $('prof-biggest-payout').textContent = '+' + fmt(bp.amount);
      $('prof-biggest-payout-sub').textContent = 'In ' + gameLabel(bp.game);
    } else {
      $('prof-biggest-payout').textContent = '—';
      $('prof-biggest-payout-sub').textContent = 'No wins yet';
    }
    $('prof-best-run-peak').textContent = fmt(lt.bestRunPeak);

    // Rare event chips
    for (const r of RARE_KEYS) {
      const el = $(r.id);
      if (!el) continue;
      const v = lt.rare[r.key] || 0;
      el.querySelector('.n').textContent = v;
      el.classList.toggle('has-trophy', v > 0);
    }

    // Casino per-game cards
    renderCasinoCards(stats);
    $('prof-casino-count').textContent = '8 tables';

    // Skeleton sections
    const aw = renderSkeleton('prof-arcade-grid', ARCADE_ROWS);
    const kw = renderSkeleton('prof-kids-grid',   KIDS_ROWS);
    const sw = renderSkeleton('prof-strat-grid',  STRAT_ROWS);
    $('prof-arcade-count').textContent = aw + ' / ' + ARCADE_ROWS.length;
    $('prof-kids-count').textContent   = kw + ' / ' + KIDS_ROWS.length;
    $('prof-strat-count').textContent  = sw + ' / ' + STRAT_ROWS.length;
  }

  function bindNameEdit() {
    const display = $('prof-name-display');
    const editBtn = $('prof-name-edit');
    if (!display || !editBtn) return;

    function startEdit() {
      const current = window.CASINO_PLAYER.read() || '';
      const input = document.createElement('input');
      input.type = 'text';
      input.maxLength = 20;
      input.value = current;
      input.className = 'prof-name-input';
      display.replaceWith(input);
      input.focus();
      input.select();
      function commit() {
        const next = window.CASINO_PLAYER.write(input.value) || (current || 'Friend');
        const span = document.createElement('span');
        span.id = 'prof-name-display';
        span.textContent = next;
        input.replaceWith(span);
        update();
      }
      input.addEventListener('blur', commit, { once: true });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') input.blur();
        if (e.key === 'Escape') { input.value = current; input.blur(); }
      });
    }

    editBtn.addEventListener('click', startEdit);
  }

  function bindCashout() {
    const btn = $('prof-cashout');
    const modal = $('prof-confirm');
    const cancel = $('prof-confirm-cancel');
    const ok = $('prof-confirm-ok');
    if (!btn || !modal) return;

    function show() { modal.classList.add('show'); modal.setAttribute('aria-hidden', 'false'); }
    function hide() { modal.classList.remove('show'); modal.setAttribute('aria-hidden', 'true'); }

    btn.addEventListener('click', show);
    cancel.addEventListener('click', hide);
    modal.addEventListener('click', (e) => { if (e.target === modal) hide(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.classList.contains('show')) hide(); });

    ok.addEventListener('click', () => {
      const final = window.CASINO_BANKROLL.read();
      window.CASINO_STATS.bankRun(final);
      window.CASINO_BANKROLL.reload();
      hide();
      update();
    });
  }

  function bindSyncStatus() {
    const pill = $('prof-sync');
    const label = $('prof-sync-label');
    if (!pill || !label) return;
    const COPY = {
      idle:    'Cloud backup',
      syncing: 'Syncing…',
      synced:  'Synced',
      offline: 'Offline · saved locally',
    };
    window.addEventListener('casino:sync-status', (e) => {
      const state = (e.detail && e.detail.state) || 'idle';
      pill.dataset.state = state;
      label.textContent = COPY[state] || COPY.idle;
    });
    window.addEventListener('casino:hydrated', update);
  }

  function init() {
    if (!window.CASINO_BANKROLL || !window.CASINO_PLAYER || !window.CASINO_STATS) {
      console.warn('[profile] Required casino modules not loaded');
      return;
    }
    update();
    bindNameEdit();
    bindCashout();
    bindSyncStatus();
    window.addEventListener('storage', (e) => {
      if (!e.key) return;
      if (e.key === window.CASINO_STATS.KEY ||
          e.key === window.CASINO_BANKROLL.KEY ||
          e.key === window.CASINO_PLAYER.KEY ||
          /HighScore|Stats|Games(Won|Lost)|Best|Wins|kids-|pupQuiz/.test(e.key)) {
        update();
      }
    });
    window.addEventListener('focus', update);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
