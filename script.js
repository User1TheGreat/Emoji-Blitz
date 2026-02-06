const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const canvasWrapper = document.getElementById("canvasWrapper");

// --- GAME STATE & SAVING ---
let username = localStorage.getItem("omegaUsername");
let gameState = JSON.parse(localStorage.getItem("omegaGameState")) || {
  score: 0,
  level: 1,
  foundSecrets: new Array(20).fill(false),
};

let elements = [],
  particles = [],
  nextLevelScore = 100;
let menuOpen = false;
let currentInput = "";
let secretKeyPhrase = "omega";
let spawnInterval;

// DOM Elements
const scoreEl = document.getElementById("score");
const levelEl = document.getElementById("level");
const secretsFoundEl = document.getElementById("secretsFound");

// Config
let config = { maxElements: 40, spawnRate: 1000 };

// --- EMOJI LIBRARY ---
const emojiLibrary = [
  { char: "👻", r: 0.6 },
  { char: "💥", r: 0.6 },
  { char: "👾", r: 0.6 },
  { char: "🤖", r: 0.6 },
  { char: "💩", r: 0.6 },
  { char: "🤡", r: 0.6 },
  { char: "🔥", r: 0.6 },
  { char: "🛸", r: 0.6 },
  { char: "🚀", r: 0.6 },
  { char: "🥑", r: 0.6 },
  { char: "💀", r: 0.6 },
  { char: "🌪️", r: 0.6 },
  { char: "👑", r: 0.25 },
  { char: "💎", r: 0.25 },
  { char: "🦊", r: 0.25 },
  { char: "🍕", r: 0.25 },
  { char: "🎸", r: 0.25 },
  { char: "👽", r: 0.25 },
];

function getRandomEmoji() {
  return emojiLibrary[Math.floor(Math.random() * emojiLibrary.length)].char;
}

// Secrets Definition Table
const secretsTable = [
  { id: 0, title: "Panic!", clue: "A button for when things get too hectic." },
  { id: 1, title: "Observer", clue: "The header knows all." },
  { id: 2, title: "Archivist", clue: "Where configurations lie." },
  { id: 3, title: "Shattered", clue: "A single interaction." },
  { id: 4, title: "Beginner", clue: "Time brings progress." },
  { id: 5, title: "Speed Demon", clue: "Swift fingers win." },
  { id: 6, title: "Glass Cannon", clue: "Reach high without touching." },
  { id: 7, title: "Technophile", clue: "Fine-tune your experience." },
  { id: 8, title: "Navigator", clue: "Come and go." },
  { id: 9, title: "Collector", clue: "Amass a fortune." },
  { id: 10, title: "Time Bender", clue: "Halt the inevitable." },
  { id: 11, title: "Explorer", clue: "A curious clicker." },
  { id: 12, title: "Survivor", clue: "Persistence is key." },
  { id: 13, title: "Hoarder", clue: "Crowd the workspace." },
  { id: 14, title: "Ghost Hunter", clue: "Spooky encounter." },
  { id: 15, title: "Precision", clue: "Right in the bullseye." },
  { id: 16, title: "Unlucky", clue: "End of the line." },
  { id: 17, title: "Architect", clue: "Pushing the limits." },
  { id: 18, title: "Procrastinator", clue: "A moment of stillness." },
  { id: 19, title: "OMEGA", clue: "The final word." },
];

// --- INITIALIZATION & USERNAME ---
function init() {
  if (!username) {
    document.getElementById("usernameModal").style.display = "flex";
  } else {
    document.getElementById("usernameModal").style.display = "none";
    document.getElementById("currentUserDisplay").innerText = username;
  }

  scoreEl.innerText = gameState.score;
  levelEl.innerText = gameState.level;
  let foundCount = gameState.foundSecrets.filter((s) => s).length;
  secretsFoundEl.innerText = foundCount;
  spawnInterval = setInterval(spawnElement, config.spawnRate);
  draw();
}

function saveUsername() {
  let input = document.getElementById("usernameInput").value;
  if (input.length >= 3 && input.length <= 15) {
    localStorage.setItem("omegaUsername", input);
    username = input;
    document.getElementById("usernameModal").style.display = "none";
    document.getElementById("currentUserDisplay").innerText = username;
  } else {
    alert("Username must be between 3 and 15 characters.");
  }
}

