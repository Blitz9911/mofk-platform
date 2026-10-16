import { LIVE_PID_REGISTRY, type StandardPidDefinition } from "./pid-registry";

export type { StandardPidDefinition };

export const STANDARD_MODE_01_PIDS: StandardPidDefinition[] = LIVE_PID_REGISTRY.map(({ pid, command, label, unit, minBytes }) => ({
  pid,
  command,
  label,
  unit,
  minBytes,
}));

export const LIVE_POLLING_PIDS = {
  fast: LIVE_PID_REGISTRY.filter((item) => item.tier === "fast").map((item) => item.pid),
  normal: LIVE_PID_REGISTRY.filter((item) => item.tier === "medium").map((item) => item.pid),
  slow: LIVE_PID_REGISTRY.filter((item) => item.tier === "slow").map((item) => item.pid),
} as const;
