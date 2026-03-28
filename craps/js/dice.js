const Dice = (() => {
    let die1 = 0;
    let die2 = 0;

    function roll() {
        die1 = Math.floor(Math.random() * 6) + 1;
        die2 = Math.floor(Math.random() * 6) + 1;
        return { die1, die2, total: die1 + die2 };
    }

    function getValues() {
        return { die1, die2, total: die1 + die2 };
    }

    // Dot positions for each face value (relative %)
    const DOT_POSITIONS = {
        1: [[50, 50]],
        2: [[25, 25], [75, 75]],
        3: [[25, 25], [50, 50], [75, 75]],
        4: [[25, 25], [75, 25], [25, 75], [75, 75]],
        5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
        6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]],
    };

    function createDieElement(value) {
        const die = document.createElement('div');
        die.className = 'die';
        const dots = DOT_POSITIONS[value] || [];
        dots.forEach(([x, y]) => {
            const dot = document.createElement('div');
            dot.className = 'die-dot';
            dot.style.left = x + '%';
            dot.style.top = y + '%';
            die.appendChild(dot);
        });
        return die;
    }

    function isCraps(total) {
        return total === 2 || total === 3 || total === 12;
    }

    function isNatural(total) {
        return total === 7 || total === 11;
    }

    function isPointNumber(total) {
        return CONFIG.POINT_NUMBERS.indexOf(total) !== -1;
    }

    function isFieldNumber(total) {
        return CONFIG.FIELD_NUMBERS.indexOf(total) !== -1;
    }

    return { roll, getValues, createDieElement, isCraps, isNatural, isPointNumber, isFieldNumber };
})();
