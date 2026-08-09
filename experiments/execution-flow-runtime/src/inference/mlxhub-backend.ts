import { ExecutionFlowError } from "../runtime/errors.js";
import type {
  InferenceBackend,
  InferenceRequest,
  InferenceResponse,
  JsonSchema,
} from "../types.js";

export interface MlxHubInferenceBackendOptions {
  baseUrl: string;
  standardModel: string;
  reasoningModel: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  apiKey?: string;
  standardMaxTokens?: number;
  reasoningMaxTokens?: number;
}

function stripThinking(content: string): string {
  const trimmed = content.trim();
  if (!trimmed.startsWith("<think>")) return trimmed;

  const end = trimmed.indexOf("</think>");
  if (end < 0) {
    throw new ExecutionFlowError(
      "INFERENCE_THINK_UNCLOSED",
      "Reasoning output contained an unclosed <think> block."
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

function compileSystemPrompt(outputSchema: JsonSchema): string {
  return [
    "You are one bounded inference node inside an execution-flow runtime.",
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
  #queue: Promise<void> = Promise.resolve();

  readonly baseUrl: string;
  readonly standardModel: string;
  readonly reasoningModel: string;
  readonly fetchImpl: typeof fetch;
  readonly timeoutMs: number;
  readonly apiKey?: string;
  readonly standardMaxTokens: number;
  readonly reasoningMaxTokens?: number;

  constructor({
    baseUrl,
    standardModel,
    reasoningModel,
    fetchImpl = fetch,
    timeoutMs = 120_000,
    apiKey,
    standardMaxTokens = 1024,
    reasoningMaxTokens,
  }: MlxHubInferenceBackendOptions) {
    if (!baseUrl || !standardModel || !reasoningModel) {
      throw new ExecutionFlowError(
        "INVALID_MLXHUB_CONFIG",
        "baseUrl, standardModel and reasoningModel are required."
      );
    }

    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.standardModel = standardModel;
    this.reasoningModel = reasoningModel;
    this.fetchImpl = fetchImpl;
    this.timeoutMs = timeoutMs;
    this.standardMaxTokens = standardMaxTokens;
    if (reasoningMaxTokens !== undefined) {
      this.reasoningMaxTokens = reasoningMaxTokens;
    }
    if (apiKey) this.apiKey = apiKey;
  }

  infer(request: InferenceRequest): Promise<InferenceResponse> {
    const operation = this.#queue.then(() => this.#inferOnce(request));
    this.#queue = operation.then(() => undefined, () => undefined);
    return operation;
  }

  async #inferOnce(request: InferenceRequest): Promise<InferenceResponse> {
    const model =
      request.profile === "reasoning"
        ? this.reasoningModel
        : this.standardModel;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    const started = Date.now();

    try {
      const requestBody: Record<string, unknown> = {
        model,
        stream: false,
        temperature: request.profile === "reasoning" ? 0.2 : 0.4,
        top_p: 0.8,
        messages: [
          {
            role: "system",
            content: compileSystemPrompt(request.output_schema),
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

      if (request.profile === "reasoning") {
        if (this.reasoningMaxTokens !== undefined) {
          requestBody.max_tokens = this.reasoningMaxTokens;
        }
      } else {
        requestBody.max_tokens = this.standardMaxTokens;
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
            profile: request.profile,
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
          profile: request.profile,
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
            profile: request.profile,
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
          profile: request.profile,
          retryable: true,
        }
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
