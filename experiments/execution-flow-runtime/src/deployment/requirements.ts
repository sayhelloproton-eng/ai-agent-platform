import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type DeploymentDependencyRequirement = {
  id: string;
  kind: string;
  logical_ref: string;
  required: boolean;
  required_when?: string;
  constraints?: Record<string, unknown>;
  candidate_sources: Array<Record<string, unknown>>;
  verify: Record<string, unknown>;
  config_keys: string[];
};

export type DeploymentRequirements = {
  contract: "aap.deployment.requirements.v0";
  module: {
    id: string;
    package: string;
    version: string;
    deployment_unit: "service";
  };
  runtime_requirements: Array<Record<string, unknown>>;
  dependencies: DeploymentDependencyRequirement[];
  resources: Record<string, unknown>;
  config_slots: Array<Record<string, unknown>>;
  provides: Array<Record<string, unknown>>;
  lifecycle: Record<string, unknown>;
  effects: Record<string, unknown>;
  invariants: string[];
};

const PACKAGE_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  ".."
);

function packageVersion(): string {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(PACKAGE_ROOT, "package.json"), "utf8")
  ) as { version?: unknown };
  if (typeof packageJson.version !== "string" || packageJson.version.length === 0) {
    throw new Error("package.json version is missing or invalid.");
  }
  return packageJson.version;
}

/**
 * Read-only module deployment descriptor.
 *
 * This describes facts needed by a platform-level Deployment Planner. It does
 * not choose topology, resolve other modules, ask for confirmation, write
 * configuration, create Runtime Home, start processes, or apply deployment.
 */
export function getDeploymentRequirements(): DeploymentRequirements {
  return {
    contract: "aap.deployment.requirements.v0",
    module: {
      id: "execution-flow-runtime",
      package: "@ai-agent-platform/execution-flow-runtime",
      version: packageVersion(),
      deployment_unit: "service",
    },
    runtime_requirements: [
      {
        id: "node-runtime",
        kind: "runtime",
        required: true,
        constraints: { semver: ">=20 <21" },
        candidate_sources: [
          { type: "command", command: "node --version" },
          { type: "process", field: "process.versions.node" },
        ],
        verify: { type: "semver", constraint: ">=20 <21" },
      },
    ],
    dependencies: [
      {
        id: "inference-backend",
        kind: "inference_backend",
        logical_ref: "inference.backend",
        required: false,
        required_when: "selected ExecutionFlows contain inference nodes",
        constraints: {
          roles: ["fast", "reason"],
          provider_lane: "serial",
          max_concurrency: 1,
          role_switching: "serial",
          fast_semantics: "direct bounded judgement / no-think role",
          reason_semantics: "bounded escalation / reasoning role",
        },
        candidate_sources: [
          {
            type: "runtime_config",
            adapter: "mlxhub",
            keys: [
              "inference.mlxhub.base_url",
              "inference.mlxhub.roles.fast.model",
              "inference.mlxhub.roles.reason.model",
            ],
          },
          {
            type: "provider_registry",
            capability: "inference.backend",
            future: true,
          },
        ],
        verify: {
          type: "adapter_defined_probe",
          adapter: "mlxhub",
          checks: [
            { method: "GET", path: "/health", expected: "2xx" },
            {
              method: "GET",
              path: "/v1/models",
              must_contain_configured_roles: ["fast", "reason"],
            },
          ],
        },
        config_keys: [
          "inference.mlxhub.base_url",
          "inference.mlxhub.timeout_ms",
          "inference.mlxhub.roles.fast.model",
          "inference.mlxhub.roles.fast.max_tokens",
          "inference.mlxhub.roles.reason.model",
          "inference.mlxhub.roles.reason.max_tokens",
        ],
      },
    ],
    resources: {
      runtime_home: {
        required: true,
        logical_ref: "runtime.home",
        config_source: "EXECUTION_FLOW_RUNTIME_HOME or platform-injected value",
        default_candidate: "~/.ai-agent-platform/execution-flow-runtime",
        verify: ["parent writable", "module owns state/lock/log/config files"],
      },
      listener: {
        required: true,
        protocol: "http",
        config_keys: ["host", "port"],
        current_constraints: {
          host: "loopback-only while caller authentication is deferred",
          single_managed_service_per_runtime_home: true,
        },
        verify: ["host constraint", "port bindable", "health identity after start"],
      },
      workspace: {
        required: true,
        logical_ref: "workspace.root",
        config_key: "workspace_root",
        verify: ["directory exists", "capability-specific scope checks"],
      },
      storage: {
        type: "filesystem",
        paths_relative_to_runtime_home: [
          "config.json",
          "runtime.json",
          "runtime.lock",
          "runtime.log",
        ],
      },
    },
    config_slots: [
      {
        key: "host",
        required: true,
        type: "string",
        default_candidate: "127.0.0.1",
        constraints: ["loopback-only-currently"],
      },
      {
        key: "port",
        required: true,
        type: "integer",
        default_candidate: 43170,
        constraints: ["positive", "available"],
      },
      {
        key: "workspace_root",
        required: true,
        type: "filesystem-directory",
      },
      {
        key: "max_node_runs",
        required: true,
        type: "positive-integer",
        default_candidate: 16,
      },
      {
        key: "inference.mlxhub",
        required: false,
        type: "adapter-config",
        required_when: "MLXHub is selected to satisfy inference.backend",
      },
    ],
    provides: [
      {
        logical_ref: "execution-flow.runtime",
        kind: "http_service",
        protocol: "execution-flow HTTP v0",
        endpoints: [
          "GET /health",
          "GET /v1/runtime",
          "GET /v1/capabilities",
          "GET /v1/inference-backends",
          "POST /v1/executions",
        ],
      },
    ],
    lifecycle: {
      cli: "aap-execution-flow",
      status: "aap-execution-flow status --json",
      start: "aap-execution-flow start --json",
      stop: "aap-execution-flow stop --json",
      restart: "aap-execution-flow restart --json",
      doctor: "aap-execution-flow doctor --json",
      health: {
        endpoint: "GET /health",
        identity_field: "instance_id",
      },
      singleton_scope: "runtime_home",
      stop_identity_rule: "never signal an unverified PID",
    },
    effects: {
      planner_note:
        "This descriptor declares potential deployment effects only. The module does not apply them from this command.",
      filesystem: [
        "runtime-home/config.json",
        "runtime-home/runtime.json",
        "runtime-home/runtime.lock",
        "runtime-home/runtime.log",
      ],
      process: ["one managed Execution Flow Runtime service per runtime home"],
      network: ["one configured HTTP listener"],
      repository_source_modification: false,
    },
    invariants: [
      "deployment requirements is read-only and has zero deployment side effects",
      "the module does not choose platform topology or resolve other modules",
      "the module does not own platform-level user confirmation or deployment apply",
      "Flow specifications contain logical refs, not physical deployment addresses",
      "external dependencies resolve through runtime-owned config and composition roots",
      "MLXHub FAST and REASON share one FIFO serial inference lane with max concurrency 1",
      "REASON escalation receives explicit Flow-projected context; Runtime does not inject hidden global state",
    ],
  };
}
