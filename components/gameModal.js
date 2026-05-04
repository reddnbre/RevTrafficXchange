const GameModal = {
  currentReward: null,
  visible: false,
  animating: false,
  _sessionId: 0,
  _slotIndex: null,
  _revealProgress: 0,

  showHyperSpin() {
    this._sessionId += 1;
    this.visible = true;
    this.currentReward = null;
    this.animating = false;
    this._slotIndex = null;
    this._revealProgress = 0;
    App.render();
  },

  spin() {
    if (this.animating) return;
    const picked = HyperSpin.pickWinningSegment();
    const segments = Array.isArray(HyperSpin.rewards) ? HyperSpin.rewards : [];
    const n = Math.max(1, segments.length);

    this.animating = true;
    this._revealProgress = 0;
    this._slotIndex = Math.floor(Math.random() * n);
    this._sessionId += 1;
    const sid = this._sessionId;
    App.render();

    HyperSpin.runDrawReveal({
      winningIndex: picked.winningIndex,
      isCancelled: () => sid !== this._sessionId || !this.visible,
      onTick: (idx, progress) => {
        if (sid !== this._sessionId) return;
        this._slotIndex = idx;
        this._revealProgress = progress;
        App.render();
      },
      onComplete: () => {
        if (sid !== this._sessionId) return;
        HyperSpin.applyReward(picked.segment, true);
        this.currentReward = picked.segment;
        this.animating = false;
        this._slotIndex = null;
        this._revealProgress = 0;
        RTXUserPersist.save();
        App.render();
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
    App.render();
  },

  render() {
    if (!this.visible) return "";

    const segments = Array.isArray(HyperSpin.rewards) ? HyperSpin.rewards : [];
    const spinning = this.animating;
    const slotIdx = typeof this._slotIndex === "number" ? this._slotIndex : 0;
    const slotLabel =
      segments[slotIdx] && segments[slotIdx].label ? String(segments[slotIdx].label) : "—";
    const esc = typeof escapeHtmlAttr === "function" ? escapeHtmlAttr : (s) => String(s);

    const poolList =
      segments.length && !this.currentReward
        ? `<ul class="rtx-hyper-prize-pool${spinning ? " rtx-hyper-prize-pool--during" : ""}" aria-label="Possible rewards">${segments
            .map(
              (s, i) =>
                `<li class="${spinning && i === slotIdx ? "rtx-hyper-prize-row--lit" : ""}">${esc(s.label || "")}</li>`
            )
            .join("")}</ul>`
        : "";

    const slotFrame =
      !this.currentReward
        ? `
        <div class="rtx-hyper-slot ${spinning ? "rtx-hyper-slot--running" : "rtx-hyper-slot--idle"}" aria-live="polite">
          <div class="rtx-hyper-slot__badge">Hyper Spin</div>
          <div class="rtx-hyper-slot__icon" aria-hidden="true">⚡</div>
          <div class="rtx-hyper-slot__label ${spinning && this._revealProgress < 0.82 ? "rtx-hyper-slot__label--blur" : ""}">${esc(
            spinning ? slotLabel : "Ready when you are"
          )}</div>
          <div class="rtx-hyper-slot__sub">${spinning ? "Locking in your reward…" : "Weighted draw from the pool below"}</div>
        </div>
      `
        : "";

    const wonLabel =
      this.currentReward && this.currentReward.label ? String(this.currentReward.label) : "";

    return `
      <div class="modal-overlay rtx-hyper-modal-overlay">
        <div class="modal rtx-hyper-modal">
          <h2>Hyper Spin Unlocked</h2>
          <p class="rtx-hyper-modal-sub">
            Session complete — one bonus draw, same odds as the Hyper Spin page.
          </p>

          ${slotFrame}
          ${poolList}

          ${
            this.currentReward
              ? `<div class="rtx-hyper-result-card rtx-hyper-result-card--pop">You won: ${esc(wonLabel)}</div>`
              : ""
          }

          <div class="rtx-hyper-modal-actions">
          ${
            this.currentReward
              ? `<button type="button" class="btn btn-primary" onclick="GameModal.close()">Continue Surfing</button>`
              : spinning
              ? `<button type="button" class="btn btn-primary" disabled>Drawing…</button>`
              : `<button type="button" class="btn btn-primary" onclick="GameModal.spin()">Draw reward</button>`
          }
          </div>
        </div>
      </div>
    `;
  }
};
