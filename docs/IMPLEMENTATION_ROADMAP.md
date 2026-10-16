# Implementation roadmap: gated autonomy

## Phase 0 — controls first
**Repo-side (this branch):** documented in `docs/github-controls.md`. CODEOWNERS is a hint only.
**Still human / GitHub UI:** protect `main`, create `production` environment with required reviewers, GitHub App with contents:read, audit log retention, segregated test secrets, billing limits. Assign a human owner. No production write tokens.

## Phase 1 — read-only configuration
**Repo-side (this branch):** `agents/registry.json`, GitHub issue/PR templates, CODEOWNERS, isolated config-validation workflow (does not run mobile typecheck).
**Still human:** enable “Require review from Code Owners”, required status checks after the workflow exists on the default branch, benchmark 10 historic issues with product-manager / engineering-lead / cybersecurity **prompts only**. Do not issue write tokens.

## Phase 2 — CI hardening (repo) and isolated implementation (later)
**Repo-side:** `PR Gate` workflow always runs on pull requests. Path selection in `.github/scripts/select-ci-paths.mjs` runs Windows/Node 20/pnpm 10.34.7 mobile typecheck (`--frozen-lockfile`, Expo Router types generated before `tsc`) only for mobile/shared-dependency or classifier-script changes, and workforce validation only for agent/policy/template/CI-config changes. Docs-only PRs get skip stubs. `mobile-typecheck.yml` stays as the historical Windows job with the same pnpm pin. Humans must require status check `PR required checks` (`docs/CI_PR_GATE.md`) instead of the two path-filtered job names; other unrelated required checks stay in place.
**Still later:** software engineer and QA on single-task sandbox branches; PRs with no auto-merge; founder approval. No agent write tokens.

## Phase 3 — simulation runtime (this branch) then specialized OBD/product
**Repo-side:** offline deterministic runtime in `agents/runtime/` (no LLM, no GitHub writes, no production). Pipeline stops at human approval. See `docs/AGENT_RUNTIME.md`. `operational` stays false.
**Still later:** OBD and recommendations agents using simulators/recorded synthetic responses only. No live vehicle-write access.

## Phase 4A — secure model adapter foundation
Offline, provider-independent `ModelAdapter` in `agents/runtime/src/model/`. Mock adapter only. Live providers remain disabled. See `docs/AI_MODEL_ADAPTER.md`.

## Phase 4B — secure live LLM sandbox (this branch)
Gated OpenAI Chat Completions adapter with stubbed transports in tests. Committed policy keeps `liveProvidersEnabled=false`. Product-manager synthetic demo is mock-by-default. Host egress and secret isolation are **not** provided by this repository. See `docs/AI_LIVE_SANDBOX.md`.

## Phase 4 — governed automation (later)
Do not connect a live provider until every prerequisite in `docs/AI_LIVE_SANDBOX.md` is met. Then: orchestration service, queue, execution audit, rate/time/token cost caps, dead-letter retries, rollbacks, stop button. Protect production with separate human reviewer. Add staged canaries and release observability.

## Success metrics
PR rollback rate, escaped bugs, false approvals, security findings, review turnaround, flaky tests, cost per merged PR, percentage of tasks completed without rework.
