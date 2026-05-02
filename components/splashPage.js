function SplashPageComponent() {
  const pending =
    typeof RTXReferral !== "undefined" && RTXReferral.peekPendingReferral
      ? RTXReferral.peekPendingReferral()
      : "";
  const inviteNote =
    pending && typeof App !== "undefined" && App && typeof App.escapeHtml === "function"
      ? `<p class="splash-invite-banner">You were invited by <strong>@${App.escapeHtml(pending)}</strong>. Create a free account and your referral will be saved.</p>`
      : "";

  return `
    <div class="splash-page" aria-label="RevTrafficXchange marketing">
      <header class="splash-header">
        <div class="splash-header-inner">
          <div class="splash-brand">
            <img class="splash-brand-icon" src="assets/images/logos/rx-icon.png" alt="" width="40" height="40" />
            <div class="splash-brand-text">
              <span class="splash-brand-rtx">RTX</span>
              <span class="splash-brand-sub">REVTRAFFICXCHANGE</span>
            </div>
          </div>
          <button type="button" class="splash-login-link" onclick="App.openPreLogin()">Already a member? <span class="splash-login-em">LOGIN</span></button>
        </div>
      </header>

      <section class="splash-hero">
        <div class="splash-hero-inner">
          <div class="splash-hero-copy">
            ${inviteNote}
            <h1 class="splash-headline">Surf. Earn. Play. Grow.</h1>
            <p class="splash-sub">
              A gamified traffic exchange where members earn traffic credits, complete sessions, unlock Hyper Spins,
              play mini-games, and build loyalty for future reward opportunities.
            </p>
            <div class="splash-cta-row">
              <button type="button" class="splash-btn splash-btn-primary" onclick="App.openPreLogin()">CREATE FREE ACCOUNT &gt;</button>
              <button type="button" class="splash-btn splash-btn-secondary" onclick="App.openPreLogin()">LOGIN</button>
            </div>
          </div>
          <div class="splash-hero-visual" aria-hidden="true">
            <div class="splash-orbit">
              <div class="splash-orbit-center">
                <img src="assets/images/logos/rx-icon.png" alt="" class="splash-orbit-logo" width="72" height="72" />
              </div>
              <span class="splash-hex splash-hex-1">SURF ADS</span>
              <span class="splash-hex splash-hex-2">EARN CREDITS</span>
              <span class="splash-hex splash-hex-3">PLAY GAMES</span>
              <span class="splash-hex splash-hex-4">BUILD LOYALTY</span>
              <span class="splash-hex splash-hex-5">UNLOCK REWARDS</span>
              <span class="splash-hex splash-hex-6">HYPER SPIN</span>
            </div>
          </div>
        </div>
      </section>

      <section class="splash-section">
        <h2 class="splash-section-title">What you can do</h2>
        <div class="splash-feature-grid">
          <article class="splash-card"><h3>VIEW ADS</h3><p>Earn traffic credits by viewing member campaigns.</p></article>
          <article class="splash-card"><h3>COMPLETE SESSIONS</h3><p>Surf 25 pages to complete a session and unlock Hyper Spin.</p></article>
          <article class="splash-card"><h3>PLAY MINI-GAMES</h3><p>Random mini-games can appear while surfing with bonus opportunities.</p></article>
          <article class="splash-card"><h3>BUILD LOYALTY</h3><p>Increase your Loyalty Score and climb tiers as you stay active.</p></article>
          <article class="splash-card"><h3>PROMOTE YOUR LINKS</h3><p>Add sites, text ads, and banner ads to get exposure.</p></article>
          <article class="splash-card"><h3>SPOTLIGHT BOOKING</h3><p>Use Premium RevCoins to book premium 24-hour Spotlight exposure.</p></article>
        </div>
      </section>

      <section class="splash-triple">
        <div class="splash-column splash-column-rules">
          <h3 class="splash-column-title">How it works</h3>
          <ol class="splash-num-list">
            <li>Create your free account.</li>
            <li>Surf ads and earn traffic credits.</li>
            <li>Complete sessions, play games, and build daily activity.</li>
            <li>Use credits, Premium RevCoins, and upgrades to grow your reach.</li>
          </ol>
        </div>
        <div class="splash-column splash-column-pool">
          <h3 class="splash-column-title">Loyalty reward pool</h3>
          <p class="splash-pool-copy">
            Activity-based rewards tied to pool health and platform rules. Caps and eligibility apply—
            <strong>up to 150% maximum reward cap</strong> references combined conditions, not a guarantee of payout.
          </p>
        </div>
        <div class="splash-column splash-column-coins">
          <h3 class="splash-column-title">Premium RevCoins</h3>
          <p class="splash-coins-copy">
            Buy Hyper Spins, activate activity boosts, boost traffic visibility, book Spotlight exposure, and unlock future features.
          </p>
        </div>
      </section>

      <section class="splash-bottom-cta">
        <h2 class="splash-bottom-title">Ready to start building traffic?</h2>
        <button type="button" class="splash-btn splash-btn-primary splash-btn-wide" onclick="App.openPreLogin()">CREATE FREE ACCOUNT &gt;</button>
      </section>

      <footer class="splash-footer">
        <div class="splash-footer-inner">
          <div class="splash-footer-brand">
            <img class="splash-footer-icon" src="assets/images/logos/rx-icon.png" alt="" width="32" height="32" />
            <span class="splash-footer-name">RTX</span>
          </div>
          <div class="splash-footer-links">
            <div>
              <div class="splash-footer-col-title">Company</div>
              <span class="splash-footer-fake">About Us</span>
              <span class="splash-footer-fake">Terms</span>
              <span class="splash-footer-fake">Privacy</span>
            </div>
            <div>
              <div class="splash-footer-col-title">Resources</div>
              <span class="splash-footer-fake">How It Works</span>
              <span class="splash-footer-fake">Knowledge Base</span>
              <span class="splash-footer-fake">Support</span>
            </div>
          </div>
          <div class="splash-footer-social" aria-label="Social placeholders">
            <span class="splash-soc" title="Facebook">f</span>
            <span class="splash-soc" title="Twitter">𝕏</span>
            <span class="splash-soc" title="YouTube">▶</span>
            <span class="splash-soc" title="Email">@</span>
          </div>
        </div>
        <p class="splash-copyright">© 2026 RevTrafficXchange. All rights reserved.</p>
      </footer>
    </div>
  `;
}
