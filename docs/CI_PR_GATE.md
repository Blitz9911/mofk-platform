# PR gate and required status checks (Phase 2)

Repository workflows cannot edit GitHub Rulesets. A founder with admin must apply the settings below after this workflow has run at least once on the default branch (GitHub will not list a check name until then).

## Design

| Workflow | When it runs | Required in Ruleset? |
|---|---|---|
| `PR Gate` / job **`PR required checks`** | Every pull request | **Yes — this is the permanent required check** |
| `Mobile Typecheck` / `Check mobile TypeScript` | Path-filtered (unchanged Windows / Node 20) | **No** (would block docs-only and workforce-only PRs when skipped) |
| `AI Workforce Config Validate` | Path-filtered | **No** (same skip problem). The gate re-runs validation when workforce paths change. |

Path selection lives in `.github/scripts/select-ci-paths.mjs`.

- Mobile suite: `artifacts/mfk-mobile/**`, `lib/api-client-react/**`, root `package.json`, lockfile, workspace, `tsconfig.base.json`, and the mobile/gate workflows.
- Workforce suite: `agents/`, `policies/`, templates, listed docs, CODEOWNERS, issue/PR templates, workforce scripts and workflows.
- Docs such as `docs/obd-ble-integration.md` select **neither**. The gate still reports success via skip stubs.
- If `git diff` cannot be computed, selection **fail-closes** and runs **both** suites.

Permissions: `contents: read` only. No secrets. No production environment.

## Manual Ruleset updates (`main`)

Settings → Rules → Rulesets (or Settings → Branches):

1. Keep: require PR, 1 human approval, dismiss stale reviews, require CODEOWNERS (once enabled), no force push, no deletion.
2. **Required status checks** — set to:
   - `PR required checks`
3. **Remove** (if present):
   - `Check mobile TypeScript`
   - `Validate agent registry and GitHub templates`
4. Require the branch to be up to date before merge (recommended).
5. Do not allow administrators to skip `PR required checks` except a documented break-glass path.

Do not add Ubuntu full-repo typecheck as a required check. Do not attach production secrets to this workflow.

## After changing the gate

PRs that only touch `.github/workflows/pr-gate.yml` select **both** suites so the classifier cannot be weakened without running mobile typecheck and workforce validation.
