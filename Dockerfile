# syntax=docker/dockerfile:1

# Single source: .bun-version. Bump both together (CI reads the file).
ARG BUN_VERSION=1.4.3

FROM oven/bun:${BUN_VERSION}-slim AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock ./
RUN --mount=type=cache,target=/root/.bun/install/cache,sharing=locked bun install --frozen-lockfile

FROM base AS build
COPY --link --from=deps /app/node_modules ./node_modules
COPY . .
ENV NITRO_PRESET=node-server \
  NODE_ENV=production
RUN export PAYLOAD_SECRET=build-only-dummy-secret-override-at-runtime-1234567890 \
  && export DATABASE_URL=postgres://buildonly:buildonly@127.0.0.1:5432/buildonly \
  && export PAYLOAD_PUBLIC_SERVER_URL=https://example.com \
  && export PAYLOAD_BUNX_FLAGS=--bun \
  && export PAYLOAD_CLI_ARGS=--disable-transpile \
  && bun run build

FROM base AS runner
WORKDIR /app

COPY package.json bun.lock ./
RUN --mount=type=cache,target=/root/.bun/install/cache,sharing=locked bun install --production --frozen-lockfile

COPY --link --from=build --chown=bun:bun /app/.output ./.output
COPY --link --chown=bun:bun payload.config.ts tsconfig.json ./
COPY --link --chown=bun:bun src ./src
COPY --link --from=build --chown=bun:bun /app/src/payload-import-map.ts ./src/payload-import-map.ts
COPY --link --from=build --chown=bun:bun /app/payload-types.ts ./payload-types.ts

ENV HOST=0.0.0.0 \
    PORT=3000 \
    NODE_ENV=production

USER bun

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD bun -e "const r = await fetch('http://127.0.0.1:3000/api/live'); process.exit(r.ok ? 0 : 1)"

CMD ["bun", ".output/server/index.mjs"]
