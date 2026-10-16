import { AppState, NativeEventSubscription } from "react-native";

import { MfkBleManager } from "../ble/ble-manager";
import { requestBlePermissions } from "../ble/ble-permissions";
import { Elm327Client } from "../elm327/elm327-client";
import { initializeElm327 } from "../elm327/elm327-initializer";
import { buildDiagnosticLampNotes, requestHeaderFromResponseEcu } from "../dtc/chassis-dtc-scan";
import { collectTireCheck } from "../dtc/tire-check";
import { describeDtc } from "../dtc/dtc-catalog";
import { decodeMonitorStatus } from "../dtc/monitor-status";
import { decodeFreezeFrameDtc, decodeFreezeFramePid, emptyFreezeFrame } from "../dtc/freeze-frame";
import { ELM_PRIORITY } from "../elm327/elm327.constants";
import { decodeDtcResponse, decodeMode01Pid } from "../pids/pid-decoder";
import { LIVE_PID_BY_COMMAND, buildLiveReadingCatalog } from "../pids/pid-registry";
import { ALWAYS_PROBE_LIVE_PIDS } from "../polling/live-poll-plan";
import { emptyPollMetrics, LatencyWindow, planPollCommands } from "../polling/polling-scheduler";
import { LiveDataRecorder } from "../recording/live-data-recorder";
import { decodePidSignals, type SignalReading } from "../signals/signal-registry";
import { isMode01SupportQuery } from "../pids/pid-support-parser";
import { decodeMode09Text, decodeMode09Vin } from "../vehicle-info/mode09-parser";
import { decodeVinIdentity } from "../vehicle-info/vin-identity";
import { collectVehicleFingerprintFromSend } from "../binding/fingerprint";
import type { VehicleFingerprint } from "../binding/types";
import { runObdCapabilityScan } from "../diagnostics/obd-capability-scanner";
import { assertSafeDiagnosticCommand } from "../diagnostics/safe-command-allowlist";
import type { CapabilityAuditResult } from "../diagnostics/obd-diagnostic.types";
import { obdLogger } from "./obd-logger";
import { MockElm327Transport } from "./mock-elm327-transport";
import type { DecodedPidValue, Elm327InitializationResult, LiveObdValues, ObdDevice, ObdSnapshot } from "../types/obd.types";
import type {
  DecodedDtc,
  DiagnosticHistoryEntry,
  DiagnosticScanReport,
  FreezeFrameReport,
  LiveReading,
  ObdCommandOccupancy,
  VehicleInfoField,
  VehicleInformation,
} from "../types/diagnostics.types";

const emptyLiveValues: LiveObdValues = {
  rpm: null,
  speed: null,
  coolantTemp: null,
  engineLoad: null,
  throttle: null,
  fuelLevel: null,
  controlModuleVoltage: null,
};

function emptySnapshot(): ObdSnapshot {
  return {
    state: "idle",
    permissionStatus: "unknown",
    bluetoothState: "unknown",
    devices: [],
    selectedDevice: null,
    lastSuccessfulDevice: null,
    initResult: null,
    liveValues: emptyLiveValues,
    liveReadings: {},
    liveSignals: {},
    frozen: false,
    recording: false,
    recordedFrames: [],
    playbackIndex: null,
    pollMetrics: emptyPollMetrics(),
    dtcScan: null,
    diagnosticHistory: [],
    vehicleInfo: null,
    sessionActivity: "idle",
    occupancy: "none",
    commandTrace: [],
    logs: [],
    userMessage: null,
    technicalError: null,
  };
}

function vehicleMessageFor(result: Elm327InitializationResult) {
  if (result.vehicleConnected) {
    const protocol = [result.detectedProtocol, result.protocolNumber].filter(Boolean).join(" · ");
    return protocol ? `تم الاتصال بالسيارة · ${protocol}` : "تم الاتصال بالسيارة";
  }

  switch (result.vehicleResponseClass) {
    case "unable_to_connect":
      return "القطعة متصلة، لكن السيارة لم تستجب. تأكد من التشغيل أو وضع ACC";
    case "bus_init_error":
    case "can_error":
    case "bus_error":
      return "فشل تهيئة ناقل السيارة. أعد تركيب القطعة ثم حاول مرة أخرى";
    case "no_data":
      return "لا توجد بيانات من وحدة التحكم حالياً";
    default:
      return "القطعة متصلة عبر البلوتوث، والسيارة غير جاهزة بعد";
  }
}

function pidToLiveKey(pid: string): keyof LiveObdValues | null {
  switch (pid) {
    case "010C":
      return "rpm";
    case "010D":
      return "speed";
    case "0105":
      return "coolantTemp";
    case "0104":
      return "engineLoad";
    case "0111":
      return "throttle";
    case "012F":
      return "fuelLevel";
    case "0142":
      return "controlModuleVoltage";
    default:
      return null;
  }
}

function toLiveReading(value: DecodedPidValue): LiveReading {
  const definition = LIVE_PID_BY_COMMAND.get(value.pid);
  return {
    pid: value.pid,
    arabicLabel: definition?.label ?? value.label,
    englishLabel: definition?.englishLabel ?? value.pid,
    category: definition?.category ?? "engine",
    value: value.value,
    unit: value.unit,
    status: value.status,
    raw: value.raw,
    updatedAt: value.status === "ok" ? Date.now() : null,
  };
}

