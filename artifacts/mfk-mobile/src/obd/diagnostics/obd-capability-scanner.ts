import { classifyElm327Response, parseElm327Response } from "../elm327/elm327-response-parser";
import { parseObdResponses } from "../elm327/obd-response-parser";
import { applyPidFormula, decodeDtcResponse, decodeMode01Pid } from "../pids/pid-decoder";
import { LIVE_PID_BY_COMMAND } from "../pids/pid-registry";
import { isMode01SupportQuery, nextSupportPid, parseSupportedPidBitmap } from "../pids/pid-support-parser";
import { decodePidSignals, SIGNALS_BY_COMMAND } from "../signals/signal-registry";
import { parseMode06Response } from "./mode06-service";
import { decodeMode09Text, decodeMode09Vin } from "../vehicle-info/mode09-parser";
import { buildPerformance, buildSummary, formatCapabilityReportText } from "./obd-diagnostic-report";
import type {
  CapabilityAuditJson,
  CapabilityAuditResult,
  CapabilityPidStatus,
  DiagnosticCommandRecord,
  DiagnosticSend,
  SupportedPidRecord,
} from "./obd-diagnostic.types";
import { assertSafeDiagnosticCommand, type SafeCommandOptions } from "./safe-command-allowlist";

const SAE_PID_NAMES: Record<string, string> = {
  "0101": "Monitor status / MIL",
  "0103": "Fuel system status",
  "0104": "Engine load",
  "0105": "Coolant temperature",
  "0106": "Short term fuel trim B1",
  "0107": "Long term fuel trim B1",
  "0108": "Short term fuel trim B2",
  "0109": "Long term fuel trim B2",
  "010A": "Fuel pressure",
  "010B": "Intake manifold pressure",
  "010C": "Engine RPM",
  "010D": "Vehicle speed",
  "010E": "Timing advance",
  "010F": "Intake air temperature",
  "0110": "MAF",
  "0111": "Throttle position",
  "0112": "Commanded secondary air",
  "0113": "O2 sensors present",
  "0114": "O2 sensor 1 (B1S1)",
  "0115": "O2 sensor 2",
  "011C": "OBD standard",
  "011F": "Run time since engine start",
  "0121": "Distance with MIL",
  "0124": "O2 lambda B1S1",
  "0128": "O2 lambda B2S1",
  "012F": "Fuel level",
  "0130": "Warm-ups since codes cleared",
  "0131": "Distance since DTC clear",
  "0133": "Barometric pressure",
  "0134": "O2 lambda current B1S1",
  "0138": "O2 lambda current B2S1",
  "0141": "Monitor status this drive cycle",
  "0142": "Control module voltage",
  "0143": "Absolute load",
  "0144": "Commanded equivalence ratio",
  "0145": "Relative throttle position",
  "0146": "Ambient air temperature",
  "0147": "Absolute throttle B",
  "0149": "Accelerator pedal D",
  "014A": "Accelerator pedal E",
  "014C": "Commanded throttle actuator",
  "0151": "Fuel type",
  "015C": "Engine oil temperature",
  "015E": "Fuel rate",
  "0165": "Auxiliary input status",
  "019D": "Engine fuel rate",
  "019F": "Fuel system percentage use",
  "0159": "Fuel rail pressure",
  "015B": "Hybrid battery remaining life",
  "01A6": "Odometer",
};

function decodeSupportPageAny(command: string, raw: string): { pids: string[]; ecuIds: string[] } {
  const normalized = command.replace(/\s+/g, "").toUpperCase();
  const mode = Number.parseInt(normalized.slice(0, 2), 16);
  const pidNum = Number.parseInt(normalized.slice(2), 16);
  const echo = mode + 0x40;
  const echoHex = echo.toString(16).toUpperCase().padStart(2, "0");
  const expected = normalized.slice(2);
  const pids = new Set<string>();
  const ecuIds = new Set<string>();

  for (const response of parseObdResponses(raw)) {
    if (response.service !== echo || response.pid !== pidNum || response.payload.length < 4) continue;
    if (response.sourceEcu) ecuIds.add(response.sourceEcu);
    parseSupportedPidBitmap(normalized, [...response.payload.slice(0, 4)]).forEach((pid) => pids.add(pid));
  }

  if (!pids.size) {
    const parsed = parseElm327Response(raw, normalized);
    for (const line of parsed.hexLines) {
      const index = line.indexOf(`${echoHex}${expected}`);
      if (index < 0) continue;
      const bytes = line.slice(index).match(/.{1,2}/g)?.map((byte) => Number.parseInt(byte, 16)) ?? [];
      if (bytes.length < 6) continue;
      parseSupportedPidBitmap(normalized, bytes.slice(2, 6)).forEach((pid) => pids.add(pid));
    }
  }

  return { pids: [...pids], ecuIds: [...ecuIds] };
}

