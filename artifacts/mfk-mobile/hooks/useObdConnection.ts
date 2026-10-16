import { useCallback, useEffect, useState } from "react";

import {
  ObdAdapterInfo,
  ObdConnectionState,
  obdBleManager,
  ScannedObdDevice,
} from "@/lib/obd/ObdBleManager";
import { LiveTelemetry } from "@/lib/obd/pids";

export interface UseObdConnectionResult {
  state: ObdConnectionState;
  telemetry: LiveTelemetry;
  adapterInfo: ObdAdapterInfo;
  lastError: string | null;
  scan: (timeoutMs?: number) => Promise<ScannedObdDevice[]>;
  connect: (deviceId: string) => Promise<void>;
  disconnect: () => Promise<void>;
}

/** React binding over the ObdBleManager singleton — one V011 connection per app. */
export function useObdConnection(): UseObdConnectionResult {
  const [state, setState] = useState<ObdConnectionState>(obdBleManager.state);
  const [telemetry, setTelemetry] = useState<LiveTelemetry>(
    obdBleManager.telemetry,
  );
  const [adapterInfo, setAdapterInfo] = useState<ObdAdapterInfo>(
    obdBleManager.adapterInfo,
  );
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    const unsubState = obdBleManager.onStateChange((next) => {
      setState(next);
      if (next === "ready") {
        setAdapterInfo({ ...obdBleManager.adapterInfo });
      }
    });
    const unsubTelemetry = obdBleManager.onTelemetry((next) =>
      setTelemetry(next),
    );
    const unsubError = obdBleManager.onError((message) =>
      setLastError(message),
    );
    return () => {
      unsubState();
      unsubTelemetry();
      unsubError();
    };
  }, []);

  const scan = useCallback(
    (timeoutMs?: number) => obdBleManager.scan(timeoutMs),
    [],
  );

  const connect = useCallback(async (deviceId: string) => {
    setLastError(null);
    await obdBleManager.connectToDevice(deviceId);
  }, []);

  const disconnect = useCallback(() => obdBleManager.disconnect(), []);

  return { state, telemetry, adapterInfo, lastError, scan, connect, disconnect };
}
