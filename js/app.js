const App = {
  init() {
    if (typeof RTXReferral !== "undefined" && RTXReferral.captureFromUrl) {
      RTXReferral.captureFromUrl();
    }
    this.render();
    if (RTXState.session && RTXState.session.isAuthenticated) {
      LoadingScreen.start();
      this.render();
    }
  },

  escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  },

  sanitizeFakeLoginEmail(raw) {
    return String(raw || "")
      .trim()
      .toLowerCase();
  },

  isValidFakeLoginEmail(email) {
    const e = String(email || "").trim();
    if (e.length < 5 || e.length > 254) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  },

  sanitizeMemberUsername(raw) {
    return String(raw || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "");
  },

  isValidMemberUsername(username) {
    const u = String(username || "");
    return /^[a-z0-9_]{3,24}$/.test(u);
  },

  submitFakeLogin() {
    const input = document.getElementById("fake-login-email");
    const userId = this.sanitizeFakeLoginEmail(input ? input.value : "");
    const usernameInput = document.getElementById("fake-login-username");
    const username = this.sanitizeMemberUsername(usernameInput ? usernameInput.value : "");
    if (!userId) {
      RTXState.ui.loginError = "Enter your email.";
      this.render();
      return;
    }
    if (!this.isValidFakeLoginEmail(userId)) {
      RTXState.ui.loginError = "Enter a valid email address.";
      this.render();
      return;
    }
    if (username && !this.isValidMemberUsername(username)) {
      RTXState.ui.loginError = "Username must be 3–24 characters (letters, numbers, underscores), or leave it blank to keep yours.";
      this.render();
      return;
    }
    RTXState.ui.loginError = "";
    switchUser(userId);
    if (username) {
      RTXState.user.username = username;
    }
    if (typeof normalizeUserProfile === "function") {
      normalizeUserProfile();
    }
    if (typeof applyPendingReferralAttribution === "function") {
      applyPendingReferralAttribution();
    }
    RTXUserPersist.save();
    RTXState.currentView = "dashboard";
    this.render();
    LoadingScreen.start();
    this.render();
  },

  logout() {
    try {
      localStorage.removeItem(RTXSessionAuth.lastUserKey);
    } catch (e) {
      /* ignore */
    }
    RTXState.session.isAuthenticated = false;
    RTXState.session.currentUserId = "";
    if (typeof resetToGuestUser === "function") {
      resetToGuestUser();
    }
    RTXState.currentView = "dashboard";
    if (RTXState.ui) {
      RTXState.ui.preAuthScreen = "splash";
      RTXState.ui.premiumSpinFeedback = "";
      RTXState.ui.premiumSpinFeedbackTone = "neutral";
      RTXState.ui.trafficBoostFeedback = "";
      RTXState.ui.trafficBoostFeedbackTone = "neutral";
      RTXState.ui.adsDropdownOpen = false;
      RTXState.ui.loginError = "";
      RTXState.ui.rewardsAckChecked = false;
      RTXState.ui.referralCopyFeedback = "";
    }
    if (LoadingScreen.interval) {
      clearInterval(LoadingScreen.interval);
      LoadingScreen.interval = null;
    }
    LoadingScreen.active = false;
    if (typeof ActivityBoostCountdown !== "undefined" && ActivityBoostCountdown.clear) {
      ActivityBoostCountdown.clear();
    }
    if (typeof TrafficBoostCountdown !== "undefined" && TrafficBoostCountdown.clear) {
      TrafficBoostCountdown.clear();
    }
    this.render();
  },

  openPreLogin() {
    if (!RTXState.ui) return;
    RTXState.ui.preAuthScreen = "login";
    RTXState.ui.loginError = "";
    this.render();
  },

  openPublicSplash() {
    if (!RTXState.ui) return;
    RTXState.ui.preAuthScreen = "splash";
    RTXState.ui.loginError = "";
    this.render();
  },

  copyMemberReferralLink() {
    const handle = String(RTXState.user && RTXState.user.username ? RTXState.user.username : "").trim();
    if (!handle || typeof RTXReferral === "undefined" || !RTXReferral.buildLandingUrlForRef) {
      return;
    }
    const url = RTXReferral.buildLandingUrlForRef(handle);
    if (!url) return;
    const notify = (msg) => {
      if (RTXState.ui) RTXState.ui.referralCopyFeedback = msg;
      this.render();
      window.setTimeout(() => {
        if (RTXState.ui) RTXState.ui.referralCopyFeedback = "";
        if (RTXState.session && RTXState.session.isAuthenticated) this.render();
      }, 2200);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(
        () => notify("Referral link copied."),
        () => notify("Copy blocked—select the link and copy manually.")
      );
      return;
    }
    notify("Clipboard unavailable—copy from the field manually.");
  },

  navigate(view) {
    if (!RTXState.session || !RTXState.session.isAuthenticated) return;
    if (view === "admin" && !isAdminUser()) {
      RTXState.currentView = "dashboard";
      this.render();
      return;
    }
    RTXState.currentView = view;
    if (RTXState.ui) RTXState.ui.adsDropdownOpen = false;
    if (typeof ActivityBoostCountdown !== "undefined" && ActivityBoostCountdown.clear) {
      ActivityBoostCountdown.clear();
    }
    if (typeof TrafficBoostCountdown !== "undefined" && TrafficBoostCountdown.clear) {
      TrafficBoostCountdown.clear();
    }
    if (RTXState.ui) {
      RTXState.ui.trafficBoostFeedback = "";
      RTXState.ui.trafficBoostFeedbackTone = "neutral";
    }
    this.render();

    if (view === "surf" && !SurfEngine.isRunning && SurfEngine.secondsLeft === RTXState.settings.adTimerSeconds) {
      // User can manually start timer.
    }
  },

  toggleAdsDropdown() {
    if (!RTXState.ui) return;
    RTXState.ui.adsDropdownOpen = !RTXState.ui.adsDropdownOpen;
    this.render();
  },

  isAdSectionView() {
    return ["my-sites", "my-text-ads", "my-banner-ads"].includes(RTXState.currentView);
  },

  renderLoginScreen() {
    const err = RTXState.ui && RTXState.ui.loginError ? String(RTXState.ui.loginError) : "";
    const errBlock = err
      ? `<p class="fake-login-error" role="alert">${this.escapeHtml(err)}</p>`
      : "";
    const pending =
      typeof RTXReferral !== "undefined" && RTXReferral.peekPendingReferral
        ? RTXReferral.peekPendingReferral()
        : "";
    const refHint =
      pending
        ? `<p class="fake-login-ref-hint">Referral from <strong>@${this.escapeHtml(pending)}</strong> will be saved when you continue (first sign-in on this device only).</p>`
        : "";
    return `
      <div class="fake-login-page" aria-label="Sign in">
        <div class="fake-login-card">
          <p class="fake-login-back">
            <button type="button" class="fake-login-back-btn" onclick="App.openPublicSplash()">← Back to home</button>
          </p>
          <h1 class="fake-login-title">RevTrafficXchange</h1>
          <p class="fake-login-sub">Local demo sign-in. Email is your account id on this device; username is your display name. No password and no server.</p>
          ${refHint}
          ${errBlock}
          <form class="fake-login-form" onsubmit="event.preventDefault(); App.submitFakeLogin(); return false;">
            <label class="fake-login-label" for="fake-login-email">Email</label>
            <input
              id="fake-login-email"
              class="fake-login-input"
              type="email"
              name="email"
              autocomplete="username"
              placeholder="you@example.com"
              required
            />
            <label class="fake-login-label" for="fake-login-username">Username</label>
            <input
              id="fake-login-username"
              class="fake-login-input"
              type="text"
              name="username"
              autocomplete="nickname"
              autocapitalize="none"
              spellcheck="false"
              maxlength="24"
              placeholder="your_handle (optional if you already have one)"
            />
            <p class="fake-login-field-hint">3–24 characters: a–z, 0–9, underscore. Shown as @username. Leave blank on return visits to keep your saved name.</p>
            <button type="submit" class="fake-login-submit">Continue</button>
          </form>
          <p class="fake-login-note">Each email keeps its own credits, campaigns, and progress in this browser.</p>
        </div>
      </div>
    `;
  },

  renderMainNav() {
    const v = RTXState.currentView;
    const adsOpen = RTXState.ui && RTXState.ui.adsDropdownOpen;
    const adActive = this.isAdSectionView();

    return `
      <nav class="main-nav" aria-label="Main">
        <button type="button" class="main-nav-link ${v === "dashboard" ? "active" : ""}" onclick="App.navigate('dashboard')">Dashboard</button>
        <button type="button" class="main-nav-link ${v === "member-stats" ? "active" : ""}" onclick="App.navigate('member-stats')">My Stats</button>
        <button type="button" class="main-nav-link ${v === "surf" ? "active" : ""}" onclick="App.navigate('surf')">Surf</button>
        <button type="button" class="main-nav-link ${v === "spotlight-booking" ? "active" : ""}" onclick="App.navigate('spotlight-booking')">Spotlight</button>

        <div class="nav-dropdown ${adsOpen ? "nav-dropdown-open" : ""}">
          <button
            type="button"
            class="main-nav-link nav-dropdown-toggle ${adActive ? "active" : ""}"
            aria-expanded="${adsOpen ? "true" : "false"}"
            aria-haspopup="true"
            onclick="event.stopPropagation(); App.toggleAdsDropdown()"
          >
            Ad Section <span class="nav-caret" aria-hidden="true">▾</span>
          </button>
          <div class="nav-dropdown-menu" role="menu">
            <button type="button" class="nav-dropdown-item" role="menuitem" onclick="App.navigate('my-sites')">My Sites</button>
            <button type="button" class="nav-dropdown-item" role="menuitem" onclick="App.navigate('my-text-ads')">My Text Ads</button>
            <button type="button" class="nav-dropdown-item" role="menuitem" onclick="App.navigate('my-banner-ads')">My Banner Ads</button>
          </div>
        </div>

        <button type="button" class="main-nav-link ${v === "revcoin-store" ? "active" : ""}" onclick="App.navigate('revcoin-store')">RevCoin Store</button>
        <button type="button" class="main-nav-link ${v === "hyper-spin" ? "active" : ""}" onclick="App.navigate('hyper-spin')">Hyper Spin</button>
        <button type="button" class="main-nav-link ${v === "rewards" ? "active" : ""}" onclick="App.navigate('rewards')">Rewards</button>
        <button type="button" class="main-nav-link ${v === "terms" ? "active" : ""}" onclick="App.navigate('terms')">Terms</button>
        ${isAdminUser() ? `<button type="button" class="main-nav-link ${v === "admin" ? "active" : ""}" onclick="App.navigate('admin')">Admin</button>` : ""}
      </nav>
    `;
  },

  renderHeader() {
    const email = RTXState.session && RTXState.session.isAuthenticated ? String(RTXState.session.currentUserId || "") : "";
    const username =
      RTXState.user && RTXState.user.username ? String(RTXState.user.username).trim().toLowerCase() : "";
    const displayHandle = username ? `@${this.escapeHtml(username)}` : this.escapeHtml(email);
    const emailMuted = username
      ? `<span class="header-user-email-muted">${this.escapeHtml(email)}</span>`
      : "";
    const adminBadge = isAdminUser()
      ? `<span class="header-admin-badge" title="Administrator">Admin</span>`
      : "";
    const userLine = email
      ? `<div class="header-user-row">
          <span class="header-user-line">Logged in as: <strong>${displayHandle}</strong>${emailMuted}</span>
          ${adminBadge}
          <button type="button" class="btn btn-header-logout" onclick="App.logout()">Logout</button>
        </div>`
      : "";

    return `
      <header class="header">
        <div class="header-inner">
          <div class="brand" role="button" tabindex="0" onclick="App.navigate('dashboard')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();App.navigate('dashboard');}">
            <img
              class="header-logo-icon"
              src="assets/images/logos/rx-icon.png"
              alt="RX"
            />
            <img
              class="header-logo-wordmark"
              src="assets/images/logos/revtx-wordmark.png"
              alt="RevTrafficXchange"
            />
          </div>

          <div class="header-right">
            ${userLine}
            ${this.renderMainNav()}
          </div>
        </div>
      </header>
    `;
  },

  renderView() {
    if (RTXState.currentView === "spotlight") return SpotlightPageComponent();
    if (RTXState.currentView === "surf") return SurfPageComponent();
    if (RTXState.currentView === "admin") return AdminPageComponent();
    if (RTXState.currentView === "dashboard") return DashboardComponent();
    if (RTXState.currentView === "member-stats") return MemberStatsPageComponent();
    if (RTXState.currentView === "my-sites") return MySitesPageComponent();
    if (RTXState.currentView === "my-text-ads") return MyTextAdsPageComponent();
    if (RTXState.currentView === "text-ads-display") return TextAdsDisplayPageComponent();
    if (RTXState.currentView === "my-banner-ads") return MyBannerAdsPageComponent();
    if (RTXState.currentView === "banner-ads-display") return BannerAdsDisplayPageComponent();
    if (RTXState.currentView === "spotlight-booking") return SpotlightBookingPageComponent();
    if (RTXState.currentView === "revcoin-store") return RevCoinStorePageComponent();
    if (RTXState.currentView === "hyper-spin") return HyperSpinPageComponent();
    if (RTXState.currentView === "terms") return TermsPageComponent();
    if (RTXState.currentView === "rewards") return RewardsPageComponent();
    return DashboardComponent();
  },

  render() {
    if (!RTXState.session || !RTXState.session.isAuthenticated) {
      const useSplash = RTXState.ui && RTXState.ui.preAuthScreen !== "login";
      document.getElementById("app").innerHTML = useSplash
        ? typeof SplashPageComponent === "function"
          ? SplashPageComponent()
          : this.renderLoginScreen()
        : this.renderLoginScreen();
      return;
    }

    if (RTXState.currentView === "admin" && !isAdminUser()) {
      RTXState.currentView = "dashboard";
    }

    const hyperMode = RTXState.currentView === "surf";
    document.getElementById("app").innerHTML = `
      <div class="app-shell${hyperMode ? " hyper-mode" : ""}">
        ${this.renderHeader()}
        <main class="main">
          ${this.renderView()}
        </main>
        <footer class="app-legal-footer">
          <button type="button" class="app-legal-link" onclick="App.navigate('terms')">Terms & Rewards Disclaimer</button>
        </footer>
        ${typeof RewardsAcknowledgmentComponent === "function" ? RewardsAcknowledgmentComponent() : ""}
        ${GameModal.render()}
        ${LoadingScreen.render()}
      </div>
    `;
    if (typeof queueMicrotask === "function") {
      queueMicrotask(() => {
        if (typeof manageTrafficBoostCountdown === "function") manageTrafficBoostCountdown();
      });
    }
  }
};

document.addEventListener("DOMContentLoaded", () => App.init());
