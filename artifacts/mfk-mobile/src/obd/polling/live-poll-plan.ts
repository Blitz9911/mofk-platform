import { LIVE_PID_BY_COMMAND } from "../pids/pid-registry";
import { isMode01SupportQuery } from "../pids/pid-support-parser";

/** Always try these even if the 0100/0120 bitmap skipped them. */
export const ALWAYS_PROBE_LIVE_PIDS = [
  "010C",
  "010D",
  "0105",
  "0104",
  "0111",
  "012F",
  "0142",
  "0106",
  "0107",
  "010B",
  "010F",
  "0110",
  "0146",
  "015C",
] as const;

export function allLivePidCommands() {
  return [...LIVE_PID_BY_COMMAND.keys()];
}

export function buildLivePollPlan(
  supportedPids: string[],
  cycle: number,
  options?: { extraPids?: string[]; skipPids?: string[] },
): string[] {
  const skip = new Set((options?.skipPids ?? []).map((pid) => pid.toUpperCase()));
  const wanted = new Set(supportedPids.map((pid) => pid.toUpperCase()).filter((pid) => !isMode01SupportQuery(pid)));
  for (const pid of options?.extraPids ?? ALWAYS_PROBE_LIVE_PIDS) {
    wanted.add(pid.toUpperCase());
  }

  const known = [...LIVE_PID_BY_COMMAND.keys()].filter((pid) => wanted.has(pid) && !skip.has(pid));
  const extras = [...wanted]
    .filter((pid) => !LIVE_PID_BY_COMMAND.has(pid) && !skip.has(pid) && !isMode01SupportQuery(pid))
    .sort();
  if (known.length === 0 && extras.length === 0) return [];
  if (cycle % 3 === 0) return [...known, ...extras];
  return known.filter((pid) => {
    const tier = LIVE_PID_BY_COMMAND.get(pid)?.tier;
    return tier === "fast" || (cycle % 3 === 1 && tier === "medium");
  });
}
