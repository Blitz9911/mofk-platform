import { Platform } from "react-native";
import {
  BleError,
  BleManager,
  Characteristic,
  Device,
  State,
  Subscription,
} from "react-native-ble-plx";

import { asciiToBase64, base64ToAscii } from "./base64";
import {
  applyPidResponse,
  decodePidResponse,
  decodeSupportedPidsBitmap,
  LiveTelemetry,
  PID_DEFINITIONS,
  pidRequestCommand,
} from "./pids";
import { requestBlePermissions } from "./permissions";
import {
  classifyResponse,
  COMMAND_TIMEOUT_MS,
  frameCommand,
  normalizeResponse,
  PROMPT_BYTE,
  ResponseOutcome,
} from "./protocol";
import {
  DEVICE_NAME_HINT,
  OBD_NOTIFY_UUID,
  OBD_SERVICE_UUID,
  OBD_WRITE_UUID,
} from "./uuids";

export type ObdConnectionState =
  | "idle"
  | "scanning"
  | "connecting"
  | "discovering"
  | "subscribing"
  | "initializing"
  | "searching-protocol"
  | "ready"
  | "recovering"
  | "disconnected"
  | "error";

export interface ObdLogEntry {
  time: number;
  direction: "tx" | "rx" | "info" | "error";
  text: string;
}

export interface ObdAdapterInfo {
  identity?: string;
  protocolText?: string;
  protocolNumber?: string;
}

export interface ScannedObdDevice {
  id: string;
  name: string;
  rssi: number | null;
}

export class TransactionError extends Error {
  outcome: ResponseOutcome | "timeout";
  constructor(outcome: ResponseOutcome | "timeout", message: string) {
    super(message);
    this.outcome = outcome;
  }
}

interface QueuedCommand {
  command: string;
  timeoutMs: number;
  resolve: (raw: string) => void;
  reject: (err: Error) => void;
}

// §2.2 observed notification-subscription settling interval — a starting
// point for validation, not a fixed V011 requirement.
const SETTLING_MS = 900;
const RECONNECT_BACKOFF_MS = [1000, 2000, 4000];

// §5 observed working initialization, sent in this order with CR framing.
// ATH0 is inserted before any OBD request: with ATS0 already active, an
// 11-bit CAN ECU header renders as an odd nibble count that would misalign
// every byte after it. ATH1 above still satisfies the documented
// commissioning step; this keeps PID parsing unambiguous.
const INIT_SEQUENCE: { command: string; timeoutMs: number }[] = [
  { command: "ATI", timeoutMs: COMMAND_TIMEOUT_MS["identity-reset"] },
  { command: "ATZ", timeoutMs: COMMAND_TIMEOUT_MS["identity-reset"] },
  { command: "ATE0", timeoutMs: COMMAND_TIMEOUT_MS["local-setup"] },
  { command: "ATL0", timeoutMs: COMMAND_TIMEOUT_MS["local-setup"] },
  { command: "ATS0", timeoutMs: COMMAND_TIMEOUT_MS["local-setup"] },
  { command: "ATH1", timeoutMs: COMMAND_TIMEOUT_MS["local-setup"] },
  { command: "ATSP0", timeoutMs: COMMAND_TIMEOUT_MS["local-setup"] },
  { command: "ATAT1", timeoutMs: COMMAND_TIMEOUT_MS["local-setup"] },
  { command: "ATH0", timeoutMs: COMMAND_TIMEOUT_MS["local-setup"] },
  { command: "0100", timeoutMs: COMMAND_TIMEOUT_MS["protocol-search"] },
  { command: "ATDP", timeoutMs: COMMAND_TIMEOUT_MS["local-setup"] },
  { command: "ATDPN", timeoutMs: COMMAND_TIMEOUT_MS["local-setup"] },
];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type Listener<T> = (payload: T) => void;
class Emitter<T> {
  private listeners = new Set<Listener<T>>();
  subscribe(fn: Listener<T>): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  emit(payload: T) {
    this.listeners.forEach((fn) => fn(payload));
  }
}

/**
 * Drove West V011 BLE OBD-II transport: scan/connect, GATT setup, a
 * single-flight prompt-terminated command queue, response classification
 * and a bounded reconnection policy — following the V011 Application
 * Integration Reference Rev 1.0.
 */
export class ObdBleManager {
  private manager = new BleManager();
  private device: Device | null = null;
  private notifySubscription: Subscription | null = null;
  private disconnectSubscription: Subscription | null = null;

  private rawBuffer = "";
  private queue: QueuedCommand[] = [];
  private busy = false;
  private pendingResolve: ((raw: string) => void) | null = null;

  private pollLoopToken = 0;
  private stopRequested = false;
  private lastResponses = new Map<string, string>();

