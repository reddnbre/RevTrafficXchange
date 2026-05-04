/** Placeholder content for main nav routes (no store/payment logic). */

function escapeHtmlAttr(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeJsSingleQuoted(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function normalizeMemberSiteUrlInput(raw) {
  let u = String(raw || "").trim();
  if (!u) return "";
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  try {
    const parsed = new URL(u);
    return parsed.href;
  } catch (e) {
    return "";
  }
}

function getStartOfDayTimestamp(baseMs) {
  const d = new Date(baseMs);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function parseSpotlightDateTime(value, fallback) {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return fallback;
}

function getNextSpotlightBookingDays(count) {
  const total = Math.max(1, Number(count) || 7);
  const start = getStartOfDayTimestamp(Date.now());
  return Array.from({ length: total }, (_, idx) => {
    const dayStart = start + idx * 24 * 60 * 60 * 1000;
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    return { dayStart, dayEnd };
  });
}

function formatBookingDayLabel(ts) {
  return new Date(ts).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function isSpotlightDayBooked(dayStart, dayEnd) {
  const ads = Array.isArray(RTXState.admin && RTXState.admin.spotlightAds) ? RTXState.admin.spotlightAds : [];
  return ads.some((ad) => {
    if (!ad || !ad.active) return false;
    const startAt = parseSpotlightDateTime(ad.startAt, 0);
    const endAt = parseSpotlightDateTime(ad.endAt, startAt);
    if (!startAt || !endAt) return false;
    return startAt < dayEnd && endAt > dayStart;
  });
}

function getPreferredSpotlightBookingUrl() {
  normalizeMemberCampaigns();
  const sites = Array.isArray(RTXState.user?.memberCampaigns?.surfUrls) ? RTXState.user.memberCampaigns.surfUrls : [];
  const active = sites.find((site) => site && site.active && normalizeMemberSiteUrlInput(site.url));
  return active ? normalizeMemberSiteUrlInput(active.url) : "";
}

function viewsFromCredits(credits) {
  return Math.max(0, Number(credits) || 0) * 10;
}

function creditsFromViews(views) {
  return Math.ceil(Math.max(0, Number(views) || 0) / 10);
}

function getAvailableCampaignViews(item, usedKey) {
  const allocated = Math.max(0, Number(item && item.allocatedViews) || 0);
  if (!allocated) return Infinity;
  const used = Math.max(0, Number(item && item[usedKey]) || 0);
  return Math.max(0, allocated - used);
}

const MySitesUI = {
  mode: null,
  editingId: null,
  draft: { url: "", active: true, creditsAllocated: "0" },
  lastError: "",

  resetForm() {
    this.mode = null;
    this.editingId = null;
    this.draft = { url: "", active: true, creditsAllocated: "0" };
    this.lastError = "";
  },

  showAdd() {
    normalizeMemberCampaigns();
    const limit = getMemberCampaignLimit("surf");
    const used = RTXState.user.memberCampaigns.surfUrls.length;
    if (used >= limit) {
      this.lastError =
        RTXState.user.membershipLevel === "free"
          ? "Free members can add 1 site. Upgrade to add up to 3."
          : "You reached your site limit.";
      App.render();
      return;
    }
    this.mode = "add";
    this.editingId = null;
    this.draft = { url: "", active: true, creditsAllocated: "0" };
    this.lastError = "";
    App.render();
  },

  cancelForm() {
    this.resetForm();
    App.render();
  },

  updateDraft(field, value) {
    if (field === "active") {
      this.draft.active = Boolean(value);
    } else {
      this.draft[field] = value;
    }
  },

  startEdit(id) {
    const site = RTXState.user.memberCampaigns.surfUrls.find((s) => s.id === id);
    if (!site) return;
    this.mode = "edit";
    this.editingId = id;
    this.draft = {
      url: site.url,
      active: site.active,
      creditsAllocated: String(creditsFromViews(site.allocatedViews))
    };
    this.lastError = "";
    App.render();
  },

  saveSite() {
    normalizeMemberCampaigns();
    const limit = getMemberCampaignLimit("surf");
    const sites = RTXState.user.memberCampaigns.surfUrls;
    const url = normalizeMemberSiteUrlInput(this.draft.url);
    const draftCredits = Math.max(0, Number(this.draft.creditsAllocated) || 0);
    const allocatedViews = viewsFromCredits(draftCredits);
    const currentBalance = Math.max(0, Number(RTXState.user.credits) || 0);
    if (!url) {
      this.lastError = "Please enter a valid website URL.";
      App.render();
      return;
    }

    if (this.mode === "add") {
      if (sites.length >= limit) {
        this.lastError =
          RTXState.user.membershipLevel === "free"
            ? "Free members can add 1 site. Upgrade to add up to 3."
            : "You reached your site limit.";
        App.render();
        return;
      }
      if (currentBalance < draftCredits) {
        this.lastError = "Not enough credits to allocate views.";
        App.render();
        return;
      }
      sites.push({
        id: `member_site_${Date.now()}`,
        url,
        active: Boolean(this.draft.active),
        views: 0,
        allocatedViews,
        createdAt: Date.now()
      });
      RTXState.user.credits = currentBalance - draftCredits;
    } else if (this.mode === "edit" && this.editingId) {
      const existing = sites.find((s) => s.id === this.editingId);
      const existingCredits = creditsFromViews(existing && existing.allocatedViews);
      const diff = draftCredits - existingCredits;
      if (diff > 0 && currentBalance < diff) {
        this.lastError = "Not enough credits to increase this site's view allocation.";
        App.render();
        return;
      }
      RTXState.user.memberCampaigns.surfUrls = sites.map((s) =>
        s.id === this.editingId
          ? { ...s, url, active: Boolean(this.draft.active), allocatedViews }
          : s
      );
      RTXState.user.credits = currentBalance - diff;
    }

    RTXUserPersist.save();
    this.resetForm();
    App.render();
  },

  toggleActive(id) {
    normalizeMemberCampaigns();
    RTXState.user.memberCampaigns.surfUrls = RTXState.user.memberCampaigns.surfUrls.map((s) =>
      s.id === id ? { ...s, active: !s.active } : s
    );
    RTXUserPersist.save();
    App.render();
  },

  deleteSite(id) {
    normalizeMemberCampaigns();
    RTXState.user.memberCampaigns.surfUrls = RTXState.user.memberCampaigns.surfUrls.filter((s) => s.id !== id);
    if (this.editingId === id) this.resetForm();
    RTXUserPersist.save();
    App.render();
  }
};

const TrafficBoostCountdown = {
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
    const textNode = document.getElementById("traffic-boost-ends-in");
    if (!textNode) return;
    const timeLeft = typeof getTrafficBoostTimeLeftText === "function" ? getTrafficBoostTimeLeftText() : "";
    textNode.textContent = timeLeft ? `Time remaining: ${timeLeft}` : "Time remaining: —";
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
        if (typeof checkTrafficBoostExpiry === "function") checkTrafficBoostExpiry();
        if (typeof SurfEngine !== "undefined" && SurfEngine.refreshCampaignQueue) {
          SurfEngine.refreshCampaignQueue();
        }
        App.render();
        return;
      }
      this.updateDisplay();
    }, 30000);
  }
};

function manageTrafficBoostCountdown() {
  if (typeof checkTrafficBoostExpiry === "function") checkTrafficBoostExpiry();
  const tb = RTXState.user.activeTrafficBoost || {};
  if (tb.active && Number(tb.expiresAt) > Date.now()) {
    TrafficBoostCountdown.start(tb.expiresAt);
    return;
  }
  TrafficBoostCountdown.clear();
}

