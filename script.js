const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreDisplay = document.getElementById("score");
const scoreRow = document.querySelector(".score-row");
const box = 20;

const spawnRefreshButton = document.getElementById("spawn-refresh");
if (spawnRefreshButton) {
    spawnRefreshButton.addEventListener("click", function () {
        if (gameOver) return;
        spawnFood("cherry");
    });
}


const fenceSize = box;
const cols = canvas.width / box;
const rows = canvas.height / box;
const bonusTimerDisplay = document.getElementById("bonus-timer");
const fenceImg = new Image();
let firstFruit = true;
let popups = [];
let currentTime = 0;
let fenceImgLoaded = false;
let isRefreshAnimating = false;
let refreshAnimStart = 0;
const REFRESH_ANIM_MAX = 3000;
let refreshInitialLength = 0;
let inputLocked = false;
fenceImg.src = "fence.png";
fenceImg.onload = function () {
    fenceImgLoaded = true;
};

if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
        this.beginPath();
        this.moveTo(x + r, y);
        this.lineTo(x + w - r, y);
        this.quadraticCurveTo(x + w, y, x + w, y + r);
        this.lineTo(x + w, y + h - r);
        this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        this.lineTo(x + r, y + h);
        this.quadraticCurveTo(x, y + h, x, y + h - r);
        this.lineTo(x, y + r);
        this.quadraticCurveTo(x, y, x + r, y);
        this.closePath();
    };
}

let snake;
let dir;
let lastMoveDir;
let score;
let food;
let gameOver;
let gameStarted = false;
let lastTimestamp;
let stepInterval = 150;
let scoreMultiplier = 1;
let bonusActiveUntil = 0;
let darknessActive = false;
const DARKNESS_DURATION = 10000;
let grapeTimerActive = false;
let grapeTimerUntil = 0;

document.addEventListener("keydown", direction);
document.addEventListener("keydown", function (e) {
    if (!gameStarted && e.key === "Enter") {
        gameStarted = true;
        document.getElementById("start-overlay").style.display = "none";
        lastTimestamp = 0;
        return;
    }

    if (gameOver && e.key === "Enter") {
        restartGame();
    }
});

function initGameState() {
    snake = [
        {
            x: Math.floor(cols / 2) * box,
            y: Math.floor(rows / 2) * box
        }
    ];
    dir = null;
    lastMoveDir = null;
    score = 0;
    gameOver = false;

    lastTimestamp = 0;
    scoreMultiplier = 1;
    bonusActiveUntil = 0;
    scoreDisplay.textContent = "Score: " + score;

    firstFruit = false;
    isRefreshAnimating = false;
    inputLocked = false;
    popups = [];
    darknessActive = false;
    spawnFood("apple");
    bonusTimerDisplay.classList.remove("active");
    bonusTimerDisplay.textContent = "";
    scoreRow.classList.remove("timer-active");
    gameStarted = false;
    document.getElementById("start-overlay").style.display = "flex";
}

function direction(e) {
    if (inputLocked && !gameOver) return;

    let keyDir = null;
    if (e.key === "ArrowLeft") keyDir = "LEFT";
    else if (e.key === "ArrowUp") keyDir = "UP";
    else if (e.key === "ArrowRight") keyDir = "RIGHT";
    else if (e.key === "ArrowDown") keyDir = "DOWN";
    else return;

    const baseDir = lastMoveDir || dir;

    if (!baseDir) {
        dir = keyDir;
        return;
    }

    if (
        (baseDir === "LEFT" && keyDir === "RIGHT") ||
        (baseDir === "RIGHT" && keyDir === "LEFT") ||
        (baseDir === "UP" && keyDir === "DOWN") ||
        (baseDir === "DOWN" && keyDir === "UP")
    ) {
        return;
    }

    dir = keyDir;
}

