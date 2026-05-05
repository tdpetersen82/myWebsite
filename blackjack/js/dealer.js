const Dealer = (() => {
    const STORAGE_KEY = 'blackjackDealer';
    const FIRST_VISIT_KEY = 'blackjackDealerSelected';
    const MOODS = ['idle', 'deal', 'happy', 'sad', 'shocked', 'bust'];

    const DEALERS = {
        male:   { name: 'Marcus',  emoji: '🎩' },
        female: { name: 'Melissa', emoji: '💃' },
    };

    const QUIPS = {
        idle: [
            'Place your bet.',
            'Ready when you are.',
            'Good luck.',
            'Welcome back.',
        ],
        deal: [
            'Here we go.',
            'Cards coming out.',
            'Let\'s see what you got.',
            'Show me something good.',
        ],
        happy: [
            'House wins.',
            'Better luck next time.',
            'Tough break.',
            'The shoe is hot tonight.',
        ],
        sad: [
            'Nicely played.',
            'You got me.',
            'Well done.',
            'Take it.',
        ],
        shocked: [
            'Blackjack!',
            'You can\'t be serious!',
            'Wow — straight 21.',
            'Beginner\'s luck.',
        ],
        bust: [
            'I bust!',
            'Of course.',
            'Lucky shoe.',
            'I\'ll get you next time.',
        ],
    };

    let currentDealer = 'male';
    let currentMood = 'idle';
    let imageStatus = {}; // { male: { idle: 'ok'|'fail', ... }, female: ... }
    let speechTimer = null;

    let portraitEl, imgEl, fallbackEl, fallbackEmojiEl, fallbackNameEl, speechEl;
    let selectOverlayEl;

    // Cache-bust asset URLs so new images don't get masked by old empty
    // placeholder responses cached by browsers / CDNs.
    const ASSET_VERSION = '9';

    function imagePath(dealer, mood) {
        return 'assets/dealers/' + dealer + '/' + mood + '.png?v=' + ASSET_VERSION;
    }

    function avatarPath(dealer) {
        return 'assets/dealers/' + dealer + '/avatar.png?v=' + ASSET_VERSION;
    }

    // Probe an image; resolves with 'ok' or 'fail'.
    // Treat 0-naturalWidth as fail — covers the case where a cached empty
    // placeholder response decoded as a valid-but-empty image.
    function probeImage(src) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(img.naturalWidth > 0 ? 'ok' : 'fail');
            img.onerror = () => resolve('fail');
            img.src = src;
        });
    }

    function preload() {
        // Probe all 12 pose images so we know which mood to fall back from.
        const promises = [];
        for (const dealer of Object.keys(DEALERS)) {
            imageStatus[dealer] = {};
            for (const mood of MOODS) {
                promises.push(
                    probeImage(imagePath(dealer, mood)).then((status) => {
                        imageStatus[dealer][mood] = status;
                    })
                );
            }
        }
        return Promise.all(promises);
    }

    function init() {
        // Build DOM
        const wrapper = document.getElementById('game-wrapper');
        if (!wrapper) return;

        portraitEl = document.createElement('div');
        portraitEl.className = 'dealer-portrait';
        portraitEl.id = 'dealer-portrait';

        imgEl = document.createElement('img');
        imgEl.className = 'dealer-img';
        imgEl.alt = 'Dealer';

        fallbackEl = document.createElement('div');
        fallbackEl.className = 'dealer-fallback';

        fallbackEmojiEl = document.createElement('div');
        fallbackEmojiEl.className = 'dealer-fallback-emoji';

        fallbackNameEl = document.createElement('div');
        fallbackNameEl.className = 'dealer-fallback-name';

        const fallbackHint = document.createElement('div');
        fallbackHint.className = 'dealer-fallback-hint';
        fallbackHint.textContent = 'Drop dealer images in assets/dealers/';

        fallbackEl.appendChild(fallbackEmojiEl);
        fallbackEl.appendChild(fallbackNameEl);
        fallbackEl.appendChild(fallbackHint);

        speechEl = document.createElement('div');
        speechEl.className = 'dealer-speech';

        portraitEl.appendChild(imgEl);
        portraitEl.appendChild(fallbackEl);
        portraitEl.appendChild(speechEl);

        // Switch dealer button
        const switchBtn = document.createElement('button');
        switchBtn.className = 'dealer-switch-btn';
        switchBtn.id = 'dealer-switch-btn';
        switchBtn.title = 'Switch dealer';
        switchBtn.textContent = '⇄';
        switchBtn.addEventListener('click', showSelectionScreen);
        portraitEl.appendChild(switchBtn);

        wrapper.appendChild(portraitEl);

        // Restore selection
        currentDealer = localStorage.getItem(STORAGE_KEY) || 'male';

        // Preload, then always show the dealer selection on page load
        preload().then(() => {
            applyDealer();
            setMood('idle', { silent: true });
            showSelectionScreen();
        });
    }

    function buildSelectionOverlay() {
        if (selectOverlayEl) return selectOverlayEl;

        selectOverlayEl = document.createElement('div');
        selectOverlayEl.className = 'dealer-select-overlay';

        const card = document.createElement('div');
        card.className = 'dealer-select-card';

        const title = document.createElement('h2');
        title.textContent = 'Choose Your Dealer';
        card.appendChild(title);

        const subtitle = document.createElement('p');
        subtitle.className = 'dealer-select-subtitle';
        subtitle.textContent = 'You can switch any time.';
        card.appendChild(subtitle);

        const opts = document.createElement('div');
        opts.className = 'dealer-select-options';

        for (const key of Object.keys(DEALERS)) {
            const def = DEALERS[key];
            const opt = document.createElement('div');
            opt.className = 'dealer-option';
            opt.dataset.dealer = key;

            // Try avatar; if it fails we'll show emoji fallback
            const avatarImg = document.createElement('img');
            avatarImg.className = 'dealer-option-img';
            avatarImg.alt = def.name;
            avatarImg.src = avatarPath(key);
            avatarImg.onerror = () => {
                avatarImg.style.display = 'none';
                fallback.style.display = 'flex';
            };

            const fallback = document.createElement('div');
            fallback.className = 'dealer-option-fallback';
            fallback.textContent = def.emoji;
            fallback.style.display = 'none';

            const name = document.createElement('div');
            name.className = 'dealer-option-name';
            name.textContent = def.name;

            opt.appendChild(avatarImg);
            opt.appendChild(fallback);
            opt.appendChild(name);

            opt.addEventListener('click', () => {
                setDealer(key);
                hideSelectionScreen();
            });

            opts.appendChild(opt);
        }

        card.appendChild(opts);
        selectOverlayEl.appendChild(card);

        const wrapper = document.getElementById('game-wrapper');
        wrapper.appendChild(selectOverlayEl);

        return selectOverlayEl;
    }

    function showSelectionScreen() {
        buildSelectionOverlay();
        selectOverlayEl.classList.add('visible');
    }

    function hideSelectionScreen() {
        if (selectOverlayEl) selectOverlayEl.classList.remove('visible');
    }

    function setDealer(key) {
        if (!DEALERS[key]) return;
        currentDealer = key;
        localStorage.setItem(STORAGE_KEY, key);
        localStorage.setItem(FIRST_VISIT_KEY, '1');
        applyDealer();
        setMood('idle');
    }

    function applyDealer() {
        const def = DEALERS[currentDealer];
        fallbackEmojiEl.textContent = def.emoji;
        fallbackNameEl.textContent = def.name;
    }

    // Set the current mood. Uses crossfade if image swaps.
    function setMood(mood, opts) {
        opts = opts || {};
        if (!MOODS.includes(mood)) mood = 'idle';

        const status = (imageStatus[currentDealer] || {})[mood];

        if (status === 'ok') {
            // Image present — show it
            imgEl.style.display = 'block';
            fallbackEl.style.display = 'none';
            const newSrc = imagePath(currentDealer, mood);
            const sameSrc = imgEl.src && imgEl.src.endsWith(newSrc);

            if (sameSrc && imgEl.complete) {
                // Already showing this image — no fade needed
                imgEl.classList.remove('fading');
            } else {
                imgEl.classList.add('fading');
                imgEl.onload = () => imgEl.classList.remove('fading');
                imgEl.onerror = () => imgEl.classList.remove('fading');
                imgEl.src = newSrc;
                // If cached, onload may not fire — fall back after a beat
                setTimeout(() => imgEl.classList.remove('fading'), 350);
            }
        } else {
            // Fallback: emoji + label, also reflects mood through a CSS class
            imgEl.style.display = 'none';
            fallbackEl.style.display = 'flex';
            fallbackEl.className = 'dealer-fallback mood-' + mood;
        }

        currentMood = mood;

        // Banter
        if (opts.silent !== true) {
            const quips = QUIPS[mood] || [];
            const quip = opts.quip || (quips.length ? quips[Math.floor(Math.random() * quips.length)] : '');
            if (quip) showSpeech(quip);
            else hideSpeech();
        }
    }

    function showSpeech(text) {
        if (!speechEl) return;
        speechEl.textContent = text;
        speechEl.classList.add('visible');
        if (speechTimer) clearTimeout(speechTimer);
        speechTimer = setTimeout(() => hideSpeech(), 2600);
    }

    function hideSpeech() {
        if (speechEl) speechEl.classList.remove('visible');
        if (speechTimer) { clearTimeout(speechTimer); speechTimer = null; }
    }

    function getDealer() { return currentDealer; }
    function getMood() { return currentMood; }

    return {
        init,
        setMood,
        setDealer,
        getDealer,
        getMood,
        showSelectionScreen,
        hideSelectionScreen,
    };
})();