function renderTrafficBoostPanel() {
  if (typeof checkTrafficBoostExpiry === "function") checkTrafficBoostExpiry();
  const tb = RTXState.user.activeTrafficBoost || {};
  const active = Boolean(tb.active && tb.expiresAt > Date.now());
  const timeLeft = active && typeof getTrafficBoostTimeLeftText === "function" ? getTrafficBoostTimeLeftText() : "";
  const feedbackRaw = RTXState.ui && RTXState.ui.trafficBoostFeedback ? String(RTXState.ui.trafficBoostFeedback) : "";
  const tone =
    RTXState.ui && RTXState.ui.trafficBoostFeedbackTone === "error"
      ? "error"
      : RTXState.ui && RTXState.ui.trafficBoostFeedbackTone === "success"
        ? "success"
        : "neutral";
  const mult = Math.max(1, Number(tb.multiplier) || 1);

  return `
    <section class="panel traffic-boost-panel">
      <h3 class="traffic-boost-title">Priority traffic boost</h3>
      <p class="my-sites-subtitle">Spend 30 Premium RevCoins for higher surf rotation weight on your member sites for 1 hour. Admin ads are unchanged.</p>
      <div class="traffic-boost-status-row">
        ${
          active
            ? `<span class="traffic-boost-pill traffic-boost-pill-on">Boost active (${mult}× rotation weight)</span>`
            : `<span class="traffic-boost-pill traffic-boost-pill-off">No boost running</span>`
        }
        ${
          active
            ? `<span class="traffic-boost-time-left stat-sub" id="traffic-boost-ends-in">Time remaining: ${escapeHtmlAttr(timeLeft || "—")}</span>`
            : ""
        }
      </div>
      <button
        type="button"
        class="btn btn-primary traffic-boost-btn"
        onclick="buyTrafficBoost()"
        ${active ? "disabled" : ""}
      >
        Boost My Traffic (30)
      </button>
      ${feedbackRaw ? `<div class="traffic-boost-feedback ${tone}">${escapeHtmlAttr(feedbackRaw)}</div>` : ""}
    </section>
  `;
}

function MySitesPageComponent() {
  normalizeMemberCampaigns();
  const limit = getMemberCampaignLimit("surf");
  const sites = RTXState.user.memberCampaigns.surfUrls;
  const used = sites.length;
  const planLabel = RTXState.user.membershipLevel === "upgraded" ? "Upgraded" : "Free";
  const atLimit = used >= limit;
  const showForm = MySitesUI.mode === "add" || MySitesUI.mode === "edit";

  return `
    <section class="my-sites-page">
      <header class="my-sites-header">
        <h1 class="my-sites-title">My Sites</h1>
        <p class="my-sites-subtitle">Manage the websites you want shown in the surf exchange.</p>
        <div class="my-sites-plan-row">
          <span class="my-sites-plan-pill">Plan: ${planLabel}</span>
          <span class="my-sites-plan-pill">Sites Used: ${used} / ${limit}</span>
        </div>
      </header>

      ${
        MySitesUI.lastError
          ? `<div class="my-sites-alert" role="alert">${escapeHtmlAttr(MySitesUI.lastError)}</div>`
          : ""
      }

      <div class="my-sites-toolbar">
        <button
          type="button"
          class="btn btn-primary my-sites-add-btn"
          onclick="MySitesUI.showAdd()"
          ${atLimit || showForm ? "disabled" : ""}
        >
          Add Site
        </button>
      </div>

      ${renderTrafficBoostPanel()}

      ${
        atLimit && !showForm
          ? `<p class="my-sites-limit-hint">${
              RTXState.user.membershipLevel === "free"
                ? "Free members can add 1 site. Upgrade to add up to 3."
                : "You reached your site limit."
            }</p>`
          : ""
      }

      ${
        showForm
          ? `
        <div class="panel my-sites-form-panel">
          <h2 class="my-sites-form-title">${MySitesUI.mode === "add" ? "Add site" : "Edit site"}</h2>
          <label class="my-sites-label">
            Website URL
            <input
              class="my-sites-input"
              type="url"
              placeholder="https://example.com"
              value="${escapeHtmlAttr(MySitesUI.draft.url)}"
              oninput="MySitesUI.updateDraft('url', this.value)"
            />
          </label>
          <label class="my-sites-toggle">
            <input
              type="checkbox"
              ${MySitesUI.draft.active ? "checked" : ""}
              onchange="MySitesUI.updateDraft('active', this.checked)"
            />
            Active
          </label>
          <label class="my-sites-label">
            Credits to allocate (1 credit = 10 views)
            <input
              class="my-sites-input"
              type="number"
              min="0"
              value="${escapeHtmlAttr(MySitesUI.draft.creditsAllocated)}"
              oninput="MySitesUI.updateDraft('creditsAllocated', this.value)"
            />
          </label>
          <div class="my-sites-form-actions">
            <button type="button" class="btn btn-primary" onclick="MySitesUI.saveSite()">Save</button>
            <button type="button" class="btn" onclick="MySitesUI.cancelForm()">Cancel</button>
          </div>
        </div>
      `
          : ""
      }

      <div class="my-sites-list">
        ${
          sites.length
            ? sites
                .map(
                  (s) => `
          <div class="panel my-sites-row">
            <div class="my-sites-row-main">
              <div class="my-sites-url" title="${escapeHtmlAttr(s.url)}">${escapeHtmlAttr(s.url)}</div>
              <div class="my-sites-meta">
                <span class="my-sites-badge ${s.active ? "on" : "off"}">${s.active ? "Active" : "Paused"}</span>
                <span class="my-sites-views">Views: ${s.views}</span>
                <span>Allocated Views: ${Math.max(0, Number(s.allocatedViews) || 0) || "Unlimited"}</span>
              </div>
            </div>
            <div class="my-sites-row-actions">
              <button type="button" class="btn" onclick="MySitesUI.startEdit('${escapeJsSingleQuoted(s.id)}')">Edit</button>
              <button type="button" class="btn" onclick="MySitesUI.toggleActive('${escapeJsSingleQuoted(s.id)}')">
                ${s.active ? "Pause" : "Activate"}
              </button>
              <button type="button" class="btn my-sites-delete" onclick="MySitesUI.deleteSite('${escapeJsSingleQuoted(s.id)}')">Delete</button>
            </div>
          </div>
        `
                )
                .join("")
            : `<p class="my-sites-empty">No sites yet. Add your first URL to get started.</p>`
        }
      </div>
    </section>
  `;
}

const MyTextAdsUI = {
  mode: null,
  editingId: null,
  draft: {
    title: "",
    description: "",
    targetUrl: "",
    active: true,
    creditsAllocated: "0"
  },
  lastError: "",

  resetForm() {
    this.mode = null;
    this.editingId = null;
    this.draft = { title: "", description: "", targetUrl: "", active: true, creditsAllocated: "0" };
    this.lastError = "";
  },

  showAdd() {
    normalizeMemberCampaigns();
    const limit = getMemberCampaignLimit("textAds");
    const used = RTXState.user.memberCampaigns.textAds.length;
    if (used >= limit) {
      this.lastError =
        RTXState.user.membershipLevel === "free"
          ? "Free members can add 1 text ad. Upgrade to add up to 3."
          : "You reached your text ad limit.";
      App.render();
      return;
    }
    this.mode = "add";
    this.editingId = null;
    this.draft = { title: "", description: "", targetUrl: "", active: true, creditsAllocated: "0" };
    this.lastError = "";
    App.render();
  },

  cancelForm() {
    this.resetForm();
    App.render();
  },

  updateDraft(field, value) {
    if (field === "active") {
      this.draft.active = Boolean(value);
    } else {
      this.draft[field] = value;
    }
  },

  startEdit(id) {
    const ad = RTXState.user.memberCampaigns.textAds.find((item) => item.id === id);
    if (!ad) return;
    this.mode = "edit";
    this.editingId = id;
    this.draft = {
      title: ad.title,
      description: ad.description || "",
      targetUrl: ad.targetUrl,
      active: ad.active,
      creditsAllocated: String(creditsFromViews(ad.allocatedViews))
    };
    this.lastError = "";
    App.render();
  },

  saveAd() {
    normalizeMemberCampaigns();
    const limit = getMemberCampaignLimit("textAds");
    const ads = RTXState.user.memberCampaigns.textAds;
    const title = String(this.draft.title || "").trim();
    const targetUrl = normalizeMemberSiteUrlInput(this.draft.targetUrl);
    const description = String(this.draft.description || "").trim();
    const draftCredits = Math.max(0, Number(this.draft.creditsAllocated) || 0);
    const allocatedViews = viewsFromCredits(draftCredits);
    const currentBalance = Math.max(0, Number(RTXState.user.credits) || 0);

    if (!title) {
      this.lastError = "Title is required.";
      App.render();
      return;
    }
    if (!targetUrl) {
      this.lastError = "Target URL is required.";
      App.render();
      return;
    }

    if (this.mode === "add") {
      if (ads.length >= limit) {
        this.lastError =
          RTXState.user.membershipLevel === "free"
            ? "Free members can add 1 text ad. Upgrade to add up to 3."
            : "You reached your text ad limit.";
        App.render();
        return;
      }
      if (currentBalance < draftCredits) {
        this.lastError = "Not enough credits to allocate views.";
        App.render();
        return;
      }
      ads.push({
        id: `member_text_ad_${Date.now()}`,
        title,
        description,
        targetUrl,
        ownerId: String(RTXState.user && RTXState.user.id ? RTXState.user.id : "user1"),
        active: Boolean(this.draft.active),
        views: 0,
        clicks: 0,
        allocatedViews,
        createdAt: Date.now()
      });
      RTXState.user.credits = currentBalance - draftCredits;
    } else if (this.mode === "edit" && this.editingId) {
      const existing = ads.find((ad) => ad.id === this.editingId);
      const existingCredits = creditsFromViews(existing && existing.allocatedViews);
      const diff = draftCredits - existingCredits;
      if (diff > 0 && currentBalance < diff) {
        this.lastError = "Not enough credits to increase this ad allocation.";
        App.render();
        return;
      }
      RTXState.user.memberCampaigns.textAds = ads.map((ad) =>
        ad.id === this.editingId
          ? {
              ...ad,
              title,
              description,
              targetUrl,
              active: Boolean(this.draft.active),
              allocatedViews
            }
          : ad
      );
      RTXState.user.credits = currentBalance - diff;
    }

    RTXUserPersist.save();
    this.resetForm();
    App.render();
  },

  toggleActive(id) {
    normalizeMemberCampaigns();
    RTXState.user.memberCampaigns.textAds = RTXState.user.memberCampaigns.textAds.map((ad) =>
      ad.id === id ? { ...ad, active: !ad.active } : ad
    );
    RTXUserPersist.save();
    App.render();
  },

  deleteAd(id) {
    normalizeMemberCampaigns();
    RTXState.user.memberCampaigns.textAds = RTXState.user.memberCampaigns.textAds.filter((ad) => ad.id !== id);
    if (this.editingId === id) this.resetForm();
    RTXUserPersist.save();
    App.render();
  },

  simulateView(id) {
    normalizeMemberCampaigns();
    const target = RTXState.user.memberCampaigns.textAds.find((ad) => ad.id === id);
    if (!target || getAvailableCampaignViews(target, "views") <= 0) {
      this.lastError = "No allocated views left for this text ad.";
      App.render();
      return;
    }
    RTXState.user.memberCampaigns.textAds = RTXState.user.memberCampaigns.textAds.map((ad) =>
      ad.id === id ? { ...ad, views: Math.max(0, Number(ad.views) || 0) + 1 } : ad
    );
    handleTextAdView(id);
    RTXUserPersist.save();
    App.render();
  }
};

