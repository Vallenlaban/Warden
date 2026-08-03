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

/* -------------------------------------------------------------
   RENDER ANALYSIS RESULTS TO DYNAMIC UI CARD
   ------------------------------------------------------------- */
let latestScanResult = null;

function displayScanResults(url, result) {
  latestScanResult = { url, ...result };
  const resultCard = document.getElementById("scanResultCard");
  const resultHeaderBanner = document.getElementById("resultHeaderBanner");
  const resultBannerIcon = document.getElementById("resultBannerIcon");
  const resultBannerTitle = document.getElementById("resultBannerTitle");
  const resultScoreNum = document.getElementById("resultScoreNum");
  const resultUrlDisplay = document.getElementById("resultUrlDisplay");
  const resultAiText = document.getElementById("resultAiText");
  const resultRecText = document.getElementById("resultRecommendationText");
  const scoreCircleFill = document.getElementById("scoreCircleFill");
  const btnReport = document.getElementById("btnBlockReport");
  const resultClassification = document.getElementById("resultClassification");
  const resultThreatLevel = document.getElementById("resultThreatLevel");

  try {
    if (resultUrlDisplay) resultUrlDisplay.textContent = url;
    if (resultScoreNum) resultScoreNum.textContent = result.threat_score;
    if (resultAiText) resultAiText.textContent = result.reason;
    if (resultThreatLevel)
      resultThreatLevel.textContent = `${result.threat_score}%`;
    if (resultClassification)
      resultClassification.textContent = result.classification || result.status;

    if (scoreCircleFill) {
      const maxOffset = 377;
      const scorePercent = result.threat_score / 100;
      const targetOffset = maxOffset - maxOffset * scorePercent;
      scoreCircleFill.style.strokeDashoffset = targetOffset;
    }

    if (result.status === "DANGER") {
      updateWardenState("DANGER");
      if (resultHeaderBanner) {
        resultHeaderBanner.className = "result-header-banner danger";
        resultHeaderBanner.style.removeProperty("background");
        resultHeaderBanner.style.removeProperty("color");
        resultHeaderBanner.style.removeProperty("border-bottom-color");
      }
      if (resultBannerIcon) resultBannerIcon.textContent = "⚔";
      if (resultBannerTitle)
        resultBannerTitle.textContent = "WARDEN HAS DETECTED A HOSTILE ENTITY";
      if (scoreCircleFill) scoreCircleFill.style.stroke = "var(--color-danger)";
      if (resultClassification)
        resultClassification.style.color = "var(--color-danger)";
      if (resultThreatLevel)
        resultThreatLevel.style.color = "var(--color-danger)";
      if (resultRecText)
        resultRecText.textContent = "Immediately block this website.";
      if (btnReport) btnReport.classList.add("active");
      if (resultCard) resultCard.style.borderColor = "rgba(255, 61, 90, 0.45)";
    } else if (result.status === "WARNING") {
      updateWardenState("WARNING");
      if (resultHeaderBanner) {
        resultHeaderBanner.className = "result-header-banner warning";
        resultHeaderBanner.style.background =
          "linear-gradient(90deg, rgba(255, 183, 3, 0.15), rgba(255, 183, 3, 0.35), rgba(255, 183, 3, 0.15))";
        resultHeaderBanner.style.color = "var(--color-warning)";
        resultHeaderBanner.style.borderBottomColor = "rgba(255, 183, 3, 0.4)";
      }
      if (resultBannerIcon) resultBannerIcon.textContent = "⚠️";
      if (resultBannerTitle)
        resultBannerTitle.textContent = "WARDEN HAS SPOTTED AN ANOMALY";
      if (scoreCircleFill)
        scoreCircleFill.style.stroke = "var(--color-warning)";
      if (resultClassification)
        resultClassification.style.color = "var(--color-warning)";
      if (resultThreatLevel)
        resultThreatLevel.style.color = "var(--color-warning)";
      if (resultRecText)
        resultRecText.textContent =
          "Proceed with caution. The domain profile has suspicious indicators.";
      if (btnReport) btnReport.classList.remove("active");
      if (resultCard) resultCard.style.borderColor = "rgba(255, 183, 3, 0.45)";
    } else if (result.status === "SAFE") {
      updateWardenState("SAFE");
      if (resultHeaderBanner) {
        resultHeaderBanner.className = "result-header-banner safe";
        resultHeaderBanner.style.removeProperty("background");
        resultHeaderBanner.style.removeProperty("color");
        resultHeaderBanner.style.removeProperty("border-bottom-color");
      }
      if (resultBannerIcon) resultBannerIcon.textContent = "🛡";
      if (resultBannerTitle)
        resultBannerTitle.textContent = "WARDEN HAS SECURED THIS DOMAIN";
      if (scoreCircleFill)
        scoreCircleFill.style.stroke = "var(--color-success)";
      if (resultClassification)
        resultClassification.style.color = "var(--color-success)";
      if (resultThreatLevel)
        resultThreatLevel.style.color = "var(--color-success)";
      if (resultRecText) resultRecText.textContent = "Safe to continue.";
      if (btnReport) btnReport.classList.remove("active");
      if (resultCard) resultCard.style.borderColor = "rgba(0, 208, 132, 0.4)";
    } else {
      updateWardenState("SAFE");
      if (resultHeaderBanner) {
        resultHeaderBanner.className = "result-header-banner warning";
        resultHeaderBanner.style.removeProperty("background");
        resultHeaderBanner.style.removeProperty("color");
        resultHeaderBanner.style.removeProperty("border-bottom-color");
      }
      if (resultBannerIcon) resultBannerIcon.textContent = "❌";
      if (resultBannerTitle)
        resultBannerTitle.textContent = "VERIFICATION STOPPED";
      if (scoreCircleFill) scoreCircleFill.style.stroke = "var(--text-muted)";
      if (resultClassification)
        resultClassification.style.color = "var(--text-muted)";
      if (resultThreatLevel)
        resultThreatLevel.style.color = "var(--text-muted)";
      if (resultRecText)
        resultRecText.textContent =
          "The verification run was halted. " + result.reason;
      if (btnReport) btnReport.classList.remove("active");
      if (resultCard) resultCard.style.borderColor = "rgba(255, 255, 255, 0.1)";
    }

    if (resultCard) resultCard.classList.add("show");
    if (typeof lucide !== "undefined") {
      lucide.createIcons();
    }
    if (result.status !== "INVALID") {
      insertThreatLedgerRecord(url, result);
    }

    updateReportCounterUI(url);
  } catch (err) {
    console.error("UI rendering failed.", err);
  }
}

