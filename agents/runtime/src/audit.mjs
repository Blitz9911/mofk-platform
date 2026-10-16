export function createAuditLog({ now = () => new Date().toISOString() } = {}) {
  const events = [];
  return {
    record(type, payload = {}) {
      const event = {
        seq: events.length + 1,
        at: now(),
        type,
        ...payload,
      };
      events.push(event);
      return event;
    },
    events() {
      return [...events];
    },
    report(task) {
      return {
        runtime: "mfk-agent-runtime-simulation",
        mode: "deterministic-offline",
        operational: false,
        taskId: task?.taskId ?? null,
        eventCount: events.length,
        events: [...events],
      };
    },
  };
}
