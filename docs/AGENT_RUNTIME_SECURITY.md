# Agent runtime security assessment (simulation)

## What this release does

- Reads `agents/registry.json` and a synthetic task JSON.
- Runs in-process deterministic functions.
- Records an in-memory audit log.
- Stops at `human_approval_pending`.

## What it does not do

- GitHub writes, PR creation, merge
- LLM HTTP APIs
- Supabase / Vercel / Render / EAS
- Production secrets
- Database writes
- Live OBD / BLE / Mode `04`
- Executing model-generated shell
- Auto-approving L3/L4
- Setting `operational: true`

## Controls

| Control | Mechanism |
|---|---|
| Read-only | Engineering output is a proposal object (`writesFiles: false`) |
| Fail-closed evidence | Missing QA or cybersecurity evidence rejects the task |
| Separation of duties | Implementer cannot be the approver; `selfApproved` rejects |
| Production deny | `requestedOperations` intersect a deny-list |
| Live OBD | `sensitiveChanges: OBD writes` default-deny |
| Untrusted input | `instructions` / `shell` / jailbreak keys stripped |
| Kill switch | env or `KILL` file |
| Limits | step + wall clock |
| Identity | no tokens issued |

## Remaining before real model execution

1. Human-configured GitHub Ruleset (`PR required checks`) and `production` environment.
2. Least-privilege GitHub App (`contents: read` for L0 only).
3. Network sandbox that blocks production and model endpoints unless allow-listed.
4. Independent QA/security identities (not the same process).
5. Evidence store that is append-only.
6. Evaluated prompt-injection tests against the live model.
7. Explicit founder decision to change `operational` — this code must keep refusing `operational: true` until that decision exists.
8. No production write tokens. Ever, for this simulation binary.
