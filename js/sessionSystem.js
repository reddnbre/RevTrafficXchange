const SessionSystem = {
  recordValidView() {
    const creditsEarned = CreditSystem.getCreditsForValidView();

    RTXState.user.viewsToday += 1;
    RTXState.user.sessionViews += 1;
    RTXState.user.credits += creditsEarned;
    if (typeof recordMemberCreditEarnings === "function") {
      recordMemberCreditEarnings(creditsEarned);
    }
    if (typeof recordMemberValidViewLifetime === "function") {
      recordMemberValidViewLifetime();
    }

    if (RTXState.user.sessionViews >= RTXState.settings.viewsPerSession) {
      return { sessionComplete: true, creditsEarned };
    }

    return { sessionComplete: false, creditsEarned };
  },

  completeSession() {
    checkDailyReset();
    const activityMultiplier = getActivityBoostMultiplier();
    RTXState.user.dailyActivity.sessions += 1;
    RTXState.user.dailyActivity.activityScore =
      Math.round((RTXState.user.dailyActivity.activityScore + 25 * activityMultiplier) * 100) / 100;
    RTXState.user.dailyActivity.rewardTier = getDailyRewardTier(RTXState.user.dailyActivity);

    RTXState.user.sessionsCompleted += 1;
    RTXState.user.streak += 1;
    RTXState.user.hyperSpins += 1;
    if (typeof recordMemberHyperSpinEarnedFromSession === "function") {
      recordMemberHyperSpinEarnedFromSession();
    }
    RTXState.user.loyaltyScore += 25;
    RTXUserPersist.save();

    if (typeof RewardUX !== "undefined" && RewardUX && typeof RewardUX.sessionCompletePulse === "function") {
      RewardUX.sessionCompletePulse();
    }
    GameModal.showHyperSpin();
  },

  getSessionProgressPercent() {
    return Math.min(
      100,
      (RTXState.user.sessionViews / RTXState.settings.viewsPerSession) * 100
    );
  }
};
