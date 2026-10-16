import { SIGNALS_BY_COMMAND } from "../signals/signal-registry";
import { isMode01SupportQuery } from "../pids/pid-support-parser";

export const REALTIME_COMMANDS = ["010C", "010D"] as const;
export const FAST_COMMANDS = ["0104", "010B", "0110", "0111", "0145", "0147", "0148", "0149", "014A", "014C"] as const;

export type PollMetrics = {
  lastLatencyMs: number;
  p50: number;
  p95: number;
  commandsPerSecond: number;
  timeoutCount: number;
  noDataCount: number;
  parserErrorCount: number;
  queueDepth: number;
  droppedCycles: number;
};

export function emptyPollMetrics(): PollMetrics {
  return {
    lastLatencyMs: 0,
    p50: 0,
    p95: 0,
    commandsPerSecond: 0,
    timeoutCount: 0,
    noDataCount: 0,
    parserErrorCount: 0,
    queueDepth: 0,
    droppedCycles: 0,
  };
}

export function percentile(values: number[], p: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

export function pollBudget(averageLatencyMs: number) {
  const latency = Math.max(80, averageLatencyMs || 180);
  return Math.max(4, Math.min(14, Math.floor(800 / latency)));
}

export function commandPriority(command: string, visible: Set<string>) {
  const upper = command.toUpperCase();
  if (REALTIME_COMMANDS.includes(upper as (typeof REALTIME_COMMANDS)[number]) && (visible.size === 0 || visible.has(upper))) return 0;
  if (FAST_COMMANDS.includes(upper as (typeof FAST_COMMANDS)[number]) && (visible.size === 0 || visible.has(upper))) return 1;
  if (visible.has(upper)) return 2;
  const interval = SIGNALS_BY_COMMAND.get(upper)?.[0]?.intervalMs ?? 2_000;
  if (interval >= 30_000) return 4;
  if (interval >= 2_000) return 3;
  return 2;
}

/** One outstanding ELM command is enforced by the queue. This only chooses which PIDs to send. */
export function planPollCommands(options: {
  supportedCommands: string[];
  visibleCommands?: string[];
  extraCommands?: string[];
  skipCommands?: string[];
  cycle: number;
  averageLatencyMs: number;
}): string[] {
  const skip = new Set((options.skipCommands ?? []).map((item) => item.toUpperCase()));
  const visible = new Set((options.visibleCommands ?? []).map((item) => item.toUpperCase()));
  const wanted = new Set<string>();

  for (const command of [...options.supportedCommands, ...(options.extraCommands ?? [])]) {
    const upper = command.toUpperCase();
    if (skip.has(upper) || isMode01SupportQuery(upper)) continue;
    if (SIGNALS_BY_COMMAND.has(upper) || upper.length === 4) wanted.add(upper);
  }

  const ranked = [...wanted].sort((left, right) => {
    const delta = commandPriority(left, visible) - commandPriority(right, visible);
    return delta !== 0 ? delta : left.localeCompare(right);
  });

  const budget = pollBudget(options.averageLatencyMs);
  if (ranked.length <= budget) return ranked;

  const head = ranked.filter((command) => commandPriority(command, visible) <= 1).slice(0, Math.max(2, Math.floor(budget / 2)));
  const rest = ranked.filter((command) => !head.includes(command));
  const offset = (options.cycle * Math.max(1, budget - head.length)) % Math.max(1, rest.length);
  const rotated = [...rest.slice(offset), ...rest.slice(0, offset)];
  return [...head, ...rotated].slice(0, budget);
}

export class LatencyWindow {
  private samples: number[] = [];
  private startedAt = Date.now();
  private completed = 0;

  push(latencyMs: number) {
    this.samples.push(latencyMs);
    this.completed += 1;
    if (this.samples.length > 40) this.samples.shift();
  }

  snapshot(extra: Partial<PollMetrics> = {}): PollMetrics {
    const elapsedSec = Math.max(0.001, (Date.now() - this.startedAt) / 1000);
    return {
      ...emptyPollMetrics(),
      lastLatencyMs: this.samples.at(-1) ?? 0,
      p50: percentile(this.samples, 50),
      p95: percentile(this.samples, 95),
      commandsPerSecond: this.completed / elapsedSec,
      ...extra,
    };
  }
}
