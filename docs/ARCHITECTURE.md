# MFK AI-First Operating Architecture

```mermaid
flowchart TD
 F[Founder / human decision] --> O[Orchestrator: planning only]
 O --> P[Product lead]
 O --> T[Engineering lead]
 P --> BA[BA UX Analytics UAT]
 T --> DEV[Software OBD Data DevOps]
 DEV --> PR[Isolated branch + PR]
 PR --> CI[Independent QA and Security + CI]
 CI --> G{Policy gate / risk tier}
 G -->|L0-L2 passes| H[Human PR review]
 G -->|L3 sensitive| H
 H -->|approved| DEP{Protected production environment}
 DEP -->|separate human approval| PROD[Production deploy by restricted CI]
 G -->|failed| FIX[Backlog/Remediation]
```

## Components
- **Control plane:** external orchestrator, policy engine, immutable-ish audit store, task queue, agent-run metadata.
- **Execution plane:** ephemeral sandbox runners per issue/branch; no production credentials.
- **Evidence plane:** PR comments/artifacts for test reports, threat review, plan, diff, rollback.
- **Delivery plane:** GitHub branch rulesets; protected deployments and managed secrets. No AI direct production access.

## Proposed role IDs
Canonical list: `agents/registry.json`. IDs: `orchestrator`, `product-lead`, `product-manager`, `business-analyst`, `ux-reviewer`, `product-analytics`, `uat`, `engineering-lead`, `software-engineer`, `obd-iot`, `devops`, `qa-automation`, `data-recommendations`, `cybersecurity`.

`registry.json` `operational` is **false**. Markdown plus CI file checks are not an orchestrator.

## Data lifecycle
Use `dev` synthetic DB, `staging` masked fixtures / separate auth keys, `production` customer data only. Keep per-environment migration histories and documented restoration procedures. `production` release must use approved CI job and scoped credentials.

## Definition of done
Requirements + acceptance criteria; isolated diff; tests; independent security check; no secrets; appropriate approval; release/rollback plan. Do not claim tested without actual run output.
