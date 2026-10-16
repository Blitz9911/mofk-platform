export type ObdResponse = { sourceEcu?: string; service: number; pid?: number; payload: Uint8Array; bytes: number[] };

/** Parses ELM output, including CAF1 indexed lines and headered CAN frames.
 * Incomplete/out-of-order ISO-TP messages are never exposed as valid payloads. */
export function parseObdResponses(raw: string): ObdResponse[] {
  const messages: { sourceEcu?: string; bytes: number[] }[] = [];
  const pending = new Map<string, { bytes: number[]; length: number; sequence: number }>();
  let indexed: number[] = [];
  let indexExpected = 0;
  const emit = (bytes: number[], sourceEcu?: string) => { if (bytes.length && bytes[0] >= 0x40) messages.push({ bytes, sourceEcu }); };
  for (let line of raw.toUpperCase().replace(/SEARCHING\.\.\./g, '').replace(/[>\0]/g, '').split(/[\r\n]+/)) {
    line = line.trim();
    if (!line) continue;
    const index = line.match(/^([0-9A-F]+):\s*(.*)$/);
    if (index) {
      const n = parseInt(index[1], 16);
      if (n === 0) { if (indexed.length) emit(indexed); indexed = []; indexExpected = 0; }
      if (n !== indexExpected) { indexed = []; continue; }
      const hex = index[2].replace(/\s/g, '');
      if (!/^(?:[0-9A-F]{2})+$/.test(hex)) continue;
      indexed.push(...hex.match(/../g)!.map(b => parseInt(b, 16)));
      indexExpected++;
      continue;
    }
    let hex = line.replace(/\s/g, '');
    if (!/^[0-9A-F]+$/.test(hex) || hex.length <= 3) continue;
    let sourceEcu: string | undefined;
    if (/^18DA[0-9A-F]{4}/.test(hex)) { sourceEcu = hex.slice(0, 8); hex = hex.slice(8); }
    else if (/^7[0-9A-F]{2}/.test(hex) && hex.length % 2 === 1) { sourceEcu = hex.slice(0, 3); hex = hex.slice(3); }
    if (hex.length % 2 !== 0) continue;
    const bytes = hex.match(/../g)!.map(b => parseInt(b, 16));
    const key = sourceEcu ?? 'default';
    const type = bytes[0] >> 4;
    if (sourceEcu && type === 0) {
      const size = bytes[0] & 15;
      if (size && bytes.length >= size + 1) emit(bytes.slice(1, size + 1), sourceEcu);
    } else if (type === 1 && bytes.length >= 3) {
      pending.set(key, { length: (bytes[0] & 15) * 256 + bytes[1], bytes: bytes.slice(2), sequence: 1 });
    } else if (type === 2) {
      const frame = pending.get(key);
      if (!frame || (bytes[0] & 15) !== frame.sequence) { pending.delete(key); continue; }
      frame.bytes.push(...bytes.slice(1)); frame.sequence = (frame.sequence + 1) % 16;
      if (frame.bytes.length >= frame.length) { emit(frame.bytes.slice(0, frame.length), sourceEcu); pending.delete(key); }
    } else emit(bytes, sourceEcu);
  }
  if (indexed.length) emit(indexed);
  return messages.map(({ bytes, sourceEcu }) => {
    const hasPid = [0x41, 0x42, 0x46, 0x49].includes(bytes[0]);
    return { sourceEcu, service: bytes[0], pid: hasPid ? bytes[1] : undefined, payload: new Uint8Array(bytes.slice(hasPid ? 2 : 1)), bytes };
  });
}
