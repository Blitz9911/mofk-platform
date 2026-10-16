import { useObdConnection } from "./use-obd-connection";

export function useObdLiveData() {
  const obd = useObdConnection();
  return {
    state: obd.state,
    liveReadings: obd.liveReadings,
    liveSignals: obd.liveSignals,
    liveValues: obd.liveValues,
    supportedPids: obd.initResult?.supportedPids ?? [],
    occupancy: obd.occupancy,
    frozen: obd.frozen,
    recording: obd.recording,
    recordedFrames: obd.recordedFrames,
    pollMetrics: obd.pollMetrics,
    startLivePolling: obd.startLivePolling,
    stopLivePolling: obd.stopLivePolling,
  };
}

export function useObdDiagnostics() {
  const obd = useObdConnection();
  return {
    state: obd.state,
    dtcScan: obd.dtcScan,
    diagnosticHistory: obd.diagnosticHistory,
    runDiagnosticScan: obd.runDiagnosticScan,
    readFreezeFrame: obd.readFreezeFrame,
    clearTroubleCodesAfterConfirmation: obd.clearTroubleCodesAfterConfirmation,
  };
}

export function useObdVehicleInfo() {
  const obd = useObdConnection();
  return {
    state: obd.state,
    vehicleInfo: obd.vehicleInfo,
    initResult: obd.initResult,
    readVehicleInformation: obd.readVehicleInformation,
  };
}
