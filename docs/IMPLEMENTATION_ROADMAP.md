# Implementation roadmap: gated autonomy

## Phase 0 — controls first
**Repo-side (this branch):** documented in `docs/github-controls.md`. CODEOWNERS is a hint only.
**Still human / GitHub UI:** protect `main`, create `production` environment with required reviewers, GitHub App with contents:read, audit log retention, segregated test secrets, billing limits. Assign a human owner. No production write tokens.

## Phase 1 — read-only configuration
**Repo-side (this branch):** `agents/registry.json`, GitHub issue/PR templates, CODEOWNERS, isolated config-validation workflow (does not run mobile typecheck).
**Still human:** enable “Require review from Code Owners”, required status checks after the workflow exists on the default branch, benchmark 10 historic issues with product-manager / engineering-lead / cybersecurity **prompts only**. Do not issue write tokens.

## Phase 2 — isolated implementation
Add software engineer and QA on single-task sandbox branches; create PRs (no auto-merge). Run workflow; require founder approval.

## Phase 3 — specialized OBD/product
Add OBD and recommendations agents using simulators/recorded synthetic responses, test matrices for unsupported PIDs and fail-safe timeouts. No live vehicle-write access.

## Phase 4 — governed automation
Introduce orchestration service, queue, execution audit, rate/time/token cost caps, dead-letter retries, rollbacks, stop button. Protect production with separate human reviewer. Add staged canaries and release observability.

## Success metrics
PR rollback rate, escaped bugs, false approvals, security findings, review turnaround, flaky tests, cost per merged PR, percentage of tasks completed without rework.
