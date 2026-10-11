# payload-tanstack-start-template

Bare Payload v4 + TanStack Start starter. Boots standalone: placeholder `/`, admin at `/admin`, REST at `/api/*`. Users-only auth, plain lexical editor, Postgres `push:false`.

## Quickstart

```bash
bun install
cp .env.example .env   # fill PAYLOAD_SECRET, DATABASE_URL, PAYLOAD_PUBLIC_SERVER_URL
bun run generate:types
bun run generate:importmap
bun run db:migrate
bun run generate-routes   # regenerate src/routeTree.gen.ts after adding routes
bun run dev               # http://localhost:3000
```

First admin user: `bunx payload create-first-user` (Payload CLI), then sign in at `/admin`.

## Scripts

| Script | Purpose |
|---|---|
| `dev` | Vite dev server on :3000 |
| `build` | admin CSS → types → importmap → `vite build` (Dockerfile calls this chain; never repeat it elsewhere) |
| `start` | Run Nitro output (`bun .output/server/index.mjs`) |
| `generate:types` / `generate:importmap` | Regenerate `payload-types.ts` / `src/payload-import-map.ts` (both gitignored) |
| `generate-routes` | Regenerate `src/routeTree.gen.ts` after adding/removing route files |
| `generate:payload-admin-css` | Regenerate `src/styles/payload-admin-generated.css` (runs inside `build`) |
| `db:migrate` | Apply committed migrations (`src/migrations/`) |
| `typecheck` | `bun check` (Bun 1.4.3+ native checker, ~90ms) |

## Structure

```
payload.config.ts            users-only collections, postgres push:false, plain lexical
src/routes/                  __root (withPayloadRoot shell), index placeholder,
                             _payload (admin shell), _payload.admin.{index,$} (loaders),
                             api.$ (REST catch-all)
src/lib/                      site-not-found.tsx (router defaultNotFoundComponent)
src/lib/payload/             admin bridge: server-fns, admin-render, admin-route,
                             layout, import-map, admin-not-found
src/plugins/                payload-shutdown.ts (Nitro close hook + SIGINT/SIGTERM drain)
src/server/                  env.ts (3 keys), security/payload-server-url.ts (prod guard)
src/migrations/              20261011_initial-users-schema (users + payload internals)
tests/                       unit suites per module + live users integration
vendor/                      vendored RSC-independent Payload Vite plugins + 2 shims
scripts/assets/              admin CSS generator
```

## Adding a frontend feature

Two paths: TanStack add-ons via the CLI, or a hand-built route (the common case here).

### Option A — TanStack add-on (`tanstack add`)

For existing projects ([CLI reference](https://tanstack.com/cli/latest/docs/cli-reference.md)):

```bash
bunx @tanstack/cli add tanstack-query
bunx @tanstack/cli add tanstack-form
```

List what's available first: `bunx @tanstack/cli create --list-add-ons`, details with `bunx @tanstack/cli create --addon-details <id>`. Add-ons drop files under `src/integrations/` (wired here via `src/router.tsx`, e.g. `tanstack-query/root-provider`) plus demo routes and deps.

Caveat for this template: the CLI doesn't know about the Payload/Nitro wiring (`vite.config.ts` plugin order, `withPayloadRoot`, `payloadParseSearch`/`payloadStringifySearch`, `src/plugins/payload-shutdown.ts`). Review every file the add-on touches before accepting — keep the boot contract in AGENTS.md intact, then `bun run typecheck && bun test && bun run dev`.

### Option B — hand-built route (manual)

File-based routing: add `src/routes/<name>.tsx`, then regenerate and verify:

```bash
bun run generate-routes   # refresh src/routeTree.gen.ts (never hand-edit)
bun run typecheck && bun test
bun run dev               # check the new route renders
```

Conventions: `@/` imports only (no `../`), server work goes in `createServerFn` handlers under `src/lib/` (see `src/lib/payload/server-fns.ts`), shared types in the same module. If the feature needs stored data, follow "Adding a collection" below instead of inventing a parallel store.

## Adding a collection

## Env

Only 3 keys: `PAYLOAD_SECRET` (min 32 random chars), `DATABASE_URL` (postgres), `PAYLOAD_PUBLIC_SERVER_URL` (public origin; loopback rejected when `NODE_ENV=production`).

## Deploy

- Vercel: default Nitro preset; run `db:migrate` before/with build.
- Docker: `docker build .` — build layer uses dummy secrets + real non-loopback origin; runtime env supplies real values. See Dockerfile comments.