export class ObdService {
  private ble = new MfkBleManager();
  private client: Elm327Client | null = null;
  private mockTransport: MockElm327Transport | null = null;
  private snapshot: ObdSnapshot = emptySnapshot();
  private listeners = new Set<(snapshot: ObdSnapshot) => void>();
  private pollingActive = false;
  private livePollingDesired = false;
  private backgroundLiveDesired = false;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private pollCycle = 0;
  private liveSkipPids = new Set<string>();
  private liveProbeMisses = new Map<string, number>();
  private liveConfirmedPids = new Set<string>();
  private visibleCommands: string[] = [];
  private frozenSignals: Record<string, SignalReading> = {};
  private recorder = new LiveDataRecorder();
  private latency = new LatencyWindow();
  private bluetoothUnsubscribe: (() => void) | null = null;
  private disconnectUnsubscribe: (() => void) | null = null;
  private appStateSubscription: NativeEventSubscription | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private userDisconnect = false;
  private sessionId = 0;
  private lastCapabilityReport: CapabilityAuditResult | null = null;

  constructor() {
    obdLogger.subscribe((logs) => this.setSnapshot({ logs }));
    this.bluetoothUnsubscribe = this.ble.onBluetoothState((state) => this.setSnapshot({ bluetoothState: state }));
    this.disconnectUnsubscribe = this.ble.onDisconnected(() => {
      this.stopPolling();
      this.client?.cancelAll("BLE disconnected");
      this.setSnapshot({
        state: "disconnected",
        occupancy: "none",
        sessionActivity: "idle",
        userMessage: "انقطع اتصال البلوتوث. هذا لا يعني بالضرورة أن السيارة غير جاهزة سابقاً",
        selectedDevice: this.snapshot.selectedDevice,
      });
      if (!this.userDisconnect) this.scheduleReconnect();
    });
    this.appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") this.stopPolling();
      if (state === "active") {
        if (this.userDisconnect) return;
        if (this.ble.isReady() && this.snapshot.state === "vehicle_connected" && this.wantsLivePolling()) {
          this.startPolling();
          return;
        }
        if (this.snapshot.selectedDevice || this.snapshot.lastSuccessfulDevice) {
          this.scheduleReconnect();
        }
      }
    });
  }

  subscribe(listener: (snapshot: ObdSnapshot) => void) {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => this.listeners.delete(listener);
  }

  async requestPermissions() {
    const result = await requestBlePermissions();
    this.setSnapshot({
      permissionStatus: result.status,
      state: result.granted ? "idle" : "permission_required",
      userMessage: result.granted ? null : "يحتاج مفك إلى صلاحية البلوتوث للاتصال بالقطعة",
    });
    return result;
  }

  async scan() {
    const permission = await this.requestPermissions();
    if (!permission.granted) return;

    const bluetoothState = await this.ble.getBluetoothState();
    this.setSnapshot({ bluetoothState });
    if (bluetoothState !== "powered_on") {
      this.setSnapshot({ state: "bluetooth_disabled", userMessage: "فعّل البلوتوث في جوالك ثم حاول مرة أخرى" });
      return;
    }

    this.setSnapshot({ state: "scanning", devices: [], userMessage: "جاري البحث عن جهاز مفك" });
    await this.ble.scan((device) => {
      this.setSnapshot({
        state: "device_found",
        devices: [device, ...this.snapshot.devices.filter((existing) => existing.id !== device.id)],
        userMessage: "تم العثور على الجهاز",
      });
    });
    if (this.snapshot.state === "scanning") {
      this.setSnapshot({ state: "idle", userMessage: "لم يتم العثور على جهاز مفك قريب" });
    }
  }

  async stopScan() {
    this.clearReconnect();
    await this.ble.stopScan();
    if (this.snapshot.state === "scanning" || this.snapshot.state === "recovering") {
      this.setSnapshot({ state: "idle", userMessage: null });
    }
  }

  async connect(device: ObdDevice) {
    this.userDisconnect = false;
    this.clearReconnect();
    this.reconnectAttempt = 0;
    await this.connectInternal(device);
  }

  async reconnect() {
    const device = this.snapshot.selectedDevice ?? this.snapshot.lastSuccessfulDevice;
    if (!device) return;
    this.userDisconnect = false;
    await this.connectInternal(device);
  }

  async connectMock() {
    this.mockTransport = new MockElm327Transport();
    this.client = new Elm327Client(this.mockTransport);
    const mockDevice: ObdDevice = {
      id: "mock-v011",
      name: "V011 Mock",
      rssi: -42,
      serviceUUIDs: ["FFE0"],
      isV011Candidate: true,
    };
    this.setSnapshot({ state: "initializing_elm327", selectedDevice: mockDevice, userMessage: "تشغيل وضع المحاكاة" });
    const initResult = await initializeElm327(this.client);
    this.resetLiveSweep(initResult.supportedPids);
    this.setSnapshot({
      initResult,
      state: "vehicle_connected",
      liveReadings: buildLiveReadingCatalog(initResult.supportedPids),
      userMessage: "تم الاتصال بالسيارة",
    });
    await this.readVinAfterConnect();
    if (this.wantsLivePolling()) this.startPolling();
  }

  async disconnect() {
    this.userDisconnect = true;
    this.clearReconnect();
    this.setSnapshot({ state: "disconnecting", userMessage: "جاري فصل الاتصال" });
    this.livePollingDesired = false;
    this.backgroundLiveDesired = false;
    this.stopPolling();
    this.client?.dispose();
    this.client = null;
    this.mockTransport?.disconnect();
    this.mockTransport = null;
    this.recorder.reset();
    this.latency = new LatencyWindow();
    this.visibleCommands = [];
    this.frozenSignals = {};
    await this.ble.disconnect();
    this.setSnapshot({
      state: "disconnected",
      selectedDevice: null,
      initResult: null,
      liveValues: emptyLiveValues,
      liveReadings: {},
      liveSignals: {},
      frozen: false,
      recording: false,
      recordedFrames: [],
      playbackIndex: null,
      occupancy: "none",
      sessionActivity: "idle",
      userMessage: "تم فصل الاتصال",
    });
  }

  startLivePolling() {
    this.livePollingDesired = true;
    if (this.snapshot.occupancy === "none" || this.snapshot.occupancy === "live") {
      this.startPolling();
    }
  }

  startBackgroundLivePolling() {
    this.backgroundLiveDesired = true;
    if (this.snapshot.occupancy === "none" || this.snapshot.occupancy === "live") {
      this.startPolling();
    }
  }

  stopLivePolling() {
    this.livePollingDesired = false;
    if (this.snapshot.occupancy === "live" && !this.backgroundLiveDesired) {
      this.setSnapshot({ occupancy: "none", sessionActivity: "idle" });
    }
    if (!this.backgroundLiveDesired) this.stopPolling();
  }

  setVisibleCommands(commands: string[]) {
    this.visibleCommands = [...new Set(commands.map((item) => item.toUpperCase()))];
  }

  setFrozen(frozen: boolean) {
    if (frozen) this.frozenSignals = { ...this.snapshot.liveSignals };
    this.setSnapshot({ frozen });
  }

  startRecording() {
    this.recorder.start();
    this.setSnapshot({ recording: true, recordedFrames: [], playbackIndex: null });
  }

  stopRecording() {
    const frames = this.recorder.stop();
    this.setSnapshot({ recording: false, recordedFrames: frames });
  }

  setPlaybackIndex(index: number | null) {
    this.setSnapshot({ playbackIndex: index });
  }

  async readTroubleCodes(mode: "03" | "07" | "0A" = "03") {
    if (!this.client) return [];
    const response = await this.sendTraced(mode, { timeoutMs: 7_000 });
    return decodeDtcResponse(response, mode);
  }

  async runDiagnosticScan() {
    if (!this.ensureVehicleReady("diagnostics")) return;

    this.pausePollingFor("diagnostics");
    const startedAt = Date.now();
    this.setSnapshot({
      sessionActivity: "scanning_dtc",
      occupancy: "diagnostics",
      dtcScan: {
        id: `scan-${startedAt}`,
        startedAt,
        completedAt: null,
        status: "running",
        milOn: null,
        storedCount: 0,
        pendingCount: 0,
        permanentCount: 0,
        codes: [],
        readiness: [],
        errorMessage: null,
      },
      userMessage: "جارٍ الفحص",
    });

    try {
      const supported = this.snapshot.initResult?.supportedPids ?? [];
      const monitor = supported.includes("0101") || supported.length === 0
        ? decodeMonitorStatus(await this.sendTraced("0101", { timeoutMs: 5_000 }))
        : null;

      const storedCodes = await this.safeDtcMode("03");
      const pendingCodes = await this.safeDtcMode("07");
      const permanentCodes = await this.safeDtcMode("0A");
      const extraHeaders = (this.snapshot.initResult?.detectedEcus ?? [])
        .map((ecu) => requestHeaderFromResponseEcu(ecu))
        .filter((header): header is string => Boolean(header));
      const tireCheck = await collectTireCheck(
        (command, timeoutMs) => this.sendTraced(command, { timeoutMs, retries: 0, priority: ELM_PRIORITY.userAction }),
        this.snapshot.vehicleInfo?.vin,
        extraHeaders,
      ).catch(() => null);

      const codes: DecodedDtc[] = [
        ...storedCodes.map((code) => describeDtc(code, "stored")),
        ...pendingCodes.map((code) => describeDtc(code, "pending")),
        ...permanentCodes.map((code) => describeDtc(code, "permanent")),
        ...(tireCheck?.moduleCodes ?? []),
      ];

      const freezeFrame = storedCodes.length ? await this.loadFreezeFrame() : emptyFreezeFrame("unavailable");
      const lampNotes = buildDiagnosticLampNotes({
        milOn: monitor?.milOn ?? null,
        codes,
        extraModulesQueried: tireCheck?.probesTried ?? [],
      });

      const report: DiagnosticScanReport = {
        id: `scan-${startedAt}`,
        startedAt,
        completedAt: Date.now(),
        status: "complete",
        milOn: monitor?.milOn ?? null,
        dtcCount: monitor?.dtcCount ?? null,
        storedCount: storedCodes.length + (tireCheck?.moduleCodes.filter((item) => !storedCodes.includes(item.code)).length ?? 0),
        pendingCount: pendingCodes.length,
        permanentCount: permanentCodes.length,
        codes,
        readiness: monitor?.readiness ?? [],
        freezeFrame,
        lampNotes,
        extraModulesQueried: tireCheck?.probesTried ?? [],
        tireCheck: tireCheck
          ? {
              availability: tireCheck.availability,
              summaryAr: tireCheck.summaryAr,
              wheels: tireCheck.wheels,
              codes: tireCheck.codes,
              probesTried: tireCheck.probesTried,
            }
          : null,
        modules: tireCheck?.modules ?? [],
        errorMessage: tireCheck?.aborted ? "توقف فحص وحدات الهيكل بعد خطأ ناقل. أُعيد العنوان الافتراضي." : null,
      };

      const history: DiagnosticHistoryEntry = {
        id: report.id,
        scannedAt: report.completedAt ?? startedAt,
        storedCount: report.storedCount,
        pendingCount: report.pendingCount,
        permanentCount: report.permanentCount,
        milOn: report.milOn,
        codes: codes.map((item) => item.code),
      };

      this.setSnapshot({
        dtcScan: report,
        diagnosticHistory: [history, ...this.snapshot.diagnosticHistory].slice(0, 20),
        userMessage: tireCheck?.availability === "ok"
          ? "اكتمل الفحص · تم قراءة الإطارات"
          : codes.length
            ? `اكتمل الفحص · ${codes.length} أعطال`
            : "اكتمل الفحص · الإطارات إن وُجدت في وحدة TPMS",
      });
    } catch (error) {
      this.setSnapshot({
        dtcScan: {
          id: `scan-${startedAt}`,
          startedAt,
          completedAt: Date.now(),
          status: "failed",
          milOn: null,
          storedCount: 0,
          pendingCount: 0,
          permanentCount: 0,
          codes: [],
          readiness: [],
          errorMessage: error instanceof Error ? error.message : "تعذر إكمال الفحص",
        },
        userMessage: "تعذر إكمال فحص الأعطال",
        technicalError: error instanceof Error ? error.message : "unknown",
      });
    } finally {
      this.releaseOccupancy("diagnostics");
    }
  }

  async readVehicleInformation() {
    if (!this.ensureVehicleReady("vehicle_info")) return;

    this.pausePollingFor("vehicle_info");
    this.setSnapshot({
      sessionActivity: "reading_vehicle_info",
      occupancy: "vehicle_info",
      vehicleInfo: {
        status: "running",
        fields: [],
        vin: null,
        errorMessage: null,
        updatedAt: null,
      },
      userMessage: "جارٍ قراءة معلومات السيارة",
    });

    try {
      const fields: VehicleInfoField[] = [];
      const supportedMode01 = new Set(this.snapshot.initResult?.supportedPids ?? []);
      let mode09: string[] = [];
      try {
        mode09 = await this.client!.readSupportedPids("0900");
      } catch {
        mode09 = [];
      }

      const vinRaw = await this.tryCommand("0902", true);
      const vinDecoded = vinRaw ? decodeMode09Vin(vinRaw) : { vin: null, availability: "unavailable" as const };
      const identity = decodeVinIdentity(vinDecoded.vin);
      fields.push({
        key: "vin",
        section: "vehicle",
        labelAr: "رقم الهيكل",
        labelEn: "VIN",
        value: vinDecoded.vin,
        availability: vinDecoded.availability === "ok" ? "ok" : vinDecoded.availability === "malformed" ? "malformed" : "unavailable",
      });
      fields.push({
        key: "make",
        section: "vehicle",
        labelAr: "الشركة",
        labelEn: "Make",
        value: identity?.make ?? null,
        availability: vinDecoded.availability !== "ok" ? "unavailable" : identity?.make ? "ok" : "unsupported",
      });
      fields.push({
        key: "model",
        section: "vehicle",
        labelAr: "الموديل",
        labelEn: "Model",
        value: identity?.model ?? null,
        availability: vinDecoded.availability !== "ok" ? "unavailable" : "unsupported",
      });
      fields.push({
        key: "modelYear",
        section: "vehicle",
        labelAr: "سنة الصنع",
        labelEn: "Model Year",
        value: identity?.modelYear ? String(identity.modelYear) : null,
        availability: vinDecoded.availability !== "ok" ? "unavailable" : identity?.modelYear ? "ok" : "unsupported",
      });

      fields.push(await this.readMode09Text("0904", mode09, "Calibration ID", "Calibration ID"));
      fields.push(await this.readMode09Text("0906", mode09, "CVN", "CVN"));
      fields.push(await this.readMode09Text("090A", mode09, "ECU Name", "ECU Name"));

      fields.push(await this.readStaticPid("011C", supportedMode01, "OBD Standard", "OBD Standard", "vehicle"));
      fields.push(await this.readStaticPid("0151", supportedMode01, "Fuel Type", "Fuel Type", "vehicle"));
      if (supportedMode01.has("01A6")) {
        fields.push(await this.readStaticPid("01A6", supportedMode01, "عداد المسافة", "Odometer", "vehicle"));
      }

      fields.push({
        key: "protocol",
        section: "connection",
        labelAr: "البروتوكول",
        labelEn: "Protocol",
        value: this.snapshot.initResult?.detectedProtocol ?? this.snapshot.initResult?.protocolNumber ?? null,
        availability: this.snapshot.initResult?.detectedProtocol ? "ok" : "unavailable",
      });
      fields.push({
        key: "supportedPidCount",
        section: "connection",
        labelAr: "عدد PID المدعومة",
        labelEn: "Supported PIDs",
        value: String(supportedMode01.size),
        availability: "ok",
      });
      fields.push({
        key: "ecuCount",
        section: "connection",
        labelAr: "وحدات التحكم المستجيبة",
        labelEn: "Responding ECUs",
        value: String(this.snapshot.initResult?.detectedEcus?.length || 1),
        availability: "ok",
      });
      fields.push({
        key: "adapterVersion",
        section: "adapter",
        labelAr: "إصدار القطعة",
        labelEn: "Adapter Version",
        value: this.snapshot.initResult?.elmVersion ?? null,
        availability: this.snapshot.initResult?.elmVersion ? "ok" : "unavailable",
      });

      let adapterVoltage: string | null = this.snapshot.initResult?.adapterVoltage ?? null;
      try {
        adapterVoltage = await this.sendTraced("ATRV", { timeoutMs: 3_000 });
      } catch {
        adapterVoltage = adapterVoltage;
      }
      fields.push({
        key: "adapterVoltage",
        section: "adapter",
        labelAr: "فولتية القطعة",
        labelEn: "Adapter Voltage",
        value: adapterVoltage,
        availability: adapterVoltage ? "ok" : "unavailable",
      });

      const info: VehicleInformation = {
        status: "complete",
        fields,
        vin: vinDecoded.vin,
        errorMessage: null,
        updatedAt: Date.now(),
      };
      this.setSnapshot({ vehicleInfo: info, userMessage: vinDecoded.vin ? "تم قراءة رقم الهيكل" : "تم قراءة المعلومات المتاحة" });
    } catch (error) {
      this.setSnapshot({
        vehicleInfo: {
          status: "failed",
          fields: this.snapshot.vehicleInfo?.fields ?? [],
          vin: null,
          errorMessage: error instanceof Error ? error.message : "تعذر قراءة المعلومات",
          updatedAt: Date.now(),
        },
        userMessage: "تعذر قراءة معلومات السيارة",
      });
    } finally {
      this.releaseOccupancy("vehicle_info");
    }
  }

  async collectVehicleFingerprint(): Promise<VehicleFingerprint | null> {
    if (!this.ensureVehicleReady("vehicle_info")) return null;
    this.pausePollingFor("vehicle_info");
    try {
      return await collectVehicleFingerprintFromSend(
        (command, timeoutMs) => this.sendTraced(command, { timeoutMs, retries: 0, priority: ELM_PRIORITY.userAction }),
        {
          protocol: this.snapshot.initResult?.detectedProtocol ?? this.snapshot.initResult?.protocolNumber,
          supportedPids: this.snapshot.initResult?.supportedPids ?? [],
          ecuIds: this.snapshot.initResult?.detectedEcus ?? [],
        },
      );
    } finally {
      this.releaseOccupancy("vehicle_info");
    }
  }

  async readFreezeFrame() {
    if (!this.ensureVehicleReady("diagnostics")) return;
    this.pausePollingFor("diagnostics");
    try {
      const report = await this.loadFreezeFrame();
      this.setSnapshot({
        dtcScan: this.snapshot.dtcScan
          ? { ...this.snapshot.dtcScan, freezeFrame: report }
          : {
              id: `ff-${Date.now()}`,
              startedAt: Date.now(),
              completedAt: Date.now(),
              status: "complete",
              milOn: null,
              storedCount: 0,
              pendingCount: 0,
              permanentCount: 0,
              codes: [],
              readiness: [],
              freezeFrame: report,
              errorMessage: null,
            },
        userMessage: report.dtc ? `Freeze Frame · ${report.dtc}` : "لا توجد بيانات Freeze Frame",
      });
    } finally {
      this.releaseOccupancy("diagnostics");
    }
  }

  async clearTroubleCodesAfterConfirmation() {
    if (!this.client) throw new Error("ELM327 client is not ready");
    this.pausePollingFor("diagnostics");
    try {
      const raw = await this.sendTraced("04", { timeoutMs: 8_000, retries: 0, priority: ELM_PRIORITY.critical });
      this.setSnapshot({ userMessage: "تم إرسال مسح الأكواد. المسح لا يعني إصلاح العطل." });
      await this.runDiagnosticScan();
      return raw;
    } finally {
      this.releaseOccupancy("diagnostics");
    }
  }

  getLastCapabilityAudit() {
    return this.lastCapabilityReport;
  }

  async runCapabilityAudit(options?: { allowAtz?: boolean }) {
    if (!this.ensureVehicleReady("diagnostics")) {
      throw new Error("Vehicle is not connected for a read-only capability audit");
    }

    this.pausePollingFor("diagnostics");
    this.setSnapshot({
      occupancy: "diagnostics",
      userMessage: "فحص قدرات OBD (قراءة فقط)",
    });

    let transportFailed = false;
    let result: CapabilityAuditResult | null = null;
    try {
      result = await runObdCapabilityScan({
        allowAtz: options?.allowAtz === true,
        send: async (command, timeoutMs) => {
          const started = Date.now();
          try {
            const safe = assertSafeDiagnosticCommand(command, { allowAtz: options?.allowAtz === true });
            const detailed = await this.client!.sendDetailed(safe, {
              timeoutMs: timeoutMs ?? 4_000,
              retries: 0,
              priority: ELM_PRIORITY.userAction,
            });
            this.pushTrace({
              command: detailed.command,
              rawResponse: detailed.rawResponse ?? "",
              parsed: detailed.normalizedResponse ?? "",
              timestamp: Date.now(),
              latencyMs: detailed.sentAt ? Date.now() - detailed.sentAt : Date.now() - started,
              error: null,
            });
            return {
              command: detailed.command,
              rawResponse: detailed.rawResponse ?? "",
              normalizedResponse: detailed.normalizedResponse ?? "",
              sentAt: detailed.sentAt ?? started,
              receivedAt: detailed.completedAt ?? Date.now(),
              responseTimeMs: detailed.sentAt && detailed.completedAt ? detailed.completedAt - detailed.sentAt : Date.now() - started,
              timeout: detailed.status === "timeout",
              retryCount: 0,
              success: detailed.status === "completed",
              error: detailed.error ?? null,
            };
          } catch (error) {
            const message = error instanceof Error ? error.message : "unknown";
            transportFailed = /timeout|reconnect|not ready/i.test(message);
            this.pushTrace({
              command,
              rawResponse: "",
              parsed: "",
              timestamp: Date.now(),
              latencyMs: Date.now() - started,
              error: message,
            });
            return {
              command,
              rawResponse: "",
              normalizedResponse: "",
              sentAt: started,
              receivedAt: Date.now(),
              responseTimeMs: Date.now() - started,
              timeout: /timeout/i.test(message),
              retryCount: 0,
              success: false,
              error: message,
            };
          }
        },
      });

      this.lastCapabilityReport = result;
      obdLogger.log("info", "capability_audit_complete", "اكتمل فحص قدرات OBD (قراءة فقط)", {
        commands: result.json.commandsSent.length,
        working: result.json.workingPids.length,
        missingDecoders: result.json.missingDecoders.length,
      });
      this.setSnapshot({ userMessage: "اكتمل فحص القدرات (قراءة فقط)" });
      return result;
    } finally {
      if (!transportFailed && this.client) {
        try {
          const restoreCommands = ["ATH0", "ATCAF1"];
          const protocol = result?.restoreHints.protocolSelect;
          if (protocol && protocol !== "ATSP0") restoreCommands.push(protocol);
          for (const command of restoreCommands) {
            const safe = assertSafeDiagnosticCommand(command, { allowAtz: false });
            await this.client.sendDetailed(safe, { timeoutMs: 2_000, retries: 0, priority: ELM_PRIORITY.userAction });
          }
        } catch {
          obdLogger.log("warn", "capability_audit_restore_failed", "تعذر استعادة إعدادات المحول بعد الفحص");
        }
      }
      this.releaseOccupancy("diagnostics");
    }
  }

  destroy() {
    this.userDisconnect = true;
    this.clearReconnect();
    this.stopPolling();
    this.client?.dispose();
    this.ble.destroy();
    this.bluetoothUnsubscribe?.();
    this.disconnectUnsubscribe?.();
    this.appStateSubscription?.remove();
  }

  private ensureVehicleReady(occupancy: ObdCommandOccupancy) {
    if (this.snapshot.state !== "vehicle_connected" || !this.client) {
      this.setSnapshot({
        userMessage: "تحقق من الاتصال بالقطعة وتوفر وحدة التحكم قبل المتابعة",
      });
      return false;
    }
    if (this.snapshot.occupancy !== "none" && this.snapshot.occupancy !== occupancy && this.snapshot.occupancy !== "live") {
      this.setSnapshot({ userMessage: "هناك عملية OBD أخرى قيد التنفيذ" });
      return false;
    }
    return true;
  }

  private pausePollingFor(occupancy: ObdCommandOccupancy) {
    this.stopPolling();
    this.setSnapshot({ occupancy });
  }

  private releaseOccupancy(occupancy: ObdCommandOccupancy) {
    if (this.snapshot.occupancy === occupancy) {
      this.setSnapshot({ occupancy: this.wantsLivePolling() ? "live" : "none", sessionActivity: this.wantsLivePolling() ? "reading_live" : "idle" });
    }
    if (this.wantsLivePolling()) this.startPolling();
  }

  private async loadFreezeFrame(): Promise<FreezeFrameReport> {
    if (!this.client) return emptyFreezeFrame("unavailable");
    let supported: string[] = [];
    try {
      supported = await this.client.readSupportedPids("0200");
    } catch {
      supported = [];
    }
    const dtcRaw = await this.tryCommand("0202", supported.length === 0 || supported.includes("0202"));
    if (!dtcRaw) return emptyFreezeFrame(supported.length === 0 ? "unavailable" : "unsupported");
    const dtc = decodeFreezeFrameDtc(dtcRaw);
    const pids = ["020C", "020D", "0205", "0204", "0211"].filter((pid) => supported.length === 0 || supported.includes(pid));
    const items = [];
    for (const pid of pids) {
      const raw = await this.tryCommand(pid, true);
      if (!raw) continue;
      const item = decodeFreezeFramePid(pid, raw);
      if (item) items.push(item);
    }
    return {
      dtc,
      items,
      availability: dtc || items.length ? "ok" : "unavailable",
      raw: dtcRaw,
    };
  }

  private async safeDtcMode(mode: "03" | "07" | "0A") {
    try {
      const response = await this.sendTraced(mode, { timeoutMs: 7_000, priority: ELM_PRIORITY.userAction });
      return decodeDtcResponse(response, mode);
    } catch (error) {
      obdLogger.log("warn", "dtc_mode_failed", `تعذر قراءة وضع ${mode}`, {
        reason: error instanceof Error ? error.message : "unknown",
      });
      return [];
    }
  }

  private async tryCommand(command: string, allowed: boolean) {
    if (!allowed || !this.client) return null;
    try {
      return await this.sendTraced(command, { timeoutMs: 7_000 });
    } catch {
      return null;
    }
  }

  private async readMode09Text(pid: string, supported: string[], labelEn: string, labelAr: string): Promise<VehicleInfoField> {
    if (supported.length > 0 && !supported.includes(pid)) {
      return {
        key: pid,
        section: "vehicle",
        labelAr,
        labelEn,
        value: null,
        availability: "unsupported",
      };
    }
    const raw = await this.tryCommand(pid, true);
    if (!raw) {
      return { key: pid, section: "vehicle", labelAr, labelEn, value: null, availability: "unavailable" };
    }
    const value = decodeMode09Text(raw, pid);
    return {
      key: pid,
      section: "vehicle",
      labelAr,
      labelEn,
      value,
      availability: value ? "ok" : "unavailable",
    };
  }

  private async readStaticPid(
    pid: string,
    supported: Set<string>,
    labelEn: string,
    labelAr: string,
    section: VehicleInfoField["section"],
  ): Promise<VehicleInfoField> {
    if (supported.size > 0 && !supported.has(pid)) {
      return { key: pid, section, labelAr, labelEn, value: null, availability: "unsupported" };
    }
    try {
      const decoded = decodeMode01Pid(pid, await this.sendTraced(pid, { timeoutMs: 4_000 }));
      return {
        key: pid,
        section,
        labelAr,
        labelEn,
        value: decoded.status === "ok" && decoded.value != null ? String(decoded.value) : null,
        availability: decoded.status === "ok" ? "ok" : decoded.status === "unsupported" ? "unsupported" : "unavailable",
      };
    } catch {
      return { key: pid, section, labelAr, labelEn, value: null, availability: "unavailable" };
    }
  }

  private async sendTraced(command: string, options?: Parameters<Elm327Client["sendDetailed"]>[1]) {
    if (!this.client) throw new Error("ELM327 client is not ready");
    const started = Date.now();
    try {
      const result = await this.client.sendDetailed(command, options);
      this.pushTrace({
        command: result.command,
        rawResponse: result.rawResponse ?? "",
        parsed: result.normalizedResponse ?? "",
        timestamp: Date.now(),
        latencyMs: result.sentAt ? Date.now() - result.sentAt : Date.now() - started,
        error: null,
      });
      return result.normalizedResponse ?? result.rawResponse ?? "";
    } catch (error) {
      this.pushTrace({
        command,
        rawResponse: "",
        parsed: "",
        timestamp: Date.now(),
        latencyMs: Date.now() - started,
        error: error instanceof Error ? error.message : "unknown",
      });
      throw error;
    }
  }

  private pushTrace(entry: ObdSnapshot["commandTrace"][number]) {
    this.setSnapshot({ commandTrace: [entry, ...this.snapshot.commandTrace].slice(0, 40) });
  }

  private async readVinAfterConnect() {
    if (!this.client || this.snapshot.state !== "vehicle_connected") return;

    this.setSnapshot({ userMessage: "جارٍ قراءة رقم الهيكل" });
    let decoded: ReturnType<typeof decodeMode09Vin> = { vin: null, availability: "unavailable" };

    for (let attempt = 0; attempt < 2 && decoded.availability !== "ok"; attempt += 1) {
      try {
        const raw = await this.sendTraced("0902", {
          timeoutMs: 12_000,
          retries: 1,
          priority: ELM_PRIORITY.userAction,
        });
        decoded = decodeMode09Vin(raw);
      } catch {
        decoded = { vin: null, availability: "unavailable" };
      }
    }

    const identity = decodeVinIdentity(decoded.vin);
    this.setSnapshot({
      vehicleInfo: {
        status: "complete",
        vin: decoded.vin,
        errorMessage: decoded.availability === "ok" ? null : "تعذر قراءة VIN بعد الاتصال. افتح معلومات المركبة لإعادة المحاولة.",
        updatedAt: Date.now(),
        fields: [
          {
            key: "vin",
            section: "vehicle",
            labelAr: "رقم الهيكل",
            labelEn: "VIN",
            value: decoded.vin,
            availability: decoded.availability === "ok" ? "ok" : decoded.availability === "malformed" ? "malformed" : "unavailable",
          },
          {
            key: "make",
            section: "vehicle",
            labelAr: "الشركة",
            labelEn: "Make",
            value: identity?.make ?? null,
            availability: decoded.availability !== "ok" ? "unavailable" : identity?.make ? "ok" : "unsupported",
          },
        ],
      },
      userMessage: decoded.availability === "ok" ? "تم قراءة رقم الهيكل" : "تم الاتصال. تعذر قراءة VIN حالياً",
    });
  }

  private async connectInternal(device: ObdDevice) {
    try {
      this.sessionId += 1;
      this.stopPolling();
      this.client?.cancelAll("session replaced");
      this.client?.dispose();
      this.client = null;
      await this.ble.disconnect();

      this.setSnapshot({
        state: "connecting",
        selectedDevice: device,
        userMessage: "جاري اتصال البلوتوث",
        technicalError: null,
      });
      await this.ble.connect(device.id);
      this.setSnapshot({ state: "discovering_services", userMessage: "تم ربط البلوتوث، جاري تفعيل الإشعارات" });
      this.client = new Elm327Client(this.ble);
      this.setSnapshot({ state: "initializing_elm327", userMessage: "القطعة جاهزة للأوامر، جاري التهيئة" });
      const initResult = await initializeElm327(this.client, (phase) => {
        if (phase === "vehicle_searching") {
          this.setSnapshot({ state: "vehicle_searching", userMessage: "جاري البحث عن بروتوكول السيارة" });
        }
      });
      const vehicleMessage = vehicleMessageFor(initResult);
      this.resetLiveSweep(initResult.supportedPids);
      this.setSnapshot({
        initResult,
        lastSuccessfulDevice: initResult.adapterConnected ? device : this.snapshot.lastSuccessfulDevice,
        state: initResult.vehicleConnected ? "vehicle_connected" : "vehicle_not_ready",
        liveReadings: buildLiveReadingCatalog(initResult.supportedPids),
        userMessage: vehicleMessage,
      });
      this.reconnectAttempt = 0;
      if (initResult.vehicleConnected) {
        await this.readVinAfterConnect();
        if (this.wantsLivePolling()) this.startPolling();
      }
    } catch (error) {
      this.setSnapshot({
        state: "error",
        userMessage: "تعذر إكمال اقتران القطعة",
        technicalError: error instanceof Error ? error.message : "unknown error",
      });
      obdLogger.log("error", "connect_failed", "فشل اتصال OBD", {
        reason: error instanceof Error ? error.message : "unknown",
      });
      if (!this.userDisconnect) this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    const delays = [1_000, 2_000, 4_000, 8_000, 15_000, 30_000];
    if (this.reconnectAttempt >= delays.length) {
      this.setSnapshot({
        state: "error",
        userMessage: "تعذر إعادة الاتصال. ابحث عن القطعة مرة أخرى",
      });
      return;
    }

    const delay = delays[this.reconnectAttempt];
    this.reconnectAttempt += 1;
    this.setSnapshot({
      state: "recovering",
      userMessage: `جاري إعادة بناء الجلسة (${this.reconnectAttempt}/${delays.length})`,
    });
    this.clearReconnect();
    this.reconnectTimer = setTimeout(() => {
      void this.reconnect();
    }, delay);
  }

  private clearReconnect() {
    if (!this.reconnectTimer) return;
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  private isBusOccupiedByExclusiveWork() {
    return this.snapshot.occupancy === "diagnostics" || this.snapshot.occupancy === "vehicle_info";
  }

  private wantsLivePolling() {
    return this.livePollingDesired || this.backgroundLiveDesired;
  }

  private startPolling() {
    if (!this.client || this.pollingActive) return;
    if (this.snapshot.state !== "vehicle_connected") return;
    if (this.snapshot.occupancy === "diagnostics" || this.snapshot.occupancy === "vehicle_info") return;

    this.pollingActive = true;
    this.pollCycle = 0;
    this.setSnapshot({ occupancy: "live", sessionActivity: "reading_live" });
    void this.pollLoop();
  }

  private stopPolling() {
    this.pollingActive = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private async pollLoop() {
    const generation = this.sessionId;
    if (!this.pollingActive || !this.client) return;
    if (this.isBusOccupiedByExclusiveWork()) return;

    const supported = this.snapshot.initResult?.supportedPids ?? [];
    const advertised = new Set(supported.map((pid) => pid.toUpperCase()));
    const pids = planPollCommands({
      supportedCommands: [...advertised, ...this.liveConfirmedPids],
      visibleCommands: this.visibleCommands,
      extraCommands: [...ALWAYS_PROBE_LIVE_PIDS],
      skipCommands: [...this.liveSkipPids],
      cycle: this.pollCycle,
      averageLatencyMs: this.snapshot.pollMetrics.p50 || this.snapshot.pollMetrics.lastLatencyMs,
    });

    for (const pid of pids) {
      if (!this.pollingActive || !this.client || this.sessionId !== generation) return;
      if (this.isBusOccupiedByExclusiveWork()) return;

      const extraProbe = !advertised.has(pid) && !this.liveConfirmedPids.has(pid);
      const started = Date.now();
      try {
        const raw = await this.sendTraced(pid, {
          timeoutMs: extraProbe ? 1_500 : 3_000,
          dedupeKey: `pid:${pid}`,
          priority: ELM_PRIORITY.realtime,
        });
        this.latency.push(Date.now() - started);
        const value = decodeMode01Pid(pid, raw);
        const signals = decodePidSignals(pid, raw);
        this.updateLiveValue(pid, value, signals);
        if (value.status === "ok" || signals.some((item) => item.status === "available")) {
          this.liveConfirmedPids.add(pid);
        } else if (value.status === "no_data") {
          this.setSnapshot({
            pollMetrics: this.latency.snapshot({
              noDataCount: this.snapshot.pollMetrics.noDataCount + 1,
              queueDepth: this.client.getQueueMetrics().queueDepth,
            }),
          });
          if (extraProbe) this.markExtraProbeMiss(pid);
        } else if (extraProbe) {
          this.markExtraProbeMiss(pid);
        }
      } catch (error) {
        this.latency.push(Date.now() - started);
        if (extraProbe) this.markExtraProbeMiss(pid);
        this.setSnapshot({
          pollMetrics: this.latency.snapshot({
            timeoutCount: this.snapshot.pollMetrics.timeoutCount + 1,
            queueDepth: this.client.getQueueMetrics().queueDepth,
          }),
        });
        obdLogger.log("warn", "poll_failed", "تعذر قراءة PID", {
          pid,
          reason: error instanceof Error ? error.message : "unknown",
        });
      }
    }

    if (this.pollingActive && this.pollCycle % 8 === 0) {
      try {
        const adapterVoltage = await this.sendTraced("ATRV", { timeoutMs: 3_000, dedupeKey: "pid:ATRV", priority: ELM_PRIORITY.background });
        this.setSnapshot({
          liveReadings: {
            ...this.snapshot.liveReadings,
            ATRV: {
              pid: "ATRV",
              arabicLabel: "فولتية القطعة",
              englishLabel: "Adapter Voltage",
              category: "voltage",
              value: adapterVoltage.replace(/\s+/g, " ").trim(),
              unit: null,
              status: "ok",
              raw: adapterVoltage,
              updatedAt: Date.now(),
            },
          },
        });
      } catch {
        /* adapter voltage is optional */
      }
    }

    this.pollCycle += 1;
    const delay = Math.max(120, Math.min(900, (this.snapshot.pollMetrics.p50 || 180) * 0.4));
    this.pollTimer = setTimeout(() => void this.pollLoop(), delay);
  }

  private resetLiveSweep(supportedPids: string[]) {
    this.liveSkipPids.clear();
    this.liveProbeMisses.clear();
    this.liveConfirmedPids = new Set(
      supportedPids.map((pid) => pid.toUpperCase()).filter((pid) => !isMode01SupportQuery(pid)),
    );
    this.recorder.reset();
    this.latency = new LatencyWindow();
  }

  private markExtraProbeMiss(pid: string) {
    const misses = (this.liveProbeMisses.get(pid) ?? 0) + 1;
    this.liveProbeMisses.set(pid, misses);
    if (misses < 2) return;
    this.liveSkipPids.add(pid);
    this.updateLiveValue(pid, {
      pid,
      label: LIVE_PID_BY_COMMAND.get(pid)?.label ?? pid,
      value: null,
      unit: null,
      status: "unsupported",
      raw: "",
    });
  }

  private updateLiveValue(pid: string, value: DecodedPidValue, signals: SignalReading[] = []) {
    const key = pidToLiveKey(pid);
    const liveSignals = { ...this.snapshot.liveSignals };
    for (const signal of signals) {
      liveSignals[signal.id] = signal;
    }
    if (!this.snapshot.frozen) {
      this.recorder.capture(liveSignals);
    }
    this.setSnapshot({
      liveReadings: {
        ...this.snapshot.liveReadings,
        [pid]: toLiveReading(value),
      },
      liveSignals,
      liveValues: key
        ? {
            ...this.snapshot.liveValues,
            [key]: value,
          }
        : this.snapshot.liveValues,
      recording: this.recorder.recording,
      recordedFrames: this.recorder.recording ? this.recorder.getSession() : this.snapshot.recordedFrames,
      pollMetrics: this.latency.snapshot({
        queueDepth: this.client?.getQueueMetrics().queueDepth ?? 0,
        noDataCount: this.snapshot.pollMetrics.noDataCount,
        timeoutCount: this.snapshot.pollMetrics.timeoutCount,
        parserErrorCount: this.snapshot.pollMetrics.parserErrorCount,
      }),
    });
  }

  private setSnapshot(next: Partial<ObdSnapshot>) {
    this.snapshot = { ...this.snapshot, ...next };
    this.listeners.forEach((listener) => listener(this.snapshot));
  }
}
