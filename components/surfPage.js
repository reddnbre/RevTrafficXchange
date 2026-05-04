function SurfPageComponent() {
  SurfEngine.initAntiCheat();
  if (typeof checkDailyReset === "function") checkDailyReset();

  const poolProj = typeof getProjectedDailyPoolReward === "function" ? getProjectedDailyPoolReward() : null;
  const poolEstimated = poolProj && Number.isFinite(poolProj.projectedDollars) ? poolProj.projectedDollars : 0;
  const poolQualified = poolProj && Number.isFinite(poolProj.qualifiedSpend) ? poolProj.qualifiedSpend : 0;
  const poolEligibilityLabel = poolProj && poolProj.eligibilityLabel ? poolProj.eligibilityLabel : "Not Eligible";
  const poolCapPending = poolProj && poolProj.showCapPendingNote;
  const poolNotEligible = poolProj && poolProj.showNotEligibleMessage;

  const campaigns = SurfEngine.getCampaignQueue ? SurfEngine.getCampaignQueue() : RTXState.sampleCampaigns || [];
  const campaign = SurfEngine.getCurrentCampaign() || { title: "Campaign Preview", url: "about:blank" };
  const canClaim = !SurfEngine.isRunning && SurfEngine.secondsLeft <= 0;
  const progress = SessionSystem.getSessionProgressPercent();
  const queueLen = Math.max(1, campaigns.length);
  const resolvedIdx = (((RTXState.activeCampaignIndex || 0) % queueLen) + queueLen) % queueLen;
  const currentIndex = resolvedIdx + 1;
  const totalCampaigns = campaigns.length || 1;
  const u = RTXState.user;
  const anti = RTXState.antiCheat;
  const sessionLocked = RTXState.sessionCompleted || RTXState.surfPaused;
  const claimMultiplier = Math.max(1, Number(u.multiplier) || 1);
  const creditsPerView = typeof CreditSystem !== "undefined" && CreditSystem && typeof CreditSystem.getCreditsForValidView === "function"
    ? CreditSystem.getCreditsForValidView()
    : Math.round((Number(RTXState.settings.baseCreditsPerView) || 1) * claimMultiplier);
  const activityMultiplier = typeof getActivityBoostMultiplier === "function" ? getActivityBoostMultiplier() : 1;
  const boostPct = Math.max(0, Math.round((activityMultiplier - 1) * 100));
  const boostTimeLeft = typeof getBoostTimeLeftText === "function" ? getBoostTimeLeftText() : "";
  const boostLabel = boostPct > 0 ? `+${boostPct}%${boostTimeLeft ? ` (${boostTimeLeft})` : ""}` : "+0%";

  const creditsWalletTitle =
    typeof RewardUX !== "undefined" && RewardUX && typeof RewardUX.getSurfCreditsWalletTooltip === "function"
      ? RewardUX.getSurfCreditsWalletTooltip()
      : 'Wallet: traffic credits you already own and can spend.';
  const escAttr =
    typeof escapeHtmlAttr === "function"
      ? escapeHtmlAttr(creditsWalletTitle)
      : String(creditsWalletTitle).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

  const primaryAction = sessionLocked
    ? `<button class="btn btn-primary surf-claim-btn" onclick="SurfEngine.startNextSession()">Start Next Session</button>`
    : SurfEngine.isRunning
    ? `<button class="btn btn-primary surf-claim-btn" disabled>Viewing Ad...</button>`
    : anti.captchaRequired && !anti.captchaSolved
      ? `<button class="btn btn-primary surf-claim-btn" disabled>Solve CAPTCHA to Claim</button>`
    : canClaim
      ? `<button class="btn btn-primary surf-claim-btn" onclick="SurfEngine.claimValidView()">Claim View + Next Ad</button>`
      : `<button class="btn btn-primary surf-claim-btn" onclick="SurfEngine.startTimer()">Start Timer</button>`;

  return `
    <div class="surf-page">
      ${typeof RewardUX !== "undefined" && RewardUX && typeof RewardUX.renderSurfStrip === "function" ? RewardUX.renderSurfStrip() : ""}
      <div class="surf-cmd-bar">
        <div class="surf-cmd-scroll">
          <div class="surf-cmd-brand" aria-label="RevTrafficXchange">
            <img class="surf-cmd-logo-icon" src="assets/images/logos/rx-icon.png" alt="" />
            <img class="surf-cmd-logo-wordmark" src="assets/images/logos/revtx-wordmark.png" alt="" />
          </div>
          <span class="surf-cmd-pill" id="surf-credits-pill" title="${escAttr}">Credits: ${u.credits}</span>
          <span id="surf-multiplier-pill" class="surf-cmd-pill ${claimMultiplier > 1 ? "surf-cmd-pill-multiplier-on" : "surf-cmd-pill-multiplier-off"}">Payout Multiplier: x${claimMultiplier.toFixed(1)}</span>
          <span class="surf-cmd-pill" id="surf-per-view-pill">Per View: +${creditsPerView}</span>
          <span id="surf-activity-pill" class="surf-cmd-pill ${boostPct > 0 ? "surf-cmd-pill-boost-on" : "surf-cmd-pill-boost-off"}">Activity Boost: ${boostLabel}</span>
          <span class="surf-cmd-pill surf-cmd-pill-timer">Timer: <span class="surf-timer">${SurfEngine.secondsLeft}s</span></span>
        </div>
        <div class="surf-cmd-actions">
          ${primaryAction}
          <button type="button" class="btn surf-cmd-nav ${RTXState.currentView === "dashboard" ? "active" : ""}" onclick="App.navigate('dashboard')">Dashboard</button>
          <button type="button" class="btn surf-cmd-nav ${RTXState.currentView === "surf" ? "active" : ""}" onclick="App.navigate('surf')">Hyper Mode</button>
        </div>
      </div>

      <div class="surf-anti-cheat-row">
        <div class="surf-warning">Stay on this tab while the timer runs.</div>
        <div class="surf-warning surf-warning-alert ${anti.statusMessage ? "" : "hidden"}" id="surf-anti-cheat-status">${anti.statusMessage || ""}</div>
        ${anti.captchaRequired && !anti.captchaSolved ? `
          <div class="surf-captcha-box">
            <div class="surf-captcha-label">${anti.captchaPrompt}</div>
            <input id="surf-captcha-answer" class="surf-captcha-input" type="text" inputmode="numeric" placeholder="Answer" />
            <button class="btn btn-primary surf-captcha-btn" onclick="SurfEngine.verifyCaptcha()">Verify</button>
          </div>
        ` : ""}
      </div>

      <div class="surf-anti-cheat-popup ${anti.popupVisible ? "" : "hidden"}" id="surf-anti-cheat-popup" role="alert" aria-live="polite">
        <div class="surf-anti-cheat-popup-title">Anti-Cheat Notice</div>
        <div class="surf-anti-cheat-popup-text" id="surf-anti-cheat-popup-text">${anti.popupMessage || ""}</div>
        <button class="btn surf-anti-cheat-popup-close" onclick="SurfEngine.dismissAntiCheatPopup()">Dismiss</button>
      </div>

      <section class="panel surf-viewer-panel">
        <div class="surf-browser-frame">
          <div class="surf-browser-content">
            <iframe
              id="surf-active-frame"
              class="surf-iframe"
              src="${campaign.url}"
              title="${campaign.title}"
              loading="lazy"
              referrerpolicy="no-referrer"
            ></iframe>
          </div>
        </div>
      </section>

      <div class="surf-info-bar" role="region" aria-label="Hyper Mode info">
        <div class="surf-info-item surf-pool-projection" id="surf-pool-projection" role="status" aria-live="polite">
          <div class="surf-pool-projection-title">Projected Pool Reward Today</div>
          <div class="surf-pool-projection-row">
            <span class="surf-pool-projection-k">Eligibility</span>
            <span class="surf-pool-projection-v" id="surf-pool-eligibility">${poolEligibilityLabel}</span>
          </div>
          <div class="surf-pool-projection-row">
            <span class="surf-pool-projection-k">Qualified Spend</span>
            <span class="surf-pool-projection-v" id="surf-pool-qualified-spend">$${poolQualified.toFixed(2)}</span>
          </div>
          <div class="surf-pool-projection-row surf-pool-projection-reward-row">
            <span class="surf-pool-projection-k">Estimated Reward</span>
            <span class="surf-pool-projection-v" id="surf-pool-estimated-reward">$${poolEstimated.toFixed(2)}</span>
          </div>
          <div class="surf-pool-projection-pending ${poolCapPending ? "" : "hidden"}" id="surf-pool-cap-pending">Spend-based cap pending purchase history.</div>
          <div class="surf-pool-projection-ineligible ${poolNotEligible ? "" : "hidden"}" id="surf-pool-not-eligible">Pool eligibility requires upgraded membership or qualifying platform spend.</div>
          <div class="surf-pool-projection-disclaimer">Estimate only. No earnings are guaranteed.</div>
        </div>
        <div class="surf-info-item surf-info-session">
          <div class="surf-info-title" id="surf-session-title">Session: ${RTXState.user.sessionViews} / ${RTXState.settings.viewsPerSession}</div>
          <div class="progress-bar surf-info-progress">
            <div id="surf-info-progress-fill" class="progress-fill" style="width:${progress}%"></div>
          </div>
        </div>

        <div class="surf-info-item surf-info-spin">
          <span class="surf-info-icon" aria-hidden="true">🎡</span>
          <span>Hyper Spin unlocks at ${RTXState.settings.viewsPerSession} views</span>
        </div>
        <div class="surf-info-item">
          <span id="surf-info-views-line">Views: ${u.viewsToday}</span>
        </div>
        <div class="surf-info-item">
          <span id="surf-info-streak-line">Streak: ${u.streak}</span>
        </div>
        <div class="surf-info-item">
          <span id="surf-info-loyalty-line">Loyalty: ${u.loyaltyScore || 0}</span>
        </div>
        <div class="surf-info-item surf-info-campaign" id="surf-info-campaign-wrap" title="${String(campaign.title).replace(/"/g, "&quot;")} — ${String(campaign.url).replace(/"/g, "&quot;")}">
          <span id="surf-info-campaign-line">Campaign ${currentIndex} of ${totalCampaigns}</span>
        </div>

        <div class="surf-info-item surf-info-help" tabindex="0">
          <span class="surf-info-help-label">Rules ?</span>
          <div class="surf-tooltip" role="tooltip">
            <div>Wait for the timer to finish.</div>
            <div>Claim the valid view.</div>
            <div>Earn credits after every valid view.</div>
            <div>Complete 25 views to unlock Hyper Spin.</div>
          </div>
        </div>

        <div class="surf-info-item surf-info-help" tabindex="0">
          <span class="surf-info-help-label">Core Loop ?</span>
          <div class="surf-tooltip" role="tooltip">
            <div>View ads with a timer.</div>
            <div>Earn traffic credits.</div>
            <div>Complete 25-view sessions.</div>
            <div>Unlock Hyper Spin after each session.</div>
          </div>
        </div>

        <div class="surf-info-item surf-info-help" tabindex="0">
          <span class="surf-info-help-label">Rewards ?</span>
          <div class="surf-tooltip" role="tooltip">
            <div>Free users earn credits only.</div>
            <div>Paid users can later unlock loyalty rewards.</div>
            <div>Cash rewards come from revenue pool only.</div>
          </div>
        </div>
      </div>
    </div>
  `;
}
