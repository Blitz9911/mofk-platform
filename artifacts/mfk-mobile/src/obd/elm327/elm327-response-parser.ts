import { ELM327_STATUS_MESSAGES } from "./elm327.constants";

export type ParsedElm327Response = {
  raw: string;
  normalized: string;
  lines: string[];
  hexLines: string[];
  statusMessages: string[];
  hasNoData: boolean;
  isMalformed: boolean;
};

export function hasElm327Prompt(buffer: string): boolean {
  return buffer.includes(">");
}

export function normalizeElm327Response(raw: string, command?: string): string {
  const commandUpper = command?.replace(/\s+/g, "").toUpperCase();
  const normalizedLines = raw
    .replace(/\0/g, "")
    .replace(/>/g, "")
    .split(/[\r\n]+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => {
      if (!commandUpper) return true;
      return line.replace(/\s+/g, "").toUpperCase() !== commandUpper;
    })
    .map((line) => line.replace(/\s+/g, " "))
    .join("\n");

  return normalizedLines.trim();
}

export function parseElm327Response(raw: string, command?: string): ParsedElm327Response {
  const normalized = normalizeElm327Response(raw, command);
  const lines = normalized.split("\n").map((line) => line.trim()).filter(Boolean);
  const upperLines = lines.map((line) => line.toUpperCase());
  const statusMessages = ELM327_STATUS_MESSAGES.filter((message) =>
    upperLines.some((line) => line.includes(message)),
  );
  const hexLines = lines
    .map((line) => line.replace(/SEARCHING\.\.\./gi, "").replace(/\s+/g, "").toUpperCase())
    .filter((line) => /^[0-9A-F]+$/.test(line));

  return {
    raw,
    normalized,
    lines,
    hexLines,
    statusMessages,
    hasNoData: statusMessages.includes("NO DATA"),
    isMalformed: lines.length > 0 && hexLines.length === 0 && statusMessages.length === 0,
  };
}

export function extractModeResponseBytes(parsed: ParsedElm327Response, expectedMode: string, expectedPid?: string): number[][] {
  const expectedPrefix = `${expectedMode}${expectedPid ?? ""}`.toUpperCase();
  return parsed.hexLines
    .map((line) => {
      const index = line.indexOf(expectedPrefix);
      return index >= 0 ? line.slice(index) : line;
    })
    .filter((line) => line.startsWith(expectedPrefix))
    .map((line) => line.match(/.{1,2}/g)?.map((byte) => Number.parseInt(byte, 16)) ?? [])
    .filter((bytes) => bytes.every((byte) => Number.isFinite(byte)));
}
