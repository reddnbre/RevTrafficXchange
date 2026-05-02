const LoyaltyInfo = {
  visible: false,

  open() {
    this.visible = true;
    App.render();
  },

  close() {
    this.visible = false;
    App.render();
  },

  render() {
    if (!this.visible) return "";

    return `
      <div class="loyalty-info-overlay">
        <div class="loyalty-info-card">
          <h3>Loyalty Score</h3>
          <p>Your Loyalty Score grows as you stay active on RevTrafficXchange.</p>
          <p>You build loyalty by:</p>
          <ul class="loyalty-info-list">
            <li>Viewing pages</li>
            <li>Completing 25-page sessions</li>
            <li>Building streaks</li>
            <li>Using Hyper Spins</li>
          </ul>
          <p>Higher Loyalty can improve:</p>
          <ul class="loyalty-info-list">
            <li>Your reward potential</li>
            <li>Your future multiplier level</li>
            <li>Your access to bonus reward events</li>
          </ul>
          <p class="loyalty-info-note">Rewards are based on activity, loyalty, pool availability, and platform conditions. No earnings are guaranteed.</p>
          <button class="btn btn-primary" onclick="LoyaltyInfo.close()">Got it</button>
        </div>
      </div>
    `;
  }
};

const LoyaltyTierInfo = {
  visible: false,

  open() {
    this.visible = true;
    App.render();
  },

  close() {
    this.visible = false;
    App.render();
  },

  render() {
    if (!this.visible) return "";

    return `
      <div class="loyalty-info-overlay">
        <div class="loyalty-info-card">
          <h3>Loyalty Tiers</h3>
          <p>Your Loyalty Tier is based on your Loyalty Score.</p>
          <p>Tiers:</p>
          <ul class="loyalty-info-list">
            <li>Starter: 0-99 points</li>
            <li>Active: 100-499 points</li>
            <li>Committed: 500-1499 points</li>
            <li>Elite: 1500+ points</li>
          </ul>
          <p>Higher tiers can unlock stronger reward potential, better multiplier levels, and future bonus reward events.</p>
          <p>Your tier updates automatically as your Loyalty Score grows.</p>
          <p class="loyalty-info-note">Rewards are based on activity, loyalty, pool availability, and platform conditions. No earnings are guaranteed.</p>
          <button class="btn btn-primary" onclick="LoyaltyTierInfo.close()">Got it</button>
        </div>
      </div>
    `;
  }
};

const DailyActivityInfo = {
  visible: false,

  open() {
    this.visible = true;
    App.render();
  },

  close() {
    this.visible = false;
    App.render();
  },

  render() {
    if (!this.visible) return "";

    return `
      <div class="loyalty-info-overlay">
        <div class="loyalty-info-card daily-activity-info-card">
          <h3>Daily Activity</h3>
          <p>Daily Activity tracks what you do today on RevTrafficXchange.</p>
          <p>It can increase when you:</p>
          <ul class="loyalty-info-list">
            <li>View pages</li>
            <li>Complete 25-page sessions</li>
            <li>Use Hyper Spins</li>
          </ul>
          <p>Your Daily Activity helps determine today’s reward potential.</p>
          <p>Daily Activity resets every day, so staying active each day gives you a better chance to qualify for reward opportunities.</p>
          <p>Your lifetime Loyalty Score does not reset.</p>
          <p class="loyalty-info-note">Rewards are based on activity, loyalty, pool availability, and platform conditions. No earnings are guaranteed.</p>
          <button class="btn btn-primary" onclick="DailyActivityInfo.close()">Got it</button>
        </div>
      </div>
    `;
  }
};

const PremiumRevCoinsInfo = {
  visible: false,

  open() {
    this.visible = true;
    App.render();
  },

  close() {
    this.visible = false;
    App.render();
  },

  render() {
    if (!this.visible) return "";

    return `
      <div class="loyalty-info-overlay">
        <div class="loyalty-info-card daily-activity-info-card">
          <h3>Premium RevCoins</h3>
          <p>Premium RevCoins can currently be used to:</p>
          <ul class="loyalty-info-list">
            <li>Buy extra Hyper Spins</li>
            <li>Unlock future boosts and premium opportunities</li>
          </ul>
          <p>Premium RevCoins do not directly convert to money.</p>
          <p>They are designed to enhance your experience and improve your overall participation.</p>
          <button class="btn btn-primary" onclick="PremiumRevCoinsInfo.close()">Got it</button>
        </div>
      </div>
    `;
  }
};

