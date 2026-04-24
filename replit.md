# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## MFK — Smart Vehicle Diagnostics

Arabic-first RTL platform for KSA. Dark theme with orange (#F35D19) accent.

### Artifacts
- `artifacts/api-server` — Express 5 backend, mounted at `/api`
- `artifacts/mfk-web` — React + Vite frontend, mounted at `/`

### App areas
- `/` marketing landing, `/features`, `/how`, `/pricing`, `/workshops`, `/login`
- `/app/*` user dashboard: overview, vehicles, diagnostics, dtc, maintenance, workshops, bookings, assistant, recommendations, subscription
- `/admin/*` admin: overview, users, vehicles, diagnostics, issues, workshops, revenue

### Demo data
Seeded via `cd artifacts/api-server && ../mfk-web/node_modules/.bin/tsx src/seed.ts`. Demo user عبدالله السلمي (`DEMO_USER_ID` in `artifacts/api-server/src/lib/demo.ts`) has 3 vehicles + 24 other Arabic users, 10 workshops, sessions, telemetry, DTCs, maintenance, bookings, recommendations, health history, activity, revenue.

### Routing notes
- Wouter base set to `BASE_URL`; nested `AppRoutes`/`AdminRoutes` use absolute paths because parent wildcard does not strip prefix.
- Parent uses both `path="/app"` and `path="/app/*?"` so the bare URL also matches.

### DB query convention
Use drizzle `inArray(col, arr)` instead of `sql\`... = ANY(${arr})\`` — the sql template tag expands arrays as separate placeholders and produces invalid SQL.
