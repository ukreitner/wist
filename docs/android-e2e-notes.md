# Android E2E Notes

## Environment

- Android branch is checked out in a separate worktree at `wist-android`.
- Installed local Android tooling with Homebrew:
  - `openjdk`
  - `android-commandlinetools`
  - `android-platform-tools`
- Created a workspace-local SDK shim at `.android-sdk`.
- Created a workspace-local AVD named `wist-pixel-8`.
- Booting and device bridge are working with the emulator attached as `emulator-5554`.

## Findings So Far

- The Android app is an Expo/React Native client under `packages/android`.
- It now uses the same shared client transport layer and the same server snapshots/actions as the web app.
- First live device run reached Expo Go successfully.
- The first two real runtime blockers were:
  - Metro resolved the workspace root `react@19.2.5` instead of the app-local `react@19.1.0`.
  - After fixing that, Metro still failed to resolve `scheduler` from the hoisted `react-native` install in the monorepo.
- Both blockers are now resolved on device.
- A full manual emulator pass now works through:
  - `Home -> Lobby -> Pass -> Auction -> Betting -> Play -> Scorecard`
- The cycle back from `Scorecard` to the next `Auction` screen also works.
- Real-device flow mismatch found:
  - On the play screen, the user must `tap card -> Play Card ->`.
  - The existing flow file was updated to match that two-step interaction.
- Gameplay rule check confirmed:
  - The betting screen disables `1` when it would make the total exactly `13`.
- The Android screens now map to real server state:
  - `Lobby` for room setup
  - `Auction`, `PassCards`, `Betting`, `Play`, and `Score` from the shared snapshot/phase model
- Android session persistence now stores room tokens locally so a device can resume a room after reopening the app.

## Fixes Applied

- Added `packages/android/metro.config.js` to pin `react` to the app-local install, resolve `react-native` from the hoisted workspace install, and map `scheduler` from `react-native/node_modules`.
- Replaced the old Android demo flow with a real multiplayer provider backed by:
  - shared HTTP room/session helpers
  - shared Socket.IO subscription helpers
  - AsyncStorage-backed session persistence
- Updated Android screens to render real room snapshots and emit real gameplay actions.
- Added server-side Postgres support so hosted/public multiplayer can persist outside local SQLite.

## Verification Status

- Verified:
  - `npm run typecheck`
  - `npm run build`
  - `npm run test -w @wist/server`
  - `npm run test:e2e`
- Public Render deployment verified:
  - service URL: `https://wist-z1k0.onrender.com`
  - `/health` returns `{ "ok": true }`
  - `/api/config` returns `publicAppUrl: "https://wist-z1k0.onrender.com"`
  - Render service is Blueprint-managed from branch `android-app`
  - Render environment contains `DATABASE_URL`, `HOST`, `NODE_VERSION`, and `WIST_STATIC_DIR`
- Public web smoke verified:
  - created hosted room `Q75BP2`
  - joined the same room from a second web tab as another player
  - invite/rejoin URLs use the public Render host
- Public Android smoke verified:
  - launched Expo Go against `EXPO_PUBLIC_SERVER_URL=https://wist-z1k0.onrender.com`
  - Android resumed hosted room `TSLA` and showed `Connected`
  - tapping `Start Match` advanced the hosted game to the pass-cards phase with a real dealt hand
- Remaining caveat in this Codex sandbox:
  - local fixed-port server binds such as `127.0.0.1:4100` are blocked with `EPERM`, so the final Android smoke test against a live local backend could not be completed inside this sandbox even though server runtime tests and browser e2e passed.

## Next Steps

- For manual Android testing against the public backend:
  - start the emulator with the workspace-local `wist-pixel-8` AVD
  - run Expo from `packages/android` with `EXPO_PUBLIC_SERVER_URL=https://wist-z1k0.onrender.com`
  - open `exp://127.0.0.1:8081` in Expo Go after `adb reverse tcp:8081 tcp:8081`
- If we want fully automated mobile e2e next, wire the Android flow to a stable runner or Expo dev build target instead of Expo Go.

## Current Public Android Runbook

Use this flow when the goal is emulator screenshots against the hosted multiplayer backend:

1. Confirm the emulator is attached:
   - `adb devices`
   - Expected serial: `emulator-5554`
2. Start Metro from `packages/android`:
   - `EXPO_PUBLIC_SERVER_URL=https://wist-z1k0.onrender.com npx expo start --host localhost --port 8081 --clear`
3. If Codex sandbox blocks local port binding with `EPERM`, rerun Expo with escalated permissions. Metro must print:
   - `Waiting on http://localhost:8081`
4. Route emulator traffic to Metro:
   - `adb -s emulator-5554 reverse tcp:8081 tcp:8081`
5. Launch Expo Go:
   - `adb -s emulator-5554 shell am start -a android.intent.action.VIEW -d exp://127.0.0.1:8081 host.exp.exponent`
6. If Android lands on the launcher or Expo Go home, manually tap:
   - Expo Go app icon from the launcher
   - then the `Wist` recent project in Expo Go
7. Capture screenshots with:
   - `adb -s emulator-5554 exec-out screencap -p > screenshots/<name>.png`

## Common Android/Expo Issues

- Metro may appear to hang at `Starting project` when it cannot bind `127.0.0.1:8081`; check with `lsof -nP -iTCP:8081 -sTCP:LISTEN` and restart with escalated permissions if needed.
- Stale Metro listeners on `8081` can make Expo use old code or fail silently. Stop the old process before restarting Metro when screenshots do not reflect current source.
- Expo Go deep links sometimes bounce to the Android launcher. Open Expo Go from the launcher and tap `Wist` under `Recently`.
- Android text entry may show a stylus handwriting overlay. Dismiss it with Back or tap the overlay action before continuing.
- Metro consumes TypeScript source directly in this monorepo. Avoid Android runtime imports from packages that export `.js` source specifiers unless Metro is configured for them.
- `@wist/client` source imports should stay extensionless for Expo/Metro compatibility.
- Android display-only card sorting lives in `packages/android/src/components/cardLayout.ts`; do not import `sortCards` from `@wist/core` into Android runtime code unless Metro core resolution is fixed.
- Screenshots are QA artifacts. They are useful to show the user but should usually remain untracked unless explicitly requested.

## Git Habits For This Thread

- Work on branch `android-app`.
- Commit small verified Android fixes regularly, especially before switching from implementation to emulator QA.
- Push after each meaningful verified commit so Render/GitHub stays close to local state.
- Do not stage `screenshots/` by default.
- Before committing, run at least:
  - `npx tsc --project packages/android/tsconfig.json --noEmit`
  - `npm run typecheck`
- For changes that can affect shared packages or production deploy, also run:
  - `npm run build`
