/**
 * Reward experience layer — toasts, progress readouts, nudges.
 * Read-only helpers; does not alter payout or reward math.
 */
const RewardUX = {
  _toastTimer: null,
  TOAST_MS: 4200,

  ensureToastHost() {
    let el = document.getElementById("rtx-reward-toast-host");
    if (!el) {
      el = document.createElement("div");
      el.id = "rtx-reward-toast-host";
      document.body.appendChild(el);
    }
    return el;
  },

  refreshToast() {
    const host = this.ensureToastHost();
    host.innerHTML = this.renderToast();
  },

  /** Hyper Mode credits pill tooltip (kept in sync when SurfEngine patches DOM). */
  getSurfCreditsWalletTooltip() {
    return 'Wallet: traffic credits you already own and can spend. "Today banked" above counts the same credits toward your daily stats and tier. There is no separate uncredited balance in this demo.';
  },

  esc(s) {
    return typeof App !== "undefined" && App && typeof App.escapeHtml === "function"
      ? App.escapeHtml(s)
      : String(s || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/"/g, "&quot;");
  },

  pulse(message, tone) {
    if (!RTXState.ui) return;
    const msg = String(message || "").trim();
    if (!msg) return;
    if (this._toastTimer) {
      clearTimeout(this._toastTimer);
      this._toastTimer = null;
    }
    RTXState.ui.rewardToast = { message: msg, tone: tone || "success" };
    this.refreshToast();
    this._toastTimer = setTimeout(() => {
      this._toastTimer = null;
      if (RTXState.ui) RTXState.ui.rewardToast = null;
      this.refreshToast();
    }, this.TOAST_MS);
  },

  notifyCreditsFromRecord(n) {
    const amount = Math.max(0, Math.floor(Number(n) || 0));
    if (!amount) return;
    this.pulse(`+${amount} traffic credits locked in`, "success");
  },

  onHyperSpinApplied(reward) {
    if (!reward || typeof reward !== "object") return;
    if (reward.type === "credits") return;
    if (reward.type === "multiplier") {
      this.pulse(`Hyper Spin: ${reward.value}x payout multiplier is live`, "success");
    } else if (reward.type === "none") {
      this.pulse("Hyper Spin: no bonus chip — your streak still grows", "neutral");
    }
  },

  sessionCompletePulse() {
    this.pulse("Session complete — Hyper Spin unlocked", "success");
  },

  /**
   * bankedToday = credits recorded today (all sessions).
   * sessionClaimedCredits = verified claims this run (sessionViews × current per-view); 0 after “Start next session” until you claim again.
   * remaining* = only while a session is in progress (timer/run active, not completed).
   */
  getTodayCreditsBreakdown() {
    checkDailyReset();
    const daily = RTXState.user.dailyActivity || {};
    const bankedToday = Math.max(0, Math.floor(Number(daily.creditsEarned) || 0));
    const per =
      typeof CreditSystem !== "undefined" && CreditSystem && typeof CreditSystem.getCreditsForValidView === "function"
        ? CreditSystem.getCreditsForValidView()
        : Math.round((Number(RTXState.settings.baseCreditsPerView) || 1) * (Number(RTXState.user.multiplier) || 1));
    const vps = Math.max(1, Math.floor(Number(RTXState.settings.viewsPerSession) || 25));
    const sv = Math.max(0, Math.floor(Number(RTXState.user.sessionViews) || 0));
    const sessionCompleted = Boolean(RTXState.sessionCompleted);
    const sessionInProgress = !sessionCompleted && Boolean(RTXState.sessionActive);
    const sessionClaimedCredits = sv * per;
    const remainingViews = sessionInProgress ? Math.max(0, vps - sv) : 0;
    const remainingCreditsIfFinish = remainingViews * per;
    return {
      bankedToday,
      sessionClaimedCredits,
      remainingViews,
      remainingCreditsIfFinish,
      per,
      sv,
      vps,
      sessionInProgress,
      sessionCompleted,
      confirmed: bankedToday,
      pending: remainingCreditsIfFinish,
      remaining: remainingViews,
      total: bankedToday + remainingCreditsIfFinish
    };
  },

  getDailyTierProgressMeta() {
    checkDailyReset();
    const s = Math.max(0, Number(RTXState.user.dailyActivity && RTXState.user.dailyActivity.activityScore) || 0);
    const names = ["Not Qualified", "Building", "Qualified", "Strong", "Elite Daily"];
    const floors = [0, 50, 100, 250, 500];
    let idx = 0;
    if (s >= 500) idx = 4;
    else if (s >= 250) idx = 3;
    else if (s >= 100) idx = 2;
    else if (s >= 50) idx = 1;
    else idx = 0;
    const tierName = names[idx];
    const nextFloor = idx < 4 ? floors[idx + 1] : null;
    const currFloor = floors[idx];
    const span = nextFloor != null ? Math.max(1, nextFloor - currFloor) : 1;
    const pct = nextFloor == null ? 100 : Math.min(100, Math.max(0, ((s - currFloor) / span) * 100));
    return {
      score: s,
      tierName,
      pct,
      nextFloor,
      nextName: nextFloor != null ? names[idx + 1] : null
    };
  },

  getLoyaltyProgressMeta() {
    const info = getLoyaltyTierInfo(RTXState.user.loyaltyScore);
    const cur = info.progressCurrent;
    const tgt = info.progressTarget;
    const pct = tgt && tgt > 0 ? Math.min(100, (cur / tgt) * 100) : 100;
    return { info, pct };
  },

  getSessionUrgency() {
    const vps = Math.max(1, Math.floor(Number(RTXState.settings.viewsPerSession) || 25));
    const sv = Math.max(0, Math.floor(Number(RTXState.user.sessionViews) || 0));
    const left = Math.max(0, vps - sv);
    const pct = Math.min(100, (sv / vps) * 100);
    let level = "calm";
    if (pct >= 92) level = "final";
    else if (pct >= 72) level = "hot";
    else if (pct >= 40) level = "warm";
    return { left, pct, level, sv, vps };
  },

  getNudgeLines() {
    const lines = [];
    const daily = this.getDailyTierProgressMeta();
    const sess = this.getSessionUrgency();
    const spins = Math.max(0, Math.floor(Number(RTXState.user.hyperSpins) || 0));

    if (sess.left === 1) lines.push("1 view left — Hyper Spin is one claim away.");
    else if (sess.left > 0 && sess.left <= 4) lines.push(`${sess.left} views until this session unlocks Hyper Spin.`);

    if (daily.nextFloor != null) {
      const gap = daily.nextFloor - daily.score;
      if (gap > 0 && gap <= 12) lines.push(`${gap} daily activity points until “${daily.nextName}”.`);
    }

    if (spins > 0) lines.push(`You have ${spins} Hyper Spin${spins === 1 ? "" : "s"} ready on the Hyper Spin page.`);

    const loyal = this.getLoyaltyProgressMeta();
    if (loyal.info.progressTarget && loyal.pct >= 78 && loyal.pct < 100) {
      lines.push(`${loyal.info.nextTier} tier is almost in range.`);
    }

    return lines.slice(0, 3);
  },

  formatMoney(n) {
    const x = Number(n);
    if (!Number.isFinite(x)) return "$0";
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(x);
  },

  renderToast() {
    const t = RTXState.ui && RTXState.ui.rewardToast;
    if (!t || !t.message) return "";
    const tone = t.tone === "error" ? "error" : t.tone === "neutral" ? "neutral" : "success";
    return `
      <div class="reward-ux-toast reward-ux-toast--${tone}" role="status" aria-live="polite">
        <span class="reward-ux-toast__bolt" aria-hidden="true">⚡</span>
        <span class="reward-ux-toast__msg">${this.esc(t.message)}</span>
      </div>
    `;
  },

  renderDashboardRibbon() {
    if (!RTXState.session || !RTXState.session.isAuthenticated) return "";
    const credits = this.getTodayCreditsBreakdown();
    const daily = this.getDailyTierProgressMeta();
    const loyal = this.getLoyaltyProgressMeta();
    const nudges = this.getNudgeLines();
    const pool = typeof getRewardPoolPreview === "function" ? getRewardPoolPreview() : {};
    const poolBal = Number(pool.adaptiveCurrentPoolBalance);
    const health = Math.max(0, Math.min(1, Number(pool.poolHealthRatio) || 0));
    const mode = pool.adaptiveMode ? String(pool.adaptiveMode) : "steady";
    const proj = typeof getProjectedDailyPoolReward === "function" ? getProjectedDailyPoolReward() : {};

    const nudgeHtml =
      nudges.length > 0
        ? `<ul class="reward-ux-nudges">${nudges.map((l) => `<li>${this.esc(l)}</li>`).join("")}</ul>`
        : "";

    const contribs =
      RTXState.rewardPoolTesting && Array.isArray(RTXState.rewardPoolTesting.contributions)
        ? RTXState.rewardPoolTesting.contributions.slice(0, 5)
        : [];
    const contribHtml =
      contribs.length > 0
        ? `<div class="reward-ux-pool-test-log" aria-label="Simulated pool contributions">
            <div class="reward-ux-pool-test-log__title">Recent simulated pool funding (admin testing)</div>
            <ul>${contribs
              .map(
                (row) =>
                  `<li><span class="reward-ux-pool-test-log__amt">+$${Math.round(Number(row.dollars) * 100) / 100}</span> · ${this.esc(
                    row.label || ""
                  )} · <span class="reward-ux-pool-test-log__time">${this.esc(
                    row.ts ? new Date(row.ts).toLocaleString() : ""
                  )}</span></li>`
              )
              .join("")}</ul>
          </div>`
        : "";

    return `
      <section class="reward-ux-ribbon" aria-label="Today’s reward progress">
        <div class="reward-ux-ribbon__grid">
          <div class="reward-ux-card reward-ux-card--earnings">
            <div class="reward-ux-card__label">Today’s traffic credits</div>
            <div class="reward-ux-card__hero">
              <span class="reward-ux-card__big">${credits.bankedToday}</span>
              <span class="reward-ux-card__suffix">banked today</span>
            </div>
            <div class="reward-ux-card__sub">This session: <strong>${credits.sessionClaimedCredits}</strong> credits from <strong>${credits.sv}</strong> verified view(s) at +${credits.per} each.</div>
            <div class="reward-ux-card__hint reward-ux-card__hint--muted">Wallet credits (top bar / Hyper Mode) are your live balance. “Today banked” is the same credits summed for daily stats and tier — not a second balance waiting to post.</div>
            <div class="reward-ux-card__hint">${
              credits.sessionInProgress && credits.remainingViews > 0
                ? `${credits.remainingViews} claim(s) left this run · up to ${credits.remainingCreditsIfFinish} more credits if you clear them.`
                : credits.sessionCompleted && credits.sv > 0
                  ? "This run is finished — start the next session on Hyper Mode when you are ready."
                  : credits.sessionInProgress && credits.sv === 0
                    ? `Timer running — first claim adds +${credits.per}; up to ${credits.remainingCreditsIfFinish} credits left in this run.`
                    : "Open Hyper Mode and start a session to earn session credits again."
            }</div>
          </div>
          <div class="reward-ux-card reward-ux-card--daily">
            <div class="reward-ux-card__label">Daily reward tier track</div>
            <div class="reward-ux-tier-pill">${this.esc(daily.tierName)}</div>
            <div class="reward-ux-bar"><div class="reward-ux-bar__fill" style="width:${daily.pct}%"></div></div>
            <div class="reward-ux-card__sub">
              ${daily.nextName ? `Next: ${this.esc(daily.nextName)} at ${daily.nextFloor} pts` : "Top daily band unlocked for today"}
            </div>
            <div class="reward-ux-card__hint">Activity score today: ${daily.score}</div>
          </div>
          <div class="reward-ux-card reward-ux-card--loyalty">
            <div class="reward-ux-card__label">Loyalty tier</div>
            <div class="reward-ux-tier-pill reward-ux-tier-pill--orange">${this.esc(loyal.info.tier)}</div>
            <div class="reward-ux-bar reward-ux-bar--blue"><div class="reward-ux-bar__fill" style="width:${loyal.pct}%"></div></div>
            <div class="reward-ux-card__sub">${this.esc(loyal.info.progressLabel)}</div>
            <div class="reward-ux-card__hint">Loyalty multiplier ×${loyal.info.multiplier.toFixed(1)}</div>
          </div>
          <div class="reward-ux-card reward-ux-card--pool">
            <div class="reward-ux-card__label">Reward pool (live readout)</div>
            <div class="reward-ux-card__hero reward-ux-card__hero--sm">${this.formatMoney(Number.isFinite(poolBal) ? poolBal : 0)}</div>
            <div class="reward-ux-card__sub">Simulated balance · ${this.esc(mode)} release curve</div>
            <div class="reward-ux-bar reward-ux-bar--health"><div class="reward-ux-bar__fill" style="width:${Math.round(health * 100)}%"></div></div>
            <div class="reward-ux-card__hint">Pool eligibility: ${this.esc(proj.eligibilityLabel || "—")}</div>
          </div>
        </div>
        ${contribHtml}
        ${nudgeHtml}
      </section>
    `;
  },

  renderSurfStrip() {
    if (!RTXState.session || !RTXState.session.isAuthenticated) return "";
    const credits = this.getTodayCreditsBreakdown();
    const sess = this.getSessionUrgency();
    const daily = this.getDailyTierProgressMeta();
    const bankedTitle =
      "All traffic credits already recorded today (every session combined). These are real balance changes, not pending confirmation.";
    const sessionTitle =
      credits.sessionInProgress && credits.remainingViews > 0
        ? `${credits.remainingViews} verified claim(s) left this run at +${credits.per} each — up to ${credits.remainingCreditsIfFinish} more session credits if you finish.`
        : credits.sessionCompleted
          ? "This session is complete. Start the next session to reset the run counter to zero until you claim again."
          : credits.sessionInProgress && credits.sv === 0
            ? `Session active: ${credits.vps} views in this run at +${credits.per} each. "This session" stays 0 until your first claim.`
            : "Start a session and claim views to add session credits. After Start next session, this line begins at zero again.";
    return `
      <div id="reward-ux-surf-strip-root" class="reward-ux-surf-strip reward-ux-surf-strip--compact" role="region" aria-label="Session and earnings">
        <div class="reward-ux-surf-strip__row">
          <div class="reward-ux-surf-strip__earnings" title="${this.esc(bankedTitle)}">
            <span class="reward-ux-surf-strip__label">Today</span>
            <strong>${credits.bankedToday}</strong><span class="reward-ux-surf-strip__muted"> banked</span>
            <span class="reward-ux-surf-strip__dot">·</span>
            <span class="reward-ux-surf-strip__label">Run</span>
            <strong>${credits.sessionClaimedCredits}</strong><span class="reward-ux-surf-strip__muted"> this session</span>
            ${
              credits.sessionInProgress && credits.remainingViews > 0
                ? `<span class="reward-ux-surf-strip__dot">·</span><span class="reward-ux-surf-strip__muted">up to <strong>${credits.remainingCreditsIfFinish}</strong> left</span>`
                : ""
            }
          </div>
          <div class="reward-ux-surf-strip__session reward-ux-surf-strip__session--${sess.level}" title="${this.esc(sessionTitle)}">
            <span class="reward-ux-surf-strip__label">Ses</span>
            <strong>${sess.sv}</strong><span class="reward-ux-surf-strip__muted">/${sess.vps}</span>
            <div class="reward-ux-surf-strip__bar"><div style="width:${sess.pct}%"></div></div>
          </div>
          <div class="reward-ux-surf-strip__tier" title="Daily activity tier (resets at calendar day)">
            <span class="reward-ux-surf-strip__label">Tier</span>
            <strong>${this.esc(daily.tierName)}</strong>
          </div>
        </div>
      </div>
    `;
  }
};

window.RewardUX = RewardUX;
