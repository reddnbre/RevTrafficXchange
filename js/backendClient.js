const RTXBackendClient = {
  config: {
    baseUrl: "",
    tokenStorageKey: "rtx_api_token_v1"
  },

  init() {
    const cfg =
      typeof window !== "undefined" && window.RTX_BACKEND_CONFIG && typeof window.RTX_BACKEND_CONFIG === "object"
        ? window.RTX_BACKEND_CONFIG
        : {};
    this.config.baseUrl = String(cfg.baseUrl || "").trim().replace(/\/+$/, "");
    if (cfg.tokenStorageKey) {
      this.config.tokenStorageKey = String(cfg.tokenStorageKey);
    }
  },

  isEnabled() {
    return Boolean(this.config.baseUrl);
  },

  getToken() {
    if (typeof localStorage === "undefined") return "";
    try {
      return String(localStorage.getItem(this.config.tokenStorageKey) || "");
    } catch (e) {
      return "";
    }
  },

  setToken(token) {
    if (typeof localStorage === "undefined") return;
    try {
      if (token) localStorage.setItem(this.config.tokenStorageKey, String(token));
      else localStorage.removeItem(this.config.tokenStorageKey);
    } catch (e) {
      /* ignore */
    }
  },

  async request(path, options) {
    if (!this.isEnabled()) {
      throw new Error("Backend is not configured");
    }
    const token = this.getToken();
    const headers = Object.assign(
      { "Content-Type": "application/json" },
      options && options.headers ? options.headers : {}
    );
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${this.config.baseUrl}${path}`, Object.assign({}, options || {}, { headers }));
    let body = null;
    try {
      body = await res.json();
    } catch (e) {
      body = null;
    }
    if (!res.ok) {
      const message = body && body.error ? String(body.error) : `Backend request failed (${res.status})`;
      throw new Error(message);
    }
    return body;
  },

  async login(payload) {
    const body = await this.request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload || {})
    });
    if (body && body.token) {
      this.setToken(String(body.token));
    }
    return body;
  },

  async saveState(state) {
    return this.request("/api/me/state", {
      method: "PUT",
      body: JSON.stringify({ state })
    });
  },

  async createCheckout(productKey) {
    return this.request("/api/payments/checkout", {
      method: "POST",
      body: JSON.stringify({ productKey: String(productKey || "") })
    });
  },

  async logout() {
    try {
      await this.request("/api/auth/logout", { method: "POST", body: "{}" });
    } catch (e) {
      /* ignore transport errors on logout */
    }
    this.setToken("");
  }
};

RTXBackendClient.init();
window.RTXBackendClient = RTXBackendClient;
