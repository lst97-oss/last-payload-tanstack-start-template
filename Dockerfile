# syntax=docker/dockerfile:1

ARG BUN_VERSION=1.4.3

FROM oven/bun:${BUN_VERSION}-slim AS base
WORKDIR /app
ENV NODE_ENV=production

FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NITRO_PRESET=node-server
RUN export PAYLOAD_SECRET=build-only-dummy-secret-override-at-runtime-1234567890 \
  && export DATABASE_URL=postgres://buildonly:buildonly@127.0.0.1:5432/buildonly \
  && export PAYLOAD_PUBLIC_SERVER_URL=https://example.com \
  && export PAYLOAD_BUNX_FLAGS=--bun \
  && export PAYLOAD_CLI_ARGS=--disable-transpile \
  && bun run build

FROM base AS runner
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --production --frozen-lockfile \
  && rm -rf /root/.bun/install/cache /root/.cache /tmp/*

COPY --from=build --chown=bun:bun /app/.output ./.output
COPY --chown=bun:bun payload.config.ts tsconfig.json ./
COPY --chown=bun:bun src ./src
COPY --from=build --chown=bun:bun /app/src/payload-import-map.ts ./src/payload-import-map.ts
COPY --from=build --chown=bun:bun /app/payload-types.ts ./payload-types.ts

ENV HOST=0.0.0.0 \
    PORT=3000 \
    NODE_ENV=production

USER bun

EXPOSE 3000

CMD ["bun", ".output/server/index.mjs"]
