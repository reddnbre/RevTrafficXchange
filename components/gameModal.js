const GameModal = {
  currentReward: null,
  visible: false,
  animating: false,
  _spinPick: null,

  showHyperSpin() {
    this.visible = true;
    this.currentReward = null;
    this.animating = false;
    this._spinPick = null;
    App.render();
  },

  spin() {
    if (this.animating || (typeof HyperSpinWheel !== "undefined" && HyperSpinWheel.isAnimating)) return;
    const picked = HyperSpin.pickWinningSegment();
    this._spinPick = picked;
    this.animating = true;
    App.render();
    const run = () => {
      if (typeof HyperSpinWheel === "undefined" || !HyperSpinWheel.startSpin) {
        HyperSpin.applyReward(picked.segment, true);
        this.currentReward = picked.segment;
        this.animating = false;
        this._spinPick = null;
        RTXUserPersist.save();
        App.render();
        return;
      }
      HyperSpinWheel.startSpin({
        diskId: "hyperspin-modal-wheel-disk",
        winningIndex: picked.winningIndex,
        segment: picked.segment,
        onComplete: () => {
          HyperSpin.applyReward(picked.segment, true);
          this.currentReward = picked.segment;
          this.animating = false;
          this._spinPick = null;
          RTXUserPersist.save();
          App.render();
        }
      });
    };
    if (typeof queueMicrotask === "function") {
      queueMicrotask(run);
    } else {
      setTimeout(run, 0);
    }
  },

  close() {
    this.visible = false;
    this.currentReward = null;
    this.animating = false;
    this._spinPick = null;
    App.render();
  },

  render() {
    if (!this.visible) return "";

    const wheelReady = typeof HyperSpinWheel !== "undefined" && HyperSpinWheel.renderHTML;
    const highlightIndex =
      this.animating && this._spinPick && typeof this._spinPick.winningIndex === "number"
        ? this._spinPick.winningIndex
        : null;
    const wheelHtml = wheelReady
      ? HyperSpinWheel.renderHTML({
          diskId: "hyperspin-modal-wheel-disk",
          stageClass: "hyperspin-wheel-stage--compact",
          highlightIndex
        })
      : "";

    const showWheel = !this.currentReward;
    const spinning = this.animating;

    const wonLabel =
      this.currentReward && this.currentReward.label ? String(this.currentReward.label) : "";

    return `
      <div class="modal-overlay">
        <div class="modal hyper-spin-modal">
          <h2>Hyper Spin Unlocked!</h2>
          <p style="color:var(--muted); margin-bottom: 8px;">
            Session complete. Spin the wheel for a bonus.
          </p>

          ${
            showWheel
              ? `
            <div class="hyperspin-wheel-wrap">
              ${wheelHtml}
              ${spinning ? `<div class="hyperspin-spinning-hint" aria-live="polite">Spinning…</div>` : ""}
            </div>
          `
              : ""
          }

          ${
            this.currentReward
              ? `<div class="spin-result">You won: ${typeof escapeHtmlAttr === "function" ? escapeHtmlAttr(wonLabel) : wonLabel}</div>`
              : ""
          }

          ${
            this.currentReward
              ? `<button type="button" class="btn btn-primary" onclick="GameModal.close()">Continue Surfing</button>`
              : spinning
              ? `<button type="button" class="btn btn-primary" disabled>Spinning…</button>`
              : `<button type="button" class="btn btn-primary" onclick="GameModal.spin()">Spin Now</button>`
          }
        </div>
      </div>
    `;
  }
};
