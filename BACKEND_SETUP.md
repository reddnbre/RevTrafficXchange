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

## Notes

- Password is accepted for compatibility but not validated yet (demo auth model).
- User app state is saved as JSON in `users.state_json`.
- Next step is to move server-trust logic (credits/session claim validation) into backend endpoints.
