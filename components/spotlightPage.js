const SpotlightEngine = {
  timer: null,
  currentAd: null,

  updateTimerDisplay() {
    const timerNode = document.querySelector(".spotlight-timer");
    if (timerNode) {
      timerNode.textContent = `${RTXState.spotlight.secondsLeft}s`;
    }
  },

  getCurrentSpotlightAd() {
    if (this.currentAd) return this.currentAd;
    this.currentAd = getActiveSpotlightAd();
    return this.currentAd;
  },

  begin() {
    const s = RTXState.spotlight;
    if (s.initialized) return;

    s.initialized = true;
    s.secondsLeft = s.timerSeconds;
    s.isRunning = true;
    s.canContinue = false;
    s.creditMessage = "";
    s.creditedThisView = false;
    this.currentAd = getActiveSpotlightAd();
    incrementSpotlightView(this.currentAd.id);

    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      s.secondsLeft -= 1;
      if (s.secondsLeft <= 0) {
        s.secondsLeft = 0;
        s.isRunning = false;
        s.canContinue = true;
        clearInterval(this.timer);
        this.timer = null;
        this.applyDailyCreditRule();
        App.render();
        return;
      }

      if (RTXState.currentView === "spotlight") {
        this.updateTimerDisplay();
      } else {
        App.render();
      }
    }, 1000);
  },

  applyDailyCreditRule() {
    const s = RTXState.spotlight;
    if (s.creditedThisView) return;

    const now = Date.now();
    const last = Math.max(0, Number(RTXState.user.lastSpotlightCreditAt) || 0);
    const dayMs = 24 * 60 * 60 * 1000;

    if (!last || now - last >= dayMs) {
      CreditSystem.addCredits(5);
      RTXState.user.lastSpotlightCreditAt = now;
      RTXUserPersist.save();
      s.creditMessage = "+5 credits added for today.";
    } else {
      s.creditMessage = "You already got credited today.";
    }

    s.creditedThisView = true;
  },

  continueToDashboard() {
    const s = RTXState.spotlight;
    if (!s.canContinue) return;

    if (this.currentAd && this.currentAd.source !== "fallback") {
      incrementSpotlightView(this.currentAd.id);
    }

    s.initialized = false;
    this.currentAd = null;
    RTXState.currentView = "dashboard";
    App.render();
  }
};

function SpotlightPageComponent() {
  SpotlightEngine.begin();
  const ad = SpotlightEngine.getCurrentSpotlightAd();
  const s = RTXState.spotlight;

  return `
    <section class="spotlight-wrap panel">
      <div class="spotlight-badge">SPOTLIGHT AD</div>
      <h2>${ad.title}</h2>
      <a class="spotlight-url" href="${ad.url}" target="_blank" rel="noopener noreferrer">${ad.url}</a>

      <div class="spotlight-viewer">
        <iframe
          class="spotlight-iframe"
          src="${ad.url}"
          title="${ad.title}"
          loading="lazy"
          referrerpolicy="no-referrer"
        ></iframe>
      </div>

      <div class="spotlight-footer">
        <div class="spotlight-timer">${s.secondsLeft}s</div>
        <button class="btn btn-primary" ${s.canContinue ? "" : "disabled"} onclick="SpotlightEngine.continueToDashboard()">
          Continue to Dashboard
        </button>
      </div>

      <div class="spotlight-credit-msg ${s.creditMessage ? "" : "hidden"}">${s.creditMessage || ""}</div>
    </section>
  `;
}
