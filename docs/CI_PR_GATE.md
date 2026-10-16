# PR gate and required status checks (Phase 2)

Repository workflows cannot edit GitHub Rulesets. A founder with admin must apply the settings below after this workflow has run at least once on the default branch (GitHub will not list a check name until then).

This gate does **not** run API integration tests, RLS checks, BLE hardware tests, or a full application suite. It classifies paths, typechecks mobile when selected, validates workforce config when selected, and always runs the offline AI sandbox unit tests.

## Design

| Workflow | When it runs | Required in Ruleset? |
|---|---|---|
| `PR Gate` / job **`PR required checks`** | Every pull request (no path filter on the workflow) | **Yes — this is the permanent required check that replaces the two path-filtered names below** |
| `PR Gate` / job **`AI sandbox tests`** | Every pull request (not path-filtered) | Indirectly, because `PR required checks` fails if this job fails |
| `Mobile Typecheck` / `Check mobile TypeScript` | Path-filtered Windows / Node 20 / pnpm 10.34.7 | **No** (would block docs-only and workforce-only PRs when skipped) |
| `AI Workforce Config Validate` | Path-filtered | **No** (same skip problem). The gate re-runs validation when workforce paths change. |

Keep any other security, build, or review checks that GitHub already requires and that this gate does not cover.

Path selection lives in `.github/scripts/select-ci-paths.mjs`.

- Mobile suite: `artifacts/mfk-mobile/**`, `lib/api-client-react/**`, root `package.json`, lockfile, workspace, `tsconfig.base.json`, `mobile-typecheck.yml`, `pr-gate.yml`, and the classifier script plus its tests.
- Workforce suite: `agents/`, `policies/`, templates, listed docs (including AI runtime/adapter/sandbox docs), CODEOWNERS, issue/PR templates, workforce scripts and workflows.
- Changing the classifier script or its tests selects **both** suites.
- Docs such as `docs/obd-ble-integration.md` select **neither** mobile nor workforce. Skip stubs still have to succeed. Sandbox tests still run.
- Comparison uses `git diff --name-only --no-renames BASE...HEAD` (merge-base). Deleted paths are included; renames appear as delete plus add. Windows separators are normalized.
- If `git diff` cannot be computed, or classifier outputs are missing/not exactly `true`/`false`, the gate **fail-closes** (runs both suites, or fails `PR required checks`).
- Skip jobs run only when the matching output is exactly `false`.

## Mobile typecheck

- Windows, Node 20, **pnpm 10.34.7**, `pnpm install --frozen-lockfile`.
- `pnpm exec tsc --build lib/api-client-react/tsconfig.json --force --pretty false`
- `pnpm --filter @workspace/mfk-mobile typecheck` which is `node scripts/generate-router-types.cjs && tsc -p tsconfig.json --noEmit`.
- Router types are generated from Expo Router internal APIs without Metro. `.expo/` stays gitignored.

Verified locally with pnpm 10.34.7 (not the global pnpm 12 install). GitHub Actions still has to prove the same on `windows-latest`.

Permissions: `contents: read` only. No production secrets. No `pull_request_target`.

## Manual Ruleset updates (`main`)

Settings → Rules → Rulesets (or Settings → Branches):

1. Keep: require PR, 1 human approval, dismiss stale reviews, require CODEOWNERS (once enabled), no force push, no deletion.
2. For the two path-filtered checks this gate already covers, **required status checks** should be:
   - `PR required checks`
3. **Remove** those two names if present:
   - `Check mobile TypeScript`
   - `Validate agent registry and GitHub templates`
4. Do not remove unrelated required checks (security, build, review) that this gate does not run.
5. Require the branch to be up to date before merge (recommended).
6. Do not allow administrators to skip `PR required checks` except a documented break-glass path.

Do not add Ubuntu full-repo typecheck as a required check. Do not attach production secrets to this workflow.

## After changing the gate

PRs that only touch `.github/workflows/pr-gate.yml` or the classifier script/tests select **both** mobile and workforce suites so the classifier cannot be weakened without running those jobs.
