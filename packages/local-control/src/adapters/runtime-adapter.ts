import type { JsonObject } from "../contracts.js";
import type { RuntimeRegistration } from "../registry.js";

function readNestedString(
  input: unknown,
  path: readonly string[],
): string | null {
  let current: unknown = input;
  for (const segment of path) {
    if (current === null || typeof current !== "object" || Array.isArray(current)) {
      return null;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return typeof current === "string" ? current : null;
}

export async function readRuntimeStatus(
  runtime: RuntimeRegistration,
  timeoutMs: number,
): Promise<JsonObject> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  timer.unref();
  try {
    const response = await fetch(runtime.healthUrl, {
      method: "GET",
      headers: { accept: "application/json" },
      redirect: "error",
      signal: controller.signal,
    });
    const contentType = response.headers.get("content-type") ?? "";
    let body: unknown = null;
    if (contentType.includes("application/json")) {
      const text = await response.text();
      if (text.length <= 16_384) {
        try {
          body = JSON.parse(text);
        } catch {
          body = null;
        }
      }
    }
    const healthy = response.ok;
    return {
      runtime_ref: runtime.runtimeRef,
      runtime_type: runtime.runtimeType,
      availability: healthy ? "AVAILABLE" : "UNAVAILABLE",
      lifecycle_state: healthy ? "RUNNING" : "UNKNOWN",
      health_state: healthy ? "HEALTHY" : "UNHEALTHY",
      version:
        readNestedString(body, ["data", "version"]) ??
        readNestedString(body, ["version"]),
      pid: null,
      endpoint_state: healthy ? "REACHABLE" : "UNHEALTHY_RESPONSE",
      recent_error_summary: healthy
        ? null
        : `Health probe returned HTTP ${response.status}.`,
      observed_at: new Date().toISOString(),
    };
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    return {
      runtime_ref: runtime.runtimeRef,
      runtime_type: runtime.runtimeType,
      availability: "UNAVAILABLE",
      lifecycle_state: "STOPPED_OR_UNREACHABLE",
      health_state: "UNKNOWN",
      version: null,
      pid: null,
      endpoint_state: timedOut ? "TIMEOUT" : "UNREACHABLE",
      recent_error_summary: timedOut
        ? "Health probe timed out."
        : "Health probe is unreachable.",
      observed_at: new Date().toISOString(),
    };
  } finally {
    clearTimeout(timer);
  }
}
