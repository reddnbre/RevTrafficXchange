// Global app state for Phase 1.
// Later this can be replaced with backend/database values.

function createDefaultUserState(userId) {
  const resolvedUserId = String(userId || "").trim() || "__guest__";
  return {
    id: resolvedUserId,
    credits: 0,
    premiumRevCoins: 0,
    viewsToday: 0,
    sessionViews: 0,
    sessionsCompleted: 0,
    hyperSpins: 0,
    streak: 0,
    loyaltyScore: 0,
    multiplier: 1,
    isPaid: false,
    isAdmin: true,
    activeBoost: {
      type: null,
      multiplier: 1,
      expiresAt: 0
    },
    activeTrafficBoost: {
      active: false,
      multiplier: 1,
      expiresAt: 0
    },
    dailyActivity: {
      date: "",
      views: 0,
      sessions: 0,
      activityScore: 0,
      hyperSpinsUsed: 0,
      hyperSpinsEarned: 0,
      creditsEarned: 0,
      rewardTier: "Not Qualified"
    },
    lifetimeStats: {
      validViews: 0,
      creditsEarned: 0,
      hyperSpinsUsed: 0,
      hyperSpinsEarned: 0
    },
    membershipLevel: "free",
    /** Qualifying platform spend ($) for pool eligibility/cap — not traffic credits. */
    qualifiedSpend: 0,
    username: "",
    /** Set once from ?ref= on splash when account is first created in this browser (local demo). */
    referredByUsername: "",
    lastSpotlightCreditAt: 0,
    recentHyperSpinHistory: [],
    memberCampaigns: {
      surfUrls: [],
      textAds: [],
      bannerAds: []
    },
    viewedAdRewards: {
      textAds: [],
      banners: []
    }
  };
}

const RTXState = {
  currentView: "dashboard",

  session: {
    currentUserId: "",
    isAuthenticated: false
  },
  user: createDefaultUserState("__guest__"),
  ui: {
    premiumSpinFeedback: "",
    premiumSpinFeedbackTone: "neutral",
    trafficBoostFeedback: "",
    trafficBoostFeedbackTone: "neutral",
    adsDropdownOpen: false,
    rewardsAckVisible: true,
    rewardsAckChecked: false,
    loginError: "",
    referralCopyFeedback: "",
    /** When logged out: show marketing splash vs local sign-in form. */
    preAuthScreen: "splash",
    /** Simple math captcha for local demo login (sum of loginCaptchaA + loginCaptchaB). */
    loginCaptchaA: 0,
    loginCaptchaB: 0,
    loginCaptchaSum: 0,
    /** Ephemeral toast from RewardUX (display only). */
    rewardToast: null
  },

  settings: {
    adTimerSeconds: 8,
    viewsPerSession: 25,
    baseCreditsPerView: 1
  },

  rewardPoolSettings: {
    platformSharePercent: 40,
    reservePercent: 20,
    rewardPoolPercent: 40,
    cycleReleasePercent: 30,
    dailyReleasePercent: 10
  },

  /** Simulated pool levels; adaptive release adjusts cycle/daily % only (revenue split unchanged). */
  rewardPoolAdaptive: {
    targetPoolBalance: 100000,
    currentPoolBalance: 0,
    /** After first save, legacy 85k demo seed is cleared to 0 for pool testing. */
    demoBaselineCleared: false
  },

  /**
   * Local testing: log when admin simulates purchases / upgrades into the pool.
   * Persisted with admin state; clear in admin when resetting pool if needed later.
   */
  rewardPoolTesting: {
    contributions: []
  },

  miniGameSettings: {
    triggerBaseChance: 8,
    triggerSessionChance: 25,
    /** Every N valid views today guarantees a mini-game (0 = off, random only). */
    triggerEveryNSurfs: 15,
    cooldownMinutes: 2,
    coinDropPerfectPercent: 5,
    coinDropGoodPercent: 3,
    noRewardPercent: 25,
    creditMin: 2,
    creditMax: 5,
    miniBoostMultiplier: 1.1,
    miniBoostMinutes: 10
  },

  /** Internal caps for mini-game payouts; not shown in member UI. */
  miniGameProfitSafeguards: {
    notionalPoolBalance: 10000,
    maxCreditsEquivPerMiniGame: 500,
    coinCreditsEquiv: 35,
    boostApplyCreditsEquiv: 12,
    softThrottleAfterGrants: 10,
    softThrottleCoinGoodDelta: 1.5,
    maxStackedBoostMultiplier: 1.35
  },

  sampleCampaigns: [
    { title: "RevEmpire Promo", url: "https://revempire.net" },
    { title: "Traffic Builder Demo", url: "https://example.com" },
    { title: "Blog Traffic Push", url: "https://example.org" }
  ],

  spotlight: {
    timerSeconds: 12,
    secondsLeft: 12,
    isRunning: false,
    canContinue: false,
    activeIndex: 0,
    creditMessage: "",
    creditedThisView: false,
    initialized: false
  },

  activeCampaignIndex: 0,
  sessionActive: false,
  sessionCompleted: false,
  adminView: "users",
  admin: {
    users: [
      {
        id: "user1",
        email: "test@example.com",
        credits: 100,
        loyaltyScore: 120,
        status: "active"
      }
    ],
    surfAds: [
      {
        id: "ad1",
        url: "https://example.com",
        active: true,
        timerSec: 20,
        credits: 1,
        views: 0,
        maxViews: 100,
        owner: "admin"
      }
    ],
    spotlightAds: [
      // { id, title, url, active, priority, startAt, endAt, views, createdAt }
    ],
    revenuePreview: {
      simulatedRevenue: 100,
      notes: ""
    },
    /**
     * Simulated ledger: where test “revenue” lands after split (admin site share, ops reserve).
     * Member reward pool balance lives in rewardPoolAdaptive.currentPoolBalance.
     */
    revenueTreasury: {
      platformBalance: 0,
      reserveBalance: 0,
      withdrawalLog: []
    },
    /** Monetag / meta verification / ad tags — also export to index.html or window.RTX_SITE_EMBED for all visitors. */
    siteEmbed: {
      headHtml: "",
      bodyHtml: ""
    }
  },
  surfPaused: false,

  antiCheat: {
    tabWasHidden: false,
    mouseMoved: false,
    lastMouseMove: Date.now(),
    captchaRequired: false,
    captchaSolved: false,
    captchaPrompt: "What is 3 + 4?",
    captchaAnswer: 7,
    viewsSinceCaptcha: 0,
    captchaEveryMin: 5,
    captchaEveryMax: 10,
    nextCaptchaAt: 7,
    statusMessage: "",
    popupMessage: "",
    popupVisible: false,
    invalidationNotified: false
  }
};

/** Local allowlist for admin UI (lowercase). Not derived from persisted user state. */
const ADMIN_EMAILS = ["reddnbre@gmail.com"];

function isAdminUser() {
  if (!RTXState.session || !RTXState.session.isAuthenticated) return false;
  const id = String(RTXState.session.currentUserId || "").trim().toLowerCase();
  return ADMIN_EMAILS.includes(id);
}

/** Last “logged in” email user id for local auto-login (fake auth). */
const RTXSessionAuth = {
  lastUserKey: "rtx_last_user_id_v1"
};

/** Persist core user stats (credits, streak, hyperSpins, loyaltyScore, etc.) across refresh. */
const RTXUserPersist = {
  keyPrefix: "rtx_user_state_v1",

  getStorageKey() {
    if (!RTXState.session || !RTXState.session.isAuthenticated) {
      return `${this.keyPrefix}:__guest__`;
    }
    const sessionId = String(RTXState.session.currentUserId || "").trim();
    const userId = sessionId || "__guest__";
    return `${this.keyPrefix}:${userId}`;
  },

  load() {
    const userId = getCurrentUserId();
    RTXState.user = createDefaultUserState(userId);
    try {
      const raw = localStorage.getItem(this.getStorageKey());
      if (!raw) {
        normalizeDailyActivity();
        normalizeMemberCampaigns();
        normalizeViewedAdRewards();
        normalizeActiveTrafficBoost();
        normalizeMiniGameUserRewardLedger();
        normalizeLifetimeStats();
        normalizeUserQualifiedSpend();
        normalizeUserProfile();
        normalizeReferredByUsername();
        return;
      }
      const data = JSON.parse(raw);
      if (data && typeof data === "object") {
        Object.assign(RTXState.user, data);
      }
    } catch (e) {
      /* ignore corrupt storage */
    }
    RTXState.user.id = userId;
    if (typeof RTXState.user.loyaltyScore !== "number" || Number.isNaN(RTXState.user.loyaltyScore)) {
      RTXState.user.loyaltyScore = 0;
    }
    if (typeof RTXState.user.premiumRevCoins !== "number" || Number.isNaN(RTXState.user.premiumRevCoins)) {
      RTXState.user.premiumRevCoins = 0;
    }
    if (typeof RTXState.user.lastSpotlightCreditAt !== "number" || Number.isNaN(RTXState.user.lastSpotlightCreditAt)) {
      RTXState.user.lastSpotlightCreditAt = 0;
    }
    if (typeof RTXState.user.qualifiedSpend !== "number" || Number.isNaN(RTXState.user.qualifiedSpend)) {
      RTXState.user.qualifiedSpend = 0;
    }
    if (!Array.isArray(RTXState.user.recentHyperSpinHistory)) {
      RTXState.user.recentHyperSpinHistory = [];
    } else {
      RTXState.user.recentHyperSpinHistory = RTXState.user.recentHyperSpinHistory
        .map((entry) => ({
          id: String(entry && entry.id ? entry.id : `spin_${Date.now()}`),
          label: String(entry && entry.label ? entry.label : "Spin complete"),
          time: String(entry && entry.time ? entry.time : "")
        }))
        .slice(0, 3);
    }
    normalizeDailyActivity();
    normalizeMemberCampaigns();
    normalizeViewedAdRewards();
    normalizeActiveTrafficBoost();
    normalizeMiniGameUserRewardLedger();
    normalizeLifetimeStats();
    normalizeUserQualifiedSpend();
    normalizeUserProfile();
    normalizeReferredByUsername();
  },

  save() {
    if (!RTXState.session || !RTXState.session.isAuthenticated) return;
    try {
      RTXState.user.id = getCurrentUserId();
      localStorage.setItem(this.getStorageKey(), JSON.stringify(RTXState.user));
    } catch (e) {
      /* ignore quota / private mode */
    }
  }
};

