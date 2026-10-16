/**
 * Read-only OBD capability audit allowlist.
 * Enforced in the diagnostic module — not only in UI.
 */

export type SafeCommandOptions = {
  allowAtz?: boolean;
};

const DENIED_EXACT = new Set([
  "04",
  "ATWS",
  "ATD",
  "ATKW",
  "ATKW0",
  "ATKW1",
  "ATFCSD",
  "ATFCSM1",
  "STDI",
  "STAL",
  "STPOR",
]);

const ALLOWED_AT = new Set([
  "ATI",
  "ATE0",
  "ATL0",
  "ATS0",
  "ATH0",
  "ATH1",
  "ATDP",
  "ATDPN",
  "ATRV",
  "AT@1",
  "ATAT1",
  "ATCAF0",
  "ATCAF1",
  "ATCFC0",
  "ATCFC1",
]);

export function normalizeDiagnosticCommand(command: string) {
  return command.replace(/\s+/g, "").toUpperCase();
}

export function isDeniedDiagnosticCommand(command: string) {
  const normalized = normalizeDiagnosticCommand(command);
  if (!normalized) return true;
  if (DENIED_EXACT.has(normalized)) return true;
  if (normalized === "04" || normalized.startsWith("04")) return true;
  if (/^(ST|ATFC|ATSH|ATCRA|ATCM|ATCF|ATAL|ATBI|ATMA|ATMR|ATMT)/.test(normalized)) return true;
  if (/^2[EF]/.test(normalized)) return true;
  if (/^3[B]/.test(normalized)) return true;
  return false;
}

export function isAllowedDiagnosticCommand(command: string, options: SafeCommandOptions = {}) {
  const normalized = normalizeDiagnosticCommand(command);
  if (!normalized || isDeniedDiagnosticCommand(normalized)) return false;
  if (normalized === "ATZ") return options.allowAtz === true;
  if (ALLOWED_AT.has(normalized)) return true;
  if (/^ATSP[0-9A]$/.test(normalized)) return true;
  if (/^01[0-9A-F]{2}$/.test(normalized)) return true;
  if (/^09[0-9A-F]{2}$/.test(normalized)) return true;
  if (normalized === "03" || normalized === "07" || normalized === "0A") return true;
  if (normalized === "06" || /^06[0-9A-F]{2}$/.test(normalized)) return true;
  return false;
}

export function assertSafeDiagnosticCommand(command: string, options: SafeCommandOptions = {}) {
  const normalized = normalizeDiagnosticCommand(command);
  if (!isAllowedDiagnosticCommand(normalized, options)) {
    throw new Error(`Blocked non-readonly diagnostic command: ${normalized || command}`);
  }
  return normalized;
}
