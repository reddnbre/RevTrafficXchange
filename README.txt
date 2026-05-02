RevTrafficXchange Phase 1 Starter - Logos + Loading Screen Version

Developer reference: see DEV_BIBLE.md (features, routes, persistence, backlog).

Open index.html in a browser.

Before previewing final branding, place your 3 transparent PNG logo files in:

assets/images/logos/

Rename them exactly:
rx-icon.png
revtx-wordmark.png
revtx-full.png

Current working loop:
1. Loading screen appears
2. Dashboard loads
3. Hyper Mode
4. Start timer
5. Claim valid view after timer ends
6. Earn traffic credits
7. Complete 25 views
8. Hyper Spin unlocks
9. Spin gives bonus credits or multiplier

This is intentionally modular:
- css/loading.css controls loading screen
- components/loadingScreen.js controls loading logic
- css files control styling
- js files control logic
- components files control screen sections
