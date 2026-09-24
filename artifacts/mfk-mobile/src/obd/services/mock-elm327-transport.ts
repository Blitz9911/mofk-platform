import type { Elm327Transport } from "../types/obd.types";

const MOCK_RESPONSES: Record<string, string> = {
  ATZ: "ELM327 v2.1\r>",
  ATE0: "OK\r>",
  ATL0: "OK\r>",
  ATS0: "OK\r>",
  ATH0: "OK\r>",
  ATAT1: "OK\r>",
  ATSP0: "OK\r>",
  ATI: "ELM327 v2.1\r>",
  ATRV: "12.6V\r>",
  ATDP: "ISO 15765-4 (CAN 11/500)\r>",
  "0100": "4100BE3EA813\r>",
  "0104": "410480\r>",
  "0105": "41057B\r>",
  "010C": "410C1AF8\r>",
  "010D": "410D28\r>",
  "0111": "411180\r>",
  "012F": "412F66\r>",
  "0142": "4142301A\r>",
  "03": "430100000000\r>",
  "0902": "490201314847424834314A584D4E313039313836\r>",
};

export class MockElm327Transport implements Elm327Transport {
  private listeners = new Set<(chunk: string) => void>();
  private ready = true;

  isReady() {
    return this.ready;
  }

  async write(commandWithCarriageReturn: string) {
    const command = commandWithCarriageReturn.replace(/\r|\n/g, "").trim().toUpperCase();
    const response = MOCK_RESPONSES[command] ?? "NO DATA\r>";
    const splitAt = Math.max(1, Math.floor(response.length / 2));

    setTimeout(() => {
      this.listeners.forEach((listener) => listener(response.slice(0, splitAt)));
      setTimeout(() => this.listeners.forEach((listener) => listener(response.slice(splitAt))), 35);
    }, 60);
  }

  onChunk(listener: (chunk: string) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  disconnect() {
    this.ready = false;
    this.listeners.clear();
  }
}
