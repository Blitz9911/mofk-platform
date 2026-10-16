import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SIMULATION_ROLES = new Set([
  "orchestrator",
  "product-manager",
  "software-engineer",
  "qa-automation",
  "cybersecurity",
]);

export function loadWorkforceRegistry(registryPath) {
  const fallback = join(dirname(fileURLToPath(import.meta.url)), "../../registry.json");
  const raw = JSON.parse(readFileSync(registryPath || fallback, "utf8"));
  if (!Array.isArray(raw.agents)) throw new Error("registry.agents missing");
  const byId = new Map(raw.agents.map((agent) => [agent.id, agent]));
  return {
    operational: raw.operational === true,
    policyFile: raw.policyFile,
    handoffContract: raw.handoffContract,
    globalForbiddenActions: raw.globalForbiddenActions || [],
    sensitiveOperations: raw.sensitiveOperations || {},
    agents: raw.agents,
    byId,
    simulationRoles: [...SIMULATION_ROLES],
  };
}

export function assertRegistered(registry, agentId) {
  const agent = registry.byId.get(agentId);
  if (!agent) throw new Error(`unknown agent ${agentId}`);
  return agent;
}

export function assertSimulationRole(agentId) {
  if (!SIMULATION_ROLES.has(agentId)) {
    throw new Error(`agent ${agentId} is not enabled in simulation runtime`);
  }
}

export function agentMayAct(registry, agentId, action) {
  const agent = assertRegistered(registry, agentId);
  if ((registry.globalForbiddenActions || []).includes(action)) return false;
  if ((agent.forbiddenActions || []).includes(action)) return false;
  return true;
}
