# RevTrafficXchange — Dev Bible (Phase 1)

Single source of truth for what exists today, how it fits together, and what is still open. This repo is **frontend-only** (no real backend, payments, or payouts).

---

## How to continue in a new chat

Use:

`Read DEV_BIBLE.md first. Continue RevTrafficXchange Phase 1 from current state.`

(Older notes may still mention `PROJECT_HANDOFF.md`; that file now points here.)

---

## User journey (high level)

1. **Loading** (`components/loadingScreen.js`) → then **Spotlight** (`spotlight`)
2. **Dashboard** (`dashboard`)
3. **Surf / Hyper Mode** (`surf`) — timed views, session cap, anti-cheat
4. Optional: **Admin** (`admin`), nav placeholders (store, spins page, rewards page, ad manager stubs)

---

## Routing (`RTXState.currentView`)

| Value | Screen |
|--------|--------|
| `spotlight` | Pre-dashboard spotlight |
| `dashboard` | Main dashboard |
| `surf` | Hyper Mode surf UI |
| `admin` | Admin back office shell |
| `my-sites` | Placeholder — My Sites |
| `my-text-ads` | Placeholder — My Text Ads |
| `my-banner-ads` | Placeholder — My Banner Ads |
| `revcoin-store` | Placeholder — RevCoin Store |
| `hyper-spin` | Placeholder — Hyper Spin hub |
| `rewards` | Placeholder — Rewards hub |

The **loading screen** is driven by `LoadingScreen` (overlay + interval); it is not a separate `currentView` value.

Navigation: `js/app.js` (`App.navigate`, `renderView`, `renderMainNav`). **Ad Section** uses `RTXState.ui.adsDropdownOpen` for the dropdown.

---

## File map (where things live)

| Area | Primary files |
|------|----------------|
| Boot / router / chrome | `js/app.js`, `index.html` |
| Global state & helpers | `js/state.js` |
| Credits | `js/creditSystem.js` |
| Sessions | `js/sessionSystem.js` |
| Surf timer & claims | `js/surfEngine.js` |
| Hyper Spin wheel | `js/hyperSpin.js` |
| Dashboard UI | `components/dashboard.js`, `css/dashboard.css` |
| Surf page | `components/surfPage.js`, `css/surf.css` |
| Spotlight | `components/spotlightPage.js`, `css/spotlight.css` |
| Loading | `components/loadingScreen.js`, `css/loading.css` |
| Modals | `components/gameModal.js` |
| Admin | `components/adminPage.js`, `css/admin.css` |
| Nav placeholders | `components/placeholderPages.js` |
| Layout / header / main nav | `css/layout.css` |
| Base tokens | `css/base.css` |

---

## What we have (implemented)

### Core product loop

- **Loading screen** with progress → transitions to spotlight.
- **Spotlight** before dashboard; default fallback ad; optional +5 credits once per 24h (`rtx_spotlight_last_credit` in localStorage).
- **Dashboard**: hero, today’s session card, stats, **Wallet & Rewards** section (Reward Pool + Premium RevCoins), secondary stats row, rules panels.
- **Hyper Mode (Surf)**: command bar / large viewer / claim flow; **anti-cheat** (tab/focus invalidation, CAPTCHA cadence); **session completes at 25 views** with manual next session (no hidden timer restart after completion).
- **Hyper Mode surf queue**: when **Admin → Surf Ads** has at least one **active** ad with remaining **maxViews** (if set), Hyper Mode rotates those ads (iframe URL + title), uses each ad’s **timerSec** for the next timer, and calls **`incrementAdView(adId)`** on every successful claim (including the 25th view). If no eligible admin ads, falls back to **`sampleCampaigns`** (no view counter on samples).

### Loyalty & daily (separate systems)

- **Lifetime loyalty**: `loyaltyScore`, tier via `getLoyaltyTierInfo()`, help modals; unchanged by daily reset.
- **Daily activity**: `RTXState.user.dailyActivity` with calendar-day reset via `checkDailyReset()`; scoring hooks on valid claim, session complete, and Hyper Spin use; **Daily Reward Tier** via `getDailyRewardTier()`; dashboard card + Daily Activity help modal.

### Premium RevCoins (visual + light mechanics)

- `premiumRevCoins` persisted on user.
- **Buy Hyper Spin**: 10 coins → +1 `hyperSpins` (`buyHyperSpin()` in `hyperSpin.js`).
- **Activity boost** (temporary): 20 coins → 1h, `activeBoost` multiplier **1.2×** on **daily activity score only** for view (+1) and session (+25) increments; `checkBoostExpiry()`; dashboard indicator; **live “Ends in”** updates every 30s (`ActivityBoostCountdown` in `dashboard.js`).
- **Get Premium**: placeholder modal only (no checkout).

