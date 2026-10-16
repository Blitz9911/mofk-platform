// Minimal ASCII <-> base64 helpers for the BLE transport. Adapter commands and
// responses are printable ASCII (ELM-style AT/OBD text), so a full binary-safe
// base64 implementation isn't needed — this keeps the module dependency-free.
const B64_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export function asciiToBase64(input: string): string {
  let output = "";
  for (let i = 0; i < input.length; i += 3) {
    const b0 = input.charCodeAt(i) & 0xff;
    const has1 = i + 1 < input.length;
    const has2 = i + 2 < input.length;
    const b1 = has1 ? input.charCodeAt(i + 1) & 0xff : 0;
    const b2 = has2 ? input.charCodeAt(i + 2) & 0xff : 0;

    output += B64_CHARS[b0 >> 2];
    output += B64_CHARS[((b0 & 0x03) << 4) | (b1 >> 4)];
    output += has1 ? B64_CHARS[((b1 & 0x0f) << 2) | (b2 >> 6)] : "=";
    output += has2 ? B64_CHARS[b2 & 0x3f] : "=";
  }
  return output;
}

export function base64ToBytes(input: string): number[] {
  const clean = input.replace(/[^A-Za-z0-9+/]/g, "");
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (let i = 0; i < clean.length; i++) {
    const idx = B64_CHARS.indexOf(clean[i]);
    if (idx === -1) continue;
    buffer = (buffer << 6) | idx;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return bytes;
}

export function base64ToAscii(input: string): string {
  return base64ToBytes(input)
    .map((b) => String.fromCharCode(b))
    .join("");
}
