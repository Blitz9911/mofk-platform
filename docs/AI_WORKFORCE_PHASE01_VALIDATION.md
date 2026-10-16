# Phase 0 / 1 validation report

**Agents are not operational.** `agents/registry.json` sets `operational: false`. There is no orchestrator, sandbox runner, or scoped GitHub App.

## Implemented in this branch (repo files only)

- Machine-readable `agents/registry.json` with IDs, responsibilities, allowed paths, forbidden actions, max levels, and handoff next-agent lists
- JSON Schema at `agents/registry.schema.json`
- GitHub issue form `.github/ISSUE_TEMPLATE/mfk-task.yml` and PR template `.github/pull_request_template.md`
- `.github/CODEOWNERS` for sensitive paths, with an explicit non-enforcement comment
- Isolated workflow `.github/workflows/ai-workforce-config-validate.yml` (Node 20, no pnpm, no app typecheck)
- Previous Ubuntu full typecheck in `mfk-ai-pr-checks.yml` disabled (`workflow_dispatch` only)
- Existing `.github/workflows/mobile-typecheck.yml` left on Windows + Node 20
- Fail-closed rules in `policies/AGENT_POLICY.md`, `docs/FAIL_CLOSED_APPROVALS.md`, and the registry
- Human GitHub UI checklist in `docs/github-controls.md`

## Validator results

Run locally: `node .github/scripts/validate-ai-workforce.mjs`

That script does not prove agents can run. It only checks files, templates, CODEOWNERS hints, and that mobile typecheck still specifies Windows/Node 20.

## Still requires external / human configuration

- Protect `main` (PR + code-owner review + no force push)
- Make `Validate agent registry and GitHub templates` a required status check after it has run on the default branch
- Create GitHub Environment `production` with required human reviewers and no PR-job secrets
- Create a least-privilege GitHub App (L0 `contents: read` only for now)
- Replace `@Blitz9911` CODEOWNERS entries with an org team if one is created
- Audit log retention and billing caps
- Orchestrator, queue, sandbox, audit store, stop button (Phase 4)
- Independent agent identities for implement vs QA vs security

## Unresolved risks

- CODEOWNERS is ignored until branch protection requires it
- Invalid GitHub handles in CODEOWNERS are silently dropped
- Prompt files are not access control
- Issue `contact_links` points at the repo root, not a branch that may be unpushed
- No test that humans actually approve L3/L4 in GitHub
