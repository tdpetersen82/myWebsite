/* eslint-disable */
// Crash — table logic and rendering. Rounds run continuously on wall-clock
// timestamps: every state change is derived from `now`, so a tab that was
// hidden mid-round settles correctly when it wakes (auto cash-outs that
// should have fired before the bust still pay; a manual cash-out that never
// happened doesn't).
(function () {
  var E = window.CRASH_ENGINE;
  var B = window.CASINO_BANKROLL;
  var STATS = window.CASINO_STATS;
  var PLAYER = window.CASINO_PLAYER;

  var BETTING_MS = 6000;
  var BUST_HOLD_MS = 3200;
  var HISTORY_MAX = 24;
  var SESSION_KEY = 'crashSession';
  var PREFS_KEY = 'crashPrefs';
  var ROUND_KEY = 'crashRound';
  var CHIPS = [5, 10, 25, 50, 100, 250];
  var AUTO_PILLS = [1.5, 2, 3, 5, 10];

  var $ = function (id) { return document.getElementById(id); };
  function fmt(n) { return '$' + Math.max(0, Math.floor(Number(n) || 0)).toLocaleString('en-US'); }
  function fmtSigned(n) { n = Math.floor(Number(n) || 0); return n === 0 ? '$0' : (n > 0 ? '+$' : '-$') + Math.abs(n).toLocaleString('en-US'); }
  function fmtMult(m) { return (Math.floor(m * 100) / 100).toFixed(2) + 'x'; }
  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }

  // ---------------------------------------------------------------- storage
  function loadJson(key, fallback) {
    try { var raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch (e) { return fallback; }
  }
  function saveJson(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) {} }

  function freshSession() {
    return { rounds: 0, wins: 0, wagered: 0, returned: 0, biggest: 0, bestMult: 0, highestBust: 0, streak: 0, bestStreak: 0, startedAt: Date.now(), history: [] };
  }
  var session = Object.assign(freshSession(), loadJson(SESSION_KEY, {}));
  if (!Array.isArray(session.history)) session.history = [];
  function saveSession() { saveJson(SESSION_KEY, session); }

  var prefs = Object.assign({ amount: 25, auto: null }, loadJson(PREFS_KEY, {}));
  function savePrefs() { saveJson(PREFS_KEY, { amount: prefs.amount, auto: prefs.auto }); }

  var roundNo = parseInt(localStorage.getItem(ROUND_KEY), 10) || 0;

  // ----------------------------------------------------------------- state
  var bankroll = B.read();
  var phase = 'betting';
  var round = null;      // { seed, commit, crash, bustAt, startAt, bettingEndsAt, endedAt, bots, cashouts }
  var bet = null;        // { amount, auto, cashedAt, payout, settled }
  var queued = false;    // "bet next round" pressed while a round was live
  var lastOutcome = null;// { won, at, payout, profit, amount } shown through the bust hold
  var soundOn = PLAYER ? PLAYER.get('soundOn', true) !== false : true;
  var brokeTimer = null;

  // ------------------------------------------------------------------ sound
  var actx = null;
  function audio() {
    if (!soundOn) return null;
    try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); return actx; } catch (e) { return null; }
  }
  function tone(freq, dur, type, gain, when) {
    var a = audio(); if (!a) return;
    var o = a.createOscillator(), g = a.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    var t = a.currentTime + (when || 0);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain || 0.12, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  var sfx = {
    bet: function () { tone(520, 0.08, 'triangle', 0.08); },
    cash: function () { tone(660, 0.12, 'sine', 0.12); tone(990, 0.22, 'sine', 0.12, 0.09); },
    bust: function () { tone(140, 0.35, 'sawtooth', 0.10); tone(70, 0.5, 'sine', 0.14, 0.02); },
    tick: function () { tone(880, 0.03, 'square', 0.02); },
  };

  // ----------------------------------------------------------------- rounds
  function randomSeed() {
    var b = new Uint8Array(32);
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(b);
    else for (var i = 0; i < 32; i++) b[i] = Math.floor(Math.random() * 256);
    return b;
  }
  function commitSeed(r) {
    r.commit = null;
    if (!(window.crypto && crypto.subtle)) return;
    crypto.subtle.digest('SHA-256', r.seed).then(function (buf) {
      r.commit = E.hex(new Uint8Array(buf));
      if (round === r) renderFair();
    }).catch(function () {});
  }

  function newRound(now) {
    roundNo++;
    try { localStorage.setItem(ROUND_KEY, String(roundNo)); } catch (e) {}
    var seed = randomSeed();
    round = {
      n: roundNo,
      seed: seed,
      commit: null,
      crash: E.crashPointFromBytes(seed),
      startAt: 0,
      bustAt: 0,
      bettingEndsAt: now + BETTING_MS,
      endedAt: 0,
      bots: E.makeBots(),
      cashouts: [],     // { t, m, who, payout } markers drawn on the curve
    };
    commitSeed(round);
    phase = 'betting';
    bet = null;
    lastOutcome = null;
    if (queued) { queued = false; placeBet(); }
    renderAll();
    checkBroke();
  }

  function startRunning(now) {
    phase = 'running';
    round.startAt = now;
    round.bustAt = now + E.timeToMultiplier(round.crash);
    renderAll();
  }

  function liveMultiplier(now) {
    if (phase !== 'running' || !round) return 1;
    return E.displayMultiplier(now - round.startAt);
  }

  function tick(now) {
    if (!round) { newRound(now); return; }
    if (phase === 'betting') {
      if (now >= round.bettingEndsAt) startRunning(now);
      return;
    }
    if (phase === 'running') {
      var atBust = now >= round.bustAt;
      var m = atBust ? round.crash : liveMultiplier(now);
      // Computer players cash at their targets, but only targets under the
      // bust point ever fire.
      for (var i = 0; i < round.bots.length; i++) {
        var b = round.bots[i];
        if (b.done) continue;
        if (b.target < round.crash && b.target <= m) {
          b.done = true; b.cashedAt = b.target;
          round.cashouts.push({ t: E.timeToMultiplier(b.target), m: b.target, who: b.name, payout: Math.floor(b.bet * b.target), bot: true });
        }
      }
      if (bet && bet.cashedAt == null && bet.auto && bet.auto < round.crash && bet.auto <= m) {
        cashOutAt(bet.auto, true);
      }
      if (atBust) bust(now);
      return;
    }
    if (phase === 'busted') {
      if (now >= round.endedAt + BUST_HOLD_MS) newRound(now);
    }
  }

  function bust(now) {
    phase = 'busted';
    round.endedAt = now;
    for (var i = 0; i < round.bots.length; i++) if (!round.bots[i].done) round.bots[i].done = true;
    session.history.unshift(round.crash);
    if (session.history.length > HISTORY_MAX) session.history.length = HISTORY_MAX;
    if (round.crash > (session.highestBust || 0)) session.highestBust = round.crash;
    if (bet) {
      if (bet.cashedAt == null) {
        var s = E.settle({ bet: bet.amount, auto: bet.auto, crash: round.crash, cashedAt: null });
        settleBet(s);
      }
      bet.settled = true;
    }
    saveSession();
    sfx.bust();
    renderAll();
  }

  // ------------------------------------------------------------------- bets
  function currentAmount() {
    var v = Math.floor(Number(prefs.amount) || 0);
    return clamp(v, E.MIN_BET, E.MAX_BET);
  }
  function canAfford() { return bankroll >= currentAmount() && bankroll >= E.MIN_BET; }

  function placeBet() {
    if (phase !== 'betting' || bet) return;
    var amount = currentAmount();
    if (amount > bankroll) amount = Math.floor(bankroll);
    if (amount < E.MIN_BET) { checkBroke(); return; }
    bankroll = B.write(bankroll - amount);
    bet = { amount: amount, auto: prefs.auto || null, cashedAt: null, payout: 0, settled: false };
    sfx.bet();
    renderAll();
  }
  function cancelBet() {
    if (phase !== 'betting' || !bet) return;
    bankroll = B.write(bankroll + bet.amount);
    bet = null;
    renderAll();
  }
  function cashOut() {
    if (phase !== 'running' || !bet || bet.cashedAt != null) return;
    var now = performance.now();
    if (now >= round.bustAt) return;
    cashOutAt(liveMultiplier(now), false);
  }
  function cashOutAt(m, auto) {
    if (!bet || bet.cashedAt != null) return;
    var s = E.settle({ bet: bet.amount, auto: auto ? m : null, crash: round.crash, cashedAt: auto ? null : m });
    if (!s.won) return;
    bet.cashedAt = s.at;
    round.cashouts.push({ t: E.timeToMultiplier(s.at), m: s.at, who: 'You', payout: s.payout, bot: false });
    settleBet(s);
    sfx.cash();
    renderAll();
  }
  // Bank a settled bet and record it everywhere that keeps score.
  function settleBet(s) {
    bet.payout = s.payout;
    lastOutcome = { won: s.won, at: s.at, payout: s.payout, profit: s.profit, amount: bet.amount };
    if (s.won) {
      bankroll = B.write(bankroll + s.payout);
      if (STATS) STATS.recordPeak(bankroll);
    }
    session.rounds++;
    session.wagered += bet.amount;
    session.returned += s.payout;
    if (s.won) {
      session.wins++;
      session.streak = Math.max(0, session.streak) + 1;
      if (session.streak > session.bestStreak) session.bestStreak = session.streak;
      if (s.profit > session.biggest) session.biggest = s.profit;
      if (s.at > session.bestMult) session.bestMult = s.at;
    } else {
      session.streak = 0;
    }
    saveSession();
    if (STATS) STATS.recordEvent('crash', { won: s.won, payout: s.payout, mult: s.won ? s.at : 0 });
    try {
      if (typeof window.gtag === 'function') window.gtag('event', 'crash_bet', { outcome: s.won ? 'cashout' : 'bust', page_path: location.pathname });
    } catch (e) {}
  }

  function primaryAction() {
    if (phase === 'betting') { bet ? cancelBet() : placeBet(); return; }
    if (phase === 'running' && bet && bet.cashedAt == null) { cashOut(); return; }
    if (!bet || bet.settled || phase === 'busted') { queued = !queued; renderControls(); }
  }

  // ------------------------------------------------------------------ broke
  function checkBroke() {
    if (!window.CASINO_RELOAD) return;
    clearTimeout(brokeTimer);
    if (phase !== 'betting' || bet || bankroll >= E.MIN_BET) return;
    brokeTimer = setTimeout(function () {
      if (phase !== 'betting' || bet || bankroll >= E.MIN_BET) return;
      queued = false;
      window.CASINO_RELOAD.open({
        game: 'crash',
        minBet: E.MIN_BET,
        message: 'That last bust took the rest of it.',
        continueLabel: 'Back to the table',
        onReset: function (v) { bankroll = v; renderAll(); },
      });
    }, 900);
  }

  // Another tab or the cloud restored the bankroll: adopt it when nothing is
  // staked here.
  function onExternal() {
    var v = B.read();
    if (v !== bankroll && !bet) { bankroll = v; renderAll(); }
  }
  window.addEventListener('storage', function (e) { if (e.key === B.KEY) onExternal(); });
  window.addEventListener('casino:hydrated', onExternal);

  // Leaving the page with a live stake: refund it during the countdown, and
  // mid-round settle at the multiplier showing right now — exactly what a
  // manual cash-out at that instant would have paid, so nothing is gained
  // or lost by reloading.
  var unloaded = false;
  window.addEventListener('pagehide', function () {
    if (unloaded) return;
    unloaded = true;
    if (!bet || bet.settled || bet.cashedAt != null) return;
    if (phase === 'betting') { cancelBet(); return; }
    if (phase === 'running') {
      var now = performance.now();
      if (now < round.bustAt) cashOutAt(liveMultiplier(now), false);
    }
  });

  // ------------------------------------------------------------- rendering
  var canvas = $('cr-canvas');
  var ctx = canvas.getContext('2d');
  var cw = 0, ch = 0, dpr = 1;
  function fitCanvas() {
    var r = canvas.getBoundingClientRect();
    var root = $('root');
    var scale = 1;
    var m = /scale\(([\d.]+)\)/.exec(root.style.transform || '');
    if (m) scale = Number(m[1]) || 1;
    // The page scales #root with a CSS transform; size the bitmap for the
    // design-pixel box so text stays crisp at any scale.
    var w = Math.round(r.width / scale), h = Math.round(r.height / scale);
    if (!w || !h) return;
    dpr = Math.min(2, (window.devicePixelRatio || 1) * scale);
    cw = w; ch = h;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  }
  window.addEventListener('resize', function () { fitCanvas(); });
  window.addEventListener('cr:canvas', function () { fitCanvas(); renderAll(); });

  var GRID = 'rgba(201,162,106,0.10)';
  var GOLD = '#e6c590';
  var GOLD_DIM = 'rgba(230,197,144,0.35)';
  var RED = '#e8786f';
  var GREEN = '#7ed8a1';
  var IVORY = '#f4ecd8';
  var MONO = '"JetBrains Mono", ui-monospace, monospace';
  var DISPLAY = '"Bricolage Grotesque", "Inter", sans-serif';

  function drawGraph(now) {
    if (!cw) fitCanvas();
    if (!cw) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
    var portrait = ch < 360;
    var padL = portrait ? 34 : 48, padR = 18, padT = 20, padB = portrait ? 24 : 30;
    var gw = cw - padL - padR, gh = ch - padT - padB;

    var elapsed = 0, m = 1;
    if (phase === 'running') { elapsed = now - round.startAt; m = liveMultiplier(now); }
    else if (phase === 'busted') { elapsed = round.bustAt - round.startAt; m = round.crash; }
    // Windows: the axes grow with the curve so the tip stays inside the box.
    var tMax = Math.max(8000, elapsed * 1.12);
    var mMax = Math.max(2.2, 1 + (m - 1) * 1.22);
    var X = function (t) { return padL + (t / tMax) * gw; };
    var Y = function (mm) { return padT + gh - ((mm - 1) / (mMax - 1)) * gh; };

    // grid: multiplier lines
    ctx.lineWidth = 1;
    ctx.font = '11px ' + MONO;
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    var stepM = niceStep((mMax - 1) / 5);
    for (var mm = 1; mm <= mMax + 1e-9; mm += stepM) {
      var y = Y(mm);
      ctx.strokeStyle = GRID; ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + gw, y); ctx.stroke();
      ctx.fillStyle = 'rgba(244,236,216,0.45)';
      ctx.fillText(mm.toFixed(stepM < 1 ? 1 : 0) + 'x', padL - 8, y);
    }
    // grid: time lines
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    var stepT = niceStep(tMax / 1000 / 6) * 1000;
    for (var tt = 0; tt <= tMax + 1e-9; tt += stepT) {
      var x = X(tt);
      ctx.strokeStyle = GRID; ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, padT + gh); ctx.stroke();
      ctx.fillStyle = 'rgba(244,236,216,0.45)';
      ctx.fillText((tt / 1000).toFixed(stepT < 1000 ? 1 : 0) + 's', x, padT + gh + 8);
    }
    // frame
    ctx.strokeStyle = 'rgba(201,162,106,0.28)';
    ctx.strokeRect(padL + 0.5, padT + 0.5, gw - 1, gh - 1);

    if (phase === 'betting') { drawBettingOverlay(now, padL, padT, gw, gh); return; }

    // curve
    var busted = phase === 'busted';
    var color = busted ? RED : GOLD;
    var steps = 90;
    ctx.beginPath();
    ctx.moveTo(X(0), Y(1));
    for (var i = 1; i <= steps; i++) {
      var t = (elapsed * i) / steps;
      ctx.lineTo(X(t), Y(E.multiplierAt(t)));
    }
    var tipX = X(elapsed), tipY = Y(m);
    // area fill
    ctx.lineTo(tipX, padT + gh); ctx.lineTo(X(0), padT + gh); ctx.closePath();
    var fill = ctx.createLinearGradient(0, padT, 0, padT + gh);
    fill.addColorStop(0, busted ? 'rgba(232,120,111,0.28)' : 'rgba(230,197,144,0.28)');
    fill.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = fill; ctx.fill();
    // stroke
    ctx.beginPath();
    ctx.moveTo(X(0), Y(1));
    for (var j = 1; j <= steps; j++) { var t2 = (elapsed * j) / steps; ctx.lineTo(X(t2), Y(E.multiplierAt(t2))); }
    ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.shadowColor = color; ctx.shadowBlur = 14;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // cash-out markers (labels skip when they'd overprint the previous one)
    ctx.font = '10px ' + MONO; ctx.textBaseline = 'middle';
    var lastLx = -1e9, lastLy = -1e9;
    for (var k = 0; k < round.cashouts.length; k++) {
      var c = round.cashouts[k];
      var cx = X(c.t), cy = Y(c.m);
      var crowded = c.bot && Math.abs(cy - lastLy) < 13 && Math.abs(cx - lastLx) < 90;
      ctx.beginPath(); ctx.arc(cx, cy, c.bot ? 3.5 : 5.5, 0, Math.PI * 2);
      ctx.fillStyle = c.bot ? 'rgba(126,216,161,0.8)' : IVORY; ctx.fill();
      if (!c.bot) { ctx.lineWidth = 2; ctx.strokeStyle = GREEN; ctx.stroke(); }
      if ((!portrait || !c.bot) && !crowded) {
        lastLx = cx; lastLy = cy;
        ctx.fillStyle = c.bot ? 'rgba(126,216,161,0.85)' : IVORY;
        ctx.textAlign = 'left';
        var label = c.bot ? c.who + ' ' + fmtMult(c.m) : 'You ' + fmtMult(c.m) + ' · ' + fmt(c.payout);
        var lx = cx + 9, ly = cy - 9;
        if (lx + ctx.measureText(label).width > padL + gw) { ctx.textAlign = 'right'; lx = cx - 9; }
        ctx.fillText(label, lx, ly);
      }
    }

    // tip
    if (!busted) {
      ctx.beginPath(); ctx.arc(tipX, tipY, 9, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(230,197,144,0.25)'; ctx.fill();
      ctx.beginPath(); ctx.arc(tipX, tipY, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = IVORY; ctx.fill();
    } else {
      // burst
      ctx.strokeStyle = RED; ctx.lineWidth = 2;
      for (var a = 0; a < 8; a++) {
        var ang = (a / 8) * Math.PI * 2;
        ctx.beginPath(); ctx.moveTo(tipX + Math.cos(ang) * 6, tipY + Math.sin(ang) * 6); ctx.lineTo(tipX + Math.cos(ang) * 16, tipY + Math.sin(ang) * 16); ctx.stroke();
      }
    }

    // headline multiplier
    var big = portrait ? 54 : 88;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    var hx = padL + gw / 2, hy = padT + gh * (portrait ? 0.34 : 0.36);
    if (busted) {
      ctx.fillStyle = RED;
      ctx.font = '700 ' + (portrait ? 13 : 16) + 'px ' + MONO;
      ctx.fillText('B U S T E D', hx, hy - big * 0.62);
      ctx.font = '700 ' + big + 'px ' + DISPLAY;
      ctx.shadowColor = 'rgba(232,120,111,0.55)'; ctx.shadowBlur = 24;
      ctx.fillText(fmtMult(round.crash), hx, hy);
      ctx.shadowBlur = 0;
      if (lastOutcome) {
        ctx.font = '600 ' + (portrait ? 14 : 18) + 'px Inter, system-ui, sans-serif';
        ctx.fillStyle = lastOutcome.won ? GREEN : RED;
        ctx.fillText(lastOutcome.won
          ? 'You cashed out at ' + fmtMult(lastOutcome.at) + ' for ' + fmtSigned(lastOutcome.profit)
          : 'You lost ' + fmt(lastOutcome.amount), hx, hy + big * 0.66);
      }
    } else {
      ctx.fillStyle = GOLD;
      ctx.font = '700 ' + big + 'px ' + DISPLAY;
      ctx.shadowColor = 'rgba(230,197,144,0.45)'; ctx.shadowBlur = 22;
      ctx.fillText(fmtMult(m), hx, hy);
      ctx.shadowBlur = 0;
      if (bet && bet.cashedAt == null) {
        ctx.font = '600 ' + (portrait ? 13 : 15) + 'px Inter, system-ui, sans-serif';
        ctx.fillStyle = 'rgba(244,236,216,0.7)';
        ctx.fillText('Cash out now for ' + fmt(bet.amount * m), hx, hy + big * 0.62);
      } else if (bet && bet.cashedAt != null) {
        ctx.font = '600 ' + (portrait ? 13 : 15) + 'px Inter, system-ui, sans-serif';
        ctx.fillStyle = GREEN;
        ctx.fillText('Cashed out at ' + fmtMult(bet.cashedAt) + ' · ' + fmtSigned(bet.payout - bet.amount), hx, hy + big * 0.62);
      }
    }
  }

  function drawBettingOverlay(now, padL, padT, gw, gh) {
    var left = Math.max(0, round.bettingEndsAt - now);
    var portrait = ch < 360;
    var hx = padL + gw / 2, hy = padT + gh * 0.42;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(244,236,216,0.55)';
    ctx.font = '700 ' + (portrait ? 12 : 14) + 'px ' + MONO;
    ctx.fillText('N E X T   R O U N D', hx, hy - (portrait ? 40 : 58));
    ctx.fillStyle = GOLD;
    ctx.font = '700 ' + (portrait ? 48 : 72) + 'px ' + DISPLAY;
    ctx.fillText((left / 1000).toFixed(1) + 's', hx, hy);
    // progress bar
    var bw = Math.min(gw * 0.5, 360), bh = 6, bx = hx - bw / 2, by = hy + (portrait ? 40 : 60);
    ctx.fillStyle = 'rgba(201,162,106,0.18)'; roundRect(bx, by, bw, bh, 3); ctx.fill();
    ctx.fillStyle = GOLD; roundRect(bx, by, bw * (left / BETTING_MS), bh, 3); ctx.fill();
    ctx.font = '600 ' + (portrait ? 13 : 15) + 'px Inter, system-ui, sans-serif';
    ctx.fillStyle = bet ? GREEN : 'rgba(244,236,216,0.7)';
    ctx.fillText(bet ? fmt(bet.amount) + ' in' + (bet.auto ? ' · auto ' + fmtMult(bet.auto) : '') : 'Place your bet', hx, by + 28);
    // last round ghost
    if (session.history.length) {
      ctx.font = '11px ' + MONO; ctx.fillStyle = 'rgba(244,236,216,0.35)';
      ctx.fillText('last bust ' + fmtMult(session.history[0]), hx, padT + gh - 16);
    }
  }
  function roundRect(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }
  function niceStep(raw) {
    var p = Math.pow(10, Math.floor(Math.log10(raw)));
    var f = raw / p;
    var n = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
    return n * p;
  }

  // DOM ---------------------------------------------------------------
  function renderBank() {
    $('cr-bank').textContent = fmt(bankroll);
  }
  function renderControls() {
    var btn = $('cr-action');
    var amt = currentAmount();
    btn.className = 'cr-action';
    btn.disabled = false;
    var label = '', sub = '';
    if (phase === 'betting') {
      if (bet) { label = 'Cancel bet'; sub = fmt(bet.amount) + ' staked'; btn.classList.add('is-cancel'); }
      else if (!canAfford()) { label = 'Place bet'; sub = bankroll < E.MIN_BET ? 'Out of chips' : 'Lower your bet'; btn.disabled = true; }
      else { label = 'Place bet'; sub = fmt(amt) + (prefs.auto ? ' · auto ' + fmtMult(prefs.auto) : ''); btn.classList.add('is-bet'); }
    } else if (bet && bet.cashedAt == null && !bet.settled) {
      label = 'Cash out'; sub = 'live'; btn.classList.add('is-cash');
    } else if (bet && phase === 'running') {
      label = 'Cashed out'; sub = fmtMult(bet.cashedAt) + ' · ' + fmtSigned(bet.payout - bet.amount); btn.disabled = true; btn.classList.add('is-done');
    } else if (queued) {
      label = 'Queued'; sub = fmt(amt) + ' next round · tap to cancel'; btn.classList.add('is-queued');
    } else if (bet && phase === 'busted' && bet.cashedAt == null) {
      label = 'Busted'; sub = fmt(bet.amount) + ' lost'; btn.classList.add('is-lost'); btn.disabled = true;
    } else {
      label = 'Bet next round'; sub = fmt(amt); btn.classList.add('is-next');
      if (!canAfford()) { btn.disabled = true; sub = bankroll < E.MIN_BET ? 'Out of chips' : 'Lower your bet'; }
    }
    btn.querySelector('.l').textContent = label;
    btn.querySelector('.s').textContent = sub;
    // inputs lock while a bet is live
    var locked = !!bet && !bet.settled && phase !== 'busted';
    $('cr-amount').disabled = locked;
    $('cr-auto').disabled = locked;
    var chips = document.querySelectorAll('.cr-chip');
    for (var i = 0; i < chips.length; i++) {
      chips[i].disabled = locked;
      chips[i].classList.toggle('active', Number(chips[i].dataset.v) === amt);
    }
    var pills = document.querySelectorAll('.cr-pill');
    for (var j = 0; j < pills.length; j++) {
      pills[j].disabled = locked;
      var v = pills[j].dataset.v === 'off' ? null : Number(pills[j].dataset.v);
      pills[j].classList.toggle('active', v === (prefs.auto || null));
    }
    if (document.activeElement !== $('cr-amount')) $('cr-amount').value = amt;
    if (document.activeElement !== $('cr-auto')) $('cr-auto').value = prefs.auto ? prefs.auto.toFixed(2) : '';
  }
  function renderCashLive(now) {
    // Only the cash-out button's live amount changes per frame.
    if (phase !== 'running' || !bet || bet.cashedAt != null) return;
    var m = liveMultiplier(now);
    $('cr-action').querySelector('.s').textContent = fmt(bet.amount * m) + ' · ' + fmtMult(m);
  }
  function renderHistory() {
    var box = $('cr-history');
    box.innerHTML = '';
    if (!session.history.length) { box.appendChild(el('div', 'cr-empty', 'No rounds yet')); return; }
    for (var i = 0; i < session.history.length; i++) {
      var v = session.history[i];
      var p = el('span', 'cr-hist ' + (v < 2 ? 'lo' : v < 10 ? 'mid' : 'hi'), fmtMult(v));
      if (i === 0) p.classList.add('latest');
      box.appendChild(p);
    }
  }
  function renderTable() {
    var list = $('cr-table');
    list.innerHTML = '';
    if (!round) return;
    var you = el('div', 'cr-row you');
    you.appendChild(el('span', 'n', 'You'));
    you.appendChild(el('span', 'b', bet ? fmt(bet.amount) : queued ? fmt(currentAmount()) : '—'));
    var st = el('span', 's');
    if (!bet) { st.textContent = queued ? 'next round' : phase === 'betting' ? 'no bet' : 'watching'; st.className = 's dim'; }
    else if (bet.cashedAt != null) { st.textContent = fmtMult(bet.cashedAt) + ' · ' + fmtSigned(bet.payout - bet.amount); st.className = 's win'; }
    else if (phase === 'busted') { st.textContent = 'bust · ' + fmtSigned(-bet.amount); st.className = 's lose'; }
    else { st.textContent = phase === 'betting' ? 'in' + (bet.auto ? ' · auto ' + fmtMult(bet.auto) : '') : 'riding'; st.className = 's live'; }
    you.appendChild(st);
    list.appendChild(you);
    for (var i = 0; i < round.bots.length; i++) {
      var b = round.bots[i];
      var row = el('div', 'cr-row');
      row.appendChild(el('span', 'n', b.name));
      row.appendChild(el('span', 'b', fmt(b.bet)));
      var s = el('span', 's');
      if (b.cashedAt != null) { s.textContent = fmtMult(b.cashedAt) + ' · ' + fmtSigned(Math.floor(b.bet * b.cashedAt) - b.bet); s.className = 's win'; }
      else if (b.done) { s.textContent = 'bust · ' + fmtSigned(-b.bet); s.className = 's lose'; }
      else { s.textContent = phase === 'betting' ? 'in' : 'riding'; s.className = 's live'; }
      row.appendChild(s);
      list.appendChild(row);
    }
  }
  function renderStats() {
    var net = session.returned - session.wagered;
    var wr = session.rounds ? Math.round((session.wins / session.rounds) * 100) + '%' : '—';
    setStat('cr-st-rounds', String(session.rounds), null);
    setStat('cr-st-wr', wr, null);
    setStat('cr-st-net', fmtSigned(net), net > 0 ? 'pos' : net < 0 ? 'neg' : null);
    setStat('cr-st-big', session.biggest > 0 ? '+' + fmt(session.biggest) : '—', session.biggest > 0 ? 'pos' : null);
    setStat('cr-st-mult', session.bestMult > 0 ? fmtMult(session.bestMult) : '—', null);
    setStat('cr-st-bust', session.highestBust > 0 ? fmtMult(session.highestBust) : '—', null);
    $('cr-reset').disabled = session.rounds === 0 && session.history.length === 0;
  }
  function setStat(id, v, cls) {
    var n = $(id); n.textContent = v; n.className = 'cr-stat-v' + (cls ? ' ' + cls : '');
  }
  function renderFair() {
    var f = $('cr-fair');
    if (!round) { f.textContent = ''; return; }
    var short = function (h) { return h ? h.slice(0, 10) + '…' + h.slice(-6) : '—'; };
    if (phase === 'busted') {
      f.innerHTML = '';
      f.appendChild(el('span', 'k', 'Round ' + round.n));
      f.appendChild(el('span', 'v', 'seed ' + short(E.hex(round.seed)) + ' → ' + fmtMult(round.crash)));
      var a = el('a', 'cr-verify', 'verify');
      a.href = '#fairness';
      a.addEventListener('click', function () { $('cr-seed-in').value = E.hex(round.seed); verifySeed(); });
      f.appendChild(a);
    } else {
      f.innerHTML = '';
      f.appendChild(el('span', 'k', 'Round ' + round.n));
      f.appendChild(el('span', 'v', 'hash ' + short(round.commit)));
    }
  }
  function renderAll() {
    renderBank(); renderControls(); renderHistory(); renderTable(); renderStats(); renderFair();
  }

  // ------------------------------------------------------------ verifier
  function verifySeed() {
    var out = $('cr-seed-out');
    var hexStr = ($('cr-seed-in').value || '').trim().toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(hexStr)) { out.textContent = 'Paste the 64-character seed shown after a bust.'; return; }
    var bytes = new Uint8Array(32);
    for (var i = 0; i < 32; i++) bytes[i] = parseInt(hexStr.substr(i * 2, 2), 16);
    var m = E.crashPointFromBytes(bytes);
    out.textContent = 'Bust point ' + fmtMult(m) + ' · hash computing…';
    if (window.crypto && crypto.subtle) {
      crypto.subtle.digest('SHA-256', bytes).then(function (buf) {
        out.textContent = 'Bust point ' + fmtMult(m) + ' · SHA-256 ' + E.hex(new Uint8Array(buf));
      });
    } else out.textContent = 'Bust point ' + fmtMult(m);
  }

  // ---------------------------------------------------------------- input
  $('cr-action').addEventListener('click', primaryAction);
  $('cr-amount').addEventListener('change', function () {
    prefs.amount = clamp(Math.floor(Number(this.value) || 0), E.MIN_BET, E.MAX_BET);
    savePrefs(); renderControls();
  });
  $('cr-amount').addEventListener('keydown', function (e) { if (e.key === 'Enter') this.blur(); });
  $('cr-auto').addEventListener('change', function () {
    var v = Number(this.value);
    prefs.auto = v >= E.MIN_AUTO ? Math.floor(v * 100) / 100 : null;
    savePrefs(); renderControls();
  });
  $('cr-auto').addEventListener('keydown', function (e) { if (e.key === 'Enter') this.blur(); });
  var chipBox = $('cr-chips');
  CHIPS.forEach(function (v) {
    var b = el('button', 'cr-chip', '$' + v); b.type = 'button'; b.dataset.v = v;
    b.addEventListener('click', function () { prefs.amount = v; savePrefs(); renderControls(); });
    chipBox.appendChild(b);
  });
  $('cr-half').addEventListener('click', function () { prefs.amount = clamp(Math.floor(currentAmount() / 2), E.MIN_BET, E.MAX_BET); savePrefs(); renderControls(); });
  $('cr-double').addEventListener('click', function () { prefs.amount = clamp(currentAmount() * 2, E.MIN_BET, E.MAX_BET); savePrefs(); renderControls(); });
  var pillBox = $('cr-pills');
  AUTO_PILLS.concat(['off']).forEach(function (v) {
    var b = el('button', 'cr-pill', v === 'off' ? 'Off' : v + 'x'); b.type = 'button'; b.dataset.v = v;
    b.addEventListener('click', function () { prefs.auto = v === 'off' ? null : v; savePrefs(); renderControls(); });
    pillBox.appendChild(b);
  });
  $('cr-reset').addEventListener('click', function () {
    session = freshSession(); saveSession(); renderHistory(); renderStats();
  });
  $('cr-sound').addEventListener('click', function () {
    soundOn = !soundOn;
    if (PLAYER) PLAYER.set('soundOn', soundOn);
    renderSound();
  });
  function renderSound() {
    var b = $('cr-sound');
    b.classList.toggle('muted', !soundOn);
    b.setAttribute('aria-label', soundOn ? 'Sound on' : 'Sound off');
    b.title = soundOn ? 'Sound on' : 'Sound off';
  }
  $('cr-seed-go').addEventListener('click', verifySeed);
  $('cr-seed-in').addEventListener('keydown', function (e) { if (e.key === 'Enter') verifySeed(); });

  window.addEventListener('keydown', function (e) {
    if (e.defaultPrevented) return;
    var tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (e.code === 'Space' || e.key === ' ') { e.preventDefault(); if (!$('cr-action').disabled) primaryAction(); }
    else if (e.key === 'Escape') { if (phase === 'betting' && bet) cancelBet(); else if (queued) { queued = false; renderControls(); } }
  });

  // ----------------------------------------------------------------- loop
  var lastPhase = null, lastSecond = -1, lastCashCount = 0;
  function frame() {
    var now = performance.now();
    tick(now);
    if (phase !== lastPhase) { lastPhase = phase; lastCashCount = round ? round.cashouts.length : 0; renderAll(); }
    if (phase === 'running') {
      // a soft tick each whole multiplier crossed while you're riding
      var m = liveMultiplier(now);
      var sec = Math.floor(m);
      if (bet && bet.cashedAt == null && sec !== lastSecond && sec > 1) sfx.tick();
      lastSecond = sec;
      renderCashLive(now);
      if (round.cashouts.length !== lastCashCount) { lastCashCount = round.cashouts.length; renderTable(); }
    } else lastSecond = -1;
    drawGraph(now);
    requestAnimationFrame(frame);
  }
  // Background tabs get no animation frames; keep the round clock moving so
  // the state is right when the tab wakes.
  setInterval(function () { tick(performance.now()); }, 500);

  fitCanvas();
  renderSound();
  newRound(performance.now());
  requestAnimationFrame(frame);
})();