function updateReportCounterUI(domainUrl) {
  const card = document.getElementById("reportCounterCard");
  const valElem = document.getElementById("reportCounterValue");
  if (!card || !valElem) return;

  if (!domainUrl) {
    card.className = "report-counter-card empty";
    valElem.textContent = "NOT REPORTS YET";
    return;
  }

  let cleanUrl = domainUrl.trim().toLowerCase();
  try {
    const parsed = new URL(
      cleanUrl.startsWith("http") ? cleanUrl : "https://" + cleanUrl,
    );
    cleanUrl = parsed.hostname;
  } catch (e) {}

  const cached = localStorage.getItem("warden_reports_" + cleanUrl);
  const count = cached ? parseInt(cached, 10) : 0;

  if (count > 0) {
    card.className = "report-counter-card active";
    valElem.textContent = `${count} REPORT${count > 1 ? "S" : ""}`;
  } else {
    card.className = "report-counter-card empty";
    valElem.textContent = "NOT REPORTS YET";
  }
}

async function submitThreatReport() {
  if (!latestScanResult || latestScanResult.status !== "DANGER") {
    alert(
      "Only results detected as DANGER can be reported to BOT Chain. Please run the scanner first.",
    );
    return;
  }

  if (!walletConnected || !contract) {
    alert("Please connect your MetaMask or BO Wallet first.");
    return;
  }

  try {
    const urlHash = ethers.hashMessage(latestScanResult.url);
    const tx = await contract.reportThreat(
      urlHash,
      Number(latestScanResult.threat_score),
      latestScanResult.status,
      latestScanResult.reason,
    );

    alert("Transaction submitted. Please confirm in MetaMask.");
    await tx.wait();
    const url = latestScanResult?.url || "";
    if (url) {
      let cleanUrl = url.trim().toLowerCase();
      try {
        const parsed = new URL(
          cleanUrl.startsWith("http") ? cleanUrl : "https://" + cleanUrl,
        );
        cleanUrl = parsed.hostname;
      } catch (e) {}
      const cached = localStorage.getItem("warden_reports_" + cleanUrl);
      const currentCount = cached ? parseInt(cached, 10) : 0;
      localStorage.setItem(
        "warden_reports_" + cleanUrl,
        String(currentCount + 1),
      );
    }
    updateReportCounterUI(latestScanResult.url);
    alert("The report has been published to the BOT Chain Mainnet.");
  } catch (err) {
    console.error("submitThreatReport error:", err);
    alert(
      err?.message || "An error occurred while submitting the on-chain report.",
    );
  }
}

