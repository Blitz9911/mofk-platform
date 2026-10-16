export function createLimiter({ maxSteps = 12, maxMs = 8000, now = () => Date.now() } = {}) {
  const started = now();
  let steps = 0;
  return {
    tick(label) {
      steps += 1;
      if (steps > maxSteps) {
        const error = new Error(`step limit exceeded at ${label} (${steps}/${maxSteps})`);
        error.code = "STEP_LIMIT";
        throw error;
      }
      const elapsed = now() - started;
      if (elapsed > maxMs) {
        const error = new Error(`time limit exceeded at ${label} (${elapsed}ms/${maxMs}ms)`);
        error.code = "TIME_LIMIT";
        throw error;
      }
      return { steps, elapsed };
    },
    snapshot() {
      return { steps, elapsedMs: now() - started, maxSteps, maxMs };
    },
  };
}
