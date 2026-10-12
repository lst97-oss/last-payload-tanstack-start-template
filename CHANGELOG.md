# Changelog

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
