const Animations = (() => {

    function dealCard(cardEl) {
        cardEl.style.opacity = '0';
        cardEl.style.transform = 'scale(0.3) translateY(-30px)';
        void cardEl.offsetWidth; // force reflow
        cardEl.style.transition = 'opacity 0.3s ease, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
        cardEl.style.opacity = '1';
        cardEl.style.transform = 'scale(1) translateY(0)';
        setTimeout(function() {
            cardEl.style.transition = '';
            cardEl.style.transform = '';
            cardEl.style.opacity = '';
        }, 350);
    }

    function flipCard(innerEl, onFlip) {
        innerEl.style.transition = 'transform 0.15s ease-in';
        innerEl.style.transform = 'rotateY(90deg)';
        setTimeout(function() {
            if (onFlip) onFlip();
            innerEl.style.transition = 'transform 0.15s ease-out';
            innerEl.style.transform = 'rotateY(0deg)';
            setTimeout(function() {
                innerEl.style.transition = '';
                innerEl.style.transform = '';
            }, 200);
        }, 180);
    }

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
        var i = 0;
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
            confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
        }
    }

    function bonusEffect(areaEl) {
        glowPulse(areaEl, 'rgba(255,215,0,1)', 1.5, 3);
        if (typeof confetti === 'function') {
            confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
            setTimeout(function() { confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } }); }, 300);
        }
    }

    function loseEffect(areaEl) {
        areaEl.style.backgroundColor = 'rgba(231,76,60,0.3)';
        setTimeout(function() { areaEl.style.backgroundColor = ''; }, 500);
    }

    function pushEffect(areaEl) {
        glowPulse(areaEl, 'rgba(255,255,255,0.6)', 0.6, 1);
    }

    return { dealCard, flipCard, chipBounce, winEffect, bonusEffect, loseEffect, pushEffect };
})();
