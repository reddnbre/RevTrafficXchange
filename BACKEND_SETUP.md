# Backend Setup (Cloudflare Worker + D1)

This project has an optional Cloudflare backend so RevTrafficXchange can move beyond browser-only localStorage.

## What This Backend Handles

- Member login/session tokens
- Shared user state across browsers
- Shared surf text/banner ad inventory
- Shared ad click/impression event tracking
- Stripe checkout/webhook foundation already present in the Worker

## Files

- `backend/src/worker.js` - Cloudflare Worker API
- `backend/schema.sql` - D1 tables
- `backend/wrangler.toml` - Worker/D1/Stripe config
- `js/backendConfig.js` - frontend backend switch
- `js/backendClient.js` - frontend API client

## 1. Install Wrangler

```bash
npm install -g wrangler
```

## 2. Login To Cloudflare

```bash
wrangler login
```

## 3. Create Or Confirm D1

If you already created the D1 database shown in `backend/wrangler.toml`, keep it.

If starting fresh:

```bash
cd backend
wrangler d1 create revtrafficxchange
```

Copy the returned `database_id` into `backend/wrangler.toml`.

## 4. Apply Schema

From the `backend` folder:

```bash
wrangler d1 execute revtrafficxchange --file=schema.sql
```

Run this again after pulling updates; `CREATE TABLE IF NOT EXISTS` is safe for existing tables.

## 5. Deploy API

From the `backend` folder:

```bash
wrangler deploy
```

Your Worker URL will look like:

```text
https://revtrafficxchange-api.<your-cloudflare-subdomain>.workers.dev
```

## 6. Connect Frontend

Edit `js/backendConfig.js`.

For a `workers.dev` API:

```js
window.RTX_BACKEND_CONFIG = {
  enabled: true,
  baseUrl: "https://revtrafficxchange-api.<your-cloudflare-subdomain>.workers.dev",
  tokenStorageKey: "rtx_api_token_v1"
};
```

If the Worker is routed on the same domain as `/api/*`:

```js
window.RTX_BACKEND_CONFIG = {
  enabled: true,
  baseUrl: "",
  tokenStorageKey: "rtx_api_token_v1"
};
```

## Current API Endpoints

- `GET /health`
- `GET /api/health`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/me`
- `GET /api/me/state`
- `PUT /api/me/state`
- `GET /api/exchange/ads`
- `POST /api/exchange/ad-event`
- `POST /api/payments/checkout`
- `POST /api/payments/webhook/stripe`

## Shared Ad Exchange Flow

1. Member signs in with backend enabled.
2. Member creates/updates surf sites, text ads, or banner ads.
3. Frontend saves state to `/api/me/state`.
4. Surf page fetches `/api/exchange/ads`.
5. Rotating surf text/banner ads use the shared ad pool.
6. Clicks are sent to `/api/exchange/ad-event`.

## Important Launch Notes

- This is enough for a real early beta, not yet a hardened paid-traffic launch.
- Password validation is still demo-light; strengthen auth before scaling.
- Add rate limits/abuse controls before opening heavy traffic.
- Stripe config can stay disabled until you are ready for payments.
