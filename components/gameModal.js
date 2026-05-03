const GameModal = {
  currentReward: null,
  visible: false,
  animating: false,

  showHyperSpin() {
    this.visible = true;
    this.currentReward = null;
    this.animating = false;
    App.render();
  },

  spin() {
    if (this.animating || (typeof HyperSpinWheel !== "undefined" && HyperSpinWheel.isAnimating)) return;
    const picked = HyperSpin.pickReward();
    this.animating = true;
    App.render();
    const run = () => {
      if (typeof HyperSpinWheel === "undefined" || !HyperSpinWheel.startSpin) {
        HyperSpin.applyReward(picked.reward, true);
        this.currentReward = picked.reward;
        this.animating = false;
        RTXUserPersist.save();
        App.render();
        return;
      }
      HyperSpinWheel.startSpin({
        diskId: "hyperspin-modal-wheel-disk",
        rewardIndex: picked.index,
        reward: picked.reward,
        onComplete: (reward) => {
          HyperSpin.applyReward(reward, true);
          this.currentReward = reward;
          this.animating = false;
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
    App.render();
  },

  render() {
    if (!this.visible) return "";

    const wheelReady = typeof HyperSpinWheel !== "undefined" && HyperSpinWheel.renderHTML;
    const wheelHtml = wheelReady
      ? HyperSpinWheel.renderHTML({ diskId: "hyperspin-modal-wheel-disk", stageClass: "hyperspin-wheel-stage--compact" })
      : "";

    const showWheel = !this.currentReward;
    const spinning = this.animating;

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
              ? `<div class="spin-result">${this.currentReward.label}</div>`
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
