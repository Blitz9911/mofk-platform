# Mofk Deployment Checklist

## Preflight

- Confirm the working tree contains only intended changes.
- Run `pnpm install --frozen-lockfile` in an environment with npm registry access.
- Run `pnpm run typecheck`.
- Run `pnpm run build`.
- Run API build with `pnpm --filter @workspace/api-server run build`.
- Run mobile checks with `pnpm --filter @workspace/mfk-mobile run typecheck` and `pnpm --filter @workspace/mfk-mobile run test:obd`.

## Supabase

- Apply reviewed SQL migrations only; do not run destructive schema changes against production.
- Confirm RLS is enabled for user-owned tables.
- Confirm users cannot read or mutate another user's vehicles, fuel logs, maintenance, or subscriptions.
- Confirm admin RPC/functions are restricted to admin users.
- Confirm `plan_vehicle_limit()` matches product limits: free 1, mofk/plus 1, family/pro/premium 3, fleet unlimited.

## API Server

- Set `DATABASE_URL`, `PORT`, `JWT_SECRET`, `NODE_ENV=production`, and `CORS_ORIGIN`.
- Confirm `/api/healthz` returns JSON `{ "status": "ok" }`.
- Confirm `/api/auth/login` returns a token for valid local API users.
- Confirm `/api/auth/me` accepts issued API tokens.
- Confirm protected routes return `401` without auth in production.

## Vercel Web

- Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- Ensure Vercel build command targets `artifacts/mfk-web`.
- Verify SPA rewrites in `vercel.json` keep `/app/*`, `/admin/*`, `/pricing`, `/checkout/*`, and `/payment/*` from returning 404 on refresh.
- Verify no production page calls a mock API unless explicitly feature flagged.

## Mobile / Expo

- Set `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, and `EXPO_PUBLIC_API_BASE_URL`.
- Confirm iOS and Android permissions explain BLE usage before release.
- Confirm no service role key or private API token is bundled in Expo.
- Test iPhone, Android phone, tablet, portrait, and landscape.

## Smoke Test

- Register a user.
- Login and logout.
- Add first vehicle with required plate number.
- Try adding a second vehicle on free/mofk and confirm upgrade dialog or server `VEHICLE_LIMIT_REACHED`.
- Add maintenance and fuel records.
- Open pricing, checkout simulation, payment result, and order detail routes.
- Login as admin and verify users, vehicles, revenue, devices, and roles pages.
