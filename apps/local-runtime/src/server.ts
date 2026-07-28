import { createRuntimeServer } from "./app.js";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 8790;
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

function resolveHost(input: string | undefined): string {
  const host = input ?? DEFAULT_HOST;
  if (!LOOPBACK_HOSTS.has(host)) {
    throw new Error("Host must be a loopback address.");
  }

  return host;
}

function resolvePort(input: string | undefined): number {
  if (input === undefined) {
    return DEFAULT_PORT;
  }

  if (!/^\d+$/.test(input)) {
    throw new Error("Port must be an integer between 1 and 65535.");
  }

  const port = Number(input);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    throw new Error("Port must be an integer between 1 and 65535.");
  }

  return port;
}

try {
  const host = resolveHost(process.env.LOCAL_RUNTIME_HOST);
  const port = resolvePort(process.env.LOCAL_RUNTIME_PORT);
  const server = createRuntimeServer();

  server.once("error", () => {
    console.error("Local Runtime failed to start.");
    process.exitCode = 1;
  });

  server.listen(port, host, () => {
    console.log(`Local Runtime listening on http://${host}:${port}`);
  });
} catch (error: unknown) {
  const message =
    error instanceof Error ? error.message : "Invalid server configuration.";
  console.error(`Local Runtime failed to start: ${message}`);
  process.exitCode = 1;
}
