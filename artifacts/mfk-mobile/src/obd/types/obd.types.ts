export type ObdConnectionState =
  | "idle"
  | "permission_required"
  | "bluetooth_disabled"
  | "scanning"
  | "device_found"
  | "connecting"
  | "discovering_services"
  | "initializing_elm327"
  | "connected"
  | "vehicle_not_ready"
  | "vehicle_connected"
  | "disconnecting"
  | "disconnected"
  | "error";

export type ObdDevice = {
  id: string;
  name: string;
  rssi: number | null;
  serviceUUIDs: string[];
  isV011Candidate: boolean;
};

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

export type Elm327InitializationResult = {
  adapterConnected: boolean;
  elmVersion: string | null;
  adapterVoltage: string | null;
  detectedProtocol: string | null;
  vehicleConnected: boolean;
  supportedPids: string[];
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
  initResult: Elm327InitializationResult | null;
  liveValues: LiveObdValues;
  logs: ObdLogEntry[];
  userMessage: string | null;
  technicalError: string | null;
};