function pidName(command: string) {
  return LIVE_PID_BY_COMMAND.get(command)?.englishLabel ?? SAE_PID_NAMES[command] ?? SIGNALS_BY_COMMAND.get(command)?.[0]?.nameEn ?? command;
}

function decoderExists(command: string) {
  if (SIGNALS_BY_COMMAND.has(command)) return true;
  if (LIVE_PID_BY_COMMAND.has(command)) return true;
  return applyPidFormula(command, [0, 0, 0, 0]) != null;
}

function displayedInMfk(command: string) {
  return LIVE_PID_BY_COMMAND.has(command) || SIGNALS_BY_COMMAND.has(command);
}

function extractEcus(raw: string) {
  const ids = new Set<string>();
  for (const response of parseObdResponses(raw)) {
    if (response.sourceEcu) ids.add(response.sourceEcu);
  }
  const headered = raw.toUpperCase().match(/\b7[0-9A-F]{2}(?=[0-9A-F])/g) ?? [];
  for (const id of headered) {
    if (id !== "7FF") ids.add(id);
  }
  const ext = raw.toUpperCase().match(/\b18DA[0-9A-F]{4}\b/g) ?? [];
  for (const id of ext) ids.add(id);
  return [...ids];
}

function protocolSelectFromDpn(raw: string) {
  const compact = raw.toUpperCase().replace(/[^0-9A-F]/g, "");
  const match = compact.match(/A?([1-9C])$/);
  return match ? `ATSP${match[1]}` : null;
}

function emptyRecord(command: string, error: string, timeout = false): DiagnosticCommandRecord {
  return {
    command,
    rawResponse: "",
    normalizedResponse: "",
    sentAt: null,
    receivedAt: null,
    responseTimeMs: null,
    timeout,
    retryCount: 0,
    success: false,
    error,
  };
}

function classifyPid(command: string, record: DiagnosticCommandRecord): Pick<SupportedPidRecord, "decodedValue" | "unit" | "decoderExists" | "decodeSuccess" | "status"> {
  const exists = decoderExists(command);
  if (record.timeout) {
    return { decodedValue: null, unit: null, decoderExists: exists, decodeSuccess: false, status: "TIMEOUT" };
  }
  if (!record.success && record.error) {
    return { decodedValue: null, unit: null, decoderExists: exists, decodeSuccess: false, status: "ELM_ERROR" };
  }

  const classification = classifyElm327Response(record.rawResponse || record.normalizedResponse, command);
  if (classification === "no_data") {
    return { decodedValue: null, unit: null, decoderExists: exists, decodeSuccess: false, status: "NO_DATA" };
  }
  if (
    classification === "unable_to_connect" ||
    classification === "bus_init_error" ||
    classification === "can_error" ||
    classification === "bus_error" ||
    classification === "buffer_full" ||
    classification === "stopped" ||
    classification === "question"
  ) {
    return { decodedValue: null, unit: null, decoderExists: exists, decodeSuccess: false, status: "ELM_ERROR" };
  }
  if (classification === "negative_obd") {
    return { decodedValue: null, unit: null, decoderExists: exists, decodeSuccess: false, status: "UNSUPPORTED" };
  }

  const frames = parseObdResponses(record.rawResponse || record.normalizedResponse);
  const pidNum = Number.parseInt(command.slice(2), 16);
  const payload = frames.find((item) => item.service === 0x41 && item.pid === pidNum);

  if (exists) {
    const signals = decodePidSignals(command, record.rawResponse || record.normalizedResponse);
    const formula = payload ? applyPidFormula(command, [...payload.payload]) : null;
    const live = decodeMode01Pid(command, record.rawResponse || record.normalizedResponse);
    const signalOk = signals.some((item) => item.status === "available" && item.value != null);
    const formulaOk = formula != null && live.status === "ok" && live.value != null;
    if (signalOk || formulaOk) {
      const value = signalOk ? signals.find((item) => item.status === "available")?.value ?? live.value : live.value;
      const unit = SIGNALS_BY_COMMAND.get(command)?.[0]?.unit || live.unit;
      return { decodedValue: value ?? null, unit, decoderExists: true, decodeSuccess: true, status: "SUPPORTED_AND_WORKING" };
    }
    return {
      decodedValue: live.value ?? null,
      unit: live.unit,
      decoderExists: true,
      decodeSuccess: false,
      status: "SUPPORTED_DECODE_FAILED",
    };
  }

  if (payload?.payload.length) {
    const hex = [...payload.payload].map((byte) => byte.toString(16).toUpperCase().padStart(2, "0")).join(" ");
    return { decodedValue: hex, unit: null, decoderExists: false, decodeSuccess: false, status: "SUPPORTED_DECODER_MISSING" };
  }

  if (classification === "positive_obd") {
    return { decodedValue: record.normalizedResponse, unit: null, decoderExists: false, decodeSuccess: false, status: "SUPPORTED_RAW_ONLY" };
  }

  return { decodedValue: null, unit: null, decoderExists: exists, decodeSuccess: false, status: "NO_DATA" };
}

