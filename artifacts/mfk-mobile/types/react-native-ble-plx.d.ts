declare module "react-native-ble-plx" {
  export type State = "Unknown" | "Resetting" | "Unsupported" | "Unauthorized" | "PoweredOff" | "PoweredOn";

  export type Subscription = {
    remove(): void;
  };

  export type BleError = {
    message: string;
    errorCode?: number;
    reason?: string | null;
  };

  export type Device = {
    id: string;
    name: string | null;
    localName?: string | null;
    serviceUUIDs?: string[] | null;
    rssi?: number | null;
    isConnectable?: boolean | null;
    connect(options?: { timeout?: number }): Promise<Device>;
    cancelConnection(): Promise<Device>;
    discoverAllServicesAndCharacteristics(): Promise<Device>;
    services(): Promise<Service[]>;
    monitorCharacteristicForService(
      serviceUUID: string,
      characteristicUUID: string,
      listener: (error: BleError | null, characteristic: Characteristic | null) => void,
      transactionId?: string,
    ): Subscription;
    writeCharacteristicWithResponseForService(
      serviceUUID: string,
      characteristicUUID: string,
      valueBase64: string,
      transactionId?: string,
    ): Promise<Characteristic>;
    onDisconnected(
      listener: (error: BleError | null, device: Device | null) => void,
      transactionId?: string,
    ): Subscription;
  };

  export type Service = {
    uuid: string;
    characteristics(): Promise<Characteristic[]>;
  };

  export type Characteristic = {
    uuid: string;
    value: string | null;
    isWritableWithResponse?: boolean;
    isWritableWithoutResponse?: boolean;
    isNotifiable?: boolean;
    isIndicatable?: boolean;
  };

  export class BleManager {
    constructor();
    state(): Promise<State>;
    onStateChange(listener: (state: State) => void, emitCurrentState?: boolean): Subscription;
    startDeviceScan(
      serviceUUIDs: string[] | null,
      options: { allowDuplicates?: boolean } | null,
      listener: (error: BleError | null, scannedDevice: Device | null) => void,
    ): void;
    stopDeviceScan(): Promise<void> | void;
    connectToDevice(deviceId: string, options?: { timeout?: number }): Promise<Device>;
    cancelDeviceConnection(deviceId: string): Promise<Device>;
    destroy(): void;
  }
}