function normalizeUserProfile() {
  if (!RTXState.session || !RTXState.session.isAuthenticated) return;
  if (getCurrentUserId() === "__guest__") return;
  let u = String(RTXState.user.username || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");
  if (u.length > 24) u = u.slice(0, 24);
  if (!u) {
    const id = String(RTXState.session.currentUserId || "").trim().toLowerCase();
    const at = id.indexOf("@");
    let local = at > 0 ? id.slice(0, at) : id;
    local = local.replace(/[^a-z0-9_]/g, "");
    if (local.length < 3) {
      local = `${local}rtx`.replace(/[^a-z0-9_]/g, "");
    }
    u = (local || "member").slice(0, 24);
  }
  RTXState.user.username = u;
}

function normalizeReferredByUsername() {
  let ref = String(RTXState.user && RTXState.user.referredByUsername ? RTXState.user.referredByUsername : "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 24);
  if (!/^[a-z0-9_]{3,24}$/.test(ref)) ref = "";
  RTXState.user.referredByUsername = ref;
}

/**
 * One-time: pending ?ref= handle from sessionStorage → user.referredByUsername (local demo).
 * Call after normalizeUserProfile() on sign-in.
 */
function applyPendingReferralAttribution() {
  if (!RTXState.session || !RTXState.session.isAuthenticated) return;
  if (typeof RTXReferral === "undefined" || !RTXReferral.peekPendingReferral) return;
  const pending = RTXReferral.peekPendingReferral();
  if (!pending) return;
  normalizeReferredByUsername();
  if (RTXState.user.referredByUsername) return;
  const self = String(RTXState.user.username || "")
    .trim()
    .toLowerCase();
  if (pending === self) {
    RTXReferral.clearPendingReferral();
    return;
  }
  RTXState.user.referredByUsername = pending;
  RTXReferral.clearPendingReferral();
}

function resetToGuestUser() {
  RTXState.user = createDefaultUserState("__guest__");
  normalizeDailyActivity();
  normalizeMemberCampaigns();
  normalizeViewedAdRewards();
  normalizeActiveTrafficBoost();
  normalizeMiniGameUserRewardLedger();
  normalizeLifetimeStats();
  normalizeUserQualifiedSpend();
}

function normalizeUserQualifiedSpend() {
  const q = Number(RTXState.user && RTXState.user.qualifiedSpend);
  RTXState.user.qualifiedSpend = !Number.isFinite(q) || q < 0 ? 0 : q;
}

/**
 * Pool reward eligibility: upgraded membership OR recorded qualifying platform spend.
 * Traffic credits do not count toward qualified spend.
 */
function getPoolRewardSpendEligibility() {
  normalizeUserQualifiedSpend();
  const upgraded = RTXState.user.membershipLevel === "upgraded";
  const qualifiedSpend = Math.max(0, Number(RTXState.user.qualifiedSpend) || 0);
  const eligible = Boolean(upgraded || qualifiedSpend > 0);
  return { eligible, upgraded, qualifiedSpend };
}

function bootstrapAuthSession() {
  let lastUserId = "";
  try {
    lastUserId = String(localStorage.getItem(RTXSessionAuth.lastUserKey) || "").trim().toLowerCase();
  } catch (e) {
    lastUserId = "";
  }

  if (lastUserId) {
    RTXState.session.isAuthenticated = true;
    RTXState.session.currentUserId = lastUserId;
    RTXUserPersist.load();
    checkDailyReset();
    checkBoostExpiry();
    checkTrafficBoostExpiry();
    return;
  }

  RTXState.session.isAuthenticated = false;
  RTXState.session.currentUserId = "";
  resetToGuestUser();
}

bootstrapAuthSession();

const RewardsAckPersist = {
  key: "rtx_rewards_acknowledged",
  isAcknowledged() {
    try {
      return localStorage.getItem(this.key) === "true";
    } catch (e) {
      return false;
    }
  },
  saveAcknowledged() {
    try {
      localStorage.setItem(this.key, "true");
    } catch (e) {
      /* ignore storage write issues */
    }
  }
};

RTXState.ui.rewardsAckVisible = !RewardsAckPersist.isAcknowledged();
RTXState.ui.rewardsAckChecked = false;

const RTXAdminPersist = {
  key: "rtx_admin_state_v1",

  load() {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (!data || typeof data !== "object") return;

      if (Array.isArray(data.users)) {
        RTXState.admin.users = data.users.map((user, index) => ({
          id: user.id || `user-${index + 1}`,
          email: String(user.email || ""),
          credits: Number(user.credits) || 0,
          loyaltyScore: Number(user.loyaltyScore) || 0,
          status: user.status === "suspended" ? "suspended" : "active"
        }));
      }

      if (Array.isArray(data.surfAds)) {
        RTXState.admin.surfAds = data.surfAds.map((ad, index) => ({
          id: ad.id || `ad-${index + 1}`,
          url: String(ad.url || ""),
          active: Boolean(ad.active),
          timerSec: Math.max(1, Number(ad.timerSec) || 20),
          credits: Math.max(0, Number(ad.credits) || 1),
          views: Math.max(0, Number(ad.views) || 0),
          maxViews: ad.maxViews === null || ad.maxViews === undefined || ad.maxViews === ""
            ? null
            : Math.max(0, Number(ad.maxViews) || 0),
          owner: String(ad.owner || "admin")
        }));
      }

      if (Array.isArray(data.spotlightAds)) {
        RTXState.admin.spotlightAds = data.spotlightAds.map((ad, index) => ({
          id: String(ad.id || `spotlight-${index + 1}`),
          title: String(ad.title || "").trim(),
          url: String(ad.url || "").trim(),
          active: Boolean(ad.active),
          priority: Math.max(0, Number(ad.priority) || 0),
          startAt: ad.startAt ? String(ad.startAt) : "",
          endAt: ad.endAt ? String(ad.endAt) : "",
          views: Math.max(0, Number(ad.views) || 0),
          createdAt: typeof ad.createdAt === "number" && !Number.isNaN(ad.createdAt) ? ad.createdAt : Date.now()
        }));
      }

      if (data.rewardPoolSettings && typeof data.rewardPoolSettings === "object") {
        RTXState.rewardPoolSettings = { ...RTXState.rewardPoolSettings, ...data.rewardPoolSettings };
      }

      if (data.rewardPoolAdaptive && typeof data.rewardPoolAdaptive === "object") {
        RTXState.rewardPoolAdaptive = { ...RTXState.rewardPoolAdaptive, ...data.rewardPoolAdaptive };
      }

      if (data.rewardPoolTesting && typeof data.rewardPoolTesting === "object") {
        const rawC = data.rewardPoolTesting.contributions;
        const contributions = Array.isArray(rawC)
          ? rawC
              .map((row) => {
                const dollars = Math.max(0, Number(row.dollars) || 0);
                const out = {
                  ts: Math.max(0, Number(row.ts) || 0),
                  dollars,
                  label: String(row.label || "").slice(0, 200)
                };
                if (row.platformDollars != null && row.reserveDollars != null && row.poolDollars != null) {
                  out.platformDollars = Number(row.platformDollars);
                  out.reserveDollars = Number(row.reserveDollars);
                  out.poolDollars = Number(row.poolDollars);
                }
                return out;
              })
              .filter((row) => row.dollars > 0 && row.ts > 0)
              .slice(0, 20)
          : [];
        RTXState.rewardPoolTesting = { contributions };
      }

      if (data.miniGameSettings && typeof data.miniGameSettings === "object") {
        RTXState.miniGameSettings = { ...RTXState.miniGameSettings, ...data.miniGameSettings };
      }

      if (data.revenuePreview && typeof data.revenuePreview === "object") {
        RTXState.admin.revenuePreview = { ...RTXState.admin.revenuePreview, ...data.revenuePreview };
      }

      if (data.revenueTreasury && typeof data.revenueTreasury === "object") {
        RTXState.admin.revenueTreasury = { ...RTXState.admin.revenueTreasury, ...data.revenueTreasury };
      }

      if (data.siteEmbed && typeof data.siteEmbed === "object") {
        RTXState.admin.siteEmbed = { ...RTXState.admin.siteEmbed, ...data.siteEmbed };
      }
    } catch (e) {
      /* ignore corrupt storage */
    }
  },

  save() {
    try {
      localStorage.setItem(
        this.key,
        JSON.stringify({
          users: RTXState.admin.users,
          surfAds: RTXState.admin.surfAds,
          spotlightAds: RTXState.admin.spotlightAds,
          rewardPoolSettings: RTXState.rewardPoolSettings,
          rewardPoolAdaptive: RTXState.rewardPoolAdaptive,
          rewardPoolTesting: RTXState.rewardPoolTesting,
          miniGameSettings: RTXState.miniGameSettings,
          revenuePreview: RTXState.admin.revenuePreview,
          revenueTreasury: RTXState.admin.revenueTreasury,
          siteEmbed: RTXState.admin.siteEmbed
        })
      );
    } catch (e) {
      /* ignore quota / private mode */
    }
  }
};

RTXAdminPersist.load();
normalizeRewardPoolTesting();

function normalizeAdminSiteEmbed() {
  if (!RTXState.admin || typeof RTXState.admin !== "object") return;
  const raw = RTXState.admin.siteEmbed && typeof RTXState.admin.siteEmbed === "object" ? RTXState.admin.siteEmbed : {};
  RTXState.admin.siteEmbed = {
    headHtml: String(raw.headHtml || "").slice(0, 80000),
    bodyHtml: String(raw.bodyHtml || "").slice(0, 80000)
  };
}

normalizeAdminSiteEmbed();

function roundMoney2(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.round(Math.max(0, v) * 100) / 100;
}

function normalizeAdminRevenuePreview() {
  if (!RTXState.admin || typeof RTXState.admin !== "object") return;
  const defaults = { simulatedRevenue: 100, notes: "" };
  const raw = RTXState.admin.revenuePreview && typeof RTXState.admin.revenuePreview === "object" ? RTXState.admin.revenuePreview : {};
  const merged = { ...defaults, ...raw };
  const rev = Number(merged.simulatedRevenue);
  RTXState.admin.revenuePreview = {
    simulatedRevenue: Number.isNaN(rev) || rev < 0 ? defaults.simulatedRevenue : rev,
    notes: String(merged.notes || "").slice(0, 4000)
  };
}

normalizeAdminRevenuePreview();

function normalizeAdminRevenueTreasury() {
  if (!RTXState.admin || typeof RTXState.admin !== "object") return;
  const raw = RTXState.admin.revenueTreasury && typeof RTXState.admin.revenueTreasury === "object" ? RTXState.admin.revenueTreasury : {};
  const log = Array.isArray(raw.withdrawalLog) ? raw.withdrawalLog : [];
  RTXState.admin.revenueTreasury = {
    platformBalance: roundMoney2(raw.platformBalance),
    reserveBalance: roundMoney2(raw.reserveBalance),
    withdrawalLog: log
      .map((row) => ({
        ts: Math.max(0, Number(row.ts) || 0),
        bucket: row.bucket === "reserve" ? "reserve" : "platform",
        amount: roundMoney2(row.amount),
        note: String(row.note || "").slice(0, 200)
      }))
      .filter((row) => row.amount > 0 && row.ts > 0)
      .slice(0, 30)
  };
}

normalizeAdminRevenueTreasury();

function normalizeMiniGameSettings() {
  const defaults = {
    triggerBaseChance: 8,
    triggerSessionChance: 25,
    cooldownMinutes: 2,
    coinDropPerfectPercent: 5,
    coinDropGoodPercent: 3,
    noRewardPercent: 25,
    creditMin: 2,
    creditMax: 5,
    miniBoostMultiplier: 1.1,
    miniBoostMinutes: 10
  };
  const raw = RTXState.miniGameSettings && typeof RTXState.miniGameSettings === "object" ? RTXState.miniGameSettings : {};
  const merged = { ...defaults, ...raw };
  const clampPct = (n, fallback) => {
    const v = Number(n);
    if (Number.isNaN(v)) return fallback;
    return Math.max(0, Math.min(100, v));
  };
  let creditMin = Math.max(1, Math.floor(Number(merged.creditMin) || defaults.creditMin));
  let creditMax = Math.max(creditMin, Math.floor(Number(merged.creditMax) || defaults.creditMax));
  const mult = Number(merged.miniBoostMultiplier);
  const miniBoostMultiplier = Number.isNaN(mult) || mult < 1 ? defaults.miniBoostMultiplier : mult;
  const mins = Math.floor(Number(merged.miniBoostMinutes));
  const miniBoostMinutes = Number.isNaN(mins) || mins < 1 ? defaults.miniBoostMinutes : mins;
  const everyN = Math.floor(Number(merged.triggerEveryNSurfs));
  const triggerEveryNSurfs = Number.isNaN(everyN)
    ? defaults.triggerEveryNSurfs
    : Math.max(0, Math.min(500, everyN));
  RTXState.miniGameSettings = {
    triggerBaseChance: clampPct(merged.triggerBaseChance, defaults.triggerBaseChance),
    triggerSessionChance: clampPct(merged.triggerSessionChance, defaults.triggerSessionChance),
    triggerEveryNSurfs,
    cooldownMinutes: Math.max(0, Math.min(1440, Number(merged.cooldownMinutes) || defaults.cooldownMinutes)),
    coinDropPerfectPercent: clampPct(merged.coinDropPerfectPercent, defaults.coinDropPerfectPercent),
    coinDropGoodPercent: clampPct(merged.coinDropGoodPercent, defaults.coinDropGoodPercent),
    noRewardPercent: clampPct(merged.noRewardPercent, defaults.noRewardPercent),
    creditMin,
    creditMax,
    miniBoostMultiplier,
    miniBoostMinutes
  };
}

function normalizeRewardPoolSettings() {
  const defaults = {
    platformSharePercent: 40,
    reservePercent: 20,
    rewardPoolPercent: 40,
    cycleReleasePercent: 30,
    dailyReleasePercent: 10
  };
  const raw = RTXState.rewardPoolSettings && typeof RTXState.rewardPoolSettings === "object" ? RTXState.rewardPoolSettings : {};
  const merged = { ...defaults, ...raw };
  if (raw.cycleReleasePercent == null && raw.cycleRewardPercent != null) {
    merged.cycleReleasePercent = Math.max(0, Math.min(100, Number(raw.cycleRewardPercent) || defaults.cycleReleasePercent));
  }
  const clampPct = (n, fallback) => {
    const v = Number(n);
    if (Number.isNaN(v)) return fallback;
    return Math.max(0, Math.min(100, v));
  };
  RTXState.rewardPoolSettings = {
    platformSharePercent: clampPct(merged.platformSharePercent, defaults.platformSharePercent),
    reservePercent: clampPct(merged.reservePercent, defaults.reservePercent),
    rewardPoolPercent: clampPct(merged.rewardPoolPercent, defaults.rewardPoolPercent),
    cycleReleasePercent: clampPct(merged.cycleReleasePercent, defaults.cycleReleasePercent),
    dailyReleasePercent: clampPct(merged.dailyReleasePercent, defaults.dailyReleasePercent)
  };
}

function normalizeRewardPoolAdaptive() {
  const defaults = { targetPoolBalance: 100000, currentPoolBalance: 0 };
  const raw = RTXState.rewardPoolAdaptive && typeof RTXState.rewardPoolAdaptive === "object" ? RTXState.rewardPoolAdaptive : {};
  let target = Number(raw.targetPoolBalance);
  let current = Number(raw.currentPoolBalance);
  if (!Number.isFinite(target) || target <= 0) target = defaults.targetPoolBalance;
  if (!Number.isFinite(current) || current < 0) current = defaults.currentPoolBalance;
  const legacyCleared = Boolean(raw.demoBaselineCleared);
  if (!legacyCleared && Math.floor(current) === 85000) {
    current = 0;
  }
  RTXState.rewardPoolAdaptive = {
    targetPoolBalance: Math.max(1, Math.floor(target)),
    currentPoolBalance: Math.max(0, Math.floor(current)),
    demoBaselineCleared: true
  };
}

/** Admin-only: zero simulated pool balance (does not change reward math formulas). */
function resetSimulatedRewardPoolBalanceForAdminTest() {
  if (!isAdminUser()) return false;
  normalizeRewardPoolAdaptive();
  RTXState.rewardPoolAdaptive.currentPoolBalance = 0;
  RTXState.rewardPoolAdaptive.demoBaselineCleared = true;
  RTXAdminPersist.save();
  return true;
}

function normalizeRewardPoolTesting() {
  const raw = RTXState.rewardPoolTesting && typeof RTXState.rewardPoolTesting === "object" ? RTXState.rewardPoolTesting : {};
  const c = Array.isArray(raw.contributions) ? raw.contributions : [];
  RTXState.rewardPoolTesting = {
    contributions: c
      .map((row) => {
        const dollars = Math.max(0, Number(row.dollars) || 0);
        const out = {
          ts: Math.max(0, Number(row.ts) || 0),
          dollars,
          label: String(row.label || "").slice(0, 200)
        };
        if (row.platformDollars != null && row.reserveDollars != null && row.poolDollars != null) {
          out.platformDollars = roundMoney2(row.platformDollars);
          out.reserveDollars = roundMoney2(row.reserveDollars);
          out.poolDollars = roundMoney2(row.poolDollars);
        }
        return out;
      })
      .filter((row) => row.dollars > 0 && row.ts > 0)
      .slice(0, 20)
  };
}

/**
 * Map admin “Test Add N” Premium RevCoin amounts to the same dollar prices as RevCoin store packs ($5 / $10 / $20 / $50).
 */
function getSimulatedDollarsForTestCoinGrant(coinsAdded) {
  const n = Math.max(0, Math.floor(Number(coinsAdded) || 0));
  if (!n) return 0;
  const table = { 50: 5, 120: 10, 260: 20, 700: 50 };
  if (Object.prototype.hasOwnProperty.call(table, n)) return table[n];
  return Math.round(n * 0.1 * 100) / 100;
}

/**
 * Split a simulated revenue dollar amount using platform / reserve / reward-pool weights.
 * If weights sum to 0, the full amount is treated as reward-pool contribution only.
 * @returns {{ platform: number, reserve: number, pool: number }}
 */
function splitSimulatedRevenueAcrossTreasury(dollars) {
  normalizeRewardPoolSettings();
  const d = roundMoney2(dollars);
  if (d <= 0) return { platform: 0, reserve: 0, pool: 0 };
  const c = RTXState.rewardPoolSettings || {};
  const pw = Math.max(0, Number(c.platformSharePercent) || 0);
  const rw = Math.max(0, Number(c.reservePercent) || 0);
  const rpw = Math.max(0, Number(c.rewardPoolPercent) || 0);
  const tw = pw + rw + rpw;
  if (tw <= 0) return { platform: 0, reserve: 0, pool: d };
  const platform = roundMoney2((d * pw) / tw);
  const reserve = roundMoney2((d * rw) / tw);
  const pool = roundMoney2(Math.max(0, d - platform - reserve));
  return { platform, reserve, pool };
}

/**
 * Admin-only local testing: pretend `dollars` was paid into the platform.
 * Credits platform (site) and reserve treasuries, member pool, and qualifiedSpend per revenue split.
 */
function recordSimulatedPoolContribution(dollars, label) {
  if (!isAdminUser() || !RTXState.session || !RTXState.session.isAuthenticated) return false;
  const d = Math.max(0, Number(dollars) || 0);
  if (!d) return false;
  const split = splitSimulatedRevenueAcrossTreasury(d);
  normalizeAdminRevenueTreasury();
  const t = RTXState.admin.revenueTreasury;
  t.platformBalance = roundMoney2(t.platformBalance + split.platform);
  t.reserveBalance = roundMoney2(t.reserveBalance + split.reserve);
  normalizeRewardPoolAdaptive();
  const curPool = Math.max(0, Math.floor(Number(RTXState.rewardPoolAdaptive.currentPoolBalance) || 0));
  RTXState.rewardPoolAdaptive.currentPoolBalance = curPool + Math.floor(split.pool);
  RTXState.user.qualifiedSpend = Math.max(0, Number(RTXState.user.qualifiedSpend) || 0) + roundMoney2(d);
  normalizeRewardPoolTesting();
  const arr = RTXState.rewardPoolTesting.contributions.slice();
  arr.unshift({
    ts: Date.now(),
    dollars: roundMoney2(d),
    label: String(label || "Simulated contribution").slice(0, 200),
    platformDollars: split.platform,
    reserveDollars: split.reserve,
    poolDollars: split.pool
  });
  RTXState.rewardPoolTesting.contributions = arr.slice(0, 20);
  RTXAdminPersist.save();
  RTXUserPersist.save();
  if (typeof RewardUX !== "undefined" && RewardUX && typeof RewardUX.pulse === "function") {
    const short = `${String(label || "").slice(0, 52)} — site $${split.platform} · reserve $${split.reserve} · pool $${split.pool}`;
    RewardUX.pulse(`Simulated revenue +$${roundMoney2(d)} (test): ${short}`, "success");
  }
  return true;
}

/**
 * Withdraw from simulated admin treasury (site earnings or maintenance reserve). Reward pool is not withdrawable here.
 * @param {"platform"|"reserve"} bucket
 */
function withdrawFromAdminRevenueTreasury(bucket, amount, note) {
  if (!isAdminUser()) return { ok: false, message: "Admin only." };
  normalizeAdminRevenueTreasury();
  const amt = roundMoney2(amount);
  if (amt <= 0) return { ok: false, message: "Enter a positive dollar amount." };
  const t = RTXState.admin.revenueTreasury;
  if (bucket === "platform") {
    if (t.platformBalance + 0.0001 < amt) return { ok: false, message: "Insufficient site (admin) balance." };
    t.platformBalance = roundMoney2(t.platformBalance - amt);
  } else if (bucket === "reserve") {
    if (t.reserveBalance + 0.0001 < amt) return { ok: false, message: "Insufficient reserve balance." };
    t.reserveBalance = roundMoney2(t.reserveBalance - amt);
  } else {
    return { ok: false, message: "Invalid withdrawal bucket." };
  }
  const w = t.withdrawalLog.slice();
  w.unshift({
    ts: Date.now(),
    bucket,
    amount: amt,
    note: String(note || "").slice(0, 200)
  });
  t.withdrawalLog = w.slice(0, 30);
  RTXAdminPersist.save();
  const cap = bucket === "platform" ? "site (admin)" : "reserve";
  return { ok: true, message: `Recorded withdrawal of $${amt.toFixed(2)} from ${cap}.` };
}

/**
 * Pool health drives effective cycle/daily release only. Platform, reserve, and reward-pool % of revenue are unchanged.
 * @returns {{ poolHealthRatio: number, mode: string, cycleReleasePercent: number, dailyReleasePercent: number, targetPoolBalance: number, currentPoolBalance: number, referenceCycleReleasePercent: number, referenceDailyReleasePercent: number }}
 */
function getAdaptiveRewardReleaseProfile() {
  normalizeRewardPoolSettings();
  normalizeRewardPoolAdaptive();
  const a = RTXState.rewardPoolAdaptive || {};
  const target = Math.max(1, Number(a.targetPoolBalance) || 1);
  const current = Math.max(0, Number(a.currentPoolBalance) || 0);
  const base = RTXState.rewardPoolSettings || {};
  const baseCycle = Math.max(0, Math.min(100, Number(base.cycleReleasePercent) || 0));
  const baseDaily = Math.max(0, Math.min(100, Number(base.dailyReleasePercent) || 0));

  const ratio = current / target;
  let mode;
  let cycleReleasePercent;
  let dailyReleasePercent;

  if (ratio >= 1) {
    mode = "Healthy";
    cycleReleasePercent = 30;
    dailyReleasePercent = 10 + Math.min(2, Math.max(0, ratio - 1) * 2);
  } else if (ratio >= 0.6) {
    mode = "Stable";
    cycleReleasePercent = 25;
    const t = (ratio - 0.6) / 0.4;
    dailyReleasePercent = 8 + t * 2;
  } else {
    mode = "Low";
    const t = Math.min(1, Math.max(0, ratio / 0.6));
    cycleReleasePercent = 15 + t * 5;
    dailyReleasePercent = 5 + t * 2;
  }

  cycleReleasePercent = Math.round(Math.max(0, Math.min(100, cycleReleasePercent)) * 1000) / 1000;
  dailyReleasePercent = Math.round(Math.max(0, Math.min(100, dailyReleasePercent)) * 1000) / 1000;

  return {
    poolHealthRatio: ratio,
    mode,
    cycleReleasePercent,
    dailyReleasePercent,
    targetPoolBalance: target,
    currentPoolBalance: current,
    referenceCycleReleasePercent: baseCycle,
    referenceDailyReleasePercent: baseDaily
  };
}

/** Admin simulated revenue × reward-pool % × adaptive cycle × adaptive daily — dollar slice for “today’s release”. */
function getProjectedDailyPoolReleaseDollars() {
  if (typeof normalizeAdminRevenuePreview === "function") {
    normalizeAdminRevenuePreview();
  }
  normalizeRewardPoolSettings();
  normalizeRewardPoolAdaptive();
  const cfg = RTXState.rewardPoolSettings || {};
  const rev = Math.max(
    0,
    Number(RTXState.admin && RTXState.admin.revenuePreview && RTXState.admin.revenuePreview.simulatedRevenue) || 0
  );
  const eff = getAdaptiveRewardReleaseProfile();
  const poolPct = Math.max(0, Number(cfg.rewardPoolPercent) || 0);
  const rewardPoolContribution = rev * (poolPct / 100);
  const cycleRelease = rewardPoolContribution * (eff.cycleReleasePercent / 100);
  return cycleRelease * (eff.dailyReleasePercent / 100);
}

/**
 * Surf / member projection only — not a payout.
 * Eligibility: upgraded membership OR qualifying platform spend (qualifiedSpend). Traffic credits do not qualify.
 * Share: today’s activity score vs placeholder platform total. Weight: loyalty multiplier. Cap: qualifiedSpend × 1.5 when qualifiedSpend > 0.
 */
function getProjectedDailyPoolReward() {
  if (!RTXState.session || !RTXState.session.isAuthenticated) {
    return {
      eligible: false,
      eligibilityLabel: "Not Eligible",
      qualifiedSpend: 0,
      upgraded: false,
      projectedDollars: 0,
      uncappedDollars: 0,
      dailyReleaseDollars: 0,
      userShare: 0,
      loyaltyMultiplier: 1,
      activityScore: 0,
      estimatedTotalPlatformActivity: 1000,
      showCapPendingNote: false,
      showNotEligibleMessage: true
    };
  }
  checkDailyReset();
  normalizeDailyActivity();
  const daily = RTXState.user.dailyActivity || {};
  const dailyActivityScore = Math.max(0, Number(daily.activityScore) || 0);
  const loyaltyMultiplier = getLoyaltyTierInfo(RTXState.user.loyaltyScore).multiplier;
  const dailyReleaseDollars = getProjectedDailyPoolReleaseDollars();
  const estimatedTotalPlatformActivity = Math.max(1000, dailyActivityScore * 10);
  const userShare =
    estimatedTotalPlatformActivity > 0 ? Math.min(1, dailyActivityScore / estimatedTotalPlatformActivity) : 0;
  const uncappedDollars = dailyReleaseDollars * userShare * loyaltyMultiplier;

  const { eligible, upgraded, qualifiedSpend } = getPoolRewardSpendEligibility();
  const eligibilityLabel = eligible ? "Eligible" : "Not Eligible";

  let projectedDollars = 0;
  let showCapPendingNote = false;
  let showNotEligibleMessage = false;

  if (!eligible) {
    projectedDollars = 0;
    showNotEligibleMessage = true;
  } else if (qualifiedSpend > 0) {
    const maxReward = qualifiedSpend * 1.5;
    projectedDollars = Math.min(Math.max(0, uncappedDollars), maxReward);
  } else {
    projectedDollars = Math.max(0, uncappedDollars);
    if (upgraded) {
      showCapPendingNote = true;
    }
  }

  return {
    eligible,
    eligibilityLabel,
    qualifiedSpend,
    upgraded,
    projectedDollars,
    uncappedDollars: Math.max(0, uncappedDollars),
    dailyReleaseDollars,
    userShare,
    loyaltyMultiplier,
    activityScore: dailyActivityScore,
    estimatedTotalPlatformActivity,
    showCapPendingNote,
    showNotEligibleMessage
  };
}

normalizeRewardPoolSettings();
normalizeRewardPoolAdaptive();
normalizeMiniGameSettings();
normalizeMiniGameProfitSafeguards();

function normalizeMiniGameProfitSafeguards() {
  const defaults = {
    notionalPoolBalance: 10000,
    maxCreditsEquivPerMiniGame: 500,
    coinCreditsEquiv: 35,
    boostApplyCreditsEquiv: 12,
    softThrottleAfterGrants: 10,
    softThrottleCoinGoodDelta: 1.5,
    maxStackedBoostMultiplier: 1.35
  };
  const raw =
    RTXState.miniGameProfitSafeguards && typeof RTXState.miniGameProfitSafeguards === "object"
      ? RTXState.miniGameProfitSafeguards
      : {};
  const merged = { ...defaults, ...raw };
  RTXState.miniGameProfitSafeguards = {
    notionalPoolBalance: Math.max(0, Number(merged.notionalPoolBalance) || defaults.notionalPoolBalance),
    maxCreditsEquivPerMiniGame: Math.max(1, Number(merged.maxCreditsEquivPerMiniGame) || defaults.maxCreditsEquivPerMiniGame),
    coinCreditsEquiv: Math.max(0, Number(merged.coinCreditsEquiv) || defaults.coinCreditsEquiv),
    boostApplyCreditsEquiv: Math.max(0, Number(merged.boostApplyCreditsEquiv) || defaults.boostApplyCreditsEquiv),
    softThrottleAfterGrants: Math.max(0, Math.floor(Number(merged.softThrottleAfterGrants) || defaults.softThrottleAfterGrants)),
    softThrottleCoinGoodDelta: Math.max(0, Number(merged.softThrottleCoinGoodDelta) || defaults.softThrottleCoinGoodDelta),
    maxStackedBoostMultiplier: Math.max(1, Number(merged.maxStackedBoostMultiplier) || defaults.maxStackedBoostMultiplier)
  };
}

function normalizeMiniGameUserRewardLedger() {
  const today = getTodayDateString();
  const existing = RTXState.user.miniGameDailyRewardLedger;
  if (!existing || typeof existing !== "object") {
    RTXState.user.miniGameDailyRewardLedger = { date: today, creditsEquiv: 0 };
    return;
  }
  const date = String(existing.date || "");
  const creditsEquiv = Math.max(0, Number(existing.creditsEquiv) || 0);
  if (date !== today) {
    RTXState.user.miniGameDailyRewardLedger = { date: today, creditsEquiv: 0 };
  } else {
    RTXState.user.miniGameDailyRewardLedger = { date: today, creditsEquiv };
  }
}

/**
 * Reference-only daily figure in abstract "credits equivalent" units, derived from
 * rewardPoolSettings + notional pool (distributable slice × reward pool % × cycle × daily).
 * Surf mini-game grants do not use this as a hard cap — see MiniGameSystem.executeMiniGameGrant.
 */
function getMiniGameDailyRewardCapCreditsEquiv() {
  normalizeRewardPoolSettings();
  normalizeRewardPoolAdaptive();
  normalizeMiniGameProfitSafeguards();
  const poolCfg = RTXState.miniGameProfitSafeguards || {};
  const totalPoolBalance = Math.max(0, Number(poolCfg.notionalPoolBalance) || 0);
  const cfg = RTXState.rewardPoolSettings || {};
  const reservePercent = Math.max(0, Number(cfg.reservePercent) || 0);
  const rewardPoolPercent = Math.max(0, Number(cfg.rewardPoolPercent) || 0);
  const eff = getAdaptiveRewardReleaseProfile();
  const cycleReleasePercent = eff.cycleReleasePercent;
  const dailyReleasePercent = eff.dailyReleasePercent;
  const reserveRatio = reservePercent / 100;
  const rewardPoolRatio = rewardPoolPercent / 100;
  const cycleRewardRatio = cycleReleasePercent / 100;
  const dailyReleaseRatio = dailyReleasePercent / 100;
  const protectedReserve = totalPoolBalance * reserveRatio;
  const distributablePool = Math.max(0, totalPoolBalance - protectedReserve);
  const rewardPoolSlice = distributablePool * rewardPoolRatio;
  const cycleRewardBudget = rewardPoolSlice * cycleRewardRatio;
  const dailyReleaseLimit = cycleRewardBudget * dailyReleaseRatio;
  return Math.max(0, dailyReleaseLimit);
}

function surfAdTitleFromUrl(url) {
  try {
    const u = new URL(String(url || "").trim());
    return u.hostname || "Surf Ad";
  } catch (e) {
    return "Surf Ad";
  }
}

function getSafeSurfUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    return parsed.href;
  } catch (e) {
    return "";
  }
}

