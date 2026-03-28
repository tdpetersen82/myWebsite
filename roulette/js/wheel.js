const Wheel = (() => {
    let canvas, ctx;
    let currentAngle = 0;
    let spinning = false;
    let animationId = null;

    const WHEEL_ORDER = CONFIG.WHEEL_ORDER;
    const NUM_POCKETS = WHEEL_ORDER.length; // 37
    const POCKET_ANGLE = (2 * Math.PI) / NUM_POCKETS;

    function isRed(n) {
        return CONFIG.RED_NUMBERS.includes(n);
    }

    function getColor(n) {
        if (n === 0) return '#27ae60';
        return isRed(n) ? '#c0392b' : '#2c3e50';
    }

    function init(canvasEl) {
        canvas = canvasEl;
        ctx = canvas.getContext('2d');
        canvas.width = 240;
        canvas.height = 240;
        draw();
    }

    function draw() {
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const outerR = 115;
        const innerR = 75;
        const textR = 95;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Outer rim
        ctx.beginPath();
        ctx.arc(cx, cy, outerR + 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#8B7355';
        ctx.fill();

        // Draw pockets
        for (let i = 0; i < NUM_POCKETS; i++) {
            const startAngle = currentAngle + i * POCKET_ANGLE - Math.PI / 2;
            const endAngle = startAngle + POCKET_ANGLE;
            const num = WHEEL_ORDER[i];

            // Pocket fill
            ctx.beginPath();
            ctx.moveTo(cx + innerR * Math.cos(startAngle), cy + innerR * Math.sin(startAngle));
            ctx.arc(cx, cy, outerR, startAngle, endAngle);
            ctx.arc(cx, cy, innerR, endAngle, startAngle, true);
            ctx.closePath();
            ctx.fillStyle = getColor(num);
            ctx.fill();
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 0.5;
            ctx.stroke();

            // Number text
            const midAngle = startAngle + POCKET_ANGLE / 2;
            ctx.save();
            ctx.translate(cx + textR * Math.cos(midAngle), cy + textR * Math.sin(midAngle));
            ctx.rotate(midAngle + Math.PI / 2);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 9px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(num.toString(), 0, 0);
            ctx.restore();
        }

        // Inner circle
        ctx.beginPath();
        ctx.arc(cx, cy, innerR, 0, 2 * Math.PI);
        ctx.fillStyle = '#1a5c2e';
        ctx.fill();
        ctx.strokeStyle = '#8B7355';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Center decoration
        ctx.beginPath();
        ctx.arc(cx, cy, 30, 0, 2 * Math.PI);
        ctx.fillStyle = '#8B7355';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx, cy, 20, 0, 2 * Math.PI);
        ctx.fillStyle = '#2c3e50';
        ctx.fill();

        // Ball marker (pointer at top)
        ctx.beginPath();
        ctx.moveTo(cx, cy - outerR - 4);
        ctx.lineTo(cx - 8, cy - outerR - 16);
        ctx.lineTo(cx + 8, cy - outerR - 16);
        ctx.closePath();
        ctx.fillStyle = '#ecf0f1';
        ctx.fill();
        ctx.strokeStyle = '#bdc3c7';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    function spin(targetNumber, callback) {
        if (spinning) return;
        spinning = true;

        // Find the index of the target number in the wheel
        const targetIndex = WHEEL_ORDER.indexOf(targetNumber);
        // Calculate target angle so that the target pocket is at the top (pointer position)
        // The pointer is at -PI/2 (top). We need the middle of the target pocket there.
        const targetPocketMidAngle = targetIndex * POCKET_ANGLE + POCKET_ANGLE / 2;
        // We want: currentAngle + targetPocketMidAngle = 0 (at top, which is -PI/2 but we offset in draw)
        // Actually, the draw adds currentAngle as offset. The pointer is at -PI/2.
        // For the pocket to be at the pointer: currentAngle + targetIndex * POCKET_ANGLE + POCKET_ANGLE/2 = 0 (mod 2PI)
        // So finalAngle = -(targetIndex * POCKET_ANGLE + POCKET_ANGLE/2)

        const finalAngle = -(targetIndex * POCKET_ANGLE + POCKET_ANGLE / 2);
        // Add several full rotations for visual effect
        const fullRotations = 5 + Math.floor(Math.random() * 3);
        const totalRotation = fullRotations * 2 * Math.PI;
        // Normalize to always spin forward
        const endAngle = finalAngle - totalRotation;

        const startAngle = currentAngle;
        const duration = CONFIG.SPIN_DURATION;
        const startTime = performance.now();

        function easeOutCubic(t) {
            return 1 - Math.pow(1 - t, 3);
        }

        function animate(now) {
            const elapsed = now - startTime;
            const t = Math.min(elapsed / duration, 1);
            const eased = easeOutCubic(t);

            currentAngle = startAngle + (endAngle - startAngle) * eased;
            draw();

            if (t < 1) {
                animationId = requestAnimationFrame(animate);
            } else {
                spinning = false;
                currentAngle = finalAngle;
                draw();
                drawBall(targetNumber);
                if (callback) callback();
            }
        }

        animationId = requestAnimationFrame(animate);
    }

    function drawBall(targetNumber) {
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const ballR = 108; // between inner and outer

        // The ball sits at the top (pointer position)
        const ballX = cx;
        const ballY = cy - ballR;

        // Draw ball
        ctx.beginPath();
        ctx.arc(ballX, ballY, 6, 0, 2 * Math.PI);
        ctx.fillStyle = '#ecf0f1';
        ctx.fill();
        ctx.strokeStyle = '#bdc3c7';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Highlight glow
        ctx.beginPath();
        ctx.arc(ballX, ballY, 8, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    function reset() {
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        spinning = false;
        draw();
    }

    function isSpinning() {
        return spinning;
    }

    // Generate a random result (0-36)
    function generateResult() {
        return Math.floor(Math.random() * 37);
    }

    return { init, spin, reset, isSpinning, generateResult, isRed, getColor };
})();
