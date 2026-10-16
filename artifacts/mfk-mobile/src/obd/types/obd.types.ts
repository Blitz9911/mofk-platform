import type { PollMetrics } from "../polling/polling-scheduler";
import type { ObdRecordedFrame } from "../recording/live-data-recorder";
import type { SignalReading } from "../signals/signal-registry";
import type {
  DiagnosticHistoryEntry,
  DiagnosticScanReport,
  LiveReading,
  ObdCommandOccupancy,
  ObdCommandTrace,
  ObdSessionActivity,
  VehicleInformation,
} from "./diagnostics.types";

export type ObdConnectionState =
  | "idle"
  | "permission_required"
  | "bluetooth_disabled"
  | "scanning"
  | "device_found"
  | "connecting"
  | "discovering_services"
  | "initializing_elm327"
  | "vehicle_searching"
  | "connected"
  | "vehicle_not_ready"
  | "vehicle_connected"
  | "recovering"
  | "disconnecting"
  | "disconnected"
  | "error";

export type ObdDevice = {
  id: string;
  name: string;
  rssi: number | null;
  serviceUUIDs: string[];
  isV011Candidate: boolean;
  deviceClass?: ObdDeviceClass;
  localName?: string | null;
  manufacturerData?: string | null;
};

export type ObdDeviceClass = "mfk" | "likely_obd" | "uart_generic" | "unknown";

export type ObdLogLevel = "debug" | "info" | "warn" | "error";

export type ObdLogEntry = {
  id: string;
  level: ObdLogLevel;
  event: string;
  message: string;
  createdAt: number;
  details?: Record<string, string | number | boolean | null>;
};

export type ObdCommandStatus = "queued" | "sent" | "completed" | "timeout" | "failed" | "cancelled";

export type Elm327Command = {
  id: string;
  command: string;
  timeoutMs: number;
  retries: number;
  priority: number;
  createdAt: number;
  sentAt?: number;
  completedAt?: number;
  rawResponse?: string;
  normalizedResponse?: string;
  status: ObdCommandStatus;
  error?: string;
};

export type Elm327CommandOptions = {
  timeoutMs?: number;
  retries?: number;
  priority?: number;
  dedupeKey?: string;
};

export type Elm327Transport = {
  isReady(): boolean;
  write(commandWithCarriageReturn: string): Promise<void>;
  onChunk(listener: (chunk: string) => void): () => void;
};

export type Elm327ResponseClass =
  | "ok"
  | "question"
  | "no_data"
  | "unable_to_connect"
  | "bus_init_error"
  | "can_error"
  | "bus_error"
  | "buffer_full"
  | "stopped"
  | "positive_obd"
  | "negative_obd"
  | "identity"
  | "unknown";

export type Elm327InitializationResult = {
  adapterConnected: boolean;
  elmVersion: string | null;
  adapterDevice?: string | null;
  adapterVoltage: string | null;
  detectedProtocol: string | null;
  protocolNumber: string | null;
  vehicleConnected: boolean;
  vehicleResponseClass: Elm327ResponseClass;
  supportedPids: string[];
  detectedEcus?: string[];
  pagesRead?: string[];
  warnings: string[];
  rawResponses: Record<string, string>;
};

export type DecodedPidValue = {
  pid: string;
  label: string;
  value: number | string | null;
  unit: string | null;
  status: "ok" | "unsupported" | "no_data" | "malformed" | "missing_bytes";
  raw: string;
};

export type LiveObdValues = {
  rpm: DecodedPidValue | null;
  speed: DecodedPidValue | null;
  coolantTemp: DecodedPidValue | null;
  engineLoad: DecodedPidValue | null;
  throttle: DecodedPidValue | null;
  fuelLevel: DecodedPidValue | null;
  controlModuleVoltage: DecodedPidValue | null;
};

export type ObdSnapshot = {
  state: ObdConnectionState;
  permissionStatus: "unknown" | "granted" | "denied";
  bluetoothState: "unknown" | "powered_on" | "powered_off" | "unsupported" | "unauthorized";
  devices: ObdDevice[];
  selectedDevice: ObdDevice | null;
  lastSuccessfulDevice: ObdDevice | null;
  initResult: Elm327InitializationResult | null;
  liveValues: LiveObdValues;
  liveReadings: Record<string, LiveReading>;
  liveSignals: Record<string, SignalReading>;
  frozen: boolean;
  recording: boolean;
  recordedFrames: ObdRecordedFrame[];
  playbackIndex: number | null;
  pollMetrics: PollMetrics;
  dtcScan: DiagnosticScanReport | null;
  diagnosticHistory: DiagnosticHistoryEntry[];
  vehicleInfo: VehicleInformation | null;
  sessionActivity: ObdSessionActivity;
  occupancy: ObdCommandOccupancy;
  commandTrace: ObdCommandTrace[];
  logs: ObdLogEntry[];
  userMessage: string | null;
  technicalError: string | null;
};
