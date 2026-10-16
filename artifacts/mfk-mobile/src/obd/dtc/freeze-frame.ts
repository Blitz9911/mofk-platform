import { extractModeResponseBytes, parseElm327Response } from "../elm327/elm327-response-parser";
import { applyPidFormula, decodeDtcPair } from "../pids/pid-decoder";
import { LIVE_PID_BY_COMMAND } from "../pids/pid-registry";
import type { FreezeFrameItem, FreezeFrameReport } from "../types/diagnostics.types";

export function decodeFreezeFrameDtc(raw: string): string | null {
  const parsed = parseElm327Response(raw, "0202");
  if (parsed.hasNoData) return null;
  const response = extractModeResponseBytes(parsed, "42", "02")[0];
  if (!response || response.length < 4) return null;
  return decodeDtcPair(response[2], response[3]);
}

export function decodeFreezeFramePid(command: string, raw: string): FreezeFrameItem | null {
  const pid = command.toUpperCase();
  const livePid = `01${pid.slice(2)}`;
  const definition = LIVE_PID_BY_COMMAND.get(livePid);
  const parsed = parseElm327Response(raw, pid);
  if (parsed.hasNoData) {
    return { pid, label: definition?.label ?? pid, value: null, unit: definition?.unit ?? null };
  }
  const response = extractModeResponseBytes(parsed, "42", pid.slice(2))[0];
  const data = response?.slice(2) ?? [];
  const decoded = data.length ? applyPidFormula(livePid, data) : null;
  return {
    pid,
    label: definition?.label ?? pid,
    value: decoded?.value != null ? String(decoded.value) : null,
    unit: decoded?.unit ?? definition?.unit ?? null,
  };
}

export function emptyFreezeFrame(availability: FreezeFrameReport["availability"], raw = ""): FreezeFrameReport {
  return { dtc: null, items: [], availability, raw };
}