function MyTextAdsPageComponent() {
  normalizeMemberCampaigns();
  normalizeViewedAdRewards();
  const limit = getMemberCampaignLimit("textAds");
  const ads = RTXState.user.memberCampaigns.textAds;
  const used = ads.length;
  const planLabel = RTXState.user.membershipLevel === "upgraded" ? "Upgraded" : "Free";
  const atLimit = used >= limit;
  const showForm = MyTextAdsUI.mode === "add" || MyTextAdsUI.mode === "edit";

  return `
    <section class="my-sites-page">
      <header class="my-sites-header">
        <h1 class="my-sites-title">My Text Ads</h1>
        <p class="my-sites-subtitle">Promote your offers with text ads.</p>
        <div class="my-sites-plan-row">
          <span class="my-sites-plan-pill">Plan: ${planLabel}</span>
          <span class="my-sites-plan-pill">Ads Used: ${used} / ${limit}</span>
        </div>
      </header>

      ${
        MyTextAdsUI.lastError
          ? `<div class="my-sites-alert" role="alert">${escapeHtmlAttr(MyTextAdsUI.lastError)}</div>`
          : ""
      }

      <div class="my-sites-toolbar">
        <button
          type="button"
          class="btn btn-primary my-sites-add-btn"
          onclick="MyTextAdsUI.showAdd()"
          ${atLimit || showForm ? "disabled" : ""}
        >
          Add Text Ad
        </button>
        <button type="button" class="btn" onclick="App.navigate('text-ads-display')">Open Public Display</button>
      </div>

      ${
        atLimit && !showForm
          ? `<p class="my-sites-limit-hint">${
              RTXState.user.membershipLevel === "free"
                ? "Free members can add 1 text ad. Upgrade to add up to 3."
                : "You reached your text ad limit."
            }</p>`
          : ""
      }

      ${
        showForm
          ? `
        <div class="panel my-sites-form-panel">
          <h2 class="my-sites-form-title">${MyTextAdsUI.mode === "add" ? "Add text ad" : "Edit text ad"}</h2>
          <label class="my-sites-label">
            Title
            <input
              class="my-sites-input"
              type="text"
              placeholder="Ad title"
              value="${escapeHtmlAttr(MyTextAdsUI.draft.title)}"
              oninput="MyTextAdsUI.updateDraft('title', this.value)"
            />
          </label>
          <label class="my-sites-label">
            Description (optional)
            <textarea
              class="my-sites-input my-textads-textarea"
              rows="3"
              placeholder="Short description"
              oninput="MyTextAdsUI.updateDraft('description', this.value)"
            >${escapeHtmlAttr(MyTextAdsUI.draft.description)}</textarea>
          </label>
          <label class="my-sites-label">
            Target URL
            <input
              class="my-sites-input"
              type="url"
              placeholder="https://example.com"
              value="${escapeHtmlAttr(MyTextAdsUI.draft.targetUrl)}"
              oninput="MyTextAdsUI.updateDraft('targetUrl', this.value)"
            />
          </label>
          <label class="my-sites-toggle">
            <input
              type="checkbox"
              ${MyTextAdsUI.draft.active ? "checked" : ""}
              onchange="MyTextAdsUI.updateDraft('active', this.checked)"
            />
            Active
          </label>
          <label class="my-sites-label">
            Credits to allocate (1 credit = 10 views)
            <input
              class="my-sites-input"
              type="number"
              min="0"
              value="${escapeHtmlAttr(MyTextAdsUI.draft.creditsAllocated)}"
              oninput="MyTextAdsUI.updateDraft('creditsAllocated', this.value)"
            />
          </label>
          <div class="my-sites-form-actions">
            <button type="button" class="btn btn-primary" onclick="MyTextAdsUI.saveAd()">Save</button>
            <button type="button" class="btn" onclick="MyTextAdsUI.cancelForm()">Cancel</button>
          </div>
        </div>
      `
          : ""
      }

      <div class="my-sites-list">
        ${
          ads.length
            ? ads
                .map(
                  (ad) => `
          <div class="panel my-sites-row my-textads-row">
            <div class="my-sites-row-main">
              <div class="my-sites-url">${escapeHtmlAttr(ad.title)}</div>
              <div class="my-textads-url" title="${escapeHtmlAttr(ad.targetUrl)}">${escapeHtmlAttr(ad.targetUrl)}</div>
              <div class="my-textads-desc">${escapeHtmlAttr(ad.description || "No description")}</div>
              <div class="my-sites-meta">
                <span class="my-sites-badge ${ad.active ? "on" : "off"}">${ad.active ? "Active" : "Paused"}</span>
                <span>Views: ${ad.views}</span>
                <span>Clicks: ${ad.clicks}</span>
                <span>Allocated Views: ${Math.max(0, Number(ad.allocatedViews) || 0) || "Unlimited"}</span>
              </div>
            </div>
            <div class="my-sites-row-actions">
              <button type="button" class="btn" onclick="MyTextAdsUI.startEdit('${escapeJsSingleQuoted(ad.id)}')">Edit</button>
              <button type="button" class="btn" onclick="MyTextAdsUI.toggleActive('${escapeJsSingleQuoted(ad.id)}')">${ad.active ? "Pause" : "Activate"}</button>
              <button type="button" class="btn" onclick="MyTextAdsUI.simulateView('${escapeJsSingleQuoted(ad.id)}')">Simulate View</button>
              <button type="button" class="btn my-sites-delete" onclick="MyTextAdsUI.deleteAd('${escapeJsSingleQuoted(ad.id)}')">Delete</button>
            </div>
          </div>
        `
                )
                .join("")
            : `<p class="my-sites-empty">No text ads yet. Add your first text ad to get started.</p>`
        }
      </div>
    </section>
  `;
}

