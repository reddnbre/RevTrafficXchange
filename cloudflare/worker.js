const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const MAX_STATE_BYTES = 180000;

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
      ...extraHeaders
    }
  });
}

function cleanEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function cleanUsername(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 24);
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ""));
}

function safeParseJson(value, fallback) {
  try {
    return JSON.parse(value);
  } catch (e) {
    return fallback;
  }
}

function b64(bytes) {
  let out = "";
  const arr = new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i += 1) out += String.fromCharCode(arr[i]);
  return btoa(out);
}

function randomString(bytes = 32) {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return b64(buf).replace(/[^a-zA-Z0-9]/g, "").slice(0, bytes * 2);
}

async function hashPassword(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(String(password)), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: enc.encode(String(salt)), iterations: 120000, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return b64(bits);
}

function authToken(request) {
  const h = request.headers.get("Authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : "";
}

async function getSessionUser(env, request) {
  const token = authToken(request);
  if (!token) return null;
  const now = Date.now();
  const row = await env.DB.prepare(
    "SELECT users.* FROM sessions JOIN users ON sessions.user_id = users.id WHERE sessions.token = ? AND sessions.expires_at > ?"
  )
    .bind(token, now)
    .first();
  return row || null;
}

function publicAdFromState(user, kind, ad, index) {
  const id = String(ad && ad.id ? ad.id : `${kind}-${index}`);
  const ownerId = String(ad && ad.ownerId ? ad.ownerId : user.id);
  const title = String(ad && ad.title ? ad.title : kind === "banner" ? "Member Banner" : "Member Text Ad");
  const allocated = Math.max(0, Number(ad && ad.allocatedViews) || 0);
  const used = Math.max(0, Number(ad && (kind === "banner" ? ad.impressions : ad.views)) || 0);
  if (allocated && used >= allocated) return null;
  if (!ad || !ad.active || !String(ad.targetUrl || "").trim()) return null;
  if (kind === "banner" && !String(ad.imageUrl || "").trim()) return null;
  return {
    id,
    ownerId,
    kind,
    title,
    description: String(ad.description || "Member promotion in the surf exchange"),
    targetUrl: String(ad.targetUrl || ""),
    imageUrl: String(ad.imageUrl || ""),
    remainingViews: allocated ? Math.max(0, allocated - used) : null,
    isRemoteExchangeAd: true
  };
}

async function listExchangeAds(env) {
  const rows = await env.DB.prepare("SELECT id, state_json FROM users ORDER BY updated_at DESC LIMIT 500").all();
  const textAds = [];
  const bannerAds = [];
  (rows.results || []).forEach((user) => {
    const state = safeParseJson(user.state_json, {});
    const campaigns = state && state.memberCampaigns ? state.memberCampaigns : {};
    (Array.isArray(campaigns.textAds) ? campaigns.textAds : []).forEach((ad, index) => {
      const item = publicAdFromState(user, "text", ad, index);
      if (item) textAds.push(item);
    });
    (Array.isArray(campaigns.bannerAds) ? campaigns.bannerAds : []).forEach((ad, index) => {
      const item = publicAdFromState(user, "banner", ad, index);
      if (item) bannerAds.push(item);
    });
  });
  return { textAds, bannerAds, generatedAt: Date.now() };
}

function applyAdEventToState(state, kind, adId) {
  const campaigns = state && state.memberCampaigns ? state.memberCampaigns : null;
  if (!campaigns) return { state, changed: false };
  const key = kind === "banner" ? "bannerAds" : "textAds";
  const usedKey = kind === "banner" ? "impressions" : "views";
  const source = Array.isArray(campaigns[key]) ? campaigns[key] : [];
  let changed = false;
  campaigns[key] = source.map((ad, index) => {
    const currentId = String(ad && ad.id ? ad.id : `${kind}-${index}`);
    if (currentId !== String(adId)) return ad;
    changed = true;
    return {
      ...ad,
      clicks: Math.max(0, Number(ad.clicks) || 0) + 1,
      [usedKey]: Math.max(0, Number(ad[usedKey]) || 0) + 1
    };
  });
  state.memberCampaigns = campaigns;
  return { state, changed };
}

async function handleLogin(env, request) {
  const body = await request.json().catch(() => ({}));
  const email = cleanEmail(body.email);
  const password = String(body.password || "");
  const username = cleanUsername(body.username);
  if (!isEmail(email)) return json({ error: "Enter a valid email." }, 400);
  if (password.length < 6) return json({ error: "Password must be at least 6 characters." }, 400);

  const now = Date.now();
  let user = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
  if (user) {
    const expected = await hashPassword(password, user.password_salt);
    if (expected !== user.password_hash) return json({ error: "Invalid email or password." }, 401);
    if (username && username !== user.username) {
      await env.DB.prepare("UPDATE users SET username = ?, updated_at = ? WHERE id = ?").bind(username, now, user.id).run();
      user.username = username;
    }
  } else {
    const id = crypto.randomUUID();
    const salt = randomString(18);
    const passwordHash = await hashPassword(password, salt);
    const initialState = body.initialState && typeof body.initialState === "object" ? body.initialState : {};
    initialState.id = id;
    initialState.username = username || initialState.username || "";
    const stateJson = JSON.stringify(initialState);
    if (stateJson.length > MAX_STATE_BYTES) return json({ error: "Account state is too large." }, 413);
    await env.DB.prepare(
      "INSERT INTO users (id, email, username, password_salt, password_hash, state_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
      .bind(id, email, username, salt, passwordHash, stateJson, now, now)
      .run();
    user = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(id).first();
  }

  const token = randomString(48);
  await env.DB.prepare("INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)")
    .bind(token, user.id, now + TOKEN_TTL_MS, now)
    .run();

  return json({ token, user: { id: user.id, email: user.email, username: user.username || "" }, state: safeParseJson(user.state_json, {}) });
}

async function handleSaveState(env, request, user) {
  if (!user) return json({ error: "Not authenticated." }, 401);
  const body = await request.json().catch(() => ({}));
  const state = body && body.state && typeof body.state === "object" ? body.state : null;
  if (!state) return json({ error: "Missing state." }, 400);
  state.id = user.id;
  state.username = state.username || user.username || "";
  const stateJson = JSON.stringify(state);
  if (stateJson.length > MAX_STATE_BYTES) return json({ error: "Account state is too large." }, 413);
  await env.DB.prepare("UPDATE users SET username = ?, state_json = ?, updated_at = ? WHERE id = ?")
    .bind(cleanUsername(state.username), stateJson, Date.now(), user.id)
    .run();
  return json({ ok: true });
}

async function handleAdEvent(env, request, user) {
  const body = await request.json().catch(() => ({}));
  const kind = body.kind === "banner" ? "banner" : "text";
  const eventType = body.eventType === "impression" ? "impression" : "click";
  const ownerId = String(body.ownerId || "").trim();
  const adId = String(body.adId || "").trim();
  if (!ownerId || !adId) return json({ error: "Missing ad reference." }, 400);

  const owner = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(ownerId).first();
  if (!owner) return json({ error: "Ad owner not found." }, 404);
  const state = safeParseJson(owner.state_json, {});
  const applied = applyAdEventToState(state, kind, adId);
  if (applied.changed) {
    await env.DB.prepare("UPDATE users SET state_json = ?, updated_at = ? WHERE id = ?")
      .bind(JSON.stringify(applied.state), Date.now(), owner.id)
      .run();
  }
  await env.DB.prepare(
    "INSERT INTO ad_events (ad_kind, owner_id, ad_id, event_type, viewer_id, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  )
    .bind(kind, ownerId, adId, eventType, user ? user.id : null, Date.now())
    .run();
  return json({ ok: true, counted: applied.changed });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return json({ ok: true });
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (!env.DB) return json({ error: "D1 binding DB is not configured." }, 500);
      if (path === "/api/health") return json({ ok: true, service: "RevTrafficXchange API" });
      if (path === "/api/auth/login" && request.method === "POST") return handleLogin(env, request);

      const user = await getSessionUser(env, request);
      if (path === "/api/me/state" && request.method === "GET") {
        if (!user) return json({ error: "Not authenticated." }, 401);
        return json({ state: safeParseJson(user.state_json, {}) });
      }
      if (path === "/api/me/state" && request.method === "PUT") return handleSaveState(env, request, user);
      if (path === "/api/auth/logout" && request.method === "POST") {
        const token = authToken(request);
        if (token) await env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
        return json({ ok: true });
      }
      if (path === "/api/exchange/ads" && request.method === "GET") return json(await listExchangeAds(env));
      if (path === "/api/exchange/ad-event" && request.method === "POST") return handleAdEvent(env, request, user);

      return json({ error: "Not found." }, 404);
    } catch (e) {
      return json({ error: e && e.message ? e.message : "Server error." }, 500);
    }
  }
};