function randomFruitType() {
    const r = Math.random();
    if (r < 0.595) return "apple";       // 59.5%
    if (r < 0.745) return "pear";        // +15% = 74.5%
    if (r < 0.845) return "watermelon";  // +10% = 84.5%
    if (r < 0.895) return "cherry";      // +5%  = 89.5%
    if (r < 0.985) return "grape";       // 9%
    return "refresh";                    // 1%

}

function spawnFood(forceType) {
    let f;
    let bad;

    do {
        const col = 1 + Math.floor(Math.random() * (cols - 2));
        const row = 1 + Math.floor(Math.random() * (rows - 2));

        const type = forceType ? forceType : (firstFruit ? "apple" : randomFruitType());

        f = { x: col * box, y: row * box, type: type };
        bad = snake.some(seg => seg.x === f.x && seg.y === f.y);
    } while (bad);

    food = f;
    if (!forceType) {
        firstFruit = false;
    }
}

function drawGround() {
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const even = (x + y) % 2 === 0;
            ctx.fillStyle = even ? "#e3c7a1" : "#d3b48b";
            ctx.fillRect(x * box, y * box, box, box);
            const t = (x * 17 + y * 31) % 11;
            if (t === 0) {
                ctx.fillStyle = "rgba(120, 84, 52, 0.7)";
                const cx = x * box + box * 0.3;
                const cy = y * box + box * 0.3;
                ctx.beginPath();
                ctx.arc(cx, cy, box * 0.12, 0, Math.PI * 2);
                ctx.fill();
            } else if (t === 1) {
                ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
                const cx = x * box + box * 0.7;
                const cy = y * box + box * 0.65;
                ctx.beginPath();
                ctx.arc(cx, cy, box * 0.1, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
}

function drawFence() {
    const seg = fenceSize;

    if (fenceImgLoaded) {
        for (let x = 0; x < canvas.width; x += seg) {
            ctx.drawImage(fenceImg, x, canvas.height - seg, seg, seg);
        }

        for (let x = 0; x < canvas.width; x += seg) {
            ctx.save();
            ctx.translate(x + seg / 2, seg / 2);
            ctx.rotate(Math.PI);
            ctx.drawImage(fenceImg, -seg / 2, -seg / 2, seg, seg);
            ctx.restore();
        }

        for (let y = 0; y < canvas.height; y += seg) {
            ctx.save();
            ctx.translate(canvas.width - seg / 2, y + seg / 2);
            ctx.rotate(-Math.PI / 2);
            ctx.drawImage(fenceImg, -seg / 2, -seg / 2, seg, seg);
            ctx.restore();
        }

        for (let y = 0; y < canvas.height; y += seg) {
            ctx.save();
            ctx.translate(seg / 2, y + seg / 2);
            ctx.rotate(Math.PI / 2);
            ctx.drawImage(fenceImg, -seg / 2, -seg / 2, seg, seg);
            ctx.restore();
        }
    } else {
        ctx.fillStyle = "#8b5a2b";
        ctx.fillRect(0, 0, canvas.width, seg);
        ctx.fillRect(0, canvas.height - seg, canvas.width, seg);
        ctx.fillRect(0, 0, seg, canvas.height);
        ctx.fillRect(canvas.width - seg, 0, seg, canvas.height);
    }
}

function drawBackground() {
    drawGround();
    drawFence();
}

function drawSnakeSegment(x, y, isHead) {
    const padding = 2;
    const w = box - padding * 2;
    const h = box - padding * 2;
    const rx = x + padding;
    const ry = y + padding;
    const r = 6;

    const gradient = ctx.createLinearGradient(rx, ry, rx, ry + h);
    gradient.addColorStop(0, isHead ? "#7cffb3" : "#8cffb9");
    gradient.addColorStop(0.5, isHead ? "#32c96b" : "#2fbb63");
    gradient.addColorStop(1, isHead ? "#15863c" : "#157a37");

    ctx.fillStyle = gradient;
    ctx.strokeStyle = "#0b4f1f";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(rx + r, ry);
    ctx.lineTo(rx + w - r, ry);
    ctx.quadraticCurveTo(rx + w, ry, rx + w, ry + r);
    ctx.lineTo(rx + w, ry + h - r);
    ctx.quadraticCurveTo(rx + w, ry + h, rx + w - r, ry + h);
    ctx.lineTo(rx + r, ry + h);
    ctx.quadraticCurveTo(rx, ry + h, rx, ry + h - r);
    ctx.lineTo(rx, ry + r);
    ctx.quadraticCurveTo(rx, ry, rx + r, ry);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const scaleCols = 3;
    const scaleRows = 3;
    const scaleW = w / scaleCols;
    const scaleH = h / scaleRows;

    for (let i = 0; i < scaleCols; i++) {
        for (let j = 0; j < scaleRows; j++) {
            const sx = rx + i * scaleW;
            const sy = ry + j * scaleH;
            ctx.fillStyle =
                (i + j) % 2 === 0
                    ? "rgba(255, 255, 255, 0.12)"
                    : "rgba(0, 80, 30, 0.18)";
            ctx.fillRect(sx + 1, sy + 1, scaleW - 2, scaleH - 2);
        }
    }

    if (isHead) {
        const eyeRadius = 3;
        let eye1x, eye1y, eye2x, eye2y;

        if (dir === "LEFT") {
            eye1x = rx + w * 0.3;
            eye2x = rx + w * 0.3;
            eye1y = ry + h * 0.35;
            eye2y = ry + h * 0.65;
        } else if (dir === "RIGHT") {
            eye1x = rx + w * 0.7;
            eye2x = rx + w * 0.7;
            eye1y = ry + h * 0.35;
            eye2y = ry + h * 0.65;
        } else if (dir === "UP") {
            eye1x = rx + w * 0.35;
            eye2x = rx + w * 0.65;
            eye1y = ry + h * 0.3;
            eye2y = ry + h * 0.3;
        } else if (dir === "DOWN") {
            eye1x = rx + w * 0.35;
            eye2x = rx + w * 0.65;
            eye1y = ry + h * 0.7;
            eye2y = ry + h * 0.7;
        } else {
            eye1x = rx + w * 0.35;
            eye2x = rx + w * 0.65;
            eye1y = ry + h * 0.3;
            eye2y = ry + h * 0.3;
        }

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(eye1x, eye1y, eyeRadius, 0, Math.PI * 2);
        ctx.arc(eye2x, eye2y, eyeRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#000000";
        const pupilRadius = 1.5;
        ctx.beginPath();
        ctx.arc(eye1x, eye1y, pupilRadius, 0, Math.PI * 2);
        ctx.arc(eye2x, eye2y, pupilRadius, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawApple(x, y) {
    const cx = x + box / 2;
    const cy = y + box / 2;
    const radius = box * 0.4;

    const gradient = ctx.createRadialGradient(
        cx - radius * 0.4,
        cy - radius * 0.4,
        radius * 0.2,
        cx,
        cy,
        radius
    );
    gradient.addColorStop(0, "#fffbf0");
    gradient.addColorStop(0.25, "#ff7878");
    gradient.addColorStop(0.6, "#e02222");
    gradient.addColorStop(1, "#8c1414");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#4a2b0f";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy - radius);
    ctx.lineTo(cx, cy - radius - box * 0.3);
    ctx.stroke();

    ctx.fillStyle = "#2e8b2e";
    ctx.beginPath();
    ctx.moveTo(cx, cy - radius - box * 0.25);
    ctx.quadraticCurveTo(
        cx + box * 0.3,
        cy - radius - box * 0.4,
        cx + box * 0.25,
        cy - radius
    );
    ctx.quadraticCurveTo(
        cx + box * 0.1,
        cy - radius - box * 0.05,
        cx,
        cy - radius - box * 0.25
    );
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.beginPath();
    ctx.ellipse(
        cx - radius * 0.3,
        cy - radius * 0.2,
        radius * 0.35,
        radius * 0.2,
        -0.6,
        0,
        Math.PI * 2
    );
    ctx.fill();
}

function drawPear(x, y) {
    const cx = x + box / 2;
    const cy = y + box / 2;
    const radiusTop = box * 0.25;
    const radiusBottom = box * 0.38;

    const gradient = ctx.createRadialGradient(
        cx - radiusBottom * 0.2,
        cy - radiusBottom * 0.5,
        radiusTop * 0.4,
        cx,
        cy + radiusBottom * 0.2,
        radiusBottom
    );
    gradient.addColorStop(0, "#f7ffcf");
    gradient.addColorStop(0.4, "#d3f35c");
    gradient.addColorStop(1, "#8cab28");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(cx, cy - box * 0.1, radiusTop, radiusTop * 1.1, 0, 0, Math.PI * 2);
    ctx.ellipse(cx, cy + box * 0.12, radiusBottom, radiusBottom * 1.05, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#4a5b16";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - radiusTop - box * 0.1);
    ctx.lineTo(cx, cy - radiusTop - box * 0.35);
    ctx.stroke();

    ctx.fillStyle = "#2e8b2e";
    ctx.beginPath();
    ctx.moveTo(cx, cy - radiusTop - box * 0.3);
    ctx.quadraticCurveTo(cx + box * 0.25, cy - radiusTop - box * 0.55, cx + box * 0.1, cy - radiusTop - box * 0.2);
    ctx.quadraticCurveTo(cx, cy - radiusTop - box * 0.25, cx, cy - radiusTop - box * 0.3);
    ctx.closePath();
    ctx.fill();
}

function drawWatermelon(x, y) {
    const cx = x + box / 2;
    const cy = y + box / 2;
    const radius = box * 0.42;

    ctx.fillStyle = "#0f5f32";
    ctx.beginPath();
    ctx.arc(cx, cy, radius, Math.PI, 2 * Math.PI);
    ctx.arc(cx, cy + radius * 0.35, radius, 0, Math.PI);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#1fab4a";
    ctx.beginPath();
    ctx.arc(cx, cy + radius * 0.02, radius * 0.8, Math.PI, 2 * Math.PI);
    ctx.arc(cx, cy + radius * 0.35, radius * 0.8, 0, Math.PI);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#ff5c5c";
    ctx.beginPath();
    ctx.arc(cx, cy + radius * 0.08, radius * 0.65, Math.PI, 2 * Math.PI);
    ctx.arc(cx, cy + radius * 0.35, radius * 0.65, 0, Math.PI);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#3a1212";
    for (let i = -2; i <= 2; i++) {
        const sx = cx + i * radius * 0.25;
        const sy = cy + radius * 0.02;
        ctx.beginPath();
        ctx.ellipse(sx, sy, 2, 3, 0.3, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawCherry(x, y) {
    const cx = x + box / 2;
    const cy = y + box / 2;
    const r = box * 0.22;

    ctx.strokeStyle = "#4a2b0f";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - r * 1.2, cy - r * 2.2);
    ctx.quadraticCurveTo(cx - r * 0.6, cy - r * 3.2, cx - r * 0.1, cy - r * 2.2);
    ctx.moveTo(cx + r * 1.2, cy - r * 2.2);
    ctx.quadraticCurveTo(cx + r * 0.6, cy - r * 3.0, cx + r * 0.1, cy - r * 2.1);
    ctx.stroke();

    ctx.fillStyle = "#2e8b2e";
    ctx.beginPath();
    ctx.ellipse(cx + r * 0.3, cy - r * 2.3, r * 0.8, r * 0.4, -0.6, 0, Math.PI * 2);
    ctx.fill();

    const gradient1 = ctx.createRadialGradient(
        cx - r * 0.5,
        cy - r * 0.5,
        r * 0.2,
        cx - r * 0.2,
        cy + r * 0.3,
        r
    );
    gradient1.addColorStop(0, "#ffe5f0");
    gradient1.addColorStop(0.3, "#ff6c86");
    gradient1.addColorStop(1, "#b0122a");

    ctx.fillStyle = gradient1;
    ctx.beginPath();
    ctx.arc(cx - r * 1.1, cy + r * 0.6, r, 0, Math.PI * 2);
    ctx.fill();

    const gradient2 = ctx.createRadialGradient(
        cx + r * 0.3,
        cy - r * 0.2,
        r * 0.2,
        cx + r * 0.5,
        cy + r * 0.8,
        r
    );
    gradient2.addColorStop(0, "#ffe5f0");
    gradient2.addColorStop(0.3, "#ff6c86");
    gradient2.addColorStop(1, "#b0122a");

    ctx.fillStyle = gradient2;
    ctx.beginPath();
    ctx.arc(cx + r * 1.1, cy + r * 0.8, r, 0, Math.PI * 2);
    ctx.fill();
}

function drawFruit() {
    if (!food) return;

    const cx = food.x + box / 2;
    const cy = food.y + box / 2;

    ctx.save();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#ffffff";
    ctx.font = box * 0.9 + "px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    let emoji = "🍎";
    if (food.type === "pear") emoji = "🍐";
    else if (food.type === "watermelon") emoji = "🍉";
    else if (food.type === "cherry") emoji = "🍒";
    else if (food.type === "refresh") emoji = "🔄";
    else if (food.type === "grape") emoji = "🍇";

    ctx.fillText(emoji, cx, cy);
    ctx.restore();
}

function startRefreshAnimation() {
    isRefreshAnimating = true;
    refreshAnimStart = currentTime;
    refreshInitialLength = snake.length;
    inputLocked = true;
}

function updateRefreshAnimation(timestamp) {
    const elapsed = timestamp - refreshAnimStart;
    const duration = REFRESH_ANIM_MAX;
    const t = Math.min(1, elapsed / duration);
    const ease = t * t;

    const targetLenFloat = 1 + (refreshInitialLength - 1) * (1 - ease);
    const targetLen = Math.max(1, Math.round(targetLenFloat));

    while (snake.length > targetLen) {
        snake.pop();
    }

    const finishedByTime = elapsed >= duration;
    const finishedByLength = snake.length <= 1;

    if (!finishedByLength && elapsed >= duration - 200) {
        inputLocked = false;
    }

    if (finishedByTime || finishedByLength) {
        isRefreshAnimating = false;

        if (snake.length > 1) {
            snake = [snake[0]];
        }

        inputLocked = false;
        lastTimestamp = timestamp;
    }
}

function update() {
    if (!gameStarted) return;
    if (isRefreshAnimating) {
        return;
    }

    const head = snake[0];
    let headX = head.x;
    let headY = head.y;

    if (dir === "LEFT") headX -= box;
    if (dir === "RIGHT") headX += box;
    if (dir === "UP") headY -= box;
    if (dir === "DOWN") headY += box;

    if (
    headX < fenceSize ||
    headX >= canvas.width - fenceSize ||
    headY < fenceSize ||
    headY >= canvas.height - fenceSize
) {
    gameOver = true;
    scoreMultiplier = 1;
    bonusActiveUntil = 0;
    bonusTimerDisplay.classList.remove("active");
    bonusTimerDisplay.textContent = "";
    scoreRow.classList.remove("timer-active");
    deactivateGrapeDarkness();
    return;
}



    let growFromFood = false;

   if (headX === food.x && headY === food.y) {
    const eatenX = food.x;
    const eatenY = food.y;
    const type = food.type;

    let base = 0;

    if (type === "apple") base = 1;
    else if (type === "pear") base = 2;
    else if (type === "watermelon") base = 5;
    else if (type === "cherry") base = 1;
    else if (type === "refresh") base = 0;
    else if (type === "grape") {
    const r = Math.random();
    if (r < 0.7) {
        base = 3;
    } else {
        base = 0;
        activateGrapeDarkness();
    }
}

    if (type === "cherry") {
        bonusActiveUntil = currentTime + 30000;
        scoreMultiplier = 2;
        
    }

    const add = base * scoreMultiplier;
    score += add;
    scoreDisplay.textContent = "Score: " + score;

    if (type === "refresh") {
        growFromFood = false;
        startRefreshAnimation();
    } else {
        growFromFood = true;
    }

    spawnFood();

    if (add > 0) {
        popups.push({
            x: eatenX + box / 2,
            y: eatenY + box / 2,
            text: "+" + add,
            createdAt: currentTime
        });
    }
}

    if (!growFromFood) {
        snake.pop();
    }

    const newHead = { x: headX, y: headY };

    if (collision(newHead, snake)) {
    gameOver = true;
    scoreMultiplier = 1;
    bonusActiveUntil = 0;
    bonusTimerDisplay.classList.remove("active");
    bonusTimerDisplay.textContent = "";
    scoreRow.classList.remove("timer-active");
    deactivateGrapeDarkness();
    return;
}



    snake.unshift(newHead);
    lastMoveDir = dir;

}

function draw() {
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";

    drawBackground();

    if (isRefreshAnimating) {
        drawFruit();
        drawPopups();

        ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        for (let i = 0; i < snake.length; i++) {
            drawSnakeSegment(snake[i].x, snake[i].y, i === 0);
        }
    } else {
        for (let i = 0; i < snake.length; i++) {
            drawSnakeSegment(snake[i].x, snake[i].y, i === 0);
        }

        drawFruit();
        drawPopups();
        drawDarknessMask();
        
        if (gameOver) {
            ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = "#ffffff";
            ctx.font = "48px Arial";
            ctx.textAlign = "center";
            ctx.fillText("Game Over", canvas.width / 2, canvas.height / 2 - 50);

            const textLeft = "Press  ";
            const textKey = "ENTER";
            const textRight = "  to Restart";

            ctx.font = "22px Arial";
            ctx.textAlign = "center";

            const fullText = textLeft + textKey + textRight;
            const y = canvas.height / 2 + 20;

            ctx.fillStyle = "#ffffff";
            ctx.fillText(fullText, canvas.width / 2, y);

            const keyWidth = ctx.measureText(textKey).width;
            const leftWidth = ctx.measureText(textLeft).width;
            const totalWidth = ctx.measureText(fullText).width;

            const startX = canvas.width / 2 - totalWidth / 2;
            const keyCenterX = startX + leftWidth + keyWidth / 2;

            const padX = 8;
            const padY = 6;
            const rectW = keyWidth + padX * 2;
            const rectH = 22 + padY * 2;
            const rectX = keyCenterX - rectW / 2;
            const rectY = y - 18 - padY;

            ctx.fillStyle = "#2ecc71";
            ctx.beginPath();
            ctx.roundRect(rectX, rectY, rectW, rectH, 8);
            ctx.fill();

            ctx.strokeStyle = "#0e8040";
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = "#0b2f1a";
            ctx.fillText(textKey, keyCenterX, y);
        }
    }
}

function drawPopups() {
    if (!popups.length) return;

    const now = currentTime;
    const duration = 800;

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = box * 0.9 + "px Arial";

    for (let i = 0; i < popups.length; i++) {
        const p = popups[i];
        const t = (now - p.createdAt) / duration;
        if (t >= 1) continue;

        const alpha = 1 - t;
        const offsetY = -t * 40;

        ctx.globalAlpha = alpha;
        ctx.fillStyle = "rgba(0,0,0,0.8)";
        ctx.fillText(p.text, p.x + 1, p.y - 1 + offsetY);
        ctx.fillStyle = "#ddc700ff";
        ctx.fillText(p.text, p.x, p.y + offsetY);
    }

    ctx.restore();

    popups = popups.filter(p => now - p.createdAt < duration);
}

function drawDarknessMask() {
    if (!darknessActive || gameOver || isRefreshAnimating) return;

    const head = snake[0];
    const windowSize = 4 * box;

    let viewX = head.x + box / 2 - windowSize / 2;
    let viewY = head.y + box / 2 - windowSize / 2;

    if (viewX < 0) viewX = 0;
    if (viewY < 0) viewY = 0;
    if (viewX + windowSize > canvas.width) viewX = canvas.width - windowSize;
    if (viewY + windowSize > canvas.height) viewY = canvas.height - windowSize;

    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 1)";

    ctx.fillRect(0, 0, canvas.width, viewY);
    ctx.fillRect(0, viewY, viewX, windowSize);
    ctx.fillRect(viewX + windowSize, viewY, canvas.width - (viewX + windowSize), windowSize);
    ctx.fillRect(0, viewY + windowSize, canvas.width, canvas.height - (viewY + windowSize));

    ctx.restore();
}

function collision(head, array) {
    for (let i = 0; i < array.length; i++) {
        if (head.x === array[i].x && head.y === array[i].y) return true;
    }
    return false;
}

function activateGrapeDarkness() {
    darknessActive = true;
    grapeTimerActive = true;
    grapeTimerUntil = currentTime + DARKNESS_DURATION;

    const gt = document.getElementById("grape-timer");
    gt.classList.add("active");
}

function deactivateGrapeDarkness() {
    darknessActive = false;
    grapeTimerActive = false;
    grapeTimerUntil = 0;

    const gt = document.getElementById("grape-timer");
    gt.classList.remove("active");
    gt.textContent = "";
}

function gameLoop(timestamp) {
    if (!lastTimestamp) lastTimestamp = timestamp;
    const delta = timestamp - lastTimestamp;
    currentTime = timestamp;

    let cherryActive = false;
    let grapeActive = false;

    if (scoreMultiplier > 1) {
        const left = bonusActiveUntil - timestamp;
        if (left <= 0) {
            scoreMultiplier = 1;
            bonusTimerDisplay.classList.remove("active");
            bonusTimerDisplay.textContent = "";
        } else {
            cherryActive = true;
            bonusTimerDisplay.classList.add("active");
            bonusTimerDisplay.textContent = "x2: " + (left / 1000).toFixed(1) + "s";
        }
    } else {
        bonusTimerDisplay.classList.remove("active");
        bonusTimerDisplay.textContent = "";
    }

    const gt = document.getElementById("grape-timer");

    if (grapeTimerActive) {
        const left = grapeTimerUntil - timestamp;
        if (left <= 0) {
            deactivateGrapeDarkness();
        } else {
            grapeActive = true;
            gt.classList.add("active");
            gt.textContent = "Dark: " + (left / 1000).toFixed(1) + "s";
        }
    } else {
        gt.classList.remove("active");
        gt.textContent = "";
    }

    if (cherryActive || grapeActive) {
        scoreRow.classList.add("timer-active");
    } else {
        scoreRow.classList.remove("timer-active");
    }

    if (cherryActive && grapeActive) {
        scoreRow.classList.add("both-timers");
    } else {
        scoreRow.classList.remove("both-timers");
    }

    if (isRefreshAnimating) {
        updateRefreshAnimation(timestamp);
    } else if (!gameOver && delta >= stepInterval) {
        update();
        lastTimestamp = timestamp;
    }

    draw();

    requestAnimationFrame(gameLoop);
}

function restartGame() {
    initGameState();
    deactivateGrapeDarkness();
}

initGameState();
requestAnimationFrame(gameLoop);
