(function () {
  if (!window.MiniGameSystem) return;

  const system = window.MiniGameSystem;
  const gameType = "signalTower";
  const regions = ["Metro Grid", "Desert Relay", "Harbor Node", "Mountain Link", "Empire Core"];
  const towersPerRegion = 5;

  if (!Array.isArray(system.games)) system.games = [];
  if (!system.games.includes(gameType)) system.games.push(gameType);

  system.signalTowerFrameId = null;
  system.signalTowerPulsePos = 0;
  system.signalTowerDirection = 1;
  system.signalTowerSpeedPerMs = 0.00075;
  system.signalTowerTargetIndex = 0;
  system.signalTowerResolved = false;

  system.normalizeSignalTowersProgress = function normalizeSignalTowersProgress() {
    const raw = RTXState.user.signalTowers && typeof RTXState.user.signalTowers === "object" ? RTXState.user.signalTowers : {};
    const completedRegions = Math.max(0, Math.floor(Number(raw.completedRegions) || 0));
    const restoredInRegion = Math.max(0, Math.min(towersPerRegion, Math.floor(Number(raw.restoredInRegion) || 0)));
    const totalRestored = Math.max(completedRegions * towersPerRegion + restoredInRegion, Math.floor(Number(raw.totalRestored) || 0));
    RTXState.user.signalTowers = {
      completedRegions,
      restoredInRegion,
      totalRestored,
      lastRegionChestAt: Math.max(0, Number(raw.lastRegionChestAt) || 0)
    };
    return RTXState.user.signalTowers;
  };

  system.getSignalTowersRegionName = function getSignalTowersRegionName(progress) {
    const p = progress || this.normalizeSignalTowersProgress();
    return regions[p.completedRegions % regions.length];
  };

  system.initSignalTowerGame = function initSignalTowerGame() {
    const progress = this.normalizeSignalTowersProgress();
    this.signalTowerTargetIndex = Math.min(towersPerRegion - 1, progress.restoredInRegion);
    this.signalTowerPulsePos = Math.random() * 0.34;
    this.signalTowerDirection = Math.random() < 0.5 ? 1 : -1;
    this.signalTowerSpeedPerMs = 0.00062 + Math.random() * 0.00036;
    this.signalTowerResolved = false;
    this.lastFrameAt = 0;
    this.gamePhase = "ready";
    this.result = null;
    this.rewardResult = null;
  };

  system.renderSignalTowerGame = function renderSignalTowerGame() {
    const progress = this.normalizeSignalTowersProgress();
    const targetIndex = Math.min(towersPerRegion - 1, this.signalTowerTargetIndex);
    const targetStart = targetIndex / towersPerRegion;
    const targetEnd = (targetIndex + 1) / towersPerRegion;
    const targetLeftPct = targetStart * 100;
    const targetWidthPct = (targetEnd - targetStart) * 100;
    const isResult = this.gamePhase === "result" && this.result;
    const regionName = this.getSignalTowersRegionName(progress);
    const regionPct = Math.round((progress.restoredInRegion / towersPerRegion) * 100);

    const towerNodes = Array.from({ length: towersPerRegion }, (_, index) => {
      const stateClass =
        index < progress.restoredInRegion
          ? "is-restored"
          : index === targetIndex && !isResult
            ? "is-target"
            : "is-offline";
      const label = index < progress.restoredInRegion ? "ONLINE" : index === targetIndex ? "TARGET" : "OFFLINE";
      return `
        <div class="mg-signal-tower ${stateClass}">
          <span class="mg-signal-tower-beam"></span>
          <span class="mg-signal-tower-core"></span>
          <span class="mg-signal-tower-label">${label}</span>
        </div>
      `;
    }).join("");

    const resultsPanel = isResult
      ? `
      <div class="mg-results-panel" role="status" aria-live="polite">
        <div class="mg-results-heading">Results</div>
        <div class="mg-results-row">
          <span class="mg-results-label">Signal Link</span>
          <span class="mg-result-text ${this.result.tone} mg-result-line">${this.result.label}</span>
        </div>
        ${
          this.rewardResult
            ? `
        <div class="mg-results-row">
          <span class="mg-results-label">Reward</span>
          <span class="mg-result-text ${this.rewardResult.tone} mg-result-line">${this.rewardResult.label}</span>
          <div class="mg-reward-badges">
            ${Number(this.rewardResult.creditsDelta) > 0 ? `<span class="mg-reward-badge credits">+${this.rewardResult.creditsDelta} credits</span>` : ""}
            ${Number(this.rewardResult.coinDelta) > 0 ? `<span class="mg-reward-badge coin">+${this.rewardResult.coinDelta} Premium RevCoin</span>` : ""}
            ${this.rewardResult.boostApplied ? `<span class="mg-reward-badge boost">${this.formatMiniBoostBadgeLabel()}</span>` : ""}
          </div>
          ${
            this.rewardResult.audit
              ? `
          <div class="mg-reward-ticker">
            <div>Credits: ${this.rewardResult.audit.before.credits} -> ${this.rewardResult.audit.after.credits}</div>
            <div>Premium RevCoins: ${this.rewardResult.audit.before.coins} -> ${this.rewardResult.audit.after.coins}</div>
            <div>Activity Boost: +${this.rewardResult.audit.before.boostPercent}% -> +${this.rewardResult.audit.after.boostPercent}%</div>
          </div>`
              : ""
          }
        </div>`
            : ""
        }
      </div>
      `
      : "";

    const contentHTML = `
      <div class="mg-target-zone">Charge the next tower when the pulse crosses its signal window.</div>
      <div class="mg-signal-status-row">
        <span>${regionName}</span>
        <span>${progress.restoredInRegion} / ${towersPerRegion} towers online</span>
      </div>
      <div class="mg-signal-region-meter" aria-label="Region progress">
        <span style="width:${regionPct}%"></span>
      </div>
      <div class="mg-signal-map">
        ${towerNodes}
      </div>
      <div class="mg-signal-track">
        <span class="mg-signal-target-window" style="left:${targetLeftPct}%;width:${targetWidthPct}%"></span>
        <span class="mg-signal-pulse" style="left:${Math.max(0, Math.min(1, this.signalTowerPulsePos)) * 100}%"></span>
      </div>
      ${resultsPanel}
    `;

    const footerHTML = isResult
      ? `<button type="button" class="mg-button-secondary" id="mg-close-btn">Close</button>`
      : this.gamePhase === "ready"
        ? `<button type="button" class="mg-button-primary" id="mg-start-btn">Start Link</button>`
        : `<button type="button" class="mg-button-primary" id="mg-charge-btn">CHARGE</button>`;

    window.MiniGameUI.render({
      title: "Signal Towers",
      contentHTML,
      footerHTML,
      closeOnBackdropClick: false,
      onClose: () => {
        this.cleanupSignalTowerGame();
        this.cleanupLaserCutGame();
        this.cleanupSafeCrackerGame();
        this.stopAnimationLoop();
        this.active = false;
        this.gamePhase = "idle";
      }
    });

    if (isResult) {
      const closeBtn = document.getElementById("mg-close-btn");
      if (closeBtn) closeBtn.onclick = () => this.closeMiniGame();
      this.triggerResultFx();
      return;
    }

    if (this.gamePhase === "ready") {
      const startBtn = document.getElementById("mg-start-btn");
      if (startBtn) {
        startBtn.addEventListener("pointerdown", (event) => {
          event.preventDefault();
          this.startSignalTowerGame();
        });
      }
      return;
    }

    const chargeBtn = document.getElementById("mg-charge-btn");
    if (chargeBtn) {
      chargeBtn.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        this.resolveSignalTowerGame();
      });
    }
  };

  system.startSignalTowerGame = function startSignalTowerGame() {
    if (!this.active || this.activeGameType !== gameType || this.gamePhase !== "ready") return;
    this.gamePhase = "playing";
    this.result = null;
    this.rewardResult = null;
    this.signalTowerResolved = false;
    this.lastFrameAt = 0;
    this.renderSignalTowerGame();
    this.startSignalTowerLoop();
  };

  system.startSignalTowerLoop = function startSignalTowerLoop() {
    this.cleanupSignalTowerGame();
    const tick = (ts) => {
      if (!this.active || this.activeGameType !== gameType || this.gamePhase !== "playing") return;
      if (!this.lastFrameAt) this.lastFrameAt = ts;
      const deltaMs = Math.max(0, ts - this.lastFrameAt);
      this.lastFrameAt = ts;

      this.signalTowerPulsePos += deltaMs * this.signalTowerSpeedPerMs * this.signalTowerDirection;
      if (this.signalTowerPulsePos >= 1) {
        this.signalTowerPulsePos = 1;
        this.signalTowerDirection = -1;
      } else if (this.signalTowerPulsePos <= 0) {
        this.signalTowerPulsePos = 0;
        this.signalTowerDirection = 1;
      }

      const pulse = document.querySelector(".mg-signal-pulse");
      if (pulse) pulse.style.left = `${this.signalTowerPulsePos * 100}%`;
      this.signalTowerFrameId = requestAnimationFrame(tick);
    };
    this.signalTowerFrameId = requestAnimationFrame(tick);
  };

  system.resolveSignalTowerGame = function resolveSignalTowerGame() {
    if (!this.active || this.activeGameType !== gameType || this.gamePhase !== "playing" || this.signalTowerResolved) return;
    this.signalTowerResolved = true;
    this.cleanupSignalTowerGame();

    const targetIndex = Math.min(towersPerRegion - 1, this.signalTowerTargetIndex);
    const targetCenter = (targetIndex + 0.5) / towersPerRegion;
    const delta = Math.abs(this.signalTowerPulsePos - targetCenter);
    const isPerfect = delta <= 0.035;
    const isGood = !isPerfect && delta <= 0.085;
    const isHit = isPerfect || isGood;
    let regionCompleted = false;

    if (isHit) {
      const progress = this.normalizeSignalTowersProgress();
      progress.restoredInRegion = Math.min(towersPerRegion, progress.restoredInRegion + (isPerfect ? 2 : 1));
      progress.totalRestored = Math.max(progress.totalRestored, progress.completedRegions * towersPerRegion + progress.restoredInRegion);
      if (progress.restoredInRegion >= towersPerRegion) {
        progress.completedRegions += 1;
        progress.restoredInRegion = 0;
        progress.lastRegionChestAt = Date.now();
        regionCompleted = true;
      }
      RTXState.user.signalTowers = progress;
    }

    this.result = isPerfect
      ? { key: "perfect", label: regionCompleted ? "Perfect link! Region chest unlocked." : "Perfect link! Two towers restored.", tone: "success" }
      : isGood
        ? { key: "good", label: regionCompleted ? "Tower online! Region chest unlocked." : "Tower online! Signal restored.", tone: "info" }
        : { key: "miss", label: "Signal drifted. Tower remains offline.", tone: "fail" };

    this.rewardResult = this.applyRewardForHitOrMiss(isHit, isPerfect ? "perfect" : isGood ? "good" : "miss");
    if (regionCompleted && this.rewardResult && this.rewardResult.creditsDelta > 0) {
      this.rewardResult.label = `${this.rewardResult.label} Region clear bonus banked.`;
    }
    RTXUserPersist.save();
    this.gamePhase = "result";
    this.renderSignalTowerGame();
  };

  system.cleanupSignalTowerGame = function cleanupSignalTowerGame() {
    if (this.signalTowerFrameId) {
      cancelAnimationFrame(this.signalTowerFrameId);
      this.signalTowerFrameId = null;
    }
    this.lastFrameAt = 0;
  };

  const originalCloseMiniGame = system.closeMiniGame;
  system.closeMiniGame = function closeMiniGameWithSignalTowerCleanup() {
    if (typeof this.cleanupSignalTowerGame === "function") this.cleanupSignalTowerGame();
    originalCloseMiniGame.apply(this, arguments);
  };

  const originalShowMiniGame = system.showMiniGame;
  system.showMiniGame = function showMiniGameWithSignalTower() {
    if (this.active) return;
    if (typeof window.MiniGameUI === "undefined" || !window.MiniGameUI) return;
    this.syncMiniGameEconomyFromSettings();
    const chosenGameType = this.pickNextGameType();

    if (chosenGameType !== gameType) {
      const originalPicker = this.pickNextGameType;
      this.pickNextGameType = () => chosenGameType;
      try {
        originalShowMiniGame.apply(this, arguments);
      } finally {
        this.pickNextGameType = originalPicker;
      }
      return;
    }

    this.active = true;
    this.lastShownAt = Date.now();
    this.result = null;
    this.rewardResult = null;
    this.gamePhase = "ready";
    this.activeGameType = gameType;
    this.lastGameType = this.activeGameType;
    this.pointerPos = 0;
    this.currentPosition = 0;
    this.pointerDirection = 1;
    this.cycleMs = 1200 + Math.floor(Math.random() * 601);
    this.lastFrameAt = 0;
    this.cardFlipDeck = [];
    this.cardFlipFlippedIds = [];
    this.cardFlipLocked = false;
    this.safeCrackerAngle = 0;
    this.safeCrackerSpeedDegPerMs = 0;
    this.safeCrackerDirection = 1;
    this.safeCrackerZones = [];
    this.safeCrackerResolved = false;
    this.laserCutPos = 0;
    this.laserCutDirection = 1;
    this.laserCutSpeedPerMs = 0;
    this.laserCutTargetCenter = 50;
    this.laserCutTargetWidth = 14;
    this.laserCutResolved = false;
    this.initSignalTowerGame();
    this.renderSignalTowerGame();
  };
})();
