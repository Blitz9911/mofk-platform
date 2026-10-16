const assert = require("node:assert/strict");
const path = require("node:path");
const ts = require("typescript");

require.extensions[".ts"] = function compileTypeScript(module, filename) {
  const source = require("node:fs").readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: filename,
  });
  module._compile(output.outputText, filename);
};

const root = path.resolve(__dirname, "..");
const { asciiToBase64, base64ToAscii } = require(path.join(root, "src/obd/utils/base64.ts"));
const {
  hasElm327Prompt,
  normalizeElm327Response,
  parseElm327Response,
  classifyElm327Response,
  takeCompletedElm327Frame,
} = require(path.join(root, "src/obd/elm327/elm327-response-parser.ts"));
const { decodeMode01Pid, decodeDtcResponse } = require(path.join(root, "src/obd/pids/pid-decoder.ts"));
const { parseSupportedPidBitmap } = require(path.join(root, "src/obd/pids/pid-support-parser.ts"));
const { Elm327CommandQueue } = require(path.join(root, "src/obd/elm327/elm327-command-queue.ts"));
const {
  ELM327_INITIALIZATION_SEQUENCE,
} = require(path.join(root, "src/obd/elm327/elm327.constants.ts"));
const {
  V011_NOTIFY_CHARACTERISTIC_UUID_SHORT,
  V011_WRITE_CHARACTERISTIC_UUID_SHORT,
} = require(path.join(root, "src/obd/ble/ble.constants.ts"));

class TestTransport {
  constructor(responses) {
    this.responses = responses;
    this.listeners = new Set();
    this.sent = [];
    this.ready = true;
  }

  isReady() {
    return this.ready;
  }

  async write(commandWithCarriageReturn) {
    const command = commandWithCarriageReturn.replace(/\r/g, "");
    this.sent.push(commandWithCarriageReturn);
    const response = this.responses[command];
    if (!response) return;
    setTimeout(() => {
      const midpoint = Math.floor(response.length / 2);
      this.listeners.forEach((listener) => listener(response.slice(0, midpoint)));
      setTimeout(() => this.listeners.forEach((listener) => listener(response.slice(midpoint))), 5);
    }, 5);
  }

