// Mario Speedrun Bot — Record & Replay Engine
// RECORD: Watches you play, captures every keypress with emulator frame number.
// REPLAY: Plays back a recorded sequence via gameManager.simulateInput().

(function() {
    'use strict';

    // NES button codes for simulateInput(player, button, state)
    const BTN = { B: 0, SELECT: 2, START: 3, UP: 4, DOWN: 5, LEFT: 6, RIGHT: 7, A: 8 };
    const BTN_NAME = { 0:'B', 2:'SEL', 3:'START', 4:'UP', 5:'DOWN', 6:'LEFT', 7:'RIGHT', 8:'A' };

    // Bot button IDs → jsnes Controller button IDs (reverse of optimize.js JSNES_TO_BOT)
    const BOT_TO_JSNES = { 8: 0, 0: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7 };

    // jsnes button names for logging
    const JSNES_BTN_NAME = { 0:'A', 1:'B', 2:'SEL', 3:'START', 4:'UP', 5:'DOWN', 6:'LEFT', 7:'RIGHT' };

    // NES RAM enemy type names
    const ENEMY_NAMES = {
        0x00: 'GrnKoopa', 0x01: 'RedKoopa', 0x02: 'BzBeetle',
        0x05: 'HamBro', 0x06: 'Goomba', 0x07: 'Blooper',
        0x08: 'BulBill', 0x09: 'GrnKoopaP', 0x0A: 'GryCheep',
        0x0B: 'RedCheep', 0x0D: 'Piranha', 0x0E: 'GrnParatr',
        0x10: 'Lakitu', 0x11: 'Spiny', 0x12: 'FlyRedCheep',
        0x14: 'SpinyEgg',
    };

    // Enemy screen X addresses (5 slots, spaced 4 apart)
    const ENEMY_SCREEN_X = [0x0087, 0x008B, 0x008F, 0x0093, 0x0097];

    function decodeBCD(byte) {
        return ((byte >> 4) * 10) + (byte & 0x0F);
    }

    function readGameState(nes) {
        const mem = nes.cpu.mem;

        // Mario position
        const marioX = mem[0x006D] * 256 + mem[0x0086];
        const marioScreenX = mem[0x0086]; // X on current screen
        const marioY = mem[0x00CE];
        const screenPage = mem[0x071A];

        // Mario velocity (signed bytes)
        let velX = mem[0x0057];
        if (velX > 127) velX -= 256;
        let velY = mem[0x009F];
        if (velY > 127) velY -= 256;

        // Player state
        const playerState = mem[0x000E];
        const powerup = mem[0x0756]; // 0=small, 1=big, 2=fire

        // Enemies — 5 active enemy slots in SMB1 RAM
        // Type at 0x0016+i, active flag at 0x000F+i
        const enemies = [];
        for (let i = 0; i < 5; i++) {
            const active = mem[0x000F + i];
            if (!active) continue;
            const type = mem[0x0016 + i];
            const eScreenX = mem[ENEMY_SCREEN_X[i]];
            const ePage = mem[0x006E + i];
            const eX = ePage * 256 + eScreenX;
            const eY = mem[0x00CF + i];
            // Skip offscreen enemies
            if (eY > 240) continue;
            const dist = eX - marioX;
            enemies.push({
                slot: i, type, eX, eY, dist,
                name: ENEMY_NAMES[type] || ('Unk_0x' + type.toString(16)),
            });
        }

        // Sort enemies by distance (nearest first)
        enemies.sort((a, b) => Math.abs(a.dist) - Math.abs(b.dist));

        // Score (BCD)
        const score = decodeBCD(mem[0x07DD]) * 100000
            + decodeBCD(mem[0x07DE]) * 1000
            + decodeBCD(mem[0x07DF]) * 10;

        // Coins
        const coins = decodeBCD(mem[0x07ED]) * 10 + decodeBCD(mem[0x07EE]);

        // Timer
        const timer = decodeBCD(mem[0x07F8]) * 100
            + decodeBCD(mem[0x07F9]) * 10
            + decodeBCD(mem[0x07FA]);

        // State strings
        const powerStr = ['Small', 'Big', 'Fire'][powerup] || '?';
        let stateStr = 'Running';
        if (playerState === 0x0B || playerState === 0x06) stateStr = 'DEAD';
        else if (marioY < 160 && velY !== 0) stateStr = velY < 0 ? 'Jumping' : 'Falling';
        else if (velX === 0) stateStr = 'Idle';

        return {
            marioX, marioY, marioScreenX, screenPage,
            velX, velY,
            playerState, powerup, powerStr, stateStr,
            enemies, score, coins, timer,
        };
    }

    function updateRAMDisplay(state) {
        document.getElementById('ram-pos').textContent =
            'X:' + state.marioX + ' Y:' + state.marioY + ' (pg' + state.screenPage + ')';
        document.getElementById('ram-speed').textContent =
            'vX:' + state.velX + ' vY:' + state.velY;
        document.getElementById('ram-state').textContent =
            state.powerStr + ' / ' + state.stateStr;

        const eCount = state.enemies.length;
        document.getElementById('ram-enemies').textContent = eCount === 0 ? 'none' :
            state.enemies.map(e => e.name).join(', ');

        const nearest = state.enemies.find(e => e.dist > 0); // nearest ahead
        const nearEl = document.getElementById('ram-nearest');
        if (nearest) {
            nearEl.textContent = nearest.name + ' ' + nearest.dist + 'px ahead (Y:' + nearest.eY + ')';
            nearEl.className = nearest.dist < 40 ? 'ram-danger' : 'ram-enemy';
        } else {
            nearEl.textContent = 'clear ahead';
            nearEl.className = 'ram-enemy';
        }

        document.getElementById('ram-score').textContent =
            String(state.score).padStart(6, '0') + '  \u00A2' + state.coins + '  T:' + state.timer;
    }

    function contextString(state) {
        const parts = ['X:' + state.marioX, 'Y:' + state.marioY, state.stateStr];
        if (state.velY !== 0) parts.push('vY:' + state.velY);
        const nearest = state.enemies.find(e => e.dist > 0);
        if (nearest) {
            const warn = nearest.dist < 40 ? ' !!DANGER!!' : '';
            parts.push(nearest.name + ' ' + nearest.dist + 'px' + warn);
        }
        return parts.join(' | ');
    }

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

        document.getElementById('btn-go').disabled = false;
        document.getElementById('btn-record').disabled = false;
        document.getElementById('btn-start').disabled = false;
        document.getElementById('btn-load-best').disabled = false;
        document.getElementById('btn-hof').disabled = false;
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
        else if (mode === 'replaying') {
            if (jsnesNes) stopJsnesReplay(true);
            else stopReplay();
        } else if (mode === 'going') {
            mode = 'idle';
            if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }
            releaseAll();
            document.getElementById('btn-go').disabled = false;
            document.getElementById('btn-record').disabled = false;
            document.getElementById('btn-start').disabled = false;
            document.getElementById('btn-load-best').disabled = false;
        document.getElementById('btn-hof').disabled = false;
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

    // ========== LOAD BEST SEQUENCE (jsnes direct replay) ==========

    let jsnesNes = null;
    let jsnesFrame = 0;
    let jsnesEventIndex = 0;
    let jsnesEvents = null;

    function romDataToString(arrayBuffer) {
        const bytes = new Uint8Array(arrayBuffer);
        let str = '';
        for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
        return str;
    }

    function createFrameRenderer(canvas) {
        const ctx = canvas.getContext('2d');
        const imageData = ctx.createImageData(256, 240);
        return function onFrame(frameBuffer) {
            const data = imageData.data;
            for (let i = 0; i < 256 * 240; i++) {
                const pixel = frameBuffer[i];
                const offset = i * 4;
                data[offset]     = pixel & 0xFF;          // R from B position
                data[offset + 1] = (pixel >> 8) & 0xFF;  // G stays
                data[offset + 2] = (pixel >> 16) & 0xFF; // B from R position
                data[offset + 3] = 0xFF;
            }
            ctx.putImageData(imageData, 0, 0);
        };
    }

    function stopJsnesReplay(switchToEmulatorJS) {
        mode = 'idle';
        if (animFrameId) { clearTimeout(animFrameId); animFrameId = null; }

        if (switchToEmulatorJS) {
            // Only switch back to EmulatorJS when explicitly requested (STOP button)
            jsnesNes = null;
            jsnesEvents = null;
            document.getElementById('game').style.visibility = '';
            document.getElementById('jsnes-canvas').style.display = 'none';
            document.getElementById('ram-status').style.display = 'none';
        }
        // Otherwise keep jsnes canvas + RAM status visible (frozen on last frame)

        document.getElementById('btn-go').disabled = false;
        document.getElementById('btn-record').disabled = false;
        document.getElementById('btn-start').disabled = false;
        document.getElementById('btn-load-best').disabled = false;
        document.getElementById('btn-hof').disabled = false;
        document.getElementById('btn-stop').disabled = true;
        document.getElementById('status-text').textContent = 'STOPPED';
        document.getElementById('status-text').className = 'value stopped';

        log('Replay stopped at frame ' + jsnesFrame, 'info');
    }

    let jsnesLastTime = 0;

    function jsnesReplayLoop() {
        if (mode !== 'replaying') return;

        try {
            // Run enough frames to maintain ~60fps real-time
            const now = performance.now();
            const elapsed = now - jsnesLastTime;
            jsnesLastTime = now;
            const framesToRun = Math.min(Math.max(1, Math.round(elapsed * 60 / 1000)), 10);

            for (let f = 0; f < framesToRun; f++) {
                // Read game state BEFORE applying events (so log context is current)
                const gs = readGameState(jsnesNes);

                // Apply events for this frame
                while (jsnesEventIndex < jsnesEvents.length &&
                       jsnesEvents[jsnesEventIndex][0] <= jsnesFrame) {
                    const evt = jsnesEvents[jsnesEventIndex];
                    const jsnesBtn = evt[1];
                    const state = evt[2];
                    if (state) jsnesNes.buttonDown(1, jsnesBtn);
                    else jsnesNes.buttonUp(1, jsnesBtn);

                    // Enhanced logging with context
                    const action = state ? 'PRESS' : 'REL  ';
                    const btnName = JSNES_BTN_NAME[jsnesBtn] || '?';
                    const ctx = contextString(gs);
                    log('<span class="log-frame">f' + evt[0] + '</span> <span class="log-action">' + action + '</span> <span class="log-btn">' + btnName + '</span> <span class="log-ctx">' + ctx + '</span>');

                    jsnesEventIndex++;
                }

                // Advance emulator one frame
                jsnesNes.frame();
                jsnesFrame++;

                // Check for level completion FIRST (flag sequence passes through "dead" states)
                const mem = jsnesNes.cpu.mem;
                if (mem[0x001D] === 3 || mem[0x075F] > 0 || mem[0x0760] > 0) {
                    const finalGs = readGameState(jsnesNes);
                    updateRAMDisplay(finalGs);
                    log('LEVEL COMPLETE at frame ' + jsnesFrame + '! ' + contextString(finalGs), 'info');
                    document.getElementById('frame-text').textContent = jsnesFrame;
                    document.getElementById('time-text').textContent = (jsnesFrame / 60.098).toFixed(1) + 's';
                    document.getElementById('events-text').textContent = jsnesEventIndex + '/' + jsnesEvents.length;
                    stopJsnesReplay();
                    return;
                }

                // Check for death — stop replay immediately
                const ps = mem[0x000E];
                if (ps === 0x0B || ps === 0x06 || mem[0x00CE] > 240) {
                    const finalGs = readGameState(jsnesNes);
                    updateRAMDisplay(finalGs);
                    log('Mario died at frame ' + jsnesFrame + '. ' + contextString(finalGs), 'warn');
                    document.getElementById('frame-text').textContent = jsnesFrame;
                    document.getElementById('time-text').textContent = (jsnesFrame / 60.098).toFixed(1) + 's';
                    document.getElementById('events-text').textContent = jsnesEventIndex + '/' + jsnesEvents.length;
                    stopJsnesReplay();
                    return;
                }

                // Update RAM display (every frame for last rendered)
                if (f === framesToRun - 1) {
                    const finalGs = readGameState(jsnesNes);
                    updateRAMDisplay(finalGs);
                }

                // Done? Stop right after last event
                const lastEventFrame = jsnesEvents[jsnesEvents.length - 1][0];
                if (jsnesFrame > lastEventFrame) {
                    const finalGs = readGameState(jsnesNes);
                    updateRAMDisplay(finalGs);
                    log('Replay complete! Final: ' + contextString(finalGs), 'info');
                    document.getElementById('frame-text').textContent = jsnesFrame;
                    document.getElementById('time-text').textContent = (jsnesFrame / 60.098).toFixed(1) + 's';
                    document.getElementById('events-text').textContent = jsnesEventIndex + '/' + jsnesEvents.length;
                    stopJsnesReplay();
                    return;
                }
            }

            // Update basic UI
            document.getElementById('frame-text').textContent = jsnesFrame;
            document.getElementById('time-text').textContent = (jsnesFrame / 60.098).toFixed(1) + 's';
            document.getElementById('events-text').textContent = jsnesEventIndex + '/' + jsnesEvents.length;

        } catch(e) {
            log('ERROR in replay loop: ' + e.message, 'warn');
            console.error('jsnes replay error:', e);
            stopJsnesReplay();
            return;
        }

        animFrameId = setTimeout(jsnesReplayLoop, 1000 / 60);
    }

    function loadBestAndReplay() {
        if (mode !== 'idle') { stop(); }
        // Clean up any lingering jsnes state from a previous replay
        if (jsnesNes) {
            jsnesNes = null;
            jsnesEvents = null;
        }

        log('Fetching best-sequence.json & save-state.json...', 'info');

        Promise.all([
            fetch('best-sequence.json').then(r => { if (!r.ok) throw new Error('No best-sequence.json found. Run the optimizer first!'); return r.json(); }),
            fetch('save-state.json').then(r => { if (!r.ok) return null; return r.json(); }),
            fetch('super-mario-bros-1.nes').then(r => { if (!r.ok) throw new Error('ROM not found!'); return r.arrayBuffer(); }),
        ])
        .then(([data, saveState, romBuffer]) => {
            const events = data.events || data;
            // Display sequence identity and expected performance
            const id = data.id || 'unknown';
            const rating = data.rating || '?';
            const speed = data.speed ? data.speed.toFixed(2) : '?';
            log('<span class="log-btn">=== ' + id + ' [' + rating + '] ===</span>', 'info');
            if (data.completed) {
                log('<span class="log-action">EXPECT: Completes 1-1 in ' + data.timeSeconds + 's (' + data.completionFrame + 'f) at ' + speed + ' px/f</span>', 'info');
            } else if (data.bestX) {
                const pct = Math.round(data.bestX / 3200 * 100);
                log('<span class="log-warn">EXPECT: Mario reaches ' + data.bestX + 'px (' + pct + '%) then ' + (data.reason || 'dies') + '</span>', 'info');
                log('Speed: ' + speed + ' px/f │ ' + (data.totalFrames || '?') + ' frames │ Gen ' + (data.generation || '?'), 'info');
            }
            log(events.length + ' events, ' + (data.segments || '?') + ' segments', 'info');

            if (!saveState) {
                log('WARNING: save-state.json not found. Re-run optimize.js to generate it.', 'warn');
                log('Cannot replay without matching save state.', 'warn');
                return;
            }

            // Convert bot button IDs to jsnes button IDs
            jsnesEvents = events.map(evt => [evt[0], BOT_TO_JSNES[evt[1]], evt[2]]);

            // Set up UI
            mode = 'replaying';
            document.getElementById('btn-go').disabled = true;
            document.getElementById('btn-record').disabled = true;
            document.getElementById('btn-start').disabled = true;
            document.getElementById('btn-load-best').disabled = true;
            document.getElementById('btn-stop').disabled = false;
            document.getElementById('status-text').textContent = 'REPLAYING';
            document.getElementById('status-text').className = 'value running';
            document.getElementById('mode-text').textContent = 'BEST';

            // Hide EmulatorJS, show jsnes canvas
            document.getElementById('game').style.visibility = 'hidden';
            const jsnesCanvas = document.getElementById('jsnes-canvas');
            jsnesCanvas.style.display = 'block';

            // Create jsnes instance
            const onFrame = createFrameRenderer(jsnesCanvas);
            jsnesNes = new jsnes.NES({ onFrame: onFrame, onAudioSample: () => {}, emulateSound: false });

            // Load ROM and restore save state
            const romString = romDataToString(romBuffer);
            jsnesNes.loadROM(romString);
            jsnesNes.fromJSON(saveState);

            // Override jsnes palette AFTER fromJSON (which clobbers it)
            // Must set emphTable (all 8 emphasis modes) — that's what PPU actually reads
            if (jsnesNes.ppu && jsnesNes.ppu.palTable && jsnesNes.ppu.palTable.emphTable) {
                // NES 2C03 palette — matches what RetroArch/EmulatorJS renders
                const palRGB = [
                    0x626262,0x002090,0x1210A0,0x3C0094,0x54006C,0x5C0030,0x540400,0x3C1800,
                    0x1C2E00,0x003E00,0x004400,0x003C20,0x003060,0x000000,0x000000,0x000000,
                    0xAAAAAA,0x0848D8,0x3420E0,0x6818D8,0x9C14B0,0xAC1464,0xA82010,0x883C00,
                    0x585C00,0x207400,0x007C08,0x007444,0x006094,0x000000,0x000000,0x000000,
                    0xFCFCFC,0x3CBCFC,0x6888FC,0x9878FC,0xF878FC,0xFC58BC,0xFC7858,0xFCA044,
                    0xF8B800,0xB8F818,0x58D854,0x58F898,0x00E8D8,0x787878,0x000000,0x000000,
                    0xFCFCFC,0xA4E4FC,0xB8B8FC,0xD8B8FC,0xFCB8FC,0xFCA0E4,0xF0D0B0,0xFCE0A8,
                    0xF8D878,0xD8F878,0xB8F8B8,0xB8F8D8,0x00FCFC,0xD8D8D8,0x000000,0x000000,
                ];
                // Convert RGB→BGR and write to all 8 emphasis tables + curTable
                const bgrPal = palRGB.map(rgb => {
                    const r = (rgb >> 16) & 0xFF, g = (rgb >> 8) & 0xFF, b = rgb & 0xFF;
                    return (b << 16) | (g << 8) | r;
                });
                for (let e = 0; e < 8; e++) {
                    for (let i = 0; i < 64; i++) {
                        jsnesNes.ppu.palTable.emphTable[e][i] = bgrPal[i];
                    }
                }
                for (let i = 0; i < 64; i++) {
                    jsnesNes.ppu.palTable.curTable[i] = bgrPal[i];
                }
            }

            // Show RAM status HUD
            document.getElementById('ram-status').style.display = 'block';

            log('=== REPLAYING BEST SEQUENCE (jsnes) ===', 'info');
            jsnesFrame = 0;
            jsnesEventIndex = 0;
            jsnesLastTime = performance.now();

            animFrameId = setTimeout(jsnesReplayLoop, 1000 / 60);
        })
        .catch(err => {
            log('Load failed: ' + err.message, 'warn');
        });
    }

    // ========== HALL OF FAME BROWSER ==========

    let hofData = null;
    let hofIndex = 0;

    function showHallOfFame() {
        if (mode !== 'idle') { stop(); }

        log('Fetching hall-of-fame.json...', 'info');
        fetch('hall-of-fame.json')
            .then(r => { if (!r.ok) throw new Error('No hall-of-fame.json. Run the optimizer first!'); return r.json(); })
            .then(data => {
                if (!Array.isArray(data) || data.length === 0) {
                    log('Hall of fame is empty.', 'warn');
                    return;
                }
                hofData = data;
                log('<span class="log-btn">🏆 HALL OF FAME (' + data.length + ' entries)</span>', 'info');
                log('<span class="log-ctx">Click entries below to play, or use ◀ ▶ buttons</span>', 'info');

                for (let i = 0; i < data.length; i++) {
                    const h = data[i];
                    const spd = h.speed ? h.speed.toFixed(2) : '?';
                    const status = h.completed ? 'COMPLETE ' + h.completionFrame + 'f' : h.bestX + 'px ' + (h.reason || '');
                    const el = document.createElement('div');
                    el.style.cursor = 'pointer';
                    el.style.padding = '2px 4px';
                    el.style.borderBottom = '1px solid #333';
                    el.innerHTML = '<span style="color:#d4a017">#' + (i+1) + '</span> '
                        + '<span style="color:#fff">' + status + '</span> '
                        + '<span style="color:#0ff">' + spd + ' px/f</span> '
                        + '<span style="color:#666">[' + (h.rating || '?') + ']</span>';
                    el.addEventListener('click', () => playHofEntry(i));
                    document.getElementById('log').appendChild(el);
                }
                document.getElementById('log').scrollTop = 0;
            })
            .catch(err => {
                log('HOF load failed: ' + err.message, 'warn');
            });
    }

    function playHofEntry(index) {
        if (!hofData || !hofData[index]) return;
        const entry = hofData[index];
        if (!entry.events || entry.events.length === 0) {
            log('No events for entry #' + (index+1), 'warn');
            return;
        }
        hofIndex = index;

        // Reuse the same jsnes replay infrastructure
        const data = entry;
        log('', 'info');
        log('<span class="log-btn">▶ Playing HoF #' + (index+1) + ' [' + (data.rating || '?') + ']</span>', 'info');
        const spd = data.speed ? data.speed.toFixed(2) : '?';
        if (data.completed) {
            log('<span class="log-action">EXPECT: Completes in ' + (data.completionFrame / 60.098).toFixed(1) + 's at ' + spd + ' px/f</span>', 'info');
        } else {
            log('<span class="log-warn">EXPECT: ' + data.bestX + 'px then ' + (data.reason || 'dies') + ' at ' + spd + ' px/f</span>', 'info');
        }

        // Need save state + ROM to replay
        Promise.all([
            fetch('save-state.json').then(r => { if (!r.ok) return null; return r.json(); }),
            fetch('super-mario-bros-1.nes').then(r => r.arrayBuffer()),
        ]).then(([saveState, romBuffer]) => {
            if (!saveState) { log('No save-state.json', 'warn'); return; }

            if (mode !== 'idle') stop();
            if (jsnesNes) { jsnesNes = null; jsnesEvents = null; }

            jsnesEvents = data.events.map(evt => [evt[0], BOT_TO_JSNES[evt[1]], evt[2]]);

            mode = 'replaying';
            document.getElementById('btn-go').disabled = true;
            document.getElementById('btn-record').disabled = true;
            document.getElementById('btn-start').disabled = true;
            document.getElementById('btn-load-best').disabled = true;
            document.getElementById('btn-hof').disabled = true;
            document.getElementById('btn-stop').disabled = false;
            document.getElementById('status-text').textContent = 'REPLAYING';
            document.getElementById('status-text').className = 'value running';
            document.getElementById('mode-text').textContent = 'HOF #' + (index+1);

            document.getElementById('game').style.visibility = 'hidden';
            const jsnesCanvas = document.getElementById('jsnes-canvas');
            jsnesCanvas.style.display = 'block';
            document.getElementById('ram-status').style.display = 'block';

            const onFrame = createFrameRenderer(jsnesCanvas);
            jsnesNes = new jsnes.NES({ onFrame: onFrame, onAudioSample: () => {}, emulateSound: false });
            const romString = romDataToString(romBuffer);
            jsnesNes.loadROM(romString);
            jsnesNes.fromJSON(saveState);

            // Apply palette fix
            if (jsnesNes.ppu && jsnesNes.ppu.palTable && jsnesNes.ppu.palTable.emphTable) {
                const palRGB = [
                    0x626262,0x002090,0x1210A0,0x3C0094,0x54006C,0x5C0030,0x540400,0x3C1800,
                    0x1C2E00,0x003E00,0x004400,0x003C20,0x003060,0x000000,0x000000,0x000000,
                    0xAAAAAA,0x0848D8,0x3420E0,0x6818D8,0x9C14B0,0xAC1464,0xA82010,0x883C00,
                    0x585C00,0x207400,0x007C08,0x007444,0x006094,0x000000,0x000000,0x000000,
                    0xFCFCFC,0x3CBCFC,0x6888FC,0x9878FC,0xF878FC,0xFC58BC,0xFC7858,0xFCA044,
                    0xF8B800,0xB8F818,0x58D854,0x58F898,0x00E8D8,0x787878,0x000000,0x000000,
                    0xFCFCFC,0xA4E4FC,0xB8B8FC,0xD8B8FC,0xFCB8FC,0xFCA0E4,0xF0D0B0,0xFCE0A8,
                    0xF8D878,0xD8F878,0xB8F8B8,0xB8F8D8,0x00FCFC,0xD8D8D8,0x000000,0x000000,
                ];
                const bgrPal = palRGB.map(rgb => { const r = (rgb >> 16) & 0xFF, g = (rgb >> 8) & 0xFF, b = rgb & 0xFF; return (b << 16) | (g << 8) | r; });
                for (let e = 0; e < 8; e++) for (let j = 0; j < 64; j++) jsnesNes.ppu.palTable.emphTable[e][j] = bgrPal[j];
                for (let j = 0; j < 64; j++) jsnesNes.ppu.palTable.curTable[j] = bgrPal[j];
            }

            jsnesFrame = 0;
            jsnesEventIndex = 0;
            jsnesLastTime = performance.now();
            animFrameId = setTimeout(jsnesReplayLoop, 1000 / 60);
        });
    }

    document.getElementById('btn-go').addEventListener('click', go);
    document.getElementById('btn-record').addEventListener('click', startRecording);
    document.getElementById('btn-start').addEventListener('click', startReplay);
    document.getElementById('btn-stop').addEventListener('click', stop);
    document.getElementById('btn-load-best').addEventListener('click', loadBestAndReplay);
    document.getElementById('btn-hof').addEventListener('click', showHallOfFame);

    window.marioBot = {
        record: startRecording,
        replay: startReplay,
        stop: stop,
        getLog: function() { return recordLog; },
        getLogJSON: function() { return JSON.stringify(recordLog); },
        setSequence: function(seq) { replaySequence = seq; log('Loaded ' + seq.length + ' events', 'info'); },
        BTN, press, release, releaseAll, getFrame: getEmuFrame,
        getJsnesNes: function() { return jsnesNes; },
        readGameState: function() { return jsnesNes ? readGameState(jsnesNes) : null; },
    };

    log('Bot loaded. RECORD to capture, REPLAY to play back.', 'info');
})();