const PremiumRevCoinsPurchase = {
  visible: false,

  open() {
    console.log("Open premium purchase modal");
    this.visible = true;
    App.render();
  },

  close() {
    this.visible = false;
    App.render();
  },

  render() {
    if (!this.visible) return "";
    return `
      <div class="loyalty-info-overlay">
        <div class="loyalty-info-card premium-coming-soon-card">
          <h3>Get Premium</h3>
          <p>Premium RevCoins purchase flow is coming soon.</p>
          <button class="btn btn-primary" onclick="PremiumRevCoinsPurchase.close()">Got it</button>
        </div>
      </div>
    `;
  }
};

const ActivityBoostCountdown = {
  intervalId: null,
  trackedExpiresAt: 0,

  clear() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.trackedExpiresAt = 0;
  },

  updateDisplay() {
    const textNode = document.getElementById("activity-boost-ends-in");
    if (!textNode) return;
    const timeLeft = getBoostTimeLeftText();
    if (!timeLeft) {
      textNode.textContent = "Ends in: Expired";
      return;
    }
    textNode.textContent = `Ends in: ${timeLeft}`;
  },

  start(expiresAt) {
    const target = Math.max(0, Number(expiresAt) || 0);
    if (!target || target <= Date.now()) {
      this.clear();
      return;
    }

    if (this.intervalId && this.trackedExpiresAt === target) {
      this.updateDisplay();
      return;
    }

    this.clear();
    this.trackedExpiresAt = target;
    this.updateDisplay();

    this.intervalId = setInterval(() => {
      if (Date.now() >= this.trackedExpiresAt) {
        this.clear();
        checkBoostExpiry();
        App.render();
        return;
      }
      this.updateDisplay();
    }, 30000);
  }
};

function manageActivityBoostCountdown() {
  const boost = RTXState.user.activeBoost || {};
  if (boost.type === "activity" && Number(boost.expiresAt) > Date.now()) {
    ActivityBoostCountdown.start(boost.expiresAt);
    return;
  }
  ActivityBoostCountdown.clear();
}

function getDashboardSponsoredTextAd() {
  const textAds = Array.isArray(RTXState.user?.memberCampaigns?.textAds) ? RTXState.user.memberCampaigns.textAds : [];
  const activeAds = textAds.filter((ad) => ad && ad.active && String(ad.targetUrl || "").trim());
  if (!activeAds.length) return null;
  const shuffled = shuffleArray(activeAds);
  return shuffled[0] || null;
}

function getDashboardSponsoredBannerAd() {
  const bannerAds = Array.isArray(RTXState.user?.memberCampaigns?.bannerAds) ? RTXState.user.memberCampaigns.bannerAds : [];
  const activeBanners = bannerAds.filter(
    (ad) => ad && ad.active && String(ad.imageUrl || "").trim() && String(ad.targetUrl || "").trim()
  );
  if (!activeBanners.length) return null;
  const shuffled = shuffleArray(activeBanners);
  return shuffled[0] || null;
}

function handleDashboardTextAdClick(adId) {
  const id = String(adId || "");
  if (!id) return;
  const ads = Array.isArray(RTXState.user?.memberCampaigns?.textAds) ? RTXState.user.memberCampaigns.textAds : [];
  const ad = ads.find((item) => String(item.id) === id);
  if (!ad) return;
  const safeUrl = getSafeSurfUrl(ad.targetUrl);
  if (!safeUrl) return;

  RTXState.user.memberCampaigns.textAds = ads.map((item) =>
    String(item.id) === id
      ? { ...item, clicks: Math.max(0, Number(item.clicks) || 0) + 1 }
      : item
  );
  handleTextAdView(id);
  RTXUserPersist.save();
  window.open(safeUrl, "_blank", "noopener,noreferrer");
}

function handleDashboardBannerAdClick(adId) {
  const id = String(adId || "");
  if (!id) return;
  const ads = Array.isArray(RTXState.user?.memberCampaigns?.bannerAds) ? RTXState.user.memberCampaigns.bannerAds : [];
  const ad = ads.find((item) => String(item.id) === id);
  if (!ad) return;
  const safeUrl = getSafeSurfUrl(ad.targetUrl);
  if (!safeUrl) return;

  RTXState.user.memberCampaigns.bannerAds = ads.map((item) =>
    String(item.id) === id
      ? {
          ...item,
          clicks: Math.max(0, Number(item.clicks) || 0) + 1,
          impressions: Math.max(0, Number(item.impressions) || 0) + 1
        }
      : item
  );
  handleBannerAdView(id);
  RTXUserPersist.save();
  window.open(safeUrl, "_blank", "noopener,noreferrer");
}

