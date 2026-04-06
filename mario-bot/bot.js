// Mario Speedrun Bot — Record & Replay Engine
// RECORD: Watches you play, captures every keypress with emulator frame number.
// REPLAY: Plays back a recorded sequence via gameManager.simulateInput().

(function() {
    'use strict';

    // NES button codes for simulateInput(player, button, state)
    const BTN = { B: 0, SELECT: 2, START: 3, UP: 4, DOWN: 5, LEFT: 6, RIGHT: 7, A: 8 };
    const BTN_NAME = { 0:'B', 2:'SEL', 3:'START', 4:'UP', 5:'DOWN', 6:'LEFT', 7:'RIGHT', 8:'A' };

    // Keyboard → NES button mapping (EmulatorJS NES defaults)
    const KEY_MAP = {
        'ArrowUp': BTN.UP, 'ArrowDown': BTN.DOWN, 'ArrowLeft': BTN.LEFT, 'ArrowRight': BTN.RIGHT,
        'KeyZ': BTN.A, 'KeyX': BTN.B, 'Enter': BTN.START, 'ShiftRight': BTN.SELECT,
        // WASD alternative
        'KeyW': BTN.UP, 'KeyS': BTN.DOWN, 'KeyA': BTN.LEFT, 'KeyD': BTN.RIGHT,
    };

    const buttonState = {};
    let mode = 'idle'; // idle, recording, replaying
    let startFrame = 0;
    let animFrameId = null;

    // Recording
    let recordLog = [];

    // Replay
    let replaySequence = [];
    let replayIndex = 0;

    // UI log
    const MAX_LOG_LINES = 200;

    // ========== LOGGING ==========

    function log(msg, type) {
        const el = document.getElementById('log');
        if (!el) return;
        const cls = type || 'action';
        const line = document.createElement('div');
        line.innerHTML = '<span class="log-' + cls + '">' + msg + '</span>';
        el.appendChild(line);
        // Auto-scroll
        el.scrollTop = el.scrollHeight;
        // Trim old lines
        while (el.children.length > MAX_LOG_LINES) el.removeChild(el.firstChild);
    }
    window.botLog = log;

    // ========== EMU FRAME ==========

    function getEmuFrame() {
        try { return EJS_emulator.gameManager.Module._get_current_frame_count(); }
        catch(e) { return -1; }
    }

    function relFrame() {
        const f = getEmuFrame();
        return f >= 0 ? f - startFrame : 0;
    }

    // ========== INPUT ==========

    function press(btn) {
        if (buttonState[btn]) return;
        buttonState[btn] = true;
        try { EJS_emulator.gameManager.simulateInput(0, btn, 1); } catch(e) {}
    }

    function release(btn) {
        if (!buttonState[btn]) return;
        buttonState[btn] = false;
        try { EJS_emulator.gameManager.simulateInput(0, btn, 0); } catch(e) {}
    }

    function releaseAll() {
        for (const b of Object.values(BTN)) {
            if (buttonState[b]) {
                buttonState[b] = false;
                try { EJS_emulator.gameManager.simulateInput(0, b, 0); } catch(e) {}
            }
        }
    }

    function inputString() {
        const held = [];
        if (buttonState[BTN.UP]) held.push('\u25B2');
        if (buttonState[BTN.DOWN]) held.push('\u25BC');
        if (buttonState[BTN.LEFT]) held.push('\u25C0');
        if (buttonState[BTN.RIGHT]) held.push('\u25B6');
        if (buttonState[BTN.A]) held.push('A');
        if (buttonState[BTN.B]) held.push('B');
        if (buttonState[BTN.START]) held.push('ST');
        if (buttonState[BTN.SELECT]) held.push('SE');
        return held.join(' ') || '---';
    }

    // ========== RECORD MODE ==========

    function startRecording() {
        if (mode !== 'idle') return;

        // Focus the emulator canvas so keyboard inputs go to the game
        const canvas = document.querySelector('canvas');
        if (canvas) {
            canvas.focus();
            canvas.click();
        }

        mode = 'recording';
        recordLog = [];
        startFrame = getEmuFrame();

        document.getElementById('btn-record').classList.add('active');
        document.getElementById('btn-record').textContent = 'REC \u25CF';
        document.getElementById('btn-record').disabled = true;
        document.getElementById('btn-start').disabled = true;
        document.getElementById('btn-stop').disabled = false;
        document.getElementById('status-text').textContent = 'RECORDING';
        document.getElementById('status-text').className = 'value recording';
        document.getElementById('mode-text').textContent = 'RECORD';

        window.addEventListener('keydown', onKeyDown, true);
        window.addEventListener('keyup', onKeyUp, true);

        log('Recording started at emu frame ' + startFrame, 'info');
        log('Game focused. Play now!', 'info');

        animFrameId = requestAnimationFrame(recordLoop);
    }

    function stopRecording() {
        if (mode !== 'recording') return;
        mode = 'idle';

        window.removeEventListener('keydown', onKeyDown, true);
        window.removeEventListener('keyup', onKeyUp, true);
        if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }

        document.getElementById('btn-record').classList.remove('active');
        document.getElementById('btn-record').textContent = 'RECORD';
        document.getElementById('btn-record').disabled = false;
        document.getElementById('btn-start').disabled = false;
        document.getElementById('btn-stop').disabled = true;
        document.getElementById('status-text').textContent = 'STOPPED';
        document.getElementById('status-text').className = 'value stopped';

        log('Recording stopped. ' + recordLog.length + ' events captured.', 'info');
        log('Sequence dumped to console (copy with marioBot.getLog())', 'info');

        // Store for replay
        replaySequence = recordLog.slice();

        // Dump to console
        console.log('[BOT] Recorded TAS sequence (' + recordLog.length + ' events):');
        console.log(JSON.stringify(recordLog));

        // Also a readable version
        const readable = recordLog.map(e => {
            const action = e[2] === 1 ? 'PRESS' : 'REL  ';
            return 'f' + String(e[0]).padStart(6) + '  ' + action + '  ' + (BTN_NAME[e[1]] || '?');
        }).join('\n');
        console.log('[BOT] Readable:\n' + readable);
    }

    function onKeyDown(e) {
        if (mode !== 'recording') return;
        const btn = KEY_MAP[e.code];
        if (btn === undefined) return;
        // Don't double-record held keys
        if (buttonState[btn]) return;
        buttonState[btn] = true;

        const rf = relFrame();
        recordLog.push([rf, btn, 1]);
        log('<span class="log-frame">f' + rf + '</span> <span class="log-action">PRESS</span> <span class="log-btn">' + (BTN_NAME[btn] || btn) + '</span>');
    }

    function onKeyUp(e) {
        if (mode !== 'recording') return;
        const btn = KEY_MAP[e.code];
        if (btn === undefined) return;
        if (!buttonState[btn]) return;
        buttonState[btn] = false;

        const rf = relFrame();
        recordLog.push([rf, btn, 0]);
        log('<span class="log-frame">f' + rf + '</span> <span class="log-action">REL  </span> <span class="log-btn">' + (BTN_NAME[btn] || btn) + '</span>');
    }

    function recordLoop() {
        if (mode !== 'recording') return;
        updateUI();
        animFrameId = requestAnimationFrame(recordLoop);
    }

    // ========== REPLAY MODE ==========

    function startReplay() {
        if (mode !== 'idle') return;
        if (!replaySequence.length) {
            log('No recording to replay! Record first.', 'warn');
            return;
        }

        // Focus canvas so simulateInput works
        const canvas = document.querySelector('canvas');
        if (canvas) { canvas.focus(); canvas.click(); }

        mode = 'replaying';
        releaseAll();
        startFrame = getEmuFrame();
        replayIndex = 0;

        document.getElementById('btn-record').disabled = true;
        document.getElementById('btn-start').disabled = true;
        document.getElementById('btn-stop').disabled = false;
        document.getElementById('status-text').textContent = 'REPLAYING';
        document.getElementById('status-text').className = 'value running';
        document.getElementById('mode-text').textContent = 'REPLAY';

        log('Replay started. ' + replaySequence.length + ' events.', 'info');

        animFrameId = requestAnimationFrame(replayLoop);
    }

    function stopReplay() {
        if (mode !== 'replaying') return;
        mode = 'idle';
        if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }
        releaseAll();

        document.getElementById('btn-record').disabled = false;
        document.getElementById('btn-start').disabled = false;
        document.getElementById('btn-stop').disabled = true;
        document.getElementById('status-text').textContent = 'STOPPED';
        document.getElementById('status-text').className = 'value stopped';

        log('Replay stopped at frame ' + relFrame(), 'info');
    }

    function replayLoop() {
        if (mode !== 'replaying') return;

        const rf = relFrame();

        // Apply all events up to current frame
        while (replayIndex < replaySequence.length &&
               replaySequence[replayIndex][0] <= rf) {
            const evt = replaySequence[replayIndex];
            const btn = evt[1];
            const state = evt[2];
            if (state) press(btn);
            else release(btn);

            const action = state ? 'PRESS' : 'REL  ';
            log('<span class="log-frame">f' + evt[0] + '</span> <span class="log-action">' + action + '</span> <span class="log-btn">' + (BTN_NAME[btn] || btn) + '</span>');

            replayIndex++;
        }

        updateUI();

        // Done?
        if (replayIndex >= replaySequence.length &&
            rf > replaySequence[replaySequence.length - 1][0] + 300) {
            log('Replay complete!', 'info');
            stopReplay();
            return;
        }

        animFrameId = requestAnimationFrame(replayLoop);
    }

    // ========== GO MODE ==========
    // Full auto: focus canvas → Enter to start game → wait for level → hold RIGHT → run until death
    // Uses keyboard Enter (real keypress) for START, simulateInput for everything else.
    // Logs every step to the panel.

    // ========== GO: ACTION QUEUE WITH VISUAL LOG ==========
    // Actions are shown in the log BEFORE they happen (grey/pending),
    // then turn green when they fire.

    let actionQueue = [];    // {frame, label, fn, el}
    let actionIndex = 0;
    let goStartFrame = 0;

    function queueAction(frame, label, fn) {
        actionQueue.push({ frame, label, fn, el: null, done: false });
    }

    function renderQueue() {
        const logEl = document.getElementById('log');
        // Render all queued actions as grey (pending)
        for (const action of actionQueue) {
            const div = document.createElement('div');
            div.innerHTML = '<span style="color:#555">f' + String(action.frame).padStart(5) + '  ' + action.label + '</span>';
            logEl.appendChild(div);
            action.el = div;
        }
        logEl.scrollTop = logEl.scrollHeight;
    }

    function markDone(action) {
        if (action.el) {
            action.el.innerHTML = '<span style="color:#2ecc71">f' + String(action.frame).padStart(5) + '  \u2713 ' + action.label + '</span>';
        }
        action.done = true;
        // Scroll to show current action
        const logEl = document.getElementById('log');
        if (action.el) action.el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }

    function buildActionQueue() {
        actionQueue = [];
        actionIndex = 0;

        // Frame 0 = when gameplay starts (after all the setup steps)
        // At full walk speed (~1.5 px/frame) or run speed (~2.5 px/frame),
        // Mario reaches obstacles at predictable times.
        // Tile positions * 16px / speed = frame estimate

        // Hold RIGHT + B from frame 0
        queueAction(0, 'HOLD RIGHT + B (run)', () => { press(BTN.RIGHT); press(BTN.B); });

        // First goomba at tile ~22 from start
        // At run speed (~2.5px/f): tile 22 = 352px / 2.5 = ~141 frames
        // But Mario accelerates from 0, so add ~30 frames
        // Jump needs to happen BEFORE reaching the goomba
        queueAction(155, 'JUMP over goomba (tile 22)', () => press(BTN.A));
        queueAction(170, 'RELEASE jump', () => release(BTN.A));
    }

    function go() {
        if (mode !== 'idle') { stop(); }

        mode = 'going';
        const logEl = document.getElementById('log');
        logEl.innerHTML = '';

        document.getElementById('btn-go').disabled = true;
        document.getElementById('btn-record').disabled = true;
        document.getElementById('btn-start').disabled = true;
        document.getElementById('btn-stop').disabled = false;
        document.getElementById('status-text').textContent = 'GO';
        document.getElementById('status-text').className = 'value running';
        document.getElementById('mode-text').textContent = 'GO';

        // === SETUP PHASE (timed steps before gameplay) ===
        const canvas = document.querySelector('canvas');
        if (!canvas) { log('ERROR: No canvas found!', 'warn'); return; }

        log('=== SETUP ===', 'info');
        log('Focusing canvas...', 'info');
        canvas.focus();
        canvas.click();
        log('Canvas focused', 'action');

        log('Restarting ROM...', 'info');
        try {
            EJS_emulator.gameManager.restart();
            log('ROM restarted', 'action');
        } catch(e) {
            log('Restart failed: ' + e.message, 'warn');
        }

        log('Waiting 2s for title screen...', 'info');
        setTimeout(() => {
            if (mode !== 'going') return;

            log('Pressing ENTER...', 'info');
            canvas.focus();
            canvas.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true
            }));
            setTimeout(() => {
                canvas.dispatchEvent(new KeyboardEvent('keyup', {
                    key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true
                }));
                log('Game started', 'action');

                log('Waiting 3.5s for level load...', 'info');
                setTimeout(() => {
                    if (mode !== 'going') return;
                    log('Level loaded!', 'action');

                    // === GAMEPLAY PHASE ===
                    log('=== WORLD 1-1 ===', 'info');

                    buildActionQueue();
                    renderQueue();

                    goStartFrame = getEmuFrame();
                    startFrame = goStartFrame;
                    animFrameId = requestAnimationFrame(goLoop);
                }, 3500);
            }, 150);
        }, 2000);
    }

    function goLoop() {
        if (mode !== 'going') return;

        const rf = getEmuFrame() - goStartFrame;

        // Fire any actions whose frame has arrived
        while (actionIndex < actionQueue.length &&
               actionQueue[actionIndex].frame <= rf) {
            const action = actionQueue[actionIndex];
            action.fn();
            markDone(action);
            actionIndex++;
        }

        // Update NEXT display
        if (actionIndex < actionQueue.length) {
            const next = actionQueue[actionIndex];
            const inF = next.frame - rf;
            document.getElementById('next-text').textContent = next.label + ' in ' + inF + 'f';
        } else {
            document.getElementById('next-text').textContent = 'sequence complete';
        }

        updateUI();
        animFrameId = requestAnimationFrame(goLoop);
    }

    // ========== STOP (either mode) ==========

    function stop() {
        if (mode === 'recording') stopRecording();
        else if (mode === 'replaying') stopReplay();
        else if (mode === 'going') {
            mode = 'idle';
            if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }
            releaseAll();
            document.getElementById('btn-go').disabled = false;
            document.getElementById('btn-record').disabled = false;
            document.getElementById('btn-start').disabled = false;
            document.getElementById('btn-stop').disabled = true;
            document.getElementById('status-text').textContent = 'STOPPED';
            document.getElementById('status-text').className = 'value stopped';
            log('GO stopped at frame ' + relFrame(), 'info');
        }
    }

    // ========== UI UPDATE ==========

    function updateUI() {
        const rf = relFrame();
        document.getElementById('frame-text').textContent = rf;
        document.getElementById('time-text').textContent = (rf / 60.098).toFixed(1) + 's';
        document.getElementById('input-text').textContent = inputString();

        const evtCount = mode === 'recording' ? recordLog.length :
                         mode === 'replaying' ? replayIndex + '/' + replaySequence.length : '---';
        document.getElementById('events-text').textContent = evtCount;

        // Next event preview (replay mode)
        if (mode === 'replaying' && replayIndex < replaySequence.length) {
            const next = replaySequence[replayIndex];
            const action = next[2] ? 'PRESS' : 'REL';
            const inFrames = next[0] - rf;
            document.getElementById('next-text').textContent =
                action + ' ' + (BTN_NAME[next[1]] || '?') + ' in ' + inFrames + 'f';
        } else {
            document.getElementById('next-text').textContent = '---';
        }
    }

    // ========== WIRE UP ==========

    // ========== LOAD BEST SEQUENCE ==========

    function loadBestAndReplay() {
        log('Fetching best-sequence.json...', 'info');
        fetch('best-sequence.json')
            .then(r => {
                if (!r.ok) throw new Error('No best-sequence.json found. Run the optimizer first!');
                return r.json();
            })
            .then(data => {
                const events = data.events || data;
                replaySequence = events;
                log('Loaded ' + events.length + ' events from optimizer', 'info');
                if (data.completed) {
                    log('This sequence COMPLETES 1-1 in ' + data.timeSeconds + 's (' + data.completionFrame + 'f)', 'info');
                } else if (data.bestX) {
                    log('Best distance: ' + data.bestX + ' px (did not complete)', 'info');
                }
                log('Click REPLAY to watch, or GO to auto-start + replay', 'info');
            })
            .catch(err => {
                log('Load failed: ' + err.message, 'warn');
            });
    }

    document.getElementById('btn-go').addEventListener('click', go);
    document.getElementById('btn-record').addEventListener('click', startRecording);
    document.getElementById('btn-start').addEventListener('click', startReplay);
    document.getElementById('btn-stop').addEventListener('click', stop);
    document.getElementById('btn-load-best').addEventListener('click', loadBestAndReplay);

    window.marioBot = {
        record: startRecording,
        replay: startReplay,
        stop: stop,
        getLog: function() { return recordLog; },
        getLogJSON: function() { return JSON.stringify(recordLog); },
        setSequence: function(seq) { replaySequence = seq; log('Loaded ' + seq.length + ' events', 'info'); },
        BTN, press, release, releaseAll, getFrame: getEmuFrame,
    };

    log('Bot loaded. RECORD to capture, REPLAY to play back.', 'info');
})();
