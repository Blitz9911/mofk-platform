# MFK Phase 4A — secure model adapter foundation

**Status:** infrastructure only. Live model requests are not enabled.

`operational` remains **false**. The kill switch, human approval gate, and fail-closed policy from Phase 3 are unchanged. Mock or simulated model output is **not** evidence that QA ran, that security reviewed a real change, or that a provider works in production.

## What this phase adds

| Piece | Location |
|---|---|
| Adapter contract | `agents/runtime/src/model/adapter.mjs` |
| Offline mock | `agents/runtime/src/model/mock-adapter.mjs` |
| Live stub (always throws) | `agents/runtime/src/model/live-disabled.mjs` |
| Role routing (live disabled) | `agents/runtime/contracts/model-routing.json` |
| Prompt channels | `agents/runtime/src/model/prompt.mjs` |
| Response schema | `agents/runtime/contracts/model-response.schema.json` |
| Budgets | `agents/runtime/src/model/budgets.mjs` |
| Invoke + fail-closed errors | `agents/runtime/src/model/invoke.mjs` |
| Audit metadata (no prompt bodies) | `agents/runtime/src/model/audit-meta.mjs` |

The orchestrator does **not** call the adapter unless `useModelAdapter: true`. Default simulation stays deterministic locals.

## Security boundaries kept

- No live provider API calls and no credentials.
- No `fetch`, GitHub writes, shell execution, app/database changes, or production access.
- `liveProvidersEnabled` must stay `false`. Non-mock providers are `live: true` and `enabled: false`.
- `approvalNeeded` on model output must be `true`. The pipeline still ends at `human_approval_pending`.
- Tool requests are denied. Phase 4A allows **no** tools.
- Audit stores sizes, provider id, outcome codes, and SHA-256 prefixes — not prompt text, API keys, or secrets.

## Prompt construction

Trusted policy is a `system` message (`trust: "trusted"`). Task data is a `user` message wrapped in `<untrusted_task>` (`trust: "untrusted"`). Untrusted markup is forbidden on the trusted channel. Injection strings in the task are data, never policy.

## Tests

```bash
node --test agents/runtime/test/runtime.test.mjs agents/runtime/test/model-adapter.test.mjs
```

## Future prerequisites for a real provider

Do **not** flip `liveProvidersEnabled` or add API keys until all of the following exist and have been human-reviewed:

1. Secret storage outside the repo (GitHub Environment or equivalent), never committed files.
2. Network egress allow-list to that provider only, from a non-production sandbox.
3. Per-role spend caps billed to a non-production account, with kill switch on budget breach.
4. Independent red-team of prompt isolation (trusted vs untrusted) and tool gating.
5. Logging pipeline that redacts prompts containing customer data, VINs, or tokens.
6. A human-owned change that updates routing, with `operational` still false until a later phase.
7. Proof that model output cannot approve, merge, deploy, or write OBD/production state.
8. Contract tests against the real provider’s schema **in a sandbox**, not claimed from mock runs.

Until then, `LiveDisabledAdapter.complete()` must throw `LIVE_PROVIDER_DISABLED` before any network primitive.
