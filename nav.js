// ============================================================
// Arcade Game Hub — Navigation Drawer Component
// Include this script on every page: <script src="nav.js"></script>
// ============================================================

(function () {
    'use strict';

    // ── Game Catalog ────────────────────────────────────────
    const GAME_CATALOG = [
        {
            name: 'Classic Arcade', icon: '\u{1F47E}',
            games: [
                { name: 'Snake', icon: '\u{1F40D}', url: 'snake/' },
                { name: 'Pong', icon: '\u{1F3D3}', url: 'pong/' },
                { name: 'Breakout', icon: '\u{1F9F1}', url: 'breakout/' },
                { name: 'Space Invaders', icon: '\u{1F47E}', url: 'space-invaders/' },
                { name: 'Flappy Bird', icon: '\u{1F426}', url: 'flappy-bird/' },
                { name: 'Block Puzzle', icon: '\u{1F7E6}', url: 'block-puzzle/' },
            ]
        },
        {
            name: 'Retro Arcade', icon: '\u{1F579}\uFE0F',
            games: [
                { name: 'Asteroids', icon: '\u2604\uFE0F', url: 'asteroids/' },
                { name: 'Pac-Man', icon: '\u{1F7E1}', url: 'pac-man/' },
                { name: 'Frogger', icon: '\u{1F438}', url: 'frogger/' },
                { name: 'Missile Command', icon: '\u{1F680}', url: 'missile-command/' },
                { name: 'Galaga', icon: '\u{1F6F8}', url: 'galaga/' },
                { name: 'Centipede', icon: '\u{1F41B}', url: 'centipede/' },
                { name: 'Lunar Lander', icon: '\u{1F315}', url: 'lunar-lander/' },
                { name: 'Joust', icon: '\u2694\uFE0F', url: 'joust/' },
                { name: 'Bomberman', icon: '\u{1F4A3}', url: 'bomberman/' },
                { name: 'Q*bert', icon: '\u{1F536}', url: 'qbert/' },
                { name: 'Donkey Kong', icon: '\u{1F412}', url: 'donkey-kong/' },
                { name: 'Dig Dug', icon: '\u26CF\uFE0F', url: 'dig-dug/' },
                { name: 'Tempest', icon: '\u{1F300}', url: 'tempest/' },
                { name: 'Defender', icon: '\u{1F6E1}\uFE0F', url: 'defender/' },
                { name: 'Tron Light Cycles', icon: '\u{1F3CD}\uFE0F', url: 'tron/' },
                { name: 'Simon', icon: '\u{1F534}', url: 'simon/' },
                { name: 'Lemmings', icon: '\u{1F42D}', url: 'lemmings/' },
            ]
        },
        {
            name: 'Strategy & Puzzles', icon: '\u{1F9E9}',
            games: [
                { name: 'Connect 4', icon: '\u{1F534}', url: 'connect-4/' },
                { name: 'Dots & Boxes', icon: '\u{1F535}', url: 'connect-dots/' },
                { name: 'Hex Defense', icon: '\u{1F6E1}\uFE0F', url: 'hex-defense/' },
            ]
        },
        {
            name: 'Mobile Games', icon: '\u{1F4F1}',
            games: [
                { name: '2048', icon: '\u{1F522}', url: '2048/' },
                { name: 'Stack Tower', icon: '\u{1F3D7}\uFE0F', url: 'stack-tower/' },
                { name: 'Color Switch', icon: '\u{1F3A8}', url: 'color-switch/' },
                { name: 'Fruit Ninja', icon: '\u{1F349}', url: 'fruit-ninja/' },
                { name: 'Whack-a-Mole', icon: '\u{1F528}', url: 'whack-a-mole/' },
                { name: 'Endless Runner', icon: '\u{1F3C3}', url: 'endless-runner/' },
                { name: 'Knife Hit', icon: '\u{1F52A}', url: 'knife-hit/' },
                { name: 'Bubble Shooter', icon: '\u{1FAE7}', url: 'bubble-shooter/' },
            ]
        },
        {
            name: 'Action & More', icon: '\u{1F3AF}',
            games: [
                { name: 'Fruit Catcher', icon: '\u{1F34E}', url: 'fruit-catcher/' },
                { name: 'Motorcycle Trail Rider', icon: '\u{1F3CD}\uFE0F', url: 'motorcycle-game/' },
            ]
        },
        {
            name: 'Experimental', icon: '\u{1F9EA}',
            games: [
                { name: 'eMoto Database', icon: '\u26A1', url: 'emoto-database/' },
            ]
        }
    ];

    // ── Viewport Size Presets ─────────────────────────────
    var SIZE_PRESETS = {
        compact:  { label: 'Compact',  vhFactor: 0.50, containerMax: 600 },
        medium:   { label: 'Medium',   vhFactor: 0.65, containerMax: 750 },
        standard: { label: 'Standard', vhFactor: 0.75, containerMax: 900 },
        large:    { label: 'Large',    vhFactor: 0.90, containerMax: 1100 }
    };
    var SIZE_ORDER = ['compact', 'medium', 'standard', 'large'];
    var DEFAULT_SIZE = 'medium';
    var currentSize = localStorage.getItem('arcadeViewportSize') || DEFAULT_SIZE;
    if (!SIZE_PRESETS[currentSize]) currentSize = DEFAULT_SIZE;

    var totalGames = GAME_CATALOG.reduce(function (sum, cat) { return sum + cat.games.length; }, 0);
    // Extract folder name for games in subdirectories (e.g., /snake/ or /snake/index.html)
    var pathParts = location.pathname.replace(/\/index\.html$/, '/').split('/').filter(Boolean);
    var lastPart = pathParts.length > 0 ? pathParts[pathParts.length - 1] : '';
    // Check if we're inside a game subfolder (not root index)
    var allGameFolders = GAME_CATALOG.reduce(function (arr, cat) { return arr.concat(cat.games.map(function (g) { return g.url.replace(/\/$/, ''); })); }, []);
    var inSubfolder = allGameFolders.indexOf(lastPart) !== -1;
    var basePath = inSubfolder ? '../' : '';
    var currentPage = inSubfolder ? lastPart + '/' : 'index.html';

    // ── Inject CSS ──────────────────────────────────────────
    var style = document.createElement('style');
    style.textContent = '\
/* Nav Drawer Styles */\
.nav-toggle{position:fixed;top:16px;left:16px;z-index:10001;width:48px;height:48px;border-radius:50%;border:none;cursor:pointer;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);box-shadow:0 4px 20px rgba(102,126,234,0.5);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:5px;padding:0;transition:box-shadow .3s ease,transform .2s ease}\
.nav-toggle:hover{box-shadow:0 4px 30px rgba(102,126,234,0.8);transform:scale(1.08)}\
.nav-toggle:active{transform:scale(0.95)}\
.nav-toggle .bar{display:block;width:22px;height:2.5px;background:#fff;border-radius:2px;transition:transform .3s ease,opacity .3s ease}\
.nav-open .nav-toggle .bar:nth-child(1){transform:rotate(45deg) translate(5px,5px)}\
.nav-open .nav-toggle .bar:nth-child(2){opacity:0}\
.nav-open .nav-toggle .bar:nth-child(3){transform:rotate(-45deg) translate(5px,-5px)}\
\
.nav-overlay{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9998;opacity:0;visibility:hidden;transition:opacity .3s ease,visibility .3s ease;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)}\
.nav-open .nav-overlay{opacity:1;visibility:visible}\
\
.nav-drawer{position:fixed;top:0;left:0;width:320px;height:100%;z-index:9999;background:rgba(15,12,41,0.97);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);box-shadow:4px 0 40px rgba(0,0,0,0.5);transform:translateX(-100%);transition:transform .35s cubic-bezier(0.4,0,0.2,1);display:flex;flex-direction:column;overflow:hidden}\
.nav-open .nav-drawer{transform:translateX(0)}\
\
.nav-drawer-header{padding:24px 20px 16px;border-bottom:1px solid rgba(255,255,255,0.08)}\
.nav-drawer-brand{display:flex;align-items:center;gap:12px;margin-bottom:16px;text-decoration:none}\
.nav-drawer-brand-icon{width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg,#667eea,#764ba2);display:flex;align-items:center;justify-content:center;font-size:1.4em;flex-shrink:0}\
.nav-drawer-brand h2{color:#fff;font-size:1.15em;margin:0;line-height:1.2}\
.nav-drawer-brand small{color:rgba(255,255,255,0.5);font-size:0.75em;font-weight:400}\
\
.nav-search{position:relative}\
.nav-search input{width:100%;padding:10px 14px 10px 38px;border-radius:10px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.06);color:#fff;font-size:0.9em;outline:none;transition:border-color .2s,background .2s}\
.nav-search input::placeholder{color:rgba(255,255,255,0.35)}\
.nav-search input:focus{border-color:rgba(102,126,234,0.6);background:rgba(255,255,255,0.1)}\
.nav-search-icon{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:rgba(255,255,255,0.35);font-size:0.9em;pointer-events:none}\
\
.nav-drawer-body{flex:1;overflow-y:auto;padding:12px 0;scrollbar-width:thin;scrollbar-color:rgba(102,126,234,0.3) transparent}\
.nav-drawer-body::-webkit-scrollbar{width:6px}\
.nav-drawer-body::-webkit-scrollbar-track{background:transparent}\
.nav-drawer-body::-webkit-scrollbar-thumb{background:rgba(102,126,234,0.3);border-radius:3px}\
.nav-drawer-body::-webkit-scrollbar-thumb:hover{background:rgba(102,126,234,0.5)}\
\
.nav-home-link{display:flex;align-items:center;gap:10px;padding:10px 20px;color:rgba(255,255,255,0.8);text-decoration:none;font-weight:600;font-size:0.95em;transition:background .2s,color .2s;margin-bottom:4px}\
.nav-home-link:hover{background:rgba(255,255,255,0.06);color:#fff}\
.nav-home-link.active{color:#667eea;background:rgba(102,126,234,0.1)}\
\
.nav-category{margin-bottom:4px}\
.nav-category-header{display:flex;align-items:center;gap:8px;padding:10px 20px;cursor:pointer;color:rgba(255,255,255,0.6);font-size:0.8em;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;transition:color .2s;user-select:none;-webkit-user-select:none}\
.nav-category-header:hover{color:rgba(255,255,255,0.9)}\
.nav-category-header .cat-chevron{margin-left:auto;transition:transform .25s ease;font-size:0.7em}\
.nav-category.collapsed .cat-chevron{transform:rotate(-90deg)}\
.nav-category.collapsed .nav-game-list{display:none}\
\
.nav-game-list{list-style:none;margin:0;padding:0}\
.nav-game-item a{display:flex;align-items:center;gap:10px;padding:9px 20px 9px 32px;color:rgba(255,255,255,0.7);text-decoration:none;font-size:0.9em;transition:background .15s,color .15s,transform .15s;border-left:3px solid transparent}\
.nav-game-item a:hover{background:rgba(255,255,255,0.05);color:#fff;transform:translateX(2px)}\
.nav-game-item a.active{color:#a78bfa;border-left-color:#667eea;background:rgba(102,126,234,0.08);font-weight:600}\
.nav-game-item .game-icon{width:24px;text-align:center;font-size:1.05em;flex-shrink:0}\
\
.nav-no-results{padding:20px;text-align:center;color:rgba(255,255,255,0.35);font-size:0.9em}\
\
.nav-drawer-footer{padding:16px 20px;border-top:1px solid rgba(255,255,255,0.08);text-align:center}\
.nav-ad-slot{min-height:100px;background:rgba(255,255,255,0.03);border:1px dashed rgba(255,255,255,0.1);border-radius:8px;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.15);font-size:0.75em;letter-spacing:1px;text-transform:uppercase}\
\
/* Ad slots for page content */\
.ad-slot{margin:20px auto;text-align:center;min-height:90px;background:rgba(0,0,0,0.03);border:1px dashed rgba(0,0,0,0.1);border-radius:8px;display:flex;align-items:center;justify-content:center;color:rgba(0,0,0,0.15);font-size:0.75em;letter-spacing:1px;text-transform:uppercase;max-width:728px;overflow:hidden}\
.ad-slot-leaderboard{width:100%;max-width:728px;min-height:90px}\
.ad-slot-rectangle{width:300px;min-height:250px}\
.ad-slot-banner{width:100%;max-width:320px;min-height:50px}\
\
/* Body scroll lock */\
body.nav-open{overflow:hidden}\
\
/* Mobile */\
@media(max-width:768px){\
.nav-drawer{width:100%}\
.nav-toggle{top:12px;left:12px;width:42px;height:42px}\
.nav-toggle .bar{width:18px;height:2px}\
}\
\
/* Ensure game content does not overlap nav button */\
.container,.hub-container{position:relative}\
\
/* Game Size Selector */\
.nav-size-selector{padding:12px 0 0;margin-top:12px;border-top:1px solid rgba(255,255,255,0.08)}\
.nav-size-label{display:block;color:rgba(255,255,255,0.5);font-size:0.75em;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px}\
.nav-size-buttons{display:flex;gap:6px}\
.nav-size-btn{flex:1;padding:6px 4px;border:1px solid rgba(255,255,255,0.15);border-radius:8px;background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.6);font-size:0.78em;cursor:pointer;transition:all .2s}\
.nav-size-btn:hover{background:rgba(255,255,255,0.1);color:#fff}\
.nav-size-btn.active{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;border-color:transparent;font-weight:600}\
';
    document.head.appendChild(style);

    // ── Build DOM ───────────────────────────────────────────
    // Toggle button
    var btn = document.createElement('button');
    btn.className = 'nav-toggle';
    btn.setAttribute('aria-label', 'Toggle navigation menu');
    btn.innerHTML = '<span class="bar"></span><span class="bar"></span><span class="bar"></span>';

    // Overlay
    var overlay = document.createElement('div');
    overlay.className = 'nav-overlay';

    // Drawer
    var drawer = document.createElement('nav');
    drawer.className = 'nav-drawer';
    drawer.setAttribute('role', 'navigation');
    drawer.setAttribute('aria-label', 'Game navigation');

    // Header
    var header = document.createElement('div');
    header.className = 'nav-drawer-header';
    header.innerHTML = '\
<a href="' + basePath + 'index.html" class="nav-drawer-brand">\
<div class="nav-drawer-brand-icon">\u{1F3AE}</div>\
<div><h2>Arcade Game Hub</h2><small>' + totalGames + ' Games</small></div>\
</a>\
<div class="nav-search">\
<span class="nav-search-icon">\u{1F50D}</span>\
<input type="text" id="navSearchInput" placeholder="Search ' + totalGames + ' games\u2026" autocomplete="off">\
</div>';

    // Size selector in drawer header
    var sizeSelector = document.createElement('div');
    sizeSelector.className = 'nav-size-selector';
    sizeSelector.innerHTML = '<label class="nav-size-label">Game Size</label><div class="nav-size-buttons"></div>';
    var btnGroup = sizeSelector.querySelector('.nav-size-buttons');
    SIZE_ORDER.forEach(function (key) {
        var preset = SIZE_PRESETS[key];
        var sBtn = document.createElement('button');
        sBtn.className = 'nav-size-btn' + (key === currentSize ? ' active' : '');
        sBtn.dataset.size = key;
        sBtn.textContent = preset.label;
        sBtn.addEventListener('click', function () { setViewportSize(key); });
        btnGroup.appendChild(sBtn);
    });
    header.appendChild(sizeSelector);

    // Body (scrollable game list)
    var body = document.createElement('div');
    body.className = 'nav-drawer-body';

    // Home link
    var homeLink = document.createElement('a');
    homeLink.href = basePath + 'index.html';
    homeLink.className = 'nav-home-link' + (currentPage === 'index.html' ? ' active' : '');
    homeLink.innerHTML = '<span>\u{1F3E0}</span> Home';
    body.appendChild(homeLink);

    // No results message (hidden by default)
    var noResults = document.createElement('div');
    noResults.className = 'nav-no-results';
    noResults.style.display = 'none';
    noResults.textContent = 'No games found';

    // Build categories
    GAME_CATALOG.forEach(function (cat) {
        var section = document.createElement('div');
        section.className = 'nav-category';

        var catHeader = document.createElement('div');
        catHeader.className = 'nav-category-header';
        catHeader.innerHTML = '<span>' + cat.icon + '</span> ' + cat.name + ' <span class="cat-chevron">\u25BC</span>';

        var list = document.createElement('ul');
        list.className = 'nav-game-list';

        cat.games.forEach(function (game) {
            var li = document.createElement('li');
            li.className = 'nav-game-item';
            var isActive = currentPage === game.url;
            li.innerHTML = '<a href="' + basePath + game.url + '"' + (isActive ? ' class="active"' : '') + '><span class="game-icon">' + game.icon + '</span> ' + game.name + '</a>';
            list.appendChild(li);
        });

        catHeader.addEventListener('click', function () {
            section.classList.toggle('collapsed');
        });

        section.appendChild(catHeader);
        section.appendChild(list);
        body.appendChild(section);
    });

    body.appendChild(noResults);

    // Footer with ad slot
    var footer = document.createElement('div');
    footer.className = 'nav-drawer-footer';
    footer.innerHTML = '<div class="nav-ad-slot"><!-- Google AdSense: 300x250 medium rectangle -->\nAd Space</div>';

    // Assemble drawer
    drawer.appendChild(header);
    drawer.appendChild(body);
    drawer.appendChild(footer);

    // Insert into page
    document.body.appendChild(btn);
    document.body.appendChild(overlay);
    document.body.appendChild(drawer);

    // ── Open / Close Logic ──────────────────────────────────
    function openNav() {
        document.body.classList.add('nav-open');
        btn.setAttribute('aria-expanded', 'true');
    }
    function closeNav() {
        document.body.classList.remove('nav-open');
        btn.setAttribute('aria-expanded', 'false');
    }
    function toggleNav() {
        if (document.body.classList.contains('nav-open')) closeNav();
        else openNav();
    }

    btn.addEventListener('click', toggleNav);
    overlay.addEventListener('click', closeNav);

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && document.body.classList.contains('nav-open')) {
            closeNav();
        }
    });

    // ── Search ──────────────────────────────────────────────
    var searchInput = document.getElementById('navSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function () {
            var query = this.value.trim().toLowerCase();
            var anyVisible = false;
            var categories = drawer.querySelectorAll('.nav-category');

            categories.forEach(function (catEl) {
                var items = catEl.querySelectorAll('.nav-game-item');
                var catVisible = false;

                items.forEach(function (item) {
                    var name = item.textContent.toLowerCase();
                    if (!query || name.indexOf(query) !== -1) {
                        item.style.display = '';
                        catVisible = true;
                    } else {
                        item.style.display = 'none';
                    }
                });

                catEl.style.display = catVisible ? '' : 'none';
                if (catVisible) anyVisible = true;

                // Auto-expand categories when searching
                if (query && catVisible) {
                    catEl.classList.remove('collapsed');
                }
            });

            noResults.style.display = anyVisible ? 'none' : 'block';
        });

        // Prevent game key events from firing while typing in search
        searchInput.addEventListener('keydown', function (e) {
            e.stopPropagation();
        });
        searchInput.addEventListener('keyup', function (e) {
            e.stopPropagation();
        });
        searchInput.addEventListener('keypress', function (e) {
            e.stopPropagation();
        });
    }

    // ── Update game count badge on hub page ─────────────────
    var countBadge = document.querySelector('.game-count');
    if (countBadge) {
        countBadge.textContent = totalGames + ' Games';
    }

    // ── Viewport Size Control ─────────────────────────────
    function applyViewportSize(sizeKey) {
        var preset = SIZE_PRESETS[sizeKey];
        if (!preset) return;

        // Vanilla canvas games (use #gameCanvas with CSS transform scaling)
        var canvas = document.getElementById('gameCanvas');
        if (canvas) {
            var bw = canvas.width, bh = canvas.height;
            var par = canvas.parentElement;
            var ps = getComputedStyle(par);
            var mw = par.clientWidth - parseFloat(ps.paddingLeft) - parseFloat(ps.paddingRight);
            var mh = window.innerHeight * preset.vhFactor;
            var s = Math.min(mw / bw, mh / bh, 1);
            canvas.style.transformOrigin = 'top center';
            canvas.style.transform = 'scale(' + s + ')';
            canvas.style.marginBottom = (-(bh * (1 - s))) + 'px';
        }

        // Phaser games (use #game-container with Phaser.Scale.FIT)
        var gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            var container = gameContainer.closest('.container');
            if (container) {
                container.style.maxWidth = preset.containerMax + 'px';
            }
            gameContainer.style.maxHeight = (window.innerHeight * preset.vhFactor) + 'px';
            gameContainer.style.overflow = 'hidden';
        }

        // Hex-defense uses #game-wrapper with its own scaling
        var wrapper = document.getElementById('game-wrapper');
        if (wrapper && !canvas && !gameContainer) {
            wrapper.style.maxHeight = (window.innerHeight * preset.vhFactor) + 'px';
            wrapper.style.overflow = 'hidden';
        }
    }

    function setViewportSize(sizeKey) {
        currentSize = sizeKey;
        localStorage.setItem('arcadeViewportSize', sizeKey);
        var allBtns = document.querySelectorAll('.nav-size-btn');
        allBtns.forEach(function (b) {
            b.classList.toggle('active', b.dataset.size === sizeKey);
        });
        applyViewportSize(sizeKey);
        // Trigger resize so Phaser Scale Manager recalculates
        window.dispatchEvent(new Event('resize'));
    }

    // Apply on load and on every resize
    applyViewportSize(currentSize);
    window.addEventListener('resize', function () {
        applyViewportSize(currentSize);
    });

})();
