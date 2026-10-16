# AI workforce bootstrap review

Date: 2026-10-16. Branch: `claude/laughing-allen-brmoax` from `main` @ `a65efdf`.
Scope: configuration and documentation only. No application, database, auth, payment, binding, dependency, or deploy file is changed by this PR.

## 1. Repository architecture assessment

| Area | What is there |
|---|---|
| Workspace | pnpm 10 monorepo (`pnpm-workspace.yaml`: `artifacts/*`, `lib/*`, `lib/integrations/*`, `scripts`), catalog versions, `minimumReleaseAge: 1440`, Windows-only native devDependencies in root `package.json` |
| Apps | `artifacts/mfk-mobile` (Expo / React Native, Supabase client), `artifacts/mfk-web` (Vite + React, Supabase client), `artifacts/api-server` (Express 5, drizzle, pino), `artifacts/mock-api`, `artifacts/mockup-sandbox` |
| Shared libs | `lib/db` (drizzle schema, `push` / `push-force` scripts), `lib/api-spec` (OpenAPI + orval), generated `lib/api-zod` and `lib/api-client-react`, `lib/supabase.ts` |
| Database | `supabase1/supabase/mofk_schema.sql`, drizzle schema in `lib/db/src/schema/mfk.ts` |
| Deploy / hosting | `.replit` (autoscale deployment, `scripts/post-merge.sh` runs `pnpm --filter db push` after merges), `vercel.json` (SPA rewrites), `.replit-artifact/artifact.toml` per app |
| CI | One workflow on `main`: `.github/workflows/mobile-typecheck.yml` (Windows, Node 20, `pnpm install --no-frozen-lockfile`, builds API client, typechecks mobile; `contents: read`) |
| OBD / BLE | Not on `main`. Lives on `feature/obd-ble-integration`, `feat/vehicle-health-intelligence` (`artifacts/mfk-mobile/src/obd/**`, `lib/obd/**`). Paths in the registry anticipate it |

### Pre-existing issues found (not fixed here; out of scope)

1. **Critical – API authentication is not verified on `main`.** `artifacts/api-server/src/lib/auth.ts` `authMiddleware` sets `req.userId` to any bearer token longer than 10 characters, and falls back to the demo user without one. Any caller can act as any user. `cors()` is open to all origins. The unmerged feature branches improve this but still accept an unverified Supabase JWT `sub` (`decodeSupabaseJwt` does not check the signature), which also reaches `requireAdmin`. Needs a human-approved `auth_policy` change.
2. **High – merge triggers a schema push.** `scripts/post-merge.sh` runs `drizzle-kit push` against whatever `DATABASE_URL` the Replit environment holds. Any merge to `main`, including an agent-authored one, can alter the live schema. Consider moving this to an explicit, human-run migration step.
3. **Medium – lockfile drift.** `pnpm install --frozen-lockfile` fails on `main`: `artifacts/api-server/package.json` declares `drizzle-orm ^0.44.0`, `@types/node ^22.0.0`, and `zod ^3.24.1`, while the lockfile records `catalog:`. The CI workflow works around it with `--no-frozen-lockfile`, which lets CI resolve versions the lockfile never recorded (`minimumReleaseAge` still applies). `post-merge.sh` uses `--frozen-lockfile` and will fail.
4. **Medium – full workspace typecheck is red.** `pnpm run typecheck` reports 296 errors, all in `artifacts/api-server`, caused by two drizzle-orm copies (0.44.7 from the api-server manifest, 0.45.2 from the catalog). Fixing issue 3 likely fixes this.
5. **Low – Node 20 is end-of-life (April 2026).** `mobile-typecheck.yml` and the validator's check pin it. Left as is to avoid changing existing CI; the new workflows use Node 22.
6. **Low – Windows-only tooling.** Root devDependencies and `.claude/launch.json` assume Windows; `pnpm-workspace.yaml` overrides strip other platforms' native binaries. Linux installs still succeed.

## 2. AI workforce configuration review

Sources inspected: remote branches `chore/ai-workforce-clean` (`bb4db32`, 32 files, workforce only) and `chore/ai-workforce-bootstrap` (`fb50532`).

- `chore/ai-workforce-bootstrap` is **not safe to use as a base**: it carries ~60 unrelated feature commits (checkout/payment pages, auth rewrites, Supabase migrations, lockfile changes, 317 files).
- This PR takes the package from `chore/ai-workforce-clean` and amends it.

