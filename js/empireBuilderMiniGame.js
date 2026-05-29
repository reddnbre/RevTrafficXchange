(function () {
  if (!window.MiniGameSystem) return;

  const system = window.MiniGameSystem;
  const gameType = "empireBuilder";
  const modules = [
    { key: "serverRack", label: "Server Rack", icon: "SR", perk: "Traffic routing capacity" },
    { key: "trafficAntenna", label: "Traffic Antenna", icon: "TA", perk: "Surf signal reach" },
    { key: "powerCore", label: "Power Core", icon: "PC", perk: "Boost stability" },
    { key: "adBeacon", label: "Ad Beacon", icon: "AB", perk: "Ad slot visibility" },
    { key: "rewardVault", label: "Reward Vault", icon: "RV", perk: "Reward storage" }
  ];
  const maxLevel = 5;
  const partsPerLevel = 4;

  if (!Array.isArray(system.games)) system.games = [];
  if (!system.games.includes(gameType)) system.games.push(gameType);

  system.empireBuilderFrameId = null;
  system.empireBuilderScannerPos = 0;
  system.empireBuilderDirection = 1;
  system.empireBuilderSpeedPerMs = 0.00082;
  system.empireBuilderTargetIndex = 0;
  system.empireBuilderResolved = false;

  system.normalizeEmpireBuilderProgress = function normalizeEmpireBuilderProgress() {
    const raw = RTXState.user.empireBuilder && typeof RTXState.user.empireBuilder === "object" ? RTXState.user.empireBuilder : {};
    const rawModules = raw.modules && typeof raw.modules === "object" ? raw.modules : {};
    const normalizedModules = {};

    modules.forEach((mod) => {
      const current = rawModules[mod.key] && typeof rawModules[mod.key] === "object" ? rawModules[mod.key] : {};
      normalizedModules[mod.key] = {
        level: Math.max(0, Math.min(maxLevel, Math.floor(Number(current.level) || 0))),
        parts: Math.max(0, Math.min(partsPerLevel - 1, Math.floor(Number(current.parts) || 0)))
      };
    });

    RTXState.user.empireBuilder = {
      totalParts: Math.max(0, Math.floor(Number(raw.totalParts) || 0)),
      modules: normalizedModules,
      lastUpgradeAt: Math.max(0, Number(raw.lastUpgradeAt) || 0)
    };
    return RTXState.user.empireBuilder;
  };

  system.pickEmpireBuilderModuleIndex = function pickEmpireBuilderModuleIndex(progress) {
    const p = progress || this.normalizeEmpireBuilderProgress();
    const incomplete = modules
      .map((mod, index) => ({ mod, index, state: p.modules[mod.key] }))
      .filter((row) => row.state.level < maxLevel);
    if (!incomplete.length) return Math.floor(Math.random() * modules.length);
    incomplete.sort((a, b) => a.state.level - b.state.level || a.state.parts - b.state.parts);
    return incomplete[0].index;
  };

  system.applyEmpireParts = function applyEmpireParts(amount) {
    const progress = this.normalizeEmpireBuilderProgress();
    const target = modules[this.empireBuilderTargetIndex] || modules[0];
    const state = progress.modules[target.key];
    let partsToApply = Math.max(0, Math.floor(Number(amount) || 0));
    let upgrades = 0;

    progress.totalParts += partsToApply;
    while (partsToApply > 0 && state.level < maxLevel) {
      state.parts += 1;
      partsToApply -= 1;
      if (state.parts >= partsPerLevel) {
        state.parts = 0;
        state.level += 1;
        upgrades += 1;
        progress.lastUpgradeAt = Date.now();
      }
    }

    RTXState.user.empireBuilder = progress;
    return { target, state, upgrades };
  };

  system.initEmpireBuilderGame = function initEmpireBuilderGame() {
    const progress = this.normalizeEmpireBuilderProgress();
    this.empireBuilderTargetIndex = this.pickEmpireBuilderModuleIndex(progress);
    this.empireBuilderScannerPos = Math.random() * 0.28;
    this.empireBuilderDirection = Math.random() < 0.5 ? 1 : -1;
    this.empireBuilderSpeedPerMs = 0.00068 + Math.random() * 0.00034;
    this.empireBuilderResolved = false;
    this.lastFrameAt = 0;
    this.gamePhase = "ready";
    this.result = null;
    this.rewardResult = null;
  };

  system.renderEmpireBuilderGame = function renderEmpireBuilderGame() {
    const progress = this.normalizeEmpireBuilderProgress();
    const targetIndex = Math.max(0, Math.min(modules.length - 1, this.empireBuilderTargetIndex));
    const targetModule = modules[targetIndex];
    const targetState = progress.modules[targetModule.key];
    const targetStart = targetIndex / modules.length;
    const targetEnd = (targetIndex + 1) / modules.length;
    const targetLeftPct = targetStart * 100;
    const targetWidthPct = (targetEnd - targetStart) * 100;
    const isResult = this.gamePhase === "result" && this.result;
    const totalLevels = modules.reduce((sum, mod) => sum + progress.modules[mod.key].level, 0);
    const empirePct = Math.round((totalLevels / (modules.length * maxLevel)) * 100);

    const moduleCards = modules
      .map((mod, index) => {
        const state = progress.modules[mod.key];
        const isTarget = index === targetIndex && !isResult;
        const fillPct = state.level >= maxLevel ? 100 : Math.round((state.parts / partsPerLevel) * 100);
        return `
          <div class="mg-empire-module ${isTarget ? "is-target" : ""} ${state.level >= maxLevel ? "is-maxed" : ""}">
            <span class="mg-empire-module-icon">${mod.icon}</span>
            <span class="mg-empire-module-name">${mod.label}</span>
            <span class="mg-empire-module-level">Lv ${state.level}</span>
            <span class="mg-empire-module-parts"><i style="width:${fillPct}%"></i></span>
          </div>
        `;
      })
      .join("");

    const resultsPanel = isResult
      ? `
      <div class="mg-results-panel" role="status" aria-live="polite">
        <div class="mg-results-heading">Results</div>
        <div class="mg-results-row">
          <span class="mg-results-label">Build Result</span>
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
      <div class="mg-target-zone">Sync the builder beam with the highlighted module.</div>
      <div class="mg-empire-summary">
        <span>Empire Buildout</span>
        <span>${empirePct}% complete</span>
      </div>
      <div class="mg-empire-meter"><span style="width:${empirePct}%"></span></div>
      <div class="mg-empire-grid">${moduleCards}</div>
      <div class="mg-empire-focus">
        <span>Target: ${targetModule.label}</span>
        <span>${targetModule.perk}</span>
      </div>
      <div class="mg-empire-track">
        <span class="mg-empire-target-window" style="left:${targetLeftPct}%;width:${targetWidthPct}%"></span>
        <span class="mg-empire-scanner" style="left:${Math.max(0, Math.min(1, this.empireBuilderScannerPos)) * 100}%"></span>
      </div>
      ${resultsPanel}
    `;

    const footerHTML = isResult
      ? `<button type="button" class="mg-button-secondary" id="mg-close-btn">Close</button>`
      : this.gamePhase === "ready"
        ? `<button type="button" class="mg-button-primary" id="mg-start-btn">Start Build</button>`
        : `<button type="button" class="mg-button-primary" id="mg-build-btn">BUILD</button>`;

    window.MiniGameUI.render({
      title: "Empire Builder",
      contentHTML,
      footerHTML,
      closeOnBackdropClick: false,
      onClose: () => {
        this.cleanupEmpireBuilderGame();
        this.cleanupSignalTowerGame && this.cleanupSignalTowerGame();
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
          this.startEmpireBuilderGame();
        });
      }
      return;
    }

    const buildBtn = document.getElementById("mg-build-btn");
    if (buildBtn) {
      buildBtn.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        this.resolveEmpireBuilderGame();
      });
    }
  };

  system.startEmpireBuilderGame = function startEmpireBuilderGame() {
    if (!this.active || this.activeGameType !== gameType || this.gamePhase !== "ready") return;
    this.gamePhase = "playing";
    this.result = null;
    this.rewardResult = null;
    this.empireBuilderResolved = false;
    this.lastFrameAt = 0;
    this.renderEmpireBuilderGame();
    this.startEmpireBuilderLoop();
  };

  system.startEmpireBuilderLoop = function startEmpireBuilderLoop() {
    this.cleanupEmpireBuilderGame();
    const tick = (ts) => {
      if (!this.active || this.activeGameType !== gameType || this.gamePhase !== "playing") return;
      if (!this.lastFrameAt) this.lastFrameAt = ts;
      const deltaMs = Math.max(0, ts - this.lastFrameAt);
      this.lastFrameAt = ts;

      this.empireBuilderScannerPos += deltaMs * this.empireBuilderSpeedPerMs * this.empireBuilderDirection;
      if (this.empireBuilderScannerPos >= 1) {
        this.empireBuilderScannerPos = 1;
        this.empireBuilderDirection = -1;
      } else if (this.empireBuilderScannerPos <= 0) {
        this.empireBuilderScannerPos = 0;
        this.empireBuilderDirection = 1;
      }

      const scanner = document.querySelector(".mg-empire-scanner");
      if (scanner) scanner.style.left = `${this.empireBuilderScannerPos * 100}%`;
      this.empireBuilderFrameId = requestAnimationFrame(tick);
    };
    this.empireBuilderFrameId = requestAnimationFrame(tick);
  };

  system.resolveEmpireBuilderGame = function resolveEmpireBuilderGame() {
    if (!this.active || this.activeGameType !== gameType || this.gamePhase !== "playing" || this.empireBuilderResolved) return;
    this.empireBuilderResolved = true;
    this.cleanupEmpireBuilderGame();

    const targetIndex = Math.max(0, Math.min(modules.length - 1, this.empireBuilderTargetIndex));
    const targetCenter = (targetIndex + 0.5) / modules.length;
    const delta = Math.abs(this.empireBuilderScannerPos - targetCenter);
    const isPerfect = delta <= 0.035;
    const isGood = !isPerfect && delta <= 0.095;
    const isHit = isPerfect || isGood;
    let buildResult = null;

    if (isHit) {
      buildResult = this.applyEmpireParts(isPerfect ? 2 : 1);
    }

    this.result = isPerfect
      ? { key: "perfect", label: buildResult && buildResult.upgrades ? `Perfect build! ${buildResult.target.label} upgraded.` : `Perfect build! +2 ${buildResult.target.label} parts.`, tone: "success" }
      : isGood
        ? { key: "good", label: buildResult && buildResult.upgrades ? `${buildResult.target.label} upgraded.` : `${buildResult.target.label} part installed.`, tone: "info" }
        : { key: "miss", label: "Build sync failed. No part installed.", tone: "fail" };

    this.rewardResult = this.applyRewardForHitOrMiss(isHit, isPerfect ? "perfect" : isGood ? "good" : "miss");
    RTXUserPersist.save();
    this.gamePhase = "result";
    this.renderEmpireBuilderGame();
  };

  system.cleanupEmpireBuilderGame = function cleanupEmpireBuilderGame() {
    if (this.empireBuilderFrameId) {
      cancelAnimationFrame(this.empireBuilderFrameId);
      this.empireBuilderFrameId = null;
    }
    this.lastFrameAt = 0;
  };

  const originalCloseMiniGame = system.closeMiniGame;
  system.closeMiniGame = function closeMiniGameWithEmpireBuilderCleanup() {
    if (typeof this.cleanupEmpireBuilderGame === "function") this.cleanupEmpireBuilderGame();
    originalCloseMiniGame.apply(this, arguments);
  };

  const originalShowMiniGame = system.showMiniGame;
  system.showMiniGame = function showMiniGameWithEmpireBuilder() {
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
    this.initEmpireBuilderGame();
    this.renderEmpireBuilderGame();
  };
})();
