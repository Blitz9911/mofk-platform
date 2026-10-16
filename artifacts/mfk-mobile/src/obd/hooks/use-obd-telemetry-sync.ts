import {
  getGetAiRecommendationsQueryKey,
  getGetLiveTelemetryQueryKey,
  useListVehicles,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { useAuth } from "@/context/AuthContext";

import { buildLiveTelemetryPayload } from "../telemetry/live-telemetry-payload";
import { isBindingEnforcementEnabled } from "../binding/feature-flags";
import { useObdConnection } from "./use-obd-connection";
import { loadLastVerification } from "@/lib/mfk-binding-api";

const PERSIST_INTERVAL_MS = 20_000;

export function useObdTelemetrySync() {
  const { user } = useAuth();
  const obd = useObdConnection();
  const queryClient = useQueryClient();
  const { data: vehicles = [] } = useListVehicles({
    query: { enabled: Boolean(user) } as never,
  });

  const obdRef = useRef(obd);
  obdRef.current = obd;

  const vehicleId = vehicles[0]?.id ?? null;

  useEffect(() => {
    if (!user || obd.state !== "vehicle_connected") return;
    obd.startBackgroundLivePolling();
  }, [user, obd.state, obd.startBackgroundLivePolling]);

  useEffect(() => {
    if (!user || !vehicleId || obd.state !== "vehicle_connected") return;

    let cancelled = false;

    const persist = async () => {
      const snapshot = obdRef.current;
      if (snapshot.state !== "vehicle_connected") return;

      const body = buildLiveTelemetryPayload(snapshot.liveValues, snapshot.liveReadings);
      if (!body) return;

      if (isBindingEnforcementEnabled()) {
        const last = await loadLastVerification();
        if (last?.result === "MISMATCH" || last?.result === "INCONCLUSIVE" || last?.result === "UNSUPPORTED") {
          return;
        }
      }

      try {
        const response = await fetch(`/api/diagnostics/live/${vehicleId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!response.ok || cancelled) return;

        await queryClient.invalidateQueries({
          queryKey: getGetLiveTelemetryQueryKey(vehicleId),
        });
        await queryClient.invalidateQueries({
          queryKey: getGetAiRecommendationsQueryKey(vehicleId),
        });
      } catch {
        // Keep polling; the next interval retries persistence.
      }
    };

    const timeout = setTimeout(() => {
      void persist();
    }, 5_000);
    const interval = setInterval(() => {
      void persist();
    }, PERSIST_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [user, vehicleId, obd.state, queryClient]);
}
