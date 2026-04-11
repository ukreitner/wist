# Future Codex Notes

These notes summarize the working style, product taste, and implementation lessons from building this online Wist game with Uri.

## User Taste

- The game should feel like a real playable table, not a generic dashboard.
- Visual polish matters. Cards need actual pips/shapes, recognizable face cards, readable ranks, and physical-card proportions.
- The center of the table should communicate the core game state clearly: current auction, highest bid, contract/trump, whose turn, and what each player just did.
- Persistent utility controls should stay out of the way. Rare actions like ending the match belong on the side, not front-and-center.
- Player names are preferred during play. Compass directions are acceptable for seat assignment only, but not as the main in-game identity.
- Hebrew support matters, including RTL layout and translated status labels. Do not leave raw enum/status strings visible.
- Clutter and duplication are noticed quickly. Avoid showing the room code, connected state, bid/taken, or history in multiple places unless each copy has a clear purpose.
- Card layout is very important. The hand should be sorted suit-first, then increasing rank left-to-right. Desktop should fit the full hand cleanly; mobile can scroll if needed.
- History and continuity matter: rejoin links, same-name rejoin, saved local history, import/export, and retroactive score correction are all part of the expected product quality.
- The user likes iterative visual QA: take screenshots, inspect them, use them as input, improve, and repeat until the UI is genuinely playable.

## Recurring Corrections To Expect

- First versions may be too utilitarian. Push toward a stronger card-table feel, better hierarchy, and less admin-style chrome.
- Watch for overlap and clipping, especially sidebars, score tables, previous trick cards, and 13-card hand rows.
- Do not use a giant list when the user expects a compact two-step picker. Bidding should be suit first, then number.
- Make auction/bidding state very explicit. Players need to see current highest bid and each player's latest action in the middle.
- Keep the fourth card of a trick visible briefly before clearing, and preserve a small last-trick tray.
- If everyone misses, nobody gets points. If scoring rules change, apply them retroactively to active persisted rooms and local/imported archives.
- Do not restart a live server casually. If a shared URL is currently working, preserve it unless the user explicitly says testing can interrupt it.
- Public join/network bugs are often tunnel or host-binding issues. Verify from the public URL, not only localhost.
- For Cloudflare quick tunnels, the URL is ephemeral. If `cloudflared` reports `Unauthorized: Tunnel not found`, stop the stale `cloudflared` process and start a fresh quick tunnel.
- Same username rejoin should reclaim a disconnected player when safe. Do not force people to invent a different nickname after refresh/disconnect.

## What Works Well With This User

- Be direct and execute end-to-end. The user expects implementation, testing, screenshots, GitHub push, and a live URL when possible.
- Keep progress updates concise but concrete: what changed, what passed, what failed, and what is next.
- When browser QA is relevant, use Playwright with multiple isolated contexts and show screenshots.
- Treat screenshots as evidence. If a screenshot exposes a layout flaw, fix it before claiming completion.
- Prefer practical compromises, but state them clearly. Example: Room Tools was reduced to rejoin, while End Match remained as a subtle side action because hosts still need a stop control.
- Push useful changes to GitHub after verification if the repo is already set up and the user has asked for GitHub workflow before.

## Multiplayer Join And Link Notes

- The user wants a URL that friends can open directly. For local development, a Cloudflare quick tunnel to `http://127.0.0.1:4100` works.
- Always verify both:
  - `http://127.0.0.1:4100/health`
  - `https://<tunnel>.trycloudflare.com/health`
- Also verify the tunnel root returns HTTP 200, because `/health` can pass while static/app routing is still broken.
- Quick tunnels are not durable. Tell the user the link depends on the local server and `cloudflared` process staying alive.
- Rejoin links should include room code and player token. Invite links should not expose another player's token.
- Store session/recent-room data locally so the same device can resume without hunting for tokens.
- Extra joins should fail cleanly when the room is full, but rejoin with an existing token or safe same-nickname reclaim should work.
- Host disconnect should not stop gameplay. Host powers should be limited to seating/start/end; gameplay must remain server-authoritative.

## Game Architecture Notes For This Style

- Keep rules in a shared deterministic core. The client should render server-derived legal actions and may disable obvious invalid controls, but the server must be authoritative.
- Use an append-only event stream plus a pure reducer. This makes reconnect, undo audit, history, crash recovery, and retroactive replay possible.
- Keep hidden information redacted by audience. A player receives their own hand; everyone else sees only public table state.
- Add deterministic test presets. They are essential for bidding, pass-left, no-trump, scoring, and full-hand E2E tests.
- Use stable `data-testid` hooks for hard-to-query controls such as auction suit/number pickers. Keep accessible labels for card buttons and seat assignment.
- Model undo as auditable events, not silent mutation. The current product rule is self-undo of the latest eligible action until another gameplay action occurs; pass-card exchange is not undoable.
- Make completed-hand scoring derived from core `scoreHand`, not duplicated in UI or storage. If rules change, replay/normalize rather than patching displayed totals manually.
- Maintain active-room persistence in SQLite, but avoid pretending quick local rooms are permanent archives. Device archives are useful for local review/import/export.
- For visual card games, use both DOM assertions and screenshots. DOM tests catch flow regressions; screenshots catch the actual table experience.

## QA Baseline

- Run unit/core/server tests after rule or persistence changes.
- Run full production build before sharing a live URL.
- Run Playwright E2E with four isolated browser contexts for any gameplay, reconnect, or UI-control change.
- Capture representative screenshots:
  - Lobby and seat assignment
  - Hebrew/RTL lobby
  - Auction opening
  - Contract/trump and sorted hand
  - Mid-hand trick state
  - Completed hand with score table
- Treat Vite websocket `ECONNRESET` or `ECONNABORTED` messages during Playwright shutdown as non-blocking if tests pass; they usually come from browser contexts closing.

## Current Project State At This Note

- Repository: `https://github.com/ukreitner/wist`
- Local server port: `4100`
- Main stack: React + TypeScript web, Node + TypeScript Socket.IO server, shared TypeScript core, SQLite event log.
- Public sharing in development: Cloudflare quick tunnel.
- Latest relevant commit at the time of writing: `b215649 Apply table UI and scoring feedback`.
