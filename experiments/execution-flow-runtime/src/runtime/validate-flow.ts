import { ExecutionFlowError } from "./errors.js";
import type { ExecutionFlow, ExecutionNode, ExecutionRun } from "../types.js";

const NODE_TYPES = new Set(["action", "inference", "switch", "return"]);

export function validateExecutionRun(run: ExecutionRun): Map<string, ExecutionNode> {
  if (!run || typeof run !== "object" || Array.isArray(run)) {
    throw new ExecutionFlowError("INVALID_RUN", "Execution run must be an object.");
  }
  if (run.contract !== "execution.run.v0") {
    throw new ExecutionFlowError("INVALID_RUN", "contract must be execution.run.v0.");
  }
  if (!run.execution_id || typeof run.execution_id !== "string") {
    throw new ExecutionFlowError("INVALID_RUN", "execution_id is required.");
  }
  if (!run.inputs || typeof run.inputs !== "object" || Array.isArray(run.inputs)) {
    throw new ExecutionFlowError("INVALID_RUN", "inputs must be an object.");
  }
  if (!run.authorization || !Array.isArray(run.authorization.allowed_capabilities)) {
    throw new ExecutionFlowError(
      "INVALID_RUN",
      "authorization.allowed_capabilities must be an array."
    );
  }
  if (
    run.max_node_runs !== undefined &&
    (!Number.isInteger(run.max_node_runs) || run.max_node_runs < 1)
  ) {
    throw new ExecutionFlowError("INVALID_RUN", "max_node_runs must be a positive integer.");
  }
  return validateFlow(run.flow);
}

export function validateFlow(flow: ExecutionFlow): Map<string, ExecutionNode> {
  if (!flow || typeof flow !== "object" || flow.contract !== "execution.flow.v0") {
    throw new ExecutionFlowError(
      "INVALID_FLOW",
      "flow.contract must be execution.flow.v0."
    );
  }
  if (!flow.flow_id || typeof flow.flow_id !== "string") {
    throw new ExecutionFlowError("INVALID_FLOW", "flow.flow_id is required.");
  }
  if (!Number.isInteger(flow.version) || flow.version < 1) {
    throw new ExecutionFlowError("INVALID_FLOW", "flow.version must be a positive integer.");
  }
  if (!Array.isArray(flow.nodes) || flow.nodes.length === 0) {
    throw new ExecutionFlowError(
      "INVALID_FLOW",
      "flow.nodes must be a non-empty array."
    );
  }

  const byId = new Map<string, ExecutionNode>();
  for (const node of flow.nodes) {
    if (!node || typeof node !== "object" || typeof node.id !== "string" || !node.id) {
      throw new ExecutionFlowError(
        "INVALID_FLOW",
        "Every node requires a non-empty id."
      );
    }
    if (byId.has(node.id)) {
      throw new ExecutionFlowError("INVALID_FLOW", `Duplicate node id: ${node.id}`);
    }
    if (!NODE_TYPES.has(node.type)) {
      throw new ExecutionFlowError(
        "INVALID_FLOW",
        `Unsupported node type: ${String(node.type)}`
      );
    }
    byId.set(node.id, node);
  }

  if (!byId.has(flow.entry_node)) {
    throw new ExecutionFlowError(
      "INVALID_FLOW",
      `entry_node does not exist: ${flow.entry_node}`
    );
  }

  const targets: Array<[string, string]> = [];
  for (const node of flow.nodes) {
    if (node.type === "action" || node.type === "inference") {
      if (typeof node.next !== "string") {
        throw new ExecutionFlowError("INVALID_FLOW", `${node.id}.next is required.`);
      }
      targets.push([node.id, node.next]);
    }

    if (node.type === "switch") {
      if (typeof node.select !== "string" || !node.select.startsWith("$")) {
        throw new ExecutionFlowError(
          "INVALID_FLOW",
          `${node.id}.select must be a binding reference.`
        );
      }
      if (!node.cases || typeof node.cases !== "object" || Array.isArray(node.cases)) {
        throw new ExecutionFlowError(
          "INVALID_FLOW",
          `${node.id}.cases must be an object.`
        );
      }
      for (const target of Object.values(node.cases)) targets.push([node.id, target]);
      targets.push([node.id, node.default]);
    }

    if (node.type === "action" && (!node.capability || typeof node.capability !== "string")) {
      throw new ExecutionFlowError(
        "INVALID_FLOW",
        `${node.id}.capability is required.`
      );
    }

    if (node.type === "inference") {
      if (!node.backend || !["standard", "reasoning"].includes(node.profile)) {
        throw new ExecutionFlowError(
          "INVALID_FLOW",
          `${node.id} requires backend and standard|reasoning profile.`
        );
      }
      if (!node.output_schema || typeof node.output_schema !== "object") {
        throw new ExecutionFlowError(
          "INVALID_FLOW",
          `${node.id}.output_schema is required.`
        );
      }
    }
  }

  for (const [from, target] of targets) {
    if (typeof target !== "string" || !byId.has(target)) {
      throw new ExecutionFlowError(
        "INVALID_FLOW",
        `Node ${from} targets missing node ${String(target)}.`
      );
    }
  }

  return byId;
}
