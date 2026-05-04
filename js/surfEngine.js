const SurfEngine = {
  timer: null,
  secondsLeft: RTXState.settings.adTimerSeconds,
  isRunning: false,
  antiCheatInitialized: false,
  campaignQueue: [],
  lastCampaignOwnerId: null,
  progressReminderTimer: null,
  pendingStartLoadTimeout: null,

  refreshCampaignQueue() {
    if (typeof checkTrafficBoostExpiry === "function") checkTrafficBoostExpiry();
    this.campaignQueue = getSurfCampaignQueue();
    const len = this.campaignQueue.length;
    if (!len) {
      RTXState.activeCampaignIndex = 0;
      return;
    }
    RTXState.activeCampaignIndex = (((RTXState.activeCampaignIndex || 0) % len) + len) % len;
  },

  updateTimerDisplay() {
    const timerNodes = document.querySelectorAll(".surf-timer");
    timerNodes.forEach((node) => {
      node.textContent = `${this.secondsLeft}s`;
    });
  },

  updateAntiCheatStatusDisplay() {
    const statusNode = document.getElementById("surf-anti-cheat-status");
    if (!statusNode) return;
    const message = RTXState.antiCheat.statusMessage || "";
    statusNode.textContent = message;
    statusNode.classList.toggle("hidden", !message);
  },

  setAntiCheatStatus(message) {
    RTXState.antiCheat.statusMessage = message;
    this.updateAntiCheatStatusDisplay();
  },

  updateAntiCheatPopupDisplay() {
    const anti = RTXState.antiCheat;
    const popupNode = document.getElementById("surf-anti-cheat-popup");
    const textNode = document.getElementById("surf-anti-cheat-popup-text");
    if (!popupNode || !textNode) return;
    textNode.textContent = anti.popupMessage || "";
    popupNode.classList.toggle("hidden", !anti.popupVisible);
  },

  showAntiCheatPopup(message) {
    const anti = RTXState.antiCheat;
    anti.popupMessage = message;
    anti.popupVisible = true;
    this.updateAntiCheatPopupDisplay();
  },

  dismissAntiCheatPopup() {
    const anti = RTXState.antiCheat;
    anti.popupVisible = false;
    this.updateAntiCheatPopupDisplay();
  },

  clearSurfTimer() {
    clearInterval(this.timer);
    this.timer = null;
    if (this.pendingStartLoadTimeout) {
      clearTimeout(this.pendingStartLoadTimeout);
      this.pendingStartLoadTimeout = null;
    }
    this.isRunning = false;
  },

  /** View timer length (seconds) — industry TEs commonly use ~8s visible exposure (e.g. Rotate5url-style surf). */
  getMembershipSurfSeconds() {
    return 8;
  },

  buildSurfPrimaryActionHtml() {
    const u = RTXState.user;
    const anti = RTXState.antiCheat;
    const sessionLocked = RTXState.sessionCompleted || RTXState.surfPaused;
    const canClaim = !this.isRunning && this.secondsLeft <= 0;
    const claimMultiplier = Math.max(1, Number(u.multiplier) || 1);
    const creditsPerView =
      typeof CreditSystem !== "undefined" &&
      CreditSystem &&
      typeof CreditSystem.getCreditsForValidView === "function"
        ? CreditSystem.getCreditsForValidView()
        : Math.round((Number(RTXState.settings.baseCreditsPerView) || 1) * claimMultiplier);

    if (sessionLocked) {
      return `<button class="btn btn-primary surf-claim-btn" onclick="SurfEngine.startNextSession()">Start Next Session</button>`;
    }
    if (this.isRunning) {
      return `<button class="btn btn-primary surf-claim-btn" disabled>Viewing Ad...</button>`;
    }
    if (anti.captchaRequired && !anti.captchaSolved) {
      return `<button class="btn btn-primary surf-claim-btn" disabled>Solve CAPTCHA to Claim</button>`;
    }
    if (canClaim) {
      return `<button class="btn btn-primary surf-claim-btn" onclick="SurfEngine.claimValidView()">Claim View + Next Ad</button>`;
    }
    return `<button class="btn btn-primary surf-claim-btn" onclick="SurfEngine.startTimer()">Start Timer</button>`;
  },

  canPatchSurfDom() {
    const anti = RTXState.antiCheat;
    if (RTXState.currentView !== "surf") return false;
    if (!document.querySelector(".surf-page")) return false;
    if (!document.getElementById("surf-active-frame")) return false;
    if (anti.captchaRequired && !anti.captchaSolved) return false;
    return true;
  },

  /** Update Hyper Mode chrome without `App.render()` so the surf iframe is not recreated. */
  refreshSurfIfLive() {
    if (!this.canPatchSurfDom()) return false;
    this.patchSurfRuntimeUI();
    if (typeof RewardUX !== "undefined" && RewardUX && typeof RewardUX.refreshToast === "function") {
      RewardUX.refreshToast();
    }
    return true;
  },

  _escapeSurfCaptchaText(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  },

  /** Keep CAPTCHA markup in sync when we avoid full `App.render()` (iframe-preserving patches). */
  syncSurfCaptchaRow() {
    if (RTXState.currentView !== "surf") return;
    const anti = RTXState.antiCheat;
    const row = document.querySelector(".surf-anti-cheat-row");
    if (!row) return;
    const existingBox = row.querySelector(".surf-captcha-box");
    const needBox = Boolean(anti.captchaRequired && !anti.captchaSolved);

    if (needBox && !existingBox) {
      row.insertAdjacentHTML(
        "beforeend",
        `<div class="surf-captcha-box">
            <div class="surf-captcha-label">${this._escapeSurfCaptchaText(anti.captchaPrompt)}</div>
            <input id="surf-captcha-answer" class="surf-captcha-input" type="text" inputmode="numeric" placeholder="Answer" autocomplete="off" />
            <button type="button" class="btn btn-primary surf-captcha-btn" onclick="SurfEngine.verifyCaptcha()">Verify</button>
          </div>`
      );
      return;
    }
    if (!needBox && existingBox) {
      existingBox.remove();
      return;
    }
    if (needBox && existingBox) {
      const label = existingBox.querySelector(".surf-captcha-label");
      if (label) label.textContent = anti.captchaPrompt || "";
    }
  },

  patchSurfRuntimeUI() {
    if (!this.canPatchSurfDom()) return false;

    const u = RTXState.user;
    const campaigns = this.getCampaignQueue ? this.getCampaignQueue() : RTXState.sampleCampaigns || [];
    const campaign = this.getCurrentCampaign() || { title: "Campaign Preview", url: "about:blank" };
    const progress = SessionSystem.getSessionProgressPercent();
    const queueLen = Math.max(1, campaigns.length);
    const resolvedIdx = (((RTXState.activeCampaignIndex || 0) % queueLen) + queueLen) % queueLen;
    const currentIndex = resolvedIdx + 1;
    const totalCampaigns = campaigns.length || 1;
    const claimMultiplier = Math.max(1, Number(u.multiplier) || 1);
    const creditsPerView =
      typeof CreditSystem !== "undefined" &&
      CreditSystem &&
      typeof CreditSystem.getCreditsForValidView === "function"
        ? CreditSystem.getCreditsForValidView()
        : Math.round((Number(RTXState.settings.baseCreditsPerView) || 1) * claimMultiplier);
    const activityMultiplier = typeof getActivityBoostMultiplier === "function" ? getActivityBoostMultiplier() : 1;
    const boostPct = Math.max(0, Math.round((activityMultiplier - 1) * 100));
    const boostTimeLeft = typeof getBoostTimeLeftText === "function" ? getBoostTimeLeftText() : "";
    const boostLabel = boostPct > 0 ? `+${boostPct}%${boostTimeLeft ? ` (${boostTimeLeft})` : ""}` : "+0%";

    const actions = document.querySelector(".surf-cmd-actions");
    const btn = actions && actions.querySelector(".surf-claim-btn");
    if (btn) btn.outerHTML = this.buildSurfPrimaryActionHtml();

    const creditsPill = document.getElementById("surf-credits-pill");
    if (creditsPill) {
      creditsPill.textContent = `Credits: ${u.credits}`;
      if (typeof RewardUX !== "undefined" && RewardUX && typeof RewardUX.getSurfCreditsWalletTooltip === "function") {
        creditsPill.setAttribute("title", RewardUX.getSurfCreditsWalletTooltip());
      }
    }

    const multPill = document.getElementById("surf-multiplier-pill");
    if (multPill) {
      multPill.textContent = `Payout Multiplier: x${claimMultiplier.toFixed(1)}`;
      multPill.classList.toggle("surf-cmd-pill-multiplier-on", claimMultiplier > 1);
      multPill.classList.toggle("surf-cmd-pill-multiplier-off", claimMultiplier <= 1);
    }

    const perView = document.getElementById("surf-per-view-pill");
    if (perView) perView.textContent = `Per View: +${creditsPerView}`;

    const actPill = document.getElementById("surf-activity-pill");
    if (actPill) {
      actPill.textContent = `Activity Boost: ${boostLabel}`;
      actPill.classList.toggle("surf-cmd-pill-boost-on", boostPct > 0);
      actPill.classList.toggle("surf-cmd-pill-boost-off", boostPct <= 0);
    }

    const sessionTitle = document.getElementById("surf-session-title");
    if (sessionTitle) {
      sessionTitle.textContent = `Session: ${RTXState.user.sessionViews} / ${RTXState.settings.viewsPerSession}`;
    }

    const progFill = document.getElementById("surf-info-progress-fill");
    if (progFill) progFill.style.width = `${progress}%`;

    const viewsLine = document.getElementById("surf-info-views-line");
    if (viewsLine) viewsLine.textContent = `Views: ${u.viewsToday}`;

    const streakLine = document.getElementById("surf-info-streak-line");
    if (streakLine) streakLine.textContent = `Streak: ${u.streak}`;

    const loyaltyLine = document.getElementById("surf-info-loyalty-line");
    if (loyaltyLine) loyaltyLine.textContent = `Loyalty: ${u.loyaltyScore || 0}`;

    const campLine = document.getElementById("surf-info-campaign-line");
    if (campLine) campLine.textContent = `Campaign ${currentIndex} of ${totalCampaigns}`;

    const campWrap = document.getElementById("surf-info-campaign-wrap");
    if (campWrap) {
      campWrap.title = `${String(campaign.title)} — ${String(campaign.url)}`;
    }

    this.updateTimerDisplay();
    this.updateAntiCheatStatusDisplay();
    this.updateAntiCheatPopupDisplay();
    this.updateProjectedPoolRewardUI();

    const stripRoot = document.getElementById("reward-ux-surf-strip-root");
    if (stripRoot && typeof RewardUX !== "undefined" && RewardUX && typeof RewardUX.renderSurfStrip === "function") {
      const nextStrip = RewardUX.renderSurfStrip();
      if (nextStrip && String(nextStrip).trim()) {
        stripRoot.outerHTML = nextStrip;
      }
    }

    this.syncSurfCaptchaRow();

    return true;
  },

  updateProjectedPoolRewardUI() {
    if (typeof getProjectedDailyPoolReward !== "function") return;
    const p = getProjectedDailyPoolReward();
    const elig = document.getElementById("surf-pool-eligibility");
    const spend = document.getElementById("surf-pool-qualified-spend");
    const est = document.getElementById("surf-pool-estimated-reward");
    const pending = document.getElementById("surf-pool-cap-pending");
    const blocked = document.getElementById("surf-pool-not-eligible");
    if (elig) elig.textContent = p.eligibilityLabel || "—";
    if (spend) spend.textContent = `$${Number(p.qualifiedSpend || 0).toFixed(2)}`;
    if (est) est.textContent = `$${Number(p.projectedDollars || 0).toFixed(2)}`;
    if (pending) pending.classList.toggle("hidden", !p.showCapPendingNote);
    if (blocked) blocked.classList.toggle("hidden", !p.showNotEligibleMessage);
  },

  beginCountdownLoop() {
    this.timer = setInterval(() => {
      this.secondsLeft -= 1;

      // Fallback protection in case visibility events are missed.
      if (!document.hasFocus() && this.isRunning) {
        const anti = RTXState.antiCheat;
        if (!anti.tabWasHidden) {
          anti.tabWasHidden = true;
          anti.invalidationNotified = true;
          const message = "View invalidated: window lost focus during timer.";
          this.setAntiCheatStatus(message);
          this.showAntiCheatPopup(message);
        }
      }

      if (RTXState.currentView === "surf") {
        this.updateTimerDisplay();
      }

      if (this.secondsLeft <= 0) {
        this.stopTimer();
      }
    }, 1000);
  },

  initAntiCheat() {
    if (this.antiCheatInitialized) return;

    const markHiddenDuringRun = () => {
      const anti = RTXState.antiCheat;
      if (this.isRunning && !anti.tabWasHidden) {
        anti.tabWasHidden = true;
        anti.invalidationNotified = true;
        const message = "View invalidated: you switched tabs. Restart timer.";
        this.setAntiCheatStatus(message);
        this.showAntiCheatPopup(message);
      }
    };

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) markHiddenDuringRun();
    });

    document.addEventListener("mousemove", () => {
      const anti = RTXState.antiCheat;
      anti.mouseMoved = true;
      anti.lastMouseMove = Date.now();
    });

    window.addEventListener("blur", markHiddenDuringRun);
    window.addEventListener("pagehide", markHiddenDuringRun);

    this.antiCheatInitialized = true;
  },

  randomCaptchaThreshold() {
    const anti = RTXState.antiCheat;
    const min = anti.captchaEveryMin;
    const max = anti.captchaEveryMax;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  generateCaptchaChallenge() {
    const anti = RTXState.antiCheat;
    const a = Math.floor(Math.random() * 9) + 1;
    const b = Math.floor(Math.random() * 9) + 1;
    const mode = Math.random() < 0.5 ? "add" : "sub";

    if (mode === "sub") {
      const hi = Math.max(a, b);
      const lo = Math.min(a, b);
      anti.captchaPrompt = `What is ${hi} - ${lo}?`;
      anti.captchaAnswer = hi - lo;
      return;
    }

    anti.captchaPrompt = `What is ${a} + ${b}?`;
    anti.captchaAnswer = a + b;
  },

  resetAntiCheatForView() {
    const anti = RTXState.antiCheat;
    anti.tabWasHidden = false;
    anti.mouseMoved = false;
    anti.lastMouseMove = Date.now();
    anti.invalidationNotified = false;
    anti.popupVisible = false;
    this.setAntiCheatStatus("Stay on this tab while the timer runs.");
    this.updateAntiCheatPopupDisplay();
  },

  validateView() {
    const anti = RTXState.antiCheat;

    if (this.isRunning || this.secondsLeft > 0) {
      const message = "View not ready: timer still running.";
      this.setAntiCheatStatus(message);
      this.showAntiCheatPopup(message);
      return { valid: false, restartTimer: false };
    }

    if (anti.tabWasHidden) {
      const message = "View invalidated: tab switched during timer. Restart timer.";
      this.setAntiCheatStatus(message);
      if (!anti.invalidationNotified) {
        anti.invalidationNotified = true;
        this.showAntiCheatPopup(message);
      }
      return { valid: false, restartTimer: true };
    }

    if (anti.captchaRequired && !anti.captchaSolved) {
      const message = "Claim blocked: solve CAPTCHA to continue.";
      this.setAntiCheatStatus(message);
      this.showAntiCheatPopup(message);
      return { valid: false, restartTimer: false };
    }

    this.setAntiCheatStatus("");
    return { valid: true, restartTimer: false };
  },

  verifyCaptcha() {
    const anti = RTXState.antiCheat;
    let input = document.getElementById("surf-captcha-answer");
    if (!input) {
      if (anti.captchaRequired && !anti.captchaSolved) {
        this.syncSurfCaptchaRow();
        input = document.getElementById("surf-captcha-answer");
      }
    }
    if (!input) {
      if (typeof App !== "undefined" && App && typeof App.render === "function") {
        App.render();
      }
      return;
    }

    const raw = String(input.value || "").trim();
    if (raw === "") {
      const message = "Enter your answer, then tap Verify.";
      this.setAntiCheatStatus(message);
      this.showAntiCheatPopup(message);
      return;
    }

    const answer = Number(raw);
    const expected = Number(anti.captchaAnswer);
    const ok = Number.isFinite(answer) && Number.isFinite(expected) && answer === expected;

    if (ok) {
      anti.captchaSolved = true;
      anti.captchaRequired = false;
      this.setAntiCheatStatus("");
      this.dismissAntiCheatPopup();
      if (!this.refreshSurfIfLive()) {
        if (typeof App !== "undefined" && App && typeof App.render === "function") {
          App.render();
        }
      }
    } else {
      anti.captchaSolved = false;
      const message = "Incorrect CAPTCHA answer. Try again.";
      this.setAntiCheatStatus(message);
      this.showAntiCheatPopup(message);
    }
  },

  startTimer() {
    if (this.isRunning) return;
    if (RTXState.sessionCompleted || RTXState.surfPaused) return;

    this.initAntiCheat();
    this.resetAntiCheatForView();
    this.clearSurfTimer();
    RTXState.sessionActive = true;
    this.secondsLeft = this.getMembershipSurfSeconds();
    this.isRunning = true;
    this.setAntiCheatStatus("Loading page before timer starts...");

    if (this.canPatchSurfDom()) {
      this.patchSurfRuntimeUI();
    } else {
      App.render();
    }

    requestAnimationFrame(() => {
      if (!this.isRunning) return;
      const iframe = document.getElementById("surf-active-frame");
      if (!iframe) {
        this.setAntiCheatStatus("Stay on this tab while the timer runs.");
        this.beginCountdownLoop();
        return;
      }

      let started = false;
      const startNow = () => {
        if (started || !this.isRunning) return;
        started = true;
        iframe.removeEventListener("load", startNow);
        if (this.pendingStartLoadTimeout) {
          clearTimeout(this.pendingStartLoadTimeout);
          this.pendingStartLoadTimeout = null;
        }
        this.setAntiCheatStatus("Stay on this tab while the timer runs.");
        this.beginCountdownLoop();
      };

      const campaign = this.getCurrentCampaign();
      const nextSrc = campaign && campaign.url ? String(campaign.url).trim() : "about:blank";
      const curAttr = iframe.getAttribute("src") || "";
      const sameUrl = curAttr === nextSrc;

      if (sameUrl) {
        this.pendingStartLoadTimeout = setTimeout(startNow, 0);
        return;
      }

      iframe.addEventListener("load", startNow, { once: true });
      iframe.setAttribute("src", nextSrc);
      this.pendingStartLoadTimeout = setTimeout(startNow, 5000);
    });
  },

  stopTimer() {
    this.clearSurfTimer();
    if (this.canPatchSurfDom()) {
      this.patchSurfRuntimeUI();
    } else {
      App.render();
    }
  },

  showProgressReminder() {
    const existing = document.getElementById("surf-progress-reminder");
    if (existing) existing.remove();

    checkDailyReset();
    const daily = RTXState.user.dailyActivity || {};
    const loyalty = getLoyaltyTierInfo(RTXState.user.loyaltyScore);
    const reminder = document.createElement("div");
    reminder.id = "surf-progress-reminder";
    reminder.className = "surf-progress-reminder";
    reminder.innerHTML = `
      <button type="button" class="surf-progress-reminder-close" aria-label="Close reminder" onclick="SurfEngine.dismissProgressReminder()">×</button>
      <div class="surf-progress-reminder-title">Today’s Progress</div>
      <div class="surf-progress-reminder-line">Daily Reward Tier: ${daily.rewardTier || "Not Qualified"}</div>
      <div class="surf-progress-reminder-line">Activity Score: ${Math.max(0, Number(daily.activityScore) || 0)}</div>
      <div class="surf-progress-reminder-line">Sessions: ${Math.max(0, Number(daily.sessions) || 0)}</div>
      <div class="surf-progress-reminder-line">Loyalty Tier: ${loyalty.tier}</div>
      <div class="surf-progress-reminder-note">Stay active today to improve your reward potential.</div>
    `;
    document.body.appendChild(reminder);
    requestAnimationFrame(() => {
      reminder.classList.add("visible");
    });
  },

  dismissProgressReminder() {
    const node = document.getElementById("surf-progress-reminder");
    if (!node) return;
    node.classList.add("fade-out");
    setTimeout(() => {
      const current = document.getElementById("surf-progress-reminder");
      if (current) current.remove();
    }, 220);
  },

  triggerMiniGameMaybe(sessionJustCompleted = false) {
    const viewsToday = Math.max(0, Math.floor(Number(RTXState.user && RTXState.user.viewsToday) || 0));
    if (typeof window !== "undefined" && window.MiniGameSystem && typeof window.MiniGameSystem.maybeTrigger === "function") {
      window.MiniGameSystem.maybeTrigger(sessionJustCompleted, viewsToday);
    }
  },

  startNextSession() {
    RTXState.user.sessionViews = 0;
    RTXState.sessionCompleted = false;
    RTXState.surfPaused = false;
    RTXState.sessionActive = true;
    this.startTimer();
  },

  claimValidView() {
    if (RTXState.sessionCompleted || RTXState.surfPaused) return;
    this.refreshCampaignQueue();

    const validation = this.validateView();
    if (!validation.valid) {
      if (validation.restartTimer) {
        this.startTimer();
      } else if (!this.refreshSurfIfLive()) {
        if (typeof App !== "undefined" && App && typeof App.render === "function") {
          App.render();
        }
      }
      return;
    }

    const claimedCampaign = this.getCurrentCampaign();
    const result = SessionSystem.recordValidView();
    checkDailyReset();
    const activityMultiplier = getActivityBoostMultiplier();
    RTXState.user.dailyActivity.views += 1;
    RTXState.user.dailyActivity.activityScore =
      Math.round((RTXState.user.dailyActivity.activityScore + 1 * activityMultiplier) * 100) / 100;
    RTXState.user.dailyActivity.rewardTier = getDailyRewardTier(RTXState.user.dailyActivity);

    RTXState.user.loyaltyScore += 1;
    RTXUserPersist.save();
    const totalClaimedViews = Math.max(0, Number(RTXState.user.viewsToday) || 0);
    if (totalClaimedViews > 0 && totalClaimedViews % 30 === 0) {
      this.showProgressReminder();
    }

    if (RTXState.user.sessionViews >= RTXState.settings.viewsPerSession || result.sessionComplete) {
      incrementSurfCampaignView(claimedCampaign);
      this.clearSurfTimer();
      RTXState.sessionCompleted = true;
      RTXState.sessionActive = false;
      RTXState.surfPaused = true;
      SessionSystem.completeSession();
      App.render();
      this.triggerMiniGameMaybe(true);
      return;
    }

    incrementSurfCampaignView(claimedCampaign);

    const anti = RTXState.antiCheat;
    anti.viewsSinceCaptcha += 1;
    if (anti.viewsSinceCaptcha >= anti.nextCaptchaAt) {
      anti.captchaRequired = true;
      anti.captchaSolved = false;
      this.generateCaptchaChallenge();
      anti.viewsSinceCaptcha = 0;
      anti.nextCaptchaAt = this.randomCaptchaThreshold();
      this.setAntiCheatStatus("CAPTCHA required. Verify before claiming.");
    }

    this.refreshCampaignQueue();
    const queue = this.campaignQueue;
    RTXState.activeCampaignIndex = this.selectNextCampaignIndex();
    const selectedCampaign = queue[RTXState.activeCampaignIndex] || null;
    this.lastCampaignOwnerId = selectedCampaign && selectedCampaign.ownerId ? String(selectedCampaign.ownerId) : null;

    this.triggerMiniGameMaybe(false);
    this.startTimer();
  },

  getCampaignQueue() {
    if (!this.campaignQueue.length) {
      this.refreshCampaignQueue();
    }
    return this.campaignQueue;
  },

  selectNextCampaignIndex() {
    const queue = this.campaignQueue;
    const len = queue.length || 1;
    const currentIdx = (((RTXState.activeCampaignIndex || 0) % len) + len) % len;
    const normalNextIdx = (currentIdx + 1) % len;
    const lastOwnerId = this.lastCampaignOwnerId;

    if (!lastOwnerId || len <= 1) return normalNextIdx;

    for (let offset = 1; offset < len; offset += 1) {
      const idx = (currentIdx + offset) % len;
      const campaign = queue[idx] || {};
      const ownerId = campaign && campaign.ownerId ? String(campaign.ownerId) : "";
      // Missing ownerId is treated as different and allowed.
      if (!ownerId || ownerId !== lastOwnerId) return idx;
    }

    // If all campaigns are from same owner, fall back to normal progression.
    return normalNextIdx;
  },

  getCurrentCampaign() {
    const queue = this.getCampaignQueue();
    const len = queue.length;
    if (!len) {
      return {
        id: null,
        title: "RevEmpire Promo",
        url: "https://revempire.net",
        timerSec: 20,
        credits: 1,
        source: "fallback"
      };
    }
    const idx = (((RTXState.activeCampaignIndex || 0) % len) + len) % len;
    return queue[idx];
  }
};
