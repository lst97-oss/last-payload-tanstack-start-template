# Changelog

## v0.4.1

Bun 1.4.4 toolchain migration. No runtime or template behaviour changes.

### Changed

- Formatting moves to Bun's built-in formatter (`bun fmt`, config in `bunfig.toml`); Biome remains lint + import-assist only and its formatter is disabled.
- Typechecking uses `bun check --no-script`; CI and the kernel-sync workflow now run the aggregate `bun run check`.
- Bun is pinned to 1.4.4 in `.bun-version`, the Dockerfile `ARG`, and `bun-types`; the lockfile is refreshed.
- One-time `bun fmt` formatting pass across TypeScript, TSX and CSS. JSON, Markdown, YAML and generated files are unchanged.

### Upgrading

- Run `bun install` after updating. Bun 1.4.4 or newer is required for the new scripts.
- No database migrations or application changes are introduced in this release.

## v0.4.0

Payload 4.0.0-beta.2 migration, kernel auto-sync, and repo rename.

### Changed

- Repo renamed to `last-payload-tanstack-start-template` (package name, compose project, README title follow).
- Upgraded `payload` and all `@payloadcms/*` deps from `4.0.0-canary.37` to `4.0.0-beta.2`.
- Removed the `sharp` dependency and its `payload.config.ts` wiring; set beta-era flags (`authorship: false` on `users`, `llmInstructions: false`).
- Refreshed the vendored TanStack Vite workarounds from beta.2 (`constants.js` split into `external.js` + `optimizeDeps.js`); plugin order unchanged.
- Admin shell now uses the adapter's `payloadLayoutRoute()` helper instead of hand-rolled `RootProvider` wiring; `loadLayoutData` replaces `getLayoutData` + `toSerializable`. Deleted the local layout bridge (`src/lib/payload/layout.ts`) and its test.

### Added

- Kernel auto-sync: `src/server/` code pulls from the canonical blank template (`last-tanstack-start-template`) via the weekly `kernel-sync` workflow, which opens a PR after a green gate (`bun run sync:kernel` runs it locally).
- Schema drift test (`tests/payload-schema.test.ts`): fails when the committed migration snapshot drifts from the sanitized config, no DB needed.

### Upgrading

- Run `bun install` after updating (Payload beta.2 + refreshed lockfile).
- No database migrations are introduced in this release.

## v0.3.0

UI showcase, new shadcn components, and public styling isolated from Payload admin.

### Added

- Development-only `/ui` showcase with examples for all 55 installed UI modules, light/dark/system themes, and local interactive fixtures. Production requests return 404.
- Page sidebar with desktop icon collapse, a mobile drawer, expandable section navigation, a workspace picker, and a fixture account menu.
- Base Nova Code Block and Trace components, including copy actions, line numbers, diffs, syntax highlighting, and expandable activity output.
- Lazy language loading with Shiki's JavaScript engine; an engine-free core import keeps highlighting compatible with Nitro builds.
- Removal instructions for the showcase, plus CSS, control, and showcase regression checks.

### Fixed

- Tailwind layer order so public element defaults no longer override component utilities.
- Public defaults and generated utilities scoped to `html[data-public-ui]`, preventing class collisions such as `.table` from changing Payload admin layouts. Public body-mounted popups remain styled.
- Switch tracks scale with their thumbs; checked radio indicators fit and centre inside their controls.
- Fresh-checkout CI regenerates the route tree, Payload import map, and admin CSS before checks; the lockfile supports frozen installs.

### Upgrading

- Run `bun install` after updating to install the highlighting dependencies.
- Keep `data-public-ui` on custom public document shells and retain `withPayloadRoot` so Payload uses its separate document shell.
- The showcase can be removed by following `src/features/ui-showcase/README.md`.
- No database migrations are introduced in this release.

## v0.2.0

Bare Payload v4 + TanStack Start, hardened to a boot contract.

### Backend kernel (`src/server/`)

- `{ data }` / `{ error: { code, message } }` envelope (`ok`/`fail`, `cache-control: no-store` default).
- `HttpError(status, code, message)` — 5xx messages hidden on the wire (`expose` defaults to `status < 500`).
- `withContext` — request-id echo, structured start/complete/error logs, never-throws; handler-built `Response`s (ready 503) pass through.
- `withAuth` 501 stub marks the Better Auth seam.
- zod helpers — `parseWith`, `parseJsonBody` (400 `MALFORMED_JSON`), `parseSearchParams`, `parsePaginationParams` (limit 1–100 default 20, offset ≥ 0 default 0, enforced not clamped).
- Bun-native Postgres (`getBusinessSql` / `getBusinessDb` Drizzle seam), lazy layered env (`BUSINESS_DATABASE_URL` else `DATABASE_URL`), production loopback guard.
- Health reference slice — `/api/live` (no I/O, always 200) vs `/api/ready` (DB probe, 503 when degraded).
- Graceful shutdown — Nitro close hook + SIGINT/SIGTERM traps drain payload cache + business pool.

### Shell & UI

- `withPayloadRoot` shell with `ThemeProvider` (class mode) + Base-UI `Toaster` (`toast.add()`, never sonner).
- `SiteNotFound` (404) + `SiteError` (loader throws, with recovery actions); favicon + `robots.txt` (admin/api disallowed).
- Placeholder `/` exercises button + toast; shadcn registry baseline (base-nova, neutral, lucide) — unused drops deleted with their deps.

### Ops

- `compose.yaml` local Postgres (`bun run db:up`), `scripts/smoke.ts` boot contract, CI (typecheck + biome + migrate + test + node-server build + live smoke).
- Dockerfile `HEALTHCHECK` on `/api/live`, minimal security headers (no CSP — Payload inline scripts; HSTS prod-only), `scripts/start.ts` preset-resolving entry.
- `.bun-version` single source (Dockerfile `ARG` + CI `bun-version-file`); `bun.lock` tracked for frozen installs.

### Docs

- README collection recipe, frontend paths (Query/Form/Store), structure map; `src/server/README.md` + `AGENTS.md` kernel contract; root `AGENTS.md` boot contract + verification checklist.

### Deliberately not included

Real auth beyond Payload users, collections beyond `users`, i18n (en-only until ≥2 locales), pagination UI, rate limiting, OpenAPI, metrics, email/storage/RAG/chat.
