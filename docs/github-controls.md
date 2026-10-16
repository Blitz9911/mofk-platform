# GitHub controls that require a human (Phase 0)

This repository cannot turn these on from a markdown file. A founder with admin on `Blitz9911/mofk-platform` must apply them in the GitHub UI or via an audited admin API session. Do not create production write tokens to do this.

CODEOWNERS, workflows, and `agents/registry.json` do **not** replace these settings.

## 1. Protect `main`

Settings → Branches → Branch protection rule (or Ruleset) for `main`:

- Require a pull request before merging
- Required approvals: at least 1 (founder or designated human; not an AI identity)
- Dismiss stale reviews
- Require review from Code Owners (**this is what makes `.github/CODEOWNERS` enforceable**)
- Do not allow bypass of the above for admins, or keep bypass as a break-glass path owned by the founder only
- Do not allow force pushes
- Do not allow deletions
- Require conversation resolution
- Block merge if PR template fail-closed checklist is incomplete (process; GitHub cannot parse the checklist unless you add an extra required status)

After `pr-gate.yml` has run on the default branch at least once, replace the two **path-filtered** check names that the gate already covers with this single required check:

- `PR required checks`

Do **not** require `Check mobile TypeScript` or `Validate agent registry and GitHub templates`. GitHub treats a missing required check as a merge blocker, which would stall documentation-only and AI Workforce PRs. Keep any other already-required security, build, or review checks that are not covered by this gate.

Keep `.github/workflows/mobile-typecheck.yml` as the Windows / Node 20 / pnpm 10.34.7 historical job (frozen-lockfile install). The gate re-runs that same typecheck, including Expo Router type generation, when mobile or shared-dependency paths change. Details: `docs/CI_PR_GATE.md`.

Do not replace the mobile Windows/Node 20 workflow with Ubuntu typecheck.

## 2. Protect other long-lived branches (optional but recommended)

Same ruleset for `feat/vehicle-health-intelligence` or any branch that can ship OTA, if it must not receive direct agent pushes.

## 3. Production environment

Settings → Environments → New environment named `production`:

- Required reviewers: founder, plus a second human if available (`production-environment-reviewer` in the registry)
- Wait timer: optional
- Deployment branches: only `main`
- Secrets: production credentials only in this environment, not in Actions repository secrets used by PR workflows
- Prevent self-review: the environment reviewer must not be the PR author

Until this environment exists, **L4 is fail-closed**. No workflow in this repo should deploy production.

Do **not** attach production secrets to `pull_request` workflows. The config-validate workflow uses `contents: read` and no secrets.

## 4. Least-privilege GitHub App (not created here)

Create a GitHub App (or classic bot) for future agent runs:

| Level | Token |
|---|---|
| L0 | `contents: read` only |
| L1–L2 | short-lived contents write **limited to non-protected branches**, pull-requests write |
| L3–L4 | no token; humans only |

Do not give the app: `administration`, environment secret write, ability to edit rulesets, or production environment secrets.

## 5. Audit and billing

- Enable GitHub audit log retention per org policy
- Cap Actions minutes / Copilot / API spend
- Store agent run metadata outside production databases (not implemented)

## 6. Secrets segregation

- PR CI: no production, no Stripe live, no Supabase service role, no EAS production token
- UAT OTA: existing human-gated process only; not an agent permission
- Test/sandbox secrets: separate project

## 7. What this repo did vs what GitHub still must do

| Control | In repo | Enforced |
|---|---|---|
| CODEOWNERS paths | yes | no, until rule in §1 |
| Issue / PR templates | yes | templates apply after default-branch merge |
| Config validator workflow | yes | via gate when workforce paths change |
| PR gate / `PR required checks` | yes | **human must add the required check name** |
| Mobile typecheck Windows/Node 20 / pnpm 10.34.7 | path-filtered workflow with frozen-lockfile | do not require this job name |
| Protected `main` | documented | **human** |
| `production` environment | documented | **human** |
| GitHub App | documented | **human** |
| Orchestrator / sandbox | no | not started |
