# Backend Setup (Cloudflare Worker + D1)

This project can now run with an optional backend API while keeping the current frontend.

## 1) Install Wrangler

```bash
npm i -g wrangler
```

## 2) Create D1 database

From repo root:

```bash
cd backend
wrangler d1 create revtrafficxchange
```

Copy the returned `database_id` into `backend/wrangler.toml`.

## 3) Apply schema

```bash
wrangler d1 execute revtrafficxchange --file=schema.sql
```

## 4) Deploy API

```bash
wrangler deploy
```

Note your Worker URL, for example:

`https://revtrafficxchange-api.<account>.workers.dev`

## 5) Connect frontend to API

Add this script block in `index.html` before `js/backendClient.js`:

```html
<script>
  window.RTX_BACKEND_CONFIG = {
    baseUrl: "https://revtrafficxchange-api.<account>.workers.dev"
  };
</script>
```

If `baseUrl` is missing, frontend stays in local-only mode.

## Current API endpoints

- `GET /health`
- `POST /api/auth/login` with `{ email, password, username }`
- `POST /api/auth/logout`
- `GET /api/me` (Bearer token)
- `PUT /api/me/state` with `{ state }` (Bearer token)
- `POST /api/payments/checkout` with `{ productKey }` (Bearer token)
- `POST /api/payments/webhook/stripe` (Stripe webhook endpoint)

## Notes

- Password is accepted for compatibility but not validated yet (demo auth model).
- User app state is saved as JSON in `users.state_json`.
- Stripe checkout fulfillment now writes to DB and updates user state (`credits`, `membershipLevel`, `isPaid`, `qualifiedSpend`) from webhook events.

## Stripe setup

1) Set Worker secrets:

```bash
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET
```

2) Add Stripe Price IDs as vars in `backend/wrangler.toml`:

- `STRIPE_PRICE_MEMBERSHIP_PRO_MONTHLY`
- `STRIPE_PRICE_REVCOINS_50`
- `STRIPE_PRICE_REVCOINS_120`
- `STRIPE_PRICE_REVCOINS_260`
- `STRIPE_PRICE_REVCOINS_700`
- `STRIPE_PRICE_CREDITS_1000_PACK`

3) In Stripe Dashboard, create webhook endpoint:

- URL: `https://<your-worker-domain>/api/payments/webhook/stripe`
- Event: `checkout.session.completed`

4) In frontend, call:

```js
const { checkoutUrl } = await RTXBackendClient.createCheckout("credits_1000_pack");
window.location.href = checkoutUrl;
```

or

```js
const { checkoutUrl } = await RTXBackendClient.createCheckout("revcoins_260");
window.location.href = checkoutUrl;
```

or

```js
const { checkoutUrl } = await RTXBackendClient.createCheckout("membership_pro_monthly");
window.location.href = checkoutUrl;
```
