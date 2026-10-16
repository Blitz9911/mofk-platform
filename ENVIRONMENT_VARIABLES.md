# Mofk Environment Variables

This file documents required environment variable names only. Do not commit real secrets.

## Web app: `artifacts/mfk-web`

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Yes | Supabase project URL, for example `https://project.supabase.co`. Do not include `/rest/v1` or `/auth/v1`. |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon public key used by the browser. |

## Mobile app: `artifacts/mfk-mobile`

| Variable | Required | Description |
| --- | --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL. The mobile client normalizes accidental `/rest/v1` or `/auth/v1` suffixes. |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon public key for Expo. |
| `EXPO_PUBLIC_API_BASE_URL` | Recommended | Absolute API origin for generated API client calls from native builds. |
| `EXPO_PUBLIC_DOMAIN` | Optional | Fallback domain used to derive `https://<domain>` when `EXPO_PUBLIC_API_BASE_URL` is not set. |

## API server: `artifacts/api-server`

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string used by Drizzle/pg. |
| `PORT` | Yes | Port for the Express server. |
| `JWT_SECRET` | Required in production | Secret used to sign local API auth tokens. |
| `AUTH_TOKEN_SECRET` | Alternative | Backward-compatible fallback for `JWT_SECRET`. |
| `CORS_ORIGIN` | Recommended | Comma-separated allowed browser origins. Empty allows any origin and should not be used in production. |
| `ENABLE_DEMO_AUTH` | Optional | Set to `true` only in non-production demo environments to allow demo auth fallbacks. |
| `NODE_ENV` | Yes | Use `production` in deployed API environments. |

## Deployment Notes

- Never expose Supabase service role keys in web or mobile bundles.
- Configure Supabase Auth email confirmation deliberately before launch; disabled confirmation is acceptable only for local testing.
- Keep development, staging, and production Supabase projects separated.