const TextAdsDisplayUI = {
  getActiveShuffledAds() {
    normalizeMemberCampaigns();
    const activeAds = (RTXState.user.memberCampaigns.textAds || []).filter(
      (ad) => ad.active && getAvailableCampaignViews(ad, "views") > 0
    );
    const clone = [...activeAds];
    for (let i = clone.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = clone[i];
      clone[i] = clone[j];
      clone[j] = tmp;
    }
    return clone;
  },

  clickAd(adId, targetUrl) {
    const url = String(targetUrl || "").trim();
    if (!url) return;
    normalizeMemberCampaigns();
    const target = RTXState.user.memberCampaigns.textAds.find((ad) => ad.id === adId);
    if (!target || getAvailableCampaignViews(target, "views") <= 0) return;
    window.open(url, "_blank", "noopener,noreferrer");
    RTXState.user.memberCampaigns.textAds = RTXState.user.memberCampaigns.textAds.map((ad) =>
      ad.id === adId ? { ...ad, clicks: Math.max(0, Number(ad.clicks) || 0) + 1 } : ad
    );
    handleTextAdView(adId);
    RTXUserPersist.save();
    App.render();
  }
};

function TextAdsDisplayPageComponent() {
  const ads = TextAdsDisplayUI.getActiveShuffledAds();

  return `
    <section class="text-ads-display-page">
      <header class="my-sites-header">
        <h1 class="my-sites-title">Text Ads</h1>
        <p class="my-sites-subtitle">Discover opportunities from our members.</p>
      </header>
      ${
        ads.length
          ? `
            <div class="text-ads-grid">
              ${ads
                .map(
                  (ad) => `
                <article class="panel text-ad-card">
                  <h3 class="text-ad-title">${escapeHtmlAttr(ad.title)}</h3>
                  <p class="text-ad-desc">${escapeHtmlAttr(ad.description || "No description provided.")}</p>
                  <button
                    type="button"
                    class="btn text-ad-link-btn"
                    onclick="TextAdsDisplayUI.clickAd('${escapeJsSingleQuoted(ad.id)}', '${escapeJsSingleQuoted(ad.targetUrl)}')"
                  >
                    ${escapeHtmlAttr(ad.targetUrl)}
                  </button>
                </article>
              `
                )
                .join("")}
            </div>
          `
          : `<p class="my-sites-empty">No text ads available yet.</p>`
      }
    </section>
  `;
}

const BannerAdsDisplayUI = {
  getActiveShuffledBanners() {
    normalizeMemberCampaigns();
    const active = (RTXState.user.memberCampaigns.bannerAds || []).filter(
      (ad) => ad.active && getAvailableCampaignViews(ad, "impressions") > 0
    );
    const clone = [...active];
    for (let i = clone.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = clone[i];
      clone[i] = clone[j];
      clone[j] = t;
    }
    return clone;
  },

  clickBanner(adId, targetUrl) {
    const url = String(targetUrl || "").trim();
    if (!url) return;
    normalizeMemberCampaigns();
    const target = RTXState.user.memberCampaigns.bannerAds.find((ad) => ad.id === adId);
    if (!target || getAvailableCampaignViews(target, "impressions") <= 0) return;
    window.open(url, "_blank", "noopener,noreferrer");
    RTXState.user.memberCampaigns.bannerAds = RTXState.user.memberCampaigns.bannerAds.map((ad) =>
      ad.id === adId
        ? {
            ...ad,
            clicks: Math.max(0, Number(ad.clicks) || 0) + 1,
            impressions: Math.max(0, Number(ad.impressions) || 0) + 1
          }
        : ad
    );
    handleBannerAdView(adId);
    RTXUserPersist.save();
    App.render();
  }
};

function BannerAdsDisplayPageComponent() {
  const banners = BannerAdsDisplayUI.getActiveShuffledBanners();

  return `
    <section class="text-ads-display-page">
      <header class="my-sites-header">
        <h1 class="my-sites-title">Banner Ads</h1>
        <p class="my-sites-subtitle">Explore promotions from our members.</p>
      </header>
      ${
        banners.length
          ? `
            <div class="banner-ads-grid">
              ${banners
                .map(
                  (ad) => `
                <article class="panel banner-ad-card">
                  <button
                    type="button"
                    class="banner-ad-click-area"
                    onclick="BannerAdsDisplayUI.clickBanner('${escapeJsSingleQuoted(ad.id)}', '${escapeJsSingleQuoted(ad.targetUrl)}')"
                  >
                    <img class="banner-ad-image" src="${escapeHtmlAttr(ad.imageUrl)}" alt="Member banner ad" loading="lazy" />
                  </button>
                  <button
                    type="button"
                    class="btn text-ad-link-btn"
                    onclick="BannerAdsDisplayUI.clickBanner('${escapeJsSingleQuoted(ad.id)}', '${escapeJsSingleQuoted(ad.targetUrl)}')"
                  >
                    ${escapeHtmlAttr(ad.targetUrl)}
                  </button>
                </article>
              `
                )
                .join("")}
            </div>
          `
          : `<p class="my-sites-empty">No banner ads available yet.</p>`
      }
    </section>
  `;
}

const MyBannerAdsUI = {
  mode: null,
  editingId: null,
  draft: {
    imageUrl: "",
    targetUrl: "",
    size: "300x250",
    active: true,
    creditsAllocated: "0"
  },
  lastError: "",

  resetForm() {
    this.mode = null;
    this.editingId = null;
    this.draft = { imageUrl: "", targetUrl: "", size: "300x250", active: true, creditsAllocated: "0" };
    this.lastError = "";
  },

  showAdd() {
    normalizeMemberCampaigns();
    const limit = getMemberCampaignLimit("bannerAds");
    const used = RTXState.user.memberCampaigns.bannerAds.length;
    if (used >= limit) {
      this.lastError =
        RTXState.user.membershipLevel === "free"
          ? "Free members can add 1 banner ad. Upgrade to add up to 3."
          : "You reached your banner ad limit.";
      App.render();
      return;
    }
    this.mode = "add";
    this.editingId = null;
    this.draft = { imageUrl: "", targetUrl: "", size: "300x250", active: true, creditsAllocated: "0" };
    this.lastError = "";
    App.render();
  },

  cancelForm() {
    this.resetForm();
    App.render();
  },

  updateDraft(field, value) {
    if (field === "active") {
      this.draft.active = Boolean(value);
    } else {
      this.draft[field] = value;
    }
  },

  startEdit(id) {
    const ad = RTXState.user.memberCampaigns.bannerAds.find((item) => item.id === id);
    if (!ad) return;
    this.mode = "edit";
    this.editingId = id;
    this.draft = {
      imageUrl: ad.imageUrl,
      targetUrl: ad.targetUrl,
      size: ad.size || "300x250",
      active: ad.active,
      creditsAllocated: String(creditsFromViews(ad.allocatedViews))
    };
    this.lastError = "";
    App.render();
  },

  saveAd() {
    normalizeMemberCampaigns();
    const limit = getMemberCampaignLimit("bannerAds");
    const ads = RTXState.user.memberCampaigns.bannerAds;
    const imageUrl = normalizeMemberSiteUrlInput(this.draft.imageUrl);
    const targetUrl = normalizeMemberSiteUrlInput(this.draft.targetUrl);
    const size = ["300x250", "468x60", "728x90", "160x600"].includes(this.draft.size)
      ? this.draft.size
      : "300x250";
    const draftCredits = Math.max(0, Number(this.draft.creditsAllocated) || 0);
    const allocatedViews = viewsFromCredits(draftCredits);
    const currentBalance = Math.max(0, Number(RTXState.user.credits) || 0);

    if (!imageUrl) {
      this.lastError = "Image URL is required.";
      App.render();
      return;
    }
    if (!targetUrl) {
      this.lastError = "Target URL is required.";
      App.render();
      return;
    }

    if (this.mode === "add") {
      if (ads.length >= limit) {
        this.lastError =
          RTXState.user.membershipLevel === "free"
            ? "Free members can add 1 banner ad. Upgrade to add up to 3."
            : "You reached your banner ad limit.";
        App.render();
        return;
      }
      if (currentBalance < draftCredits) {
        this.lastError = "Not enough credits to allocate views.";
        App.render();
        return;
      }
      ads.push({
        id: `member_banner_ad_${Date.now()}`,
        imageUrl,
        targetUrl,
        ownerId: String(RTXState.user && RTXState.user.id ? RTXState.user.id : "user1"),
        active: Boolean(this.draft.active),
        impressions: 0,
        clicks: 0,
        allocatedViews,
        size,
        createdAt: Date.now()
      });
      RTXState.user.credits = currentBalance - draftCredits;
    } else if (this.mode === "edit" && this.editingId) {
      const existing = ads.find((ad) => ad.id === this.editingId);
      const existingCredits = creditsFromViews(existing && existing.allocatedViews);
      const diff = draftCredits - existingCredits;
      if (diff > 0 && currentBalance < diff) {
        this.lastError = "Not enough credits to increase this banner allocation.";
        App.render();
        return;
      }
      RTXState.user.memberCampaigns.bannerAds = ads.map((ad) =>
        ad.id === this.editingId
          ? {
              ...ad,
              imageUrl,
              targetUrl,
              size,
              active: Boolean(this.draft.active),
              allocatedViews
            }
          : ad
      );
      RTXState.user.credits = currentBalance - diff;
    }

    RTXUserPersist.save();
    this.resetForm();
    App.render();
  },

  toggleActive(id) {
    normalizeMemberCampaigns();
    RTXState.user.memberCampaigns.bannerAds = RTXState.user.memberCampaigns.bannerAds.map((ad) =>
      ad.id === id ? { ...ad, active: !ad.active } : ad
    );
    RTXUserPersist.save();
    App.render();
  },

  deleteAd(id) {
    normalizeMemberCampaigns();
    RTXState.user.memberCampaigns.bannerAds = RTXState.user.memberCampaigns.bannerAds.filter((ad) => ad.id !== id);
    if (this.editingId === id) this.resetForm();
    RTXUserPersist.save();
    App.render();
  },

  simulateView(id) {
    normalizeMemberCampaigns();
    const target = RTXState.user.memberCampaigns.bannerAds.find((ad) => ad.id === id);
    if (!target || getAvailableCampaignViews(target, "impressions") <= 0) {
      this.lastError = "No allocated views left for this banner ad.";
      App.render();
      return;
    }
    RTXState.user.memberCampaigns.bannerAds = RTXState.user.memberCampaigns.bannerAds.map((ad) =>
      ad.id === id ? { ...ad, impressions: Math.max(0, Number(ad.impressions) || 0) + 1 } : ad
    );
    handleBannerAdView(id);
    RTXUserPersist.save();
    App.render();
  }
};

