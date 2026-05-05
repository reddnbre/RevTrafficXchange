/**
 * Referral links: ?ref=username on the public splash. Pending ref is stored in sessionStorage
 * until a new member completes local sign-in, then copied to user.referredByUsername once.
 */
(function referralModule() {
  const STORAGE_KEY = "rtx_pending_ref_v1";

  /**
   * Default share target (custom domain on GitHub Pages).
   * Override: set window.RTX_PUBLIC_BASE_URL before scripts load.
   * Until DNS is live, you can temporarily set it to https://reddnbre.github.io/RevTrafficXchange/
   */
  const DEFAULT_PUBLIC_BASE = "https://revtrafficxchange.com/";

  function sanitizeHandle(raw) {
    return String(raw || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 24);
  }

  function isValidHandle(h) {
    return /^[a-z0-9_]{3,24}$/.test(h);
  }

  function captureFromUrl() {
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = sanitizeHandle(params.get("ref") || "");
      if (!ref || !isValidHandle(ref)) return;
      sessionStorage.setItem(STORAGE_KEY, ref);
    } catch (e) {
      /* private mode / blocked */
    }
  }

  function peekPendingReferral() {
    try {
      const v = sanitizeHandle(sessionStorage.getItem(STORAGE_KEY) || "");
      return isValidHandle(v) ? v : "";
    } catch (e) {
      return "";
    }
  }

  function clearPendingReferral() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      /* ignore */
    }
  }

  /**
   * Shareable landing URL for recruits (canonical public site + ?ref=).
   * Uses RTX_PUBLIC_BASE_URL if set, else the GitHub Pages deployment URL (not file:// or localhost).
   */
  function buildLandingUrlForRef(username) {
    const u = sanitizeHandle(username);
    if (!isValidHandle(u)) return "";
    const rawBase =
      typeof window !== "undefined" && window.RTX_PUBLIC_BASE_URL
        ? String(window.RTX_PUBLIC_BASE_URL).trim()
        : DEFAULT_PUBLIC_BASE;
    let base = rawBase.replace(/\/?$/, "/");
    if (!/^https?:\/\//i.test(base)) {
      base = DEFAULT_PUBLIC_BASE;
    }
    try {
      const url = new URL(base);
      url.hash = "";
      url.search = "";
      url.searchParams.set("ref", u);
      return url.toString();
    } catch (e) {
      return "";
    }
  }

  window.RTXReferral = {
    captureFromUrl,
    peekPendingReferral,
    clearPendingReferral,
    buildLandingUrlForRef,
    sanitizeHandle,
    isValidHandle
  };
})();
