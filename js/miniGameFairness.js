(function () {
  if (!window.MiniGameSystem) return;

  const system = window.MiniGameSystem;
  const perfectThresholdDeg = 10;
  const goodThresholdDeg = 28;

  system.resolveSafeCrackerGame = function resolveSafeCrackerGameFairly() {
    if (!this.active || this.activeGameType !== "safeCracker" || this.gamePhase !== "playing" || this.safeCrackerResolved) return;

    this.safeCrackerResolved = true;
    this.cleanupSafeCrackerGame();

    const nearestDelta = this.getSafeCrackerNearestDelta();
    const roundedDelta = Math.round(nearestDelta);
    const isPerfect = nearestDelta <= perfectThresholdDeg;
    const isGood = !isPerfect && nearestDelta <= goodThresholdDeg;
    const isHit = isPerfect || isGood;

    this.result = isPerfect
      ? { key: "perfect", label: `Perfect lock! ${roundedDelta}deg from center.`, tone: "success" }
      : isGood
        ? { key: "good", label: `Good lock! ${roundedDelta}deg from center.`, tone: "info" }
        : { key: "miss", label: `Miss. ${roundedDelta}deg from the nearest zone.`, tone: "fail" };

    this.rewardResult = this.applyRewardForHitOrMiss(isHit, isPerfect ? "perfect" : isGood ? "good" : "miss");
    RTXUserPersist.save();
    this.gamePhase = "result";
    this.renderSafeCrackerGame();
  };
})();
