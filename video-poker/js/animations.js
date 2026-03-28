const Animations = (() => {

    function dealCard(cardEl) {
        cardEl.style.opacity = '0';
        cardEl.style.transform = 'scale(0.3) translateY(-30px)';
        void cardEl.offsetWidth; // force reflow
        cardEl.style.transition = 'opacity 0.3s ease, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
        cardEl.style.opacity = '1';
        cardEl.style.transform = 'scale(1) translateY(0)';
        setTimeout(() => {
            cardEl.style.transition = '';
            cardEl.style.transform = '';
            cardEl.style.opacity = '';
        }, 350);
    }

    function flipCard(innerEl, onFlip) {
        innerEl.style.transition = 'transform 0.15s ease-in';
        innerEl.style.transform = 'rotateY(90deg)';
        setTimeout(() => {
            if (onFlip) onFlip();
            innerEl.style.transition = 'transform 0.15s ease-out';
            innerEl.style.transform = 'rotateY(0deg)';
            setTimeout(() => {
                innerEl.style.transition = '';
                innerEl.style.transform = '';
            }, 200);
        }, 180);
    }

    function holdBounce(slotEl) {
        slotEl.style.transition = 'transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)';
        slotEl.style.transform = 'translateY(-6px)';
    }

    function unholdBounce(slotEl) {
        slotEl.style.transition = 'transform 0.15s ease';
        slotEl.style.transform = 'translateY(0)';
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

    function winEffect(areaEl) {
        glowPulse(areaEl, 'rgba(255,215,0,0.8)', 1.2, 2);
        if (typeof confetti === 'function') {
            confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
        }
    }

    function royalFlushEffect(areaEl) {
        glowPulse(areaEl, 'rgba(255,215,0,1)', 2.0, 4);
        if (typeof confetti === 'function') {
            confetti({ particleCount: 200, spread: 120, origin: { y: 0.5 } });
            setTimeout(() => confetti({ particleCount: 150, spread: 100, origin: { y: 0.4 } }), 400);
            setTimeout(() => confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } }), 800);
        }
    }

    function bigWinEffect(areaEl) {
        glowPulse(areaEl, 'rgba(255,215,0,1)', 1.5, 3);
        if (typeof confetti === 'function') {
            confetti({ particleCount: 120, spread: 90, origin: { y: 0.5 } });
            setTimeout(() => confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } }), 300);
        }
    }

    return { dealCard, flipCard, holdBounce, unholdBounce, winEffect, royalFlushEffect, bigWinEffect };
})();
