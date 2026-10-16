export type SignalFormat = {
  bix?: number; len: number; sign?: boolean; mul?: number; div?: number;
  add?: number; unit?: string; min?: number; max?: number;
  nullmin?: number; nullmax?: number;
  map?: Record<string, { value: string; description?: string }>;
};

export type SignalState = 'loading' | 'available' | 'unsupported' | 'temporarilyUnavailable' | 'error' | 'stale';

/** Bit zero is the most significant bit of the first payload byte. */
export function extractBits(payload: Uint8Array, start: number, length: number, signed = false): number {
  if (!Number.isInteger(start) || !Number.isInteger(length) || start < 0 || length < 1 || length > 32 || start + length > payload.length * 8) {
    throw new Error('Incomplete or invalid signal payload');
  }
  let value = 0;
  for (let bit = start; bit < start + length; bit++) value = value * 2 + ((payload[Math.floor(bit / 8)] >> (7 - bit % 8)) & 1);
  return signed && value >= 2 ** (length - 1) ? value - 2 ** length : value;
}

export function decodeSignal(format: SignalFormat, payload: Uint8Array): { status: SignalState; value: number | string | null } {
  try {
    const raw = extractBits(payload, format.bix ?? 0, format.len, format.sign);
    if (format.map) return { status: format.map[String(raw)] ? 'available' : 'temporarilyUnavailable', value: format.map[String(raw)]?.value ?? null };
    if (format.div === 0) throw new Error('Invalid scale');
    const value = raw * (format.mul ?? 1) / (format.div ?? 1) + (format.add ?? 0);
    if (!Number.isFinite(value)) throw new Error('Invalid value');
    if ((format.nullmin != null && value <= format.nullmin) || (format.nullmax != null && value >= format.nullmax)) return { status: 'temporarilyUnavailable', value: null };
    if (format.unit === 'hex') return { status: 'available', value: raw.toString(16).toUpperCase().padStart(Math.ceil(format.len / 4), '0') };
    return { status: 'available', value: Number(value.toFixed(4)) };
  } catch {
    return { status: 'error', value: null };
  }
}
