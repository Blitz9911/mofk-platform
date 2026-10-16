import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_KILL_FILE = join(dirname(fileURLToPath(import.meta.url)), "../KILL");

export function isKilled(options = {}) {
  if (options.killed === true) return true;
  if (process.env.MFK_AGENT_RUNTIME_KILLED === "1") return true;
  const killFile = options.killFile || DEFAULT_KILL_FILE;
  return existsSync(killFile);
}

export function assertNotKilled(options) {
  if (isKilled(options)) {
    const error = new Error("runtime kill switch engaged");
    error.code = "RUNTIME_KILLED";
    throw error;
  }
}