function DashboardComponent() {
  const progress = SessionSystem.getSessionProgressPercent();
  const loyalty = getLoyaltyTierInfo(RTXState.user.loyaltyScore);
  const memberHandle = String(RTXState.user.username || "").trim().toLowerCase();
  const welcome =
    memberHandle && typeof App !== "undefined" && App && typeof App.escapeHtml === "function"
      ? `<p class="dashboard-username-welcome">Member: <strong>@${App.escapeHtml(memberHandle)}</strong></p>`
      : "";

  return `
    <section class="hero">
      <div class="hero-grid">
        <div>
          <span class="tag">HYPER MODE TRAFFIC ENGINE</span>
          ${welcome}
          <h1>Surf smarter. Build streaks. Earn traffic power.</h1>
          <p>
            RevTrafficXchange is a modern traffic exchange with timed views,
            session progress, credits, and Hyper Spin bonuses.
          </p>
          <button class="btn btn-primary" onclick="App.navigate('surf')">
            Start Hyper Session
          </button>
        </div>

        <div class="panel">
          <h3>Today’s Session</h3>
          <p>${RTXState.user.sessionViews} / ${RTXState.settings.viewsPerSession} valid views</p>
          <div class="progress-bar">
            <div class="progress-fill" style="width:${progress}%"></div>
          </div>
          <p style="color:var(--muted);margin-top:12px;">
            Multiplier: ${RTXState.user.multiplier}x
          </p>
          <p style="color:var(--muted);margin-top:8px;">
            Loyalty Score: ${RTXState.user.loyaltyScore}
          </p>
          <p style="color:var(--muted);margin-top:8px;">
            Loyalty Multiplier: ${loyalty.multiplier.toFixed(1)}x
          </p>
          <div class="session-line-with-help" style="margin-top:8px;">
            <span style="color:var(--muted);">Loyalty Tier: ${loyalty.tier}</span>
            <button class="loyalty-help-btn" type="button" aria-label="What are Loyalty Tiers?" onclick="LoyaltyTierInfo.open()">?</button>
          </div>
          <p style="color:var(--muted);margin-top:8px;">
            ${loyalty.progressLabel}
          </p>
        </div>
      </div>
    </section>

    ${StatsComponent()}

    <div class="grid-2">
      <div class="panel">
        <h3>Phase 1 Core Loop</h3>
        <div class="rule">✓ View ads with a timer</div>
        <div class="rule">✓ Earn traffic credits</div>
        <div class="rule">✓ Complete 25-view sessions</div>
        <div class="rule">✓ Unlock Hyper Spin after each session</div>
      </div>

      <div class="panel">
        <h3>Reward Logic Later</h3>
        <div class="rule">Free users earn credits only.</div>
        <div class="rule">Paid users can later unlock loyalty rewards.</div>
        <div class="rule">Cash rewards will come from revenue pool only.</div>
      </div>
    </div>

    ${LoyaltyInfo.render()}
    ${LoyaltyTierInfo.render()}
    ${DailyActivityInfo.render()}
    ${PremiumRevCoinsInfo.render()}
    ${PremiumRevCoinsPurchase.render()}
  `;
}

