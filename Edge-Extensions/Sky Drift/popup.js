const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const gameFrame = document.getElementById("gameFrame");
const scoreEl = document.getElementById("score");
const bestScoreEl = document.getElementById("bestScore");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayMessage = document.getElementById("overlayMessage");
const overlayButton = document.getElementById("overlayButton");

const WORLD = {
  width: 380,
  height: 500,
  birdX: 92,
  birdSize: 36,
  gravity: 0.48,
  flapVelocity: -8.6,
  maxFallSpeed: 10,
  pipeWidth: 82,
  pipeGap: 156,
  pipeSpeed: 3.5,
  pipeSpawnMs: 1500,
  minGapY: 108,
  maxGapY: 360,
  groundHeight: 76,
};

const STORAGE_KEY = "sky-drift-best-score";

let status = "idle";
let birdY = WORLD.height / 2 - WORLD.birdSize / 2;
let velocity = 0;
let pipes = [];
let score = 0;
let bestScore = Number(localStorage.getItem(STORAGE_KEY) || 0);
let nextPipeId = 1;
let spawnClock = 0;
let lastFrameTime = 0;
let groundOffset = 0;
let animationFrameId = 0;

function setupCanvas() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = WORLD.width * ratio;
  canvas.height = WORLD.height * ratio;
  canvas.style.width = `${WORLD.width}px`;
  canvas.style.height = `${WORLD.height}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function createPipe() {
  return {
    id: nextPipeId,
    x: WORLD.width + WORLD.pipeWidth,
    gapY: Math.random() * (WORLD.maxGapY - WORLD.minGapY) + WORLD.minGapY,
    passed: false,
  };
}

function resetGame() {
  status = "idle";
  birdY = WORLD.height / 2 - WORLD.birdSize / 2;
  velocity = 0;
  pipes = [];
  score = 0;
  nextPipeId = 1;
  spawnClock = 0;
  groundOffset = 0;
  updateHud();
  showOverlay("Ready?", "Fly through the pipe canyon without touching anything.", "Start");
}

function startGame() {
  if (status === "game-over") {
    resetGame();
  }

  status = "playing";
  overlay.hidden = true;
  velocity = WORLD.flapVelocity;
  gameFrame.focus({ preventScroll: true });
}

function flap() {
  if (status === "idle" || status === "game-over") {
    startGame();
    return;
  }

  velocity = WORLD.flapVelocity;
}

function endGame() {
  if (status !== "playing") {
    return;
  }

  status = "game-over";
  bestScore = Math.max(bestScore, score);
  localStorage.setItem(STORAGE_KEY, String(bestScore));
  updateHud();
  showOverlay("Crash!", `Score: ${score}   Best: ${bestScore}`, "Play Again");
}

function showOverlay(title, message, buttonText) {
  overlayTitle.textContent = title;
  overlayMessage.textContent = message;
  overlayButton.textContent = buttonText;
  overlay.hidden = false;
}

function updateHud() {
  scoreEl.textContent = String(score);
  bestScoreEl.textContent = String(bestScore);
}

function pulseScore() {
  scoreEl.classList.remove("bump");
  void scoreEl.offsetWidth;
  scoreEl.classList.add("bump");
}

function updateGame(elapsedMs) {
  if (status !== "playing") {
    return;
  }

  const frameScale = elapsedMs / 16.666;
  velocity = Math.min(velocity + WORLD.gravity * frameScale, WORLD.maxFallSpeed);
  birdY += velocity * frameScale;

  spawnClock += elapsedMs;
  if (spawnClock >= WORLD.pipeSpawnMs) {
    spawnClock = 0;
    pipes.push(createPipe());
    nextPipeId += 1;
  }

  for (const pipe of pipes) {
    pipe.x -= WORLD.pipeSpeed * frameScale;

    if (!pipe.passed && pipe.x + WORLD.pipeWidth < WORLD.birdX) {
      pipe.passed = true;
      score += 1;
      pulseScore();
    }
  }

  pipes = pipes.filter((pipe) => pipe.x + WORLD.pipeWidth > -40);
  groundOffset = (groundOffset - WORLD.pipeSpeed * frameScale) % 200;
  updateHud();
  detectCollision();
}

function detectCollision() {
  const birdTop = birdY;
  const birdBottom = birdY + WORLD.birdSize;
  const birdLeft = WORLD.birdX;
  const birdRight = WORLD.birdX + WORLD.birdSize;
  const hitCeiling = birdTop <= 0;
  const hitGround = birdBottom >= WORLD.height - WORLD.groundHeight;

  const hitPipe = pipes.some((pipe) => {
    const overlapsX = birdRight > pipe.x && birdLeft < pipe.x + WORLD.pipeWidth;
    if (!overlapsX) {
      return false;
    }

    const gapTop = pipe.gapY - WORLD.pipeGap / 2;
    const gapBottom = pipe.gapY + WORLD.pipeGap / 2;
    return birdTop < gapTop || birdBottom > gapBottom;
  });

  if (hitCeiling || hitGround || hitPipe) {
    endGame();
  }
}

function drawSky() {
  const gradient = ctx.createLinearGradient(0, 0, 0, WORLD.height);
  gradient.addColorStop(0, "#0ea5e9");
  gradient.addColorStop(0.42, "#38bdf8");
  gradient.addColorStop(1, "#7dd3fc");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  const glow = ctx.createRadialGradient(WORLD.width / 2, 72, 12, WORLD.width / 2, 72, 240);
  glow.addColorStop(0, "rgba(255,255,255,0.38)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  drawCloud(46, 86, 0.8);
  drawCloud(284, 132, 0.62);
  drawCloud(192, 242, 0.52);
}

function drawCloud(x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  ctx.arc(0, 16, 17, 0, Math.PI * 2);
  ctx.arc(22, 8, 22, 0, Math.PI * 2);
  ctx.arc(48, 16, 16, 0, Math.PI * 2);
  ctx.rect(0, 16, 52, 18);
  ctx.fill();
  ctx.restore();
}

function drawPipe(pipe) {
  const topHeight = pipe.gapY - WORLD.pipeGap / 2;
  const bottomTop = pipe.gapY + WORLD.pipeGap / 2;
  const bottomHeight = WORLD.height - WORLD.groundHeight - bottomTop;

  ctx.fillStyle = "#22c55e";
  ctx.strokeStyle = "#14532d";
  ctx.lineWidth = 2;

  ctx.fillRect(pipe.x, 0, WORLD.pipeWidth, topHeight);
  ctx.strokeRect(pipe.x, 0, WORLD.pipeWidth, topHeight);

  ctx.fillRect(pipe.x - 8, topHeight - 18, WORLD.pipeWidth + 16, 20);
  ctx.strokeRect(pipe.x - 8, topHeight - 18, WORLD.pipeWidth + 16, 20);

  ctx.fillRect(pipe.x, bottomTop, WORLD.pipeWidth, bottomHeight);
  ctx.strokeRect(pipe.x, bottomTop, WORLD.pipeWidth, bottomHeight);

  ctx.fillRect(pipe.x - 8, bottomTop, WORLD.pipeWidth + 16, 20);
  ctx.strokeRect(pipe.x - 8, bottomTop, WORLD.pipeWidth + 16, 20);
}

function drawBird() {
  const centerX = WORLD.birdX + WORLD.birdSize / 2;
  const centerY = birdY + WORLD.birdSize / 2;
  const tilt = Math.max(-0.55, Math.min(1.05, velocity * 0.08));

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(tilt);
  ctx.translate(-centerX, -centerY);

  ctx.fillStyle = "#fbbf24";
  ctx.strokeStyle = "#78350f";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(centerX, centerY, WORLD.birdSize / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "rgba(217,119,6,0.55)";
  ctx.beginPath();
  ctx.ellipse(centerX - 7, centerY + 7, 10, 7, -0.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#fef3c7";
  ctx.beginPath();
  ctx.arc(centerX - 6, centerY - 4, 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#111827";
  ctx.beginPath();
  ctx.arc(centerX + 8, centerY - 3, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f97316";
  ctx.strokeStyle = "#9a3412";
  ctx.beginPath();
  ctx.moveTo(centerX + 18, centerY + 3);
  ctx.lineTo(centerX + 33, centerY + 8);
  ctx.lineTo(centerX + 18, centerY + 14);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

function drawGround() {
  const y = WORLD.height - WORLD.groundHeight;
  ctx.fillStyle = "#65a30d";
  ctx.fillRect(0, y, WORLD.width, WORLD.groundHeight);

  ctx.strokeStyle = "#365314";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(WORLD.width, y);
  ctx.stroke();

  ctx.fillStyle = "#84cc16";
  for (let x = groundOffset - 200; x < WORLD.width + 200; x += 200) {
    ctx.fillRect(x, y + 8, 120, WORLD.groundHeight - 15);
  }
}

function render() {
  drawSky();
  for (const pipe of pipes) {
    drawPipe(pipe);
  }
  drawBird();
  drawGround();
}

function tick(timestamp) {
  if (!lastFrameTime) {
    lastFrameTime = timestamp;
  }

  const elapsedMs = Math.min(timestamp - lastFrameTime, 34);
  lastFrameTime = timestamp;
  updateGame(elapsedMs);
  render();
  animationFrameId = requestAnimationFrame(tick);
}

function handlePlayInput(event) {
  if (event) {
    event.preventDefault();
  }
  flap();
}

overlayButton.addEventListener("click", handlePlayInput);

gameFrame.addEventListener("pointerdown", (event) => {
  if (event.target === overlayButton) {
    return;
  }
  handlePlayInput(event);
});

window.addEventListener("keydown", (event) => {
  if (event.code === "Space" || event.code === "ArrowUp") {
    handlePlayInput(event);
  }
});

window.addEventListener("beforeunload", () => {
  cancelAnimationFrame(animationFrameId);
});

setupCanvas();
resetGame();
render();
animationFrameId = requestAnimationFrame(tick);