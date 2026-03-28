const Animations = (() => {

    function chipBounce(chipEl) {
        chipEl.style.transform = 'scale(0)';
        void chipEl.offsetWidth;
        chipEl.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
        chipEl.style.transform = 'scale(1)';
        setTimeout(function() {
            chipEl.style.transition = '';
            chipEl.style.transform = '';
        }, 350);
    }

    function glowPulse(el, color, duration, count) {
        let i = 0;
        function step() {
            if (i >= count * 2) { el.style.boxShadow = ''; return; }
            el.style.boxShadow = (i % 2 === 0)
                ? '0 0 30px ' + color
                : '0 0 0px transparent';
            i++;
            setTimeout(step, duration * 1000 / (count * 2));
        }
        step();
    }

    function winEffect(el) {
        glowPulse(el, 'rgba(255,215,0,0.8)', 1.2, 2);
        if (typeof confetti === 'function') {
            confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
        }
    }

    function bigWinEffect(el) {
        glowPulse(el, 'rgba(255,215,0,1)', 1.5, 3);
        if (typeof confetti === 'function') {
            confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
            setTimeout(function() { confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } }); }, 300);
        }
    }

    function loseEffect(el) {
        el.style.backgroundColor = 'rgba(231,76,60,0.3)';
        setTimeout(function() { el.style.backgroundColor = ''; }, 500);
    }

    function highlightNumber(el) {
        if (!el) return;
        el.classList.add('winning-number');
        setTimeout(function() {
            el.classList.remove('winning-number');
        }, 3000);
    }

    function flashBetSpot(el) {
        if (!el) return;
        el.style.transition = 'background-color 0.15s';
        el.style.backgroundColor = 'rgba(241,196,15,0.5)';
        setTimeout(function() {
            el.style.backgroundColor = '';
            setTimeout(function() { el.style.transition = ''; }, 200);
        }, 200);
    }

    return { chipBounce, winEffect, bigWinEffect, loseEffect, highlightNumber, flashBetSpot };
})();
