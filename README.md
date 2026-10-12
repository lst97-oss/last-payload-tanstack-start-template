# payload-tanstack-start-template

Bare Payload v4 + TanStack Start starter. Boots standalone: placeholder `/`, admin at `/admin`, REST at `/api/*`. Users-only auth, plain lexical editor, Postgres `push:false`.

## Quickstart

```bash
bun install
cp .env.example .env   # fill PAYLOAD_SECRET, DATABASE_URL, PAYLOAD_PUBLIC_SERVER_URL
bun run db:up          # local Postgres via compose.yaml (demo/demo-secret-pw@127.0.0.1:5434/template_demo)
bun run db:migrate
bun run generate:types
bun run generate:importmap
bun run generate-routes   # regenerate src/routeTree.gen.ts after adding routes
bun run dev               # http://localhost:3000
```

First admin user: `bunx payload create-first-user` (Payload CLI), then sign in at `/admin`.

## Scripts

| Script | Purpose |
|---|---|
| `dev` | Vite dev server on :3000 |
| `build` | admin CSS → types → importmap → `vite build` (Dockerfile calls this chain; never repeat it elsewhere) |
| `start` | Run Nitro output for the active preset (`scripts/start.ts`: `node-server` → `.output/server/index.mjs`, default `vercel` → `.vercel/output/functions/__server.func`) |
| `generate:types` / `generate:importmap` | Regenerate `payload-types.ts` / `src/payload-import-map.ts` (both gitignored) |
| `generate-routes` | Regenerate `src/routeTree.gen.ts` after adding/removing route files |
| `generate:payload-admin-css` | Regenerate `src/styles/payload-admin-generated.css` (runs inside `build`) |
| `db:migrate` | Apply committed migrations (`src/migrations/`) |
| `db:up` | Start local Postgres (`compose.yaml`) matching `.env` |
| `smoke` | Boot-contract check against a running server (`bun run smoke [baseUrl]`): `/` 200, `/admin` redirect, `/api/users/me`, `/api/live`, `/api/ready` |
| `typecheck` | `bun check` (Bun 1.4.3+ native checker, ~90ms) |

## Structure

```
payload.config.ts            users-only collections, postgres push:false, plain lexical
compose.yaml                 local Postgres matching .env (bun run db:up)
src/routes/                  __root (withPayloadRoot + ThemeProvider + Base-UI Toaster), index placeholder,
                             _payload (admin shell), _payload.admin.{index,$} (loaders),
                             api.live (liveness), api.ready (readiness), api.$ (REST catch-all)
src/lib/                      site-not-found.tsx (defaultNotFoundComponent), site-error.tsx (defaultErrorComponent)
src/lib/payload/             admin bridge: server-fns, admin-render, admin-route,
                             layout, import-map, admin-not-found
src/plugins/                payload-shutdown.ts (Nitro close hook + SIGINT/SIGTERM drain)
src/server/                  env.ts (3 keys), security/payload-server-url.ts (prod guard),
                             http/validation.ts (zod → 400, JSON body + query helpers), modules/health (live + ready)
src/migrations/              20261011_initial-users-schema (users + payload internals)
tests/                       unit suites per module + live users integration
vendor/                      vendored RSC-independent Payload Vite plugins + 1 shim
public/                      favicon.svg, robots.txt (admin/api disallowed)
scripts/                     smoke.ts (boot-contract check), assets/ (admin CSS generator)
.github/workflows/ci.yml     typecheck + biome + migrate + test + node-server build + smoke vs live server
.bun-version                 single Bun source (Dockerfile ARG + CI bun-version-file)
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

Query needs no provider here: `setupRouterSsrQueryIntegration` in `src/router.tsx` already wraps the router with `QueryClientProvider`, so `useSuspenseQuery` works with zero provider code. Never add an explicit `QueryClientProvider` (double-wrap; only with `wrapQueryClient: false`).

### Forms — `@tanstack/react-form` (installed)

Client-only form, colocated in the route component:

```tsx
import { useForm } from '@tanstack/react-form'

function ContactForm() {
  const form = useForm({
    defaultValues: { name: '' },
    onSubmit: async ({ value }) => {
      await myServerFn({ data: value })
    },
  })
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      <form.Field name="name">
        {(field) => <input value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} />}
      </form.Field>
      <button type="submit">Send</button>
    </form>
  )
}
```

Server-validated forms: share a `formOptions` shape, validate with `createServerValidate` from `@tanstack/react-form-start` in a `createServerFn` POST, and read back with `getFormData`. Validators: inline functions or the bundled `zod`.

### Client store — `@tanstack/react-store` (installed)

At feature module scope (client-only), subscribe in components:

```tsx
import { createStore, useStore } from '@tanstack/react-store'

export const uiStore = createStore({ sidebarOpen: false })

function SidebarToggle() {
  const open = useStore(uiStore, (s) => s.sidebarOpen)
  return <button onClick={() => uiStore.setState((s) => ({ ...s, sidebarOpen: !s.sidebarOpen }))}>{open ? 'Close' : 'Open'}</button>
}
```

SSR caution: a module-scope store is shared across requests during server render — seed per-request via the route loader, never mutate at module scope on the server.

### Option B — hand-built route (manual)

File-based routing: add `src/routes/<name>.tsx`, then regenerate and verify:

```bash
bun run generate-routes   # refresh src/routeTree.gen.ts (never hand-edit)
bun run typecheck && bun test
bun run dev               # check the new route renders
```

Conventions: `@/` imports only (no `../`), server work goes in `createServerFn` handlers under `src/lib/` (see `src/lib/payload/server-fns.ts`), shared types in the same module. If the feature needs stored data, follow "Adding a collection" below instead of inventing a parallel store.

## Adding a collection

Template stays users-only; this is the recipe consumers follow per collection:

1. Add the collection to `payload.config.ts` `collections` (fields, `admin.useAsTitle`, `access` — local-API tests need `overrideAccess: true` unless the collection is public).
2. Create the migration — never dev auto-push (`push: false`):
   ```bash
   bunx payload migrate:create   # then split value/type imports per AGENTS.md trap
   bun run db:migrate
   bun run generate:types        # refresh payload-types.ts
   ```
3. Verify in `/admin` (collection appears, create/edit round-trips) and `bun test` (extend `tests/users.integration.test.ts` pattern for the new slug).

Business tables that Payload never owns (no admin UI, no auth): skip collections entirely — add a `src/server/modules/<name>/` slice on `getBusinessSql()` / `getBusinessDb()` instead (see `src/server/README.md`).

Only 3 keys: `PAYLOAD_SECRET` (min 32 random chars), `DATABASE_URL` (postgres), `PAYLOAD_PUBLIC_SERVER_URL` (public origin; loopback rejected when `NODE_ENV=production`).

## Deploy

- Vercel: default Nitro preset; run `db:migrate` before/with build.
- Docker: `docker build .` — build layer uses dummy secrets + real non-loopback origin; runtime env supplies real values. See Dockerfile comments.