### Package placement
Correct after this PR: `agents/` (BASE, 14 roles, registry, schema, contracts), `policies/AGENT_POLICY.md`, `docs/`, `templates/` (pointers), `.github/` (CODEOWNERS, issue form, PR template, scripts, workflows). Every role in the registry has an instruction file and vice versa (validator enforces).

### Findings and changes

| # | Finding in the original package | Change in this PR |
|---|---|---|
| 1 | `allowedPaths` was the only scope, with no defined meaning (read or write?). L0 agents (orchestrator, engineering-lead) listed `agents/**` and `policies/**`, which would let them rewrite their own rules | Added `writablePaths` (the only write scope). L0 agents have none (schema + validator). `allowedPaths` is now documented as read focus |
| 2 | `software-engineer` could write `lib/**` and all of `artifacts/api-server/**`, covering DB schema, auth, subscriptions, and the pair-adapter route | Added `protectedPaths` (37 patterns) that always win: auth, payment/pricing/checkout, device binding, DB/migrations/seed, deploy config, `.env*`, every `package.json`, lockfile, `pnpm-workspace.yaml`, `.npmrc`, `.github/`, `agents/`, `policies/` |
| 3 | `devops` could write `.github/workflows/**`. Same-repo `pull_request` workflows run with repository secrets, so this is a secret-exfiltration path | `devops` writes `docs/**` only and proposes workflow patches; docs require the GitHub App to lack the Workflows permission |
| 4 | `qa-automation` could write all of `artifacts/**`, so it could change the code it verifies | Restricted to test files and `docs/qa/**` |
| 5 | `cybersecurity` (L2) could write everywhere including `supabase1/**` | Writes `docs/security/**` only |
| 6 | Nothing enforced any path rule; only prompts | New `Agent path guard` workflow and script, loaded from the PR base commit |
| 7 | Handoff contract was a list of field names; no task status model, no test-report rules, no approval format | `agents/contracts/`: handoff report, test report, approval record (JSON Schema 2020-12), task lifecycle with human-only transitions |
| 8 | No machine-readable OBD command policy | `obdCommandPolicy`: default deny, read-only modes, mode 04/05/08 and UDS write/control services denied |
| 9 | No check that `minimumReleaseAge` survives | Validator fails if it drops below 1440 or a bare `*` exclusion appears |
| 10 | `mfk-ai-pr-checks.yml` "disabled" stub referred to a workflow that never existed on `main` | Left out; validator no longer requires it (still checks it if present) |
| 11 | Config validator had PR path filters, but docs said to make it a required check. A path-filtered required check blocks unrelated PRs forever | Removed the `pull_request` path filter (job is ~10 s, no install). Docs warn against requiring `Check mobile TypeScript` for the same reason |
| 12 | Validator required `version: 1`, dead code (`forbiddenAppTouches`, `relative`) | Registry `version: 2`; dead code removed; new invariants (no agent above L2, protected paths map to known operations, workflows: no `pull_request_target`, no secrets in `ai-*`, PR strings passed via `env`) |
| 13 | Role prompts did not mention branch naming, contracts, or escalation for protected files | `agents/BASE.md` and the devops, qa, cybersecurity, orchestrator, obd-iot prompts updated |

### Responsibilities and boundaries (after changes)

| Agent | Max level | Writes | Hands off to | Human decision |
|---|---|---|---|---|
| orchestrator | L0 | nothing | product-lead, engineering-lead | yes |
| product-lead, product-manager, business-analyst, ux-reviewer, product-analytics, uat | L0 | nothing (reports as comments) | per registry | varies |
| engineering-lead | L0 | nothing | software-engineer, obd-iot, data-recommendations, devops | yes |
| software-engineer | L2 | mobile, web, api-server, api-spec/zod/client, docs (minus protected) | qa-automation, cybersecurity | yes |
| obd-iot | L1 | `src/obd/**`, `lib/obd/**`, OBD test scripts and docs (minus binding) | qa, cybersecurity, software-engineer | yes |
| data-recommendations | L1 | maintenance/recommendation libs and tests, docs | qa, software-engineer | yes |
| devops | L2 | docs only | qa, cybersecurity | yes |
| qa-automation | L2 | tests, `docs/qa/**` | cybersecurity | yes |
| cybersecurity | L2 | `docs/security/**` | none (human) | yes |

