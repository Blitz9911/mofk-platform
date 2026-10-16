# Phase 0 / 1 validation report

**Agents are not operational.** `agents/registry.json` sets `operational: false`. There is no orchestrator, sandbox runner, or scoped GitHub App.

## Implemented in this branch (repo files only)

- Machine-readable `agents/registry.json` with IDs, responsibilities, allowed paths, forbidden actions, max levels, and handoff next-agent lists
- JSON Schema at `agents/registry.schema.json`
- GitHub issue form `.github/ISSUE_TEMPLATE/mfk-task.yml` and PR template `.github/pull_request_template.md`
- `.github/CODEOWNERS` for sensitive paths, with an explicit non-enforcement comment
- Isolated workflow `.github/workflows/ai-workforce-config-validate.yml` (Node 22, no pnpm install, no app typecheck, no path filter on PRs so it can be required)
- `.github/workflows/ai-agent-path-guard.yml` + `.github/scripts/agent-path-guard.mjs`: enforces `writablePaths` / `protectedPaths` on `agent/<id>/<task>` branches, loaded from the base commit
- Handoff, test-report, approval-record schemas and task lifecycle in `agents/contracts/`
- Existing `.github/workflows/mobile-typecheck.yml` unchanged (Windows + Node 20)
- No `mfk-ai-pr-checks.yml`: that workflow never existed on `main`, so the disabled stub from the earlier draft was left out
- Fail-closed rules in `policies/AGENT_POLICY.md`, `docs/FAIL_CLOSED_APPROVALS.md`, and the registry
- Human GitHub UI checklist in `docs/github-controls.md`

## Validator results

Run locally:

```
node .github/scripts/validate-ai-workforce.mjs
node --test .github/scripts/agent-path-guard.test.mjs
```

The validator does not prove agents can run. It checks files, templates, CODEOWNERS hints, registry invariants (L0 has no write scope, no agent above L2, required protected paths), contract invariants (only humans reach `approved`/`done`), that `minimumReleaseAge` stays at 1440 or more, that no workflow uses `pull_request_target`, and that mobile typecheck still specifies Windows/Node 20. Results for this branch are in `docs/AI_WORKFORCE_BOOTSTRAP_REVIEW.md`.

## Still requires external / human configuration

- Protect `main` (PR + code-owner review + no force push)
- Make `Validate agent registry and GitHub templates` and `Agent path guard` required status checks after they have run on the default branch
- Create GitHub Environment `production` with required human reviewers and no PR-job secrets
- Create a least-privilege GitHub App (L0 `contents: read` only for now; never the Workflows permission) and a ruleset limiting it to `agent/**`
- Replace `@Blitz9911` CODEOWNERS entries with an org team if one is created
- Audit log retention and billing caps
- Orchestrator, queue, sandbox, audit store, stop button (Phase 4)
- Independent agent identities for implement vs QA vs security

## Unresolved risks

- CODEOWNERS is ignored until branch protection requires it
- Invalid GitHub handles in CODEOWNERS are silently dropped
- Prompt files are not access control
- The path guard is only as strong as the ruleset that keeps the agent app on `agent/**` branches and the missing Workflows permission
- Issue `contact_links` points at the repo root, not a branch that may be unpushed
- No test that humans actually approve L3/L4 in GitHub
