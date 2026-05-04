const CreditSystem = {
  addCredits(amount) {
    const n = Number(amount) || 0;
    RTXState.user.credits += n;
    if (typeof recordMemberCreditEarnings === "function" && n > 0) {
      recordMemberCreditEarnings(n);
    }
    RTXUserPersist.save();
    if (
      typeof SurfEngine !== "undefined" &&
      SurfEngine &&
      typeof SurfEngine.refreshSurfIfLive === "function" &&
      SurfEngine.refreshSurfIfLive()
    ) {
      return;
    }
    if (typeof App !== "undefined" && App && typeof App.render === "function") {
      App.render();
    }
  },

  getCreditsForValidView() {
    return Math.round(RTXState.settings.baseCreditsPerView * RTXState.user.multiplier);
  }
};