function changeUsername() {
  let input = document.getElementById("changeUsernameInput").value;
  if (input.length >= 3 && input.length <= 15) {
    // Update username in leaderboard too
    let highScores = JSON.parse(localStorage.getItem("omegaHighScores")) || [];
    highScores.forEach((score) => {
      if (score.user === username) score.user = input;
    });
    localStorage.setItem("omegaHighScores", JSON.stringify(highScores));

    localStorage.setItem("omegaUsername", input);
    username = input;
    document.getElementById("currentUserDisplay").innerText = username;
    alert("Username updated!");
  } else {
    alert("Username must be between 3 and 15 characters.");
  }
}

// Save state function
function saveGame() {
  localStorage.setItem("omegaGameState", JSON.stringify(gameState));
}

// --- UI & Controls ---
function resizeCanvas() {
  canvas.width = menuOpen ? window.innerWidth - 300 : window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// Toggle Menu
document.getElementById("menuToggle").addEventListener("click", () => {
  menuOpen = !menuOpen;
  document.getElementById("sidebar").classList.toggle("closed");

  // --- BLUR, FREEZE, AND SPAWN MECHANICS ---
  if (menuOpen) {
    canvasWrapper.classList.add("blurred");
    clearInterval(spawnInterval); // Stop spawning
  } else {
    canvasWrapper.classList.remove("blurred");
    spawnInterval = setInterval(spawnElement, config.spawnRate); // Resume spawning
  }

  // Animate bars
  const bars = document.querySelectorAll(".bar");
  bars[0].style.transform = menuOpen
    ? "rotate(-45deg) translate(-5px, 6px)"
    : "none";
  bars[1].style.opacity = menuOpen ? "0" : "1";
  bars[2].style.transform = menuOpen
    ? "rotate(45deg) translate(-5px, -6px)"
    : "none";
  resizeCanvas();
  triggerSecret(8); // Navigation secret
});

// Sidebar Event Listeners
document
  .getElementById("leaderboardBtn")
  .addEventListener("click", toggleOmegaLeaderboard);
document
  .getElementById("secretsBtn")
  .addEventListener("click", toggleSecretsPanel);
document
  .getElementById("accountBtn")
  .addEventListener("click", () => togglePanel("accountPanel"));
document.getElementById("infoBtn").addEventListener("click", () => {
  togglePanel("infoPanel");
  triggerSecret(11);
});
document.getElementById("settingsBtn").addEventListener("click", () => {
  togglePanel("settingsPanel");
  triggerSecret(2);
});
document
  .getElementById("sidebarTitle")
  .addEventListener("click", () => triggerSecret(1));

// Helper to toggle specific panels and close others
function togglePanel(panelId) {
  const panels = ["infoPanel", "settingsPanel", "secretsPanel", "accountPanel"];
  panels.forEach((id) => {
    if (id === panelId) document.getElementById(id).classList.toggle("hidden");
    else document.getElementById(id).classList.add("hidden");
  });
}

function toggleSecretsPanel() {
  togglePanel("secretsPanel");
  renderSecretsList();
}

function renderSecretsList() {
  const list = document.getElementById("secretsList");
  list.innerHTML = secretsTable
    .map(
      (s) => `
        <div style="margin-bottom: 10px; padding: 5px; border-bottom: 1px solid #333; opacity: ${gameState.foundSecrets[s.id] ? "1" : "0.5"}" 
             title="${gameState.foundSecrets[s.id] ? "Unlocked! How: " + s.clue : ""}">
            <strong>${gameState.foundSecrets[s.id] ? s.title : "???"}</strong><br>
            <span style="font-size: 10px; color: #666;">${gameState.foundSecrets[s.id] ? "Unlocked" : "Clue: " + s.clue}</span>
        </div>
    `,
    )
    .join("");
}

// Settings Functionality
document.getElementById("maxElements").addEventListener("change", (e) => {
  config.maxElements = e.target.value;
  if (e.target.value == 150) triggerSecret(17);
});
document.getElementById("spawnSpeed").addEventListener("change", (e) => {
  config.spawnRate = e.target.value;
  clearInterval(spawnInterval);
  spawnInterval = setInterval(spawnElement, config.spawnRate);
  triggerSecret(7);
});
document.getElementById("panicButton").addEventListener("click", () => {
  elements = [];
  if (gameState.score > 500) triggerSecret(0);
});

// --- Gameplay, Bouncing, & Particles ---
function spawnElement() {
  if (elements.length >= config.maxElements) return;
  const size = Math.random() * 20 + 20;
  elements.push({
    char: getRandomEmoji(),
    x: Math.random() * (canvas.width - size),
    y: Math.random() * (canvas.height - size),
    size: size,
    vx: (Math.random() - 0.5) * (gameState.level + 2),
    vy: (Math.random() - 0.5) * (gameState.level + 2),
    color: `hsl(${Math.random() * 360}, 100%, 70%)`,
  });
}

// Particle System
function createParticles(x, y, color) {
  for (let i = 0; i < 15; i++) {
    particles.push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 10,
      vy: (Math.random() - 0.5) * 10,
      size: Math.random() * 3 + 1,
      life: 30,
      color: color,
    });
  }
}

