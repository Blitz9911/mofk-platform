export type LiveReadingStatus = DecodedPidValueStatus;

export type DecodedPidValueStatus = "ok" | "unsupported" | "no_data" | "malformed" | "missing_bytes";

export type LiveReading = {
  pid: string;
  arabicLabel: string;
  englishLabel: string;
  category: string;
  value: number | string | null;
  unit: string | null;
  status: DecodedPidValueStatus | "unsupported" | "no_data";
  raw: string;
  updatedAt: number | null;
};

export type DtcSystem = "powertrain" | "chassis" | "body" | "network";

export type DecodedDtc = {
  code: string;
  status: "stored" | "pending" | "permanent";
  descriptionEn: string;
  descriptionAr: string;
  severity: "low" | "medium" | "high" | "critical";
  system?: DtcSystem;
  module?: string;
};

export type DiagnosticLampNote = {
  id: string;
  titleAr: string;
  bodyAr: string;
};

export type ReadinessItem = {
  name: string;
  nameEn?: string;
  available?: boolean;
  ready: boolean | null;
};

export type FreezeFrameItem = {
  pid: string;
  label: string;
  value: string | null;
  unit: string | null;
};

export type FreezeFrameReport = {
  dtc: string | null;
  items: FreezeFrameItem[];
  availability: "ok" | "unavailable" | "unsupported";
  raw: string;
};

export type DiagnosticScanReport = {
  id: string;
  startedAt: number;
  completedAt: number | null;
  status: "running" | "complete" | "failed";
  milOn: boolean | null;
  dtcCount?: number | null;
  storedCount: number;
  pendingCount: number;
  permanentCount: number;
  codes: DecodedDtc[];
  readiness: ReadinessItem[];
  freezeFrame?: FreezeFrameReport | null;
  lampNotes?: DiagnosticLampNote[];
  extraModulesQueried?: string[];
  tireCheck?: TireCheckReport | null;
  modules?: VehicleModuleReading[];
  errorMessage: string | null;
};

export type VehicleModuleReading = {
  header: string;
  nameAr: string;
  status: "responded" | "no_data" | "error";
  codes: DecodedDtc[];
};

export type TireWheelId = "fl" | "fr" | "rl" | "rr";

export type TireWheelReading = {
  id: TireWheelId;
  labelAr: string;
  psi: number | null;
  kPa: number | null;
  status: "ok" | "low" | "unavailable";
};

export type TireCheckReport = {
  availability: "ok" | "codes_only" | "unsupported";
  summaryAr: string;
  wheels: TireWheelReading[];
  codes: DecodedDtc[];
  probesTried: string[];
};

export type DiagnosticHistoryEntry = {
  id: string;
  scannedAt: number;
  storedCount: number;
  pendingCount: number;
  permanentCount: number;
  milOn: boolean | null;
  codes: string[];
};

export type VehicleInfoAvailability = "ok" | "unavailable" | "unsupported" | "malformed";

export type VehicleInfoField = {
  key: string;
  section: "vehicle" | "adapter" | "connection";
  labelAr: string;
  labelEn: string;
  value: string | null;
  availability: VehicleInfoAvailability;
};

export type VehicleInformation = {
  status: "idle" | "running" | "complete" | "failed";
  fields: VehicleInfoField[];
  vin: string | null;
  errorMessage: string | null;
  updatedAt: number | null;
};

export type ObdCommandOccupancy = "none" | "live" | "diagnostics" | "vehicle_info";
export type ObdSessionActivity =
  | "idle"
  | "scanning_dtc"
  | "reading_vehicle"
  | "reading_vehicle_info"
  | "polling"
  | "reading_live";

export type ObdCommandTrace = {
  command: string;
  at?: number;
  ok?: boolean;
  timestamp?: number;
  latencyMs?: number;
  rawResponse?: string;
  parsed?: string;
  error?: string | null;
};
