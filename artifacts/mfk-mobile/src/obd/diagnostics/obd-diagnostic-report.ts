import type { CapabilityAuditJson, DiagnosticCommandRecord } from "./obd-diagnostic.types";

function percentile(values: number[], p: number) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index] ?? null;
}

export function buildPerformance(records: DiagnosticCommandRecord[]) {
  const times = records
    .map((item) => item.responseTimeMs)
    .filter((item): item is number => item != null && item >= 0);
  const successful = records.filter((item) => item.success).length;
  return {
    totalCommands: records.length,
    successfulCommands: successful,
    failedCommands: records.length - successful,
    averageResponseTime: times.length ? Math.round(times.reduce((sum, item) => sum + item, 0) / times.length) : null,
    medianResponseTime: percentile(times, 50),
    p95ResponseTime: percentile(times, 95),
    timeoutCount: records.filter((item) => item.timeout).length,
    noDataCount: records.filter((item) => /NO DATA/i.test(`${item.rawResponse}\n${item.normalizedResponse}`)).length,
    elmErrorCount: records.filter((item) => !item.success && !item.timeout).length,
  };
}

export function buildSummary(json: Omit<CapabilityAuditJson, "summary">): CapabilityAuditJson["summary"] {
  const working = json.supportedPids.filter((item) => item.status === "SUPPORTED_AND_WORKING");
  const missing = json.supportedPids.filter((item) => item.status === "SUPPORTED_DECODER_MISSING" || item.status === "SUPPORTED_RAW_ONLY");
  const failed = json.supportedPids.filter((item) => item.status === "SUPPORTED_DECODE_FAILED");
  const noData = json.supportedPids.filter((item) => item.status === "NO_DATA");
  const timeouts = json.supportedPids.filter((item) => item.status === "TIMEOUT");
  const elm = json.supportedPids.filter((item) => item.status === "ELM_ERROR");

  return {
    ADAPTER_CAPABILITIES: [
      json.adapter.identifier ? `Identifier: ${json.adapter.identifier}` : "Identifier: unknown",
      json.adapter.protocol ? `Protocol: ${json.adapter.protocol}` : "Protocol: unknown",
      json.adapter.protocolNumber ? `ATDPN: ${json.adapter.protocolNumber}` : "ATDPN: unknown",
      json.adapter.headersEnabled ? "Headers: ATH1 during audit" : "Headers: not confirmed",
      json.adapter.atzExecuted ? "ATZ was executed (optional diagnostic flag)" : "ATZ was not executed",
    ],
    VEHICLE_CAPABILITIES: [
      `ECUs: ${json.ecus.length ? json.ecus.join(", ") : "none detected"}`,
      `Advertised Mode 01 PIDs: ${json.supportedPids.filter((item) => item.advertisedSupported).length}`,
      `Working PIDs: ${json.workingPids.length}`,
      `Mode 09 PIDs: ${json.vehicleInfo.mode09Supported.join(", ") || "none"}`,
      json.vehicleInfo.vin ? `VIN: ${json.vehicleInfo.vin}` : "VIN: not decoded",
    ],
    MFK_CURRENT_SUPPORT: working
      .filter((item) => item.displayedInMfk)
      .map((item) => `${item.pid} ${item.name}`),
    AVAILABLE_BUT_NOT_IMPLEMENTED_IN_MFK: [
      ...missing.map((item) => `${item.pid} ${item.name} (${item.status})`),
      ...working.filter((item) => !item.displayedInMfk).map((item) => `${item.pid} ${item.name} decoded but not in live UI registry`),
    ],
    NOT_SUPPORTED_BY_VEHICLE: noData.map((item) => `${item.pid} ${item.name}`),
    DECODER_ISSUES: [
      ...failed.map((item) => `${item.pid} ${item.name}: decode failed`),
      ...missing.map((item) => `${item.pid} ${item.name}: ${item.status}`),
    ],
    BLE_TRANSPORT_ISSUES: [
      ...timeouts.map((item) => `${item.pid} timeout`),
      ...elm.map((item) => `${item.pid} transport/ELM error`),
      ...json.errors.filter((item) => /timeout|BLE|queue|reconnect|not ready/i.test(item)),
    ],
    PERFORMANCE_ISSUES: [
      `avg ${json.performance.averageResponseTime ?? "-"} ms`,
      `p95 ${json.performance.p95ResponseTime ?? "-"} ms`,
      `timeouts ${json.performance.timeoutCount}`,
      `NO DATA ${json.performance.noDataCount}`,
      json.performance.p95ResponseTime != null && json.performance.p95ResponseTime > 3000 ? "p95 response is slow (>3s)" : "",
    ].filter(Boolean),
  };
}

export function formatCapabilityReportText(json: CapabilityAuditJson) {
  const lines = [
    "MFK OBD-II CAPABILITY AUDIT (READ-ONLY)",
    `generatedAt: ${new Date().toISOString()}`,
    "",
    "ADAPTER CAPABILITIES",
    ...json.summary.ADAPTER_CAPABILITIES.map((item) => `- ${item}`),
    "",
    "VEHICLE CAPABILITIES",
    ...json.summary.VEHICLE_CAPABILITIES.map((item) => `- ${item}`),
    "",
    "MFK CURRENT SUPPORT",
    ...(json.summary.MFK_CURRENT_SUPPORT.length ? json.summary.MFK_CURRENT_SUPPORT.map((item) => `- ${item}`) : ["- none in this scan"]),
    "",
    "AVAILABLE BUT NOT IMPLEMENTED IN MFK",
    ...(json.summary.AVAILABLE_BUT_NOT_IMPLEMENTED_IN_MFK.length
      ? json.summary.AVAILABLE_BUT_NOT_IMPLEMENTED_IN_MFK.map((item) => `- ${item}`)
      : ["- none"]),
    "",
    "NOT SUPPORTED BY VEHICLE",
    ...(json.summary.NOT_SUPPORTED_BY_VEHICLE.length ? json.summary.NOT_SUPPORTED_BY_VEHICLE.map((item) => `- ${item}`) : ["- none in advertised set"]),
    "",
    "DECODER ISSUES",
    ...(json.summary.DECODER_ISSUES.length ? json.summary.DECODER_ISSUES.map((item) => `- ${item}`) : ["- none"]),
    "",
    "BLE/TRANSPORT ISSUES",
    ...(json.summary.BLE_TRANSPORT_ISSUES.length ? json.summary.BLE_TRANSPORT_ISSUES.map((item) => `- ${item}`) : ["- none recorded"]),
    "",
    "PERFORMANCE ISSUES",
    ...json.summary.PERFORMANCE_ISSUES.map((item) => `- ${item}`),
    "",
    "SAFETY",
    `- readOnly: ${json.safety.readOnly}`,
    `- clearDtcExecuted: ${json.safety.clearDtcExecuted}`,
    `- writeCommandsExecuted: ${json.safety.writeCommandsExecuted}`,
    `- atzExecuted: ${json.safety.atzExecuted}`,
  ];
  return lines.join("\n");
}
