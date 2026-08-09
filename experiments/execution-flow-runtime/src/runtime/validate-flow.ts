import { ExecutionFlowError } from "./errors.js";
import {
  assertValidJsonSchema,
  validatePublishedSchema,
} from "./schema.js";
import type { ExecutionFlow, ExecutionNode, ExecutionRun } from "../types.js";

export function validateExecutionRun(run: ExecutionRun): Map<string, ExecutionNode> {
  validatePublishedSchema("execution-run", run, "INVALID_RUN");
  return validateFlow(run.flow);
}

export function validateFlow(flow: ExecutionFlow): Map<string, ExecutionNode> {
  validatePublishedSchema("execution-flow", flow, "INVALID_FLOW");

  const byId = new Map<string, ExecutionNode>();
  for (const node of flow.nodes) {
    if (byId.has(node.id)) {
      throw new ExecutionFlowError("INVALID_FLOW", `Duplicate node id: ${node.id}`);
    }
    byId.set(node.id, node);

    if (node.type === "inference") {
      assertValidJsonSchema(node.output_schema, `${node.id}.output_schema`);
    }
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
      targets.push([node.id, node.next]);
    } else if (node.type === "switch") {
      for (const target of Object.values(node.cases)) targets.push([node.id, target]);
      targets.push([node.id, node.default]);
    }
  }

  for (const [from, target] of targets) {
    if (!byId.has(target)) {
      throw new ExecutionFlowError(
        "INVALID_FLOW",
        `Node ${from} targets missing node ${target}.`
      );
    }
  }

  return byId;
}
