// Command framing, timeout policy and response classification, following
// Drove West V011 Application Integration Reference §4 and §8.

export const PROMPT_BYTE = 0x3e; // '>'

export type CommandClass =
  | "local-setup"
  | "identity-reset"
  | "protocol-search"
  | "routine";

// §4.3 Practical starting timeout policy — starting points, not V011 guarantees.
export const COMMAND_TIMEOUT_MS: Record<CommandClass, number> = {
  "local-setup": 2000,
  "identity-reset": 5000,
  "protocol-search": 15000,
  routine: 3000,
};

const LOCAL_SETUP_COMMANDS = new Set([
  "ATE0",
  "ATL0",
  "ATS0",
  "ATH1",
  "ATH0",
  "ATSP0",
  "ATAT1",
  "ATDP",
  "ATDPN",
]);
const IDENTITY_RESET_COMMANDS = new Set(["ATI", "ATZ"]);

export function classifyCommand(command: string): CommandClass {
  const cmd = command.trim().toUpperCase();
  if (cmd.startsWith("01") || cmd.startsWith("03") || cmd.startsWith("09")) {
    return cmd === "0100" || cmd === "0120" || cmd === "0140"
      ? "protocol-search"
      : "routine";
  }
  if (IDENTITY_RESET_COMMANDS.has(cmd)) return "identity-reset";
  if (LOCAL_SETUP_COMMANDS.has(cmd)) return "local-setup";
  return "routine";
}

export type ResponseOutcome =
  | "ok"
  | "unsupported-command"
  | "searching"
  | "no-data"
  | "unable-to-connect"
  | "bus-init-error"
  | "bus-error"
  | "buffer-full"
  | "stopped"
  | "data";

// §8.1 Do not collapse distinct outcomes — classify before deciding App action.
// A "0100" transaction can legitimately contain "SEARCHING..." as an
// intermediate line followed by real data on the final line (§4.1: treat
// SEARCHING... as response content, not the transaction's outcome), so
// classification looks at the last non-empty line, not the whole text.
export function classifyResponse(normalized: string): ResponseOutcome {
  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const last = (lines[lines.length - 1] ?? "").toUpperCase();
  if (last === "OK") return "ok";
  if (last === "?") return "unsupported-command";
  if (last.includes("NO DATA")) return "no-data";
  if (last.includes("UNABLE TO CONNECT")) return "unable-to-connect";
  if (last.includes("BUS INIT") && last.includes("ERROR"))
    return "bus-init-error";
  if (last.includes("CAN ERROR") || last.includes("BUS ERROR"))
    return "bus-error";
  if (last.includes("BUFFER FULL")) return "buffer-full";
  if (last === "STOPPED") return "stopped";
  if (last.includes("SEARCHING")) return "searching";
  return "data";
}

// Strip the trailing prompt and normalize line endings on a copy; the raw
// buffer captured by the transaction is kept untouched for logging (§6.2).
export function normalizeResponse(raw: string): string {
  return raw
    .replace(/>+\s*$/, "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

export function frameCommand(command: string): string {
  return `${command.trim()}\r`;
}
