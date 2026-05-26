const GameModal = {
  currentReward: null,
  visible: false,
  animating: false,
  _sessionId: 0,
  _slotIndex: null,
  _revealProgress: 0,

  /** Modal mounts outside `#app` so `App.render()` does not destroy the surf iframe during draw ticks. */
  ensureHost() {
    let el = document.getElementById("rtx-game-modal-host");
    if (!el) {
      el = document.createElement("div");
      el.id = "rtx-game-modal-host";
      document.body.appendChild(el);
    }
    return el;
  },

  refresh() {
    const host = this.ensureHost();
    host.innerHTML = this.visible ? this.render() : "";
  },

  showHyperSpin() {
    this._sessionId += 1;
    this.visible = true;
    this.currentReward = null;
    this.animating = false;
    this._slotIndex = null;
    this._revealProgress = 0;
    this.refresh();
  },

  spin() {
    if (this.animating) return;
    const balance = Math.max(0, Math.floor(Number(RTXState.user && RTXState.user.hyperSpins) || 0));
    if (balance <= 0) return;
    RTXState.user.hyperSpins = balance - 1;
    if (typeof RTXUserPersist !== "undefined" && RTXUserPersist.save) {
      RTXUserPersist.save();
    }

    const picked = HyperSpin.pickWinningSegment();
    const segments = Array.isArray(HyperSpin.rewards) ? HyperSpin.rewards : [];
    const n = Math.max(1, segments.length);

    this.animating = true;
    this._revealProgress = 0;
    this._slotIndex = Math.floor(Math.random() * n);
    this._sessionId += 1;
    const sid = this._sessionId;
    this.refresh();

    HyperSpin.runDrawReveal({
      winningIndex: picked.winningIndex,
      isCancelled: () => sid !== this._sessionId || !this.visible,
      onTick: (idx, progress) => {
        if (sid !== this._sessionId) return;
        this._slotIndex = idx;
        this._revealProgress = progress;
        this.refresh();
      },
      onComplete: () => {
        if (sid !== this._sessionId) return;
        HyperSpin.applyReward(picked.segment, true);
        this.currentReward = picked.segment;
        this.animating = false;
        this._slotIndex = null;
        this._revealProgress = 0;
        RTXUserPersist.save();
        this.refresh();
      }
    });
  },

  close() {
    this._sessionId += 1;
    this.visible = false;
    this.currentReward = null;
    this.animating = false;
    this._slotIndex = null;
    this._revealProgress = 0;
    if (typeof App !== "undefined" && App && typeof App.render === "function") {
      App.render();
    } else {
      this.refresh();
    }
  },

  getRewardTone(reward) {
    if (!reward) return "idle";
    if (reward.type === "credits") return "credits";
    if (reward.type === "multiplier") return "multiplier";
    return "none";
  },

  getRewardIcon(reward) {
    if (!reward) return "HS";
    if (reward.type === "credits") return "+";
    if (reward.type === "multiplier") return "x";
    return "--";
  },

  render() {
    if (!this.visible) return "";

    const segments = Array.isArray(HyperSpin.rewards) ? HyperSpin.rewards : [];
    const spinning = this.animating;
    const slotIdx = typeof this._slotIndex === "number" ? this._slotIndex : 0;
    const slotReward = segments[slotIdx] || null;
    const slotLabel = slotReward && slotReward.label ? String(slotReward.label) : "Ready when you are";
    const esc = typeof escapeHtmlAttr === "function" ? escapeHtmlAttr : (s) => String(s);
    const totalWeight = segments.reduce((sum, s) => sum + Math.max(0, Number(s.weight) || 0), 0) || 1;
    const progressPct = Math.round(Math.max(0, Math.min(1, this._revealProgress)) * 100);
    const currentTone = this.currentReward ? this.getRewardTone(this.currentReward) : this.getRewardTone(slotReward);

    const poolList = segments.length && !this.currentReward
      ? `<div class="rtx-hyper-prize-panel">
          <div class="rtx-hyper-prize-heading">Reward Pool</div>
          <ul class="rtx-hyper-prize-pool${spinning ? " rtx-hyper-prize-pool--during" : ""}" aria-label="Possible rewards">${segments
            .map((s, i) => {
              const odds = Math.round((Math.max(0, Number(s.weight) || 0) / totalWeight) * 100);
              return `<li class="rtx-hyper-prize-row ${spinning && i === slotIdx ? "rtx-hyper-prize-row--lit" : ""}">
                <span>${esc(s.label || "")}</span>
                <em>${odds}%</em>
              </li>`;
            })
            .join("")}</ul>
        </div>`
      : "";

    const slotFrame = !this.currentReward
      ? `
        <div class="rtx-hyper-machine ${spinning ? "rtx-hyper-machine--running" : ""}">
          <div class="rtx-hyper-machine-topline">
            <span>Session Bonus</span>
            <strong>${spinning ? "Drawing" : "Armed"}</strong>
          </div>
          <div class="rtx-hyper-slot ${spinning ? "rtx-hyper-slot--running" : "rtx-hyper-slot--idle"} rtx-hyper-slot--${currentTone}" aria-live="polite">
            <div class="rtx-hyper-slot__badge">Hyper Spin</div>
            <div class="rtx-hyper-slot__reel">
              <div class="rtx-hyper-slot__icon" aria-hidden="true">${esc(this.getRewardIcon(slotReward))}</div>
              <div class="rtx-hyper-slot__label ${spinning && this._revealProgress < 0.82 ? "rtx-hyper-slot__label--blur" : ""}">${esc(slotLabel)}</div>
            </div>
            <div class="rtx-hyper-slot__sub">${spinning ? "Locking in your reward..." : "Use one Hyper Spin to draw from the reward pool."}</div>
          </div>
          <div class="rtx-hyper-progress" aria-hidden="true">
            <span style="width:${spinning ? Math.max(4, progressPct) : 0}%"></span>
          </div>
        </div>
      `
      : "";

    const wonLabel = this.currentReward && this.currentReward.label ? String(this.currentReward.label) : "";
    const wonTone = this.getRewardTone(this.currentReward);

    const celebrate = !!this.currentReward;
    return `
      <div class="modal-overlay rtx-hyper-modal-overlay">
        <div class="modal rtx-hyper-modal${celebrate ? " rtx-hyper-modal--celebrate" : ""}">
          <div class="rtx-hyper-modal-orbit" aria-hidden="true"></div>
          <div class="rtx-hyper-modal-head">
            <div class="rtx-hyper-modal-kicker">RevTrafficXchange Reward</div>
            <h2>Hyper Spin Unlocked</h2>
            <p class="rtx-hyper-modal-sub">
              Session complete. Draw one reward with the same weighted odds as the Hyper Spin page.
            </p>
          </div>

          ${slotFrame}
          ${poolList}

          ${
            this.currentReward
              ? `<div class="rtx-hyper-win-burst" aria-hidden="true"></div>
              <div class="rtx-hyper-result-card rtx-hyper-result-card--pop rtx-hyper-result-card--celebrate rtx-hyper-result-card--${wonTone}">
                <span class="rtx-hyper-result-card__eyebrow">Reward Secured</span>
                <strong>${esc(wonLabel)}</strong>
                <span class="rtx-hyper-result-card__sub">Applied to your account.</span>
              </div>`
              : ""
          }

          <div class="rtx-hyper-modal-actions">
          ${
            this.currentReward
              ? `<button type="button" class="btn btn-primary rtx-hyper-action" onclick="GameModal.close()">Continue Surfing</button>`
              : spinning
              ? `<button type="button" class="btn btn-primary rtx-hyper-action" disabled>Drawing...</button>`
              : `<button type="button" class="btn btn-primary rtx-hyper-action" onclick="GameModal.spin()">Draw Reward</button>`
          }
          </div>
        </div>
      </div>
    `;
  }
};
