const Animations = (() => {

    function rollDice(container, die1Val, die2Val, callback) {
        container.innerHTML = '';
        var d1 = document.createElement('div');
        d1.className = 'die rolling';
        var d2 = document.createElement('div');
        d2.className = 'die rolling';
        container.appendChild(d1);
        container.appendChild(d2);

        // Show random faces during animation
        var interval = setInterval(function() {
            var r1 = Math.floor(Math.random() * 6) + 1;
            var r2 = Math.floor(Math.random() * 6) + 1;
            renderDieFace(d1, r1);
            renderDieFace(d2, r2);
        }, 80);

        setTimeout(function() {
            clearInterval(interval);
            d1.classList.remove('rolling');
            d2.classList.remove('rolling');
            renderDieFace(d1, die1Val);
            renderDieFace(d2, die2Val);
            d1.classList.add('landed');
            d2.classList.add('landed');
            setTimeout(function() {
                d1.classList.remove('landed');
                d2.classList.remove('landed');
            }, 300);
            if (callback) callback();
        }, CONFIG.ROLL_DURATION);
    }

    function renderDieFace(dieEl, value) {
        dieEl.innerHTML = '';
        var positions = {
            1: [[50, 50]],
            2: [[25, 25], [75, 75]],
            3: [[25, 25], [50, 50], [75, 75]],
            4: [[25, 25], [75, 25], [25, 75], [75, 75]],
            5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
            6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]],
        };
        var dots = positions[value] || [];
        dots.forEach(function(pos) {
            var dot = document.createElement('div');
            dot.className = 'die-dot';
            dot.style.left = pos[0] + '%';
            dot.style.top = pos[1] + '%';
            dieEl.appendChild(dot);
        });
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

    function winEffect(el) {
        glowPulse(el, 'rgba(255,215,0,0.8)', 1.2, 2);
        if (typeof confetti === 'function') {
            confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
        }
    }

    function loseEffect(el) {
        el.style.backgroundColor = 'rgba(231,76,60,0.3)';
        setTimeout(function() { el.style.backgroundColor = ''; }, 500);
    }

    function pointSetEffect(el) {
        glowPulse(el, 'rgba(241,196,15,0.8)', 0.8, 2);
    }

    function puckMove(puckEl, targetEl) {
        if (!puckEl || !targetEl) return;
        var rect = targetEl.getBoundingClientRect();
        var parentRect = puckEl.parentElement.getBoundingClientRect();
        puckEl.style.transition = 'left 0.4s ease, top 0.4s ease';
        puckEl.style.left = (rect.left - parentRect.left + rect.width / 2 - 18) + 'px';
        puckEl.style.top = (rect.top - parentRect.top - 8) + 'px';
    }

    return { rollDice, chipBounce, glowPulse, winEffect, loseEffect, pointSetEffect, puckMove };
})();
