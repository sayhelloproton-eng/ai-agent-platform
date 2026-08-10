import { ExecutionFlowError } from "../runtime/errors.js";
import { SerialPromiseScheduler } from "./serial-scheduler.js";
import type {
  InferenceBackend,
  InferenceRequest,
  InferenceResponse,
  JsonSchema,
} from "../types.js";

export interface MlxHubInferenceBackendOptions {
  baseUrl: string;
  fastModel: string;
  reasonModel: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  apiKey?: string;
  fastMaxTokens?: number;
  reasonMaxTokens?: number;
}

function stripThinking(content: string): string {
  const trimmed = content.trim();
  if (!trimmed.startsWith("<think>")) return trimmed;

  const end = trimmed.indexOf("</think>");
  if (end < 0) {
    throw new ExecutionFlowError(
      "INFERENCE_THINK_UNCLOSED",
      "Reason-role output contained an unclosed <think> block."
    );
  }
  return trimmed.slice(end + "</think>".length).trim();
}

function extractJson(text: string): unknown {
  const cleaned = stripThinking(text);

  try {
    return JSON.parse(cleaned);
  } catch {
    // bounded fallback: one outer JSON object only
  }

  const firstObject = cleaned.indexOf("{");
  const lastObject = cleaned.lastIndexOf("}");
  if (firstObject >= 0 && lastObject > firstObject) {
    try {
      return JSON.parse(cleaned.slice(firstObject, lastObject + 1));
    } catch {
      // fall through
    }
  }

  throw new ExecutionFlowError(
    "INFERENCE_INVALID_JSON",
    "Inference backend did not return parseable JSON."
  );
}

function compileSystemPrompt(role: "fast" | "reason", outputSchema: JsonSchema): string {
  const roleRule =
    role === "fast"
      ? "You are the FAST bounded judgement role: make a direct structured judgement from the supplied context; do not invent extra work."
      : "You are the REASON bounded escalation role: resolve the supplied uncertainty, conflict or ambiguity and return only the final structured judgement.";

  return [
    "You are one bounded inference node inside an execution-flow runtime.",
    roleRule,
    "You do not own the flow and you do not decide which tool exists.",
    "You do not execute commands or files directly.",
    "Use only the supplied instruction and input.",
    "Return exactly one JSON object matching OUTPUT_SCHEMA.",
    "Do not add markdown or prose outside that JSON object.",
    `OUTPUT_SCHEMA=${JSON.stringify(outputSchema)}`,
  ].join("\n");
}

function classifyProviderError(providerCode: string, status: number): string {
  const normalized = providerCode.toLowerCase();
  if (normalized === "server_paused" || status >= 500) {
    return "INFERENCE_PROVIDER_UNAVAILABLE";
  }
  if (normalized === "model_busy" || status === 429) {
    return "INFERENCE_PROVIDER_BUSY";
  }
  return "INFERENCE_PROVIDER_ERROR";
}

export class MlxHubInferenceBackend implements InferenceBackend {
  readonly #scheduler = new SerialPromiseScheduler();

  readonly baseUrl: string;
  readonly fastModel: string;
  readonly reasonModel: string;
  readonly fetchImpl: typeof fetch;
  readonly timeoutMs: number;
  readonly apiKey?: string;
  readonly fastMaxTokens: number;
  readonly reasonMaxTokens?: number;

  constructor({
    baseUrl,
    fastModel,
    reasonModel,
    fetchImpl = fetch,
    timeoutMs = 120_000,
    apiKey,
    fastMaxTokens = 1024,
    reasonMaxTokens,
  }: MlxHubInferenceBackendOptions) {
    if (!baseUrl || !fastModel || !reasonModel) {
      throw new ExecutionFlowError(
        "INVALID_MLXHUB_CONFIG",
        "baseUrl, fastModel and reasonModel are required."
      );
    }

    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.fastModel = fastModel;
    this.reasonModel = reasonModel;
    this.fetchImpl = fetchImpl;
    this.timeoutMs = timeoutMs;
    this.fastMaxTokens = fastMaxTokens;
    if (reasonMaxTokens !== undefined) {
      this.reasonMaxTokens = reasonMaxTokens;
    }
    if (apiKey) this.apiKey = apiKey;
  }

  infer(request: InferenceRequest): Promise<InferenceResponse> {
    return this.#scheduler.enqueue(() => this.#inferOnce(request));
  }

  async #inferOnce(request: InferenceRequest): Promise<InferenceResponse> {
    const model =
      request.role === "reason"
        ? this.reasonModel
        : this.fastModel;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    const started = Date.now();

    try {
      const requestBody: Record<string, unknown> = {
        model,
        stream: false,
        temperature: request.role === "reason" ? 0.2 : 0.4,
        top_p: 0.8,
        messages: [
          {
            role: "system",
            content: compileSystemPrompt(request.role, request.output_schema),
          },
          {
            role: "user",
            content: JSON.stringify({
              instruction: request.instruction,
              input: request.input,
            }),
          },
        ],
      };

      if (request.role === "reason") {
        if (this.reasonMaxTokens !== undefined) {
          requestBody.max_tokens = this.reasonMaxTokens;
        }
      } else {
        requestBody.max_tokens = this.fastMaxTokens;
      }

      const response = await this.fetchImpl(
        `${this.baseUrl}/v1/chat/completions`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...(this.apiKey
              ? { authorization: `Bearer ${this.apiKey}` }
              : {}),
          },
          signal: controller.signal,
          body: JSON.stringify(requestBody),
        }
      );

      const body = (await response.json().catch(() => undefined)) as
        | {
            error?: { code?: string; message?: string };
            choices?: Array<{ message?: { content?: string } }>;
          }
        | undefined;

      if (!response.ok) {
        const providerCode = body?.error?.code ?? `HTTP_${response.status}`;
        const message =
          body?.error?.message ??
          `MLXHub request failed with HTTP ${response.status}.`;
        throw new ExecutionFlowError(
          classifyProviderError(providerCode, response.status),
          message,
          {
            provider: "mlxhub",
            provider_code: providerCode,
            http_status: response.status,
            model,
            role: request.role,
            retryable:
              response.status === 429 ||
              response.status >= 500 ||
              providerCode === "server_paused" ||
              providerCode === "model_busy",
          }
        );
      }

      const content = body?.choices?.[0]?.message?.content;
      if (typeof content !== "string") {
        throw new ExecutionFlowError(
          "INFERENCE_EMPTY_RESPONSE",
          "MLXHub response did not contain assistant content."
        );
      }

      return {
        output: extractJson(content),
        metadata: {
          provider: "mlxhub",
          role: request.role,
          model,
          latency_ms: Date.now() - started,
        },
      };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new ExecutionFlowError(
          "INFERENCE_TIMEOUT",
          `MLXHub inference exceeded ${this.timeoutMs} ms.`,
          {
            provider: "mlxhub",
            model,
            role: request.role,
            timeout_ms: this.timeoutMs,
            retryable: true,
          }
        );
      }
      if (error instanceof ExecutionFlowError) {
        throw error;
      }
      throw new ExecutionFlowError(
        "INFERENCE_PROVIDER_UNREACHABLE",
        error instanceof Error ? error.message : String(error),
        {
          provider: "mlxhub",
          model,
          role: request.role,
          retryable: true,
        }
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