  state: ObdConnectionState = "idle";
  adapterInfo: ObdAdapterInfo = {};
  supportedPids = new Set<string>();
  telemetry: LiveTelemetry = {};

  private stateEmitter = new Emitter<ObdConnectionState>();
  private telemetryEmitter = new Emitter<LiveTelemetry>();
  private logEmitter = new Emitter<ObdLogEntry>();
  private errorEmitter = new Emitter<string>();

  onStateChange(fn: Listener<ObdConnectionState>): () => void {
    return this.stateEmitter.subscribe(fn);
  }
  onTelemetry(fn: Listener<LiveTelemetry>): () => void {
    return this.telemetryEmitter.subscribe(fn);
  }
  onLog(fn: Listener<ObdLogEntry>): () => void {
    return this.logEmitter.subscribe(fn);
  }
  onError(fn: Listener<string>): () => void {
    return this.errorEmitter.subscribe(fn);
  }

  private setState(next: ObdConnectionState) {
    this.state = next;
    this.stateEmitter.emit(next);
  }

  private log(direction: ObdLogEntry["direction"], text: string) {
    this.logEmitter.emit({ time: Date.now(), direction, text });
  }

  async getBluetoothState(): Promise<State> {
    return this.manager.state();
  }

  private async ensureReady(): Promise<void> {
    const granted = await requestBlePermissions();
    if (!granted) throw new Error("BLUETOOTH_PERMISSION_DENIED");
    const btState = await this.manager.state();
    if (btState !== State.PoweredOn) throw new Error("BLUETOOTH_OFF");
  }

  /** §2.1 discovery: scans for the V011 name hint and returns candidates. */
  async scan(timeoutMs = 8000): Promise<ScannedObdDevice[]> {
    await this.ensureReady();
    this.setState("scanning");
    const found = new Map<string, ScannedObdDevice>();

    return new Promise((resolve, reject) => {
      this.manager.startDeviceScan(
        null,
        { allowDuplicates: false },
        (error, device) => {
          if (error) {
            this.manager.stopDeviceScan();
            this.setState("idle");
            reject(error);
            return;
          }
          const name = device?.name ?? device?.localName ?? "";
          if (device && name.toUpperCase().includes(DEVICE_NAME_HINT)) {
            found.set(device.id, { id: device.id, name, rssi: device.rssi });
          }
        },
      );

      setTimeout(() => {
        this.manager.stopDeviceScan();
        this.setState("idle");
        resolve(
          Array.from(found.values()).sort(
            (a, b) => (b.rssi ?? -999) - (a.rssi ?? -999),
          ),
        );
      }, timeoutMs);
    });
  }

  /** §3 connection and readiness flow, through to "vehicle ready" (§3.1). */
  async connectToDevice(deviceId: string): Promise<void> {
    this.stopRequested = false;
    await this.ensureReady();

    this.setState("connecting");
    this.log("info", `connecting to ${deviceId}`);
    const device = await this.manager.connectToDevice(deviceId, {
      requestMTU: 185,
    });
    this.device = device;
    this.disconnectSubscription?.remove();
    this.disconnectSubscription = this.manager.onDeviceDisconnected(
      device.id,
      () => this.handleUnexpectedDisconnect(),
    );

    this.setState("discovering");
    await device.discoverAllServicesAndCharacteristics();
    const characteristics = await device.characteristicsForService(
      OBD_SERVICE_UUID,
    );
    const notifyChar = characteristics.find(
      (c) => c.uuid.toLowerCase() === OBD_NOTIFY_UUID,
    );
    const writeChar = characteristics.find(
      (c) => c.uuid.toLowerCase() === OBD_WRITE_UUID,
    );
    if (!notifyChar || !(notifyChar.isNotifiable || notifyChar.isReadable)) {
      await this.teardown();
      throw new Error("FFE1_NOT_NOTIFIABLE");
    }
    if (
      !writeChar ||
      !(writeChar.isWritableWithResponse || writeChar.isWritableWithoutResponse)
    ) {
      await this.teardown();
      throw new Error("FFE2_NOT_WRITABLE");
    }

    if (Platform.OS === "android") {
      try {
        await device.requestConnectionPriority(1); // High — Android optimisation only (§2.2)
      } catch {
        // Not a prerequisite; continue without a raised connection priority.
      }
    }

    this.setState("subscribing");
    this.rawBuffer = "";
    this.notifySubscription?.remove();
    this.notifySubscription = device.monitorCharacteristicForService(
      OBD_SERVICE_UUID,
      OBD_NOTIFY_UUID,
      (error, characteristic) => {
        if (error) {
          this.handleNotificationError(error);
          return;
        }
        this.handleNotification(characteristic);
      },
    );
    await delay(SETTLING_MS);

    this.setState("initializing");
    this.adapterInfo = {};
    this.lastResponses.clear();
    await this.runInitializationSequence();

    this.setState("searching-protocol");
    await this.discoverSupportedPidRanges();

    this.setState("ready");
    this.startPolling();
  }