function shuffleArray(items) {
  const clone = [...items];
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = clone[i];
    clone[i] = clone[j];
    clone[j] = t;
  }
  return clone;
}

function normalizeActiveTrafficBoost() {
  const existing = RTXState.user.activeTrafficBoost || {};
  RTXState.user.activeTrafficBoost = {
    active: Boolean(existing.active),
    multiplier: Math.max(1, Number(existing.multiplier) || 1),
    expiresAt: Math.max(0, Number(existing.expiresAt) || 0)
  };
}

function checkTrafficBoostExpiry() {
  normalizeActiveTrafficBoost();
  const boost = RTXState.user.activeTrafficBoost;
  if (!boost.active) return false;
  if (Date.now() <= boost.expiresAt) return false;
  RTXState.user.activeTrafficBoost = {
    active: false,
    multiplier: 1,
    expiresAt: 0
  };
  RTXUserPersist.save();
  return true;
}

function getTrafficBoostTimeLeftText() {
  checkTrafficBoostExpiry();
  const boost = RTXState.user.activeTrafficBoost;
  if (!boost.active || !boost.expiresAt || boost.expiresAt <= Date.now()) return "";
  const remainingMs = boost.expiresAt - Date.now();
  const minutes = Math.ceil(remainingMs / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

function buyTrafficBoost() {
  checkTrafficBoostExpiry();
  const boost = RTXState.user.activeTrafficBoost;
  if (boost.active && Date.now() <= boost.expiresAt) {
    RTXState.ui.trafficBoostFeedback = "Traffic boost already active";
    RTXState.ui.trafficBoostFeedbackTone = "error";
    App.render();
    return;
  }
  const cost = 30;
  const tokens = Math.max(0, Number(RTXState.user.premiumRevCoins) || 0);
  if (tokens < cost) {
    RTXState.ui.trafficBoostFeedback = "Not enough Premium RevCoins";
    RTXState.ui.trafficBoostFeedbackTone = "error";
    App.render();
    return;
  }
  RTXState.user.premiumRevCoins = tokens - cost;
  RTXState.user.activeTrafficBoost = {
    active: true,
    multiplier: 3,
    expiresAt: Date.now() + 60 * 60 * 1000
  };
  RTXUserPersist.save();
  RTXState.ui.trafficBoostFeedback = "Priority traffic boost activated!";
  RTXState.ui.trafficBoostFeedbackTone = "success";
  if (typeof SurfEngine !== "undefined" && SurfEngine.refreshCampaignQueue) {
    SurfEngine.refreshCampaignQueue();
  }
  App.render();
}

function getCampaignWeight(campaign) {
  checkTrafficBoostExpiry();
  if (campaign && campaign.source === "admin") return 3;
  if (campaign && String(campaign.source || "").startsWith("member")) {
    const base = RTXState.user.membershipLevel === "upgraded" ? 2 : 1;
    const tb = RTXState.user.activeTrafficBoost;
    if (tb && tb.active && Date.now() <= tb.expiresAt) {
      const mult = Math.max(1, Number(tb.multiplier) || 1);
      return Math.max(1, base * mult);
    }
    return base;
  }
  return 1;
}

function buildWeightedQueue(campaigns) {
  const weighted = [];
  for (const campaign of campaigns) {
    const weight = Math.max(1, Number(getCampaignWeight(campaign)) || 1);
    for (let i = 0; i < weight; i += 1) {
      // Keep queue entries isolated so weighted duplicates do not share object references.
      weighted.push({ ...campaign });
    }
  }
  return weighted;
}

function buildMemberAdLandingDataUrl(kind, ad) {
  const target = getSafeSurfUrl(ad && ad.targetUrl);
  if (!target) return "";
  const esc = (s) =>
    String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  const isBanner = kind === "banner";
  const title = isBanner ? "Member Banner Ad" : String(ad && ad.title ? ad.title : "Member Text Ad");
  const desc = isBanner ? "" : String(ad && ad.description ? ad.description : "");
  const imageUrl = isBanner ? esc(String(ad && ad.imageUrl ? ad.imageUrl : "")) : "";
  const sub = desc ? esc(desc) : "";
  const subLine = sub ? `<span class="s">${sub}</span>` : "";
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>body{font-family:system-ui,Arial,sans-serif;background:#05080f;color:#e5e7eb;margin:0;min-height:100vh;display:grid;place-items:center}.bar{width:468px;height:60px;box-sizing:border-box;border:1px solid #334155;background:#0b1220;border-radius:8px;display:flex;align-items:center;gap:10px;padding:0 12px;overflow:hidden;box-shadow:0 6px 20px rgba(0,0,0,.35)}.bar a{color:inherit;text-decoration:none;display:flex;align-items:center;gap:10px;width:100%;height:100%;min-width:0}.thumb{width:120px;height:52px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:#020617;border-radius:6px;border:1px solid #1e293b}.thumb img{max-width:118px;max-height:50px;object-fit:contain;display:block}.txt{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center;gap:2px}.t{font-size:13px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.s{font-size:10px;color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.go{flex-shrink:0;font-size:12px;font-weight:800;color:#fb923c;padding:6px 10px;border-radius:8px;border:1px solid rgba(251,146,60,.45);background:rgba(251,146,60,.12)}</style></head><body><div class="bar"><a href="${esc(target)}" target="_blank" rel="noopener noreferrer">${isBanner && imageUrl ? `<span class="thumb"><img src="${imageUrl}" alt=""></span>` : ""}<span class="txt"><span class="t">${esc(title)}</span>${subLine}</span><span class="go">Open →</span></a></div></body></html>`;
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

/** Combined active queue from admin surf ads + member sites, shuffled. */
function getSurfCampaignQueue() {
  const adminAds = Array.isArray(RTXState.admin.surfAds) ? RTXState.admin.surfAds : [];
  const memberSites =
    RTXState.user &&
    RTXState.user.memberCampaigns &&
    Array.isArray(RTXState.user.memberCampaigns.surfUrls)
      ? RTXState.user.memberCampaigns.surfUrls
      : [];
  const memberTextAds =
    RTXState.user &&
    RTXState.user.memberCampaigns &&
    Array.isArray(RTXState.user.memberCampaigns.textAds)
      ? RTXState.user.memberCampaigns.textAds
      : [];
  const memberBannerAds =
    RTXState.user &&
    RTXState.user.memberCampaigns &&
    Array.isArray(RTXState.user.memberCampaigns.bannerAds)
      ? RTXState.user.memberCampaigns.bannerAds
      : [];
  const currentUserId = getCurrentUserId();

  const normalizedAdmin = adminAds.map((ad) => {
    const safeUrl = getSafeSurfUrl(ad && ad.url);
    return {
      id: String(ad && ad.id ? ad.id : ""),
      url: safeUrl,
      active: Boolean(ad && ad.active),
      views: Math.max(0, Number(ad && ad.views) || 0),
      maxViews: ad ? ad.maxViews : null,
      timerSec: Math.max(1, Number(ad && ad.timerSec) || 20),
      credits: Math.max(0, Number(ad && ad.credits) || 1),
      source: "admin"
    };
  });

  const normalizedMember = memberSites.map((site) => {
    const safeUrl = getSafeSurfUrl(site && site.url);
    const allocatedViews = Math.max(0, Number(site && site.allocatedViews) || 0);
    return {
      id: String(site && site.id ? site.id : ""),
      ownerId: String(site && site.ownerId ? site.ownerId : ""),
      url: safeUrl,
      active: Boolean(site && site.active),
      views: Math.max(0, Number(site && site.views) || 0),
      maxViews: allocatedViews || null,
      timerSec: 8,
      credits: 1,
      source: "member"
    };
  });

  const normalizedTextAds = memberTextAds.map((ad) => {
    const allocatedViews = Math.max(0, Number(ad && ad.allocatedViews) || 0);
    return {
      id: String(ad && ad.id ? ad.id : ""),
      ownerId: String(ad && ad.ownerId ? ad.ownerId : ""),
      url: buildMemberAdLandingDataUrl("text", ad),
      active: Boolean(ad && ad.active),
      views: Math.max(0, Number(ad && ad.views) || 0),
      maxViews: allocatedViews || null,
      timerSec: 12,
      credits: 1,
      source: "member-text"
    };
  });

  const normalizedBannerAds = memberBannerAds.map((ad) => {
    const allocatedViews = Math.max(0, Number(ad && ad.allocatedViews) || 0);
    return {
      id: String(ad && ad.id ? ad.id : ""),
      ownerId: String(ad && ad.ownerId ? ad.ownerId : ""),
      url: buildMemberAdLandingDataUrl("banner", ad),
      active: Boolean(ad && ad.active),
      views: Math.max(0, Number(ad && ad.impressions) || 0),
      maxViews: allocatedViews || null,
      timerSec: 8,
      credits: 1,
      source: "member-banner"
    };
  });

  const combined = [...normalizedAdmin, ...normalizedMember, ...normalizedTextAds, ...normalizedBannerAds];
  const eligible = combined.filter((ad) => {
    if (ad.source === "member" && ad.ownerId && ad.ownerId === currentUserId) return false;
    if (!ad.url) return false;
    if (!ad.active) return false;
    const max = ad.maxViews;
    if (max === null || max === undefined || max === "") return true;
    const maxNum = Number(max);
    if (Number.isNaN(maxNum)) return true;
    return ad.views < maxNum;
  });

  const base = eligible.map((ad) => ({
    id: ad.id,
    ownerId: ad.ownerId || "",
    title: `${surfAdTitleFromUrl(ad.url)} — ${
      ad.source === "admin"
        ? "Admin Ad"
        : ad.source === "member-text"
          ? "Member Text Ad"
          : ad.source === "member-banner"
            ? "Member Banner Ad"
            : "Member Site"
    }`,
    url: ad.url,
    timerSec: Math.max(1, Number(ad.timerSec) || 20),
    credits: Math.max(0, Number(ad.credits) || 1),
    source: ad.source
  }));
  const weighted = buildWeightedQueue(base);
  return shuffleArray(weighted);
}

function incrementSurfCampaignView(campaign) {
  if (!campaign || !campaign.id) return;

  if (campaign.source === "admin") {
    const ads = Array.isArray(RTXState.admin.surfAds) ? RTXState.admin.surfAds : [];
    RTXState.admin.surfAds = ads.map((ad) => {
      if (String(ad.id) !== String(campaign.id)) return ad;
      return {
        ...ad,
        views: Math.max(0, Number(ad.views) || 0) + 1
      };
    });
    RTXAdminPersist.save();
    return;
  }

  if (campaign.source === "member") {
    normalizeMemberCampaigns();
    RTXState.user.memberCampaigns.surfUrls = RTXState.user.memberCampaigns.surfUrls.map((site) => {
      if (String(site.id) !== String(campaign.id)) return site;
      return {
        ...site,
        views: Math.max(0, Number(site.views) || 0) + 1
      };
    });
    RTXUserPersist.save();
    return;
  }

  if (campaign.source === "member-text") {
    normalizeMemberCampaigns();
    RTXState.user.memberCampaigns.textAds = RTXState.user.memberCampaigns.textAds.map((ad) =>
      String(ad.id) === String(campaign.id)
        ? { ...ad, views: Math.max(0, Number(ad.views) || 0) + 1 }
        : ad
    );
    handleTextAdView(campaign.id);
    RTXUserPersist.save();
    return;
  }

  if (campaign.source === "member-banner") {
    normalizeMemberCampaigns();
    RTXState.user.memberCampaigns.bannerAds = RTXState.user.memberCampaigns.bannerAds.map((ad) =>
      String(ad.id) === String(campaign.id)
        ? { ...ad, impressions: Math.max(0, Number(ad.impressions) || 0) + 1 }
        : ad
    );
    handleBannerAdView(campaign.id);
    RTXUserPersist.save();
  }
}

function getActiveSpotlightAd() {
  const ads = Array.isArray(RTXState.admin.spotlightAds) ? RTXState.admin.spotlightAds : [];
  const now = Date.now();
  const eligible = ads.filter((ad) => {
    if (!ad || !ad.active) return false;
    const url = getSafeSurfUrl(ad.url);
    if (!url) return false;
    const startMs = ad.startAt ? new Date(ad.startAt).getTime() : null;
    const endMs = ad.endAt ? new Date(ad.endAt).getTime() : null;
    if (startMs !== null && !Number.isNaN(startMs) && now < startMs) return false;
    if (endMs !== null && !Number.isNaN(endMs) && now > endMs) return false;
    return true;
  });

  if (!eligible.length) {
    return {
      id: "revempire-fallback",
      title: "RevEmpire",
      url: "https://revempire.net",
      source: "fallback"
    };
  }

  const sorted = [...eligible].sort((a, b) => (Number(b.priority) || 0) - (Number(a.priority) || 0));
  const topPriority = Number(sorted[0].priority) || 0;
  const topAds = sorted.filter((ad) => (Number(ad.priority) || 0) === topPriority);
  const pick = topAds[Math.floor(Math.random() * topAds.length)];

  return {
    id: String(pick.id),
    title: String(pick.title || "Spotlight Ad"),
    url: getSafeSurfUrl(pick.url) || "https://revempire.net",
    source: "admin",
    priority: Number(pick.priority) || 0
  };
}

function incrementSpotlightView(spotlightId) {
  const id = String(spotlightId || "");
  if (!id || id === "revempire-fallback") return;
  RTXState.admin.spotlightAds = (RTXState.admin.spotlightAds || []).map((ad) =>
    String(ad.id) === id
      ? { ...ad, views: Math.max(0, Number(ad.views) || 0) + 1 }
      : ad
  );
  RTXAdminPersist.save();
}

function getLoyaltyTierInfo(score) {
  const safeScore = Math.max(0, Number(score) || 0);

  if (safeScore >= 1500) {
    return {
      tier: "Elite",
      multiplier: 2.0,
      progressLabel: "Max Tier Reached",
      progressCurrent: safeScore,
      progressTarget: null,
      nextTier: null
    };
  }

  if (safeScore >= 500) {
    return {
      tier: "Committed",
      multiplier: 1.5,
      progressLabel: `Progress to Elite: ${safeScore} / 1500`,
      progressCurrent: safeScore,
      progressTarget: 1500,
      nextTier: "Elite"
    };
  }

  if (safeScore >= 100) {
    return {
      tier: "Active",
      multiplier: 1.2,
      progressLabel: `Progress to Committed: ${safeScore} / 500`,
      progressCurrent: safeScore,
      progressTarget: 500,
      nextTier: "Committed"
    };
  }

  return {
    tier: "Starter",
    multiplier: 1.0,
    progressLabel: `Progress to Active: ${safeScore} / 100`,
    progressCurrent: safeScore,
    progressTarget: 100,
    nextTier: "Active"
  };
}

/** Local calendar YYYY-MM-DD (not UTC) so daily tiers / rollover match the member’s day. */
function getTodayDateString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getDailyRewardTier(dailyActivity) {
  const score = Math.max(0, Number(dailyActivity?.activityScore) || 0);
  if (score >= 500) return "Elite Daily";
  if (score >= 250) return "Strong";
  if (score >= 100) return "Qualified";
  if (score >= 50) return "Building";
  return "Not Qualified";
}

function normalizeDailyActivity() {
  const existing = RTXState.user.dailyActivity || {};
  const normalized = {
    date: String(existing.date || ""),
    views: Math.max(0, Number(existing.views) || 0),
    sessions: Math.max(0, Number(existing.sessions) || 0),
    activityScore: Math.max(0, Number(existing.activityScore) || 0),
    hyperSpinsUsed: Math.max(0, Number(existing.hyperSpinsUsed) || 0),
    hyperSpinsEarned: Math.max(0, Number(existing.hyperSpinsEarned) || 0),
    creditsEarned: Math.max(0, Number(existing.creditsEarned) || 0),
    rewardTier: "Not Qualified"
  };
  normalized.rewardTier = getDailyRewardTier(normalized);
  RTXState.user.dailyActivity = normalized;
}

function normalizeLifetimeStats() {
  const raw = RTXState.user.lifetimeStats && typeof RTXState.user.lifetimeStats === "object" ? RTXState.user.lifetimeStats : {};
  RTXState.user.lifetimeStats = {
    validViews: Math.max(0, Math.floor(Number(raw.validViews) || 0)),
    creditsEarned: Math.max(0, Math.floor(Number(raw.creditsEarned) || 0)),
    hyperSpinsUsed: Math.max(0, Math.floor(Number(raw.hyperSpinsUsed) || 0)),
    hyperSpinsEarned: Math.max(0, Math.floor(Number(raw.hyperSpinsEarned) || 0))
  };
}

/** Credits added to wallet from gameplay/rewards (not admin top-ups). Counts toward today vs lifetime on My Stats. */
function recordMemberCreditEarnings(amount) {
  if (!RTXState.session || !RTXState.session.isAuthenticated) return;
  const n = Math.max(0, Math.floor(Number(amount) || 0));
  if (!n) return;
  checkDailyReset();
  normalizeLifetimeStats();
  normalizeDailyActivity();
  RTXState.user.dailyActivity.creditsEarned = Math.max(0, Math.floor(Number(RTXState.user.dailyActivity.creditsEarned) || 0)) + n;
  RTXState.user.lifetimeStats.creditsEarned += n;
  if (typeof RewardUX !== "undefined" && RewardUX && typeof RewardUX.notifyCreditsFromRecord === "function") {
    RewardUX.notifyCreditsFromRecord(n);
  }
}

function recordMemberValidViewLifetime() {
  if (!RTXState.session || !RTXState.session.isAuthenticated) return;
  checkDailyReset();
  normalizeLifetimeStats();
  RTXState.user.lifetimeStats.validViews += 1;
}

function recordMemberHyperSpinUsedLifetime() {
  if (!RTXState.session || !RTXState.session.isAuthenticated) return;
  normalizeLifetimeStats();
  RTXState.user.lifetimeStats.hyperSpinsUsed += 1;
}

function recordMemberHyperSpinEarnedFromSession() {
  if (!RTXState.session || !RTXState.session.isAuthenticated) return;
  checkDailyReset();
  normalizeLifetimeStats();
  normalizeDailyActivity();
  RTXState.user.lifetimeStats.hyperSpinsEarned += 1;
  RTXState.user.dailyActivity.hyperSpinsEarned = Math.max(0, Math.floor(Number(RTXState.user.dailyActivity.hyperSpinsEarned) || 0)) + 1;
}

function normalizeMemberCampaigns() {
  if (RTXState.user.membershipLevel !== "upgraded" && RTXState.user.membershipLevel !== "free") {
    RTXState.user.membershipLevel = "free";
  }
  if (!RTXState.user.memberCampaigns || typeof RTXState.user.memberCampaigns !== "object") {
    RTXState.user.memberCampaigns = { surfUrls: [], textAds: [], bannerAds: [] };
  }
  const mc = RTXState.user.memberCampaigns;
  if (!Array.isArray(mc.surfUrls)) mc.surfUrls = [];
  if (!Array.isArray(mc.textAds)) mc.textAds = [];
  if (!Array.isArray(mc.bannerAds)) mc.bannerAds = [];
  mc.surfUrls = mc.surfUrls.map((s, index) => ({
    id: String(s.id || `member-site-${index + 1}`),
    url: String(s.url || "").trim(),
    active: Boolean(s.active),
    views: Math.max(0, Number(s.views) || 0),
    allocatedViews: Math.max(0, Number(s.allocatedViews) || 0),
    createdAt: typeof s.createdAt === "number" && !Number.isNaN(s.createdAt) ? s.createdAt : Date.now()
  }));
  mc.textAds = mc.textAds.map((ad, index) => ({
    id: String(ad.id || `member-text-ad-${index + 1}`),
    title: String(ad.title || "").trim(),
    description: String(ad.description || "").trim(),
    targetUrl: String(ad.targetUrl || "").trim(),
    active: Boolean(ad.active),
    views: Math.max(0, Number(ad.views) || 0),
    clicks: Math.max(0, Number(ad.clicks) || 0),
    allocatedViews: Math.max(0, Number(ad.allocatedViews) || 0),
    createdAt: typeof ad.createdAt === "number" && !Number.isNaN(ad.createdAt) ? ad.createdAt : Date.now()
  }));
  mc.bannerAds = mc.bannerAds.map((ad, index) => ({
    id: String(ad.id || `member-banner-ad-${index + 1}`),
    imageUrl: String(ad.imageUrl || "").trim(),
    targetUrl: String(ad.targetUrl || "").trim(),
    active: Boolean(ad.active),
    impressions: Math.max(0, Number(ad.impressions) || 0),
    clicks: Math.max(0, Number(ad.clicks) || 0),
    allocatedViews: Math.max(0, Number(ad.allocatedViews) || 0),
    size: ["300x250", "468x60", "728x90", "160x600"].includes(String(ad.size || ""))
      ? String(ad.size)
      : "468x60",
    createdAt: typeof ad.createdAt === "number" && !Number.isNaN(ad.createdAt) ? ad.createdAt : Date.now()
  }));
}

/** Member slot limits: surf URLs = 1 (free) or 3 (upgraded). */
function getMemberCampaignLimit(type) {
  const upgraded = RTXState.user.membershipLevel === "upgraded";
  if (type === "surf" || type === "surfUrls") {
    return upgraded ? 3 : 1;
  }
  if (type === "textAds" || type === "text") {
    return upgraded ? 3 : 1;
  }
  if (type === "bannerAds" || type === "banners" || type === "banner") {
    return upgraded ? 3 : 1;
  }
  return upgraded ? 3 : 1;
}

function normalizeViewedAdRewards() {
  const rewards = RTXState.user.viewedAdRewards;
  if (!rewards || typeof rewards !== "object") {
    RTXState.user.viewedAdRewards = { textAds: [], banners: [] };
    return;
  }
  if (!Array.isArray(rewards.textAds)) rewards.textAds = [];
  if (!Array.isArray(rewards.banners)) rewards.banners = [];
  rewards.textAds = rewards.textAds.map((id) => String(id)).filter((id) => Boolean(id));
  rewards.banners = rewards.banners.map((id) => String(id)).filter((id) => Boolean(id));
}

function getCurrentUserId() {
  if (!RTXState.session || !RTXState.session.isAuthenticated) {
    return "__guest__";
  }
  const fromSession = String(RTXState.session.currentUserId || "").trim();
  if (fromSession) return fromSession;
  const fromUser = String(RTXState.user && RTXState.user.id ? RTXState.user.id : "").trim();
  if (fromUser && fromUser !== "__guest__") return fromUser;
  return "__guest__";
}

if (typeof window !== "undefined") {
  window.switchUser = function switchUser(userId) {
    const nextUserId = String(userId || "").trim().toLowerCase();
    if (!nextUserId) return false;
    RTXState.session.isAuthenticated = true;
    RTXState.session.currentUserId = nextUserId;
    RTXUserPersist.load();
    checkDailyReset();
    checkBoostExpiry();
    checkTrafficBoostExpiry();
    try {
      localStorage.setItem(RTXSessionAuth.lastUserKey, nextUserId);
    } catch (e) {
      /* ignore */
    }
    if (typeof App !== "undefined" && App && typeof App.render === "function") {
      App.render();
    }
    return true;
  };
}

function handleTextAdView(adId) {
  const id = String(adId || "");
  if (!id) return;
  normalizeViewedAdRewards();
  const seen = RTXState.user.viewedAdRewards.textAds;
  if (seen.includes(id)) return;
  const ads = Array.isArray(RTXState.user?.memberCampaigns?.textAds) ? RTXState.user.memberCampaigns.textAds : [];
  const ad = ads.find((item) => String(item && item.id ? item.id : "") === id);
  const ownerId = String(ad && ad.ownerId ? ad.ownerId : "").trim();
  if (ownerId && ownerId === getCurrentUserId()) {
    console.log("Self-view detected: no loyalty awarded");
    return;
  }

  RTXState.user.loyaltyScore += 1;
  seen.push(id);
  RTXUserPersist.save();
}

function handleBannerAdView(adId) {
  const id = String(adId || "");
  if (!id) return;
  normalizeViewedAdRewards();
  const seen = RTXState.user.viewedAdRewards.banners;
  if (seen.includes(id)) return;
  const ads = Array.isArray(RTXState.user?.memberCampaigns?.bannerAds) ? RTXState.user.memberCampaigns.bannerAds : [];
  const ad = ads.find((item) => String(item && item.id ? item.id : "") === id);
  const ownerId = String(ad && ad.ownerId ? ad.ownerId : "").trim();
  if (ownerId && ownerId === getCurrentUserId()) {
    console.log("Self-view detected: no loyalty awarded");
    return;
  }

  RTXState.user.loyaltyScore += 1;
  seen.push(id);
  RTXUserPersist.save();
}

/**
 * Random member promo shown inside Surf: either a banner or text ad with remaining allocation.
 * Returns null when no eligible ad exists.
 */
function getRandomSurfInlineMemberAd() {
  normalizeMemberCampaigns();
  const currentUserId = getCurrentUserId();
  const hasRemaining = (item, usedKey) => {
    const allocated = Math.max(0, Number(item && item.allocatedViews) || 0);
    if (!allocated) return true;
    const used = Math.max(0, Number(item && item[usedKey]) || 0);
    return used < allocated;
  };
  const textAds = (RTXState.user.memberCampaigns.textAds || [])
    .filter((ad) => ad.active && hasRemaining(ad, "views"))
    .map((ad) => ({
      type: "text",
      id: String(ad.id),
      ownerId: String(ad.ownerId || ""),
      title: String(ad.title || "Member Text Ad"),
      description: String(ad.description || ""),
      targetUrl: String(ad.targetUrl || ""),
      cta: "Open Offer"
    }));
  const bannerAds = (RTXState.user.memberCampaigns.bannerAds || [])
    .filter((ad) => ad.active && hasRemaining(ad, "impressions"))
    .map((ad) => ({
      type: "banner",
      id: String(ad.id),
      ownerId: String(ad.ownerId || ""),
      imageUrl: String(ad.imageUrl || ""),
      targetUrl: String(ad.targetUrl || ""),
      title: "Member Banner Ad",
      cta: "Visit Sponsor"
    }));

  const pool = [...bannerAds, ...textAds].filter((ad) => {
    if (!ad.targetUrl) return false;
    // Prefer non-self ads; keep self ads as fallback for single-user demo.
    return true;
  });
  if (!pool.length) return null;
  const nonSelf = pool.filter((ad) => ad.ownerId && ad.ownerId !== currentUserId);
  const pickFrom = nonSelf.length ? nonSelf : pool;
  return pickFrom[Math.floor(Math.random() * pickFrom.length)] || null;
}

/**
 * Full user-facing daily rollover (calendar day changed).
 * Resets per-day surf / pool criteria fields only. Does not reset wallet credits, premium RevCoins,
 * loyalty score, hyper spin balance, streak, or session progress counters.
 */
function applyCalendarDayRolloverForUser() {
  const today = getTodayDateString();
  RTXState.user.dailyActivity = {
    date: today,
    views: 0,
    sessions: 0,
    activityScore: 0,
    hyperSpinsUsed: 0,
    hyperSpinsEarned: 0,
    creditsEarned: 0,
    rewardTier: "Not Qualified"
  };
  RTXState.user.viewsToday = 0;
  RTXState.user.viewedAdRewards = { textAds: [], banners: [] };
  RTXState.user.miniGameDailyRewardLedger = { date: today, creditsEquiv: 0 };
  if (RTXState.antiCheat && typeof RTXState.antiCheat === "object") {
    RTXState.antiCheat.viewsSinceCaptcha = 0;
  }
  if (typeof window !== "undefined" && window.MiniGameSystem && typeof window.MiniGameSystem === "object") {
    window.MiniGameSystem._miniGameSessionGrantCount = 0;
    window.MiniGameSystem._miniGameSessionsCompletedSnapshot = null;
  }
}

function checkDailyReset() {
  normalizeDailyActivity();
  const today = getTodayDateString();
  if (RTXState.user.dailyActivity.date === today) {
    RTXState.user.dailyActivity.rewardTier = getDailyRewardTier(RTXState.user.dailyActivity);
    normalizeMiniGameUserRewardLedger();
    return;
  }

  applyCalendarDayRolloverForUser();
  RTXUserPersist.save();
}

/**
 * Admin-only: zero out today’s daily counters without changing the calendar date.
 * For local testing when the real day has not rolled over yet.
 */
function resetTodaysDailyCountersForAdminTest() {
  if (!isAdminUser()) return false;
  applyCalendarDayRolloverForUser();
  RTXUserPersist.save();
  return true;
}

/** Admin-only: add fake credits / Premium RevCoins for local testing (no payments). */
function applyAdminTestWalletTopUp(creditsAdd, coinsAdd) {
  if (!isAdminUser()) return false;
  const c = Math.max(0, Math.floor(Number(creditsAdd) || 0));
  const p = Math.max(0, Math.floor(Number(coinsAdd) || 0));
  if (!c && !p) return false;
  RTXState.user.credits = Math.max(0, Number(RTXState.user.credits) || 0) + c;
  RTXState.user.premiumRevCoins = Math.max(0, Number(RTXState.user.premiumRevCoins) || 0) + p;
  if (p > 0) {
    const usd = getSimulatedDollarsForTestCoinGrant(p);
    recordSimulatedPoolContribution(usd, `Admin test wallet: +${p} Premium RevCoins ($${usd} simulated)`);
  } else {
    RTXUserPersist.save();
  }
  return true;
}

/** Admin-only: set membership for testing upgraded vs free flows. */
function applyAdminTestMembership(level) {
  if (!isAdminUser()) return false;
  const next = level === "upgraded" ? "upgraded" : "free";
  RTXState.user.membershipLevel = next;
  RTXState.user.isPaid = next === "upgraded";
  normalizeMemberCampaigns();
  if (next === "upgraded") {
    recordSimulatedPoolContribution(10, "Test membership upgrade ($10 simulated)");
  } else {
    RTXUserPersist.save();
  }
  return true;
}

function normalizeActiveBoost() {
  const existing = RTXState.user.activeBoost || {};
  RTXState.user.activeBoost = {
    type: existing.type === "activity" ? "activity" : null,
    multiplier: Math.max(1, Number(existing.multiplier) || 1),
    expiresAt: Math.max(0, Number(existing.expiresAt) || 0)
  };
}

function checkBoostExpiry() {
  normalizeActiveBoost();
  const boost = RTXState.user.activeBoost;
  if (!boost.type) return false;
  if (Date.now() <= boost.expiresAt) return false;

  RTXState.user.activeBoost = {
    type: null,
    multiplier: 1,
    expiresAt: 0
  };
  RTXUserPersist.save();
  return true;
}

function getActivityBoostMultiplier() {
  checkBoostExpiry();
  const boost = RTXState.user.activeBoost;
  if (boost.type === "activity" && Date.now() <= boost.expiresAt) {
    return Math.max(1, Number(boost.multiplier) || 1);
  }
  return 1;
}

function getBoostTimeLeftText() {
  checkBoostExpiry();
  const boost = RTXState.user.activeBoost;
  if (boost.type !== "activity" || boost.expiresAt <= Date.now()) return "";

  const remainingMs = boost.expiresAt - Date.now();
  const minutes = Math.ceil(remainingMs / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

function buyActivityBoost() {
  const cost = 20;
  checkBoostExpiry();

  if (RTXState.user.activeBoost.type === "activity") {
    RTXState.ui.premiumSpinFeedback = "Activity Boost already active";
    RTXState.ui.premiumSpinFeedbackTone = "error";
    App.render();
    return;
  }

  const currentTokens = Math.max(0, Number(RTXState.user.premiumRevCoins) || 0);
  if (currentTokens < cost) {
    RTXState.ui.premiumSpinFeedback = "Not enough Premium RevCoins";
    RTXState.ui.premiumSpinFeedbackTone = "error";
    App.render();
    return;
  }

  RTXState.user.premiumRevCoins = currentTokens - cost;
  RTXState.user.activeBoost = {
    type: "activity",
    multiplier: 1.2,
    expiresAt: Date.now() + 60 * 60 * 1000
  };
  RTXUserPersist.save();

  RTXState.ui.premiumSpinFeedback = "Activity Boost Activated!";
  RTXState.ui.premiumSpinFeedbackTone = "success";
  App.render();
}

function getRewardPoolPreview() {
  const totalPoolBalance = 0;
  normalizeRewardPoolSettings();
  normalizeRewardPoolAdaptive();
  const cfg = RTXState.rewardPoolSettings || {};
  const adaptive = getAdaptiveRewardReleaseProfile();
  const reservePercent = Number(cfg.reservePercent) || 0;
  const cycleRewardPercent = adaptive.cycleReleasePercent;
  const dailyReleasePercent = adaptive.dailyReleasePercent;

  const reserveRatio = reservePercent / 100;
  const cycleRewardRatio = cycleRewardPercent / 100;
  const dailyReleaseRatio = dailyReleasePercent / 100;

  const protectedReserve = totalPoolBalance * reserveRatio;
  const distributablePool = Math.max(0, totalPoolBalance - protectedReserve);
  const cycleRewardBudget = distributablePool * cycleRewardRatio;
  const dailyReleaseLimit = cycleRewardBudget * dailyReleaseRatio;

  const poolProj = getProjectedDailyPoolReward();
  const activityShare = poolProj.userShare;
  const loyaltyMultiplier = poolProj.loyaltyMultiplier;
  const qualifiedSpend = poolProj.qualifiedSpend;
  const rewardCap = qualifiedSpend > 0 ? qualifiedSpend * 1.5 : 0;
  const uncappedUserReward = poolProj.uncappedDollars;
  const finalUserReward = poolProj.projectedDollars;

  return {
    totalPoolBalance,
    reservePercent,
    cycleRewardPercent,
    dailyReleasePercent,
    protectedReserve,
    distributablePool,
    cycleRewardBudget,
    dailyReleaseLimit: poolProj.dailyReleaseDollars,
    activityShare,
    loyaltyMultiplier,
    /** @deprecated name — use qualifiedSpend; traffic credits are not pool-qualified spend */
    userSpend: qualifiedSpend,
    qualifiedSpend,
    poolEligible: poolProj.eligible,
    uncappedUserReward,
    finalUserReward,
    rewardCap,
    poolHealthRatio: adaptive.poolHealthRatio,
    adaptiveMode: adaptive.mode,
    adaptiveTargetPoolBalance: adaptive.targetPoolBalance,
    adaptiveCurrentPoolBalance: adaptive.currentPoolBalance
  };
}

/**
 * Admin-only sandbox: pure numbers from hypothetical revenue and activity.
 * Does not read member balances, persist payouts, or alter live surf/reward code paths.
 *
 * @param {object} input
 * @param {number} input.simulatedRevenue
 * @param {number} input.activeUsers
 * @param {number} input.averageDailyActivityScore
 * @param {number} input.exampleUserActivityScore
 * @param {number} input.exampleUserSpend
 * @param {number} input.loyaltyMultiplier
 * @param {object} poolSettings normalized reward pool percents (same shape as RTXState.rewardPoolSettings)
 */
function computeRewardPoolSandboxSimulation(input, poolSettings) {
  const revenue = Math.max(0, Number(input && input.simulatedRevenue) || 0);
  const activeUsers = Math.max(0, Math.floor(Number(input && input.activeUsers) || 0));
  const averageDailyActivityScore = Math.max(0, Number(input && input.averageDailyActivityScore) || 0);
  const exampleUserActivityScore = Math.max(0, Number(input && input.exampleUserActivityScore) || 0);
  const exampleUserSpend = Math.max(0, Number(input && input.exampleUserSpend) || 0);
  const loyaltyMultiplier = Math.max(0, Number(input && input.loyaltyMultiplier) || 0);

  const cfg = poolSettings && typeof poolSettings === "object" ? poolSettings : {};
  normalizeRewardPoolAdaptive();
  const adaptive = getAdaptiveRewardReleaseProfile();
  const platformSharePercent = Math.max(0, Number(cfg.platformSharePercent) || 0);
  const reservePercent = Math.max(0, Number(cfg.reservePercent) || 0);
  const rewardPoolPercent = Math.max(0, Number(cfg.rewardPoolPercent) || 0);
  const cycleReleasePercent = adaptive.cycleReleasePercent;
  const dailyReleasePercent = adaptive.dailyReleasePercent;

  const platformShare = revenue * (platformSharePercent / 100);
  const reserve = revenue * (reservePercent / 100);
  const rewardPoolContribution = revenue * (rewardPoolPercent / 100);
  const cycleBudget = rewardPoolContribution * (cycleReleasePercent / 100);
  const dailyRelease = cycleBudget * (dailyReleasePercent / 100);

  const totalActivity = activeUsers * averageDailyActivityScore;
  let userShare = 0;
  if (totalActivity > 0) {
    userShare = exampleUserActivityScore / totalActivity;
  }

  const rawReward = dailyRelease * userShare * loyaltyMultiplier;
  const maxUserReward = exampleUserSpend * 1.5;
  const finalReward = Math.min(rawReward, maxUserReward);

  const warnings = [];
  if (totalActivity <= 0) {
    warnings.push("Total activity is zero (active users × average score); user share is treated as 0.");
  }
  if (rawReward > maxUserReward + 1e-9) {
    warnings.push("User capped at 150% max.");
  }
  if (rewardPoolContribution > 0 && dailyRelease / rewardPoolContribution >= 0.15) {
    warnings.push("Daily release may drain pool quickly.");
  }

  return {
    inputs: {
      simulatedRevenue: revenue,
      activeUsers,
      averageDailyActivityScore,
      exampleUserActivityScore,
      exampleUserSpend,
      loyaltyMultiplier
    },
    settingsSnapshot: {
      platformSharePercent,
      reservePercent,
      rewardPoolPercent,
      cycleReleasePercent,
      dailyReleasePercent,
      referenceCycleReleasePercent: adaptive.referenceCycleReleasePercent,
      referenceDailyReleasePercent: adaptive.referenceDailyReleasePercent
    },
    adaptiveProfile: {
      poolHealthRatio: adaptive.poolHealthRatio,
      mode: adaptive.mode,
      targetPoolBalance: adaptive.targetPoolBalance,
      currentPoolBalance: adaptive.currentPoolBalance,
      referenceCycleReleasePercent: adaptive.referenceCycleReleasePercent,
      referenceDailyReleasePercent: adaptive.referenceDailyReleasePercent
    },
    revenueSplit: {
      platformShare,
      reserve,
      rewardPoolContribution
    },
    release: {
      cycleBudget,
      dailyRelease
    },
    userPreview: {
      totalActivity,
      userShare,
      userSharePercent: userShare * 100,
      rawReward,
      maxUserReward,
      finalReward
    },
    warnings
  };
}
