# MFK AI workforce runtime (simulation)

**Mode:** deterministic, offline, read-only. `agents/registry.json` `operational` remains **false**.

This is not a live multi-agent product. There is no live LLM client, no GitHub App token, and no production network. Phase 4A adds an offline `ModelAdapter` (`docs/AI_MODEL_ADAPTER.md`) that stays mock-only unless a future human-gated change enables a provider.

## Location

`agents/runtime/` sits beside the instruction files. It is not part of `artifacts/mfk-mobile` or `artifacts/api-server`. It adds no pnpm workspace package and does not change lockfile security settings.

## Pipeline

CEO / human synthetic task → orchestrator → product-manager → software-engineer (proposal only) → qa-automation → cybersecurity → **human_approval_pending**

Illegal shortcuts (engineering → human approval, QA → human approval without security) are rejected by the state machine.

## Run

```bash
node agents/runtime/cli.mjs --fixture agents/runtime/fixtures/maintenance-recommendation-task.json
node --test agents/runtime/test/runtime.test.mjs agents/runtime/test/model-adapter.test.mjs
```

Kill switch: set `MFK_AGENT_RUNTIME_KILLED=1` or create `agents/runtime/KILL`.

## Limits

Default 12 steps and 8 seconds. Exceeding either fails the run. Agents never execute generated shell, never write application files, never call fetch.