export async function runObdCapabilityScan(params: {
  send: DiagnosticSend;
  allowAtz?: boolean;
}): Promise<CapabilityAuditResult> {
  const options: SafeCommandOptions = { allowAtz: params.allowAtz === true };
  const records: DiagnosticCommandRecord[] = [];
  const errors: string[] = [];
  const blockedAttempts: string[] = [];
  let transportFailed = false;

  const send = async (command: string, timeoutMs?: number) => {
    let safe: string;
    try {
      safe = assertSafeDiagnosticCommand(command, options);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      blockedAttempts.push(command);
      errors.push(message);
      return emptyRecord(command, message);
    }
    if (transportFailed) {
      const skipped = emptyRecord(safe, "Skipped after transport failure", true);
      records.push(skipped);
      return skipped;
    }
    const record = await params.send(safe, timeoutMs);
    records.push(record);
    if (record.timeout || /reconnect|not ready|timeout/i.test(record.error ?? "")) {
      transportFailed = true;
      errors.push(`${safe}: ${record.error ?? "timeout"}`);
    }
    return record;
  };

  const adapterCommands = ["ATI", ...(options.allowAtz ? ["ATZ"] : []), "ATE0", "ATL0", "ATS0", "ATH1", "ATDP", "ATDPN", "ATSP0"];
  const adapterRaw: Record<string, DiagnosticCommandRecord> = {};
  for (const command of adapterCommands) {
    adapterRaw[command] = await send(command, command === "ATZ" ? 5_000 : command === "ATSP0" ? 2_000 : 3_000);
  }

  const discovery = await send("0100", 15_000);
  const ecuIds = new Set(extractEcus(discovery.rawResponse || discovery.normalizedResponse));
  decodeSupportPageAny("0100", discovery.rawResponse || discovery.normalizedResponse).ecuIds.forEach((id) => ecuIds.add(id));

  const advertised = new Set<string>();
  const pagesRead: string[] = [];
  let pageCommand: string | null = "0100";
  let pageRaw = discovery;

  while (pageCommand) {
    pagesRead.push(pageCommand);
    const raw = pageRaw.rawResponse || pageRaw.normalizedResponse;
    const page = decodeSupportPageAny(pageCommand, raw);
    page.pids.forEach((pid) => advertised.add(pid));
    page.ecuIds.forEach((id) => ecuIds.add(id));
    const next = nextSupportPid(pageCommand, page.pids);
    if (!next || Number.parseInt(next.slice(2), 16) > 0xe0) break;
    pageCommand = next;
    pageRaw = await send(pageCommand, 2_500);
  }

  const pidResults: SupportedPidRecord[] = [];
  const dataPids = [...advertised].filter((pid) => !isMode01SupportQuery(pid)).sort();
  for (const pid of dataPids) {
    const record = await send(pid, 5_000);
    const decoded = classifyPid(pid, record);
    const frames = parseObdResponses(record.rawResponse || record.normalizedResponse);
    pidResults.push({
      mode: "01",
      pid,
      ecu: frames.find((item) => item.sourceEcu)?.sourceEcu ?? [...ecuIds][0] ?? null,
      advertisedSupported: true,
      name: pidName(pid),
      rawResponse: record.rawResponse || record.normalizedResponse,
      responseTimeMs: record.responseTimeMs,
      ...decoded,
      displayedInMfk: displayedInMfk(pid),
    });
  }

  const mode09: Record<string, string> = {};
  const page0900 = await send("0900", 8_000);
  mode09["0900"] = page0900.rawResponse || page0900.normalizedResponse;
  const mode09Supported = decodeSupportPageAny("0900", mode09["0900"]).pids;
  const mode09Targets = ["0902", "0904", "0906", "090A"].filter((pid) => !mode09Supported.length || mode09Supported.includes(pid));
  for (const pid of mode09Targets) {
    const record = await send(pid, 12_000);
    mode09[pid] = record.rawResponse || record.normalizedResponse;
  }

  const vin = mode09["0902"] ? decodeMode09Vin(mode09["0902"]).vin : null;
  const calibrationId = mode09["0904"] ? decodeMode09Text(mode09["0904"], "0904") : null;
  const cvn = mode09["0906"] ? decodeMode09Text(mode09["0906"], "0906") : null;
  const ecuName = mode09["090A"] ? decodeMode09Text(mode09["090A"], "090A") : null;

  const dtc03 = await send("03", 8_000);
  const dtc07 = await send("07", 8_000);
  const dtc0A = await send("0A", 8_000);
  const mode06 = await send("06", 8_000);

  const performance = buildPerformance(records);
  const workingPids = pidResults.filter((item) => item.status === "SUPPORTED_AND_WORKING").map((item) => item.pid);
  const missingDecoders = pidResults.filter((item) => item.status === "SUPPORTED_DECODER_MISSING").map((item) => item.pid);
  const failedDecoders = pidResults.filter((item) => item.status === "SUPPORTED_DECODE_FAILED").map((item) => item.pid);
  const unsupportedPids = pidResults.filter((item) => item.status === "UNSUPPORTED" || item.status === "NO_DATA").map((item) => item.pid);

  const protocolNumber = adapterRaw.ATDPN?.normalizedResponse || "";
  const jsonWithoutSummary: Omit<CapabilityAuditJson, "summary"> = {
    adapter: {
      identifier: adapterRaw.ATI?.normalizedResponse || "",
      protocol: adapterRaw.ATDP?.normalizedResponse || "",
      protocolNumber,
      headersEnabled: true,
      atzExecuted: Boolean(adapterRaw.ATZ),
    },
    ecus: [...ecuIds],
    supportedPids: pidResults,
    workingPids,
    missingDecoders,
    failedDecoders,
    unsupportedPids,
    vehicleInfo: {
      mode09Supported,
      vin,
      calibrationId,
      cvn,
      ecuName,
      raw: mode09,
    },
    dtcSupport: {
      mode03: {
        ok: dtc03.success && !/NO DATA/i.test(dtc03.normalizedResponse),
        codes: decodeDtcResponse(dtc03.rawResponse || dtc03.normalizedResponse, "03"),
        raw: dtc03.rawResponse || dtc03.normalizedResponse,
      },
      mode07: {
        ok: dtc07.success && !/NO DATA/i.test(dtc07.normalizedResponse),
        codes: decodeDtcResponse(dtc07.rawResponse || dtc07.normalizedResponse, "07"),
        raw: dtc07.rawResponse || dtc07.normalizedResponse,
      },
      mode0A: {
        ok: dtc0A.success && !/NO DATA/i.test(dtc0A.normalizedResponse),
        codes: decodeDtcResponse(dtc0A.rawResponse || dtc0A.normalizedResponse, "0A"),
        raw: dtc0A.rawResponse || dtc0A.normalizedResponse,
      },
      mode06: {
        ok: parseMode06Response(mode06.rawResponse || mode06.normalizedResponse).length > 0,
        tests: parseMode06Response(mode06.rawResponse || mode06.normalizedResponse).length,
        raw: mode06.rawResponse || mode06.normalizedResponse,
      },
    },
    performance,
    errors,
    commandsSent: records.map((item) => item.command),
    safety: {
      readOnly: true,
      clearDtcExecuted: false,
      writeCommandsExecuted: false,
      atzExecuted: Boolean(adapterRaw.ATZ),
      blockedAttempts,
    },
  };

  const json: CapabilityAuditJson = {
    ...jsonWithoutSummary,
    summary: buildSummary(jsonWithoutSummary),
  };

  return {
    json,
    text: formatCapabilityReportText(json),
    restoreHints: { protocolSelect: protocolSelectFromDpn(protocolNumber) },
  };
}

export function commandRecordFromUnknown(command: string, raw: string): DiagnosticCommandRecord {
  const parsed = parseElm327Response(raw, command);
  return {
    command,
    rawResponse: raw,
    normalizedResponse: parsed.normalized,
    sentAt: null,
    receivedAt: null,
    responseTimeMs: null,
    timeout: false,
    retryCount: 0,
    success: parsed.classification !== "unknown",
    error: null,
  };
}
