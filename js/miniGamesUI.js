const MiniGameUI = {
  overlayId: "mg-overlay-root",
  onClose: null,

  removeOverlay() {
    const existing = document.getElementById(this.overlayId);
    if (existing) existing.remove();
  },

  render(config) {
    const opts = config && typeof config === "object" ? config : {};
    const title = String(opts.title || "Mini Challenge");
    const contentHTML = String(opts.contentHTML || "");
    const footerHTML = String(opts.footerHTML || "");
    const closeOnBackdropClick = opts.closeOnBackdropClick !== false;
    const themeClass = this.getThemeClass(title);
    this.onClose = typeof opts.onClose === "function" ? opts.onClose : null;

    // Internal re-render should not fire external onClose handlers.
    this.removeOverlay();

    const overlay = document.createElement("div");
    overlay.id = this.overlayId;
    overlay.className = `mg-overlay ${themeClass}`;
    overlay.innerHTML = `
      <div class="mg-card mg-glow-pulse ${themeClass}__card" role="dialog" aria-modal="true" aria-label="${this.escapeAttr(title)}">
        <div class="mg-header">
          <div class="mg-kicker">RevTrafficXchange Bonus</div>
          <h3 class="mg-title">${this.escapeHtml(title)}</h3>
        </div>
        <div class="mg-content">${contentHTML}</div>
        <div class="mg-footer">${footerHTML}</div>
      </div>
    `;

    const card = overlay.querySelector(".mg-card");
    if (card) {
      card.addEventListener("click", (event) => {
        event.stopPropagation();
      });
    }

    if (closeOnBackdropClick) {
      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) this.close();
      });
    }

    document.body.appendChild(overlay);
  },

  close() {
    this.removeOverlay();
    const cb = this.onClose;
    this.onClose = null;
    if (typeof cb === "function") cb();
  },

  getThemeClass(title) {
    const normalized = String(title || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    return `mg-theme-${normalized || "challenge"}`;
  },

  escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  },

  escapeAttr(value) {
    return this.escapeHtml(value).replace(/"/g, "&quot;");
  }
};

window.MiniGameUI = MiniGameUI;
