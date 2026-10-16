import { parseObdResponses } from "../elm327/obd-response-parser";
import { parseElm327Response } from "../elm327/elm327-response-parser";
import { nextSupportPid, parseSupportedPidBitmap } from "../pids/pid-support-parser";

export type SupportedPidRegistry = {
  pids: string[];
  ecuIds: string[];
  pagesRead: string[];
};

export function decodeSupportPage(command: string, raw: string): { pids: string[]; ecuIds: string[] } {
  const pids = new Set<string>();
  const ecuIds = new Set<string>();
  const normalized = command.replace(/\s+/g, "").toUpperCase();
  const pidNum = Number.parseInt(normalized.slice(2), 16);

  for (const response of parseObdResponses(raw)) {
    if (response.service !== 0x41 || response.pid !== pidNum || response.payload.length < 4) continue;
    if (response.sourceEcu) ecuIds.add(response.sourceEcu);
    parseSupportedPidBitmap(normalized, [...response.payload.slice(0, 4)]).forEach((pid) => pids.add(pid));
  }

  if (!pids.size) {
    const parsed = parseElm327Response(raw, normalized);
    const echo = "41";
    const expected = normalized.slice(2);
    for (const line of parsed.hexLines) {
      const index = line.indexOf(`${echo}${expected}`);
      if (index < 0) continue;
      const bytes = line.slice(index).match(/.{1,2}/g)?.map((byte) => Number.parseInt(byte, 16)) ?? [];
      if (bytes.length < 6) continue;
      parseSupportedPidBitmap(normalized, bytes.slice(2, 6)).forEach((pid) => pids.add(pid));
    }
  }

  return { pids: [...pids], ecuIds: [...ecuIds] };
}

export async function discoverSupportedMode01Pids(
  send: (command: string, timeoutMs: number) => Promise<string>,
  firstPageRaw?: string,
): Promise<SupportedPidRegistry> {
  const pids = new Set<string>();
  const ecuIds = new Set<string>();
  const pagesRead: string[] = [];
  let command: string | null = "0100";
  let usedSeed = false;

  while (command) {
    pagesRead.push(command);
    const raw = command === "0100" && firstPageRaw && !usedSeed ? firstPageRaw : await send(command, command === "0100" ? 15_000 : 2_500);
    if (command === "0100") usedSeed = true;
    const page = decodeSupportPage(command, raw);
    page.pids.forEach((pid) => pids.add(pid));
    page.ecuIds.forEach((ecu) => ecuIds.add(ecu));
    command = nextSupportPid(command, page.pids);
    if (command && Number.parseInt(command.slice(2), 16) > 0xe0) break;
  }

  return { pids: [...pids], ecuIds: [...ecuIds], pagesRead };
}

export type DiagnosticTransportCapabilities = {
  classicCan: boolean;
  canFd: boolean;
  kLine: boolean;
  j1850: boolean;
  doip: boolean;
  uds: boolean;
};

export function capabilitiesFromProtocol(protocol?: string | null, protocolNumber?: string | null): DiagnosticTransportCapabilities {
  const text = `${protocol ?? ""} ${protocolNumber ?? ""}`.toUpperCase();
  return {
    classicCan: /CAN|15765|ISO 15765/.test(text) || /A?6|A?7|A?8|A?9/.test(protocolNumber ?? ""),
    canFd: false,
    kLine: /ISO 9141|KWP|14230/.test(text) || /3|4|5/.test(protocolNumber ?? ""),
    j1850: /J1850|PWM|VPW/.test(text) || /1|2/.test(protocolNumber ?? ""),
    doip: false,
    uds: false,
  };
}
