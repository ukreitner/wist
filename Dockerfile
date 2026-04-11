FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json playwright.config.ts ./
COPY packages ./packages
COPY docs ./docs
COPY tests-e2e ./tests-e2e

RUN npm ci
RUN npm run build

ENV NODE_ENV=production
ENV PORT=4100
ENV HOST=0.0.0.0
ENV WIST_DB_PATH=/data/wist.sqlite
ENV WIST_STATIC_DIR=/app/packages/web/dist

VOLUME ["/data"]

EXPOSE 4100

CMD ["node", "packages/server/dist/index.js"]
