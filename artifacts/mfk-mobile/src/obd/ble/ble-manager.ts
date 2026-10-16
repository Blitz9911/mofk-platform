import { Platform } from "react-native";
import { BleManager, Characteristic, Device, State, Subscription } from "react-native-ble-plx";

import {
  bleUuidMatches,
  containsElm327Service,
  ELM327_NOTIFY_CHARACTERISTIC_UUIDS_SHORT,
  ELM327_SCAN_TIMEOUT_MS,
  ELM327_SERVICE_UUIDS_SHORT,
  ELM327_WRITE_CHARACTERISTIC_UUIDS_SHORT,
  V011_NOTIFY_CHARACTERISTIC_UUID_SHORT,
  V011_NOTIFY_SETTLING_MS,
  V011_SERVICE_UUID_SHORT,
  V011_WRITE_CHARACTERISTIC_UUID_SHORT,
} from "./ble.constants";
import { classifyObdDevice } from "./device-classifier";
import { asciiToBase64, base64ToAscii } from "../utils/base64";
import { obdLogger } from "../services/obd-logger";
import type { Elm327Transport, ObdDevice } from "../types/obd.types";

export type V011Characteristics = {
  serviceUUID: string;
  writeUUID: string;
  notifyUUID: string;
  writeWithResponse: boolean;
  notifyReadable: boolean;
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
  const deviceClass = classifyObdDevice({
    name,
    localName: device.localName,
    serviceUUIDs,
    id: device.id,
  });
  return {
    id: device.id,
    name,
    rssi: device.rssi ?? null,
    serviceUUIDs,
    localName: device.localName,
    deviceClass,
    isV011Candidate: deviceClass === "mfk" || deviceClass === "uart_generic" || containsElm327Service(serviceUUIDs),
  };
}

function characteristicMatches(uuid: string, candidates: readonly string[]) {
  return candidates.some((candidate) => bleUuidMatches(uuid, candidate));
}

function canWrite(characteristic: Characteristic) {
  return Boolean(characteristic.isWritableWithResponse || characteristic.isWritableWithoutResponse);
}

