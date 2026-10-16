import type { Elm327Transport } from "../types/obd.types";

const MOCK_RESPONSES: Record<string, string> = {
  ATZ: "ELM327 v2.2\r>",
  ATE0: "OK\r>",
  ATL0: "OK\r>",
  ATS0: "OK\r>",
  ATH0: "OK\r>",
  ATAT1: "OK\r>",
  ATCAF1: "OK\r>",
  ATCFC1: "?\r>",
  ATSP0: "OK\r>",
  ATI: "ELM327 v2.2\r>",
  "AT@1": "MOFK V011\r>",
  ATRV: "12.6V\r>",
  ATDP: "ISO 15765-4 (CAN 11/500)\r>",
  ATDPN: "A6\r>",
  "0100": "SEARCHING...\r7E8064100BE3EA813\r>",
  "0120": "7E806412000020001\r>",
  "0140": "7E80641404FD0C014\r>",
  "0101": "41018107A100\r>",
  "0104": "7E803410480\r>",
  "0105": "7E80341057B\r>",
  "0106": "7E803410680\r>",
  "0107": "7E80341077A\r>",
  "010B": "7E803410B1E\r>",
  "010C": "7E804410C1AF8\r>",
  "010D": "7E803410D28\r>",
  "010F": "7E803410F3C\r>",
  "0110": "7E80441100258\r>",
  "0111": "7E803411180\r>",
  "011C": "7E803411C06\r>",
  "012F": "7E803412F66\r>",
  "0142": "7E8044142301A\r>",
  "0145": "7E803414580\r>",
  "0147": "7E803414780\r>",
  "014A": "7E803414A80\r>",
  "014C": "7E803414C40\r>",
  "0146": "7E80341461E\r>",
  "0151": "7E803415101\r>",
  "03": "430133000000\r>",
  "07": "470000\r>",
  "0A": "4A0000\r>",
  "0900": "490054400000\r>",
  "0902": "490201314847424834314A584D4E313039313836\r>",
  "0904": "4904013342353939353931\r>",
  "0906": "490601A1B2C3D4\r>",
  "090A": "490A0145434D2D454E47494E45\r>",
  "011E": "7E803411E01\r>",
  "0121": "7E8044121000A\r>",
  "0130": "7E80341300C\r>",
  "0131": "7E8044131012C\r>",
  "0148": "7E803414880\r>",
  "0152": "7E803415200\r>",
  "015B": "7E803415BCC\r>",
  "015C": "7E803415C5A\r>",
  "015E": "7E804415E00C8\r>",
  "04": "44\r>",
  "0200": "4200BE3EA813\r>",
  "0202": "42020133\r>",
  "020C": "420C1AF8\r>",
  "020D": "420D28\r>",
  "0205": "42057B\r>",
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