function MyBannerAdsPageComponent() {
  normalizeMemberCampaigns();
  normalizeViewedAdRewards();
  const limit = getMemberCampaignLimit("bannerAds");
  const ads = RTXState.user.memberCampaigns.bannerAds;
  const used = ads.length;
  const planLabel = RTXState.user.membershipLevel === "upgraded" ? "Upgraded" : "Free";
  const atLimit = used >= limit;
  const showForm = MyBannerAdsUI.mode === "add" || MyBannerAdsUI.mode === "edit";

  return `
    <section class="my-sites-page">
      <header class="my-sites-header">
        <h1 class="my-sites-title">My Banner Ads</h1>
        <p class="my-sites-subtitle">Promote your offers with banner ads.</p>
        <div class="my-sites-plan-row">
          <span class="my-sites-plan-pill">Plan: ${planLabel}</span>
          <span class="my-sites-plan-pill">Banners Used: ${used} / ${limit}</span>
        </div>
      </header>

      ${
        MyBannerAdsUI.lastError
          ? `<div class="my-sites-alert" role="alert">${escapeHtmlAttr(MyBannerAdsUI.lastError)}</div>`
          : ""
      }

      <div class="my-sites-toolbar">
        <button
          type="button"
          class="btn btn-primary my-sites-add-btn"
          onclick="MyBannerAdsUI.showAdd()"
          ${atLimit || showForm ? "disabled" : ""}
        >
          Add Banner Ad
        </button>
        <button type="button" class="btn" onclick="App.navigate('banner-ads-display')">Open Public Display</button>
      </div>

      ${
        atLimit && !showForm
          ? `<p class="my-sites-limit-hint">${
              RTXState.user.membershipLevel === "free"
                ? "Free members can add 1 banner ad. Upgrade to add up to 3."
                : "You reached your banner ad limit."
            }</p>`
          : ""
      }

      ${
        showForm
          ? `
        <div class="panel my-sites-form-panel">
          <h2 class="my-sites-form-title">${MyBannerAdsUI.mode === "add" ? "Add banner ad" : "Edit banner ad"}</h2>
          <label class="my-sites-label">
            Image URL
            <input
              class="my-sites-input"
              type="url"
              placeholder="https://example.com/banner.png"
              value="${escapeHtmlAttr(MyBannerAdsUI.draft.imageUrl)}"
              oninput="MyBannerAdsUI.updateDraft('imageUrl', this.value)"
            />
          </label>
          <label class="my-sites-label">
            Target URL
            <input
              class="my-sites-input"
              type="url"
              placeholder="https://example.com"
              value="${escapeHtmlAttr(MyBannerAdsUI.draft.targetUrl)}"
              oninput="MyBannerAdsUI.updateDraft('targetUrl', this.value)"
            />
          </label>
          <label class="my-sites-label">
            Size
            <select class="my-sites-input my-banner-size-select" onchange="MyBannerAdsUI.updateDraft('size', this.value)">
              <option value="300x250" ${MyBannerAdsUI.draft.size === "300x250" ? "selected" : ""}>300x250</option>
              <option value="468x60" ${MyBannerAdsUI.draft.size === "468x60" ? "selected" : ""}>468x60</option>
              <option value="728x90" ${MyBannerAdsUI.draft.size === "728x90" ? "selected" : ""}>728x90</option>
              <option value="160x600" ${MyBannerAdsUI.draft.size === "160x600" ? "selected" : ""}>160x600</option>
            </select>
          </label>
          <label class="my-sites-toggle">
            <input
              type="checkbox"
              ${MyBannerAdsUI.draft.active ? "checked" : ""}
              onchange="MyBannerAdsUI.updateDraft('active', this.checked)"
            />
            Active
          </label>
          <label class="my-sites-label">
            Credits to allocate (1 credit = 10 views)
            <input
              class="my-sites-input"
              type="number"
              min="0"
              value="${escapeHtmlAttr(MyBannerAdsUI.draft.creditsAllocated)}"
              oninput="MyBannerAdsUI.updateDraft('creditsAllocated', this.value)"
            />
          </label>
          <div class="my-sites-form-actions">
            <button type="button" class="btn btn-primary" onclick="MyBannerAdsUI.saveAd()">Save</button>
            <button type="button" class="btn" onclick="MyBannerAdsUI.cancelForm()">Cancel</button>
          </div>
        </div>
      `
          : ""
      }

      <div class="my-sites-list">
        ${
          ads.length
            ? ads
                .map(
                  (ad) => `
          <div class="panel my-sites-row my-textads-row">
            <div class="my-sites-row-main">
              <div class="my-banner-preview-wrap">
                <img class="my-banner-preview" src="${escapeHtmlAttr(ad.imageUrl)}" alt="Banner preview" loading="lazy" />
              </div>
              <div class="my-textads-url" title="${escapeHtmlAttr(ad.targetUrl)}">${escapeHtmlAttr(ad.targetUrl)}</div>
              <div class="my-sites-meta">
                <span>Size: ${escapeHtmlAttr(ad.size)}</span>
                <span class="my-sites-badge ${ad.active ? "on" : "off"}">${ad.active ? "Active" : "Paused"}</span>
                <span>Impressions: ${ad.impressions}</span>
                <span>Clicks: ${ad.clicks}</span>
                <span>Allocated Views: ${Math.max(0, Number(ad.allocatedViews) || 0) || "Unlimited"}</span>
              </div>
            </div>
            <div class="my-sites-row-actions">
              <button type="button" class="btn" onclick="MyBannerAdsUI.startEdit('${escapeJsSingleQuoted(ad.id)}')">Edit</button>
              <button type="button" class="btn" onclick="MyBannerAdsUI.toggleActive('${escapeJsSingleQuoted(ad.id)}')">${ad.active ? "Pause" : "Activate"}</button>
              <button type="button" class="btn" onclick="MyBannerAdsUI.simulateView('${escapeJsSingleQuoted(ad.id)}')">Simulate View</button>
              <button type="button" class="btn my-sites-delete" onclick="MyBannerAdsUI.deleteAd('${escapeJsSingleQuoted(ad.id)}')">Delete</button>
            </div>
          </div>
        `
                )
                .join("")
            : `<p class="my-sites-empty">No banner ads yet. Add your first banner to get started.</p>`
        }
      </div>
    </section>
  `;
}

