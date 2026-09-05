# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev              # start Nuxt dev server
pnpm build             # production build (Vercel preset)
pnpm lint              # eslint --fix over .ts/.js/.vue
pnpm test              # vitest run (server/**/*.test.ts only)
pnpm vitest run server/services/combat.service.test.ts   # run a single test file
pnpm vitest run -t "test name"                            # run a single test by name
```

There is no separate typecheck script; Nuxt's generated `.nuxt/tsconfig.*.json` project references (via `tsconfig.json`) are what `vue-tsc`/editor tooling uses. Run `pnpm build` to surface type errors if needed.

## Architecture

**Stack**: Nuxt 4 (SPA mode, `ssr: false`), Vuetify 3, Firebase (client auth) + firebase-admin (Firestore, server-side), Zod for schema validation, Vercel deployment (`nitro.preset: 'vercel'`).

**Directory roles** (Nuxt 4 layout):
- `app/` — Vue frontend: pages, components (`app/components/game/*` are the game UI), composables, layouts, middleware.
- `server/` — Nitro server: `api/` (H3 route handlers), `services/` (business logic), `repositories/` (Firestore access), `constants/` (game balance/config tables), `middleware/` (global auth, logging, request-id), `utils/`.
- `shared/` — code importable from both `app/` and `server/`: Zod schemas (`shared/schemas/api/*` for HTTP request/response contracts, `shared/schemas/firestore/*` for stored documents) and their inferred TypeScript types (`shared/types/*`).
- `openspec/` — spec-driven development artifacts: `specs/` (current approved specs per capability, e.g. `combat-engine`, `deterministic-rng`, `adventure-run-lifecycle`), `changes/` (in-flight proposals with proposal/design/tasks/spec deltas), `analysis/` (optional structured analysis artifacts). See `~/.claude/claude-md/openspec.md` for the `opsx:*` skill workflow (explore → propose → apply → sync → archive).
- `docs/` — `worldview.md` (narrative worldview) plus `game-design/mechanics/` (system mechanics: combat, economy, progression, run, characters, and `content/` catalogs of what's actually implemented) and `game-design/balance/` (numeric/probability tables: drop rates, encounter rates, enemy scaling, reward tables, item stat ranges). Read these before changing game-balance-affecting code.

**Request flow** (server): `server/middleware/auth.global.ts` runs first for all `/api/*` routes, verifying the Firebase ID token and populating `event.context.auth` (except for a hardcoded public-path allowlist). Route handlers in `server/api/**/*.post.ts` / `*.get.ts` follow a consistent pattern: `requireAuth(event)` → `readBody` + Zod `safeParse` against the request schema (throw `ValidationError` on failure) → instantiate and call the relevant `*Service` → build response object → validate/return it via the matching Zod response schema → wrap in `try/catch` that logs via `logRequest` and rethrows via `toH3Error(error)`. See `server/api/adventure/start.post.ts` for the canonical shape.

**Service/Repository layers**: Services extend `BaseService` (adds `logInfo`/`logError`/`logWarn`/`logDebug`, each service sets a `serviceName`). Repositories extend `BaseRepository<T>` (`server/repositories/base.repository.ts`), which wraps Firestore CRUD with `DatabaseError`/`NotFoundError`. Custom error classes live in `shared/types/errors.ts` (`AppError` subclasses: `AuthError`, `ForbiddenError`, `NotFoundError`, `ValidationError`, `ConflictError`, `BusinessLogicError`, `RateLimitError`, `ExternalServiceError`, `DatabaseError`) — `errorHandler.ts`'s `toH3Error`/`formatErrorResponse` convert these to H3 responses uniformly. Always throw the specific `AppError` subclass rather than a bare `Error` or `createError`.

**OpenAPI**: `server/utils/openapi.ts` builds an OpenAPI 3.0 spec from the same Zod schemas used at runtime (via `@asteasolutions/zod-to-openapi`), served at `/api/openapi.json` and rendered at `/api-docs`. When adding a new API endpoint, define its request/response schemas in `shared/schemas/api/`, register them in `server/utils/openapi.ts`, and reuse them in the route handler — this keeps the runtime validation and the published spec from drifting apart.

**Adventure run state machine** (the core game loop, `server/services/adventure-run.service.ts`): a run advances through node types (`COMBAT`, `EVENT`, `REST`, `CHOICE`, `BLESSING_SELECT`, ...). `advance()` only *transitions into* COMBAT/EVENT state — it does not resolve them. Combat is resolved by `POST /api/adventure/combat/start` (`CombatService`), events by `POST /api/adventure/event/resolve` (`EventService`), blessing picks by `POST /api/adventure/blessing/select` (`BlessingService`). Calling `advance()` again while the run is stuck in an unresolved COMBAT/EVENT state throws.

**Deterministic RNG**: `RngService` drives node generation and combat rolls from a per-run `seed` stored in Firestore. The seed must never be exposed via any API response — `stripSeed()` in `adventure-run.service.ts` is the single sanctioned place that strips it before a run (or any error `details` referencing a run) leaves the service layer. When adding a new code path that returns an `AdventureRun`, route it through `stripSeed()`.

**Auth**: `app/composables/useAuth.ts` (client, Firebase Auth) issues ID tokens; `app/composables/useApi.ts` attaches them as a Bearer header and transparently retries once on 401 after a token refresh. Server-side, `server/utils/auth.ts`'s `requireAuth`/`verifyAuthToken` validate the token via firebase-admin.

## Conventions

- Style is enforced by ESLint (`eslint.config.mjs`): 4-space indent, single quotes, semicolons, trailing commas (`always-multiline`), import ordering — run `pnpm lint` before considering a change done; don't hand-format against these rules.
- Prefer `type` over `interface` (per global TypeScript conventions) — this repo's `shared/types/*` follow that.
- Request/response and Firestore-document shapes are defined once as Zod schemas in `shared/schemas/`, with TS types inferred from them (`z.infer<...>`) in `shared/types/`. Don't hand-write a duplicate type when a schema already exists — extend or reuse the schema.
- Tests are colocated with the code they test (`*.test.ts` next to the source file, e.g. `server/services/combat.service.test.ts`), run under `environment: 'node'`, scoped to `server/**/*.test.ts` only (no frontend test setup exists yet).
- `known-issue.md` and `equipment-ideas.md` at the repo root track known bugs and design ideas in progress — check them for context on why something might look unfinished before "fixing" it.
- **`app/` 排版一律優先使用 Vuetify**：需要格狀/欄位排版時用 `v-row`/`v-col`；需要 flex 對齊（置中、間距、方向）時用 Vuetify utility class（`d-flex`、`flex-column`、`align-center`、`justify-center`、`justify-space-between`、`ga-*` 等）寫在 template 的 `class`，不要在 `<style>` 手刻 `display: flex`/`display: grid` 等純排版 CSS。只有在 Vuetify class 做不到效果時（例如像素風格裝飾用的偽元素邊框、`box-shadow`、`position: absolute` 徽章、非等分的 `grid-template-columns`（如 `auto 1fr auto`）等視覺細節），才允許保留手寫 CSS。
