export function parseSupportedPidBitmap(command: string, dataBytes: number[]): string[] {
  if (dataBytes.length < 4) return [];

  const normalized = command.replace(/\s+/g, "").toUpperCase();
  const mode = normalized.slice(0, 2);
  const basePid = Number.parseInt(normalized.slice(2), 16);
  if (!Number.isFinite(basePid)) return [];

  const supported: string[] = [];
  dataBytes.slice(0, 4).forEach((byte, byteIndex) => {
    for (let bit = 0; bit < 8; bit += 1) {
      if ((byte & (1 << (7 - bit))) === 0) continue;
      const pid = basePid + byteIndex * 8 + bit + 1;
      supported.push(`${mode}${pid.toString(16).toUpperCase().padStart(2, "0")}`);
    }
  });

  return supported;
}

/** 0100 / 0120 / 0140 … are bitmap queries, not live sensors. */
export function isMode01SupportQuery(pid: string) {
  const normalized = pid.replace(/\s+/g, "").toUpperCase();
  if (!/^01[0-9A-F]{2}$/.test(normalized)) return false;
  return Number.parseInt(normalized.slice(2), 16) % 0x20 === 0;
}

export function nextSupportPid(command: string, supported: string[]): string | null {
  const normalized = command.replace(/\s+/g, "").toUpperCase();
  const mode = normalized.slice(0, 2);
  const basePid = Number.parseInt(normalized.slice(2), 16);
  if (!Number.isFinite(basePid)) return null;
  const next = `${mode}${(basePid + 0x20).toString(16).toUpperCase().padStart(2, "0")}`;
  return supported.includes(next) ? next : null;
}
