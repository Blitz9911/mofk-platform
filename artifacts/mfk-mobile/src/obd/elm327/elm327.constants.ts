export const ELM327_DEFAULT_TIMEOUT_MS = 4_000;
export const ELM327_RESET_TIMEOUT_MS = 8_000;
export const ELM327_INTER_COMMAND_DELAY_MS = 120;
export const ELM327_MAX_BUFFER_SIZE = 8_192;
export const ELM327_DEFAULT_RETRIES = 1;

export const ELM327_INITIALIZATION_SEQUENCE = [
  { command: "ATZ", timeoutMs: ELM327_RESET_TIMEOUT_MS, optional: false },
  { command: "ATE0", timeoutMs: ELM327_DEFAULT_TIMEOUT_MS, optional: true },
  { command: "ATL0", timeoutMs: ELM327_DEFAULT_TIMEOUT_MS, optional: true },
  { command: "ATS0", timeoutMs: ELM327_DEFAULT_TIMEOUT_MS, optional: true },
  { command: "ATH0", timeoutMs: ELM327_DEFAULT_TIMEOUT_MS, optional: true },
  { command: "ATSP0", timeoutMs: ELM327_DEFAULT_TIMEOUT_MS, optional: false },
  { command: "0100", timeoutMs: 6_000, optional: false },
  { command: "ATDP", timeoutMs: ELM327_DEFAULT_TIMEOUT_MS, optional: true },
] as const;

export const ELM327_STATUS_MESSAGES = [
  "OK",
  "NO DATA",
  "SEARCHING...",
  "UNABLE TO CONNECT",
  "STOPPED",
  "?",
  "CAN ERROR",
  "BUS ERROR",
  "BUFFER FULL",
  "BUS INIT: ERROR",
  "LV RESET",
  "ERROR",
] as const;
