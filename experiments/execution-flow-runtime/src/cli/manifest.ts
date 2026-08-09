export interface CliCommandDescriptor {
  command: string;
  purpose: string;
  usage: string;
  side_effect: "none" | "filesystem" | "process";
  machine_output: boolean;
}

export function getCliManifest() {
  const commands: CliCommandDescriptor[] = [
    {
      command: "install",
      purpose: "Initialize runtime home and a default local config. It does not install the npm package.",
      usage: "aap-execution-flow install [--json]",
      side_effect: "filesystem",
      machine_output: true,
    },
    {
      command: "start",
      purpose: "Start the single managed local HTTP service in the background. Idempotent for the current runtime home.",
      usage: "aap-execution-flow start [--json]",
      side_effect: "process",
      machine_output: true,
    },
    {
      command: "serve",
      purpose: "Run the HTTP service in the foreground.",
      usage: "aap-execution-flow serve",
      side_effect: "process",
      machine_output: false,
    },
    {
      command: "stop",
      purpose: "Stop only a verified runtime PID. --force may SIGKILL only a verified runtime; an unverified PID is never killed.",
      usage: "aap-execution-flow stop [--force] [--json]",
      side_effect: "process",
      machine_output: true,
    },
    {
      command: "restart",
      purpose: "Stop then start the local service.",
      usage: "aap-execution-flow restart [--json]",
      side_effect: "process",
      machine_output: true,
    },
    {
      command: "status",
      purpose: "Report local service identity, PID and health.",
      usage: "aap-execution-flow status [--json]",
      side_effect: "none",
      machine_output: true,
    },
    {
      command: "doctor",
      purpose: "Check runtime home, config and optional inference-provider configuration.",
      usage: "aap-execution-flow doctor [--json]",
      side_effect: "none",
      machine_output: true,
    },
    {
      command: "run",
      purpose: "Execute one execution.run.v0 JSON file in-process with the current local runtime configuration.",
      usage: "aap-execution-flow run --file <execution-run.json> [--json]",
      side_effect: "process",
      machine_output: true,
    },
    {
      command: "validate",
      purpose: "Validate one execution.run.v0 JSON file without executing it.",
      usage: "aap-execution-flow validate --file <execution-run.json> [--json]",
      side_effect: "none",
      machine_output: true,
    },
    {
      command: "capabilities",
      purpose: "List capabilities exposed by the local runtime environment.",
      usage: "aap-execution-flow capabilities [--json]",
      side_effect: "none",
      machine_output: true,
    },
    {
      command: "providers",
      purpose: "List inference backends that are currently configured.",
      usage: "aap-execution-flow providers [--json]",
      side_effect: "none",
      machine_output: true,
    },
    {
      command: "docs",
      purpose: "Print one module documentation topic from the package itself.",
      usage: "aap-execution-flow docs [list|protocol|security|integration|cli|ai] [--json]",
      side_effect: "none",
      machine_output: true,
    },
    {
      command: "spec",
      purpose: "List or print a public JSON Schema bundled with the module.",
      usage: "aap-execution-flow spec [list|template-value|execution-run|execution-flow|execution-result|capability|inference-node] [--json]",
      side_effect: "none",
      machine_output: true,
    },
    {
      command: "describe",
      purpose: "Return the complete machine-readable CLI contract for humans and AI agents.",
      usage: "aap-execution-flow describe [--json]",
      side_effect: "none",
      machine_output: true,
    },
  ];

  return {
    contract: "execution.cli.v0",
    package: "@ai-agent-platform/execution-flow-runtime",
    binary: "aap-execution-flow",
    source_entry: "index.ts",
    source_language: "TypeScript",
    compatibility_mode: "source-only-lab",
    commands,
    service_api: {
      base_default: "http://127.0.0.1:43170",
      endpoints: [
        "GET /health",
        "GET /v1/runtime",
        "GET /v1/capabilities",
        "POST /v1/executions",
      ],
    },
    invariants: [
      "The runtime consumes execution-flow protocol, not task-domain semantics.",
      "There is one managed runtime service per runtime home; inference backends are pluggable providers inside it.",
      "Published JSON Schemas are the validation source of truth for runtime and CLI.",
      "Bindings use explicit {$ref: ...} objects; plain strings are never implicit bindings.",
      "Inference nodes cannot directly execute host commands or files.",
      "Action nodes invoke only registered capabilities.",
      "Fixed-command capability uses opaque command_ref and shell=false.",
      "File read is rooted, relative-path only and blocks traversal/symlink/protected-path escape.",
      "Command timeout/output-limit failures terminate the child process before returning.",
      "stop never kills an unverified PID.",
      "Flow transitions are defined by the flow specification, not invented by the model.",
    ],
  };
}