const RevCoinStoreUI = {
  modalVisible: false,
  testFeedback: "",
  planFeedback: "",

  openPurchasePlaceholder() {
    console.log("Purchase flow coming soon");
    this.modalVisible = true;
    App.render();
  },

  closePurchasePlaceholder() {
    this.modalVisible = false;
    App.render();
  },

  addTestRevCoins(amount) {
    if (!isAdminUser()) return;
    const addAmount = Math.max(0, Number(amount) || 0);
    if (!addAmount) return;
    const current = Math.max(0, Number(RTXState.user.premiumRevCoins) || 0);
    RTXState.user.premiumRevCoins = current + addAmount;
    RTXUserPersist.save();
    this.testFeedback = `Added ${addAmount} Premium RevCoins for testing.`;
    App.render();
  },

  activateUpgradeTest() {
    if (!isAdminUser()) return;
    RTXState.user.membershipLevel = "upgraded";
    RTXUserPersist.save();
    this.planFeedback = "Membership set to Upgraded for testing.";
    App.render();
  },

  revertUpgradeTest() {
    if (!isAdminUser()) return;
    RTXState.user.membershipLevel = "free";
    RTXUserPersist.save();
    this.planFeedback = "Membership reverted to Free for testing.";
    App.render();
  },

  renderModal() {
    if (!this.modalVisible) return "";
    return `
      <div class="loyalty-info-overlay">
        <div class="loyalty-info-card premium-coming-soon-card">
          <h3>Payments coming soon</h3>
          <p>Purchase flow is not enabled yet. Stripe/PayPal integration will be added later.</p>
          <button class="btn btn-primary" onclick="RevCoinStoreUI.closePurchasePlaceholder()">Got it</button>
        </div>
      </div>
    `;
  }
};

function RevCoinStorePageComponent() {
  const balance = Math.max(0, Number(RTXState.user.premiumRevCoins) || 0);
  const isAdmin = isAdminUser();
  const membershipLevel = RTXState.user.membershipLevel === "upgraded" ? "upgraded" : "free";
  const packages = [
    { id: "p5", price: 5, coins: 50, bestValue: false },
    { id: "p10", price: 10, coins: 120, bestValue: false },
    { id: "p20", price: 20, coins: 260, bestValue: true },
    { id: "p50", price: 50, coins: 700, bestValue: true }
  ];

  return `
    <section class="revcoin-store-page">
      <header class="my-sites-header">
        <h1 class="my-sites-title">RevCoin Store</h1>
        <p class="my-sites-subtitle">Power up your experience with Premium RevCoins.</p>
        <div class="my-sites-plan-row">
          <span class="my-sites-plan-pill">Your Balance: ${balance} Premium RevCoins</span>
          <span class="my-sites-plan-pill">Current Plan: ${membershipLevel === "upgraded" ? "Upgraded" : "Free"}</span>
          ${membershipLevel === "upgraded" ? `<span class="my-sites-plan-pill revcoin-upgraded-pill">Upgraded Member</span>` : ""}
        </div>
      </header>

      ${renderTrafficBoostPanel()}

      <div class="revcoin-store-grid">
        ${packages
          .map(
            (pack) => `
          <article class="panel revcoin-pack-card ${pack.bestValue ? "best-value" : ""}">
            ${pack.bestValue ? `<div class="revcoin-pack-badge">Best Value</div>` : ""}
            <div class="revcoin-pack-price">$${pack.price}</div>
            <div class="revcoin-pack-amount">${pack.coins} Premium RevCoins</div>
            <button type="button" class="btn btn-primary revcoin-pack-btn" onclick="RevCoinStoreUI.openPurchasePlaceholder()">Buy Now</button>
          </article>
        `
          )
          .join("")}
      </div>

      <section class="panel revcoin-benefits-panel">
        <h3>Why Premium RevCoins?</h3>
        <div class="rule">- Buy extra Hyper Spins</div>
        <div class="rule">- Activate Boosts</div>
        <div class="rule">- Unlock premium opportunities</div>
        <div class="rule">- Increase your activity potential</div>
      </section>

      <section class="panel revcoin-membership-panel">
        <h3>Upgrade Membership</h3>
        <div class="revcoin-membership-grid">
          <div class="revcoin-membership-col">
            <div class="revcoin-membership-title">Free Plan</div>
            <div class="rule">- 1 Site</div>
            <div class="rule">- 1 Text Ad</div>
            <div class="rule">- 1 Banner Ad</div>
          </div>
          <div class="revcoin-membership-col">
            <div class="revcoin-membership-title">Upgraded Plan</div>
            <div class="rule">- 3 Sites</div>
            <div class="rule">- 3 Text Ads</div>
            <div class="rule">- 3 Banner Ads</div>
            <div class="rule">- Better ad rotation priority</div>
          </div>
        </div>
        <button type="button" class="btn btn-primary revcoin-pack-btn" onclick="RevCoinStoreUI.openPurchasePlaceholder()">
          Upgrade (Coming Soon)
        </button>
        ${
          isAdmin
            ? `
              <div class="revcoin-membership-test-row">
                <button type="button" class="btn revcoin-testmode-btn" onclick="RevCoinStoreUI.activateUpgradeTest()">Activate Upgrade (Test)</button>
                <button type="button" class="btn revcoin-testmode-btn" onclick="RevCoinStoreUI.revertUpgradeTest()">Revert to Free</button>
              </div>
              ${RevCoinStoreUI.planFeedback ? `<div class="revcoin-testmode-feedback">${escapeHtmlAttr(RevCoinStoreUI.planFeedback)}</div>` : ""}
            `
            : ""
        }
      </section>

      ${
        isAdmin
          ? `
            <section class="panel revcoin-testmode-panel">
              <h3>Admin Test Mode</h3>
              <p class="my-sites-subtitle">Add Premium RevCoins for testing only.</p>
              <div class="revcoin-testmode-row">
                <button type="button" class="btn revcoin-testmode-btn" onclick="RevCoinStoreUI.addTestRevCoins(50)">Test Add 50</button>
                <button type="button" class="btn revcoin-testmode-btn" onclick="RevCoinStoreUI.addTestRevCoins(120)">Test Add 120</button>
                <button type="button" class="btn revcoin-testmode-btn" onclick="RevCoinStoreUI.addTestRevCoins(260)">Test Add 260</button>
                <button type="button" class="btn revcoin-testmode-btn" onclick="RevCoinStoreUI.addTestRevCoins(700)">Test Add 700</button>
              </div>
              ${RevCoinStoreUI.testFeedback ? `<div class="revcoin-testmode-feedback">${escapeHtmlAttr(RevCoinStoreUI.testFeedback)}</div>` : ""}
            </section>
          `
          : ""
      }

      ${RevCoinStoreUI.renderModal()}
    </section>
  `;
}

const SpotlightBookingUI = {
  customUrl: "",
  feedback: "",
  feedbackTone: "neutral",

  getResolvedUrl() {
    const preferred = getPreferredSpotlightBookingUrl();
    if (preferred) return preferred;
    return normalizeMemberSiteUrlInput(this.customUrl);
  },

  setCustomUrl(value) {
    this.customUrl = String(value || "");
  },

  clearFeedback() {
    this.feedback = "";
    this.feedbackTone = "neutral";
  },

  bookDay(dayStart) {
    const cost = 100;
    const dayStartMs = getStartOfDayTimestamp(dayStart);
    const dayEndMs = dayStartMs + 24 * 60 * 60 * 1000;
    if (isSpotlightDayBooked(dayStartMs, dayEndMs)) {
      this.feedback = "That day is already booked.";
      this.feedbackTone = "error";
      App.render();
      return;
    }

    const currentBalance = Math.max(0, Number(RTXState.user.premiumRevCoins) || 0);
    if (currentBalance < cost) {
      this.feedback = "Not enough Premium RevCoins.";
      this.feedbackTone = "error";
      App.render();
      return;
    }

    const url = this.getResolvedUrl();
    if (!url) {
      this.feedback = "Please enter a valid Spotlight URL.";
      this.feedbackTone = "error";
      App.render();
      return;
    }

    RTXState.user.premiumRevCoins = currentBalance - cost;
    if (!Array.isArray(RTXState.admin.spotlightAds)) {
      RTXState.admin.spotlightAds = [];
    }
    RTXState.admin.spotlightAds.push({
      id: `spotlight_${Date.now()}`,
      title: "Member Spotlight",
      url,
      active: true,
      priority: 1,
      startAt: new Date(dayStartMs).toISOString(),
      endAt: new Date(dayEndMs).toISOString(),
      views: 0,
      source: "member",
      ownerId: "user1",
      ownerEmail: "",
      createdAt: Date.now()
    });

    RTXAdminPersist.save();
    RTXUserPersist.save();
    this.feedback = "Spotlight booked for 24 hours!";
    this.feedbackTone = "success";
    App.render();
  }
};

