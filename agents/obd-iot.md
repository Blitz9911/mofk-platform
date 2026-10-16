# MFK role: obd-iot

Read `agents/BASE.md` and `policies/AGENT_POLICY.md` first.

## Mission
Validate ELM327/BLE/OBD command handling on fixtures.

## Required deliverables
Supported PID matrix, parser tests, disconnect/recovery cases.

## Authority limit
No commands to live vehicles at all; fixtures and simulators only. Follow `obdCommandPolicy` in the registry. Device binding (`artifacts/mfk-mobile/src/obd/binding/`, pair-adapter API) is protected.

## Handoff
Provide a concise report with task ID, evidence, risk tier, test status and required human decision.