  onChunk(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

async function run() {
  assert.equal(base64ToAscii(asciiToBase64("ATZ\r")), "ATZ\r");
  assert.equal(hasElm327Prompt("OK\r>"), true);
  assert.equal(normalizeElm327Response("010C\rSEARCHING...\r410C1AF8\r>", "010C"), "SEARCHING...\n410C1AF8");

  const parsed = parseElm327Response("\0ATI\rELM327 v2.1\r>", "ATI");
  assert.deepEqual(parsed.lines, ["ELM327 v2.1"]);

  assert.equal(decodeMode01Pid("010C", "410C1AF8\r>").value, 1726);
  assert.equal(decodeMode01Pid("010C", "7E804410C1AF8\r>").value, 1726);
  assert.equal(decodeMode01Pid("010D", "410D28\r>").value, 40);
  assert.equal(decodeMode01Pid("0105", "41057B\r>").value, 83);
  assert.equal(decodeMode01Pid("0111", "411180\r>").value, 50.2);
  assert.equal(decodeMode01Pid("0104", "410480\r>").value, 50.2);
  assert.equal(decodeMode01Pid("0110", "41100258\r>").value, 6);
  assert.equal(decodeMode01Pid("010B", "410B1E\r>").value, 30);
  assert.equal(decodeMode01Pid("0106", "410680\r>").value, 0);
  assert.equal(decodeMode01Pid("0142", "4142301A\r>").value, 12.31);
  assert.equal(decodeMode01Pid("010C", "NO DATA\r>").status, "no_data");
  assert.equal(decodeMode01Pid("010C", "410C\r>").status, "missing_bytes");
  assert.equal(decodeMode01Pid("01FF", "41FF00\r>").value, 0);
  assert.equal(classifyElm327Response("UNABLE TO CONNECT\r>", "0100"), "unable_to_connect");
  assert.equal(classifyElm327Response("7E8064100BE3EA813\r>", "0100"), "positive_obd");
  assert.deepEqual(takeCompletedElm327Frame("41 0C 1A F8\r>OK"), { complete: "41 0C 1A F8\r>", remainder: "OK" });

  assert.deepEqual(parseSupportedPidBitmap("0100", [0x80, 0x00, 0x00, 0x01]), ["0101", "0120"]);
  assert.deepEqual(parseSupportedPidBitmap("0180", [0x80, 0x00, 0x00, 0x00]), ["0181"]);
  assert.equal(decodeMode01Pid("012F", "412F80\r>").value, 50.2);
  assert.equal(decodeMode01Pid("012F", "7E803412F66\r>").value, 40);
  assert.equal(decodeMode01Pid("012F", "7F0112\r>").status, "unsupported");
  assert.equal(decodeMode01Pid("015C", "415C5A\r>").value, 50);
  assert.equal(decodeMode01Pid("010A", "410A10\r>").value, 48);
  assert.equal(decodeMode01Pid("0128", "7E80641287E5A674D\r>").value, 0.99);
  assert.equal(decodeMode01Pid("0138", "7E80641387EC37FF7\r>").value, 0.99);
  assert.equal(decodeMode01Pid("019D", "7E806419D000D000D\r>").value, 0.26);
  assert.equal(decodeMode01Pid("0165", "7E80441650200\r>").status, "ok");
  assert.equal(decodeMode01Pid("0141", "7E80641410007E180\r>").status, "ok");
  assert.equal(decodeMode01Pid("019F", "419F0300FF00\r>").status, "ok");
  assert.deepEqual(decodeDtcResponse("430133000000\r>", "03"), ["P0133"]);
  assert.deepEqual(decodeDtcResponse("43010300\r>", "03"), ["P0300"]);
  assert.deepEqual(decodeDtcResponse("43 03 00 00 00\r>", "03"), ["P0300"]);
  assert.deepEqual(decodeDtcResponse("434300\r>", "03"), ["C0300"]);
  assert.deepEqual(decodeDtcResponse("438001\r>", "03"), ["B0001"]);
  assert.deepEqual(decodeDtcResponse("43C100\r>", "03"), ["U0100"]);
  assert.deepEqual(decodeDtcResponse("434750\r>", "03"), ["C0750"]);
  const { decodeUdsDtcResponse } = require(path.join(root, "src/obd/pids/pid-decoder.ts"));
  assert.deepEqual(decodeUdsDtcResponse("5902AF47500001\r>"), ["C0750"]);
  const { requestHeaderFromResponseEcu } = require(path.join(root, "src/obd/dtc/chassis-dtc-scan.ts"));
  assert.equal(requestHeaderFromResponseEcu("7E8"), "7E0");
  assert.deepEqual(decodeDtcResponse("7B803434750\r>", "03"), ["C0750"]);

  const { describeDtc, dtcSystemForCode } = require(path.join(root, "src/obd/dtc/dtc-catalog.ts"));
  const { isTpmsRelatedCode, buildDiagnosticLampNotes, collectChassisDtcs, isBusFatalResponse } = require(path.join(root, "src/obd/dtc/chassis-dtc-scan.ts"));
  assert.equal(dtcSystemForCode("C0750"), "chassis");
  assert.equal(isTpmsRelatedCode("C0750"), true);
  assert.equal(isTpmsRelatedCode("U0127"), true);
  assert.equal(isTpmsRelatedCode("P0300"), false);
  assert.equal(describeDtc("C0750", "stored", { module: "ABS/ESC" }).module, "ABS/ESC");
  assert.equal(isBusFatalResponse("CAN ERROR\r>"), true);
  assert.equal(isBusFatalResponse("NO DATA\r>"), false);
  const lampNotes = buildDiagnosticLampNotes({ milOn: false, codes: [], extraModulesQueried: ["ABS/ESC (7B0)"] });
  assert.ok(lampNotes.some((note) => note.id === "tpms" && note.bodyAr.includes("انخفاض ضغط")));

  const chassisSent = [];
  const chassis = await collectChassisDtcs(async (command) => {
    chassisSent.push(command);
    if (command === "ATH1" || command === "ATH0" || command.startsWith("ATSH")) return "OK\r>";
    if (command === "03" && chassisSent.includes("ATSH7B0")) return "434750\r>";
    return "NO DATA\r>";
  });
  assert.ok(chassis.codes.some((item) => item.code === "C0750"));
  assert.equal(chassisSent[chassisSent.length - 2], "ATSH7DF");
  assert.equal(chassisSent[chassisSent.length - 1], "ATH0");

  const { decodeFourWheelPressures, extractPayloadAfterPrefix, collectTireCheck } = require(path.join(root, "src/obd/dtc/tire-check.ts"));
  const { vinMakerFamily } = require(path.join(root, "src/obd/vehicle-info/vin-identity.ts"));
  assert.equal(vinMakerFamily("Lexus"), "toyota");
  assert.deepEqual(extractPayloadAfterPrefix("61A12828282A\r>", "61A1"), [0x28, 0x28, 0x28, 0x2a]);
  const wheels = decodeFourWheelPressures([32, 33, 31, 30]);
  assert.equal(wheels[0].psi, 32);
  assert.equal(wheels[3].status, "ok");
  const tire = await collectTireCheck(async (command) => {
    if (command === "ATH1" || command === "ATH0" || command.startsWith("ATSH") || command.startsWith("ATFC")) return "OK\r>";
    if (command === "21A1") return "61A128282828\r>";
    return "NO DATA\r>";
  }, "JTHBZ1B13P2023392");
  assert.equal(tire.availability, "ok");
  assert.equal(tire.wheels[0].psi, 40);
  assert.deepEqual(decodeDtcResponse("NO DATA\r>", "03"), []);
  assert.deepEqual(decodeDtcResponse("470000\r>", "07"), []);
  assert.deepEqual(decodeDtcResponse("4A0000\r>", "0A"), []);

  const { decodeMode09Vin } = require(path.join(root, "src/obd/vehicle-info/mode09-parser.ts"));
  const { decodeMonitorStatus } = require(path.join(root, "src/obd/dtc/monitor-status.ts"));
  const { buildLivePollPlan, allLivePidCommands } = require(path.join(root, "src/obd/polling/live-poll-plan.ts"));
  const { decodeVinIdentity } = require(path.join(root, "src/obd/vehicle-info/vin-identity.ts"));
  const { buildLiveReadingCatalog, listV011Readings } = require(path.join(root, "src/obd/pids/pid-registry.ts"));
  const { decodeFreezeFrameDtc } = require(path.join(root, "src/obd/dtc/freeze-frame.ts"));
  const { Elm327Client } = require(path.join(root, "src/obd/elm327/elm327-client.ts"));
  const { initializeElm327 } = require(path.join(root, "src/obd/elm327/elm327-initializer.ts"));
  assert.equal(decodeMode09Vin("490201314847424834314A584D4E313039313836\r>").vin, "1HGBH41JXMN109186");
  assert.equal(
    decodeMode09Vin("490201314847424834314A584D\r4902024E313039313836\r>").vin,
    "1HGBH41JXMN109186",
  );
  assert.equal(decodeVinIdentity("JTHBZ1B13P2023392").make, "Lexus");
  assert.equal(decodeVinIdentity("1HGBH41JXMN109186").make, "Honda");
  assert.equal(decodeVinIdentity("1HGBH41JXMN109186").modelYear, 2021);
  assert.equal(decodeVinIdentity("1HGBH41JXMN109186").model, null);
  assert.equal(decodeMode09Vin("NO DATA\r>").availability, "unavailable");
  assert.equal(decodeMode09Vin("7E814490201314847424834314A584D4E313039313836\r>").vin, "1HGBH41JXMN109186");
  const monitor = decodeMonitorStatus("41018107A100\r>");
  assert.equal(monitor.milOn, true);
  assert.equal(monitor.dtcCount, 1);
  assert.ok(monitor.readiness.length > 3);
  assert.equal(decodeFreezeFrameDtc("42020133\r>"), "P0133");
  assert.equal(describeDtc("P0300", "stored").descriptionEn, "Random/Multiple Cylinder Misfire Detected");
  assert.ok(buildLivePollPlan(["010C"], 0).includes("012F"));
  assert.ok(buildLivePollPlan(["010C"], 0).includes("010C"));
  assert.ok(!buildLivePollPlan(["010C"], 0, { skipPids: ["012F"] }).includes("012F"));
  assert.ok(buildLivePollPlan(["010C"], 0, { extraPids: allLivePidCommands() }).includes("015E"));
  assert.deepEqual(buildLivePollPlan(["010C", "0199"], 1).sort(), ["0104", "010B", "010C", "010D", "0110", "0111"]);

  const { buildLiveTelemetryPayload } = require(path.join(root, "src/obd/telemetry/live-telemetry-payload.ts"));
  const payload = buildLiveTelemetryPayload(
    {
      rpm: { status: "ok", value: 812.4, unit: "rpm", raw: "410C" },
      speed: { status: "ok", value: 40, unit: "km/h", raw: "410D" },
      coolantTemp: { status: "ok", value: 91, unit: "C", raw: "4105" },
      engineLoad: { status: "ok", value: 22.2, unit: "%", raw: "4104" },
      throttle: { status: "ok", value: 18.6, unit: "%", raw: "4111" },
      fuelLevel: { status: "ok", value: 47.8, unit: "%", raw: "412F" },
      controlModuleVoltage: { status: "ok", value: 13.61, unit: "V", raw: "4142" },
    },
    {
      "010F": { pid: "010F", arabicLabel: "سحب", englishLabel: "IAT", category: "temps", value: 34.2, unit: "C", status: "ok", raw: "410F", updatedAt: 1 },
    },
  );
  assert.equal(payload.rpm, 812);
  assert.equal(payload.fuelLevelPct, 48);
  assert.equal(payload.intakeTemp, 34);
  assert.equal(payload.batteryV, 13.61);
  assert.equal(buildLiveTelemetryPayload({
    rpm: { status: "no_data", value: null, unit: null, raw: "" },
    speed: null,
    coolantTemp: null,
    engineLoad: null,
    throttle: null,
    fuelLevel: null,
    controlModuleVoltage: null,
  }), null);
  assert.equal(buildLiveReadingCatalog([])["010C"].status, "no_data");
  assert.equal(buildLiveReadingCatalog([])["015C"].status, "no_data");
  assert.equal(buildLiveReadingCatalog(["010C"])["010C"].status, "no_data");
  const listed = listV011Readings(
    {
      ATRV: {
        pid: "ATRV",
        arabicLabel: "فولتية القطعة",
        englishLabel: "Adapter Voltage",
        category: "voltage",
        value: "12.6V",
        unit: null,
        status: "ok",
        raw: "12.6V",
        updatedAt: 1,
      },
    },
    ["010C", "0199"],
  );
  assert.ok(listed.some((item) => item.pid === "ATRV" && item.status === "ok"));
  assert.ok(listed.some((item) => item.pid === "0199"));
  assert.equal(V011_NOTIFY_CHARACTERISTIC_UUID_SHORT, "ffe1");
  assert.equal(V011_WRITE_CHARACTERISTIC_UUID_SHORT, "ffe2");
  assert.deepEqual(
    ELM327_INITIALIZATION_SEQUENCE.map((step) => step.command),
    ["ATI", "AT@1", "ATZ", "ATE0", "ATL0", "ATS0", "ATH0", "ATSP0", "ATAT1", "ATCAF1", "ATCFC1", "0100", "ATDP", "ATDPN", "ATRV"],
  );

  const transport = new TestTransport({ ATZ: "ELM327 v2.1\r>", ATRV: "12.6V\r>" });
  const queue = new Elm327CommandQueue(transport);
  const first = await queue.send("ATZ", { retries: 0 });
  const second = await queue.send("ATRV", { retries: 0 });
  assert.equal(first.normalizedResponse, "ELM327 v2.1");
  assert.equal(second.normalizedResponse, "12.6V");
  assert.deepEqual(transport.sent, ["ATZ\r", "ATRV\r"]);
  queue.dispose();

  const timeoutQueue = new Elm327CommandQueue(new TestTransport({}));
  await assert.rejects(() => timeoutQueue.send("010C", { timeoutMs: 20, retries: 0 }), /timeout/i);
  timeoutQueue.dispose();

  const cancelQueue = new Elm327CommandQueue(new TestTransport({}));
  const pending = cancelQueue.send("010C", { timeoutMs: 5_000, retries: 0 });
  cancelQueue.cancelAll("BLE disconnected");
  await assert.rejects(() => pending, /disconnected/i);
  cancelQueue.dispose();

  const dead = new TestTransport({});
  dead.ready = false;
  const deadQueue = new Elm327CommandQueue(dead);
  await assert.rejects(() => deadQueue.send("ATZ", { retries: 0 }), /not ready/i);
  deadQueue.dispose();

  const multiEcu = new Elm327Client(
    new TestTransport({
      "0100": "4100BE000000\r410080000001\r>",
    }),
  );
  const supported = await multiEcu.readSupportedPids("0100");
  assert.ok(supported.includes("0101"));
  assert.ok(supported.includes("0120"));
  multiEcu.dispose();

  const initClient = new Elm327Client(
    new TestTransport({
      ATI: "ELM327 v2.2\r>",
      "AT@1": "?\r>",
      ATZ: "ELM327 v2.2\r>",
      ATE0: "OK\r>",
      ATL0: "OK\r>",
      ATS0: "OK\r>",
      ATH0: "OK\r>",
      ATSP0: "OK\r>",
      ATAT1: "OK\r>",
      ATCAF1: "?\r>",
      ATCFC1: "?\r>",
      "0100": "SEARCHING...\r4100BE3EA813\r>",
      "0120": "NO DATA\r>",
      "0140": "NO DATA\r>",
      "0160": "NO DATA\r>",
      "0180": "NO DATA\r>",
      ATDP: "ISO 15765-4\r>",
      ATDPN: "A6\r>",
      ATRV: "12.6V\r>",
    }),
  );
  const init = await initializeElm327(initClient);
  assert.equal(init.vehicleConnected, true);
  assert.ok(init.warnings.some((warning) => warning.includes("ATCAF1")));
  assert.ok(init.supportedPids.includes("010C"));
  initClient.dispose();

  assert.equal(classifyElm327Response("NO DATA\r>", "010C"), "no_data");
  assert.equal(classifyElm327Response("?\r>", "ATCAF1"), "question");
  assert.equal(classifyElm327Response("CAN ERROR\r>", "0100"), "can_error");
  assert.equal(parseElm327Response("010C\r41 0C 1A F8\r>", "010C").hexLines[0], "410C1AF8");

  const { extractBits, decodeSignal } = require(path.join(root, "src/obd/signals/signal-decoder.ts"));
  assert.equal(extractBits(Uint8Array.from([0x1a, 0xf8]), 0, 16), 0x1af8);
  assert.equal(decodeSignal({ len: 16, div: 4, unit: "rpm" }, Uint8Array.from([0x1a, 0xf8])).value, 1726);
  assert.equal(decodeSignal({ bix: 0, len: 8, mul: 100, div: 128, add: -100, unit: "percent" }, Uint8Array.from([0x80])).value, 0);
  assert.equal(decodeSignal({ len: 8, sign: true }, Uint8Array.from([0xff])).value, -1);
  assert.equal(decodeSignal({ len: 1, map: { "1": { value: "ON" }, "0": { value: "OFF" } } }, Uint8Array.from([0x80])).value, "ON");

  const { decodePidSignals, SIGNAL_REGISTRY, SIGNALS_BY_COMMAND } = require(path.join(root, "src/obd/signals/signal-registry.ts"));
  assert.ok(SIGNAL_REGISTRY.length >= 100);
  assert.ok((SIGNALS_BY_COMMAND.get("010C") || []).length >= 1);
  const rpmSignals = decodePidSignals("010C", "410C1AF8\r>");
  assert.ok(rpmSignals.some((item) => item.status === "available" && Math.abs(Number(item.value) - 1726) < 1));
  const trimSignals = decodePidSignals("0106", "410680\r>");
  assert.ok(trimSignals.some((item) => item.status === "available"));
  const noDataSignals = decodePidSignals("012F", "NO DATA\r>");
  assert.ok(noDataSignals.every((item) => item.status === "temporarilyUnavailable" || item.status === "error"));

  const { decodeSupportPage, discoverSupportedMode01Pids } = require(path.join(root, "src/obd/protocol/j1979-capability-discovery.ts"));
  const page = decodeSupportPage("0100", "7E8064100BE3EA813\r>");
  assert.ok(page.pids.includes("010C"));
  assert.ok(page.pids.includes("0120"));
  assert.ok(page.ecuIds.includes("7E8"));
  const later = decodeSupportPage("0120", "412000020001\r>");
  assert.ok(later.pids.includes("012F"));
  assert.ok(later.pids.includes("0140"));
  const skipped = decodeSupportPage("0140", "NO DATA\r>");
  assert.equal(skipped.pids.length, 0);

  const sent = [];
  await discoverSupportedMode01Pids(async (command) => {
    sent.push(command);
    if (command === "0100") return "4100BE3EA813\r>";
    if (command === "0120") return "412000000000\r>";
    return "NO DATA\r>";
  }, "4100BE3EA813\r>");
  assert.deepEqual(sent, ["0120"]);
  assert.ok(!sent.includes("0140"));

  const { planPollCommands, pollBudget } = require(path.join(root, "src/obd/polling/polling-scheduler.ts"));
  assert.ok(pollBudget(200) >= 4);
  const planned = planPollCommands({ supportedCommands: ["010C", "0105", "012F", "0142"], cycle: 0, averageLatencyMs: 180 });
  assert.ok(planned[0] === "010C" || planned.includes("010C"));
  assert.ok(!planned.includes("0100"));

  const { parseMode06Response } = require(path.join(root, "src/obd/diagnostics/mode06-service.ts"));
  const mode06 = parseMode06Response("46010101000A00050064\r>");
  assert.equal(mode06[0].mid, "01");
  assert.equal(mode06[0].tid, "01");
  assert.equal(mode06[0].passed, true);

  const dtcCatalog = require(path.join(root, "src/obd/dtc/dtc-catalog.ts"));
  assert.equal(dtcCatalog.isGenericDtc("P0300"), true);
  assert.equal(dtcCatalog.isGenericDtc("P1234"), false);
  assert.ok(dtcCatalog.describeDtc("P1234", "stored").descriptionAr.includes("خاص بالشركة"));

  const { parseObdResponses } = require(path.join(root, "src/obd/elm327/obd-response-parser.ts"));
  const multi = parseObdResponses("7E8064100BE3EA813\r7E906410080000001\r>");
  assert.equal(multi.length, 2);
  assert.ok(multi.some((item) => item.sourceEcu === "7E9"));

  const { LiveDataRecorder } = require(path.join(root, "src/obd/recording/live-data-recorder.ts"));
  const recorder = new LiveDataRecorder();
  recorder.start();
  recorder.capture({ "01:RPM": { id: "01:RPM", definitionId: "010C:RPM", command: "010C", value: 800, status: "available", timestamp: 1 } });
  assert.equal(recorder.stop().length, 1);

  const allowlist = require(path.join(root, "src/obd/diagnostics/safe-command-allowlist.ts"));
  assert.equal(allowlist.isAllowedDiagnosticCommand("010C"), true);
  assert.equal(allowlist.isAllowedDiagnosticCommand("03"), true);
  assert.equal(allowlist.isAllowedDiagnosticCommand("0902"), true);
  assert.equal(allowlist.isAllowedDiagnosticCommand("06"), true);
  assert.equal(allowlist.isAllowedDiagnosticCommand("04"), false);
  assert.equal(allowlist.isAllowedDiagnosticCommand("ATZ"), false);
  assert.equal(allowlist.isAllowedDiagnosticCommand("ATZ", { allowAtz: true }), true);
  assert.throws(() => allowlist.assertSafeDiagnosticCommand("04"));
  assert.throws(() => allowlist.assertSafeDiagnosticCommand("2F01"));

  const { runObdCapabilityScan } = require(path.join(root, "src/obd/diagnostics/obd-capability-scanner.ts"));
  const canned = {
    ATI: "ELM327 v1.5\r>",
    ATE0: "OK\r>",
    ATL0: "OK\r>",
    ATS0: "OK\r>",
    ATH1: "OK\r>",
    ATDP: "ISO 15765-4 (CAN 11/500)\r>",
    ATDPN: "A6\r>",
    ATSP0: "OK\r>",
    "0100": "7E8064100BE3EA813\r>",
    "0104": "7E803410464\r>",
    "0105": "7E80341057B\r>",
    "010C": "7E804410C1AF8\r>",
    "010D": "7E803410D00\r>",
    "0111": "7E803411180\r>",
    "011C": "NO DATA\r>",
    "0120": "NO DATA\r>",
    "0900": "490001200000\r>",
    "0902": "014\r0: 49020131464C\r1: 314B5036574B\r2: 423331343533\r>",
    "0904": "NO DATA\r>",
    "090A": "NO DATA\r>",
    "03": "430000\r>",
    "07": "NO DATA\r>",
    "0A": "NO DATA\r>",
    "06": "NO DATA\r>",
  };
  const sentAudit = [];
  const audit = await runObdCapabilityScan({
    send: async (command) => {
      sentAudit.push(command);
      const raw = canned[command] || "NO DATA\r>";
      return {
        command,
        rawResponse: raw,
        normalizedResponse: raw.replace(/>/g, "").trim(),
        sentAt: 1,
        receivedAt: 20,
        responseTimeMs: 19,
        timeout: false,
        retryCount: 0,
        success: true,
        error: null,
      };
    },
  });
  assert.ok(!sentAudit.includes("04"));
  assert.ok(!sentAudit.includes("ATZ"));
  assert.equal(audit.json.safety.clearDtcExecuted, false);
  assert.equal(audit.json.safety.writeCommandsExecuted, false);
  assert.ok(audit.json.ecus.includes("7E8"));
  assert.ok(audit.json.workingPids.includes("010C"));
  assert.ok(audit.json.commandsSent.includes("0100"));
  assert.ok(audit.text.includes("ADAPTER CAPABILITIES"));
}

run()
  .then(() => {
    console.log("OBD parser and queue tests passed");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
