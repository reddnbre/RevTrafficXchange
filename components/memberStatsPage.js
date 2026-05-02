function memberStatsFormatInt(n) {
  const v = Math.max(0, Math.floor(Number(n) || 0));
  return v.toLocaleString();
}

function MemberStatsPageComponent() {
  checkDailyReset();
  normalizeDailyActivity();
  normalizeLifetimeStats();

  const daily = RTXState.user.dailyActivity || {};
  const life = RTXState.user.lifetimeStats || {};
  const creditsBalance = Math.max(0, Math.floor(Number(RTXState.user.credits) || 0));
  const spinsBalance = Math.max(0, Math.floor(Number(RTXState.user.hyperSpins) || 0));

  const row = (label, detail, todayVal, lifeVal) => `
    <tr class="member-stats-row">
      <th scope="row" class="member-stats-metric">
        <span class="member-stats-label">${label}</span>
        ${detail ? `<span class="member-stats-detail">${detail}</span>` : ""}
      </th>
      <td class="member-stats-values"><span class="member-stats-today">${memberStatsFormatInt(todayVal)}</span><span class="member-stats-sep" aria-hidden="true">/</span><span class="member-stats-life">${memberStatsFormatInt(lifeVal)}</span></td>
    </tr>
  `;

  return `
    <section class="terms-page member-stats-page" aria-labelledby="member-stats-heading">
      <header class="my-sites-header">
        <h1 id="member-stats-heading" class="my-sites-title">My Stats</h1>
        <p class="my-sites-subtitle">Today (calendar day) vs all-time. Daily columns reset at midnight for reward-pool style criteria; the right column is your lifetime total on this device.</p>
      </header>

      <div class="member-stats-legend panel" role="note">
        <span class="member-stats-legend-strong">Format:</span> today / all-time
      </div>

      <div class="panel member-stats-panel-wrap">
        <table class="member-stats-table">
          <caption class="member-stats-caption">Member activity</caption>
          <thead>
            <tr>
              <th scope="col">Metric</th>
              <th scope="col">Today / All-time</th>
            </tr>
          </thead>
          <tbody>
            ${row("Credits earned", "Surf, spotlight, mini-games, Hyper Spin payouts", daily.creditsEarned || 0, life.creditsEarned || 0)}
            ${row("Valid surf views", "Counted when a view is credited", daily.views || 0, life.validViews || 0)}
            ${row("Sessions finished", "Full surf sessions completed", daily.sessions || 0, RTXState.user.sessionsCompleted || 0)}
            ${row("Hyper Spins earned", "From completed surf sessions", daily.hyperSpinsEarned || 0, life.hyperSpinsEarned || 0)}
            ${row("Hyper Spins used", "Wheel spins (activity score +5 each)", daily.hyperSpinsUsed || 0, life.hyperSpinsUsed || 0)}
          </tbody>
        </table>
      </div>

      <div class="member-stats-balance-grid">
        <article class="panel member-stats-balance-card">
          <h3 class="member-stats-balance-title">Current balances</h3>
          <p class="member-stats-balance-line">Credits in wallet: <strong>${memberStatsFormatInt(creditsBalance)}</strong></p>
          <p class="member-stats-balance-line">Hyper Spins available: <strong>${memberStatsFormatInt(spinsBalance)}</strong></p>
        </article>
        <article class="panel member-stats-balance-card">
          <h3 class="member-stats-balance-title">Loyalty (all-time)</h3>
          <p class="member-stats-balance-line">Loyalty score: <strong>${memberStatsFormatInt(RTXState.user.loyaltyScore)}</strong></p>
          <p class="member-stats-balance-line">Tier: <strong>${getLoyaltyTierInfo(RTXState.user.loyaltyScore).tier}</strong></p>
        </article>
        <article class="panel member-stats-balance-card">
          <h3 class="member-stats-balance-title">Today’s activity score</h3>
          <p class="member-stats-balance-line">Activity score: <strong>${memberStatsFormatInt(daily.activityScore)}</strong></p>
          <p class="member-stats-balance-line">Daily reward tier: <strong>${daily.rewardTier || "Not Qualified"}</strong></p>
        </article>
      </div>
    </section>
  `;
}
