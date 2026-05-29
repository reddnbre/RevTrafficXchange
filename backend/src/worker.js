function json(data, init) {
  return new Response(JSON.stringify(data), {
    status: (init && init.status) || 200,
    headers: Object.assign(
      {
        "content-type": "application/json; charset=utf-8"
      },
      (init && init.headers) || {}
    )
  });
}

function withCors(req, res) {
  const origin = req.headers.get("Origin") || "*";
  const headers = new Headers(res.headers);
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  headers.set("Vary", "Origin");
  return new Response(res.body, { status: res.status, headers });
}

function parseStripeSignature(header) {
  const raw = String(header || "");
  const parts = raw.split(",").map((p) => p.trim());
  let ts = "";
  let v1 = "";
  for (const part of parts) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    const k = part.slice(0, idx);
    const v = part.slice(idx + 1);
    if (k === "t") ts = v;
    if (k === "v1") v1 = v;
  }
  return { ts, v1 };
}

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256Hex(secret, payload) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return toHex(sig);
}

function constantTimeEqualHex(a, b) {
  const x = String(a || "");
  const y = String(b || "");
  if (x.length !== y.length) return false;
  let mismatch = 0;
  for (let i = 0; i < x.length; i += 1) {
    mismatch |= x.charCodeAt(i) ^ y.charCodeAt(i);
  }
  return mismatch === 0;
}

