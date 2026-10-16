# MFK Phase 4B — secure live LLM sandbox

**Status:** provider adapter and gated execution path exist. Live calls remain **disabled by default**. `operational` is **false**.

Application checks in `agents/runtime` are **not** a network sandbox. They cannot stop a compromised process from opening sockets. Host-level isolation is a remaining prerequisite.

## Architecture

```
synthetic task
  -> product-manager sandbox demo (mock by default)
  -> optional OpenAIChatAdapter (only if every live gate passes)
  -> schema + tool deny + cost/quota/timeout
  -> human_approval_pending
```

Phase 3 `runSimulation` and Phase 4A `invokeModelForAgent` are unchanged: live adapters still fail closed there.

| Control | Default |
|---|---|
| `sandbox-policy.json` `liveProvidersEnabled` | `false` |
| OpenAI `enabled` | `false` |
| Retries | disabled |
| Transport | none (no `fetch`) |
| Allowed live agent | `product-manager` only |
| Tasks | `synthetic-*` only |
| Human approval | mandatory |
| Kill switch | preserved |

## Secrets

- Key name only: `MFK_SANDBOX_OPENAI_API_KEY`
- Never commit values. Example configs contain **no** key material.
- Adapters redact secrets from thrown messages. Audit events store hashes, sizes, and cost numbers — not prompts, tokens, or customer data.

## Cost and reliability

Before a live call the runtime estimates an **upper bound** from input size, max output size, and configured USD/1k rates. If the estimate cannot be established, or it exceeds `maxSpendUsd`, the run is refused. Failed/timed-out calls are recorded as **partial** with request count.

Per-provider quota: `maxRequestsPerProvider`. Request timeout: `requestTimeoutMs`. Response cap: `maxResponseBytes`. HTTP 429 → `RATE_LIMIT` with no retry. 5xx → `PROVIDER_UNAVAILABLE`.

## Founder approval (independent of the model)

A live run requires **all** of:

1. In-memory/runtime policy `liveProvidersEnabled: true` (the committed file must stay `false` until a human-reviewed change).
2. `options.authorizeLiveSandbox === true` (not taken from task text or model output).
3. `MFK_SANDBOX_LIVE_RUN=1`
4. `MFK_SANDBOX_FOUNDER_APPROVAL` **and** `options.founderApproval` equal `sandbox-approve:product-manager:<synthetic-task-id>`

The model cannot mint that string. Comparing env to options to the expected task id is the verification.

## Required host infrastructure (not in this repo)

1. Isolated VM/container with **no** production credentials, GitHub write tokens, database URLs, or EAS secrets.
2. Egress allow-list to `api.openai.com` (or a documented proxy) only; deny all other destinations including Supabase, GitHub, and vehicle/BLE networks.
3. Secret injection from an isolated store at process start; secrets never written to disk in the repo tree.
4. CPU/memory/time cgroup limits plus the in-process kill switch (`MFK_AGENT_RUNTIME_KILLED=1` or `agents/runtime/KILL`).
5. Billing caps on the **non-production** provider project.

## Incident shutdown

1. Set `MFK_AGENT_RUNTIME_KILLED=1` or create `agents/runtime/KILL`.
2. Unset `MFK_SANDBOX_LIVE_RUN`, `MFK_SANDBOX_FOUNDER_APPROVAL`, `MFK_SANDBOX_OPENAI_API_KEY`, `MFK_SANDBOX_ALLOW_REAL_NETWORK`.
3. Keep `liveProvidersEnabled` and OpenAI `enabled` false in Git.
4. Rotate the sandbox key in the provider console.

## Demo (offline, no credentials)

```bash
node agents/runtime/cli-sandbox.mjs
```

Output: product requirements, acceptance criteria, assumptions/risks, proposed next steps, `human_approval_pending`. No application files are written.

## Tests / CI

```bash
node --test agents/runtime/test/runtime.test.mjs agents/runtime/test/model-adapter.test.mjs agents/runtime/test/live-sandbox.test.mjs
```

`PR Gate` job **AI sandbox tests** runs on every pull request (not path-filtered). `PR required checks` fails if that job fails. Tests use stub transports only.

## Future founder-authorized smoke test

Do this only after the host controls above exist. Do **not** run it from a developer laptop with production env files.

1. Isolated runner, egress pinned to the provider, no Git write credentials.
2. Export:
   - `MFK_SANDBOX_LIVE_RUN=1`
   - `MFK_SANDBOX_FOUNDER_APPROVAL=sandbox-approve:product-manager:synthetic-maint-rec-001`
   - `MFK_SANDBOX_OPENAI_API_KEY` from the secret store (not from Git)
   - `MFK_SANDBOX_ALLOW_REAL_NETWORK=1` only inside that runner
3. Temporarily use a **non-committed** policy overlay with `liveProvidersEnabled: true` and OpenAI `enabled: true` for that process only.
4. Pass `authorizeLiveSandbox: true` and the same founder string in options.
5. Replace `createRealFetchTransport` with a runner-local transport that still enforces timeout and size caps. This checkout’s default factory **refuses** global `fetch` even when the env flag is set, until that isolated runner exists.
6. Confirm spend stays under `maxSpendUsd`, audit contains no key/prompt, status is `human_approval_pending`, and no app/DB/OBD/Git writes occurred.
7. Unset env vars and destroy the runner.

Treat a successful smoke test as evidence of **that** runner only, not of production readiness.
