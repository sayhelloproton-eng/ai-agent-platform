export interface CliCommandDescriptor {
  command: string;
  purpose: string;
  usage: string;
  side_effect: "none" | "filesystem" | "process";
  machine_output: boolean;
}

export function getCliManifest() {
  const commands: CliCommandDescriptor[] = [
    { command: "deployment", purpose: "Return this module's read-only deployment requirements descriptor for platform-level aggregation. It never resolves topology or applies deployment.", usage: "aap-execution-flow deployment requirements [--json]", side_effect: "none", machine_output: true },
    { command: "config", purpose: "Read or persist runtime-owned provider configuration. Configuration is an operational primitive consumed after platform-level deployment resolution; this command is not a deployment planner.", usage: "aap-execution-flow config [show | mlxhub set | mlxhub clear] [options] [--json]", side_effect: "filesystem", machine_output: true },
    { command: "start", purpose: "Start the single managed local HTTP service in the background from already-provisioned runtime config. Idempotent for the current runtime home.", usage: "aap-execution-flow start [--json]", side_effect: "process", machine_output: true },
    { command: "serve", purpose: "Run the HTTP service in the foreground from already-provisioned runtime config.", usage: "aap-execution-flow serve", side_effect: "process", machine_output: false },
    { command: "stop", purpose: "Stop only a verified runtime PID. --force may SIGKILL only a verified runtime; an unverified PID is never killed.", usage: "aap-execution-flow stop [--force] [--json]", side_effect: "process", machine_output: true },
    { command: "restart", purpose: "Stop then start the local service from already-provisioned runtime config.", usage: "aap-execution-flow restart [--json]", side_effect: "process", machine_output: true },
    { command: "status", purpose: "Report local service identity, PID and health.", usage: "aap-execution-flow status [--json]", side_effect: "none", machine_output: true },
    { command: "doctor", purpose: "Check runtime home, config and optional inference-provider configuration.", usage: "aap-execution-flow doctor [--json]", side_effect: "none", machine_output: true },
    { command: "run", purpose: "Submit one execution.run.v0 JSON file to the single managed runtime service.", usage: "aap-execution-flow run --file <execution-run.json> [--json]", side_effect: "process", machine_output: true },
    { command: "validate", purpose: "Validate one execution.run.v0 JSON file without executing it.", usage: "aap-execution-flow validate --file <execution-run.json> [--json]", side_effect: "none", machine_output: true },
    { command: "capabilities", purpose: "List capabilities exposed by the running managed service.", usage: "aap-execution-flow capabilities [--json]", side_effect: "none", machine_output: true },
    { command: "providers", purpose: "List inference backends exposed by the running managed service.", usage: "aap-execution-flow providers [--json]", side_effect: "none", machine_output: true },
    { command: "docs", purpose: "Print one module documentation topic from the package itself.", usage: "aap-execution-flow docs [list|protocol|security|integration|cli|ai] [--json]", side_effect: "none", machine_output: true },
    { command: "spec", purpose: "List or print a public JSON Schema bundled with the module.", usage: "aap-execution-flow spec [list|template-value|execution-run|execution-flow|execution-result|capability|inference-node|deployment-requirements] [--json]", side_effect: "none", machine_output: true },
    { command: "describe", purpose: "Return the complete machine-readable CLI contract for humans and AI agents.", usage: "aap-execution-flow describe [--json]", side_effect: "none", machine_output: true },
  ];

  return {
    contract: "execution.cli.v0",
    package: "@ai-agent-platform/execution-flow-runtime",
    binary: "aap-execution-flow",
    source_entry: "index.ts",
    source_language: "TypeScript",
    compatibility_mode: "source-only-lab",
    deployment_requirements_contract: "aap.deployment.requirements.v0",
    deployment_requirements_command: "aap-execution-flow deployment requirements --json",
    platform_deployment_model: "module requirements -> platform aggregate/dependency graph -> dynamic INSTALL.md -> AI/user confirmation -> platform apply -> health/acceptance",
    commands,
    service_api: {
      base_default: "http://127.0.0.1:43170",
      endpoints: ["GET /health", "GET /v1/runtime", "GET /v1/capabilities", "GET /v1/inference-backends", "POST /v1/executions"],
    },
    invariants: [
      "The runtime consumes execution-flow protocol, not task-domain semantics.",
      "There is one managed runtime service per runtime home; normal CLI execution submits to that service instead of starting a second in-process runtime.",
      "The module does not deploy itself: deployment requirements is read-only, while topology, dynamic INSTALL.md generation, confirmation and apply belong to a platform-level Deployment Planner/Executor.",
      "External deployment dependencies resolve from runtime-owned configuration/composition roots; Flow specifications do not contain physical endpoints, executables, or other-module source paths.",
      "MLXHub FAST and REASON share one FIFO serial provider lane (concurrency=1); failed inference jobs must not poison subsequent queued jobs.",
      "Inference backends are pluggable providers inside the service.",
      "Inference nodes use semantic roles fast|reason; the concrete model mapping belongs to the provider config.",
      "FAST-to-REASON escalation is explicit Flow topology: FAST emits structured data, switch owns the branch, and REASON is a separate inference node with explicitly projected context.",
      "Published JSON Schemas are the validation source of truth for runtime and CLI.",
      "Bindings use explicit {$ref: ...} objects; plain strings are never implicit bindings.",
      "Inference nodes cannot directly execute host commands or files.",
      "Action nodes invoke only registered capabilities.",
      "Fixed-command capability uses opaque command_ref and shell=false.",
      "Provider configuration is runtime-owned persisted config; command execution definitions are runtime-owned, not model-generated shell.",
      "File read is rooted, relative-path only and blocks traversal/symlink/protected-path escape.",
      "Command timeout/output-limit failures terminate the child process before returning.",
      "stop never kills an unverified PID.",
      "Flow transitions are defined by the flow specification, not invented by the model.",
      "Production-shaped flows may compose rooted read -> FAST -> switch -> fixed command_ref -> readback -> FAST verification -> optional Flow-owned REASON escalation without changing Runtime Core.",
      "POST /v1/executions returns execution.result.v0 over HTTP 200 for completed/blocked/failed application results; transport 4xx is reserved for malformed/undefined HTTP requests.",
      "CLI run does not impose an independent fixed execution transport timeout; backend/capability bounds remain authoritative and v0 client interruption is not remote cancellation.",
    ],
  };
}