function canNotify(characteristic: Characteristic) {
  return Boolean(characteristic.isNotifiable || characteristic.isIndicatable);
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  private notifySequence = 0;

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

    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, ELM327_SCAN_TIMEOUT_MS);

      this.manager?.startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
        if (error) {
          obdLogger.log("warn", "scan_error", "تعذر البحث عن أجهزة BLE", {
            reason: error.message,
          });
          clearTimeout(timer);
          resolve();
          return;
        }
        if (!device) return;
        const obdDevice = toObdDevice(device);
        if (obdDevice.deviceClass === "unknown") return;

        obdLogger.log("debug", "device_found", "تم العثور على جهاز ELM327 BLE", {
          id: obdDevice.id,
          name: obdDevice.name,
          rssi: obdDevice.rssi,
          candidate: obdDevice.isV011Candidate,
        });
        onDevice(obdDevice);
      });
    });

    await this.stopScan();
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
    this.notifySequence = 0;
    obdLogger.log("info", "connect_start", "بدء الاتصال بقطعة OBD", { deviceId });

    const device = await this.manager.connectToDevice(deviceId, { timeout: 12_000 });
    this.connectedDevice = await device.discoverAllServicesAndCharacteristics();
    this.disconnectSubscription = this.connectedDevice.onDisconnected(() => {
      obdLogger.log("warn", "disconnected", "انقطع الاتصال بقطعة OBD");
      this.cleanupConnection();
      this.disconnectListeners.forEach((listener) => listener());
    });

    if (Platform.OS === "android") {
      try {
        await this.connectedDevice.requestConnectionPriority?.(1);
        const mtu = await this.connectedDevice.requestMTU?.(185);
        obdLogger.log("info", "ble_android_tune", "تم طلب أولوية اتصال عالية", {
          mtu: typeof mtu === "number" ? mtu : null,
        });
      } catch (error) {
        obdLogger.log("warn", "ble_android_tune_failed", "تعذر ضبط أولوية BLE أو MTU", {
          reason: error instanceof Error ? error.message : "unknown",
        });
      }
    }

    this.characteristics = await this.discoverV011Characteristics(this.connectedDevice);
    await this.subscribeNotifications();
    await wait(V011_NOTIFY_SETTLING_MS);

    obdLogger.log("info", "connect_ready", "تم الاتصال واكتشاف خصائص V011", {
      service: this.characteristics.serviceUUID,
      write: this.characteristics.writeUUID,
      notify: this.characteristics.notifyUUID,
      writeWithResponse: this.characteristics.writeWithResponse,
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

    const value = asciiToBase64(commandWithCarriageReturn);

    if (this.characteristics.writeWithResponse) {
      await this.connectedDevice.writeCharacteristicWithResponseForService(
        this.characteristics.serviceUUID,
        this.characteristics.writeUUID,
        value,
      );
      return;
    }

    await this.connectedDevice.writeCharacteristicWithoutResponseForService(
      this.characteristics.serviceUUID,
      this.characteristics.writeUUID,
      value,
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

  private async subscribeNotifications() {
    if (!this.connectedDevice || !this.characteristics) {
      throw new Error("BLE characteristics missing");
    }

    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        if (error) reject(error);
        else resolve();
      };

      this.notificationSubscription = this.connectedDevice?.monitorCharacteristicForService(
        this.characteristics!.serviceUUID,
        this.characteristics!.notifyUUID,
        (error, characteristic) => {
          if (error) {
            obdLogger.log("warn", "notify_error", "تعذر استقبال إشعار BLE", { reason: error.message });
            finish(new Error(error.message));
            return;
          }
          finish();
          if (!characteristic?.value) return;
          this.notifySequence += 1;
          const chunk = base64ToAscii(characteristic.value);
          obdLogger.log("debug", "ble_chunk", "تم استقبال جزء من رد ELM327", {
            sequence: this.notifySequence,
            bytes: chunk.length,
          });
          this.chunkListeners.forEach((listener) => listener(chunk));
        },
      ) ?? null;

      setTimeout(() => finish(), 250);
    });
  }

  private async discoverV011Characteristics(device: Device): Promise<V011Characteristics> {
    const services = await device.services();
    const v011Service = services.find((service) => bleUuidMatches(service.uuid, V011_SERVICE_UUID_SHORT));

    if (v011Service) {
      const characteristics = await v011Service.characteristics();
      const notify = characteristics.find(
        (characteristic) =>
          bleUuidMatches(characteristic.uuid, V011_NOTIFY_CHARACTERISTIC_UUID_SHORT) &&
          canNotify(characteristic),
      );
      const write = characteristics.find(
        (characteristic) =>
          bleUuidMatches(characteristic.uuid, V011_WRITE_CHARACTERISTIC_UUID_SHORT) &&
          canWrite(characteristic),
      );

      obdLogger.log("info", "gatt_v011", "خصائص GATT لجهاز V011", {
        service: v011Service.uuid,
        notify: notify?.uuid ?? "missing",
        write: write?.uuid ?? "missing",
        notifyReadable: Boolean(notify?.isNotifiable || notify?.isIndicatable),
        writeWithResponse: Boolean(write?.isWritableWithResponse),
        writeWithoutResponse: Boolean(write?.isWritableWithoutResponse),
      });

      if (!notify || !write) {
        throw new Error("V011 FFE1 notify / FFE2 write characteristics missing");
      }

      return {
        serviceUUID: v011Service.uuid,
        writeUUID: write.uuid,
        notifyUUID: notify.uuid,
        writeWithResponse: Boolean(write.isWritableWithResponse),
        notifyReadable: Boolean(notify.isNotifiable || notify.isIndicatable),
      };
    }

    for (const service of services) {
      const preferredService = ELM327_SERVICE_UUIDS_SHORT.some((candidate) => bleUuidMatches(service.uuid, candidate));
      if (!preferredService) continue;
      const characteristics = await service.characteristics();
      const write =
        characteristics.find((characteristic) => characteristicMatches(characteristic.uuid, ELM327_WRITE_CHARACTERISTIC_UUIDS_SHORT) && canWrite(characteristic)) ??
        characteristics.find(canWrite);
      const notify =
        characteristics.find((characteristic) => characteristicMatches(characteristic.uuid, ELM327_NOTIFY_CHARACTERISTIC_UUIDS_SHORT) && canNotify(characteristic)) ??
        characteristics.find(canNotify);

      if (write && notify && write.uuid !== notify.uuid) {
        obdLogger.log("warn", "gatt_fallback", "استخدام خصائص ELM327 بديلة ليست FFE0/FFE1/FFE2", {
          service: service.uuid,
          write: write.uuid,
          notify: notify.uuid,
        });
        return {
          serviceUUID: service.uuid,
          writeUUID: write.uuid,
          notifyUUID: notify.uuid,
          writeWithResponse: Boolean(write.isWritableWithResponse),
          notifyReadable: Boolean(notify.isNotifiable || notify.isIndicatable),
        };
      }
    }

    throw new Error("ELM327 BLE characteristics missing");
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
