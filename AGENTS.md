# Template Guidelines

Bare Payload v4 (`4.0.0-canary.37`) + TanStack Start (RSC, Nitro). Keep it minimal: every file here must justify itself for boot (`/`, `/admin`, `/api/*`). App content (site pages, extra collections, chat/RAG/email/storage, seeds) belongs in the consuming project, not here.

## Load-bearing wiring — do not "simplify"

- `vite.config.ts` plugin order is the boot contract: `clientModuleResolution → wrapCjsForClient → ssrStripDistStyleImports → reactDomServerInRsc → payloadDevTransforms → viteRsc({ serverHandler: false }) → reactStartRscVitePlugin() → tanstackStart({ rsc: { enabled: true }, importProtection }) → viteReact() → nitro()`. `serverHandler: false` is required — the default RSC handler 500s every request ("Invalid server handler entry"). `vendor/payload-tanstack-vite/*` is the RSC-independent subset because the full `payloadPlugin` wrapper 404s every route on this TanStack line; re-copy that directory after any `@payloadcms/tanstack-start` bump, and never switch to `withPayload()` without proving `/admin` still routes 200.
- `src/routes/__root.tsx` MUST wrap with `withPayloadRoot` — it hands `<html>` to Payload's shell on `/admin` so `data-theme`/`dir`/`lang` rules match. A hand-rolled shell leaves ~60 admin rules unmatchable.
- `src/router.tsx` MUST keep `payloadParseSearch`/`payloadStringifySearch` — TanStack's default serializer JSON-quotes values (`?depth=%221%22`) and Payload ignores them, so admin pagination silently stops working.
- `src/lib/payload/server-fns.ts` MUST return `handleServerFunctions` result as-is. Re-wrapping in `toSerializable` strips RSC elements (`$$typeof` is a Symbol) and hangs relationship drawers / form-state on a spinner.
- `src/server/security/payload-server-url.ts` rejects loopback origins in production. The Docker build stage is production, so it exports a non-loopback `PAYLOAD_PUBLIC_SERVER_URL` for that one `RUN` layer only. Never relax the guard to make a build pass.
- `payload.config.ts` uses `push: false` + `prodMigrations`. Schema changes go through committed migrations (`bunx payload migrate:create` → `bun run db:migrate`), never dev auto-push.
- Admin CSS needs a real `<link>` (`src/routes/_payload.tsx` head + `scripts/assets/generate-payload-admin-css.ts` output). RSC-injected styles do not exist on first paint.

## Conventions

- Runtime is Bun (`Bun.env`, Web APIs). Aliases: `@/*` → `src/*`, `@payload-config` → `payload.config.ts`.
- Style (Biome): 2-space, 120 cols, single quotes, JSX double, semicolons as-needed, trailing commas. Linter covers `src/server/**` only; formatter skips `src/styles`, `src/migrations`, `vendor`, `routeTree.gen.ts`, `*.json`.
- Tests (when added): mirror module basename under `tests/`, never co-located. Fakes are injected ports (`fetcher = fetch`), never `mock.module`.
- Changes to generated files are forbidden: `payload-types.ts`, `src/payload-import-map.ts`, `src/routeTree.gen.ts`, `src/styles/payload-admin-generated.css` — regenerate via the matching script.
- `migrate:create` trap: the CLI emits `MigrateUpArgs`/`MigrateDownArgs` as value imports, which crashes `migrate` with "does not provide an export named 'MigrateDownArgs'". Split to `import { sql }` + `import type { MigrateDownArgs, MigrateUpArgs }`, narrow handlers to `{ db }`.

## Verification before declaring done

- `bun run typecheck` clean (`bun check`, Bun 1.4.3+ native).
- `bunx @biomejs/biome check .` clean; `biome lint src/server` clean; imports organized.
- After route changes: `bun run generate-routes`, then `GET /` 200, `GET /admin` login redirect, `GET /api/users/me` 200 `{"user":null}`.
- Never read exit codes off pipelines (`cmd | tail; echo $?` reports `tail`). Capture first, read second.