function normalizeEmail(raw) {
  return String(raw || "").trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function nowIso() {
  return new Date().toISOString();
}

function plusDaysIso(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

async function parseJson(req) {
  try {
    return await req.json();
  } catch (e) {
    return {};
  }
}

function safeParseJson(raw, fallback) {
  try {
    return JSON.parse(raw || "");
  } catch (e) {
    return fallback;
  }
}

function tokenFromAuth(req) {
  const auth = String(req.headers.get("Authorization") || "");
  if (!auth.toLowerCase().startsWith("bearer ")) return "";
  return auth.slice(7).trim();
}

function randomId(prefix) {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${prefix}_${hex}`;
}

const PRODUCT_CATALOG = {
  membership_pro_monthly: {
    mode: "subscription",
    type: "membership",
    membershipTier: "upgraded",
    priceEnvKey: "STRIPE_PRICE_MEMBERSHIP_PRO_MONTHLY"
  },
  revcoins_50: {
    mode: "payment",
    type: "credits",
    creditsAmount: 50,
    priceEnvKey: "STRIPE_PRICE_REVCOINS_50"
  },
  revcoins_120: {
    mode: "payment",
    type: "credits",
    creditsAmount: 120,
    priceEnvKey: "STRIPE_PRICE_REVCOINS_120"
  },
  revcoins_260: {
    mode: "payment",
    type: "credits",
    creditsAmount: 260,
    priceEnvKey: "STRIPE_PRICE_REVCOINS_260"
  },
  revcoins_700: {
    mode: "payment",
    type: "credits",
    creditsAmount: 700,
    priceEnvKey: "STRIPE_PRICE_REVCOINS_700"
  },
  credits_1000_pack: {
    mode: "payment",
    type: "credits",
    creditsAmount: 1000,
    priceEnvKey: "STRIPE_PRICE_CREDITS_1000_PACK"
  }
};

async function getSessionUser(env, token) {
  if (!token) return null;
  const row = await env.DB.prepare(
    `SELECT u.id, u.email, u.username, u.state_json
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = ? AND s.expires_at > ?`
  )
    .bind(token, nowIso())
    .first();
  return row || null;
}

async function handleLogin(req, env) {
  const body = await parseJson(req);
  const email = normalizeEmail(body.email);
  const username = String(body.username || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 24);

  if (!isValidEmail(email)) {
    return json({ error: "Invalid email" }, { status: 400 });
  }

  const now = nowIso();
  const userId = `user_${email}`;
  const initialState = body && body.initialState && typeof body.initialState === "object" ? body.initialState : {};
  const initialStateJson = JSON.stringify(Object.assign({}, initialState, { id: userId, username: username || initialState.username || "" }));
  await env.DB.prepare(
    `INSERT INTO users (id, email, username, state_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(email) DO UPDATE SET
       username = CASE WHEN excluded.username = '' THEN users.username ELSE excluded.username END,
       updated_at = excluded.updated_at`
  )
    .bind(userId, email, username, initialStateJson, now, now)
    .run();

  const user = await env.DB.prepare("SELECT id, email, username, state_json FROM users WHERE email = ?").bind(email).first();
  const token = randomId("sess");
  await env.DB.prepare("INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)")
    .bind(token, user.id, now, plusDaysIso(30))
    .run();

  const state = safeParseJson(user.state_json, {});
  return json({ token, user: { id: user.id, email: user.email, username: user.username || "" }, state });
}

async function handleMe(req, env) {
  const token = tokenFromAuth(req);
  const user = await getSessionUser(env, token);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  const state = safeParseJson(user.state_json, {});
  return json({ user: { id: user.id, email: user.email, username: user.username || "" }, state });
}

async function handleStateSave(req, env) {
  const token = tokenFromAuth(req);
  const user = await getSessionUser(env, token);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  const body = await parseJson(req);
  const state = body && body.state && typeof body.state === "object" ? body.state : {};
  state.id = user.id;
  await env.DB.prepare("UPDATE users SET state_json = ?, updated_at = ? WHERE id = ?")
    .bind(JSON.stringify(state), nowIso(), user.id)
    .run();
  return json({ ok: true });
}

async function handleLogout(req, env) {
  const token = tokenFromAuth(req);
  if (token) {
    await env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
  }
  return json({ ok: true });
}

function publicAdFromState(user, kind, ad, index) {
  if (!ad || !ad.active || !String(ad.targetUrl || "").trim()) return null;
  if (kind === "banner" && !String(ad.imageUrl || "").trim()) return null;
  const allocated = Math.max(0, Number(ad.allocatedViews) || 0);
  const used = Math.max(0, Number(ad[kind === "banner" ? "impressions" : "views"]) || 0);
  if (allocated && used >= allocated) return null;
  return {
    id: String(ad.id || `${kind}-${index}`),
    ownerId: String(ad.ownerId || user.id),
    kind,
    title: String(ad.title || (kind === "banner" ? "Member Banner" : "Member Text Ad")),
    description: String(ad.description || "Member promotion in the surf exchange"),
    targetUrl: String(ad.targetUrl || ""),
    imageUrl: String(ad.imageUrl || ""),
    remainingViews: allocated ? Math.max(0, allocated - used) : null,
    isRemoteExchangeAd: true
  };
}

async function handleExchangeAds(env) {
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
  return json({ textAds, bannerAds, generatedAt: nowIso() });
}

function applyExchangeAdEvent(state, kind, adId) {
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

async function handleExchangeAdEvent(req, env) {
  const token = tokenFromAuth(req);
  const viewer = await getSessionUser(env, token);
  const body = await parseJson(req);
  const kind = body.kind === "banner" ? "banner" : "text";
  const ownerId = String(body.ownerId || "").trim();
  const adId = String(body.adId || "").trim();
  const eventType = body.eventType === "impression" ? "impression" : "click";
  if (!ownerId || !adId) return json({ error: "Missing ad reference" }, { status: 400 });

  const owner = await env.DB.prepare("SELECT id, state_json FROM users WHERE id = ?").bind(ownerId).first();
  if (!owner) return json({ error: "Ad owner not found" }, { status: 404 });

  const state = safeParseJson(owner.state_json, {});
  const applied = applyExchangeAdEvent(state, kind, adId);
  if (applied.changed) {
    await env.DB.prepare("UPDATE users SET state_json = ?, updated_at = ? WHERE id = ?")
      .bind(JSON.stringify(applied.state), nowIso(), owner.id)
      .run();
  }
  await env.DB.prepare(
    "INSERT INTO ad_events (ad_kind, owner_id, ad_id, event_type, viewer_id, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  )
    .bind(kind, ownerId, adId, eventType, viewer ? viewer.id : null, nowIso())
    .run();
  return json({ ok: true, counted: applied.changed });
}

async function fetchStripeJson(env, path, paramsObj) {
  const body = new URLSearchParams(paramsObj || {}).toString();
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = data && data.error && data.error.message ? data.error.message : `Stripe error (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

async function handleCreateCheckout(req, env) {
  const token = tokenFromAuth(req);
  const user = await getSessionUser(env, token);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  if (!env.STRIPE_SECRET_KEY) return json({ error: "Stripe is not configured" }, { status: 500 });

  const body = await parseJson(req);
  const productKey = String(body.productKey || "");
  const product = PRODUCT_CATALOG[productKey];
  if (!product) return json({ error: "Unknown productKey" }, { status: 400 });

  const priceId = String(env[product.priceEnvKey] || "").trim();
  if (!priceId) return json({ error: `Missing env: ${product.priceEnvKey}` }, { status: 500 });

  const baseUrl = String(env.APP_BASE_URL || "").trim() || "https://revtrafficxchange.com";
  const successUrl = `${baseUrl}/?billing=success`;
  const cancelUrl = `${baseUrl}/?billing=cancelled`;

  const metadata = {
    user_id: String(user.id),
    product_key: productKey,
    purchase_type: product.type
  };
  if (product.creditsAmount) metadata.credits_amount = String(product.creditsAmount);
  if (product.membershipTier) metadata.membership_tier = String(product.membershipTier);

  const params = {
    mode: product.mode,
    success_url: successUrl,
    cancel_url: cancelUrl,
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": "1",
    client_reference_id: String(user.id),
    "metadata[user_id]": metadata.user_id,
    "metadata[product_key]": metadata.product_key,
    "metadata[purchase_type]": metadata.purchase_type
  };
  if (metadata.credits_amount) params["metadata[credits_amount]"] = metadata.credits_amount;
  if (metadata.membership_tier) params["metadata[membership_tier]"] = metadata.membership_tier;

  const session = await fetchStripeJson(env, "/checkout/sessions", params);
  const now = nowIso();
  await env.DB.prepare(
    `INSERT INTO purchases (
      id, user_id, stripe_checkout_session_id, stripe_payment_intent_id, product_key, amount_cents, currency, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    ON CONFLICT(stripe_checkout_session_id) DO UPDATE SET
      stripe_payment_intent_id = excluded.stripe_payment_intent_id,
      updated_at = excluded.updated_at`
  )
    .bind(
      randomId("purchase"),
      user.id,
      String(session.id || ""),
      String(session.payment_intent || ""),
      productKey,
      Number(session.amount_total || 0),
      String(session.currency || "usd"),
      now,
      now
    )
    .run();

  return json({ checkoutUrl: session.url, sessionId: session.id });
}

async function applyFulfillmentForCheckoutSession(env, checkoutSession) {
  const sessionId = String(checkoutSession && checkoutSession.id ? checkoutSession.id : "");
  if (!sessionId) return;
  const metadata = checkoutSession && checkoutSession.metadata ? checkoutSession.metadata : {};
  const userId = String(metadata.user_id || checkoutSession.client_reference_id || "");
  if (!userId) return;
  const productKey = String(metadata.product_key || "");
  const purchaseType = String(metadata.purchase_type || "");
  const membershipTier = String(metadata.membership_tier || "");
  const creditsAmount = Math.max(0, Number(metadata.credits_amount || 0));
  const amountCents = Math.max(0, Number(checkoutSession.amount_total || 0));
  const currency = String(checkoutSession.currency || "usd");
  const now = nowIso();

  const user = await env.DB.prepare("SELECT id, state_json FROM users WHERE id = ?").bind(userId).first();
  if (!user) return;

  const state = safeParseJson(user.state_json, {});

  if (purchaseType === "credits" && creditsAmount > 0) {
    state.credits = Math.max(0, Number(state.credits) || 0) + creditsAmount;
  }
  if (purchaseType === "membership" && membershipTier) {
    state.membershipLevel = membershipTier;
    state.isPaid = membershipTier !== "free";
  }
  state.qualifiedSpend = Math.max(0, Number(state.qualifiedSpend) || 0) + amountCents / 100;

  await env.DB.batch([
    env.DB.prepare("UPDATE users SET state_json = ?, updated_at = ? WHERE id = ?").bind(JSON.stringify(state), now, userId),
    env.DB.prepare(
      `UPDATE purchases
       SET status = 'fulfilled', fulfilled_at = ?, updated_at = ?, amount_cents = ?, currency = ?, product_key = COALESCE(NULLIF(product_key, ''), ?)
       WHERE stripe_checkout_session_id = ?`
    ).bind(now, now, amountCents, currency, productKey, sessionId)
  ]);
}

async function handleStripeWebhook(req, env) {
  if (!env.STRIPE_WEBHOOK_SECRET) return json({ error: "Webhook secret missing" }, { status: 500 });

  const signature = req.headers.get("Stripe-Signature");
  const { ts, v1 } = parseStripeSignature(signature);
  if (!ts || !v1) return json({ error: "Invalid signature header" }, { status: 400 });

  const rawBody = await req.text();
  const signedPayload = `${ts}.${rawBody}`;
  const expected = await hmacSha256Hex(env.STRIPE_WEBHOOK_SECRET, signedPayload);
  if (!constantTimeEqualHex(expected, v1)) {
    return json({ error: "Invalid signature" }, { status: 400 });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch (e) {
    return json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const eventId = String(event && event.id ? event.id : "");
  const eventType = String(event && event.type ? event.type : "");
  if (!eventId || !eventType) return json({ error: "Invalid event payload" }, { status: 400 });

  const already = await env.DB.prepare("SELECT event_id FROM stripe_events WHERE event_id = ?").bind(eventId).first();
  if (already) return json({ ok: true, duplicate: true });

  if (eventType === "checkout.session.completed") {
    const checkoutSession = event && event.data && event.data.object ? event.data.object : null;
    if (checkoutSession) {
      await applyFulfillmentForCheckoutSession(env, checkoutSession);
    }
  }

  await env.DB.prepare("INSERT INTO stripe_events (event_id, event_type, processed_at) VALUES (?, ?, ?)")
    .bind(eventId, eventType, nowIso())
    .run();
  return json({ ok: true });
}

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") {
      return withCors(req, new Response(null, { status: 204 }));
    }

    const url = new URL(req.url);
    let res;

    if (req.method === "GET" && (url.pathname === "/health" || url.pathname === "/api/health")) {
      res = json({ ok: true, service: "revtrafficxchange-api" });
      return withCors(req, res);
    }
    if (req.method === "POST" && url.pathname === "/api/auth/login") {
      res = await handleLogin(req, env);
      return withCors(req, res);
    }
    if (req.method === "POST" && url.pathname === "/api/auth/logout") {
      res = await handleLogout(req, env);
      return withCors(req, res);
    }
    if (req.method === "GET" && (url.pathname === "/api/me" || url.pathname === "/api/me/state")) {
      res = await handleMe(req, env);
      return withCors(req, res);
    }
    if (req.method === "PUT" && url.pathname === "/api/me/state") {
      res = await handleStateSave(req, env);
      return withCors(req, res);
    }
    if (req.method === "GET" && url.pathname === "/api/exchange/ads") {
      res = await handleExchangeAds(env);
      return withCors(req, res);
    }
    if (req.method === "POST" && url.pathname === "/api/exchange/ad-event") {
      res = await handleExchangeAdEvent(req, env);
      return withCors(req, res);
    }
    if (req.method === "POST" && url.pathname === "/api/payments/checkout") {
      res = await handleCreateCheckout(req, env);
      return withCors(req, res);
    }
    if (req.method === "POST" && url.pathname === "/api/payments/webhook/stripe") {
      res = await handleStripeWebhook(req, env);
      return withCors(req, res);
    }

    res = json({ error: "Not found" }, { status: 404 });
    return withCors(req, res);
  }
};
