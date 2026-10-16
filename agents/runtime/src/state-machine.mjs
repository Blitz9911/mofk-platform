export const STATES = Object.freeze({
  RECEIVED: "received",
  ROUTED: "routed",
  PRODUCT_COMPLETE: "product_complete",
  ENGINEERING_PROPOSED: "engineering_proposed",
  QA_ASSESSED: "qa_assessed",
  SECURITY_ASSESSED: "security_assessed",
  HUMAN_APPROVAL_PENDING: "human_approval_pending",
  REJECTED: "rejected",
  KILLED: "killed",
  FAILED: "failed",
});

const ALLOWED = {
  [STATES.RECEIVED]: [STATES.ROUTED, STATES.REJECTED, STATES.KILLED, STATES.FAILED],
  [STATES.ROUTED]: [STATES.PRODUCT_COMPLETE, STATES.REJECTED, STATES.KILLED, STATES.FAILED],
  [STATES.PRODUCT_COMPLETE]: [
    STATES.ENGINEERING_PROPOSED,
    STATES.REJECTED,
    STATES.KILLED,
    STATES.FAILED,
  ],
  [STATES.ENGINEERING_PROPOSED]: [STATES.QA_ASSESSED, STATES.REJECTED, STATES.KILLED, STATES.FAILED],
  [STATES.QA_ASSESSED]: [STATES.SECURITY_ASSESSED, STATES.REJECTED, STATES.KILLED, STATES.FAILED],
  [STATES.SECURITY_ASSESSED]: [
    STATES.HUMAN_APPROVAL_PENDING,
    STATES.REJECTED,
    STATES.KILLED,
    STATES.FAILED,
  ],
  [STATES.HUMAN_APPROVAL_PENDING]: [STATES.REJECTED, STATES.KILLED],
  [STATES.REJECTED]: [],
  [STATES.KILLED]: [],
  [STATES.FAILED]: [],
};

export function canTransition(from, to) {
  return (ALLOWED[from] || []).includes(to);
}

export function transition(from, to) {
  if (!canTransition(from, to)) {
    const error = new Error(`illegal transition ${from} -> ${to}`);
    error.code = "ILLEGAL_TRANSITION";
    throw error;
  }
  return to;
}