function draw() {
  ctx.fillStyle = "rgba(10, 10, 12, 0.3)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Update & Draw Elements (Freeze if menu open)
  elements.forEach((el) => {
    if (!menuOpen) {
      el.x += el.vx;
      el.y += el.vy;
      if (el.x + el.size > canvas.width || el.x < 0) el.vx *= -1;
      if (el.y + el.size > canvas.height || el.y < 0) el.vy *= -1;
    }

    ctx.font = `${el.size}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = el.color;
    ctx.fillText(el.char, el.x + el.size / 2, el.y + el.size / 2);
  });

  // Update & Draw Particles (Freeze if menu open)
  particles.forEach((p, i) => {
    if (!menuOpen) {
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
    }
    ctx.fillStyle = `rgba(255, 255, 255, ${p.life / 30})`;
    ctx.fillRect(p.x, p.y, p.size, p.size);
    if (p.life <= 0) particles.splice(i, 1);
  });

  requestAnimationFrame(draw);
}

// --- Clicking & Secrets ---
canvas.addEventListener("mousedown", (e) => {
  // If menu is open, don't allow clicks on canvas
  if (menuOpen) return;

  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  for (let i = elements.length - 1; i >= 0; i--) {
    let el = elements[i];
    if (
      mouseX > el.x &&
      mouseX < el.x + el.size &&
      mouseY > el.y &&
      mouseY < el.y + el.size
    ) {
      // Create Explosion
      createParticles(el.x + el.size / 2, el.y + el.size / 2, el.color);

      if (el.char === "👻") triggerSecret(14);

      elements.splice(i, 1);
      gameState.score += 10;
      scoreEl.innerText = gameState.score;
      triggerSecret(3);
      saveGame();

      // Level up logic
      if (gameState.score >= nextLevelScore) {
        gameState.level++;
        levelEl.innerText = gameState.level;
        nextLevelScore += 100 * gameState.level;
        if (gameState.level >= 2) triggerSecret(4);
      }
      break;
    }
  }
});

// Secret Key Input
window.addEventListener("keydown", (e) => {
  currentInput += e.key.toLowerCase();
  if (currentInput.includes(secretKeyPhrase)) {
    triggerSecret(19); // OMEGA secret
    currentInput = "";
    document.getElementById("unlockOmega").classList.remove("hidden");
  }
  if (currentInput.length > 20) currentInput = "";
});

function triggerSecret(index) {
  if (gameState.foundSecrets[index]) return;
  gameState.foundSecrets[index] = true;
  let foundCount = gameState.foundSecrets.filter((s) => s).length;
  secretsFoundEl.innerText = foundCount;
  saveGame();
  if (foundCount >= 20) alert("ALL SECRETS FOUND!");
}

// --- Leaderboard ---
function toggleOmegaLeaderboard() {
  const panel = document.getElementById("leaderboardPanel");
  renderLeaderboard();
  panel.classList.toggle("hidden");
  setTimeout(() => panel.classList.toggle("active"), 10);
  triggerSecret(5);
}
function renderLeaderboard() {
  const list = document.getElementById("omegaLeaderboardList");
  // Saving top 5 scores with usernames
  let highScores = JSON.parse(localStorage.getItem("omegaHighScores")) || [];

  // Filter to ensure only valid data
  highScores = highScores.filter(
    (s) => s && s.user && typeof s.score === "number",
  );

  // Update or Add current score
  let existingScore = highScores.find((s) => s.user === username);
  if (existingScore) {
    if (gameState.score > existingScore.score)
      existingScore.score = gameState.score;
  } else if (username) {
    highScores.push({ user: username, score: gameState.score });
  }

  highScores.sort((a, b) => b.score - a.score);
  highScores = highScores.slice(0, 5);
  localStorage.setItem("omegaHighScores", JSON.stringify(highScores));

  list.innerHTML =
    highScores.length === 0
      ? "<li>No scores yet...</li>"
      : highScores.map((s) => `<li>${s.user}: ${s.score}</li>`).join("");
}
function closePanel(id) {
  const panel = document.getElementById(id);
  panel.classList.remove("active");
  setTimeout(() => panel.classList.add("hidden"), 500);
}

init();
