# Wist

Online four-player Wist with a shared TypeScript rules engine, realtime multiplayer server, polished browser client, and full automated QA.

## Local Run

1. `npm install`
2. `npm run dev`
3. Open `http://127.0.0.1:5173`

The default dev setup runs:

- the server on `http://127.0.0.1:4100`
- the client on `http://127.0.0.1:5173`

## Android App

The Android client lives in `packages/android` and now talks to the same public/server-authoritative backend as the web app.

For local Android development:

1. Start the server:
   `node packages/server/dist/index.js`
   or `npm run dev -w @wist/server`
2. Start Expo from `packages/android`:
   `npx expo start --host localhost`
3. For the Android emulator, set `EXPO_PUBLIC_SERVER_URL=http://10.0.2.2:4100`
   for a real device, point it at your public backend URL instead

If `EXPO_PUBLIC_SERVER_URL` is unset, the Android app defaults to `http://10.0.2.2:4100`.

## Verification

- `npm run typecheck`
- `npm run test`
- `npm run test:e2e`
- `npm run build`

## Production Build

`npm run build` creates:

- shared engine output in [packages/core/dist](C:/Users/urikr/OneDrive/Documents/wist/packages/core/dist)
- server output in [packages/server/dist](C:/Users/urikr/OneDrive/Documents/wist/packages/server/dist)
- client output in [packages/web/dist](C:/Users/urikr/OneDrive/Documents/wist/packages/web/dist)

To serve the built app from the Node server:

1. `npm run build`
2. Set `WIST_STATIC_DIR=packages/web/dist`
3. Run `node packages/server/dist/index.js`

Relevant environment variables:

- `PORT`: server port, defaults to `4100`
- `HOST`: bind host, defaults to `127.0.0.1`
- `DATABASE_URL`: optional Postgres connection string; when present the server uses Postgres instead of local SQLite
- `PUBLIC_APP_URL`: canonical public app URL used for invite/rejoin links
- `WIST_DB_PATH`: SQLite database path, defaults to `.data/wist.sqlite`
- `WIST_STATIC_DIR`: optional built web directory for single-process hosting
- `ALLOW_TEST_PRESETS=1`: enables deterministic preset hands for automated QA
- `EXPO_PUBLIC_SERVER_URL`: Android client server URL for Expo/dev builds

## Docker

Use the root [Dockerfile](C:/Users/urikr/OneDrive/Documents/wist/Dockerfile) for a single-container deployment:

1. `docker build -t wist .`
2. `docker run -p 4100:4100 -v wist-data:/data wist`

The container serves:

- the API
- Socket.IO realtime events
- the built web client from `packages/web/dist`

## Packages

- `@wist/core`: shared rules engine and reducer
- `@wist/client`: shared HTTP, Socket.IO, session, and link helpers used by web and Android
- `@wist/server`: HTTP + Socket.IO server with SQLite or Postgres-backed room persistence
- `@wist/web`: React client
