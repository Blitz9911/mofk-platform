export const ELM327_DEFAULT_TIMEOUT_MS = 3_000;
export const ELM327_LOCAL_SETUP_TIMEOUT_MS = 2_000;
export const ELM327_RESET_TIMEOUT_MS = 5_000;
export const ELM327_PROTOCOL_SEARCH_TIMEOUT_MS = 15_000;
export const ELM327_PROMPT_GUARD_MS = 20;
export const ELM327_MAX_BUFFER_SIZE = 8_192;
export const ELM327_DEFAULT_RETRIES = 1;

export const ELM_PRIORITY = {
  background: 1,
  realtime: 3,
  userAction: 8,
  critical: 10,
} as const;

export const ELM327_INITIALIZATION_SEQUENCE = [
  { command: "ATI", timeoutMs: ELM327_RESET_TIMEOUT_MS, optional: true },
  { command: "AT@1", timeoutMs: ELM327_LOCAL_SETUP_TIMEOUT_MS, optional: true },
  { command: "ATZ", timeoutMs: ELM327_RESET_TIMEOUT_MS, optional: false },
  { command: "ATE0", timeoutMs: ELM327_LOCAL_SETUP_TIMEOUT_MS, optional: true },
  { command: "ATL0", timeoutMs: ELM327_LOCAL_SETUP_TIMEOUT_MS, optional: true },
  { command: "ATS0", timeoutMs: ELM327_LOCAL_SETUP_TIMEOUT_MS, optional: true },
  { command: "ATH0", timeoutMs: ELM327_LOCAL_SETUP_TIMEOUT_MS, optional: true },
  { command: "ATSP0", timeoutMs: ELM327_LOCAL_SETUP_TIMEOUT_MS, optional: false },
  { command: "ATAT1", timeoutMs: ELM327_LOCAL_SETUP_TIMEOUT_MS, optional: true },
  { command: "ATCAF1", timeoutMs: ELM327_LOCAL_SETUP_TIMEOUT_MS, optional: true },
  { command: "ATCFC1", timeoutMs: ELM327_LOCAL_SETUP_TIMEOUT_MS, optional: true },
  { command: "0100", timeoutMs: ELM327_PROTOCOL_SEARCH_TIMEOUT_MS, optional: false },
  { command: "ATDP", timeoutMs: ELM327_DEFAULT_TIMEOUT_MS, optional: true },
  { command: "ATDPN", timeoutMs: ELM327_DEFAULT_TIMEOUT_MS, optional: true },
  { command: "ATRV", timeoutMs: ELM327_DEFAULT_TIMEOUT_MS, optional: true },
] as const;

export const ELM327_PROTOCOL_FALLBACK = ["ATTP6", "ATTP7", "ATTP8", "ATTP9", "ATTP5", "ATTP4", "ATTP3", "ATTP1", "ATTP2"] as const;

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