/* -------------------------------------------------------------
   DYNAMIC THREAT LEDGER TABLE MODIFIER
   ------------------------------------------------------------- */
function insertThreatLedgerRecord(url, result) {
  const tableBody = document.getElementById("threatLedgerBody");
  if (!tableBody) return;
  try {
    const newRow = document.createElement("tr");
    let scoreClass = "var(--color-success)";
    if (result.status === "DANGER") scoreClass = "var(--color-danger)";
    else if (result.status === "WARNING") scoreClass = "var(--color-warning)";
    let statusPill = '<span class="status-badge safe">Verified Safe</span>';
    if (result.status === "DANGER") {
      statusPill = '<span class="status-badge danger">Blocked</span>';
    } else if (result.status === "WARNING") {
      statusPill = '<span class="status-badge warning">Suspicious</span>';
    }
    const shortReporter =
      walletConnected && userWalletAddress
        ? `${userWalletAddress.slice(0, 5)}...${userWalletAddress.slice(-4)}`
        : "Not Connected";

    newRow.innerHTML = `
      <td>${url}</td>
      <td style="font-weight: 700; color: ${scoreClass};">${result.threat_score}% / ${result.classification || result.status}</td>
      <td>${statusPill}</td>
      <td>
        <div class="reporter-avatar">
          <div class="reporter-avatar-img" style="background: linear-gradient(135deg, #f59e0b, #6366f1);"></div>
          <span>${shortReporter}</span>
        </div>
      </td>
      <td>Just Now</td>
    `;

    tableBody.insertBefore(newRow, tableBody.firstChild);
    if (result.status === "DANGER") {
      const statBlocked = document.getElementById("statBlocked");
      if (statBlocked) {
        let currentBlocked = parseInt(
          statBlocked.textContent.replace(/,/g, ""),
        );
        statBlocked.textContent = (currentBlocked + 1).toLocaleString();
      }
    } else if (result.status === "SAFE") {
      const statProtected = document.getElementById("statProtected");
      if (statProtected) {
        let currentProtected = parseInt(
          statProtected.textContent.replace(/,/g, ""),
        );
        statProtected.textContent = (currentProtected + 1).toLocaleString();
      }
    }
  } catch (err) {
    console.error("Failed to append threat ledger row.", err);
  }
}

function initializeEventListeners() {
  const walletBtn = document.getElementById("connectWalletBtn");
  const scanBtn = document.querySelector(".btn-submit-scan");
  const reportBtn = document.getElementById("btnBlockReport");

  if (walletBtn) {
    walletBtn.addEventListener("click", toggleWalletConnection);
  }
  if (scanBtn) {
    scanBtn.addEventListener("click", performScanAnalysis);
  }
  if (reportBtn) {
    reportBtn.addEventListener("click", submitThreatReport);
  }
}

