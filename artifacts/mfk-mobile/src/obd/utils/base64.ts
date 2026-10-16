const BASE64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export function asciiToBase64(input: string): string {
  let output = "";
  let index = 0;

  while (index < input.length) {
    const first = input.charCodeAt(index++) & 0xff;
    const second = index < input.length ? input.charCodeAt(index++) & 0xff : Number.NaN;
    const third = index < input.length ? input.charCodeAt(index++) & 0xff : Number.NaN;

    output += BASE64_ALPHABET[first >> 2];
    output += BASE64_ALPHABET[((first & 3) << 4) | (Number.isNaN(second) ? 0 : second >> 4)];
    output += Number.isNaN(second) ? "=" : BASE64_ALPHABET[((second & 15) << 2) | (Number.isNaN(third) ? 0 : third >> 6)];
    output += Number.isNaN(third) ? "=" : BASE64_ALPHABET[third & 63];
  }

  return output;
}

export function base64ToAscii(input: string): string {
  const cleaned = input.replace(/[^A-Za-z0-9+/=]/g, "");
  let output = "";
  let index = 0;

  while (index < cleaned.length) {
    const first = BASE64_ALPHABET.indexOf(cleaned[index++]);
    const second = BASE64_ALPHABET.indexOf(cleaned[index++]);
    const thirdChar = cleaned[index++];
    const fourthChar = cleaned[index++];
    const third = thirdChar === "=" ? -1 : BASE64_ALPHABET.indexOf(thirdChar);
    const fourth = fourthChar === "=" ? -1 : BASE64_ALPHABET.indexOf(fourthChar);

    if (first < 0 || second < 0) break;
    output += String.fromCharCode((first << 2) | (second >> 4));
    if (third >= 0) output += String.fromCharCode(((second & 15) << 4) | (third >> 2));
    if (fourth >= 0) output += String.fromCharCode(((third & 3) << 6) | fourth);
  }

  return output;
}
