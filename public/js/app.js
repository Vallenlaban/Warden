// js/app.js
/* -------------------------------------------------------------
   PARTICLES & DUST CANVAS ENGINE
   ------------------------------------------------------------- */
const canvas = document.getElementById("particles-canvas");
const ctx = canvas ? canvas.getContext("2d") : null;
let particles = [];

function resizeCanvas() {
  if (canvas) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

class Particle {
  constructor() {
    this.reset();
  }
  reset() {
    if (!canvas) return;
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height + canvas.height * 0.1;
    this.size = Math.random() * 2 + 1;
    this.speedX = (Math.random() - 0.5) * 0.3;
    this.speedY = -Math.random() * 0.5 - 0.1;
    this.alpha = Math.random() * 0.5 + 0.1;
    this.color = document.body.classList.contains("danger-mode")
      ? "255, 61, 90"
      : document.body.classList.contains("warning-mode")
        ? "255, 183, 3"
        : "65, 224, 255";
  }
  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    if (this.y < 0 && canvas) {
      this.reset();
      this.y = canvas.height;
    }
  }
  draw() {
    if (!ctx) return;
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.shadowBlur = 8;
    ctx.shadowColor = `rgba(${this.color}, 0.8)`;
    ctx.fillStyle = `rgb(${this.color})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function initParticles() {
  particles = [];
  const count = Math.min(Math.floor(window.innerWidth / 15), 100);
  for (let i = 0; i < count; i++) {
    particles.push(new Particle());
  }
}

function animateParticles() {
  if (canvas && ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach((p) => {
      p.update();
      p.draw();
    });
  }
  requestAnimationFrame(animateParticles);
}

initParticles();
animateParticles();

/* -------------------------------------------------------------
   WARDEN ANIMATION STATE CONTROLLER
   ------------------------------------------------------------- */
function updateWardenState(state) {
  const body = document.body;
  const aura = document.getElementById("wardenAura");
  const leftEyes = document.getElementById("wardenEyes");
  const rightEyes = document.getElementById("wardenEyesRight");
  try {
    if (state === "DANGER") {
      body.classList.remove("warning-mode");
      body.classList.add("danger-mode");
      if (aura)
        aura.style.background =
          "radial-gradient(circle, rgba(255, 61, 90, 0.55) 0%, transparent 70%)";
      if (leftEyes) {
        leftEyes.style.fill = "#ff3d5a";
        leftEyes.style.filter = "drop-shadow(0 0 10px #ff3d5a)";
      }
      if (rightEyes) {
        rightEyes.style.fill = "#ff3d5a";
        rightEyes.style.filter = "drop-shadow(0 0 10px #ff3d5a)";
      }
    } else if (state === "WARNING") {
      body.classList.remove("danger-mode");
      body.classList.add("warning-mode");
      if (aura)
        aura.style.background =
          "radial-gradient(circle, rgba(255, 183, 3, 0.55) 0%, transparent 70%)";
      if (leftEyes) {
        leftEyes.style.fill = "#ffb703";
        leftEyes.style.filter = "drop-shadow(0 0 10px #ffb703)";
      }
      if (rightEyes) {
        rightEyes.style.fill = "#ffb703";
        rightEyes.style.filter = "drop-shadow(0 0 10px #ffb703)";
      }
    } else {
      body.classList.remove("danger-mode");
      body.classList.remove("warning-mode");
      if (aura)
        aura.style.background =
          "radial-gradient(circle, rgba(65, 224, 255, 0.35) 0%, transparent 70%)";
      if (leftEyes) {
        leftEyes.style.fill = "#41E0FF";
        leftEyes.style.filter = "drop-shadow(0 0 6px #41E0FF)";
      }
      if (rightEyes) {
        rightEyes.style.fill = "#41E0FF";
        rightEyes.style.filter = "drop-shadow(0 0 6px #41E0FF)";
      }
    }

    particles.forEach((p) => {
      if (state === "DANGER") p.color = "255, 61, 90";
      else if (state === "WARNING") p.color = "255, 183, 3";
      else p.color = "65, 224, 255";
    });
  } catch (err) {
    console.error("Warden State updates error:", err);
  }
}

/* -------------------------------------------------------------
   SCANNER UI INTEGRATION & HANDLERS
   ------------------------------------------------------------- */
function performScanAnalysis() {
  const inputField = document.getElementById("urlScannerInput");
  const urlVal = inputField ? inputField.value.trim() : "";

  if (!urlVal) {
    alert("Please enter a valid target URL to initialize scanner.");
    return;
  }

  const loader = document.getElementById("scannerLoader");
  const fill = document.getElementById("scannerProgressFill");
  if (loader) loader.classList.add("active");
  if (fill) fill.style.width = "0%";

  let currentProgress = 0;
  const progressTimer = setInterval(() => {
    currentProgress += Math.floor(Math.random() * 15) + 5;
    if (currentProgress > 95) currentProgress = 95;
    if (fill) fill.style.width = `${currentProgress}%`;
  }, 100);

  evaluateUrlSecurity(urlVal)
    .then((result) => {
      setTimeout(() => {
        clearInterval(progressTimer);
        if (fill) fill.style.width = "100%";
        setTimeout(() => {
          if (loader) loader.classList.remove("active");
          displayScanResults(urlVal, result);
        }, 400);
      }, 1200);
    })
    .catch((err) => {
      clearInterval(progressTimer);
      if (loader) loader.classList.remove("active");
      console.error("Security evaluation threw uncaught error", err);
    });
}
