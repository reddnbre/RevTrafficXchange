const LoadingScreen = {
  messages: [
    "Calibrating Hyper Mode...",
    "Loading traffic campaigns...",
    "Preparing ad sessions...",
    "Syncing loyalty engine...",
    "Checking available traffic credits...",
    "Activating streak tracker...",
    "Launching RevTrafficXchange..."
  ],

  progress: 0,
  messageIndex: 0,
  active: true,
  interval: null,

  patchProgressUI() {
    const root = document.getElementById("loadingScreen");
    if (!root || !this.active) return;
    const fill = root.querySelector(".loading-bar-fill");
    const msg = root.querySelector(".loading-message");
    if (fill) fill.style.width = `${this.progress}%`;
    if (msg) {
      msg.textContent = this.messages[this.messageIndex];
      msg.classList.remove("loading-message--tick");
      void msg.offsetWidth;
      msg.classList.add("loading-message--tick");
    }
  },

  start() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.active = true;
    this.progress = 0;
    this.messageIndex = 0;

    this.interval = setInterval(() => {
      this.progress += 8 + Math.floor(Math.random() * 8);
      this.messageIndex = (this.messageIndex + 1) % this.messages.length;

      if (this.progress >= 100) {
        this.progress = 100;
        clearInterval(this.interval);
        this.interval = null;
        this.patchProgressUI();
        setTimeout(() => {
          this.active = false;
          RTXState.currentView = "spotlight";
          App.render();
        }, 450);
        return;
      }

      this.patchProgressUI();
    }, 350);
  },

  render() {
    if (!this.active) return "";

    return `
      <section id="loadingScreen">
        <div class="loading-bg" aria-hidden="true"></div>
        <div class="loading-card">
          <aside class="loading-panel loading-panel--left">
            <h3>Features Online</h3>
            <div class="loading-list">
              <div class="loading-pill">✓ View Ads</div>
              <div class="loading-pill">✓ Play Games</div>
              <div class="loading-pill">✓ Complete Sessions</div>
              <div class="loading-pill">✓ Climb Ranks</div>
              <div class="loading-pill">✓ Community</div>
            </div>
          </aside>

          <main class="loading-logo-wrap">
            <div class="loading-badge">HYPER MODE ACTIVATED</div>

            <img
              class="loading-logo"
              src="assets/images/logos/revtx-full.png"
              alt="RevTrafficXchange Logo"
              onerror="this.style.display='none';document.getElementById('loadingFallbackLogo').style.display='block';"
            />

            <div id="loadingFallbackLogo" style="display:none;">
              <div style="font-size:clamp(72px,14vw,96px);font-weight:900;color:#f97316;">RX</div>
              <div class="loading-title">RevTrafficXchange</div>
            </div>

            <div class="loading-tagline">SURF • EARN • PLAY • GROW</div>

            <div class="loading-bar-shell">
              <div class="loading-bar-fill" style="width:${this.progress}%"></div>
            </div>

            <div class="loading-message loading-message--tick">${this.messages[this.messageIndex]}</div>

            <div class="loading-tip">
              Tip: Complete 25 ads to unlock Hyper Spin and win bonus credits,
              multipliers, and more.
            </div>
          </main>

          <aside class="loading-panel loading-panel--right">
            <h3>System Status</h3>
            <div class="loading-status"><span>Traffic Network</span><span>Online</span></div>
            <div class="loading-status"><span>Reward Pool</span><span>Active</span></div>
            <div class="loading-status"><span>Ad Campaigns</span><span>Loaded</span></div>
            <div class="loading-status"><span>Security Shield</span><span>Locked</span></div>
            <div class="loading-status"><span>Loyalty Engine</span><span>Running</span></div>
          </aside>
        </div>
      </section>
    `;
  }
};