function SpotlightBookingPageComponent() {
  const balance = Math.max(0, Number(RTXState.user.premiumRevCoins) || 0);
  const preferredUrl = getPreferredSpotlightBookingUrl();
  const requiresUrlInput = !preferredUrl;
  const days = getNextSpotlightBookingDays(7);
  const totalSlots = days.length;
  const bookedSlots = days.reduce((count, day) => (isSpotlightDayBooked(day.dayStart, day.dayEnd) ? count + 1 : count), 0);
  const availableSlots = Math.max(0, totalSlots - bookedSlots);
  const nextAvailableDay = days.find((day) => !isSpotlightDayBooked(day.dayStart, day.dayEnd));
  const nextAvailableLabel = nextAvailableDay ? formatBookingDayLabel(nextAvailableDay.dayStart) : "No slots available this week";
  const urgencyText =
    availableSlots >= 5
      ? "Early launch availability is open."
      : availableSlots >= 2
        ? "Spots are filling up."
        : "High demand — limited availability remaining.";

  return `
    <section class="spotlight-booking-page">
      <header class="my-sites-header">
        <h1 class="my-sites-title">Spotlight Booking</h1>
        <p class="my-sites-subtitle">Get featured in the premium Spotlight position for 24 hours.</p>
        <div class="my-sites-plan-row">
          <span class="my-sites-plan-pill">Price: 100 Premium RevCoins</span>
          <span class="my-sites-plan-pill">Duration: 24 Hours</span>
          <span class="my-sites-plan-pill">Your Balance: ${balance} Premium RevCoins</span>
        </div>
        <p class="spotlight-booking-note">Pricing may increase as demand grows.</p>
      </header>

      <section class="panel spotlight-scarcity-panel">
        <h3 class="spotlight-scarcity-title">Limited Spotlight Availability</h3>
        <p class="spotlight-scarcity-subtitle">Only 1 Spotlight slot is available per day during this early launch phase.</p>
      </section>
      <section class="panel spotlight-availability-summary">
        <h3 class="spotlight-availability-title">Spotlight Availability</h3>
        <div class="spotlight-availability-count">${availableSlots} of 7 slots available this week</div>
        <div class="spotlight-availability-urgency">${urgencyText}</div>
        <div class="spotlight-availability-next">Next Available: ${nextAvailableLabel}</div>
      </section>

      ${
        requiresUrlInput
          ? `
            <section class="panel spotlight-booking-url-panel">
              <label class="my-sites-label">
                Spotlight URL
                <input
                  class="my-sites-input"
                  type="url"
                  placeholder="https://example.com"
                  value="${escapeHtmlAttr(SpotlightBookingUI.customUrl)}"
                  oninput="SpotlightBookingUI.setCustomUrl(this.value)"
                />
              </label>
              <div class="stat-sub">No active My Site URL found. Add one in My Sites or provide a URL here.</div>
            </section>
          `
          : `
            <section class="panel spotlight-booking-url-panel">
              <div class="spotlight-booking-selected-url-label">Using your first active My Site URL:</div>
              <div class="spotlight-booking-selected-url">${escapeHtmlAttr(preferredUrl)}</div>
            </section>
          `
      }

      ${
        SpotlightBookingUI.feedback
          ? `<div class="spotlight-booking-feedback ${SpotlightBookingUI.feedbackTone}">${escapeHtmlAttr(SpotlightBookingUI.feedback)}</div>`
          : ""
      }

      <section class="spotlight-booking-slots">
        ${days
          .map((day) => {
            const booked = isSpotlightDayBooked(day.dayStart, day.dayEnd);
            return `
              <article class="panel spotlight-booking-slot">
                <div class="spotlight-booking-slot-main">
                  <div class="spotlight-booking-date">${formatBookingDayLabel(day.dayStart)}</div>
                  <div class="spotlight-booking-capacity-badge ${booked ? "booked" : "available"}">
                    ${booked ? "Fully booked" : "1 slot available"}
                  </div>
                  <div class="spotlight-booking-status ${booked ? "booked" : "available"}">
                    Status: ${booked ? "Booked" : "Available"}
                  </div>
                </div>
                <div class="spotlight-booking-slot-actions">
                  ${
                    booked
                      ? `<button type="button" class="btn spotlight-booking-btn-booked" disabled>Booked</button>`
                      : `<button type="button" class="btn btn-primary" onclick="SpotlightBookingUI.bookDay(${day.dayStart})">Book This Day</button>`
                  }
                </div>
              </article>
            `;
          })
          .join("")}
      </section>
    </section>
  `;
}

const HyperSpinPageUI = {
  lastReward: "",
  lastTone: "neutral",
  _spinPick: null,

  useSpin() {
    if (typeof HyperSpinWheel !== "undefined" && HyperSpinWheel.isAnimating) return;

    const currentSpins = Math.max(0, Number(RTXState.user.hyperSpins) || 0);
    if (currentSpins <= 0) {
      this.lastReward = "No Hyper Spins available. Buy one from RevCoin Store.";
      this.lastTone = "error";
      this._spinPick = null;
      App.render();
      return;
    }

    if (this.lastTone === "success") {
      this.lastReward = "";
      this.lastTone = "neutral";
    }

    const picked = HyperSpin.pickWinningSegment();
    this._spinPick = picked;
    RTXState.user.hyperSpins = currentSpins - 1;
    RTXUserPersist.save();
    App.render();

    const runWheel = () => {
      if (typeof HyperSpinWheel === "undefined" || !HyperSpinWheel.startSpin) {
        HyperSpin.applyReward(picked.segment, true);
        this._recordSpinSuccess(picked.segment);
        this._spinPick = null;
        RTXUserPersist.save();
        App.render();
        return;
      }
      HyperSpinWheel.startSpin({
        diskId: "hyperspin-page-wheel-disk",
        winningIndex: picked.winningIndex,
        segment: picked.segment,
        onComplete: () => {
          HyperSpin.applyReward(picked.segment, true);
          this._recordSpinSuccess(picked.segment);
          this._spinPick = null;
          RTXUserPersist.save();
          App.render();
        }
      });
    };

    if (typeof queueMicrotask === "function") {
      queueMicrotask(runWheel);
    } else {
      setTimeout(runWheel, 0);
    }
  },

  _recordSpinSuccess(reward) {
    this.lastReward = reward && reward.label ? `You won: ${reward.label}` : "You won";
    this.lastTone = "success";
    const currentHistory = Array.isArray(RTXState.user.recentHyperSpinHistory) ? RTXState.user.recentHyperSpinHistory : [];
    currentHistory.unshift({
      id: `spin_${Date.now()}`,
      label: reward && reward.label ? reward.label : "Spin complete",
      time: new Date().toLocaleTimeString()
    });
    RTXState.user.recentHyperSpinHistory = currentHistory.slice(0, 3);
  }
};

