import { ExecutionFlowError } from "./errors.js";
import { resolveBinding } from "./bindings.js";
import { validateExecutionRun } from "./validate-flow.js";
import { validateValueAgainstSchema } from "./schema-lite.js";
import type {
  ExecutionEvidence,
  ExecutionFailure,
  ExecutionNodeRun,
  ExecutionResult,
  ExecutionRun,
} from "../types.js";
import type { CapabilityRegistry } from "../capabilities/registry.js";
import type { InferenceBackendRegistry } from "../inference/registry.js";

export interface RunExecutionFlowDependencies {
  capabilities: CapabilityRegistry;
  inferenceBackends: InferenceBackendRegistry;
}

function safeError(error: unknown): ExecutionFailure {
  if (error instanceof ExecutionFlowError) {
    return {
      code: error.code,
      message: error.message,
      ...(error.details === undefined ? {} : { details: error.details }),
    };
  }

  return {
    code: "INTERNAL_ERROR",
    message: error instanceof Error ? error.message : String(error),
  };
}

export async function runExecutionFlow(
  run: ExecutionRun,
  { capabilities, inferenceBackends }: RunExecutionFlowDependencies
): Promise<ExecutionResult> {
  const nodeRuns: ExecutionNodeRun[] = [];
  const evidence: ExecutionEvidence[] = [];
  const correlation =
    run?.correlation && typeof run.correlation === "object"
      ? structuredClone(run.correlation)
      : {};

  try {
    const byId = validateExecutionRun(run);
    const maxNodeRuns =
      run.max_node_runs ?? Math.max(run.flow.nodes.length + 2, 8);

    const steps: Record<string, { output: unknown; metadata: Record<string, unknown> }> = {};
    const context = {
      inputs: structuredClone(run.inputs),
      steps,
    };

    let currentId = run.flow.entry_node;

    while (true) {
      if (nodeRuns.length >= maxNodeRuns) {
        throw new ExecutionFlowError(
          "STEP_LIMIT",
          `Execution exceeded max_node_runs=${maxNodeRuns}.`
        );
      }

      const node = byId.get(currentId);
      if (!node) {
        throw new ExecutionFlowError(
          "NODE_NOT_FOUND",
          `Node not found during execution: ${currentId}`
        );
      }

      const started = Date.now();
      let output: unknown;
      let metadata: Record<string, unknown> = {};
      let nextId: string | undefined;

      if (node.type === "action") {
        const args = resolveBinding(node.arguments, context);
        if (!args || typeof args !== "object" || Array.isArray(args)) {
          throw new ExecutionFlowError(
            "INVALID_ARGUMENTS",
            `${node.id}.arguments must resolve to an object.`
          );
        }

        output = await capabilities.invoke(
          node.capability,
          args as Record<string, unknown>,
          {
            execution_id: run.execution_id,
            flow_id: run.flow.flow_id,
            node_id: node.id,
            authorization: run.authorization,
          }
        );
        nextId = node.next;
        metadata = { capability: node.capability };
        evidence.push({
          type: "capability-result",
          node_id: node.id,
          capability: node.capability,
          output: structuredClone(output),
        });
      } else if (node.type === "inference") {
        const input = resolveBinding(node.input, context);
        const inferred = await inferenceBackends.infer(node.backend, {
          profile: node.profile,
          instruction: node.instruction,
          input,
          output_schema: structuredClone(node.output_schema),
          execution_id: run.execution_id,
          flow_id: run.flow.flow_id,
          node_id: node.id,
        });

        validateValueAgainstSchema(
          inferred.output,
          node.output_schema,
          "$inference_output"
        );

        output = inferred.output;
        metadata = inferred.metadata ?? {};
        nextId = node.next;
        evidence.push({
          type: "inference-result",
          node_id: node.id,
          backend: node.backend,
          profile: node.profile,
          output: structuredClone(output),
          metadata: structuredClone(metadata),
        });
      } else if (node.type === "switch") {
        const selected = resolveBinding(node.select, context);
        const key = String(selected);
        nextId = Object.prototype.hasOwnProperty.call(node.cases, key)
          ? node.cases[key]
          : node.default;
        output = { selected, next_node: nextId };
      } else {
        output = resolveBinding(node.output, context);
        const nodeRun: ExecutionNodeRun = {
          node_id: node.id,
          type: node.type,
          status: "completed",
          duration_ms: Date.now() - started,
          output: structuredClone(output),
        };
        nodeRuns.push(nodeRun);
        steps[node.id] = { output: structuredClone(output), metadata: {} };

        return {
          contract: "execution.result.v0",
          execution_id: run.execution_id,
          status: "completed",
          output: structuredClone(output),
          node_runs: nodeRuns,
          evidence,
          error: null,
          correlation,
        };
      }

      const nodeRun: ExecutionNodeRun = {
        node_id: node.id,
        type: node.type,
        status: "completed",
        duration_ms: Date.now() - started,
        output: structuredClone(output),
        ...(Object.keys(metadata).length
          ? { metadata: structuredClone(metadata) }
          : {}),
      };

      nodeRuns.push(nodeRun);
      steps[node.id] = {
        output: structuredClone(output),
        metadata: structuredClone(metadata),
      };

      if (!nextId) {
        throw new ExecutionFlowError(
          "INVALID_FLOW",
          `Node ${node.id} did not resolve a next node.`
        );
      }
      currentId = nextId;
    }
  } catch (error) {
    const safe = safeError(error);
    return {
      contract: "execution.result.v0",
      execution_id: run?.execution_id ?? "unknown",
      status: safe.code === "APPROVAL_REQUIRED" ? "blocked" : "failed",
      output: null,
      node_runs: nodeRuns,
      evidence,
      error: safe,
      correlation,
    };
  }
}