function lockBodyScroll() {
  const scrollY =
    window.scrollY ||
    window.pageYOffset ||
    document.documentElement.scrollTop ||
    0;
  document.body.dataset.scrollY = String(scrollY);
  document.body.style.position = "fixed";
  document.body.style.top = `-${scrollY}px`;
  document.body.style.left = "0";
  document.body.style.right = "0";
  document.body.style.width = "100%";
  document.body.style.overflow = "hidden";
  document.documentElement.style.overflow = "hidden";
  document.documentElement.style.scrollBehavior = "auto";
}

function unlockBodyScroll() {
  const scrollY = Number(document.body.dataset.scrollY);
  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.left = "";
  document.body.style.right = "";
  document.body.style.width = "";
  document.body.style.overflow = "";
  document.documentElement.style.overflow = "";
  document.documentElement.style.scrollBehavior = "auto";
  document.body.removeAttribute("data-scroll-y");
  if (!Number.isNaN(scrollY) && scrollY !== 0) {
    window.scrollTo(0, scrollY);
    document.documentElement.scrollTop = scrollY;
    document.body.scrollTop = scrollY;
  }
}

function closeAllModals() {
  document.querySelectorAll(".modal-overlay.active").forEach((modal) => {
    modal.classList.remove("active");
  });
}

function openBotChainModal(e) {
  if (e && typeof e.preventDefault === "function") {
    e.preventDefault();
    e.stopPropagation();
  }
  closeAllModals();
  lockBodyScroll();
  const modal = document.getElementById("botChainModal");
  if (modal) {
    modal.classList.add("active");
    if (typeof window.lucide !== "undefined") {
      window.lucide.createIcons();
    }
  }
}

function closeBotChainModal(e) {
  if (e && typeof e.preventDefault === "function") {
    e.preventDefault();
    e.stopPropagation();
  }
  const modal = document.getElementById("botChainModal");
  if (modal) modal.classList.remove("active");
  unlockBodyScroll();
}

function openSmartContractModal(e) {
  if (e && typeof e.preventDefault === "function") {
    e.preventDefault();
    e.stopPropagation();
  }
  closeAllModals();
  lockBodyScroll();
  const modal = document.getElementById("smartContractModal");
  if (modal) {
    modal.classList.add("active");
    if (typeof window.lucide !== "undefined") {
      window.lucide.createIcons();
    }
  }
}

function closeSmartContractModal(e) {
  if (e && typeof e.preventDefault === "function") {
    e.preventDefault();
    e.stopPropagation();
  }
  const modal = document.getElementById("smartContractModal");
  if (modal) modal.classList.remove("active");
  unlockBodyScroll();
}

function openAiSecurityModal(e) {
  if (e && typeof e.preventDefault === "function") {
    e.preventDefault();
    e.stopPropagation();
  }
  closeAllModals();
  lockBodyScroll();
  const modal = document.getElementById("aiSecurityModal");
  if (modal) {
    modal.classList.add("active");
    if (typeof window.lucide !== "undefined") {
      window.lucide.createIcons();
    }
  }
}

function closeAiSecurityModal(e) {
  if (e && typeof e.preventDefault === "function") {
    e.preventDefault();
    e.stopPropagation();
  }
  const modal = document.getElementById("aiSecurityModal");
  if (modal) modal.classList.remove("active");
  unlockBodyScroll();
}

window.openBotChainModal = openBotChainModal;
window.closeBotChainModal = closeBotChainModal;
window.openSmartContractModal = openSmartContractModal;
window.closeSmartContractModal = closeSmartContractModal;
window.openAiSecurityModal = openAiSecurityModal;
window.closeAiSecurityModal = closeAiSecurityModal;

/* -------------------------------------------------------------
   Initialize all dependencies on DOM load securely
   ------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  try {
    if (typeof lucide !== "undefined") {
      lucide.createIcons();
    }
  } catch (err) {
    console.error("Lucide icon generation failed.", err);
  }
  initializeEventListeners();
});
