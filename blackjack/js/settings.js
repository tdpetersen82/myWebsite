const Settings = (() => {
    const KEY = 'blackjackSettings';

    const DEFAULTS = {
        muted: false,
        volume: 0.6,
        theme: 'green', // green, red, blue, midnight
    };

    const THEMES = {
        green:    { from: '#2ecc71', to: '#27ae60', label: 'Classic Green' },
        red:      { from: '#c0392b', to: '#922b21', label: 'Burgundy' },
        blue:     { from: '#2980b9', to: '#1f6fa5', label: 'Royal Blue' },
        midnight: { from: '#34495e', to: '#1c2833', label: 'Midnight' },
    };

    let settings = { ...DEFAULTS };
    let drawerEl = null;

    function load() {
        try {
            const raw = JSON.parse(localStorage.getItem(KEY));
            if (raw) settings = { ...DEFAULTS, ...raw };
        } catch (e) {}
    }
    function save() { localStorage.setItem(KEY, JSON.stringify(settings)); }

    function get() { return { ...settings }; }
    function set(key, value) {
        settings[key] = value;
        save();
        apply();
    }

    function apply() {
        applyTheme();
        applyAudio();
    }

    function applyTheme() {
        const wrapper = document.getElementById('game-wrapper');
        if (!wrapper) return;
        const theme = THEMES[settings.theme] || THEMES.green;
        wrapper.style.setProperty('--felt-from', theme.from);
        wrapper.style.setProperty('--felt-to', theme.to);
        wrapper.style.background =
            'linear-gradient(135deg, ' +
            'rgba(' + hexToRgb(theme.from) + ',0.85), ' +
            'rgba(' + hexToRgb(theme.to) + ',0.85)' +
            '), url(\'../assets/table/felt.png\')';
        wrapper.style.backgroundSize = 'cover';
        wrapper.style.backgroundPosition = 'center';
        wrapper.style.backgroundColor = theme.to;
    }
    function hexToRgb(hex) {
        const h = hex.replace('#', '');
        return parseInt(h.slice(0,2), 16) + ',' + parseInt(h.slice(2,4), 16) + ',' + parseInt(h.slice(4,6), 16);
    }

    function applyAudio() {
        if (typeof Audio !== 'undefined' && Audio.setMuted) {
            Audio.setMuted(settings.muted);
        }
        if (typeof Audio !== 'undefined' && Audio.setVolume) {
            Audio.setVolume(settings.volume);
        }
    }

    function init() {
        load();
        ensureGearButton();
        apply();
    }

    function ensureGearButton() {
        const host = document.querySelector('.header-buttons');
        if (!host || document.getElementById('btn-settings')) return;
        const btn = document.createElement('button');
        btn.id = 'btn-settings';
        btn.className = 'btn-settings';
        btn.title = 'Settings';
        btn.textContent = '⚙️';
        btn.addEventListener('click', open);
        host.appendChild(btn);
    }

    function ensureDrawer() {
        if (drawerEl) return drawerEl;
        drawerEl = document.createElement('div');
        drawerEl.className = 'settings-drawer';
        drawerEl.innerHTML = `
            <div class="settings-card">
                <div class="settings-header">
                    <h2>⚙️ Settings</h2>
                    <button class="settings-close">×</button>
                </div>
                <div class="settings-body">
                    <div class="settings-section">
                        <h3>Audio</h3>
                        <label class="settings-row">
                            <span>Mute sounds</span>
                            <input type="checkbox" id="settings-mute">
                        </label>
                        <label class="settings-row">
                            <span>Volume</span>
                            <input type="range" id="settings-volume" min="0" max="1" step="0.05">
                        </label>
                    </div>
                    <div class="settings-section">
                        <h3>Table Theme</h3>
                        <div class="theme-grid" id="theme-grid"></div>
                    </div>
                    <div class="settings-section">
                        <h3>Dealer</h3>
                        <button class="learn-mini" id="settings-switch-dealer">Choose Dealer</button>
                    </div>
                    <div class="settings-section settings-section-warn">
                        <h3>Reset</h3>
                        <button class="learn-mini learn-mini-danger" id="settings-reset">Reset Bankroll &amp; Stats</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(drawerEl);
        drawerEl.querySelector('.settings-close').addEventListener('click', close);
        drawerEl.addEventListener('click', (e) => { if (e.target === drawerEl) close(); });

        // Mute toggle
        const muteEl = drawerEl.querySelector('#settings-mute');
        muteEl.addEventListener('change', () => set('muted', muteEl.checked));

        // Volume slider
        const volEl = drawerEl.querySelector('#settings-volume');
        volEl.addEventListener('input', () => set('volume', parseFloat(volEl.value)));

        // Theme grid
        const grid = drawerEl.querySelector('#theme-grid');
        for (const [key, t] of Object.entries(THEMES)) {
            const swatch = document.createElement('button');
            swatch.className = 'theme-swatch';
            swatch.dataset.theme = key;
            swatch.style.background = 'linear-gradient(135deg, ' + t.from + ', ' + t.to + ')';
            swatch.innerHTML = '<span>' + t.label + '</span>';
            swatch.addEventListener('click', () => {
                set('theme', key);
                refreshDrawer();
            });
            grid.appendChild(swatch);
        }

        // Switch dealer
        drawerEl.querySelector('#settings-switch-dealer').addEventListener('click', () => {
            close();
            if (typeof Dealer !== 'undefined') Dealer.showSelectionScreen();
        });

        // Reset
        drawerEl.querySelector('#settings-reset').addEventListener('click', () => {
            if (!confirm('Reset bankroll, stats, and analytics? Achievements stay.')) return;
            localStorage.removeItem('blackjackStats');
            localStorage.removeItem('blackjackAnalytics');
            location.reload();
        });

        return drawerEl;
    }

    function refreshDrawer() {
        if (!drawerEl) return;
        drawerEl.querySelector('#settings-mute').checked = settings.muted;
        drawerEl.querySelector('#settings-volume').value = settings.volume;
        for (const sw of drawerEl.querySelectorAll('.theme-swatch')) {
            sw.classList.toggle('active', sw.dataset.theme === settings.theme);
        }
    }

    function open() {
        ensureDrawer();
        refreshDrawer();
        drawerEl.classList.add('visible');
    }
    function close() {
        if (drawerEl) drawerEl.classList.remove('visible');
    }

    return { init, get, set, open, close };
})();