## 3. Proposed runtime architecture

See `docs/ORCHESTRATION_SERVICE_PLAN.md`: deterministic orchestrator (not an LLM) applying `task-status.json`, a token broker that mints per-run GitHub App tokens by level, ephemeral sandboxes with an egress allow-list and no hardware, an append-only audit store separate from the product database, an approval verifier, and a stop button. Five gated phases (A–E) with exit criteria; `operational` stays false until phase E sign-off.

## 4. Security and permissions assessment

**Written instructions do not enforce anything.** After this PR, the enforceable layers are:

| Layer | Enforces | State |
|---|---|---|
| Path guard (`ai-agent-path-guard.yml`) | Per-agent write scope and protected paths on `agent/<id>/<task>` PRs; renames caught (`--no-renames`); fails closed on diff errors; guard + registry read from base commit; no head code executed; PR strings via `env` | In repo. **Not enforcing** until a human makes it a required check |
| Config validator | Registry/contract invariants, `minimumReleaseAge`, workflow hygiene | In repo. Not required until a human sets it |
| GitHub App permissions | No Workflows permission, so agents cannot change workflows or reach secrets that way | **Human action** (`docs/github-controls.md` §4) |
| Ruleset | Agent app can push only `agent/**` | **Human action** |
| Branch protection | PR + human review + required checks on `main` | **Human action** |
| `production` environment | L4 second human | **Human action** |

Residual risks:
- Path rules are file-name based. A new file (for example `plans.tsx`) can hold pricing logic without matching a protected pattern. Independent QA/security review and human review remain necessary.
- Until the GitHub settings above are applied, any agent with a write token could bypass every repo-side control. **Do not issue write tokens before phase A is complete.**
- CODEOWNERS uses a personal handle; it only enforces once "Require review from Code Owners" is on.
- The API authentication issue in section 1 is the largest current risk to customer data and is independent of the workforce.

Mandatory constraints respected in this work: no production DB access, no deploys, no changes to payment/auth/binding code, no vehicle commands, no credential or security-policy edits, existing workflow untouched, nothing merged, `minimumReleaseAge` unchanged and now guarded.

## 5. Test results

Environment: Linux, Node v22.22.0, pnpm 10.28.0. All runs on this branch unless noted.

| Check | Command | Result |
|---|---|---|
| Workforce config validator | `node .github/scripts/validate-ai-workforce.mjs` | **pass** (exit 0) |
| Validator negative test (scratch copy with L0 write scope, L3 agent, agent→approved transition, `minimumReleaseAge: 0`, inline `head.ref`) | same | **fail as expected**, 5/5 violations reported |
| Path guard unit tests | `node --test .github/scripts/agent-path-guard.test.mjs` | **pass** 9/9 |
| Path guard end to end (scratch clone, real git diff) | allowed file / auth edit + pricing rename / L0 agent / bad base | exit 0 / 1 (2 DENY) / 1 (4 DENY) / 1 (clean FAIL) — **as expected** |
| JSON Schema validation (ajv 8, draft 2020-12) | registry, handoff, test-report, approval-record + 8 negative cases | **pass** 12/12 as expected |
| YAML parse | all `.github/workflows/*.yml`, `.github/ISSUE_TEMPLATE/*.yml` | **pass** |
| Install, as in CI | `pnpm install --no-frozen-lockfile` (lockfile restored afterwards) | **pass** |
| Install, frozen | `pnpm install --frozen-lockfile` | **fail, pre-existing** on `main` (issue 3) |
| API client build, as in CI | `pnpm exec tsc --build lib/api-client-react/tsconfig.json --force` | **pass** |
| Mobile typecheck, as in CI | `pnpm --filter @workspace/mfk-mobile typecheck` | **pass** on `main` and on this branch |
| Full workspace typecheck | `pnpm run typecheck` | **fail, pre-existing** on `main`: 296 errors in `artifacts/api-server` (issue 4); this PR touches no TypeScript in the workspace |
| GitHub Actions run of the new workflows | — | **not tested** locally; will run on this PR. Path guard prints a bootstrap note on this PR because `main` has no guard yet |
| Windows runner behaviour of `mobile-typecheck.yml` | — | **not tested** (Linux only); workflow file unchanged |
