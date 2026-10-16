# Fail-closed approval requirements

**Deny unless every required artifact and human seat is present.** Agents, CODEOWNERS, and CI cannot fill a human seat.

## Always required (L1+)

- Task ID and acceptance criteria
- Isolated branch (never direct push to `main`)
- Diff summary and rollback
- Test commands **with logs** (unrun = Not tested, not Pass)
- Independent QA assessment (not the implementer)
- Independent cybersecurity assessment (not the implementer)
- Human decision recorded on the PR

If any item is missing, status is **not approved**.

## L3 (explicit founder comment on the PR)

Required before merge when the change includes any of:

- Database migrations or schema
- Auth / RLS / grants
- Pricing, billing, subscriptions that charge money
- Customer data processing beyond synthetic fixtures
- Device-binding behavior or privileges
- Any live-vehicle or OBD write path (default **deny**; even with approval, live writes stay out of agent runtime)

The founder comment must name the operation (for example `approve:device_binding`). A generic thumbs-up does not count.

## L4 (production release)

All of L3, plus:

1. PR approved and merged to the protected default branch by a human
2. Separate GitHub Environment `production` approval by a reviewer who is not the PR author
3. Release executed only by the restricted CD job bound to that environment (job does not exist yet)

AI cannot approve L4. Auto-merge is forbidden.

## Mapping to the registry

Machine-readable copy: `agents/registry.json` fields `sensitiveOperations`, `globalForbiddenActions`, and `handoffContract.failClosedIfMissingEvidence`.

Model adapter output cannot occupy a human seat, cannot self-approve, and cannot count simulated QA or security text as executed verification. Live providers stay disabled (`docs/AI_MODEL_ADAPTER.md`).