  async disconnect(): Promise<void> {
    this.stopRequested = true;
    this.stopPolling();
    const deviceId = this.device?.id;
    await this.teardown();
    if (deviceId) {
      try {
        await this.manager.cancelDeviceConnection(deviceId);
      } catch {
        // Already disconnected.
      }
    }
    this.setState("idle");
  }

  destroy() {
    this.stopRequested = true;
    this.stopPolling();
    this.notifySubscription?.remove();
    this.disconnectSubscription?.remove();
    this.manager.destroy();
  }

  private async teardown() {
    this.notifySubscription?.remove();
    this.disconnectSubscription?.remove();
    this.notifySubscription = null;
    this.disconnectSubscription = null;
    this.pendingResolve = null;
    this.rawBuffer = "";
    this.queue = [];
    this.busy = false;
    this.device = null;
  }

  // ---- Command queue (§4) ---------------------------------------------

  private sendCommand(command: string, timeoutMs: number): Promise<string> {
    return new Promise((resolve, reject) => {
      this.queue.push({ command, timeoutMs, resolve, reject });
      this.drainQueue();
    });
  }

  private drainQueue() {
    if (this.busy) return;
    const next = this.queue.shift();
    if (!next) return;
    this.busy = true;
    this.executeCommand(next);
  }

  private executeCommand(item: QueuedCommand) {
    const device = this.device;
    if (!device) {
      this.busy = false;
      item.reject(new Error("NO_DEVICE"));
      this.drainQueue();
      return;
    }

    const timer = setTimeout(() => {
      this.pendingResolve = null;
      this.rawBuffer = "";
      this.log("error", `timeout: ${item.command}`);
      this.busy = false;
      item.reject(
        new TransactionError(
          "timeout",
          `Timeout waiting for response to ${item.command}`,
        ),
      );
      this.drainQueue();
    }, item.timeoutMs);

    this.pendingResolve = (raw: string) => {
      clearTimeout(timer);
      this.busy = false;
      item.resolve(raw);
      this.drainQueue();
    };

    const framed = frameCommand(item.command);
    this.log("tx", framed.trim());
    const payload = asciiToBase64(framed);
    device
      .writeCharacteristicWithResponseForService(
        OBD_SERVICE_UUID,
        OBD_WRITE_UUID,
        payload,
      )
      .catch((error) => {
        clearTimeout(timer);
        this.pendingResolve = null;
        this.busy = false;
        item.reject(error instanceof Error ? error : new Error(String(error)));
        this.drainQueue();
      });
  }

  // ---- Fragment assembly (§6) -------------------------------------------

  private handleNotification(characteristic: Characteristic | null) {
    if (!characteristic?.value) return;
    const chunk = base64ToAscii(characteristic.value);
    this.log("rx", chunk);

    if (!this.pendingResolve) {
      this.log("info", `orphan fragment: ${JSON.stringify(chunk)}`);
      return;
    }

    this.rawBuffer += chunk;
    const promptIndex = this.rawBuffer.indexOf(
      String.fromCharCode(PROMPT_BYTE),
    );
    if (promptIndex === -1) return; // still assembling

    const complete = this.rawBuffer.slice(0, promptIndex + 1);
    const leftover = this.rawBuffer.slice(promptIndex + 1);
    this.rawBuffer = "";
    if (leftover.trim().length > 0) {
      this.log("info", `quarantined trailing bytes: ${JSON.stringify(leftover)}`);
    }

    const resolve = this.pendingResolve;
    this.pendingResolve = null;
    resolve(complete);
  }

  private handleNotificationError(error: BleError) {
    this.log("error", `notification error: ${error.message}`);
  }

  // ---- Initialization and PID discovery (§5, §5.1) ----------------------

  private async runInitializationSequence(): Promise<void> {
    for (const step of INIT_SEQUENCE) {
      const raw = await this.sendCommand(step.command, step.timeoutMs);
      const normalized = normalizeResponse(raw);
      const outcome = classifyResponse(normalized);
      this.lastResponses.set(step.command, normalized);
      this.recordAdapterInfo(step.command, normalized);
      if (outcome !== "ok" && outcome !== "data" && outcome !== "searching") {
        throw new TransactionError(outcome, `${step.command} -> ${normalized}`);
      }
    }
  }

