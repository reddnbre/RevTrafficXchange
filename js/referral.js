/**
 * Referral links: ?ref=username on the public splash. Pending ref is stored in sessionStorage
 * until a new member completes local sign-in, then copied to user.referredByUsername once.
 */
(function referralModule() {
  const STORAGE_KEY = "rtx_pending_ref_v1";

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
   * Shareable landing URL for the current origin/path (directory of index.html when applicable).
   */
  function buildLandingUrlForRef(username) {
    const u = sanitizeHandle(username);
    if (!isValidHandle(u)) return "";
    try {
      const url = new URL(window.location.href);
      url.hash = "";
      url.search = "";
      let path = url.pathname;
      if (/[^/]+\.html$/i.test(path)) {
        url.pathname = path.replace(/[^/]+\.html$/i, "");
      }
      if (!url.pathname.endsWith("/")) {
        url.pathname += "/";
      }
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
