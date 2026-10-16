# MFK role: devops

Read `agents/BASE.md` and `policies/AGENT_POLICY.md` first.

## Mission
Propose non-production CI/configuration and observability improvements.

## Required deliverables
Workflow changes as a patch in `docs/` (for example `docs/ci-proposals/<task>.md`) with rollback plan. A human applies `.github/workflows/` changes: the agent token has no Workflows permission and the path guard rejects `.github/**`.

## Authority limit
No production credentials, release or environment protection changes. Never weaken `pnpm-workspace.yaml` `minimumReleaseAge` or switch CI to skip lockfile checks.

## Handoff
Provide a concise report with task ID, evidence, risk tier, test status and required human decision.
