const MiniGameSystem = {
  active: false,
  lastShownAt: 0,
  cooldownMs: 2 * 60 * 1000,
  baseChance: 0.08,
  sessionBonusChance: 0.25,
  animationFrameId: null,
  lastFrameAt: 0,
  cycleMs: 1500,
  pointerPos: 0,
  currentPosition: 0,
  pointerDirection: 1,
  result: null,
  rewardResult: null,
  gamePhase: "idle",
  activeGameType: "tapTiming",
  lastGameType: null,
  games: ["tapTiming", "cardFlip", "safeCracker", "laserCut"],
  cardFlipDeck: [],
  cardFlipFlippedIds: [],
  cardFlipLocked: false,
  safeCrackerFrameId: null,
  safeCrackerAngle: 0,
  safeCrackerSpeedDegPerMs: 0,
  safeCrackerDirection: 1,
  safeCrackerZones: [],
  safeCrackerResolved: false,
  laserCutFrameId: null,
  laserCutPos: 0,
  laserCutDirection: 1,
  laserCutSpeedPerMs: 0,
  laserCutTargetCenter: 50,
  laserCutTargetWidth: 14,
  laserCutResolved: false,
  _miniGameSessionGrantCount: 0,
  _miniGameSessionsCompletedSnapshot: null,
  triggerEveryNSurfs: 15,

  syncMiniGameEconomyFromSettings() {
    if (typeof normalizeMiniGameSettings === "function") normalizeMiniGameSettings();
    const s = RTXState.miniGameSettings || {};
    const cooldownMin = Math.max(0, Number(s.cooldownMinutes) || 0);
    this.cooldownMs = cooldownMin * 60 * 1000;
    this.baseChance = Math.max(0, Math.min(1, (Number(s.triggerBaseChance) || 0) / 100));
    this.sessionBonusChance = Math.max(0, Math.min(1, (Number(s.triggerSessionChance) || 0) / 100));
    this.triggerEveryNSurfs = Math.max(0, Math.floor(Number(s.triggerEveryNSurfs) || 0));
  },

  getMiniGameRewardConfig() {
    if (typeof normalizeMiniGameSettings === "function") normalizeMiniGameSettings();
    return RTXState.miniGameSettings || {};
  },

  formatMiniBoostBadgeLabel() {
    const s = this.getMiniGameRewardConfig();
    const mult = Math.max(1, Number(s.miniBoostMultiplier) || 1);
    const pct = Math.max(0, Math.round((mult - 1) * 100));
    const mins = Math.max(1, Math.floor(Number(s.miniBoostMinutes) || 10));
    return `+${pct}% activity boost (${mins}m)`;
  },

  syncMiniGameSessionGrantCounter() {
    const sc = Math.max(0, Math.floor(Number(RTXState.user.sessionsCompleted) || 0));
    if (this._miniGameSessionsCompletedSnapshot !== sc) {
      this._miniGameSessionGrantCount = 0;
      this._miniGameSessionsCompletedSnapshot = sc;
    }
  },

  getMiniGameProfitSafeguardsResolved() {
    if (typeof normalizeMiniGameProfitSafeguards === "function") normalizeMiniGameProfitSafeguards();
    return RTXState.miniGameProfitSafeguards || {};
  },

  estimateGrantCreditsEquiv(creditsDelta, coinDelta, boostApplied) {
    const sg = this.getMiniGameProfitSafeguardsResolved();
    const c = Math.max(0, Math.floor(Number(creditsDelta) || 0));
    const co = Math.max(0, Math.floor(Number(coinDelta) || 0));
    const coinEq = Math.max(0, Number(sg.coinCreditsEquiv) || 0);
    const boostEq = boostApplied ? Math.max(0, Number(sg.boostApplyCreditsEquiv) || 0) : 0;
    return c + co * coinEq + boostEq;
  },

  getEffectiveCoinDropPercents(outcomeKey, perfectPct, goodPct) {
    const sg = this.getMiniGameProfitSafeguardsResolved();
    const perfect = Math.max(0, Math.min(100, Number(perfectPct) || 0));
    let good = Math.max(0, Math.min(100, Number(goodPct) || 0));
    const throttleAfter = Math.max(0, Math.floor(Number(sg.softThrottleAfterGrants) || 0));
    const delta = Math.max(0, Number(sg.softThrottleCoinGoodDelta) || 0);
    if (
      throttleAfter > 0 &&
      this._miniGameSessionGrantCount >= throttleAfter &&
      (outcomeKey === "good" || outcomeKey === "hit")
    ) {
      good = Math.max(0, good - delta);
    }
    return { perfectPct: perfect, goodPct: good };
  },

  /**
   * Applies credits / coin / boost with per-game and daily caps (credits equivalent).
   * Returns a rewardResult-shaped object (without audit — caller merges audit).
   */
  executeMiniGameGrant(plan) {
    if (typeof normalizeMiniGameUserRewardLedger === "function") normalizeMiniGameUserRewardLedger();
    this.syncMiniGameSessionGrantCounter();
    const sg = this.getMiniGameProfitSafeguardsResolved();
    const perGameCap = Math.max(1, Number(sg.maxCreditsEquivPerMiniGame) || 80);
    const dailyCap =
      typeof getMiniGameDailyRewardCapCreditsEquiv === "function" ? getMiniGameDailyRewardCapCreditsEquiv() : 1e12;
    const ledger = RTXState.user.miniGameDailyRewardLedger || { date: "", creditsEquiv: 0 };
    const usedToday = Math.max(0, Number(ledger.creditsEquiv) || 0);
    const remainingDaily = Math.max(0, dailyCap - usedToday);
    const maxEquiv = Math.max(0, Math.min(perGameCap, remainingDaily));

    let credits = Math.max(0, Math.floor(Number(plan.creditsDelta) || 0));
    let coins = Math.max(0, Math.floor(Number(plan.coinDelta) || 0));
    let boost = Boolean(plan.boostRequested);
    let eq = this.estimateGrantCreditsEquiv(credits, coins, boost);

    while (eq > maxEquiv && eq > 0) {
      if (boost) {
        boost = false;
      } else if (coins > 0) {
        coins -= 1;
      } else if (credits > 0) {
        credits -= 1;
      } else {
        break;
      }
      eq = this.estimateGrantCreditsEquiv(credits, coins, boost);
    }

    if (eq === 0 && ((plan.creditsDelta || 0) > 0 || (plan.coinDelta || 0) > 0 || plan.boostRequested)) {
      return {
        label: "Hit registered—no bonus this round.",
        tone: "info",
        creditsDelta: 0,
        boostApplied: false,
        coinDelta: 0
      };
    }

    if (credits > 0) {
      this.addCredits(credits);
      this.highlightCreditsCounter();
      this.showCreditsFlyup(credits);
    }
    if (coins > 0) {
      RTXState.user.premiumRevCoins = Math.max(0, Number(RTXState.user.premiumRevCoins) || 0) + coins;
      this.showRewardFlyup(`+${coins} Premium RevCoin${coins > 1 ? "s" : ""}`, "coin");
    }
    if (boost) {
      const boostDidApply = this.activateMiniBoostSafely();
      if (boostDidApply) {
        const s = this.getMiniGameRewardConfig();
        const pct = Math.max(0, Math.round((Number(s.miniBoostMultiplier) - 1) * 100));
        this.showRewardFlyup(`+${pct}% boost`, "boost");
      }
      boost = boostDidApply;
    }

    const grantedEq = this.estimateGrantCreditsEquiv(credits, coins, boost);
    if (grantedEq > 0) {
      this._miniGameSessionGrantCount += 1;
      RTXState.user.miniGameDailyRewardLedger = RTXState.user.miniGameDailyRewardLedger || { date: "", creditsEquiv: 0 };
      RTXState.user.miniGameDailyRewardLedger.creditsEquiv =
        Math.max(0, Number(RTXState.user.miniGameDailyRewardLedger.creditsEquiv) || 0) + grantedEq;
    }

    if (credits > 0 || coins > 0 || boost || grantedEq > 0) {
      if (typeof RTXUserPersist !== "undefined" && RTXUserPersist.save) {
        RTXUserPersist.save();
      }
    }

    let label = plan.label;
    let tone = plan.tone;
    if (plan.kind === "credits" && credits !== Number(plan.creditsDelta) && credits > 0) {
      label = `You earned +${credits} traffic credits!`;
    }

    return {
      label,
      tone,
      creditsDelta: credits,
      coinDelta: coins,
      boostApplied: boost
    };
  },

  hasBlockingOverlay() {
    return Boolean(
      document.querySelector(".modal-overlay, .loyalty-info-overlay, .surf-anti-cheat-popup:not(.hidden), .loading-overlay")
    );
  },

  maybeTrigger(sessionJustCompleted = false, viewsTodayAfterClaim = null) {
    this.syncMiniGameEconomyFromSettings();
    if (this.active) return;
    if (this.hasBlockingOverlay()) return;
    const viewsRaw =
      viewsTodayAfterClaim != null
        ? viewsTodayAfterClaim
        : Math.max(0, Math.floor(Number(RTXState.user && RTXState.user.viewsToday) || 0));
    const viewsToday = Math.max(0, Math.floor(Number(viewsRaw) || 0));
    const everyN = this.triggerEveryNSurfs;
    const milestoneHit = everyN > 0 && viewsToday > 0 && viewsToday % everyN === 0;
    if (!milestoneHit) {
      const now = Date.now();
      if (now - this.lastShownAt < this.cooldownMs) return;
      const chance = sessionJustCompleted ? this.sessionBonusChance : this.baseChance;
      if (Math.random() >= chance) return;
    }
    this.showMiniGame();
  },

  pickNextGameType() {
    const allGames = Array.isArray(this.games) && this.games.length ? [...this.games] : ["tapTiming"];
    if (allGames.length === 1) return allGames[0];
    const pool = this.lastGameType ? allGames.filter((g) => g !== this.lastGameType) : allGames;
    const candidates = pool.length ? pool : allGames;
    const idx = Math.floor(Math.random() * candidates.length);
    return candidates[idx];
  },

  showMiniGame() {
    if (this.active) return;
    if (typeof window.MiniGameUI === "undefined" || !window.MiniGameUI) return;
    this.syncMiniGameEconomyFromSettings();
    this.active = true;
    this.lastShownAt = Date.now();
    this.result = null;
    this.rewardResult = null;
    this.gamePhase = "ready";
    this.activeGameType = this.pickNextGameType();
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

    if (this.activeGameType === "cardFlip") {
      this.initCardFlipGame();
      this.renderCardFlipGame();
      return;
    }
    if (this.activeGameType === "safeCracker") {
      this.initSafeCrackerGame();
      this.renderSafeCrackerGame();
      return;
    }
    if (this.activeGameType === "laserCut") {
      this.initLaserCutGame();
      this.renderLaserCutGame();
      return;
    }
    this.renderTapTimingGame();
  },

  closeMiniGame() {
    this.stopAnimationLoop();
    this.cleanupSafeCrackerGame();
    this.cleanupLaserCutGame();
    this.result = null;
    this.rewardResult = null;
    this.gamePhase = "idle";
    this.pointerPos = 0;
    this.currentPosition = 0;
    this.pointerDirection = 1;
    this.lastFrameAt = 0;
    this.activeGameType = "tapTiming";
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
    if (typeof window.MiniGameUI !== "undefined" && window.MiniGameUI) {
      window.MiniGameUI.close();
    }
    this.active = false;
  },

  renderTapTimingGame() {
    const showBar = this.gamePhase === "ready" || this.gamePhase === "playing";
    const barHTML = showBar
      ? `
      <div class="mg-target-zone">Stop inside the center zone.</div>
      <div class="mg-timing-wrap">
        <div class="mg-bar-track mg-timing-track">
          <div class="mg-target-zone-marker"></div>
          <div class="mg-timing-indicator"></div>
        </div>
      </div>
    `
      : "";

    const resultsPanel =
      this.gamePhase === "result" && this.result
        ? `
      <div class="mg-results-panel" role="status" aria-live="polite">
        <div class="mg-results-heading">Results</div>
        <div class="mg-results-row">
          <span class="mg-results-label">Timing</span>
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
            <div>Credits: ${this.rewardResult.audit.before.credits} → ${this.rewardResult.audit.after.credits}</div>
            <div>Premium RevCoins: ${this.rewardResult.audit.before.coins} → ${this.rewardResult.audit.after.coins}</div>
            <div>Activity Boost: +${this.rewardResult.audit.before.boostPercent}% → +${this.rewardResult.audit.after.boostPercent}%</div>
          </div>`
              : ""
          }
        </div>`
            : ""
        }
      </div>
    `
        : "";

    const contentHTML = `${barHTML}${resultsPanel}`;
    const footerHTML =
      this.gamePhase === "playing"
        ? `<button type="button" class="mg-button-primary" id="mg-stop-btn">STOP</button>`
        : this.gamePhase === "ready"
          ? `
            <button type="button" class="mg-button-primary" id="mg-start-btn">Start</button>
            <button type="button" class="mg-button-secondary" id="mg-close-btn">Close</button>
          `
          : `<button type="button" class="mg-button-secondary" id="mg-close-btn">Close</button>`;

    window.MiniGameUI.render({
      title: "Tap Timing Challenge",
      contentHTML,
      footerHTML,
      closeOnBackdropClick: false,
      onClose: () => {
        this.stopAnimationLoop();
        this.active = false;
        this.gamePhase = "idle";
      }
    });

    if (this.gamePhase === "playing") {
      const stopBtn = document.getElementById("mg-stop-btn");
      if (stopBtn) {
        stopBtn.addEventListener("pointerdown", (event) => {
          event.preventDefault();
          this.stopTapTiming();
        });
      }
    } else if (this.gamePhase === "ready") {
      const startBtn = document.getElementById("mg-start-btn");
      if (startBtn) startBtn.onclick = () => this.startTapTiming();
      const closeBtn = document.getElementById("mg-close-btn");
      if (closeBtn) closeBtn.onclick = () => this.closeMiniGame();
      this.updateIndicatorPosition();
    } else {
      const closeBtn = document.getElementById("mg-close-btn");
      if (closeBtn) closeBtn.onclick = () => this.closeMiniGame();
      this.updateIndicatorPosition();
    }
    this.triggerResultFx();
  },

  initCardFlipGame() {
    const cards = [
      { id: "rx_1", symbol: "RX", sublabel: "Perfect", tier: "perfect" },
      { id: "rx_2", symbol: "RX", sublabel: "Perfect", tier: "perfect" },
      { id: "tx_1", symbol: "TX", sublabel: "Good", tier: "good" },
      { id: "tx_2", symbol: "TX", sublabel: "Good", tier: "good" }
    ];
    for (let i = cards.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = cards[i];
      cards[i] = cards[j];
      cards[j] = t;
    }
    this.cardFlipDeck = cards;
    this.cardFlipFlippedIds = [];
    this.cardFlipLocked = false;
  },

  initSafeCrackerGame() {
    const zoneCount = Math.random() < 0.45 ? 2 : 1;
    const zones = [];
    for (let i = 0; i < zoneCount; i += 1) {
      let center = Math.random() * 360;
      let attempts = 0;
      while (attempts < 24 && zones.some((z) => this.getAngleDelta(center, z.center) < 72)) {
        center = Math.random() * 360;
        attempts += 1;
      }
      zones.push({ center });
    }
    this.safeCrackerZones = zones;
    this.safeCrackerAngle = Math.random() * 360;
    this.safeCrackerSpeedDegPerMs = 0.12 + Math.random() * 0.1;
    this.safeCrackerDirection = Math.random() < 0.5 ? 1 : -1;
    this.safeCrackerResolved = false;
    this.lastFrameAt = 0;
    this.gamePhase = "ready";
    this.result = null;
    this.rewardResult = null;
  },

  renderSafeCrackerGame() {
    const isResult = this.gamePhase === "result" && this.result;
    const zonesMarkup = this.safeCrackerZones
      .map((zone) => `<div class="mg-safe-zone" style="--zone-angle:${zone.center}deg"></div>`)
      .join("");
    const dialClass = this.gamePhase === "playing" ? "is-playing" : "";

    const resultsPanel = isResult
      ? `
      <div class="mg-results-panel" role="status" aria-live="polite">
        <div class="mg-results-heading">Results</div>
        <div class="mg-results-row">
          <span class="mg-results-label">Lock Result</span>
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
            <div>Credits: ${this.rewardResult.audit.before.credits} → ${this.rewardResult.audit.after.credits}</div>
            <div>Premium RevCoins: ${this.rewardResult.audit.before.coins} → ${this.rewardResult.audit.after.coins}</div>
            <div>Activity Boost: +${this.rewardResult.audit.before.boostPercent}% → +${this.rewardResult.audit.after.boostPercent}%</div>
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
      <div class="mg-target-zone">Press LOCK when the needle hits a highlighted zone.</div>
      <div class="mg-safe-wrap">
        <div class="mg-safe-dial ${dialClass}">
          ${zonesMarkup}
          <div class="mg-safe-center-cap"></div>
          <div class="mg-safe-needle-wrap" style="transform: rotate(${this.safeCrackerAngle}deg);">
            <div class="mg-safe-needle"></div>
          </div>
        </div>
      </div>
      ${resultsPanel}
    `;

    const footerHTML = isResult
      ? `<button type="button" class="mg-button-secondary" id="mg-close-btn">Close</button>`
      : this.gamePhase === "ready"
        ? `<button type="button" class="mg-button-primary" id="mg-start-btn">Start</button>`
        : `<button type="button" class="mg-button-primary" id="mg-lock-btn">LOCK</button>`;

    window.MiniGameUI.render({
      title: "Safe Cracker",
      contentHTML,
      footerHTML,
      closeOnBackdropClick: false,
      onClose: () => {
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
          this.startSafeCrackerGame();
        });
      }
      return;
    }

    const lockBtn = document.getElementById("mg-lock-btn");
    if (lockBtn) {
      lockBtn.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        this.resolveSafeCrackerGame();
      });
    }
  },

  startSafeCrackerGame() {
    if (!this.active || this.activeGameType !== "safeCracker" || this.gamePhase !== "ready") return;
    this.gamePhase = "playing";
    this.result = null;
    this.rewardResult = null;
    this.safeCrackerResolved = false;
    this.lastFrameAt = 0;
    this.renderSafeCrackerGame();
    this.startSafeCrackerLoop();
  },

  startSafeCrackerLoop() {
    this.cleanupSafeCrackerGame();
    const tick = (ts) => {
      if (!this.active || this.activeGameType !== "safeCracker" || this.gamePhase !== "playing") return;
      if (!this.lastFrameAt) this.lastFrameAt = ts;
      const deltaMs = Math.max(0, ts - this.lastFrameAt);
      this.lastFrameAt = ts;
      this.safeCrackerAngle = (this.safeCrackerAngle + deltaMs * this.safeCrackerSpeedDegPerMs * this.safeCrackerDirection + 360) % 360;
      const needleWrap = document.querySelector(".mg-safe-needle-wrap");
      if (needleWrap) needleWrap.style.transform = `rotate(${this.safeCrackerAngle}deg)`;
      this.safeCrackerFrameId = requestAnimationFrame(tick);
    };
    this.safeCrackerFrameId = requestAnimationFrame(tick);
  },

  resolveSafeCrackerGame() {
    if (!this.active || this.activeGameType !== "safeCracker" || this.gamePhase !== "playing" || this.safeCrackerResolved) return;
    this.safeCrackerResolved = true;
    this.cleanupSafeCrackerGame();
    const nearestDelta = this.getSafeCrackerNearestDelta();
    const isPerfect = nearestDelta <= 8;
    const isGood = !isPerfect && nearestDelta <= 20;
    const isHit = isPerfect || isGood;

    this.result = isPerfect
      ? { key: "perfect", label: "Perfect lock!", tone: "success" }
      : isGood
        ? { key: "good", label: "Good lock!", tone: "info" }
        : { key: "miss", label: "Miss!", tone: "fail" };
    this.rewardResult = this.applyRewardForHitOrMiss(isHit, isPerfect ? "perfect" : isGood ? "good" : "miss");
    RTXUserPersist.save();
    this.gamePhase = "result";
    this.renderSafeCrackerGame();
  },

  cleanupSafeCrackerGame() {
    if (this.safeCrackerFrameId) {
      cancelAnimationFrame(this.safeCrackerFrameId);
      this.safeCrackerFrameId = null;
    }
    this.lastFrameAt = 0;
  },

  getAngleDelta(a, b) {
    const first = ((a % 360) + 360) % 360;
    const second = ((b % 360) + 360) % 360;
    const diff = Math.abs(first - second);
    return Math.min(diff, 360 - diff);
  },

  getSafeCrackerNearestDelta() {
    if (!Array.isArray(this.safeCrackerZones) || this.safeCrackerZones.length === 0) return 180;
    return this.safeCrackerZones.reduce((best, zone) => {
      const delta = this.getAngleDelta(this.safeCrackerAngle, zone.center);
      return Math.min(best, delta);
    }, 180);
  },

  initLaserCutGame() {
    this.laserCutPos = 0;
    this.laserCutDirection = 1;
    this.laserCutSpeedPerMs = 0.065 + Math.random() * 0.04;
    this.laserCutTargetCenter = 18 + Math.random() * 64;
    this.laserCutTargetWidth = Math.random() < 0.45 ? 18 : 14;
    this.laserCutResolved = false;
    this.lastFrameAt = 0;
    this.gamePhase = "ready";
    this.result = null;
    this.rewardResult = null;
  },

  renderLaserCutGame() {
    const isResult = this.gamePhase === "result" && this.result;
    const targetLeft = Math.max(0, this.laserCutTargetCenter - this.laserCutTargetWidth * 0.5);
    const lineStyle = `left:${this.laserCutPos}%;`;

    const resultsPanel = isResult
      ? `
      <div class="mg-results-panel ${this.result.key === "perfect" ? "mg-laser-cut-flash" : ""}" role="status" aria-live="polite">
        <div class="mg-results-heading">Results</div>
        <div class="mg-results-row">
          <span class="mg-results-label">Cut Accuracy</span>
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
            <div>Credits: ${this.rewardResult.audit.before.credits} → ${this.rewardResult.audit.after.credits}</div>
            <div>Premium RevCoins: ${this.rewardResult.audit.before.coins} → ${this.rewardResult.audit.after.coins}</div>
            <div>Activity Boost: +${this.rewardResult.audit.before.boostPercent}% → +${this.rewardResult.audit.after.boostPercent}%</div>
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
      <div class="mg-target-zone">Time the CUT inside the highlighted zone.</div>
      <div class="mg-laser-stage">
        <div class="mg-laser-shape">
          <div class="mg-laser-target-zone" style="left:${targetLeft}%; width:${this.laserCutTargetWidth}%;"></div>
          <div class="mg-laser-line" style="${lineStyle}"></div>
        </div>
      </div>
      ${resultsPanel}
    `;

    const footerHTML = isResult
      ? `<button type="button" class="mg-button-secondary" id="mg-close-btn">Close</button>`
      : this.gamePhase === "ready"
        ? `<button type="button" class="mg-button-primary" id="mg-start-btn">Start</button>`
        : `<button type="button" class="mg-button-primary" id="mg-cut-btn">CUT</button>`;

    window.MiniGameUI.render({
      title: "Laser Cut",
      contentHTML,
      footerHTML,
      closeOnBackdropClick: false,
      onClose: () => {
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
          this.startLaserCutGame();
        });
      }
      return;
    }

    const cutBtn = document.getElementById("mg-cut-btn");
    if (cutBtn) {
      cutBtn.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        this.resolveLaserCutGame();
      });
    }
  },

  startLaserCutGame() {
    if (!this.active || this.activeGameType !== "laserCut" || this.gamePhase !== "ready") return;
    this.gamePhase = "playing";
    this.result = null;
    this.rewardResult = null;
    this.laserCutResolved = false;
    this.lastFrameAt = 0;
    this.renderLaserCutGame();
    this.startLaserCutLoop();
  },

  startLaserCutLoop() {
    this.cleanupLaserCutGame();
    const tick = (ts) => {
      if (!this.active || this.activeGameType !== "laserCut" || this.gamePhase !== "playing") return;
      if (!this.lastFrameAt) this.lastFrameAt = ts;
      const deltaMs = Math.max(0, ts - this.lastFrameAt);
      this.lastFrameAt = ts;

      this.laserCutPos += deltaMs * this.laserCutSpeedPerMs * this.laserCutDirection;
      if (this.laserCutPos >= 100) {
        this.laserCutPos = 100;
        this.laserCutDirection = -1;
      } else if (this.laserCutPos <= 0) {
        this.laserCutPos = 0;
        this.laserCutDirection = 1;
      }

      const lineNode = document.querySelector(".mg-laser-line");
      if (lineNode) lineNode.style.left = `${this.laserCutPos}%`;
      this.laserCutFrameId = requestAnimationFrame(tick);
    };
    this.laserCutFrameId = requestAnimationFrame(tick);
  },

  resolveLaserCutGame() {
    if (!this.active || this.activeGameType !== "laserCut" || this.gamePhase !== "playing" || this.laserCutResolved) return;
    this.laserCutResolved = true;
    this.cleanupLaserCutGame();
    const delta = Math.abs(this.laserCutPos - this.laserCutTargetCenter);
    const perfectThreshold = Math.max(4.5, this.laserCutTargetWidth * 0.2);
    const goodThreshold = Math.max(10, this.laserCutTargetWidth * 0.65);
    const isPerfect = delta <= perfectThreshold;
    const isGood = !isPerfect && delta <= goodThreshold;
    const isHit = isPerfect || isGood;

    this.result = isPerfect
      ? { key: "perfect", label: "Perfect cut!", tone: "success" }
      : isGood
        ? { key: "good", label: "Good cut!", tone: "info" }
        : { key: "miss", label: "Miss!", tone: "fail" };
    this.rewardResult = this.applyRewardForHitOrMiss(isHit, isPerfect ? "perfect" : isGood ? "good" : "miss");
    RTXUserPersist.save();
    this.gamePhase = "result";
    this.renderLaserCutGame();
  },

  cleanupLaserCutGame() {
    if (this.laserCutFrameId) {
      cancelAnimationFrame(this.laserCutFrameId);
      this.laserCutFrameId = null;
    }
    this.lastFrameAt = 0;
  },

  renderCardFlipGame() {
    const isResult = this.gamePhase === "result" && this.result;
    const resultsPanel = isResult
      ? `
      <div class="mg-results-panel" role="status" aria-live="polite">
        <div class="mg-results-heading">Results</div>
        <div class="mg-results-row">
          <span class="mg-results-label">Match</span>
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
            <div>Credits: ${this.rewardResult.audit.before.credits} → ${this.rewardResult.audit.after.credits}</div>
            <div>Premium RevCoins: ${this.rewardResult.audit.before.coins} → ${this.rewardResult.audit.after.coins}</div>
            <div>Activity Boost: +${this.rewardResult.audit.before.boostPercent}% → +${this.rewardResult.audit.after.boostPercent}%</div>
          </div>`
              : ""
          }
        </div>`
            : ""
        }
      </div>`
      : "";

    const cardsHtml = this.cardFlipDeck
      .map((card) => {
        const isFlipped = this.cardFlipFlippedIds.includes(card.id);
        const isMatched = isResult && this.result.key !== "miss" && isFlipped;
        const missClass = isResult && this.result.key === "miss" ? "mg-card-miss" : "";
        const matchClass = isMatched ? "mg-card-match" : "";
        const tierClass = card.tier === "perfect" ? "mg-card-tier-rx" : "mg-card-tier-tx";
        return `
          <button
            type="button"
            class="mg-flip-card ${tierClass} ${isFlipped ? "is-flipped" : ""} ${matchClass} ${missClass}"
            data-card-id="${card.id}"
            ${this.cardFlipLocked || isResult ? "disabled" : ""}
          >
            <span class="mg-card-face mg-card-back">?</span>
            <span class="mg-card-face mg-card-front">
              <span class="mg-card-face-main">${card.symbol}</span>
              <span class="mg-card-face-sub">${card.sublabel || ""}</span>
            </span>
          </button>
        `;
      })
      .join("");

    const contentHTML = `
      <div class="mg-target-zone">Flip 2 cards and find a match.</div>
      <div class="mg-card-grid">${cardsHtml}</div>
      ${resultsPanel}
    `;
    const footerHTML = isResult
      ? `<button type="button" class="mg-button-secondary" id="mg-close-btn">Close</button>`
      : `<button type="button" class="mg-button-secondary" id="mg-close-btn">Close</button>`;

    window.MiniGameUI.render({
      title: "Card Flip Match",
      contentHTML,
      footerHTML,
      closeOnBackdropClick: false,
      onClose: () => {
        this.stopAnimationLoop();
        this.active = false;
        this.gamePhase = "idle";
      }
    });

    const closeBtn = document.getElementById("mg-close-btn");
    if (closeBtn) closeBtn.onclick = () => this.closeMiniGame();

    if (!isResult) {
      const cardNodes = document.querySelectorAll(".mg-flip-card[data-card-id]");
      cardNodes.forEach((node) => {
        node.addEventListener("pointerdown", (event) => {
          event.preventDefault();
          const cardId = node.getAttribute("data-card-id");
          if (cardId) this.flipCard(cardId);
        });
      });
    }
    this.triggerResultFx();
  },

  triggerResultFx() {
    if (this.gamePhase !== "result" || !this.result) return;
    const panel = document.querySelector(".mg-results-panel");
    if (!panel) return;
    panel.classList.remove("mg-result-fx-perfect", "mg-result-fx-good", "mg-result-fx-hit", "mg-result-fx-miss");
    void panel.offsetWidth;
    panel.classList.add(`mg-result-fx-${this.result.key}`);
  },

  flipCard(cardId) {
    if (this.cardFlipLocked || this.gamePhase === "result") return;
    if (this.cardFlipFlippedIds.includes(cardId)) return;
    this.cardFlipFlippedIds = [...this.cardFlipFlippedIds, cardId].slice(0, 2);
    this.renderCardFlipGame();

    if (this.cardFlipFlippedIds.length < 2) return;
    this.cardFlipLocked = true;
    // Short suspense delay so players can visually process the second flip.
    setTimeout(() => {
      if (!this.active || this.activeGameType !== "cardFlip" || this.gamePhase === "result") return;
      const [aId, bId] = this.cardFlipFlippedIds;
      const a = this.cardFlipDeck.find((c) => c.id === aId);
      const b = this.cardFlipDeck.find((c) => c.id === bId);
      const matched = a && b && a.symbol === b.symbol;

      if (matched) {
        this.result =
          a.tier === "perfect"
            ? { key: "perfect", label: "Perfect match!", tone: "success" }
            : { key: "good", label: "Good match!", tone: "info" };
        this.rewardResult = this.applyRewardForHitOrMiss(true, this.result.key);
      } else {
        this.result = { key: "miss", label: "Miss!", tone: "fail" };
        this.rewardResult = this.applyRewardForHitOrMiss(false, "miss");
      }

      RTXUserPersist.save();
      this.gamePhase = "result";
      this.renderCardFlipGame();
    }, 360);
  },

  startTapTiming() {
    if (!this.active || this.gamePhase !== "ready") return;
    if (this.activeGameType !== "tapTiming") return;
    this.gamePhase = "playing";
    this.result = null;
    this.rewardResult = null;
    this.pointerPos = 0;
    this.currentPosition = 0;
    this.pointerDirection = 1;
    this.lastFrameAt = 0;
    this.renderTapTimingGame();
    requestAnimationFrame(() => {
      if (!this.active || this.gamePhase !== "playing") return;
      this.startAnimationLoop();
    });
  },

  startAnimationLoop() {
    this.stopAnimationLoop();
    const tick = (ts) => {
      if (!this.active || this.gamePhase !== "playing") return;
      if (!this.lastFrameAt) this.lastFrameAt = ts;
      const deltaMs = Math.max(0, ts - this.lastFrameAt);
      this.lastFrameAt = ts;
      const speedPerMs = 1 / this.cycleMs; // cross bar in cycleMs
      this.pointerPos += deltaMs * speedPerMs * this.pointerDirection;
      if (this.pointerPos >= 1) {
        this.pointerPos = 1;
        this.pointerDirection = -1;
      } else if (this.pointerPos <= 0) {
        this.pointerPos = 0;
        this.pointerDirection = 1;
      }
      this.currentPosition = this.pointerPos;
      this.updateIndicatorPosition();
      this.animationFrameId = requestAnimationFrame(tick);
    };
    this.animationFrameId = requestAnimationFrame(tick);
  },

  stopAnimationLoop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  },

  updateIndicatorPosition() {
    const indicator = document.querySelector(".mg-timing-indicator");
    if (!indicator) return;
    const pct = Math.max(0, Math.min(1, this.pointerPos)) * 100;
    indicator.style.left = `${pct}%`;
  },

  randomInt(min, max) {
    const low = Math.ceil(Number(min) || 0);
    const high = Math.floor(Number(max) || low);
    if (high <= low) return low;
    return Math.floor(Math.random() * (high - low + 1)) + low;
  },

  getRewardAuditSnapshot() {
    const credits = Math.max(0, Number(RTXState.user.credits) || 0);
    const coins = Math.max(0, Number(RTXState.user.premiumRevCoins) || 0);
    const boostMultiplier = typeof getActivityBoostMultiplier === "function" ? getActivityBoostMultiplier() : 1;
    const boostPercent = Math.max(0, Math.round((boostMultiplier - 1) * 100));
    return { credits, coins, boostPercent };
  },

  addCredits(amount) {
    const value = Math.max(0, Number(amount) || 0);
    if (!value) return;
    if (typeof CreditSystem !== "undefined" && CreditSystem && typeof CreditSystem.addCredits === "function") {
      CreditSystem.addCredits(value);
      return;
    }
    RTXState.user.credits = Math.max(0, Number(RTXState.user.credits) || 0) + value;
    if (typeof recordMemberCreditEarnings === "function") {
      recordMemberCreditEarnings(value);
    }
  },

  highlightCreditsCounter() {
    const node = document.getElementById("surf-credits-pill");
    if (!node) return;
    node.classList.remove("surf-cmd-pill-win");
    // Force restart of CSS animation when rewards happen repeatedly.
    // eslint-disable-next-line no-unused-expressions
    node.offsetHeight;
    node.classList.add("surf-cmd-pill-win");
    setTimeout(() => {
      node.classList.remove("surf-cmd-pill-win");
    }, 1200);
  },

  showCreditsFlyup(amount) {
    const value = Math.max(0, Number(amount) || 0);
    if (!value) return;
    this.showRewardFlyup(`+${value} credits`, "credits");
  },

  showRewardFlyup(text, tone) {
    const label = String(text || "").trim();
    if (!label) return;
    const anchor = document.getElementById("surf-credits-pill");
    const fallback = document.querySelector(".mg-results-panel");
    const target = anchor || fallback;
    if (!target) return;
    const rect = target.getBoundingClientRect();
    if (!rect || (!rect.width && !rect.height)) return;

    const bubble = document.createElement("div");
    if (tone === "credits") {
      bubble.className = "surf-credits-flyup";
    } else {
      const toneClass = tone === "coin" ? "coin" : tone === "boost" ? "boost" : "coin";
      bubble.className = `surf-reward-flyup ${toneClass}`;
    }
    bubble.textContent = label;
    bubble.style.left = `${rect.left + rect.width * 0.5}px`;
    bubble.style.top = `${rect.top + rect.height * 0.45}px`;
    document.body.appendChild(bubble);

    requestAnimationFrame(() => {
      bubble.classList.add("show");
    });

    setTimeout(() => {
      if (bubble && bubble.parentNode) bubble.parentNode.removeChild(bubble);
    }, 1150);
  },

  activateMiniBoostSafely() {
    if (typeof normalizeMiniGameProfitSafeguards === "function") normalizeMiniGameProfitSafeguards();
    const safeguards = RTXState.miniGameProfitSafeguards || {};
    const cap = Math.max(1, Number(safeguards.maxStackedBoostMultiplier) || 1.35);

    const s = this.getMiniGameRewardConfig();
    const mult = Math.min(Math.max(1, Number(s.miniBoostMultiplier) || 1.1), cap);
    const boostMinutes = Math.max(1, Math.floor(Number(s.miniBoostMinutes) || 10));
    const now = Date.now();
    const newExpiresAt = now + boostMinutes * 60 * 1000;
    const existing = RTXState.user.activeBoost || {};
    const existingType = existing.type === "activity" ? "activity" : null;
    const existingMultiplier = Math.max(1, Number(existing.multiplier) || 1);
    const existingExpiresAt = Math.max(0, Number(existing.expiresAt) || 0);
    const existingIsActive = existingType === "activity" && existingExpiresAt > now;

    if (existingIsActive && existingMultiplier > cap) {
      return false;
    }

    const mergedMult = Math.min(Math.max(existingIsActive ? existingMultiplier : 1, mult), cap);

    if (existingIsActive && mergedMult === existingMultiplier && newExpiresAt <= existingExpiresAt) {
      return false;
    }

    const expiresOut =
      existingIsActive && mergedMult === existingMultiplier ? Math.max(newExpiresAt, existingExpiresAt) : newExpiresAt;

    RTXState.user.activeBoost = {
      type: "activity",
      multiplier: mergedMult,
      expiresAt: expiresOut
    };
    return true;
  },

  buildRollCreditsBoostPoolPlan() {
    const s = this.getMiniGameRewardConfig();
    const lo = Math.max(1, Math.floor(Number(s.creditMin) || 2));
    const hi = Math.max(lo, Math.floor(Number(s.creditMax) || 5));
    const rewardRoll = Math.random();
    if (rewardRoll < 0.57) {
      const amount = this.randomInt(lo, hi);
      return {
        kind: "credits",
        creditsDelta: amount,
        coinDelta: 0,
        boostRequested: false,
        label: `You earned +${amount} traffic credits!`,
        tone: "success"
      };
    }
    if (rewardRoll < 0.85) {
      return {
        kind: "boost",
        creditsDelta: 0,
        coinDelta: 0,
        boostRequested: true,
        label: "Mini activity boost activated!",
        tone: "info"
      };
    }
    const amount = this.randomInt(lo, Math.min(hi, lo + 2));
    return {
      kind: "combo",
      creditsDelta: amount,
      coinDelta: 0,
      boostRequested: true,
      label: "",
      tone: "success"
    };
  },

  rollCreditsBoostPool() {
    const built = this.buildRollCreditsBoostPoolPlan();
    const out = this.executeMiniGameGrant(built);
    if (built.kind === "boost" && !out.boostApplied) {
      return { ...out, label: "Existing boost is already stronger/longer.", tone: "info" };
    }
    if (built.kind === "combo") {
      if (out.boostApplied && out.creditsDelta > 0) {
        return { ...out, label: `+${out.creditsDelta} credits + mini boost unlocked!`, tone: "success" };
      }
      if (!out.boostApplied && out.creditsDelta > 0) {
        return { ...out, label: `+${out.creditsDelta} credits earned (existing boost kept).`, tone: "success" };
      }
    }
    return out;
  },

  /** Hit = in center target (45%–55%, matches bar marker). Miss = no rewards. */
  applyRewardForHitOrMiss(isHit, outcomeKey = "hit") {
    const before = this.getRewardAuditSnapshot();
    if (!isHit) {
      return {
        label: "No reward on a miss.",
        tone: "info",
        creditsDelta: 0,
        boostApplied: false,
        coinDelta: 0,
        audit: { before, after: this.getRewardAuditSnapshot() }
      };
    }
    const s = this.getMiniGameRewardConfig();
    const noRewardPct = Math.max(0, Math.min(100, Number(s.noRewardPercent) || 0));
    if (Math.random() * 100 < noRewardPct) {
      return {
        label: "Hit registered—no bonus this round.",
        tone: "info",
        creditsDelta: 0,
        boostApplied: false,
        coinDelta: 0,
        audit: { before, after: this.getRewardAuditSnapshot() }
      };
    }
    const tier = outcomeKey === "perfect" ? "perfect" : "good";
    const eff = this.getEffectiveCoinDropPercents(
      outcomeKey,
      Math.max(0, Math.min(100, Number(s.coinDropPerfectPercent) || 0)),
      Math.max(0, Math.min(100, Number(s.coinDropGoodPercent) || 0))
    );
    const coinPct = tier === "perfect" ? eff.perfectPct : eff.goodPct;
    if (Math.random() * 100 < coinPct) {
      const granted = this.executeMiniGameGrant({
        kind: "coin",
        creditsDelta: 0,
        coinDelta: 1,
        boostRequested: false,
        label: "You won 1 Premium RevCoin!",
        tone: "success"
      });
      return {
        ...granted,
        audit: { before, after: this.getRewardAuditSnapshot() }
      };
    }
    const reward = this.rollCreditsBoostPool();
    return { ...reward, audit: { before, after: this.getRewardAuditSnapshot() } };
  },

  stopTapTiming() {
    if (!this.active || this.gamePhase !== "playing") return;
    // Cancel immediately before reading position to avoid overshoot lag.
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    const pos = Math.max(0, Math.min(1, this.currentPosition));
    const hitStart = 0.45;
    const hitEnd = 0.55;
    const isHit = pos >= hitStart && pos <= hitEnd;

    this.result = isHit
      ? { key: "hit", label: "Hit!", tone: "success" }
      : { key: "miss", label: "Miss!", tone: "fail" };
    this.rewardResult = this.applyRewardForHitOrMiss(isHit, isHit ? "hit" : "miss");
    RTXUserPersist.save();

    this.gamePhase = "result";
    // Defer re-render so the pointer/click from STOP does not land on the overlay
    // after the button is removed (which was closing the modal instantly).
    setTimeout(() => {
      if (!this.active || this.gamePhase !== "result") return;
      this.renderTapTimingGame();
    }, 0);
  }
};

window.MiniGameSystem = MiniGameSystem;
