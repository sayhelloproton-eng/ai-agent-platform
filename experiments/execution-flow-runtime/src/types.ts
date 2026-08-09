export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export type JsonSchema = {
  type?: string | string[];
  const?: JsonValue;
  enum?: JsonValue[];
  minLength?: number;
  pattern?: string;
  minimum?: number;
  maximum?: number;
  items?: JsonSchema;
  required?: string[];
  properties?: Record<string, JsonSchema>;
  additionalProperties?: boolean;
};

export type ExecutionProfile = "standard" | "reasoning";

export interface ExecutionAuthorization {
  allowed_capabilities: string[];
}

export interface ExecutionRun {
  contract: "execution.run.v0";
  execution_id: string;
  flow: ExecutionFlow;
  inputs: Record<string, unknown>;
  authorization: ExecutionAuthorization;
  max_node_runs?: number;
  correlation?: Record<string, unknown>;
}

export interface ExecutionFlow {
  contract: "execution.flow.v0";
  flow_id: string;
  version: number;
  entry_node: string;
  nodes: ExecutionNode[];
}

export type ExecutionNode = ActionNode | InferenceNode | SwitchNode | ReturnNode;

export interface BaseNode {
  id: string;
  type: "action" | "inference" | "switch" | "return";
}

export interface ActionNode extends BaseNode {
  type: "action";
  capability: string;
  arguments: unknown;
  next: string;
}

export interface InferenceNode extends BaseNode {
  type: "inference";
  backend: string;
  profile: ExecutionProfile;
  instruction: string;
  input: unknown;
  output_schema: JsonSchema;
  next: string;
}

export interface SwitchNode extends BaseNode {
  type: "switch";
  select: string;
  cases: Record<string, string>;
  default: string;
}

export interface ReturnNode extends BaseNode {
  type: "return";
  output: unknown;
}

export interface ExecutionNodeRun {
  node_id: string;
  type: ExecutionNode["type"];
  status: "completed";
  duration_ms: number;
  output: unknown;
  metadata?: Record<string, unknown>;
}

export interface ExecutionEvidence {
  type: "capability-result" | "inference-result";
  node_id: string;
  capability?: string;
  backend?: string;
  profile?: ExecutionProfile;
  output: unknown;
  metadata?: Record<string, unknown>;
}

export interface ExecutionFailure {
  code: string;
  message: string;
  details?: unknown;
}

export interface ExecutionResult {
  contract: "execution.result.v0";
  execution_id: string;
  status: "completed" | "blocked" | "failed";
  output: unknown;
  node_runs: ExecutionNodeRun[];
  evidence: ExecutionEvidence[];
  error: ExecutionFailure | null;
  correlation: Record<string, unknown>;
}

export interface CapabilityDescriptor {
  contract: "execution.capability.v0";
  name: string;
  description: string;
  effects: "read" | "write" | "process" | "network" | "browser" | "mixed" | "other";
  input_schema: JsonSchema;
}

export interface CapabilityInvocationContext {
  execution_id: string;
  flow_id: string;
  node_id: string;
  authorization: ExecutionAuthorization;
}

export type CapabilityHandler = (
  args: Record<string, unknown>,
  context: CapabilityInvocationContext
) => Promise<unknown>;

export interface InferenceRequest {
  profile: ExecutionProfile;
  instruction: string;
  input: unknown;
  output_schema: JsonSchema;
  execution_id: string;
  flow_id: string;
  node_id: string;
}

export interface InferenceResponse {
  output: unknown;
  metadata?: Record<string, unknown>;
}

export interface InferenceBackend {
  infer(request: InferenceRequest): Promise<InferenceResponse>;
}

export interface FixedCommandDefinition {
  executable: string;
  args: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}

export interface RuntimeConfig {
  host: string;
  port: number;
  workspace_root: string;
  max_node_runs: number;
}

export interface RuntimeState {
  instance_id: string;
  pid: number;
  host: string;
  port: number;
  started_at: string;
}