  private recordAdapterInfo(command: string, normalized: string) {
    switch (command) {
      case "ATI":
        this.adapterInfo.identity = normalized;
        break;
      case "ATDP":
        this.adapterInfo.protocolText = normalized;
        break;
      case "ATDPN":
        this.adapterInfo.protocolNumber = normalized;
        break;
      default:
        break;
    }
  }

  private async discoverSupportedPidRanges(): Promise<void> {
    this.supportedPids = new Set();
    const first = this.lastResponses.get("0100") ?? "";
    const firstDecoded = decodeSupportedPidsBitmap(first, 0x00);
    let hasNextRange = firstDecoded.hasNextRange;
    firstDecoded.supported.forEach((p) => this.supportedPids.add(p));

    let rangeStart = 0x20;
    while (hasNextRange && rangeStart < 0x60) {
      const command = `01${rangeStart.toString(16).toUpperCase().padStart(2, "0")}`;
      try {
        const raw = await this.sendCommand(command, COMMAND_TIMEOUT_MS.routine);
        const normalized = normalizeResponse(raw);
        if (classifyResponse(normalized) !== "data") break;
        const decoded = decodeSupportedPidsBitmap(normalized, rangeStart);
        decoded.supported.forEach((p) => this.supportedPids.add(p));
        hasNextRange = decoded.hasNextRange;
      } catch {
        break;
      }
      rangeStart += 0x20;
    }
  }

  // ---- Live polling (§4.2 response-driven scheduling) -------------------

  private startPolling() {
    const token = ++this.pollLoopToken;
    const pids = PID_DEFINITIONS.filter((d) =>
      this.supportedPids.has(d.pid),
    ).map((d) => d.pid);
    if (pids.length === 0) {
      this.log("info", "no supported PIDs to poll");
      return;
    }

    const loop = async () => {
      let index = 0;
      while (token === this.pollLoopToken && this.state === "ready") {
        const pid = pids[index % pids.length];
        index++;
        try {
          const raw = await this.sendCommand(
            pidRequestCommand(pid),
            COMMAND_TIMEOUT_MS.routine,
          );
          const normalized = normalizeResponse(raw);
          const outcome = classifyResponse(normalized);
          if (outcome === "data") {
            const decoded = decodePidResponse(normalized);
            if (decoded && applyPidResponse(this.telemetry, decoded)) {
              this.telemetryEmitter.emit({ ...this.telemetry });
            }
          } else if (outcome === "no-data") {
            // §8.1: preserve NO DATA as distinct from zero — skip this cycle.
          } else if (
            outcome === "bus-init-error" ||
            outcome === "unable-to-connect" ||
            outcome === "bus-error"
          ) {
            this.log("error", `${pid} -> ${normalized}`);
            this.handlePollingFault();
            return;
          }
        } catch (error) {
          if (error instanceof TransactionError && error.outcome === "timeout") {
            this.log("error", `poll timeout: ${pid}`);
            continue;
          }
          this.log("error", `poll error: ${String(error)}`);
          return;
        }
      }
    };
    void loop();
  }

  private stopPolling() {
    this.pollLoopToken++;
  }

  private handlePollingFault() {
    this.stopPolling();
    this.setState("recovering");
    void this.attemptReinitialize();
  }

  private async attemptReinitialize() {
    if (!this.device) return;
    try {
      this.setState("initializing");
      await this.runInitializationSequence();
      this.setState("searching-protocol");
      await this.discoverSupportedPidRanges();
      this.setState("ready");
      this.startPolling();
    } catch (error) {
      this.log("error", `reinitialize failed: ${String(error)}`);
      this.setState("error");
      this.errorEmitter.emit("REINITIALIZE_FAILED");
    }
  }

  // ---- Reconnection (§8.2) ----------------------------------------------

  private handleUnexpectedDisconnect() {
    if (this.stopRequested) return;
    this.log("error", "BLE disconnect");
    this.stopPolling();
    const deviceId = this.device?.id;
    this.notifySubscription?.remove();
    this.disconnectSubscription?.remove();
    this.notifySubscription = null;
    this.disconnectSubscription = null;
    this.pendingResolve = null;
    this.rawBuffer = "";
    this.queue = [];
    this.busy = false;
    this.device = null;
    this.setState("recovering");
    void this.attemptReconnect(deviceId);
  }

  private async attemptReconnect(deviceId: string | undefined) {
    if (!deviceId) {
      this.setState("disconnected");
      return;
    }
    for (const backoff of RECONNECT_BACKOFF_MS) {
      if (this.stopRequested) return;
      await delay(backoff);
      try {
        await this.connectToDevice(deviceId);
        return;
      } catch (error) {
        this.log("error", `reconnect attempt failed: ${String(error)}`);
      }
    }
    this.setState("disconnected");
    this.errorEmitter.emit("RECONNECT_FAILED");
  }
}

export const obdBleManager = new ObdBleManager();
