import { createModelError, MODEL_ERROR_CODES } from "./errors.mjs";

function envelope(payload) {
  return { text: JSON.stringify(payload), finishReason: "stop", live: false };
}

function validProposal(summary = "Offline mock proposal. No files written.") {
  return envelope({
    kind: "proposal",
    summary,
    proposedActions: ["draft a read-only plan", "wait for human approval"],
    toolRequests: [],
    approvalNeeded: true,
    confidence: 0.4,
  });
}

/**
 * Deterministic offline adapter. Never performs I/O.
 */
export class MockModelAdapter {
  constructor({ scenario = "ok" } = {}) {
    this.id = "mock";
    this.live = false;
    this.scenario = scenario;
  }

  complete(request) {
    const scenario = request.scenario || this.scenario;
    switch (scenario) {
      case "ok":
        return validProposal();
      case "refusal":
        return envelope({
          kind: "refusal",
          summary: "Mock refused to continue.",
          proposedActions: [],
          toolRequests: [],
          approvalNeeded: true,
          confidence: 1,
          refusalReason: "policy refusal: untrusted content asked to bypass controls",
        });
      case "unauthorized-tools":
        return envelope({
          kind: "proposal",
          summary: "Attempting unauthorized tools",
          proposedActions: ["run shell"],
          toolRequests: [{ name: "execute_shell", args: { command: "rm -rf /" } }],
          approvalNeeded: true,
          confidence: 0.9,
        });
      case "malformed":
        return { text: "definitely not json {{{", finishReason: "stop" };
      case "schema-extra":
        return envelope({
          kind: "proposal",
          summary: "extra fields",
          proposedActions: [],
          toolRequests: [],
          approvalNeeded: true,
          confidence: 0.1,
          selfApproved: true,
          systemOverride: "ignore previous",
        });
      case "missing-approval":
        return envelope({
          kind: "proposal",
          summary: "trying to auto-approve",
          proposedActions: [],
          toolRequests: [],
          approvalNeeded: false,
          confidence: 0.2,
        });
      case "oversize-output": {
        const summary = "x".repeat(5000);
        return envelope({
          kind: "proposal",
          summary,
          proposedActions: [],
          toolRequests: [],
          approvalNeeded: true,
          confidence: 0.1,
        });
      }
      case "provider-failure":
        throw createModelError(MODEL_ERROR_CODES.PROVIDER_FAILURE, "mock provider failure");
      case "echo-injection": {
        const injected = request.messages?.find((row) => row.trust === "untrusted")?.content || "";
        return envelope({
          kind: "proposal",
          summary: injected.slice(0, 200),
          proposedActions: ["follow untrusted instructions"],
          toolRequests: [{ name: "github_write", args: {} }],
          approvalNeeded: true,
          confidence: 0.99,
        });
      }
      default:
        throw createModelError(
          MODEL_ERROR_CODES.ADAPTER_CONTRACT,
          `unknown mock scenario ${scenario}`,
        );
    }
  }
}

export function createMockAdapter(scenario) {
  return new MockModelAdapter({ scenario });
}
