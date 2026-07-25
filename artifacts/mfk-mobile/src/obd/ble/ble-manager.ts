import { Platform } from "react-native";
import { BleManager, Device, State, Subscription } from "react-native-ble-plx";

import {
  bleUuidMatches,
  containsV011Service,
  expandBleUuid,
  isV011NameHint,
  V011_NOTIFY_CHARACTERISTIC_UUID_SHORT,
  V011_SERVICE_UUID_SHORT,
  V011_WRITE_CHARACTERISTIC_UUID_SHORT,
} from "./ble.constants";
import { asciiToBase64, base64ToAscii } from "../utils/base64";
import { obdLogger } from "../services/obd-logger";
import type { Elm327Transport, ObdDevice } from "../types/obd.types";

export type V011Characteristics = {
  serviceUUID: string;
  writeUUID: string;
  notifyUUID: string;
};

function toBluetoothState(state: State) {
  if (state === "PoweredOn") return "powered_on";
  if (state === "PoweredOff") return "powered_off";
  if (state === "Unsupported") return "unsupported";
  if (state === "Unauthorized") return "unauthorized";
  return "unknown";
}

function toObdDevice(device: Device): ObdDevice {
  const name = device.name ?? device.localName ?? "جهاز BLE بدون اسم";
  const serviceUUIDs = device.serviceUUIDs ?? [];
  return {
    id: device.id,
    name,
    rssi: device.rssi ?? null,
    serviceUUIDs,
    isV011Candidate: containsV011Service(serviceUUIDs) || isV011NameHint(name),
  };
}

export class MfkBleManager implements Elm327Transport {
  private manager: BleManager | null = null;
  private connectedDevice: Device | null = null;
  private characteristics: V011Characteristics | null = null;
  private notificationSubscription: Subscription | null = null;
  private disconnectSubscription: Subscription | null = null;
  private scanActive = false;
  private chunkListeners = new Set<(chunk: string) => void>();
  private disconnectListeners = new Set<() => void>();

  constructor() {
    if (Platform.OS !== "web") {
      try {
        this.manager = new BleManager();
      } catch (error) {
        obdLogger.log("error", "ble_manager_init", "تعذر تهيئة Bluetooth native module", {
          reason: error instanceof Error ? error.message : "unknown",
        });
      }
    }
  }

  async getBluetoothState() {
    if (!this.manager) return "unsupported";
    return toBluetoothState(await this.manager.state());
  }

  onBluetoothState(listener: (state: ReturnType<typeof toBluetoothState>) => void) {
    if (!this.manager) {
      listener("unsupported");
      return () => undefined;
    }
    const subscription = this.manager.onStateChange((state) => listener(toBluetoothState(state)), true);
    return () => subscription.remove();
  }

  async scan(onDevice: (device: ObdDevice) => void) {
    if (!this.manager) throw new Error("BLE native module is not available. Use an Expo Development Build.");
    if (this.scanActive) return;

    this.scanActive = true;
    obdLogger.log("info", "scan_start", "بدء البحث عن أجهزة BLE");

    this.manager.startDeviceScan([expandBleUuid(V011_SERVICE_UUID_SHORT)], { allowDuplicates: false }, (error, device) => {
      if (error) {
        obdLogger.log("warn", "scan_error", "تعذر البحث باستخدام service UUID، سيتم الاعتماد على الاختيار اليدوي", {
          reason: error.message,
        });
        return;
      }
      if (!device) return;
      const obdDevice = toObdDevice(device);
      obdLogger.log("debug", "device_found", "تم العثور على جهاز BLE", {
        id: obdDevice.id,
        name: obdDevice.name,
        rssi: obdDevice.rssi,
        candidate: obdDevice.isV011Candidate,
      });
      onDevice(obdDevice);
    });
  }

  async stopScan() {
    if (!this.manager || !this.scanActive) return;
    this.scanActive = false;
    await this.manager.stopDeviceScan();
    obdLogger.log("info", "scan_stop", "تم إيقاف البحث عن أجهزة BLE");
  }

