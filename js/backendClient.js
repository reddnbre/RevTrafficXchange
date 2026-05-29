const RTXBackendClient = {
  config: {
    enabled: false,
    baseUrl: "",
    tokenStorageKey: "rtx_api_token_v1"
  },

  init() {
    const cfg =
      typeof window !== "undefined" && window.RTX_BACKEND_CONFIG && typeof window.RTX_BACKEND_CONFIG === "object"
        ? window.RTX_BACKEND_CONFIG
        : {};
    this.config.enabled = Boolean(cfg.enabled);
    this.config.baseUrl = String(cfg.baseUrl || "").trim().replace(/\/+$/, "");
    if (cfg.tokenStorageKey) {
      this.config.tokenStorageKey = String(cfg.tokenStorageKey);
    }
  },

  isEnabled() {
    return Boolean(this.config.enabled || this.config.baseUrl);
  },

  buildUrl(path) {
    const cleanPath = String(path || "").startsWith("/") ? String(path || "") : `/${path}`;
    return `${this.config.baseUrl}${cleanPath}`;
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
    const res = await fetch(this.buildUrl(path), Object.assign({}, options || {}, { headers }));
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
    const currentState = typeof RTXState !== "undefined" && RTXState.user ? RTXState.user : null;
    const body = await this.request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(Object.assign({ initialState: currentState }, payload || {}))
    });
    if (body && body.token) {
      this.setToken(String(body.token));
    }
    return body;
  },

  async getState() {
    return this.request("/api/me/state", { method: "GET" });
  },

  async saveState(state) {
    return this.request("/api/me/state", {
      method: "PUT",
      body: JSON.stringify({ state })
    });
  },

  async getExchangeAds() {
    return this.request("/api/exchange/ads", { method: "GET" });
  },

  async trackExchangeAdEvent(payload) {
    return this.request("/api/exchange/ad-event", {
      method: "POST",
      body: JSON.stringify(payload || {})
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
