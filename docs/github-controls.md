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

After these workflows have run on the default branch at least once, add required status checks:

- `Validate agent registry and GitHub templates` (from `ai-workforce-config-validate.yml`)
- `Agent path guard` (from `ai-agent-path-guard.yml`)

Both run on every PR with no path filter, so they are safe to require. Do **not** require `Check mobile TypeScript` as it stands: it has a path filter and would leave unrelated PRs waiting forever.

If `Check mobile TypeScript` is already required on `main`, keep it.

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
| L1–L2 | short-lived contents write **limited to `agent/**` branches**, pull-requests write |
| L3–L4 | no token; humans only |

Do not give the app: **`workflows`**, `administration`, `secrets`, `environments`, `actions` write, ability to edit rulesets, or production environment secrets.

Without the `workflows` permission GitHub rejects any push that changes `.github/workflows/`. This matters because `pull_request` workflows on same-repository branches run with repository secrets, so an agent that could edit workflows could read them.

### Ruleset that keeps the app on agent branches

Settings → Rules → Rulesets → New branch ruleset:

- Target: all branches **except** `agent/**`
- Rules: Restrict creations, Restrict updates, Restrict deletions
- Bypass list: repository admins and maintainers (humans). Do **not** add the agent app.

Result: the app can push only to `agent/**`. The `Agent path guard` check then limits which files each `agent/<id>/<task>` branch may change.

### Repository variable

Settings → Secrets and variables → Actions → Variables: `MFK_AGENT_APP_LOGIN` = the app's bot login (for example `mfk-agent[bot]`). The path guard fails any PR by that login that is not on an `agent/**` branch.

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
| Config validator workflow | yes | not a required check until §1 |
| Agent path guard (`writablePaths`/`protectedPaths`) | yes | not a required check until §1; needs §4 ruleset + no Workflows permission |
| `minimumReleaseAge` guard | validator check | only as strong as the required check |
| Mobile typecheck Windows/Node 20 | unchanged | unchanged |
| Protected `main` | documented | **human** |
| `production` environment | documented | **human** |
| GitHub App | documented | **human** |
| Orchestrator / sandbox | no | not started |
