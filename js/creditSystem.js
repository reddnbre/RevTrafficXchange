const CreditSystem = {
  addCredits(amount) {
    const n = Number(amount) || 0;
    RTXState.user.credits += n;
    if (typeof recordMemberCreditEarnings === "function" && n > 0) {
      recordMemberCreditEarnings(n);
    }
    RTXUserPersist.save();
    App.render();
  },

  getCreditsForValidView() {
    return Math.round(RTXState.settings.baseCreditsPerView * RTXState.user.multiplier);
  }
};
