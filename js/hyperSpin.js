const HyperSpin = {
  premiumSpinCost: 10,
  /** Reward pool for weighted random draws (`pickWinningSegment`). */
  rewards: [
    { label: "+5 Credits", type: "credits", value: 5, weight: 35 },
    { label: "+10 Credits", type: "credits", value: 10, weight: 25 },
    { label: "+20 Credits", type: "credits", value: 20, weight: 15 },
    { label: "1.2x Multiplier", type: "multiplier", value: 1.2, weight: 12 },
    { label: "1.5x Multiplier", type: "multiplier", value: 1.5, weight: 6 },
    { label: "No Bonus", type: "none", value: 0, weight: 7 }
  ],

  /**
   * Weighted random segment index.
   * @returns {{ winningIndex: number, segment: object }}
   */
  pickWinningSegment() {
    const segments = this.rewards;
    const totalWeight = segments.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);
    let roll = Math.random() * totalWeight;
    for (let i = 0; i < segments.length; i++) {
      roll -= Number(segments[i].weight) || 0;
      if (roll <= 0) return { winningIndex: i, segment: segments[i] };
    }
    return { winningIndex: 0, segment: segments[0] };
  },

  spin() {
    const { segment } = this.pickWinningSegment();
    return this.applyReward(segment);
  },

  applyReward(reward, skipRender) {
    checkDailyReset();
    RTXState.user.dailyActivity.hyperSpinsUsed += 1;
    RTXState.user.dailyActivity.activityScore += 5;
    RTXState.user.dailyActivity.rewardTier = getDailyRewardTier(RTXState.user.dailyActivity);
    if (typeof recordMemberHyperSpinUsedLifetime === "function") {
      recordMemberHyperSpinUsedLifetime();
    }

    if (reward.type === "credits") {
      RTXState.user.credits += reward.value;
      if (typeof recordMemberCreditEarnings === "function") {
        recordMemberCreditEarnings(reward.value);
      }
    }

    if (reward.type === "multiplier") {
      RTXState.user.multiplier = reward.value;
    }

    RTXState.user.loyaltyScore += 5;
    RTXUserPersist.save();

    if (!skipRender && typeof App !== "undefined" && App && typeof App.render === "function") {
      App.render();
    }
    if (typeof RewardUX !== "undefined" && RewardUX && typeof RewardUX.onHyperSpinApplied === "function") {
      if (reward.type !== "credits") {
        RewardUX.onHyperSpinApplied(reward);
      }
    }
    return reward;
  },

  /**
   * Decelerating “slot” ticks ending on `winningIndex` (chosen before calling this).
   * @param {{ winningIndex: number, isCancelled?: () => boolean, onTick?: (index: number, progress01: number) => void, onComplete?: () => void }} opts
   */
  runDrawReveal(opts) {
    const o = opts || {};
    const winningIndex = o.winningIndex;
    const isCancelled = typeof o.isCancelled === "function" ? o.isCancelled : () => false;
    const onTick = typeof o.onTick === "function" ? o.onTick : null;
    const onComplete = typeof o.onComplete === "function" ? o.onComplete : null;
    const segments = this.rewards;
    const n = segments.length;
    if (n < 1 || typeof winningIndex !== "number" || winningIndex < 0 || winningIndex >= n) {
      if (onComplete) onComplete();
      return;
    }
    const minSteps = 20;
    const maxSteps = 34;
    const stepCount = minSteps + Math.floor(Math.random() * (maxSteps - minSteps + 1));
    const seq = [];
    for (let i = 0; i < stepCount - 1; i++) {
      seq.push(Math.floor(Math.random() * n));
    }
    seq.push(winningIndex);

    let i = 0;
    const step = () => {
      if (isCancelled()) return;
      if (i >= seq.length) {
        setTimeout(() => {
          if (!isCancelled() && onComplete) onComplete();
        }, 400);
        return;
      }
      const progress = i / Math.max(1, seq.length - 1);
      if (onTick) onTick(seq[i], progress);
      const delay = 24 + Math.floor(progress * progress * 280);
      i++;
      setTimeout(step, delay);
    };
    step();
  }
};

function setPremiumSpinFeedback(message, tone) {
  RTXState.ui.premiumSpinFeedback = message;
  RTXState.ui.premiumSpinFeedbackTone = tone || "neutral";
  App.render();
}

function buyHyperSpin() {
  const cost = HyperSpin.premiumSpinCost;
  const currentTokens = Math.max(0, Number(RTXState.user.premiumRevCoins) || 0);
  const currentSpins = Math.max(0, Number(RTXState.user.hyperSpins) || 0);

  if (!Number.isFinite(currentSpins) || currentSpins >= Number.MAX_SAFE_INTEGER) {
    setPremiumSpinFeedback("Cannot add more Hyper Spins right now", "error");
    return;
  }

  if (currentTokens < cost) {
    setPremiumSpinFeedback("Not enough Premium RevCoins", "error");
    return;
  }

  RTXState.user.premiumRevCoins = currentTokens - cost;
  RTXState.user.hyperSpins = currentSpins + 1;
  RTXUserPersist.save();
  setPremiumSpinFeedback("Hyper Spin added!", "success");
  if (typeof RewardUX !== "undefined" && RewardUX && typeof RewardUX.pulse === "function") {
    RewardUX.pulse("Hyper Spin added — head to Hyper Spin to draw", "success");
  }

  setTimeout(() => {
    if (RTXState.ui.premiumSpinFeedback === "Hyper Spin added!") {
      RTXState.ui.premiumSpinFeedback = "";
      RTXState.ui.premiumSpinFeedbackTone = "neutral";
      App.render();
    }
  }, 2200);
}