### Reward pool (UI only)

- Dashboard **Loyalty Reward Pool** card + `getRewardPoolPreview()` — **no payout execution**.

### Admin (local state, no backend)

- **Shell** with tabs.
- **Users** tab: CRUD-style local list, search, edit/suspend/delete, persist `rtx_admin_state_v1`.
- **Surf Ads** tab: manage local `RTXState.admin.surfAds`; **`incrementAdView(adId)`** is wired to Hyper Mode claims (see above).
- **Spotlight Ads, Banner Ads, Settings** tabs: placeholder copy only.
- **Reward Pool** admin tab: shows percent readouts from `rewardPoolSettings` (preview), not payout controls.

### Navigation & IA

- **Main nav** in header: Dashboard, Surf, **Ad Section** dropdown (My Sites / My Text Ads / My Banner Ads), RevCoin Store, Hyper Spin, Rewards, **Admin** if `RTXState.user.isAdmin`.
- **Placeholder pages** for all non-core routes (`placeholderPages.js`).

### Persistence (localStorage)

| Key | Purpose |
|-----|---------|
| `rtx_user_state_v1` | Serialized `RTXState.user` (via `RTXUserPersist`) |
| `rtx_admin_state_v1` | Admin users + surf ads JSON (`RTXAdminPersist`) |
| `rtx_spotlight_last_credit` | Spotlight 24h credit gate |

---

## Critical guardrails (do not break)

- **No** real money movement: payouts, withdrawals, card/checkout, or “cash balance” execution.
- **Do not** silently change Hyper Mode **timer / session completion / anti-cheat** behavior unless the task explicitly asks for it.
- **Do not** reset lifetime `loyaltyScore` or **credits** when doing daily resets; **do not** wipe admin data from user flows.
- Keep the **modular** script/CSS structure unless asked to consolidate.
- Reward pool and RevCoin store remain **preview / UX** until a dedicated backend phase.

---

## What’s left (suggested backlog)

Prioritized for “traffic exchange that ships” — still Phase 1–friendly unless noted.

### High value next

1. **Per-ad credits (optional)** — map admin surf ad `credits` into `CreditSystem` / `recordValidView` if product should match admin “credits per view” (today credit math is unchanged).
2. **RevCoin Store page** — UI for packs/boosts; still **no** real payment; could grant test coins in dev only behind a flag later.
3. **Hyper Spin page** — dedicated UI to spend `hyperSpins` (today much of spin UX may still live in modal post-session; align without duplicating logic).
4. **Rewards page** — surface daily tier + lifetime loyalty + pool preview in one place (read-only).

### Ad section (user-facing)

5. **My Sites** — CRUD for user surf URLs (local state first, schema compatible with future API).
6. **My Text Ads / My Banner Ads** — placeholders → real forms + list (local), separate from admin global inventory if product calls for it.

### Admin back office

7. **Spotlight Ads / Banner Ads / Reward Pool admin / Settings** tabs — replace placeholders with the same pattern as Users + Surf Ads (local JSON + persist).
8. **Auth / roles** — real `isAdmin` from server; hidden routes; no hardcoded admin in production.

### Product polish

9. **Nav dropdown** — optional click-outside to close; keyboard trap if accessibility audit requires it.
10. **Time zones** — daily reset uses `toISOString().slice(0,10)` (UTC day boundary); consider local calendar day if product requires it.

### Engineering when backend exists

11. Replace `RTXUserPersist` / `RTXAdminPersist` with API + optimistic UI.
12. Server-side validation of views, spins, and boosts (trust nothing from the client).

---

## Definition of done (Phase 1 frontend — current bar)

- User can load → spotlight → dashboard → surf, complete sessions, use Hyper Spin, see loyalty and **daily** progress.
- Anti-cheat and session cap behavior remain trustworthy.
- Admin can manage **users** and **surf ads** locally; data survives refresh.
- Premium RevCoins flows (**spin purchase**, **activity boost**) work locally without touching payouts.
- Main nav switches views without breaking dashboard or surf.

---

## If something looks “reverted” or broken

Check in order:

1. `js/app.js` — routing, nav, `currentView`
2. `js/state.js` — defaults, `checkDailyReset`, `checkBoostExpiry`, persistence
3. `js/surfEngine.js` — claims, daily activity increments, timer
4. `js/sessionSystem.js` — session completion + daily session bonus
5. `components/surfPage.js` + `css/surf.css` — Hyper Mode layout
6. `components/dashboard.js` + `css/dashboard.css` — dashboard + wallet section
7. `components/adminPage.js` — admin UI
8. `components/placeholderPages.js` — nav placeholder routes

---

*Last updated to reflect the codebase and product direction as of the working tree when this file was written.*
