import { AppState, NativeEventSubscription } from "react-native";

import { MfkBleManager } from "../ble/ble-manager";
import { requestBlePermissions } from "../ble/ble-permissions";
import { Elm327Client } from "../elm327/elm327-client";
import { initializeElm327 } from "../elm327/elm327-initializer";
import { decodeDtcResponse } from "../pids/pid-decoder";
import { LIVE_POLLING_PIDS } from "../pids/standard-pids";
import { obdLogger } from "./obd-logger";
import { MockElm327Transport } from "./mock-elm327-transport";
import type { DecodedPidValue, Elm327InitializationResult, LiveObdValues, ObdDevice, ObdSnapshot } from "../types/obd.types";

const emptyLiveValues: LiveObdValues = {
  rpm: null,
  speed: null,
  coolantTemp: null,
  engineLoad: null,
  throttle: null,
  fuelLevel: null,
  controlModuleVoltage: null,
};

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

export class ObdService {
  private ble = new MfkBleManager();
  private client: Elm327Client | null = null;
  private mockTransport: MockElm327Transport | null = null;
  private snapshot: ObdSnapshot = {
    state: "idle",
    permissionStatus: "unknown",
    bluetoothState: "unknown",
    devices: [],
    selectedDevice: null,
    initResult: null,
    liveValues: emptyLiveValues,
    logs: [],
    userMessage: null,
    technicalError: null,
  };
  private listeners = new Set<(snapshot: ObdSnapshot) => void>();
  private pollTimers: ReturnType<typeof setInterval>[] = [];
  private bluetoothUnsubscribe: (() => void) | null = null;
  private disconnectUnsubscribe: (() => void) | null = null;
  private appStateSubscription: NativeEventSubscription | null = null;

  constructor() {
    obdLogger.subscribe((logs) => this.setSnapshot({ logs }));
    this.bluetoothUnsubscribe = this.ble.onBluetoothState((state) => this.setSnapshot({ bluetoothState: state }));
    this.disconnectUnsubscribe = this.ble.onDisconnected(() => {
      this.stopPolling();
      this.client?.cancelAll("BLE disconnected");
      this.setSnapshot({
        state: "disconnected",
        userMessage: "انقطع الاتصال بالقطعة",
        selectedDevice: null,
      });
    });
    this.appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") this.stopPolling();
      if (state === "active" && this.snapshot.state === "vehicle_connected") this.startPolling();
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
  }

  async stopScan() {
    await this.ble.stopScan();
    if (this.snapshot.state === "scanning") this.setSnapshot({ state: "idle" });
  }

  async connect(device: ObdDevice) {
    try {
      this.setSnapshot({ state: "connecting", selectedDevice: device, userMessage: "جاري الاتصال" });
      await this.ble.connect(device.id);
      this.client = new Elm327Client(this.ble);
      this.setSnapshot({ state: "initializing_elm327", userMessage: "تم الاتصال بالقطعة، جاري الاتصال بالسيارة" });
      const initResult = await initializeElm327(this.client);
      this.setSnapshot({
        initResult,
        state: initResult.vehicleConnected ? "vehicle_connected" : "vehicle_not_ready",
        userMessage: initResult.vehicleConnected ? "تم الاتصال بالسيارة" : "تأكد من تشغيل سويتش السيارة",
      });
      if (initResult.vehicleConnected) this.startPolling();
    } catch (error) {
      this.setSnapshot({
        state: "error",
        userMessage: "تعذر الاتصال بالسيارة",
        technicalError: error instanceof Error ? error.message : "unknown error",
      });
      obdLogger.log("error", "connect_failed", "فشل اتصال OBD", {
        reason: error instanceof Error ? error.message : "unknown",
      });
    }
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
    this.setSnapshot({ initResult, state: "vehicle_connected", userMessage: "تم الاتصال بالسيارة" });
    this.startPolling();
  }

  async disconnect() {
    this.setSnapshot({ state: "disconnecting", userMessage: "جاري فصل الاتصال" });
    this.stopPolling();
    this.client?.dispose();
    this.client = null;
    this.mockTransport?.disconnect();
    this.mockTransport = null;
    await this.ble.disconnect();
    this.setSnapshot({
      state: "disconnected",
      selectedDevice: null,
      initResult: null,
      liveValues: emptyLiveValues,
      userMessage: "تم فصل الاتصال",
    });
  }

  async readTroubleCodes(mode: "03" | "07" | "0A" = "03") {
    if (!this.client) return [];
    const response = await this.client.sendCommand(mode, { timeoutMs: 7_000 });
    return decodeDtcResponse(response, mode);
  }

  async clearTroubleCodesAfterConfirmation() {
    if (!this.client) throw new Error("ELM327 client is not ready");
    return this.client.clearTroubleCodes();
  }

  destroy() {
    this.stopPolling();
    this.client?.dispose();
    this.ble.destroy();
    this.bluetoothUnsubscribe?.();
    this.disconnectUnsubscribe?.();
    this.appStateSubscription?.remove();
  }

  private startPolling() {
    if (!this.client || this.pollTimers.length > 0) return;

    const poll = async (pids: readonly string[]) => {
      if (!this.client) return;
      for (const pid of pids) {
        const key = pidToLiveKey(pid);
        if (!key) continue;
        const initResult = this.snapshot.initResult;
        if (initResult?.supportedPids.length && !initResult.supportedPids.includes(pid)) continue;
        try {
          const value = await this.client.readPid(pid);
          this.updateLiveValue(key, value);
        } catch (error) {
          obdLogger.log("warn", "poll_failed", "تعذر قراءة PID", {
            pid,
            reason: error instanceof Error ? error.message : "unknown",
          });
        }
      }
    };

    this.pollTimers = [
      setInterval(() => void poll(LIVE_POLLING_PIDS.fast), 900),
      setInterval(() => void poll(LIVE_POLLING_PIDS.normal), 1_500),
      setInterval(() => void poll(LIVE_POLLING_PIDS.slow), 4_000),
    ];
    void poll([...LIVE_POLLING_PIDS.fast, ...LIVE_POLLING_PIDS.normal, ...LIVE_POLLING_PIDS.slow]);
  }

  private stopPolling() {
    this.pollTimers.forEach((timer) => clearInterval(timer));
    this.pollTimers = [];
  }

  private updateLiveValue(key: keyof LiveObdValues, value: DecodedPidValue) {
    this.setSnapshot({
      liveValues: {
        ...this.snapshot.liveValues,
        [key]: value,
      },
    });
  }

  private setSnapshot(next: Partial<ObdSnapshot>) {
    this.snapshot = { ...this.snapshot, ...next };
    this.listeners.forEach((listener) => listener(this.snapshot));
  }
}
