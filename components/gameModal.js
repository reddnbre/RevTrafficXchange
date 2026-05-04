const GameModal = {
  currentReward: null,
  visible: false,
  animating: false,
  _drawTimer: null,

  showHyperSpin() {
    if (this._drawTimer) {
      clearTimeout(this._drawTimer);
      this._drawTimer = null;
    }
    this.visible = true;
    this.currentReward = null;
    this.animating = false;
    App.render();
  },

  spin() {
    if (this.animating) return;
    const picked = HyperSpin.pickWinningSegment();
    this.animating = true;
    App.render();

    const finish = () => {
      this._drawTimer = null;
      HyperSpin.applyReward(picked.segment, true);
      this.currentReward = picked.segment;
      this.animating = false;
      RTXUserPersist.save();
      App.render();
    };

    this._drawTimer = setTimeout(finish, 550);
  },

  close() {
    if (this._drawTimer) {
      clearTimeout(this._drawTimer);
      this._drawTimer = null;
    }
    this.visible = false;
    this.currentReward = null;
    this.animating = false;
    App.render();
  },

  render() {
    if (!this.visible) return "";

    const segments = Array.isArray(HyperSpin.rewards) ? HyperSpin.rewards : [];
    const poolList =
      segments.length && !this.currentReward
        ? `<ul class="rtx-hyper-prize-pool" aria-label="Possible rewards">${segments
            .map((s) => `<li>${typeof escapeHtmlAttr === "function" ? escapeHtmlAttr(s.label || "") : s.label || ""}</li>`)
            .join("")}</ul>`
        : "";

    const spinning = this.animating;

    const wonLabel =
      this.currentReward && this.currentReward.label ? String(this.currentReward.label) : "";

    return `
      <div class="modal-overlay rtx-hyper-modal-overlay">
        <div class="modal rtx-hyper-modal">
          <h2>Hyper Spin Unlocked</h2>
          <p class="rtx-hyper-modal-sub">
            Session complete. Draw a random bonus from the pool below.
          </p>

          ${poolList}

          ${
            spinning
              ? `<div class="rtx-hyper-drawing-hint" aria-live="polite">Drawing reward…</div>`
              : ""
          }

          ${
            this.currentReward
              ? `<div class="rtx-hyper-result-card">You won: ${typeof escapeHtmlAttr === "function" ? escapeHtmlAttr(wonLabel) : wonLabel}</div>`
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
