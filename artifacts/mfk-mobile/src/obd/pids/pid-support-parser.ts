export function parseSupportedPidBitmap(command: "0100" | "0120" | "0140" | "0160", dataBytes: number[]): string[] {
  if (dataBytes.length < 4) return [];

  const basePid = Number.parseInt(command.slice(2), 16);
  const supported: string[] = [];
  dataBytes.slice(0, 4).forEach((byte, byteIndex) => {
    for (let bit = 0; bit < 8; bit += 1) {
      if ((byte & (1 << (7 - bit))) === 0) continue;
      const pid = basePid + byteIndex * 8 + bit + 1;
      supported.push(`01${pid.toString(16).toUpperCase().padStart(2, "0")}`);
    }
  });

  return supported;
}