function HyperSpinPageComponent() {
  const spins = Math.max(0, Number(RTXState.user.hyperSpins) || 0);
  const recentSpins = Array.isArray(RTXState.user.recentHyperSpinHistory) ? RTXState.user.recentHyperSpinHistory : [];
  const wheelBusy = typeof HyperSpinWheel !== "undefined" && HyperSpinWheel.isAnimating;
  const highlightIndex =
    wheelBusy && HyperSpinPageUI._spinPick && typeof HyperSpinPageUI._spinPick.winningIndex === "number"
      ? HyperSpinPageUI._spinPick.winningIndex
      : null;
  const wheelHtml =
    typeof HyperSpinWheel !== "undefined" && HyperSpinWheel.renderHTML
      ? HyperSpinWheel.renderHTML({ diskId: "hyperspin-page-wheel-disk", highlightIndex })
      : "";
  return `
    <section class="revcoin-store-page">
      <header class="my-sites-header">
        <h1 class="my-sites-title">Hyper Spin</h1>
        <p class="my-sites-subtitle">Use your earned or purchased spins here.</p>
        <div class="my-sites-plan-row">
          <span class="my-sites-plan-pill">Available Hyper Spins: ${spins}</span>
        </div>
      </header>

      <section class="panel hyperspin-panel">
        <h3>Spin the wheel</h3>
        <p class="my-sites-subtitle">The prize is chosen first, then the wheel spins to match. Segment order follows the legend (top → clockwise).</p>
        <div class="rtx-hyper-wheel-wrap">
          ${wheelHtml}
          ${wheelBusy ? `<div class="rtx-hyper-spinning-hint" aria-live="polite">Spinning…</div>` : ""}
        </div>
        <button
          type="button"
          class="btn btn-primary hyperspin-spin-btn"
          onclick="HyperSpinPageUI.useSpin()"
          ${spins > 0 && !wheelBusy ? "" : "disabled"}
        >
          ${wheelBusy ? "Spinning…" : spins > 0 ? "Spin Now" : "No Spins Available"}
        </button>
        ${
          HyperSpinPageUI.lastReward && HyperSpinPageUI.lastTone === "success"
            ? `<div class="rtx-hyper-result-card">${escapeHtmlAttr(HyperSpinPageUI.lastReward)}</div>`
            : HyperSpinPageUI.lastReward
            ? `<div class="hyperspin-feedback ${HyperSpinPageUI.lastTone}">${escapeHtmlAttr(HyperSpinPageUI.lastReward)}</div>`
            : ""
        }
      </section>

      <section class="panel hyperspin-history-panel">
        <h3>Recent Spins</h3>
        ${
          recentSpins.length
            ? `
              <div class="hyperspin-history-list">
                ${recentSpins
                  .map(
                    (spin) => `
                      <div class="hyperspin-history-item">
                        <span class="hyperspin-history-label">${escapeHtmlAttr(spin.label)}</span>
                        <span class="hyperspin-history-time">${escapeHtmlAttr(spin.time)}</span>
                      </div>
                    `
                  )
                  .join("")}
              </div>
            `
            : `<div class="stat-sub">No spins yet. Your latest 3 outcomes will appear here.</div>`
        }
      </section>
    </section>
  `;
}

const TermsSections = [
  {
    heading: "Loyalty Reward System",
    body:
      "RevTrafficXchange operates as a loyalty-based engagement platform. Users participate by completing platform activities such as viewing pages, engaging with ads, maintaining activity, and using platform tools."
  },
  {
    heading: "No Guaranteed Earnings",
    body:
      "RevTrafficXchange does not guarantee earnings or income. Rewards are variable, performance-based, subject to system limits, and dependent on platform conditions and reward pool availability."
  },
  {
    heading: "Reward Cap",
    body:
      "Eligible users may qualify for up to 150% maximum reward cap based on activity and pool availability. This is a maximum cap, not a guaranteed outcome."
  },
  {
    heading: "Reward Pool Distribution",
    body:
      "Rewards are distributed from a shared Loyalty Reward Pool that may be funded by platform activity, purchases, upgrades, advertising products, and other eligible revenue sources. Reward distribution may vary and is subject to availability and system controls."
  },
  {
    heading: "Platform Revenue Allocation",
    body:
      "Eligible platform revenue may be divided between platform operations, admin/platform share, reserves, growth, and the Loyalty Reward Pool. This helps maintain long-term sustainability."
  },
  {
    heading: "Operator Participation",
    body:
      "Platform operators and administrators may participate as regular users. They are subject to the same rules, limits, caps, and reward conditions as other users and do not receive guaranteed or preferential rewards."
  },
  {
    heading: "Fair Use & Anti-Abuse",
    body:
      "RevTrafficXchange may use safeguards such as unique interaction tracking, activity validation, account restrictions, and campaign monitoring to prevent abuse, repeated reward farming, manipulation, or unfair usage."
  },
  {
    heading: "Platform Purpose",
    body:
      "RevTrafficXchange is a traffic exchange, advertising, engagement, and loyalty rewards platform. It is not an investment platform, financial product, passive income program, or guaranteed income system."
  },
  {
    heading: "Acceptance",
    body:
      "By using RevTrafficXchange, users acknowledge that rewards are not guaranteed, participation is required, rewards may vary, and eligibility depends on activity, loyalty, platform conditions, and pool availability."
  }
];

function TermsPageComponent() {
  return `
    <section class="terms-page">
      <header class="my-sites-header">
        <h1 class="my-sites-title">RevTrafficXchange Terms & Rewards Disclaimer</h1>
        <p class="terms-last-updated">Last updated: April 28, 2026</p>
      </header>
      <div class="terms-sections">
        ${TermsSections.map(
          (section) => `
          <article class="panel terms-section-card">
            <h3>${section.heading}</h3>
            <p>${section.body}</p>
          </article>
        `
        ).join("")}
      </div>
    </section>
  `;
}

const RewardsAcknowledgmentUI = {
  toggleChecked(value) {
    RTXState.ui.rewardsAckChecked = Boolean(value);
    App.render();
  },

  continueAcknowledgment() {
    if (!RTXState.ui.rewardsAckChecked) return;
    RewardsAckPersist.saveAcknowledged();
    RTXState.ui.rewardsAckVisible = false;
    RTXState.ui.rewardsAckChecked = false;
    App.render();
  }
};

function RewardsAcknowledgmentComponent() {
  if (RTXState.currentView !== "dashboard" || !RTXState.ui.rewardsAckVisible) return "";
  return `
    <div class="loyalty-info-overlay">
      <div class="loyalty-info-card rewards-ack-card">
        <h3>Rewards Acknowledgment</h3>
        <p>Rewards are based on activity, loyalty, reward pool availability, and platform conditions. No earnings are guaranteed.</p>
        <p>Eligible users may qualify for up to 150% maximum reward cap based on activity and pool availability.</p>
        <p>RevTrafficXchange is a traffic exchange and loyalty rewards platform, not an investment or passive income system.</p>
        <label class="rewards-ack-check">
          <input type="checkbox" ${RTXState.ui.rewardsAckChecked ? "checked" : ""} onchange="RewardsAcknowledgmentUI.toggleChecked(this.checked)" />
          <span>I understand and agree that rewards are not guaranteed.</span>
        </label>
        <div class="rewards-ack-actions">
          <button class="btn btn-primary" ${RTXState.ui.rewardsAckChecked ? "" : "disabled"} onclick="RewardsAcknowledgmentUI.continueAcknowledgment()">Continue</button>
        </div>
      </div>
    </div>
  `;
}

function RewardsPageComponent() {
  checkDailyReset();
  const daily = RTXState.user.dailyActivity || {};
  const loyalty = getLoyaltyTierInfo(RTXState.user.loyaltyScore);

  return `
    <section class="terms-page rewards-page">
      <header class="my-sites-header">
        <h1 class="my-sites-title">Rewards</h1>
        <p class="my-sites-subtitle">Track your current activity and reward status.</p>
      </header>

      <div class="rewards-status-grid">
        <article class="panel rewards-status-card">
          <h3>Today’s Activity</h3>
          <div class="stat-sub">Activity Score: ${Math.max(0, Number(daily.activityScore) || 0)}</div>
          <div class="stat-sub">Views: ${Math.max(0, Number(daily.views) || 0)}</div>
          <div class="stat-sub">Sessions: ${Math.max(0, Number(daily.sessions) || 0)}</div>
          <div class="stat-sub">Daily Reward Tier: ${daily.rewardTier || "Not Qualified"}</div>
        </article>

        <article class="panel rewards-status-card">
          <h3>Loyalty</h3>
          <div class="stat-sub">Loyalty Score: ${Math.max(0, Number(RTXState.user.loyaltyScore) || 0)}</div>
          <div class="stat-sub">Loyalty Tier: ${loyalty.tier}</div>
          <div class="stat-sub">Multiplier: ${loyalty.multiplier.toFixed(1)}x</div>
        </article>

        <article class="panel rewards-status-card">
          <h3>Reward Pool</h3>
          <div class="stat-sub">Status: Warming Up</div>
          <div class="stat-sub">Reward Eligibility: ${daily.rewardTier && daily.rewardTier !== "Not Qualified" ? daily.rewardTier : "Building"}</div>
        </article>
      </div>

      <section class="panel rewards-disclaimer-card">
        <div class="rule">- Up to 150% maximum reward cap based on activity and pool availability.</div>
        <div class="rule">- No earnings are guaranteed.</div>
      </section>
    </section>
  `;
}

function NavPlaceholderComponent() {
  const v = RTXState.currentView;
  const pages = {
    
  };

  const page = pages[v];
  if (!page) return "";

  return `
    <section class="main-nav-placeholder panel">
      <h1 class="main-nav-placeholder-title">${page.title}</h1>
      <p class="main-nav-placeholder-text">${page.text}</p>
    </section>
  `;
}