  async connect(deviceId: string) {
    if (!this.manager) throw new Error("BLE native module is not available. Use an Expo Development Build.");
    await this.stopScan();
    obdLogger.log("info", "connect_start", "بدء الاتصال بقطعة OBD", { deviceId });

    const device = await this.manager.connectToDevice(deviceId, { timeout: 12_000 });
    this.connectedDevice = await device.discoverAllServicesAndCharacteristics();
    this.disconnectSubscription = this.connectedDevice.onDisconnected(() => {
      obdLogger.log("warn", "disconnected", "انقطع الاتصال بقطعة OBD");
      this.cleanupConnection();
      this.disconnectListeners.forEach((listener) => listener());
    });

    this.characteristics = await this.discoverV011Characteristics(this.connectedDevice);
    this.notificationSubscription = this.connectedDevice.monitorCharacteristicForService(
      this.characteristics.serviceUUID,
      this.characteristics.notifyUUID,
      (error, characteristic) => {
        if (error) {
          obdLogger.log("warn", "notify_error", "تعذر استقبال إشعار BLE", { reason: error.message });
          return;
        }
        if (!characteristic?.value) return;
        const chunk = base64ToAscii(characteristic.value);
        obdLogger.log("debug", "ble_chunk", "تم استقبال جزء من رد ELM327", { bytes: chunk.length });
        this.chunkListeners.forEach((listener) => listener(chunk));
      },
    );

    obdLogger.log("info", "connect_ready", "تم الاتصال واكتشاف خصائص V011", {
      service: this.characteristics.serviceUUID,
      write: this.characteristics.writeUUID,
      notify: this.characteristics.notifyUUID,
    });
  }

  async disconnect() {
    const deviceId = this.connectedDevice?.id;
    this.cleanupConnection();
    if (deviceId && this.manager) {
      await this.manager.cancelDeviceConnection(deviceId).catch(() => undefined);
    }
  }

  isReady() {
    return Boolean(this.connectedDevice && this.characteristics);
  }

  async write(commandWithCarriageReturn: string) {
    if (!this.connectedDevice || !this.characteristics) {
      throw new Error("BLE transport is not ready");
    }

    await this.connectedDevice.writeCharacteristicWithResponseForService(
      this.characteristics.serviceUUID,
      this.characteristics.writeUUID,
      asciiToBase64(commandWithCarriageReturn),
    );
  }

  onChunk(listener: (chunk: string) => void) {
    this.chunkListeners.add(listener);
    return () => this.chunkListeners.delete(listener);
  }

  onDisconnected(listener: () => void) {
    this.disconnectListeners.add(listener);
    return () => this.disconnectListeners.delete(listener);
  }

  destroy() {
    this.cleanupConnection();
    void this.stopScan();
    this.manager?.destroy();
    this.manager = null;
  }

  private async discoverV011Characteristics(device: Device): Promise<V011Characteristics> {
    const services = await device.services();
    for (const service of services) {
      if (!bleUuidMatches(service.uuid, V011_SERVICE_UUID_SHORT)) continue;
      const characteristics = await service.characteristics();
      const write = characteristics.find((characteristic) => bleUuidMatches(characteristic.uuid, V011_WRITE_CHARACTERISTIC_UUID_SHORT));
      const notify = characteristics.find((characteristic) => bleUuidMatches(characteristic.uuid, V011_NOTIFY_CHARACTERISTIC_UUID_SHORT));

      if (!write) throw new Error("Write characteristic FFE1 missing");
      if (!notify) throw new Error("Notify characteristic FFE2 missing");

      return { serviceUUID: service.uuid, writeUUID: write.uuid, notifyUUID: notify.uuid };
    }

    throw new Error("Service FFE0 missing");
  }

  private cleanupConnection() {
    this.notificationSubscription?.remove();
    this.disconnectSubscription?.remove();
    this.notificationSubscription = null;
    this.disconnectSubscription = null;
    this.connectedDevice = null;
    this.characteristics = null;
  }
}
