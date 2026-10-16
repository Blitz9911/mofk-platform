export type CapabilityPidStatus =
  | "SUPPORTED_AND_WORKING"
  | "SUPPORTED_RAW_ONLY"
  | "SUPPORTED_DECODER_MISSING"
  | "SUPPORTED_DECODE_FAILED"
  | "NO_DATA"
  | "TIMEOUT"
  | "ELM_ERROR"
  | "UNSUPPORTED"
  | "NOT_ATTEMPTED";

export type DiagnosticCommandRecord = {
  command: string;
  rawResponse: string;
  normalizedResponse: string;
  sentAt: number | null;
  receivedAt: number | null;
  responseTimeMs: number | null;
  timeout: boolean;
  retryCount: number;
  success: boolean;
  error: string | null;
};

export type DiagnosticSend = (command: string, timeoutMs?: number) => Promise<DiagnosticCommandRecord>;

export type SupportedPidRecord = {
  mode: string;
  pid: string;
  ecu: string | null;
  advertisedSupported: boolean;
  name: string;
  rawResponse: string;
  decodedValue: number | string | null;
  unit: string | null;
  responseTimeMs: number | null;
  decoderExists: boolean;
  decodeSuccess: boolean;
  displayedInMfk: boolean;
  status: CapabilityPidStatus;
};

export type CapabilityAuditJson = {
  adapter: {
    identifier: string;
    protocol: string;
    protocolNumber: string;
    headersEnabled: boolean;
    atzExecuted: boolean;
  };
  ecus: string[];
  supportedPids: SupportedPidRecord[];
  workingPids: string[];
  missingDecoders: string[];
  failedDecoders: string[];
  unsupportedPids: string[];
  vehicleInfo: {
    mode09Supported: string[];
    vin: string | null;
    calibrationId: string | null;
    cvn: string | null;
    ecuName: string | null;
    raw: Record<string, string>;
  };
  dtcSupport: {
    mode03: { ok: boolean; codes: string[]; raw: string };
    mode07: { ok: boolean; codes: string[]; raw: string };
    mode0A: { ok: boolean; codes: string[]; raw: string };
    mode06: { ok: boolean; tests: number; raw: string };
  };
  performance: {
    totalCommands: number;
    successfulCommands: number;
    failedCommands: number;
    averageResponseTime: number | null;
    medianResponseTime: number | null;
    p95ResponseTime: number | null;
    timeoutCount: number;
    noDataCount: number;
    elmErrorCount: number;
  };
  errors: string[];
  commandsSent: string[];
  safety: {
    readOnly: true;
    clearDtcExecuted: false;
    writeCommandsExecuted: false;
    atzExecuted: boolean;
    blockedAttempts: string[];
  };
  summary: {
    ADAPTER_CAPABILITIES: string[];
    VEHICLE_CAPABILITIES: string[];
    MFK_CURRENT_SUPPORT: string[];
    AVAILABLE_BUT_NOT_IMPLEMENTED_IN_MFK: string[];
    NOT_SUPPORTED_BY_VEHICLE: string[];
    DECODER_ISSUES: string[];
    BLE_TRANSPORT_ISSUES: string[];
    PERFORMANCE_ISSUES: string[];
  };
};

export type CapabilityAuditResult = {
  json: CapabilityAuditJson;
  text: string;
  restoreHints: { protocolSelect: string | null };
};
