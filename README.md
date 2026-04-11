# Wist

Online four-player Wist with a shared TypeScript rules engine, realtime multiplayer server, polished browser client, and full automated QA.

## Local Run

1. `npm install`
2. `npm run dev`
3. Open `http://127.0.0.1:5173`

The default dev setup runs:

- the server on `http://127.0.0.1:4100`
- the client on `http://127.0.0.1:5173`

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
- `WIST_DB_PATH`: SQLite database path, defaults to `.data/wist.sqlite`
- `WIST_STATIC_DIR`: optional built web directory for single-process hosting
- `ALLOW_TEST_PRESETS=1`: enables deterministic preset hands for automated QA

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
- `@wist/server`: HTTP + Socket.IO server with SQLite-backed room persistence
- `@wist/web`: React client
