export { useObdConnection } from "./hooks/use-obd-connection";
export { useObdTelemetrySync } from "./hooks/use-obd-telemetry-sync";
export { useObdLiveData, useObdDiagnostics, useObdVehicleInfo } from "./hooks/use-obd-live-data";
export { MfkBleManager } from "./ble/ble-manager";
export { requestBlePermissions } from "./ble/ble-permissions";
export { Elm327Client } from "./elm327/elm327-client";
export { Elm327CommandQueue } from "./elm327/elm327-command-queue";
export { initializeElm327 } from "./elm327/elm327-initializer";
export { parseElm327Response, normalizeElm327Response, hasElm327Prompt, classifyElm327Response } from "./elm327/elm327-response-parser";
export { decodeMode01Pid, decodeDtcResponse } from "./pids/pid-decoder";
export { parseSupportedPidBitmap } from "./pids/pid-support-parser";
export { LIVE_PID_REGISTRY, LIVE_CATEGORY_LABELS, buildLiveReadingCatalog, listV011Readings } from "./pids/pid-registry";
export { decodeVinIdentity } from "./vehicle-info/vin-identity";
export { describeDtc } from "./dtc/dtc-catalog";
export { buildDiagnosticLampNotes, isTpmsRelatedCode } from "./dtc/chassis-dtc-scan";
export { decodeMonitorStatus } from "./dtc/monitor-status";
export { decodeMode09Vin } from "./vehicle-info/mode09-parser";
export type {
  DecodedPidValue,
  Elm327Command,
  Elm327InitializationResult,
  Elm327Transport,
  LiveObdValues,
  ObdConnectionState,
  ObdDevice,
  ObdSnapshot,
} from "./types/obd.types";
export type {
  DecodedDtc,
  DiagnosticScanReport,
  LiveReading,
  VehicleInformation,
} from "./types/diagnostics.types";
export { SIGNAL_REGISTRY, decodePidSignals, SIGNAL_CATEGORIES } from "./signals/signal-registry";
export { planPollCommands } from "./polling/polling-scheduler";
export { discoverSupportedMode01Pids } from "./protocol/j1979-capability-discovery";
export { parseMode06Response } from "./diagnostics/mode06-service";
export { runObdCapabilityScan } from "./diagnostics/obd-capability-scanner";
export { assertSafeDiagnosticCommand, isAllowedDiagnosticCommand } from "./diagnostics/safe-command-allowlist";
export { isDeviceBindingEnabled, isVehicleVerificationEnabled, isBindingEnforcementEnabled } from "./binding/feature-flags";
export { matchVehicleFingerprints } from "./binding/matcher";
