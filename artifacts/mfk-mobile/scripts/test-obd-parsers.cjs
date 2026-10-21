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
} = require(path.join(root, "src/obd/elm327/elm327-response-parser.ts"));
const { decodeMode01Pid, decodeDtcResponse } = require(path.join(root, "src/obd/pids/pid-decoder.ts"));
const { parseSupportedPidBitmap } = require(path.join(root, "src/obd/pids/pid-support-parser.ts"));
const { Elm327CommandQueue } = require(path.join(root, "src/obd/elm327/elm327-command-queue.ts"));

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
  assert.equal(decodeMode01Pid("010D", "410D28\r>").value, 40);
  assert.equal(decodeMode01Pid("0105", "41057B\r>").value, 83);
  assert.equal(decodeMode01Pid("0142", "4142301A\r>").value, 12.31);
  assert.equal(decodeMode01Pid("010C", "NO DATA\r>").status, "no_data");
  assert.equal(decodeMode01Pid("010C", "410C\r>").status, "missing_bytes");

  assert.deepEqual(parseSupportedPidBitmap("0100", [0x80, 0x00, 0x00, 0x01]), ["0101", "0120"]);
  assert.deepEqual(decodeDtcResponse("430133000000\r>", "03"), ["P0133"]);

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
}

run()
  .then(() => {
    console.log("OBD parser and queue tests passed");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
