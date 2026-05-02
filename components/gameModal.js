const GameModal = {
  currentReward: null,
  visible: false,

  showHyperSpin() {
    this.visible = true;
    this.currentReward = null;
    App.render();
  },

  spin() {
    this.currentReward = HyperSpin.spin();
    this.visible = true;
    App.render();
  },

  close() {
    this.visible = false;
    this.currentReward = null;
    App.render();
  },

  render() {
    if (!this.visible) return "";

    return `
      <div class="modal-overlay">
        <div class="modal">
          <h2>Hyper Spin Unlocked!</h2>
          <p style="color:var(--muted);">
            Session complete. Spin for a bonus.
          </p>

          ${
            this.currentReward
              ? `<div class="spin-result">${this.currentReward.label}</div>`
              : `<div class="spin-result">Ready?</div>`
          }

          ${
            this.currentReward
              ? `<button class="btn btn-primary" onclick="GameModal.close()">Continue Surfing</button>`
              : `<button class="btn btn-primary" onclick="GameModal.spin()">Spin Now</button>`
          }
        </div>
      </div>
    `;
  }
};
