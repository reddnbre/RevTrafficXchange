const AdminBackOffice = {
  tabs: [
    { id: "users", label: "User Management" },
    { id: "surfAds", label: "Surf Ads" },
    { id: "spotlightAds", label: "Spotlight Ads" },
    { id: "bannerAds", label: "Banner Ads" },
    { id: "rewardPool", label: "Reward Pool" },
    { id: "rewardSandbox", label: "Reward Sandbox" },
    { id: "miniGames", label: "Mini-Games" },
    { id: "systemHealth", label: "System Health" },
    { id: "settings", label: "Settings" }
  ],
  usersSearchQuery: "",
  editingUserId: null,
  addingUser: false,
  editDraft: {
    credits: "",
    loyaltyScore: ""
  },
  addDraft: {
    email: "",
    credits: "0",
    loyaltyScore: "0",
    status: "active"
  },
  surfAdFormVisible: false,
  surfAdEditingId: null,
  surfAdDraft: {
    url: "",
    timerSec: "20",
    credits: "1",
    maxViews: "",
    active: "true"
  },
  spotlightFormVisible: false,
  spotlightEditingId: null,
  spotlightDraft: {
    title: "",
    url: "",
    active: "true",
    priority: "1",
    startAt: "",
    endAt: ""
  },
  rewardPoolDraft: {
    platformSharePercent: "40",
    reservePercent: "20",
    rewardPoolPercent: "40",
    cycleReleasePercent: "30",
    dailyReleasePercent: "10"
  },
  rewardPoolMessage: "",
  rewardPoolMessageTone: "neutral",
  rewardPoolAdaptiveDraft: {
    targetPoolBalance: "100000",
    currentPoolBalance: "0"
  },
  /** Simulated treasury withdrawals (site / reserve only). */
  treasuryWithdrawDraft: {
    platformAmount: "",
    platformNote: "",
    reserveAmount: "",
    reserveNote: ""
  },
  miniGameDraft: {
    triggerBaseChance: "8",
    triggerSessionChance: "25",
    triggerEveryNSurfs: "15",
    cooldownMinutes: "2",
    coinDropPerfectPercent: "5",
    coinDropGoodPercent: "3",
    noRewardPercent: "25",
    creditMin: "2",
    creditMax: "5",
    miniBoostMultiplier: "1.1",
    miniBoostMinutes: "10"
  },
  miniGameMessage: "",
  miniGameMessageTone: "neutral",
  revenuePreviewDraft: {
    simulatedRevenue: "100",
    notes: ""
  },
  systemHealthMessage: "",
  systemHealthMessageTone: "neutral",
  testWalletDraft: {
    creditsAdd: "10000",
    coinsAdd: "500"
  },

  rewardSandboxDraft: {
    simulatedRevenue: "10000",
    activeUsers: "500",
    averageDailyActivityScore: "100",
    exampleUserActivityScore: "250",
    exampleUserSpend: "5000",
    loyaltyMultiplier: "1.0"
  },
  rewardSandboxResult: null,

  setTab(tabId) {
    const isKnown = this.tabs.some((tab) => tab.id === tabId);
    RTXState.adminView = isKnown ? tabId : "users";
    this.editingUserId = null;
    this.addingUser = false;
    this.resetSurfAdForm();
    this.resetSpotlightForm();
    if (tabId === "rewardPool") {
      this.rewardPoolMessage = "";
      this.rewardPoolMessageTone = "neutral";
      this.syncRewardPoolDraftFromState();
      this.syncRewardPoolAdaptiveFromState();
      this.resetTreasuryWithdrawDraft();
    }
    if (tabId === "miniGames") {
      this.miniGameMessage = "";
      this.miniGameMessageTone = "neutral";
      this.syncMiniGameDraftFromState();
    }
    if (tabId === "systemHealth") {
      this.systemHealthMessage = "";
      this.systemHealthMessageTone = "neutral";
      this.syncRevenuePreviewDraftFromState();
    }
    App.render();
  },

  syncRewardPoolDraftFromState() {
    if (typeof normalizeRewardPoolSettings === "function") {
      normalizeRewardPoolSettings();
    }
    const s = RTXState.rewardPoolSettings || {};
    this.rewardPoolDraft = {
      platformSharePercent: String(Math.max(0, Number(s.platformSharePercent) || 0)),
      reservePercent: String(Math.max(0, Number(s.reservePercent) || 0)),
      rewardPoolPercent: String(Math.max(0, Number(s.rewardPoolPercent) || 0)),
      cycleReleasePercent: String(Math.max(0, Number(s.cycleReleasePercent) || 0)),
      dailyReleasePercent: String(Math.max(0, Number(s.dailyReleasePercent) || 0))
    };
  },

  updateRewardPoolDraft(field, value) {
    this.rewardPoolDraft[field] = value;
    App.render();
  },

  syncRewardPoolAdaptiveFromState() {
    if (typeof normalizeRewardPoolAdaptive === "function") {
      normalizeRewardPoolAdaptive();
    }
    const a = RTXState.rewardPoolAdaptive || {};
    this.rewardPoolAdaptiveDraft = {
      targetPoolBalance: String(Math.max(1, Math.floor(Number(a.targetPoolBalance) || 1))),
      currentPoolBalance: String(Math.max(0, Math.floor(Number(a.currentPoolBalance) || 0)))
    };
  },

  updateRewardPoolAdaptiveDraft(field, value) {
    this.rewardPoolAdaptiveDraft[field] = value;
    App.render();
  },

  saveRewardPoolAdaptive() {
    const t = Math.max(1, Math.floor(Number(this.rewardPoolAdaptiveDraft.targetPoolBalance) || 1));
    const c = Math.max(0, Math.floor(Number(this.rewardPoolAdaptiveDraft.currentPoolBalance) || 0));
    RTXState.rewardPoolAdaptive = { targetPoolBalance: t, currentPoolBalance: c, demoBaselineCleared: true };
    if (typeof normalizeRewardPoolAdaptive === "function") {
      normalizeRewardPoolAdaptive();
    }
    if (typeof RTXAdminPersist !== "undefined" && RTXAdminPersist.save) {
      RTXAdminPersist.save();
    }
    this.syncRewardPoolAdaptiveFromState();
    this.rewardPoolMessage = "Pool levels saved (simulation). Release rates update from pool health.";
    this.rewardPoolMessageTone = "success";
    App.render();
  },

  resetSimulatedPoolBalanceToZero() {
    if (typeof resetSimulatedRewardPoolBalanceForAdminTest === "function" && resetSimulatedRewardPoolBalanceForAdminTest()) {
      this.syncRewardPoolAdaptiveFromState();
      this.rewardPoolMessage = "Simulated pool balance set to $0. Test purchases will move it from a clean baseline.";
      this.rewardPoolMessageTone = "success";
    } else {
      this.rewardPoolMessage = "Reset failed (admin only, or helper unavailable).";
      this.rewardPoolMessageTone = "error";
    }
    App.render();
  },

  resetTreasuryWithdrawDraft() {
    this.treasuryWithdrawDraft = {
      platformAmount: "",
      platformNote: "",
      reserveAmount: "",
      reserveNote: ""
    };
  },

  updateTreasuryWithdrawDraft(field, value) {
    if (!this.treasuryWithdrawDraft) this.resetTreasuryWithdrawDraft();
    this.treasuryWithdrawDraft[field] = value;
    App.render();
  },

  withdrawRevenueTreasury(bucket) {
    if (typeof withdrawFromAdminRevenueTreasury !== "function") {
      this.rewardPoolMessage = "Withdraw helper unavailable.";
      this.rewardPoolMessageTone = "error";
      App.render();
      return;
    }
    const d = this.treasuryWithdrawDraft || {};
    const amount = bucket === "reserve" ? d.reserveAmount : d.platformAmount;
    const note = bucket === "reserve" ? d.reserveNote : d.platformNote;
    const res = withdrawFromAdminRevenueTreasury(bucket, amount, note);
    this.rewardPoolMessage = res.message;
    this.rewardPoolMessageTone = res.ok ? "success" : "error";
    if (res.ok) {
      if (bucket === "reserve") {
        d.reserveAmount = "";
        d.reserveNote = "";
      } else {
        d.platformAmount = "";
        d.platformNote = "";
      }
    }
    App.render();
  },

  syncMiniGameDraftFromState() {
    if (typeof normalizeMiniGameSettings === "function") {
      normalizeMiniGameSettings();
    }
    const s = RTXState.miniGameSettings || {};
    this.miniGameDraft = {
      triggerBaseChance: String(Math.max(0, Number(s.triggerBaseChance) || 0)),
      triggerSessionChance: String(Math.max(0, Number(s.triggerSessionChance) || 0)),
      triggerEveryNSurfs: String(Math.max(0, Math.floor(Number(s.triggerEveryNSurfs) || 0))),
      cooldownMinutes: String(Math.max(0, Number(s.cooldownMinutes) || 0)),
      coinDropPerfectPercent: String(Math.max(0, Number(s.coinDropPerfectPercent) || 0)),
      coinDropGoodPercent: String(Math.max(0, Number(s.coinDropGoodPercent) || 0)),
      noRewardPercent: String(Math.max(0, Number(s.noRewardPercent) || 0)),
      creditMin: String(Math.max(1, Math.floor(Number(s.creditMin) || 1))),
      creditMax: String(Math.max(1, Math.floor(Number(s.creditMax) || 1))),
      miniBoostMultiplier: String(Math.max(1, Number(s.miniBoostMultiplier) || 1)),
      miniBoostMinutes: String(Math.max(1, Math.floor(Number(s.miniBoostMinutes) || 1)))
    };
  },

  updateMiniGameDraft(field, value) {
    this.miniGameDraft[field] = value;
    App.render();
  },

  syncRevenuePreviewDraftFromState() {
    if (typeof normalizeAdminRevenuePreview === "function") {
      normalizeAdminRevenuePreview();
    }
    const rp = RTXState.admin && RTXState.admin.revenuePreview ? RTXState.admin.revenuePreview : {};
    this.revenuePreviewDraft = {
      simulatedRevenue: String(Math.max(0, Number(rp.simulatedRevenue) || 0)),
      notes: String(rp.notes || "")
    };
  },

  updateRevenuePreviewDraft(field, value) {
    this.revenuePreviewDraft[field] = value;
    App.render();
  },

  saveRevenuePreview() {
    const sim = Math.max(0, Number(this.revenuePreviewDraft.simulatedRevenue) || 0);
    RTXState.admin.revenuePreview = {
      simulatedRevenue: sim,
      notes: String(this.revenuePreviewDraft.notes || "").slice(0, 4000)
    };
    if (typeof normalizeAdminRevenuePreview === "function") {
      normalizeAdminRevenuePreview();
    }
    if (typeof RTXAdminPersist !== "undefined" && RTXAdminPersist.save) {
      RTXAdminPersist.save();
    }
    this.syncRevenuePreviewDraftFromState();
    this.systemHealthMessage = "Revenue preview saved.";
    this.systemHealthMessageTone = "success";
    App.render();
  },

  getSystemHealthRevenueSplit() {
    if (typeof normalizeRewardPoolSettings === "function") {
      normalizeRewardPoolSettings();
    }
    if (typeof normalizeRewardPoolAdaptive === "function") {
      normalizeRewardPoolAdaptive();
    }
    const cfg = RTXState.rewardPoolSettings || {};
    const eff = typeof getAdaptiveRewardReleaseProfile === "function" ? getAdaptiveRewardReleaseProfile() : null;
    const fromDraft = Number(this.revenuePreviewDraft && this.revenuePreviewDraft.simulatedRevenue);
    const fromState = Math.max(
      0,
      Number(RTXState.admin && RTXState.admin.revenuePreview && RTXState.admin.revenuePreview.simulatedRevenue) || 0
    );
    const rev = Math.max(
      0,
      (!Number.isNaN(fromDraft) && String(this.revenuePreviewDraft.simulatedRevenue).trim() !== "" ? fromDraft : fromState) || 0
    );
    const p = Math.max(0, Number(cfg.platformSharePercent) || 0);
    const r = Math.max(0, Number(cfg.reservePercent) || 0);
    const poolPct = Math.max(0, Number(cfg.rewardPoolPercent) || 0);
    const cyc = eff ? eff.cycleReleasePercent : Math.max(0, Number(cfg.cycleReleasePercent) || 0);
    const daily = eff ? eff.dailyReleasePercent : Math.max(0, Number(cfg.dailyReleasePercent) || 0);
    const platformShare = rev * (p / 100);
    const reserveShare = rev * (r / 100);
    const rewardPoolContribution = rev * (poolPct / 100);
    const cycleRelease = rewardPoolContribution * (cyc / 100);
    const dailyRelease = cycleRelease * (daily / 100);
    return {
      rev,
      p,
      r,
      poolPct,
      cyc,
      daily,
      platformShare,
      reserveShare,
      rewardPoolContribution,
      cycleRelease,
      dailyRelease,
      poolHealthRatio: eff ? eff.poolHealthRatio : null,
      adaptiveMode: eff ? eff.mode : "",
      refCyc: eff ? eff.referenceCycleReleasePercent : null,
      refDaily: eff ? eff.referenceDailyReleasePercent : null
    };
  },

  getSystemHealthMiniGameSafety() {
    if (typeof normalizeMiniGameUserRewardLedger === "function") {
      normalizeMiniGameUserRewardLedger();
    }
    let dailyCapNum = null;
    if (typeof getMiniGameDailyRewardCapCreditsEquiv === "function") {
      try {
        const raw = getMiniGameDailyRewardCapCreditsEquiv();
        dailyCapNum = typeof raw === "number" && !Number.isNaN(raw) ? raw : null;
      } catch (e) {
        dailyCapNum = null;
      }
    }
    const used = Math.max(0, Number(RTXState.user && RTXState.user.miniGameDailyRewardLedger && RTXState.user.miniGameDailyRewardLedger.creditsEquiv) || 0);
    const capOk = dailyCapNum !== null && dailyCapNum > 0;
    const remaining = capOk ? Math.max(0, dailyCapNum - used) : null;
    let status = "Not Available";
    let statusKey = "na";
    if (capOk) {
      const ratio = used / dailyCapNum;
      if (ratio < 0.6) {
        status = "Healthy";
        statusKey = "healthy";
      } else if (ratio < 0.9) {
        status = "Watch";
        statusKey = "watch";
      } else {
        status = "Risk";
        statusKey = "risk";
      }
    }
    return {
      dailyCapDisplay: capOk ? String(Math.round(dailyCapNum * 100) / 100) : "Not Available",
      usedDisplay: String(Math.round(used * 100) / 100),
      remainingDisplay: remaining === null ? "Not Available" : String(Math.round(remaining * 100) / 100),
      status,
      statusKey
    };
  },

  escapeSystemHealthNotes(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  },

  updateTestWalletDraft(field, value) {
    this.testWalletDraft[field] = value;
    App.render();
  },

  runAdminTestWalletTopUp() {
    if (typeof applyAdminTestWalletTopUp !== "function") return;
    const ok = applyAdminTestWalletTopUp(this.testWalletDraft.creditsAdd, this.testWalletDraft.coinsAdd);
    this.systemHealthMessage = ok
      ? "Test wallet top-up applied. Premium RevCoin adds also simulate $ into the reward pool + qualified spend (local testing)."
      : "Could not apply top-up (check amounts / admin access).";
    this.systemHealthMessageTone = ok ? "success" : "error";
    App.render();
  },

  runAdminTestMembershipUpgrade() {
    if (typeof applyAdminTestMembership !== "function") return;
    const ok = applyAdminTestMembership("upgraded");
    this.systemHealthMessage = ok
      ? "Membership set to Upgraded (test). $10 simulated revenue split (site / reserve / pool) + qualified spend."
      : "Action blocked.";
    this.systemHealthMessageTone = ok ? "success" : "error";
    App.render();
  },

  runAdminTestMembershipFree() {
    if (typeof applyAdminTestMembership !== "function") return;
    const ok = applyAdminTestMembership("free");
    this.systemHealthMessage = ok ? "Membership set to Free (test)." : "Action blocked.";
    this.systemHealthMessageTone = ok ? "success" : "error";
    App.render();
  },

  runAdminResetTodaysDailyCounters() {
    if (typeof resetTodaysDailyCountersForAdminTest !== "function") return;
    const ok = resetTodaysDailyCountersForAdminTest();
    this.systemHealthMessage = ok
      ? "Today’s daily counters reset (views, activity score, ad view locks, mini-game ledger, session mini-game throttle)."
      : "Action blocked.";
    this.systemHealthMessageTone = ok ? "success" : "error";
    App.render();
  },

  saveMiniGameSettings() {
    const creditMin = Math.max(1, Math.floor(Number(this.miniGameDraft.creditMin) || 1));
    let creditMax = Math.max(1, Math.floor(Number(this.miniGameDraft.creditMax) || 1));
    if (creditMax < creditMin) creditMax = creditMin;
    RTXState.miniGameSettings = {
      triggerBaseChance: Math.max(0, Math.min(100, Number(this.miniGameDraft.triggerBaseChance) || 0)),
      triggerSessionChance: Math.max(0, Math.min(100, Number(this.miniGameDraft.triggerSessionChance) || 0)),
      cooldownMinutes: Math.max(0, Math.min(1440, Number(this.miniGameDraft.cooldownMinutes) || 0)),
      coinDropPerfectPercent: Math.max(0, Math.min(100, Number(this.miniGameDraft.coinDropPerfectPercent) || 0)),
      coinDropGoodPercent: Math.max(0, Math.min(100, Number(this.miniGameDraft.coinDropGoodPercent) || 0)),
      noRewardPercent: Math.max(0, Math.min(100, Number(this.miniGameDraft.noRewardPercent) || 0)),
      creditMin,
      creditMax,
      miniBoostMultiplier: Math.max(1, Number(this.miniGameDraft.miniBoostMultiplier) || 1),
      miniBoostMinutes: Math.max(1, Math.floor(Number(this.miniGameDraft.miniBoostMinutes) || 1))
    };
    if (typeof normalizeMiniGameSettings === "function") {
      normalizeMiniGameSettings();
    }
    if (typeof RTXAdminPersist !== "undefined" && RTXAdminPersist.save) {
      RTXAdminPersist.save();
    }
    this.syncMiniGameDraftFromState();
    this.miniGameMessage = "Mini-game economy saved";
    this.miniGameMessageTone = "success";
    App.render();
  },

  saveRewardPoolSettings() {
    const p = {
      platformSharePercent: Math.max(0, Number(this.rewardPoolDraft.platformSharePercent) || 0),
      reservePercent: Math.max(0, Number(this.rewardPoolDraft.reservePercent) || 0),
      rewardPoolPercent: Math.max(0, Number(this.rewardPoolDraft.rewardPoolPercent) || 0),
      cycleReleasePercent: Math.max(0, Number(this.rewardPoolDraft.cycleReleasePercent) || 0),
      dailyReleasePercent: Math.max(0, Number(this.rewardPoolDraft.dailyReleasePercent) || 0)
    };
    const topSum = p.platformSharePercent + p.reservePercent + p.rewardPoolPercent;
    if (Math.abs(topSum - 100) > 0.001) {
      this.rewardPoolMessage = "Allocation must equal 100%";
      this.rewardPoolMessageTone = "error";
      App.render();
      return;
    }
    RTXState.rewardPoolSettings = { ...p };
    if (typeof normalizeRewardPoolSettings === "function") {
      normalizeRewardPoolSettings();
    }
    if (typeof RTXAdminPersist !== "undefined" && RTXAdminPersist.save) {
      RTXAdminPersist.save();
    }
    this.syncRewardPoolDraftFromState();
    this.rewardPoolMessage = "Settings saved";
    this.rewardPoolMessageTone = "success";
    App.render();
  },

  getRewardPoolPreviewNumbers() {
    const revenue = 100;
    const p = {
      platformSharePercent: Math.max(0, Number(this.rewardPoolDraft.platformSharePercent) || 0),
      reservePercent: Math.max(0, Number(this.rewardPoolDraft.reservePercent) || 0),
      rewardPoolPercent: Math.max(0, Number(this.rewardPoolDraft.rewardPoolPercent) || 0),
      cycleReleasePercent: Math.max(0, Number(this.rewardPoolDraft.cycleReleasePercent) || 0),
      dailyReleasePercent: Math.max(0, Number(this.rewardPoolDraft.dailyReleasePercent) || 0)
    };
    const topSum = p.platformSharePercent + p.reservePercent + p.rewardPoolPercent;
    const platformShare = revenue * (p.platformSharePercent / 100);
    const reserve = revenue * (p.reservePercent / 100);
    const rewardPool = revenue * (p.rewardPoolPercent / 100);
    let eff = null;
    if (typeof getAdaptiveRewardReleaseProfile === "function") {
      if (typeof normalizeRewardPoolAdaptive === "function") normalizeRewardPoolAdaptive();
      eff = getAdaptiveRewardReleaseProfile();
    }
    const activeCycle = eff ? eff.cycleReleasePercent : p.cycleReleasePercent;
    const activeDaily = eff ? eff.dailyReleasePercent : p.dailyReleasePercent;
    const cycleBudget = rewardPool * (activeCycle / 100);
    const dailyRelease = cycleBudget * (activeDaily / 100);
    return {
      revenue,
      topSum,
      topValid: Math.abs(topSum - 100) <= 0.001,
      platformShare,
      reserve,
      rewardPool,
      cycleBudget,
      dailyRelease,
      p,
      activeCycle,
      activeDaily,
      adaptive: eff
    };
  },

  renderRewardPoolBody() {
    const preview = this.getRewardPoolPreviewNumbers();
    const fmt = (n) => `$${Number(n).toFixed(2)}`;
    const ad = preview.adaptive;
    const poolHealthDisplay =
      ad && typeof ad.poolHealthRatio === "number" && Number.isFinite(ad.poolHealthRatio)
        ? (ad.poolHealthRatio * 100).toFixed(1) + "%"
        : "—";
    const adraft = this.rewardPoolAdaptiveDraft;
    if (typeof normalizeAdminRevenueTreasury === "function") {
      normalizeAdminRevenueTreasury();
    }
    const tre = (RTXState.admin && RTXState.admin.revenueTreasury) || {};
    const twd = this.treasuryWithdrawDraft || {};
    const memberPoolBal =
      preview.adaptive && typeof preview.adaptive.currentPoolBalance === "number"
        ? preview.adaptive.currentPoolBalance
        : Math.max(0, Math.floor(Number((RTXState.rewardPoolAdaptive || {}).currentPoolBalance) || 0));
    const treasuryRows = `
      <div class="admin-revenue-treasury panel">
        <h4>Treasury balances (simulated)</h4>
        <p class="admin-revenue-treasury-muted">Local ledger only — not banking. Simulated purchases split revenue into <strong>site (admin)</strong>, <strong>reserve (ops)</strong>, and the <strong>member reward pool</strong> using the percentages below. You can record withdrawals from site and reserve when you pay yourself or cover hosting; the member pool is not withdrawn here.</p>
        <div class="admin-revenue-treasury-grid">
          <div class="admin-revenue-treasury-card">
            <div class="admin-revenue-treasury-card-title">Site / admin earnings</div>
            <div class="admin-revenue-treasury-balance">${fmt(Number(tre.platformBalance) || 0)}</div>
            <div class="admin-revenue-treasury-withdraw">
              <label>
                Amount
                <input type="number" min="0" step="0.01" placeholder="0.00" value="${String(twd.platformAmount ?? "").replace(/"/g, "&quot;")}" oninput="AdminBackOffice.updateTreasuryWithdrawDraft('platformAmount', this.value)" />
              </label>
              <label>
                Note (optional)
                <input type="text" maxlength="200" placeholder="e.g. owner draw" value="${String(twd.platformNote ?? "").replace(/"/g, "&quot;")}" oninput="AdminBackOffice.updateTreasuryWithdrawDraft('platformNote', this.value)" />
              </label>
              <button type="button" class="admin-action-btn" onclick="AdminBackOffice.withdrawRevenueTreasury('platform')">Record withdrawal</button>
            </div>
          </div>
          <div class="admin-revenue-treasury-card">
            <div class="admin-revenue-treasury-card-title">Reserve (maintenance)</div>
            <div class="admin-revenue-treasury-balance">${fmt(Number(tre.reserveBalance) || 0)}</div>
            <div class="admin-revenue-treasury-withdraw">
              <label>
                Amount
                <input type="number" min="0" step="0.01" placeholder="0.00" value="${String(twd.reserveAmount ?? "").replace(/"/g, "&quot;")}" oninput="AdminBackOffice.updateTreasuryWithdrawDraft('reserveAmount', this.value)" />
              </label>
              <label>
                Note (optional)
                <input type="text" maxlength="200" placeholder="e.g. hosting invoice" value="${String(twd.reserveNote ?? "").replace(/"/g, "&quot;")}" oninput="AdminBackOffice.updateTreasuryWithdrawDraft('reserveNote', this.value)" />
              </label>
              <button type="button" class="admin-action-btn" onclick="AdminBackOffice.withdrawRevenueTreasury('reserve')">Record withdrawal</button>
            </div>
          </div>
          <div class="admin-revenue-treasury-card admin-revenue-treasury-card-readonly">
            <div class="admin-revenue-treasury-card-title">Member reward pool</div>
            <div class="admin-revenue-treasury-balance">${fmt(memberPoolBal)}</div>
            <p class="admin-revenue-treasury-hint">Funded from the reward-pool share of revenue. Same figure as current pool balance below (integer dollars in this simulation). Not withdrawable here for admin—reserved for member payouts via release rules.</p>
          </div>
        </div>
        ${
          Array.isArray(tre.withdrawalLog) && tre.withdrawalLog.length
            ? `<div class="admin-revenue-treasury-log">
                <h5>Recent recorded withdrawals</h5>
                <ul class="admin-revenue-treasury-log-list">
                  ${tre.withdrawalLog
                    .slice(0, 8)
                    .map(
                      (w) => {
                        const noteEsc = String(w.note || "")
                          .replace(/&/g, "&amp;")
                          .replace(/</g, "&lt;")
                          .replace(/>/g, "&gt;");
                        return `<li><span class="admin-revenue-treasury-log-amt">$${Number(w.amount).toFixed(2)}</span> <span class="admin-revenue-treasury-log-bucket">${w.bucket === "reserve" ? "reserve" : "site"}</span> <span class="admin-revenue-treasury-log-note">${noteEsc}</span></li>`;
                      }
                    )
                    .join("")}
                </ul>
              </div>`
            : ""
        }
      </div>
    `;
    return `
      <h3>Reward Pool Controls</h3>
      <p>Adjust <strong>revenue split</strong> (platform / reserve / reward pool) below. Platform and reserve shares are fixed by those percents. <strong>Cycle and daily release</strong> fields are reference values only—live release rates self-adjust from pool health (current vs target balance) and do not change the revenue split.</p>
      ${treasuryRows}
      <div class="admin-reward-pool-adaptive panel">
        <h4>Pool health &amp; adaptive release</h4>
        <p class="admin-reward-pool-adaptive-muted">Simulated balances (local only). Ratio = current ÷ target.</p>
        <div class="admin-reward-pool-adaptive-metrics">
          <div><span class="admin-reward-pool-adaptive-label">Pool health</span><span class="admin-reward-pool-adaptive-value">${poolHealthDisplay}</span></div>
          <div><span class="admin-reward-pool-adaptive-label">Current mode</span><span class="admin-reward-pool-adaptive-value">${ad ? ad.mode : "—"}</span></div>
          <div><span class="admin-reward-pool-adaptive-label">Active cycle release</span><span class="admin-reward-pool-adaptive-value">${ad ? `${ad.cycleReleasePercent}%` : "—"}</span></div>
          <div><span class="admin-reward-pool-adaptive-label">Active daily release</span><span class="admin-reward-pool-adaptive-value">${ad ? `${ad.dailyReleasePercent}%` : "—"}</span></div>
        </div>
        <div class="admin-reward-pool-adaptive-form">
          <label>
            Target pool balance (simulated)
            <input type="number" min="1" step="1" value="${adraft.targetPoolBalance}" oninput="AdminBackOffice.updateRewardPoolAdaptiveDraft('targetPoolBalance', this.value)" />
          </label>
          <label>
            Current pool balance (simulated)
            <input type="number" min="0" step="1" value="${adraft.currentPoolBalance}" oninput="AdminBackOffice.updateRewardPoolAdaptiveDraft('currentPoolBalance', this.value)" />
          </label>
        </div>
        <div class="admin-edit-actions">
          <button type="button" class="admin-action-btn" onclick="AdminBackOffice.saveRewardPoolAdaptive()">Save pool levels</button>
          <button type="button" class="admin-action-btn" onclick="AdminBackOffice.resetSimulatedPoolBalanceToZero()">Reset simulated pool to $0</button>
        </div>
      </div>
      <div class="admin-reward-pool-form-wrap">
        <div class="admin-reward-pool-grid">
          <label>
            Platform Share (%)
            <input
              type="number"
              min="0"
              max="100"
              value="${this.rewardPoolDraft.platformSharePercent}"
              oninput="AdminBackOffice.updateRewardPoolDraft('platformSharePercent', this.value)"
            />
          </label>
          <label>
            Reserve (%)
            <input
              type="number"
              min="0"
              max="100"
              value="${this.rewardPoolDraft.reservePercent}"
              oninput="AdminBackOffice.updateRewardPoolDraft('reservePercent', this.value)"
            />
          </label>
          <label>
            Reward Pool (%)
            <input
              type="number"
              min="0"
              max="100"
              value="${this.rewardPoolDraft.rewardPoolPercent}"
              oninput="AdminBackOffice.updateRewardPoolDraft('rewardPoolPercent', this.value)"
            />
          </label>
          <label>
            Cycle Release (%)
            <input
              type="number"
              min="0"
              max="100"
              value="${this.rewardPoolDraft.cycleReleasePercent}"
              oninput="AdminBackOffice.updateRewardPoolDraft('cycleReleasePercent', this.value)"
            />
          </label>
          <label>
            Daily Release (%)
            <input
              type="number"
              min="0"
              max="100"
              value="${this.rewardPoolDraft.dailyReleasePercent}"
              oninput="AdminBackOffice.updateRewardPoolDraft('dailyReleasePercent', this.value)"
            />
          </label>
        </div>
        ${
          this.rewardPoolMessage
            ? `<div class="admin-reward-pool-message ${this.rewardPoolMessageTone}">${this.rewardPoolMessage}</div>`
            : ""
        }
        <div class="admin-edit-actions">
          <button type="button" class="admin-action-btn" onclick="AdminBackOffice.saveRewardPoolSettings()">Save Settings</button>
        </div>
      </div>
      <div class="admin-reward-pool-preview panel">
        <h4>Distribution Preview</h4>
        <p class="admin-reward-pool-preview-note">Example revenue input: ${fmt(preview.revenue)}</p>
        ${
          preview.topValid
            ? ""
            : `<div class="admin-reward-pool-preview-warn">Allocation must equal 100%</div>`
        }
        <div class="admin-reward-pool-preview-lines">
          <div>Platform Share: ${fmt(preview.platformShare)} (${preview.p.platformSharePercent}%)</div>
          <div>Reserve: ${fmt(preview.reserve)} (${preview.p.reservePercent}%)</div>
          <div>Reward Pool: ${fmt(preview.rewardPool)} (${preview.p.rewardPoolPercent}%)</div>
          <div>Cycle Budget: ${fmt(preview.cycleBudget)} (<strong>${preview.activeCycle}%</strong> of pool — adaptive)</div>
          <div>Daily Release: ${fmt(preview.dailyRelease)} (<strong>${preview.activeDaily}%</strong> of cycle — adaptive)</div>
          <div class="admin-reward-pool-preview-ref">Stored reference cycle / daily: ${preview.p.cycleReleasePercent}% / ${preview.p.dailyReleasePercent}% (not used for release math when pool adaptive is active)</div>
        </div>
      </div>
    `;
  },

  updateRewardSandboxDraft(field, value) {
    this.rewardSandboxDraft[field] = value;
    this.rewardSandboxResult = null;
    App.render();
  },

  fmtSandboxMoney(n) {
    const v = Number(n);
    if (!Number.isFinite(v)) return "$0.00";
    return `$${v.toFixed(2)}`;
  },

  runRewardSandboxSimulation() {
    if (typeof computeRewardPoolSandboxSimulation !== "function") return;
    if (typeof normalizeRewardPoolSettings === "function") {
      normalizeRewardPoolSettings();
    }
    if (typeof normalizeRewardPoolAdaptive === "function") {
      normalizeRewardPoolAdaptive();
    }
    const d = this.rewardSandboxDraft;
    const input = {
      simulatedRevenue: Math.max(0, Number(d.simulatedRevenue) || 0),
      activeUsers: Math.max(0, Math.floor(Number(d.activeUsers) || 0)),
      averageDailyActivityScore: Math.max(0, Number(d.averageDailyActivityScore) || 0),
      exampleUserActivityScore: Math.max(0, Number(d.exampleUserActivityScore) || 0),
      exampleUserSpend: Math.max(0, Number(d.exampleUserSpend) || 0),
      loyaltyMultiplier: Math.max(0, Number(d.loyaltyMultiplier) || 0)
    };
    const pool = RTXState.rewardPoolSettings && typeof RTXState.rewardPoolSettings === "object" ? { ...RTXState.rewardPoolSettings } : {};
    this.rewardSandboxResult = computeRewardPoolSandboxSimulation(input, pool);
    App.render();
  },

  renderRewardSandboxBody() {
    const d = this.rewardSandboxDraft;
    if (typeof normalizeRewardPoolSettings === "function") {
      normalizeRewardPoolSettings();
    }
    if (typeof normalizeRewardPoolAdaptive === "function") {
      normalizeRewardPoolAdaptive();
    }
    const s = RTXState.rewardPoolSettings || {};
    const pct = (n) => `${Math.max(0, Number(n) || 0)}%`;
    const eff = typeof getAdaptiveRewardReleaseProfile === "function" ? getAdaptiveRewardReleaseProfile() : null;
    const res = this.rewardSandboxResult;
    const fmt = (x) => this.fmtSandboxMoney(x);
    const ap = res && res.adaptiveProfile ? res.adaptiveProfile : null;

    const resultsBlock = res
      ? `
        <div class="admin-sandbox-results panel">
          <h4>Simulation output</h4>
          <div class="admin-sandbox-results-grid">
            <div class="admin-sandbox-result-col">
              <h5>Revenue split</h5>
              <ul class="admin-sandbox-kv">
                <li><span>Platform Share</span><span>${fmt(res.revenueSplit.platformShare)}</span></li>
                <li><span>Reserve</span><span>${fmt(res.revenueSplit.reserve)}</span></li>
                <li><span>Reward Pool Contribution</span><span>${fmt(res.revenueSplit.rewardPoolContribution)}</span></li>
              </ul>
            </div>
            <div class="admin-sandbox-result-col">
              <h5>Reward release</h5>
              <ul class="admin-sandbox-kv">
                <li><span>Cycle Budget</span><span>${fmt(res.release.cycleBudget)}</span></li>
                <li><span>Daily Release</span><span>${fmt(res.release.dailyRelease)}</span></li>
              </ul>
            </div>
            ${
              ap
                ? `<div class="admin-sandbox-result-col">
              <h5>Adaptive pool</h5>
              <ul class="admin-sandbox-kv">
                <li><span>Pool health</span><span>${(ap.poolHealthRatio * 100).toFixed(1)}%</span></li>
                <li><span>Mode</span><span>${this.escapeSystemHealthNotes(ap.mode)}</span></li>
                <li><span>Active cycle release</span><span>${Number(ap.cycleReleasePercent).toFixed(2)}%</span></li>
                <li><span>Active daily release</span><span>${Number(ap.dailyReleasePercent).toFixed(2)}%</span></li>
              </ul>
            </div>`
                : ""
            }
            <div class="admin-sandbox-result-col">
              <h5>User preview</h5>
              <ul class="admin-sandbox-kv">
                <li><span>User Share</span><span>${Number.isFinite(res.userPreview.userSharePercent) ? res.userPreview.userSharePercent.toFixed(2) : "0.00"}%</span></li>
                <li><span>Raw Reward</span><span>${fmt(res.userPreview.rawReward)}</span></li>
                <li><span>Max Cap (150% of spend)</span><span>${fmt(res.userPreview.maxUserReward)}</span></li>
                <li><span>Final Reward Preview</span><span class="admin-sandbox-highlight">${fmt(res.userPreview.finalReward)}</span></li>
              </ul>
            </div>
          </div>
          ${
            res.warnings && res.warnings.length
              ? `<ul class="admin-sandbox-warnings">${res.warnings.map((w) => `<li>${this.escapeSystemHealthNotes(w)}</li>`).join("")}</ul>`
              : ""
          }
        </div>
      `
      : `<p class="admin-sandbox-placeholder">Run the simulation to see revenue split, release amounts, and a capped user reward preview.</p>`;

    return `
      <h3>Reward Pool Sandbox Simulator</h3>
      <p class="admin-sandbox-lead">Hypothetical math only. No payouts, no balance changes, no payment integration. Uses <strong>saved</strong> percentages from Reward Pool settings.</p>
      <div class="admin-sandbox-disclaimer panel" role="note">
        <strong>Simulation only.</strong> Results are not applied to any member account and do not alter live surf or reward logic.
      </div>

      <div class="admin-sandbox-settings-readonly panel">
        <h4>Active pool settings (from Reward Pool tab)</h4>
        <ul class="admin-sandbox-settings-list">
          <li>Platform share: ${pct(s.platformSharePercent)}</li>
          <li>Reserve: ${pct(s.reservePercent)}</li>
          <li>Reward pool: ${pct(s.rewardPoolPercent)}</li>
          <li>Stored reference cycle / daily: ${pct(s.cycleReleasePercent)} / ${pct(s.dailyReleasePercent)}</li>
          ${
            eff
              ? `<li>Adaptive cycle / daily (current pool health): ${Number(eff.cycleReleasePercent).toFixed(2)}% / ${Number(
                  eff.dailyReleasePercent
                ).toFixed(2)}% — mode <strong>${this.escapeSystemHealthNotes(eff.mode)}</strong>, health ${(eff.poolHealthRatio * 100).toFixed(1)}%</li>`
              : ""
          }
        </ul>
      </div>

      <div class="admin-sandbox-form-wrap panel">
        <h4>Sandbox inputs</h4>
        <div class="admin-sandbox-input-grid">
          <label>
            Simulated Revenue
            <input type="number" min="0" step="0.01" value="${d.simulatedRevenue}" oninput="AdminBackOffice.updateRewardSandboxDraft('simulatedRevenue', this.value)" />
          </label>
          <label>
            Number of Active Users
            <input type="number" min="0" step="1" value="${d.activeUsers}" oninput="AdminBackOffice.updateRewardSandboxDraft('activeUsers', this.value)" />
          </label>
          <label>
            Average Daily Activity Score
            <input type="number" min="0" step="0.01" value="${d.averageDailyActivityScore}" oninput="AdminBackOffice.updateRewardSandboxDraft('averageDailyActivityScore', this.value)" />
          </label>
          <label>
            Example User Activity Score
            <input type="number" min="0" step="0.01" value="${d.exampleUserActivityScore}" oninput="AdminBackOffice.updateRewardSandboxDraft('exampleUserActivityScore', this.value)" />
          </label>
          <label>
            Example User Spend
            <input type="number" min="0" step="0.01" value="${d.exampleUserSpend}" oninput="AdminBackOffice.updateRewardSandboxDraft('exampleUserSpend', this.value)" />
          </label>
          <label>
            Loyalty Multiplier
            <input type="number" min="0" step="0.01" value="${d.loyaltyMultiplier}" oninput="AdminBackOffice.updateRewardSandboxDraft('loyaltyMultiplier', this.value)" />
          </label>
        </div>
        <div class="admin-edit-actions admin-sandbox-actions">
          <button type="button" class="btn btn-primary admin-sandbox-run-btn" onclick="AdminBackOffice.runRewardSandboxSimulation()">Run Simulation</button>
        </div>
      </div>

      ${resultsBlock}
    `;
  },

  getMiniGameSafetyMonitorSnapshot() {
    if (typeof normalizeMiniGameProfitSafeguards === "function") normalizeMiniGameProfitSafeguards();
    if (typeof normalizeMiniGameUserRewardLedger === "function") normalizeMiniGameUserRewardLedger();
    const sg = RTXState.miniGameProfitSafeguards && typeof RTXState.miniGameProfitSafeguards === "object" ? RTXState.miniGameProfitSafeguards : {};
    const ledger =
      RTXState.user && RTXState.user.miniGameDailyRewardLedger && typeof RTXState.user.miniGameDailyRewardLedger === "object"
        ? RTXState.user.miniGameDailyRewardLedger
        : {};
    let dailyCapNum = null;
    if (typeof getMiniGameDailyRewardCapCreditsEquiv === "function") {
      try {
        const raw = getMiniGameDailyRewardCapCreditsEquiv();
        dailyCapNum = typeof raw === "number" && !Number.isNaN(raw) ? raw : 0;
      } catch (e) {
        dailyCapNum = null;
      }
    }
    const dailyUsed = Math.max(0, Number(ledger.creditsEquiv) || 0);
    const dailyRemaining =
      dailyCapNum === null ? null : Math.max(0, Math.round((dailyCapNum - dailyUsed) * 100) / 100);
    let sessionPaidGrants = 0;
    if (typeof window !== "undefined" && window.MiniGameSystem && typeof window.MiniGameSystem._miniGameSessionGrantCount === "number") {
      sessionPaidGrants = Math.max(0, Math.floor(window.MiniGameSystem._miniGameSessionGrantCount));
    }
    return {
      notionalPool: Math.max(0, Number(sg.notionalPoolBalance) || 0),
      dailyCapDisplay: dailyCapNum === null ? "N/A" : String(Math.round(dailyCapNum * 100) / 100),
      dailyUsedDisplay: String(Math.round(dailyUsed * 100) / 100),
      dailyRemainingDisplay: dailyRemaining === null ? "N/A" : String(dailyRemaining),
      maxPerGame: Math.max(0, Number(sg.maxCreditsEquivPerMiniGame) || 0),
      coinEquiv: Math.max(0, Number(sg.coinCreditsEquiv) || 0),
      boostEquiv: Math.max(0, Number(sg.boostApplyCreditsEquiv) || 0),
      softThrottleAfter: Math.max(0, Math.floor(Number(sg.softThrottleAfterGrants) || 0)),
      sessionPaidGrants,
      maxBoostMult: Math.max(0, Number(sg.maxStackedBoostMultiplier) || 0)
    };
  },

  renderMiniGamesBody() {
    const d = this.miniGameDraft;
    const mon = this.getMiniGameSafetyMonitorSnapshot();
    return `
      <h3>Mini-Game Economy</h3>
      <p>Adjust surf mini-game trigger rates and reward tuning. Values persist in local admin storage and apply to the next mini-game trigger.</p>
      <div class="admin-minigame-form-wrap">
        <div class="admin-minigame-grid">
          <label>
            Base trigger chance (%)
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value="${d.triggerBaseChance}"
              oninput="AdminBackOffice.updateMiniGameDraft('triggerBaseChance', this.value)"
            />
          </label>
          <label>
            Session trigger chance (%)
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value="${d.triggerSessionChance}"
              oninput="AdminBackOffice.updateMiniGameDraft('triggerSessionChance', this.value)"
            />
          </label>
          <label>
            Guaranteed mini-game every N views today (0 = off)
            <input
              type="number"
              min="0"
              max="500"
              step="1"
              value="${d.triggerEveryNSurfs}"
              oninput="AdminBackOffice.updateMiniGameDraft('triggerEveryNSurfs', this.value)"
            />
          </label>
          <label>
            Cooldown (minutes)
            <input
              type="number"
              min="0"
              max="1440"
              step="1"
              value="${d.cooldownMinutes}"
              oninput="AdminBackOffice.updateMiniGameDraft('cooldownMinutes', this.value)"
            />
          </label>
          <label>
            Perfect coin chance (%)
            <input
              type="number"
              min="0"
              max="100"
              value="${d.coinDropPerfectPercent}"
              oninput="AdminBackOffice.updateMiniGameDraft('coinDropPerfectPercent', this.value)"
            />
          </label>
          <label>
            Good / Hit coin chance (%)
            <input
              type="number"
              min="0"
              max="100"
              value="${d.coinDropGoodPercent}"
              oninput="AdminBackOffice.updateMiniGameDraft('coinDropGoodPercent', this.value)"
            />
          </label>
          <label>
            No reward on hit (%)
            <input
              type="number"
              min="0"
              max="100"
              value="${d.noRewardPercent}"
              oninput="AdminBackOffice.updateMiniGameDraft('noRewardPercent', this.value)"
            />
          </label>
          <label>
            Credit min
            <input
              type="number"
              min="1"
              value="${d.creditMin}"
              oninput="AdminBackOffice.updateMiniGameDraft('creditMin', this.value)"
            />
          </label>
          <label>
            Credit max
            <input
              type="number"
              min="1"
              value="${d.creditMax}"
              oninput="AdminBackOffice.updateMiniGameDraft('creditMax', this.value)"
            />
          </label>
          <label>
            Mini boost multiplier
            <input
              type="number"
              min="1"
              step="0.05"
              value="${d.miniBoostMultiplier}"
              oninput="AdminBackOffice.updateMiniGameDraft('miniBoostMultiplier', this.value)"
            />
          </label>
          <label>
            Mini boost duration (minutes)
            <input
              type="number"
              min="1"
              value="${d.miniBoostMinutes}"
              oninput="AdminBackOffice.updateMiniGameDraft('miniBoostMinutes', this.value)"
            />
          </label>
        </div>
        ${
          this.miniGameMessage
            ? `<div class="admin-minigame-message ${this.miniGameMessageTone}">${this.miniGameMessage}</div>`
            : ""
        }
        <div class="admin-edit-actions">
          <button type="button" class="admin-action-btn" onclick="AdminBackOffice.saveMiniGameSettings()">Save Settings</button>
        </div>
      </div>

      <div class="admin-minigame-safety-monitor panel">
        <h4>Mini-Game Safety Monitor</h4>
        <div class="admin-minigame-safety-grid">
          <div class="admin-minigame-safety-row">
            <span class="admin-minigame-safety-label">Notional Pool Balance</span>
            <span class="admin-minigame-safety-value">${mon.notionalPool}</span>
          </div>
          <div class="admin-minigame-safety-row">
            <span class="admin-minigame-safety-label">Daily Reward Cap</span>
            <span class="admin-minigame-safety-value">${mon.dailyCapDisplay}</span>
          </div>
          <div class="admin-minigame-safety-row">
            <span class="admin-minigame-safety-label">Daily Rewards Used</span>
            <span class="admin-minigame-safety-value">${mon.dailyUsedDisplay}</span>
          </div>
          <div class="admin-minigame-safety-row">
            <span class="admin-minigame-safety-label">Daily Rewards Remaining</span>
            <span class="admin-minigame-safety-value">${mon.dailyRemainingDisplay}</span>
          </div>
          <div class="admin-minigame-safety-row">
            <span class="admin-minigame-safety-label">Max Reward Per Mini-Game</span>
            <span class="admin-minigame-safety-value">${mon.maxPerGame}</span>
          </div>
          <div class="admin-minigame-safety-row">
            <span class="admin-minigame-safety-label">Coin Credit Equivalent</span>
            <span class="admin-minigame-safety-value">${mon.coinEquiv}</span>
          </div>
          <div class="admin-minigame-safety-row">
            <span class="admin-minigame-safety-label">Boost Credit Equivalent</span>
            <span class="admin-minigame-safety-value">${mon.boostEquiv}</span>
          </div>
          <div class="admin-minigame-safety-row">
            <span class="admin-minigame-safety-label">Soft Throttle After Grants</span>
            <span class="admin-minigame-safety-value">${mon.softThrottleAfter}</span>
          </div>
          <div class="admin-minigame-safety-row">
            <span class="admin-minigame-safety-label">Current Session Paid Grants</span>
            <span class="admin-minigame-safety-value">${mon.sessionPaidGrants}</span>
          </div>
          <div class="admin-minigame-safety-row">
            <span class="admin-minigame-safety-label">Max Boost Multiplier</span>
            <span class="admin-minigame-safety-value">${
              mon.maxBoostMult > 0 ? Number(mon.maxBoostMult).toFixed(2) : "N/A"
            }</span>
          </div>
        </div>
        <p class="admin-minigame-safety-foot">Admin Safety Monitor — display only.</p>
      </div>
    `;
  },

  renderSystemHealthBody() {
    const split = this.getSystemHealthRevenueSplit();
    const mg = this.getSystemHealthMiniGameSafety();
    const fmt = (n) => `$${Number(n).toFixed(2)}`;
    const notesSafe = this.escapeSystemHealthNotes(this.revenuePreviewDraft.notes);
    return `
      <h3>Revenue & System Health</h3>
      <p class="admin-system-health-lead">
        Preview-only dashboard. Simulated revenue drives the split math below. No payments, payouts, or reward logic changes.
      </p>
      ${
        this.systemHealthMessage
          ? `<div class="admin-system-health-message ${this.systemHealthMessageTone}">${this.systemHealthMessage}</div>`
          : ""
      }

      <div class="admin-system-health-section panel">
        <h4>Section 1: Revenue Preview</h4>
        <div class="admin-system-health-form">
          <label>
            Simulated Revenue
            <input
              type="number"
              min="0"
              step="0.01"
              value="${this.revenuePreviewDraft.simulatedRevenue}"
              oninput="AdminBackOffice.updateRevenuePreviewDraft('simulatedRevenue', this.value)"
            />
          </label>
          <label class="admin-system-health-notes-label">
            Notes (optional)
            <textarea
              rows="3"
              class="admin-system-health-textarea"
              oninput="AdminBackOffice.updateRevenuePreviewDraft('notes', this.value)"
            >${notesSafe}</textarea>
          </label>
        </div>
        <div class="admin-edit-actions">
          <button type="button" class="admin-action-btn" onclick="AdminBackOffice.saveRevenuePreview()">Save</button>
        </div>
      </div>

      <div class="admin-system-health-section panel">
        <h4>Section 2: Revenue Split</h4>
        <p class="admin-system-health-muted">Based on <strong>rewardPoolSettings</strong> and simulated revenue <strong>${fmt(split.rev)}</strong>.</p>
        <ul class="admin-system-health-lines">
          <li><span>Platform Share</span><span>${fmt(split.platformShare)} (${split.p}%)</span></li>
          <li><span>Reserve Share</span><span>${fmt(split.reserveShare)} (${split.r}%)</span></li>
          <li><span>Reward Pool Contribution</span><span>${fmt(split.rewardPoolContribution)} (${split.poolPct}%)</span></li>
        </ul>
      </div>

      <div class="admin-system-health-section panel">
        <h4>Section 3: Reward Pool Release Preview</h4>
        <p class="admin-system-health-muted">Cycle and daily percentages are <strong>adaptive</strong> from pool health (current ${split.poolHealthRatio != null ? (split.poolHealthRatio * 100).toFixed(1) + "%" : "—"} of target). Mode: <strong>${split.adaptiveMode || "—"}</strong>.</p>
        <ul class="admin-system-health-lines">
          <li><span>Reward Pool Contribution</span><span>${fmt(split.rewardPoolContribution)}</span></li>
          <li><span>Cycle Release</span><span>${fmt(split.cycleRelease)} (${split.cyc}% of reward pool slice)</span></li>
          <li><span>Daily Release</span><span>${fmt(split.dailyRelease)} (${split.daily}% of cycle budget)</span></li>
        </ul>
      </div>

      <div class="admin-system-health-section panel">
        <h4>Section 4: Mini-Game Safety</h4>
        <ul class="admin-system-health-lines">
          <li><span>Mini-game Daily Reward Cap</span><span>${mg.dailyCapDisplay}</span></li>
          <li><span>Mini-game Rewards Used Today</span><span>${mg.usedDisplay}</span></li>
          <li><span>Mini-game Rewards Remaining</span><span>${mg.remainingDisplay}</span></li>
        </ul>
      </div>

      <div class="admin-system-health-section panel">
        <h4>Section 5: Health Status</h4>
        <p class="admin-system-health-status-line">
          System Status:
          <span class="admin-system-health-status-pill ${mg.statusKey}">${mg.status}</span>
        </p>
        <ul class="admin-system-health-legend">
          <li><strong>Healthy</strong> — rewards are within safe range.</li>
          <li><strong>Watch</strong> — rewards are approaching daily limit.</li>
          <li><strong>Risk</strong> — rewards are near or above daily limit.</li>
          <li><strong>Not Available</strong> — daily cap is zero or unavailable.</li>
        </ul>
      </div>

      <div class="admin-system-health-section panel admin-system-health-test">
        <h4>Section 6: Local testing (admin only)</h4>
        <p class="admin-system-health-muted">
          Fake balances and resets are stored in your browser only. No real payments. Use this to exercise pool math, upgrades, and daily counters.
        </p>
        <div class="admin-system-health-test-grid">
          <div>
            <div class="admin-system-health-test-title">Test wallet top-up</div>
            <label>
              Credits to add
              <input
                type="number"
                min="0"
                step="1"
                value="${this.testWalletDraft.creditsAdd}"
                oninput="AdminBackOffice.updateTestWalletDraft('creditsAdd', this.value)"
              />
            </label>
            <label>
              Premium RevCoins to add
              <input
                type="number"
                min="0"
                step="1"
                value="${this.testWalletDraft.coinsAdd}"
                oninput="AdminBackOffice.updateTestWalletDraft('coinsAdd', this.value)"
              />
            </label>
            <button type="button" class="admin-action-btn" onclick="AdminBackOffice.runAdminTestWalletTopUp()">
              Apply test top-up
            </button>
          </div>
          <div>
            <div class="admin-system-health-test-title">Membership (test)</div>
            <p class="admin-system-health-muted">Sets <code>membershipLevel</code> / <code>isPaid</code> for surf timers and slot limits.</p>
            <div class="admin-system-health-test-actions">
              <button type="button" class="admin-action-btn" onclick="AdminBackOffice.runAdminTestMembershipUpgrade()">
                Set Upgraded
              </button>
              <button type="button" class="admin-action-btn" onclick="AdminBackOffice.runAdminTestMembershipFree()">
                Set Free
              </button>
            </div>
          </div>
          <div>
            <div class="admin-system-health-test-title">Daily counters</div>
            <p class="admin-system-health-muted">
              Resets today’s surf view count, daily activity score, loyalty ad view locks, mini-game daily ledger, and captcha view counter—without waiting for midnight.
            </p>
            <button type="button" class="admin-action-btn" onclick="AdminBackOffice.runAdminResetTodaysDailyCounters()">
              Reset today’s daily counters
            </button>
          </div>
        </div>
        <p class="admin-system-health-test-note">
          Real calendar rollover also clears <strong>viewsToday</strong> and <strong>viewed ad rewards</strong> so daily tasks and pool drivers line up with the new day.
        </p>
      </div>
    `;
  },

  getSurfAdStatus(ad) {
    const maxViews = ad.maxViews === null || ad.maxViews === undefined || ad.maxViews === "" ? null : Number(ad.maxViews);
    const views = Math.max(0, Number(ad.views) || 0);
    if (maxViews !== null && views >= maxViews) return "Completed";
    return ad.active ? "Active" : "Paused";
  },

  showSurfAdForm() {
    this.surfAdFormVisible = true;
    App.render();
  },

  resetSurfAdForm() {
    this.surfAdFormVisible = false;
    this.surfAdEditingId = null;
    this.surfAdDraft = {
      url: "",
      timerSec: "20",
      credits: "1",
      maxViews: "",
      active: "true"
    };
  },

  updateSurfAdDraft(field, value) {
    this.surfAdDraft[field] = value;
  },

  editSurfAd(adId) {
    const ad = (RTXState.admin.surfAds || []).find((item) => item.id === adId);
    if (!ad) return;
    this.surfAdFormVisible = true;
    this.surfAdEditingId = adId;
    this.surfAdDraft = {
      url: ad.url || "",
      timerSec: String(Math.max(1, Number(ad.timerSec) || 20)),
      credits: String(Math.max(0, Number(ad.credits) || 1)),
      maxViews: ad.maxViews === null || ad.maxViews === undefined ? "" : String(Math.max(0, Number(ad.maxViews) || 0)),
      active: ad.active ? "true" : "false"
    };
    App.render();
  },

  cancelSurfAdForm() {
    this.resetSurfAdForm();
    App.render();
  },

  saveSurfAd() {
    const url = String(this.surfAdDraft.url || "").trim();
    if (!url) return;

    const normalized = {
      url,
      timerSec: Math.max(1, Number(this.surfAdDraft.timerSec) || 20),
      credits: Math.max(0, Number(this.surfAdDraft.credits) || 1),
      maxViews: this.surfAdDraft.maxViews === "" ? null : Math.max(0, Number(this.surfAdDraft.maxViews) || 0),
      active: this.surfAdDraft.active !== "false"
    };

    if (this.surfAdEditingId) {
      RTXState.admin.surfAds = (RTXState.admin.surfAds || []).map((ad) => {
        if (ad.id !== this.surfAdEditingId) return ad;
        return {
          ...ad,
          ...normalized
        };
      });
    } else {
      RTXState.admin.surfAds = [
        ...(RTXState.admin.surfAds || []),
        {
          id: `ad_${Date.now()}`,
          owner: "admin",
          views: 0,
          ...normalized
        }
      ];
    }

    if (typeof RTXAdminPersist !== "undefined" && RTXAdminPersist.save) {
      RTXAdminPersist.save();
    }
    this.resetSurfAdForm();
    App.render();
  },

  toggleSurfAdActive(adId) {
    RTXState.admin.surfAds = (RTXState.admin.surfAds || []).map((ad) => {
      if (ad.id !== adId) return ad;
      return {
        ...ad,
        active: !ad.active
      };
    });
    if (typeof RTXAdminPersist !== "undefined" && RTXAdminPersist.save) {
      RTXAdminPersist.save();
    }
    App.render();
  },

  deleteSurfAd(adId) {
    RTXState.admin.surfAds = (RTXState.admin.surfAds || []).filter((ad) => ad.id !== adId);
    if (typeof RTXAdminPersist !== "undefined" && RTXAdminPersist.save) {
      RTXAdminPersist.save();
    }
    if (this.surfAdEditingId === adId) {
      this.resetSurfAdForm();
    }
    App.render();
  },

  renderSurfAdsBody() {
    const ads = Array.isArray(RTXState.admin.surfAds) ? RTXState.admin.surfAds : [];
    return `
      <h3>Surf Ad Manager</h3>
      <p>Manage Hyper Mode campaign URLs and campaign settings for later integration.</p>
      <div class="admin-users-toolbar">
        <button class="admin-action-btn admin-add-user-btn" onclick="AdminBackOffice.showSurfAdForm()">Add Surf Ad</button>
      </div>
      ${
        this.surfAdFormVisible
          ? `
            <div class="admin-add-form-wrap">
              <div class="admin-add-form">
                <label>
                  URL
                  <input
                    type="url"
                    value="${this.surfAdDraft.url}"
                    oninput="AdminBackOffice.updateSurfAdDraft('url', this.value)"
                    placeholder="https://example.com"
                    required
                  />
                </label>
                <label>
                  Timer (seconds)
                  <input
                    type="number"
                    min="1"
                    value="${this.surfAdDraft.timerSec}"
                    oninput="AdminBackOffice.updateSurfAdDraft('timerSec', this.value)"
                  />
                </label>
                <label>
                  Credits per view
                  <input
                    type="number"
                    min="0"
                    value="${this.surfAdDraft.credits}"
                    oninput="AdminBackOffice.updateSurfAdDraft('credits', this.value)"
                  />
                </label>
                <label>
                  Max Views (optional)
                  <input
                    type="number"
                    min="0"
                    value="${this.surfAdDraft.maxViews}"
                    oninput="AdminBackOffice.updateSurfAdDraft('maxViews', this.value)"
                    placeholder="No limit"
                  />
                </label>
                <label>
                  Active
                  <select
                    onchange="AdminBackOffice.updateSurfAdDraft('active', this.value)"
                  >
                    <option value="true" ${this.surfAdDraft.active === "true" ? "selected" : ""}>active</option>
                    <option value="false" ${this.surfAdDraft.active === "false" ? "selected" : ""}>paused</option>
                  </select>
                </label>
                <div class="admin-edit-actions">
                  <button
                    class="admin-action-btn"
                    onclick="AdminBackOffice.saveSurfAd()"
                    ${String(this.surfAdDraft.url || "").trim() ? "" : "disabled"}
                  >
                    Save
                  </button>
                  <button class="admin-action-btn" onclick="AdminBackOffice.cancelSurfAdForm()">Cancel</button>
                </div>
              </div>
            </div>
          `
          : ""
      }
      <div class="admin-users-table-wrap">
        <table class="admin-users-table">
          <thead>
            <tr>
              <th>URL</th>
              <th>Active</th>
              <th>Timer</th>
              <th>Credits</th>
              <th>Views / Max Views</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${
              ads.length
                ? ads
                    .map((ad) => `
                      <tr>
                        <td class="admin-url-cell">${ad.url}</td>
                        <td>${ad.active ? "Yes" : "No"}</td>
                        <td>${ad.timerSec}s</td>
                        <td>${ad.credits}</td>
                        <td>${ad.views} / ${ad.maxViews === null || ad.maxViews === undefined ? "Unlimited" : ad.maxViews}</td>
                        <td>${this.getSurfAdStatus(ad)}</td>
                        <td>
                          <div class="admin-action-row">
                            <button class="admin-action-btn" onclick="AdminBackOffice.editSurfAd('${ad.id}')">Edit</button>
                            <button class="admin-action-btn" onclick="AdminBackOffice.toggleSurfAdActive('${ad.id}')">
                              ${ad.active ? "Pause" : "Activate"}
                            </button>
                            <button class="admin-action-btn danger" onclick="AdminBackOffice.deleteSurfAd('${ad.id}')">Delete</button>
                          </div>
                        </td>
                      </tr>
                    `)
                    .join("")
                : `
                  <tr>
                    <td colspan="7" class="admin-empty-row">No surf ads created yet.</td>
                  </tr>
                `
            }
          </tbody>
        </table>
      </div>
    `;
  },

  resetSpotlightForm() {
    this.spotlightFormVisible = false;
    this.spotlightEditingId = null;
    this.spotlightDraft = {
      title: "",
      url: "",
      active: "true",
      priority: "1",
      startAt: "",
      endAt: ""
    };
  },

  showSpotlightForm() {
    this.spotlightFormVisible = true;
    App.render();
  },

  editSpotlightAd(adId) {
    const ad = (RTXState.admin.spotlightAds || []).find((item) => item.id === adId);
    if (!ad) return;
    this.spotlightFormVisible = true;
    this.spotlightEditingId = adId;
    this.spotlightDraft = {
      title: String(ad.title || ""),
      url: String(ad.url || ""),
      active: ad.active ? "true" : "false",
      priority: String(Math.max(0, Number(ad.priority) || 0)),
      startAt: ad.startAt || "",
      endAt: ad.endAt || ""
    };
    App.render();
  },

  cancelSpotlightForm() {
    this.resetSpotlightForm();
    App.render();
  },

  updateSpotlightDraft(field, value) {
    this.spotlightDraft[field] = value;
  },

  saveSpotlightAd() {
    const title = String(this.spotlightDraft.title || "").trim();
    const url = String(this.spotlightDraft.url || "").trim();
    if (!url) return;

    const normalized = {
      title: title || "Spotlight Ad",
      url,
      active: this.spotlightDraft.active !== "false",
      priority: Math.max(0, Number(this.spotlightDraft.priority) || 0),
      startAt: this.spotlightDraft.startAt || "",
      endAt: this.spotlightDraft.endAt || ""
    };

    if (this.spotlightEditingId) {
      RTXState.admin.spotlightAds = (RTXState.admin.spotlightAds || []).map((ad) =>
        ad.id === this.spotlightEditingId ? { ...ad, ...normalized } : ad
      );
    } else {
      RTXState.admin.spotlightAds = [
        ...(RTXState.admin.spotlightAds || []),
        {
          id: `spotlight_${Date.now()}`,
          source: "admin",
          ownerId: "admin",
          views: 0,
          createdAt: Date.now(),
          ...normalized
        }
      ];
    }
    if (typeof RTXAdminPersist !== "undefined" && RTXAdminPersist.save) {
      RTXAdminPersist.save();
    }
    this.resetSpotlightForm();
    App.render();
  },

  toggleSpotlightActive(adId) {
    RTXState.admin.spotlightAds = (RTXState.admin.spotlightAds || []).map((ad) =>
      ad.id === adId ? { ...ad, active: !ad.active } : ad
    );
    if (typeof RTXAdminPersist !== "undefined" && RTXAdminPersist.save) {
      RTXAdminPersist.save();
    }
    App.render();
  },

  deleteSpotlightAd(adId) {
    RTXState.admin.spotlightAds = (RTXState.admin.spotlightAds || []).filter((ad) => ad.id !== adId);
    if (typeof RTXAdminPersist !== "undefined" && RTXAdminPersist.save) {
      RTXAdminPersist.save();
    }
    if (this.spotlightEditingId === adId) this.resetSpotlightForm();
    App.render();
  },

  getSpotlightDisplayStatus(ad) {
    if (!ad || !ad.active) return "paused";
    const now = Date.now();
    const startMs = ad.startAt ? new Date(ad.startAt).getTime() : null;
    const endMs = ad.endAt ? new Date(ad.endAt).getTime() : null;

    if (startMs !== null && !Number.isNaN(startMs) && now < startMs) return "scheduled";
    if (endMs !== null && !Number.isNaN(endMs) && now > endMs) return "expired";
    return "active-now";
  },

  getSpotlightSourceType(ad) {
    const source = String(ad && ad.source ? ad.source : "").toLowerCase();
    const adId = String(ad && ad.id ? ad.id : "");
    if (adId === "revempire-fallback" || source === "fallback") return "fallback";
    if (source === "member") return "member";
    return "admin";
  },

  getSpotlightSourceLabel(ad) {
    const sourceType = this.getSpotlightSourceType(ad);
    if (sourceType === "member") return "Member";
    if (sourceType === "fallback") return "Fallback";
    return "Admin";
  },

  getSpotlightOwnerLabel(ad) {
    const sourceType = this.getSpotlightSourceType(ad);
    const ownerEmail = String(ad && ad.ownerEmail ? ad.ownerEmail : "").trim();
    const ownerId = String(ad && ad.ownerId ? ad.ownerId : "").trim();
    if (ownerEmail) return ownerEmail;
    if (ownerId) return ownerId;
    if (sourceType === "admin") return "Admin";
    if (sourceType === "member") return "Member";
    return "System";
  },

  renderSpotlightAdsBody() {
    const ads = Array.isArray(RTXState.admin.spotlightAds) ? RTXState.admin.spotlightAds : [];
    return `
      <h3>Spotlight Ads</h3>
      <p>Manage spotlight placements by active state, priority, and date window.</p>
      <div class="admin-users-toolbar">
        <button class="admin-action-btn admin-add-user-btn" onclick="AdminBackOffice.showSpotlightForm()">Add Spotlight Ad</button>
      </div>
      ${
        this.spotlightFormVisible
          ? `
            <div class="admin-add-form-wrap">
              <div class="admin-add-form">
                <label>
                  Title
                  <input type="text" value="${this.spotlightDraft.title}" oninput="AdminBackOffice.updateSpotlightDraft('title', this.value)" placeholder="Spotlight title" />
                </label>
                <label>
                  URL
                  <input type="url" value="${this.spotlightDraft.url}" oninput="AdminBackOffice.updateSpotlightDraft('url', this.value)" placeholder="https://example.com" required />
                </label>
                <label>
                  Active
                  <select onchange="AdminBackOffice.updateSpotlightDraft('active', this.value)">
                    <option value="true" ${this.spotlightDraft.active === "true" ? "selected" : ""}>active</option>
                    <option value="false" ${this.spotlightDraft.active === "false" ? "selected" : ""}>paused</option>
                  </select>
                </label>
                <label>
                  Priority
                  <input type="number" min="0" value="${this.spotlightDraft.priority}" oninput="AdminBackOffice.updateSpotlightDraft('priority', this.value)" />
                </label>
                <label>
                  Start date (optional)
                  <input type="datetime-local" value="${this.spotlightDraft.startAt}" oninput="AdminBackOffice.updateSpotlightDraft('startAt', this.value)" />
                </label>
                <label>
                  End date (optional)
                  <input type="datetime-local" value="${this.spotlightDraft.endAt}" oninput="AdminBackOffice.updateSpotlightDraft('endAt', this.value)" />
                </label>
                <div class="admin-edit-actions">
                  <button class="admin-action-btn" onclick="AdminBackOffice.saveSpotlightAd()" ${String(this.spotlightDraft.url || "").trim() ? "" : "disabled"}>Save</button>
                  <button class="admin-action-btn" onclick="AdminBackOffice.cancelSpotlightForm()">Cancel</button>
                </div>
              </div>
            </div>
          `
          : ""
      }
      <div class="admin-users-table-wrap">
        <table class="admin-users-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Source</th>
              <th>Owner</th>
              <th>URL</th>
              <th>Active</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Views</th>
              <th>Date window</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${
              ads.length
                ? ads
                    .map((ad) => `
                      ${(() => {
                        const status = this.getSpotlightDisplayStatus(ad);
                        const statusLabel = status === "paused"
                          ? "Paused"
                          : status === "scheduled"
                            ? "Scheduled"
                            : status === "expired"
                              ? "Expired"
                              : "Active Now";
                        return `
                      <tr>
                        <td>${ad.title || "Spotlight Ad"}</td>
                        <td>
                          <span class="admin-status-pill admin-spotlight-pill source-${this.getSpotlightSourceType(ad)}">
                            ${this.getSpotlightSourceLabel(ad)}
                          </span>
                        </td>
                        <td>${this.getSpotlightOwnerLabel(ad)}</td>
                        <td class="admin-url-cell">${ad.url}</td>
                        <td>${ad.active ? "Yes" : "No"}</td>
                        <td>${Math.max(0, Number(ad.priority) || 0)}</td>
                        <td>
                          <span class="admin-status-pill admin-spotlight-pill ${status}">
                            ${statusLabel}
                          </span>
                        </td>
                        <td>${Math.max(0, Number(ad.views) || 0)}</td>
                        <td>${ad.startAt || "Any"} - ${ad.endAt || "Any"}</td>
                        <td>
                          <div class="admin-action-row">
                            <button class="admin-action-btn" onclick="AdminBackOffice.editSpotlightAd('${ad.id}')">Edit</button>
                            <button class="admin-action-btn" onclick="AdminBackOffice.toggleSpotlightActive('${ad.id}')">${ad.active ? "Pause" : "Activate"}</button>
                            <button class="admin-action-btn danger" onclick="AdminBackOffice.deleteSpotlightAd('${ad.id}')">Delete</button>
                          </div>
                        </td>
                      </tr>
                        `;
                      })()}
                    `)
                    .join("")
                : `
                  <tr>
                    <td colspan="10" class="admin-empty-row">No spotlight ads created yet.</td>
                  </tr>
                `
            }
          </tbody>
        </table>
      </div>
    `;
  },

  setUsersSearch(query) {
    this.usersSearchQuery = String(query || "");
    App.render();
  },

  getFilteredUsers() {
    const users = Array.isArray(RTXState.admin.users) ? RTXState.admin.users : [];
    const query = this.usersSearchQuery.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) => String(user.email || "").toLowerCase().includes(query));
  },

  startEdit(userId) {
    const user = RTXState.admin.users.find((item) => item.id === userId);
    if (!user) return;

    this.editingUserId = userId;
    this.editDraft = {
      credits: String(Number(user.credits) || 0),
      loyaltyScore: String(Number(user.loyaltyScore) || 0)
    };
    App.render();
  },

  cancelEdit() {
    this.editingUserId = null;
    this.editDraft = { credits: "", loyaltyScore: "" };
    App.render();
  },

  updateEditDraft(field, value) {
    this.editDraft[field] = value;
  },

  saveEdit(userId) {
    const users = Array.isArray(RTXState.admin.users) ? RTXState.admin.users : [];
    RTXState.admin.users = users.map((user) => {
      if (user.id !== userId) return user;
      return {
        ...user,
        credits: Math.max(0, Number(this.editDraft.credits) || 0),
        loyaltyScore: Math.max(0, Number(this.editDraft.loyaltyScore) || 0)
      };
    });

    if (typeof RTXAdminPersist !== "undefined" && RTXAdminPersist.save) {
      RTXAdminPersist.save();
    }
    this.cancelEdit();
  },

  toggleSuspend(userId) {
    const users = Array.isArray(RTXState.admin.users) ? RTXState.admin.users : [];
    RTXState.admin.users = users.map((user) => {
      if (user.id !== userId) return user;
      return {
        ...user,
        status: user.status === "suspended" ? "active" : "suspended"
      };
    });
    if (typeof RTXAdminPersist !== "undefined" && RTXAdminPersist.save) {
      RTXAdminPersist.save();
    }
    App.render();
  },

  deleteUser(userId) {
    RTXState.admin.users = (RTXState.admin.users || []).filter((user) => user.id !== userId);
    if (typeof RTXAdminPersist !== "undefined" && RTXAdminPersist.save) {
      RTXAdminPersist.save();
    }
    if (this.editingUserId === userId) {
      this.editingUserId = null;
    }
    App.render();
  },

  startAddUser() {
    this.addingUser = true;
    this.addDraft = {
      email: "",
      credits: "0",
      loyaltyScore: "0",
      status: "active"
    };
    App.render();
  },

  cancelAddUser() {
    this.addingUser = false;
    this.addDraft = {
      email: "",
      credits: "0",
      loyaltyScore: "0",
      status: "active"
    };
    App.render();
  },

  updateAddDraft(field, value) {
    this.addDraft[field] = value;
  },

  saveNewUser() {
    const email = String(this.addDraft.email || "").trim();
    if (!email) {
      return;
    }

    const newUser = {
      id: `user_${Date.now()}`,
      email,
      credits: Math.max(0, Number(this.addDraft.credits) || 0),
      loyaltyScore: Math.max(0, Number(this.addDraft.loyaltyScore) || 0),
      status: this.addDraft.status === "suspended" ? "suspended" : "active"
    };

    RTXState.admin.users = [...(RTXState.admin.users || []), newUser];
    if (typeof RTXAdminPersist !== "undefined" && RTXAdminPersist.save) {
      RTXAdminPersist.save();
    }
    this.cancelAddUser();
  },

  renderUsersBody() {
    const users = this.getFilteredUsers();

    return `
      <h3>User Management</h3>
      <p>Search users, edit credits/loyalty, and moderate account status.</p>
      <div class="admin-users-toolbar">
        <input
          class="admin-search-input"
          type="text"
          placeholder="Search by email..."
          value="${this.usersSearchQuery}"
          oninput="AdminBackOffice.setUsersSearch(this.value)"
        />
        <button class="admin-action-btn admin-add-user-btn" onclick="AdminBackOffice.startAddUser()">Add User</button>
      </div>
      ${
        this.addingUser
          ? `
            <div class="admin-add-form-wrap">
              <div class="admin-add-form">
                <label>
                  Email
                  <input
                    type="email"
                    value="${this.addDraft.email}"
                    oninput="AdminBackOffice.updateAddDraft('email', this.value)"
                    placeholder="user@example.com"
                    required
                  />
                </label>
                <label>
                  Credits
                  <input
                    type="number"
                    min="0"
                    value="${this.addDraft.credits}"
                    oninput="AdminBackOffice.updateAddDraft('credits', this.value)"
                  />
                </label>
                <label>
                  Loyalty Score
                  <input
                    type="number"
                    min="0"
                    value="${this.addDraft.loyaltyScore}"
                    oninput="AdminBackOffice.updateAddDraft('loyaltyScore', this.value)"
                  />
                </label>
                <label>
                  Status
                  <select
                    value="${this.addDraft.status}"
                    onchange="AdminBackOffice.updateAddDraft('status', this.value)"
                  >
                    <option value="active" ${this.addDraft.status === "active" ? "selected" : ""}>active</option>
                    <option value="suspended" ${this.addDraft.status === "suspended" ? "selected" : ""}>suspended</option>
                  </select>
                </label>
                <div class="admin-edit-actions">
                  <button
                    class="admin-action-btn"
                    onclick="AdminBackOffice.saveNewUser()"
                    ${String(this.addDraft.email || "").trim() ? "" : "disabled"}
                  >
                    Save User
                  </button>
                  <button class="admin-action-btn" onclick="AdminBackOffice.cancelAddUser()">Cancel</button>
                </div>
              </div>
            </div>
          `
          : ""
      }
      <div class="admin-users-table-wrap">
        <table class="admin-users-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Credits</th>
              <th>Loyalty Score</th>
              <th>Tier</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${
              users.length
                ? users
                    .map((user) => {
                      const tier = getLoyaltyTierInfo(user.loyaltyScore).tier;
                      const isEditing = this.editingUserId === user.id;
                      return `
                        <tr>
                          <td>${user.email}</td>
                          <td>${user.credits}</td>
                          <td>${user.loyaltyScore}</td>
                          <td>${tier}</td>
                          <td>
                            <span class="admin-status-pill ${user.status === "suspended" ? "suspended" : "active"}">
                              ${user.status}
                            </span>
                          </td>
                          <td>
                            <div class="admin-action-row">
                              <button class="admin-action-btn" onclick="AdminBackOffice.startEdit('${user.id}')">Edit</button>
                              <button class="admin-action-btn" onclick="AdminBackOffice.toggleSuspend('${user.id}')">
                                ${user.status === "suspended" ? "Unsuspend" : "Suspend"}
                              </button>
                              <button class="admin-action-btn danger" onclick="AdminBackOffice.deleteUser('${user.id}')">Delete</button>
                            </div>
                          </td>
                        </tr>
                        ${
                          isEditing
                            ? `
                              <tr class="admin-edit-row">
                                <td colspan="6">
                                  <div class="admin-edit-form">
                                    <label>
                                      Credits
                                      <input
                                        type="number"
                                        min="0"
                                        value="${this.editDraft.credits}"
                                        oninput="AdminBackOffice.updateEditDraft('credits', this.value)"
                                      />
                                    </label>
                                    <label>
                                      Loyalty Score
                                      <input
                                        type="number"
                                        min="0"
                                        value="${this.editDraft.loyaltyScore}"
                                        oninput="AdminBackOffice.updateEditDraft('loyaltyScore', this.value)"
                                      />
                                    </label>
                                    <div class="admin-edit-actions">
                                      <button class="admin-action-btn" onclick="AdminBackOffice.saveEdit('${user.id}')">Save</button>
                                      <button class="admin-action-btn" onclick="AdminBackOffice.cancelEdit()">Cancel</button>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            `
                            : ""
                        }
                      `;
                    })
                    .join("")
                : `
                  <tr>
                    <td colspan="6" class="admin-empty-row">No users match your search.</td>
                  </tr>
                `
            }
          </tbody>
        </table>
      </div>
    `;
  },

  renderTabs() {
    return this.tabs
      .map(
        (tab) => `
          <button
            class="admin-tab ${RTXState.adminView === tab.id ? "active" : ""}"
            onclick="AdminBackOffice.setTab('${tab.id}')"
          >
            ${tab.label}
          </button>
        `
      )
      .join("");
  },

  renderBody() {
    const contentMap = {
      users: this.renderUsersBody(),
      surfAds: this.renderSurfAdsBody(),
      spotlightAds: this.renderSpotlightAdsBody(),
      bannerAds: `
        <h3>Banner Rotation</h3>
        <p>Prepare banner inventory management for the separate banner rotation page.</p>
        <div class="admin-placeholder-list">
          <div>Placeholder: banner creative upload references</div>
          <div>Placeholder: destination URL and tracking labels</div>
          <div>Placeholder: campaign rotation and visibility controls</div>
        </div>
      `,
      rewardPool: this.renderRewardPoolBody(),
      rewardSandbox: this.renderRewardSandboxBody(),
      miniGames: this.renderMiniGamesBody(),
      systemHealth: this.renderSystemHealthBody(),
      settings: `
        <h3>Platform Settings</h3>
        <p>Configure global toggles and platform defaults for admin workflows.</p>
        <div class="admin-placeholder-list">
          <div>Placeholder: test mode / demo mode toggle</div>
          <div>Placeholder: default timers and session guardrail settings</div>
          <div>Placeholder: maintenance and announcements controls</div>
        </div>
      `
    };

    return contentMap[RTXState.adminView] || contentMap.users;
  }
};

function AdminPageComponent() {
  if (!isAdminUser()) {
    return `
      <section class="admin-shell">
        <div class="admin-panel">
          <h2>Admin Access Required</h2>
          <p>This area is restricted to authorized admin users only.</p>
          <button class="btn btn-primary" onclick="App.navigate('dashboard')">Back to Dashboard</button>
        </div>
      </section>
    `;
  }

  return `
    <section class="admin-shell">
      <div class="admin-shell-header">
        <div>
          <p class="admin-kicker">Back Office</p>
          <h2>RevTrafficXchange Admin</h2>
          <p class="admin-subtitle">Shell created. Modules are wired as placeholders for staged build-out.</p>
        </div>
        <button class="btn btn-primary" onclick="App.navigate('dashboard')">Exit Admin</button>
      </div>

      <div class="admin-panel">
        <div class="admin-tabs">
          ${AdminBackOffice.renderTabs()}
        </div>
        <div class="admin-content">
          ${AdminBackOffice.renderBody()}
        </div>
      </div>
    </section>
  `;
}
