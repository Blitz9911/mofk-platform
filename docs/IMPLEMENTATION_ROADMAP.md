# Implementation roadmap: gated autonomy

## Phase 0 — controls first
**Repo-side (this branch):** documented in `docs/github-controls.md`. CODEOWNERS is a hint only.
**Still human / GitHub UI:** protect `main`, create `production` environment with required reviewers, GitHub App with contents:read, audit log retention, segregated test secrets, billing limits. Assign a human owner. No production write tokens.

## Phase 1 — read-only configuration
**Repo-side (this branch):** `agents/registry.json`, GitHub issue/PR templates, CODEOWNERS, isolated config-validation workflow (does not run mobile typecheck).
**Still human:** enable “Require review from Code Owners”, required status checks after the workflow exists on the default branch, benchmark 10 historic issues with product-manager / engineering-lead / cybersecurity **prompts only**. Do not issue write tokens.

## Phase 2 — CI hardening (repo) and isolated implementation (later)
**Repo-side:** `PR Gate` workflow always runs on pull requests. Path selection in `.github/scripts/select-ci-paths.mjs` runs Windows/Node 20 mobile typecheck only for mobile/shared-dependency changes, and workforce validation only for agent/policy/template/CI-config changes. Docs-only PRs get skip stubs. Existing `mobile-typecheck.yml` is preserved. Humans must require status check `PR required checks` (`docs/CI_PR_GATE.md`).
**Still later:** software engineer and QA on single-task sandbox branches; PRs with no auto-merge; founder approval. No agent write tokens.

## Phase 3 — simulation runtime (this branch) then specialized OBD/product
**Repo-side:** offline deterministic runtime in `agents/runtime/` (no LLM, no GitHub writes, no production). Pipeline stops at human approval. See `docs/AGENT_RUNTIME.md`. `operational` stays false.
**Still later:** OBD and recommendations agents using simulators/recorded synthetic responses only. No live vehicle-write access.

## Phase 4 — governed automation
Introduce orchestration service, queue, execution audit, rate/time/token cost caps, dead-letter retries, rollbacks, stop button. Protect production with separate human reviewer. Add staged canaries and release observability.

## Success metrics
PR rollback rate, escaped bugs, false approvals, security findings, review turnaround, flaky tests, cost per merged PR, percentage of tasks completed without rework.