function StatsComponent() {
  const loyalty = getLoyaltyTierInfo(RTXState.user.loyaltyScore);
  const rewardPool = getRewardPoolPreview();
  checkDailyReset();
  checkBoostExpiry();
  manageActivityBoostCountdown();
  const daily = RTXState.user.dailyActivity;
  const boostActive = RTXState.user.activeBoost?.type === "activity";
  const boostTimeLeft = getBoostTimeLeftText();
  const sponsoredTextAd = getDashboardSponsoredTextAd();
  const sponsoredBannerAd = getDashboardSponsoredBannerAd();

  return `
    <section class="stats-grid top-stats-grid">
      <div class="stat-card">
        <div class="stat-label">Traffic Credits</div>
        <div class="stat-value">${RTXState.user.credits}</div>
        <div class="stat-sub">Used to promote links</div>
      </div>

      <div class="stat-card">
        <div class="stat-label stat-label-with-help">
          <span>Daily Activity</span>
          <button class="loyalty-help-btn" type="button" aria-label="What is Daily Activity?" onclick="DailyActivityInfo.open()">?</button>
        </div>
        <div class="stat-value">${daily.activityScore}</div>
        <div class="stat-sub">Today’s Activity Score</div>
        <div class="stat-sub">Today’s Views: ${daily.views}</div>
        <div class="stat-sub">Today’s Sessions: ${daily.sessions}</div>
        <div class="stat-sub">Daily Reward Tier: ${daily.rewardTier}</div>
        <div class="stat-sub">Daily reward progress resets every day. Stay active today to improve today’s reward potential.</div>
      </div>

      <div class="stat-card">
        <div class="stat-label stat-label-with-help">
          <span>Loyalty Score</span>
          <button class="loyalty-help-btn" type="button" aria-label="What is Loyalty Score?" onclick="LoyaltyInfo.open()">?</button>
        </div>
        <div class="stat-value">${RTXState.user.loyaltyScore || 0}</div>
        <div class="stat-sub">Loyalty Multiplier: ${loyalty.multiplier.toFixed(1)}x</div>
        <div class="stat-sub">Tier: ${loyalty.tier}</div>
        <div class="stat-sub">${loyalty.progressLabel}</div>
      </div>
    </section>

    <section class="wallet-rewards-section">
      <h3 class="wallet-rewards-title">Wallet & Rewards</h3>
      <div class="wallet-rewards-grid">
        <div class="stat-card reward-pool-mini">
          <div class="stat-label">Loyalty Reward Pool</div>
          <div class="stat-value reward-pool-mini-value">$${rewardPool.totalPoolBalance.toFixed(2)} Available</div>
          <div class="stat-sub">Reward Eligibility: Building</div>
          <div class="stat-sub reward-pool-mini-status">⚡ Status: Warming Up</div>
          <div class="stat-sub">Stay active to unlock better reward opportunities.</div>
          <div class="stat-sub reward-pool-mini-note">No earnings guaranteed.</div>
        </div>

        <div class="stat-card premium-revcoins-card">
          <div class="stat-label stat-label-with-help">
            <span>Premium RevCoins</span>
            <button class="loyalty-help-btn" type="button" aria-label="What are Premium RevCoins?" onclick="PremiumRevCoinsInfo.open()">?</button>
          </div>
          <div class="stat-value premium-revcoins-value">${RTXState.user.premiumRevCoins || 0}</div>
        <div class="stat-sub">Buy spins now, unlock future boosts later</div>
          <div class="stat-sub">Available Hyper Spins: ${RTXState.user.hyperSpins || 0}</div>
        ${
          boostActive
            ? `
              <div class="premium-spin-feedback success">⚡ Activity Boost Active (20%)</div>
              <div class="stat-sub" id="activity-boost-ends-in">Ends in: ${boostTimeLeft || "Soon"}</div>
            `
            : ""
        }
          ${
            RTXState.ui.premiumSpinFeedback
              ? `<div class="premium-spin-feedback ${RTXState.ui.premiumSpinFeedbackTone}">${RTXState.ui.premiumSpinFeedback}</div>`
              : ""
          }
        <button class="premium-revcoins-btn" type="button" onclick="buyActivityBoost()">Activate Boost (20)</button>
          <button class="premium-revcoins-btn" type="button" onclick="buyHyperSpin()">Buy Spin (10)</button>
          <button class="premium-revcoins-btn" type="button" onclick="PremiumRevCoinsPurchase.open()">Get Premium</button>
        </div>
      </div>
    </section>

    <section class="dashboard-sponsored-section">
      <div class="dashboard-sponsored-grid">
        <div class="stat-card dashboard-sponsored-card">
          <div class="stat-label">Sponsored Text Ad</div>
          ${
            sponsoredTextAd
              ? `
                <div class="dashboard-sponsored-title">${sponsoredTextAd.title || "Sponsored Listing"}</div>
                <div class="dashboard-sponsored-desc">${sponsoredTextAd.description || "Discover this member promotion."}</div>
                <button class="premium-revcoins-btn dashboard-sponsored-btn" type="button" onclick="handleDashboardTextAdClick('${sponsoredTextAd.id}')">
                  Visit Offer
                </button>
              `
              : `<div class="stat-sub">No sponsored text ads available.</div>`
          }
        </div>

        <div class="stat-card dashboard-sponsored-card">
          <div class="stat-label">Sponsored Banner</div>
          ${
            sponsoredBannerAd
              ? `
                <button
                  class="dashboard-banner-click"
                  type="button"
                  aria-label="Open sponsored banner"
                  onclick="handleDashboardBannerAdClick('${sponsoredBannerAd.id}')"
                >
                  <img class="dashboard-banner-image" src="${sponsoredBannerAd.imageUrl}" alt="Sponsored banner" loading="lazy" />
                </button>
              `
              : `<div class="stat-sub">No sponsored banners available.</div>`
          }
        </div>
      </div>
    </section>

    <section class="stats-grid secondary-stats-grid">
      <div class="stat-card">
        <div class="stat-label">Views Today</div>
        <div class="stat-value">${RTXState.user.viewsToday}</div>
        <div class="stat-sub">Valid timed views</div>
      </div>

      <div class="stat-card">
        <div class="stat-label">Hyper Streak</div>
        <div class="stat-value">${RTXState.user.streak}</div>
        <div class="stat-sub">Sessions completed</div>
      </div>

      <div class="stat-card">
        <div class="stat-label">Multiplier</div>
        <div class="stat-value">${RTXState.user.multiplier}x</div>
        <div class="stat-sub">Applies to credit earnings</div>
      </div>
    </section>
  `;
}
