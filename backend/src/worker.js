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
  await env.DB.prepare(
    `INSERT INTO users (id, email, username, state_json, created_at, updated_at)
     VALUES (?, ?, ?, '{}', ?, ?)
     ON CONFLICT(email) DO UPDATE SET
       username = CASE WHEN excluded.username = '' THEN users.username ELSE excluded.username END,
       updated_at = excluded.updated_at`
  )
    .bind(userId, email, username, now, now)
    .run();

  const user = await env.DB.prepare("SELECT id, email, username, state_json FROM users WHERE email = ?").bind(email).first();
  const token = randomId("sess");
  await env.DB.prepare("INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)")
    .bind(token, user.id, now, plusDaysIso(30))
    .run();

  let state = {};
  try {
    state = user.state_json ? JSON.parse(user.state_json) : {};
  } catch (e) {
    state = {};
  }
  return json({ token, user: { id: user.id, email: user.email, username: user.username || "" }, state });
}

async function handleMe(req, env) {
  const token = tokenFromAuth(req);
  const user = await getSessionUser(env, token);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  let state = {};
  try {
    state = user.state_json ? JSON.parse(user.state_json) : {};
  } catch (e) {
    state = {};
  }
  return json({ user: { id: user.id, email: user.email, username: user.username || "" }, state });
}

async function handleStateSave(req, env) {
  const token = tokenFromAuth(req);
  const user = await getSessionUser(env, token);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  const body = await parseJson(req);
  const state = body && body.state && typeof body.state === "object" ? body.state : {};
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

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") {
      return withCors(req, new Response(null, { status: 204 }));
    }

    const url = new URL(req.url);
    let res;

    if (req.method === "GET" && url.pathname === "/health") {
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
    if (req.method === "GET" && url.pathname === "/api/me") {
      res = await handleMe(req, env);
      return withCors(req, res);
    }
    if (req.method === "PUT" && url.pathname === "/api/me/state") {
      res = await handleStateSave(req, env);
      return withCors(req, res);
    }

    res = json({ error: "Not found" }, { status: 404 });
    return withCors(req, res);
  }
};
