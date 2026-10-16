const PRODUCTION_OPS = new Set([
  "production_db_write",
  "production_db_schema_apply",
  "production_deploy",
  "production_eas_update",
  "merge_to_protected_branch",
  "auto_merge",
  "live_obd_write",
  "obd_mode_04",
  "secret_exfiltration",
  "create_production_write_token",
  "execute_shell",
  "llm_api_call",
  "github_write",
]);

const SENSITIVE_TO_OP = {
  "customer data": "customer_data_processing",
  auth: "auth_policy",
  payment: "pricing_billing",
  "device binding": "device_binding",
  "OBD writes": "live_obd_or_vehicle_write",
  "database migration": "database_migration",
  deployment: "production_release",
};

export function classifyTask(task, registry) {
  const requested = task.requestedOperations || [];
  const forbiddenHit = requested.find((op) => PRODUCTION_OPS.has(op));
  const sensitive = (task.sensitiveChanges || []).filter((item) => item && item !== "none");
  const sensitiveOps = sensitive
    .map((item) => SENSITIVE_TO_OP[item])
    .filter(Boolean);
  let minLevel = task.riskTier || "L0";
  for (const op of sensitiveOps) {
    const rule = registry.sensitiveOperations?.[op];
    if (rule?.minLevel && rule.minLevel > minLevel) minLevel = rule.minLevel;
  }
  const needsHuman = minLevel === "L3" || minLevel === "L4" || sensitiveOps.length > 0;
  return {
    minLevel,
    forbiddenHit: forbiddenHit || null,
    sensitiveOps,
    needsHuman,
    defaultDenyLiveObd: sensitiveOps.includes("live_obd_or_vehicle_write"),
  };
}

export function denyIfUnauthorized(task, registry) {
  const classified = classifyTask(task, registry);
  if (classified.forbiddenHit) {
    return {
      ok: false,
      reason: `forbidden operation ${classified.forbiddenHit}`,
      classified,
    };
  }
  if (classified.defaultDenyLiveObd) {
    return {
      ok: false,
      reason: "live OBD/vehicle writes are default-deny in simulation",
      classified,
    };
  }
  return { ok: true, classified };
}

export function assertEvidenceForApproval({ qa, cybersecurity, classified }) {
  if (!qa?.evidence?.length) {
    return { ok: false, reason: "missing QA evidence" };
  }
  if (qa.testsRun?.some((row) => row?.status === "pass" && row?.executed === false)) {
    return { ok: false, reason: "QA marked unexecuted tests as pass" };
  }
  if (!cybersecurity?.evidence?.length) {
    return { ok: false, reason: "missing cybersecurity evidence" };
  }
  if (classified.needsHuman && qa.approvalNeeded !== true) {
    return { ok: false, reason: "QA must not self-approve; human approval required" };
  }
  return { ok: true };
}

export function cannotSelfApprove(output) {
  return output?.approvalNeeded === true || output?.metadata?.selfApproved !== true;
}
