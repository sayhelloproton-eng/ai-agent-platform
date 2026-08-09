import {
  FAST_DEFAULT_PARAMS,
  MOB_NEXT_CONTRACT_VERSION,
  MOB_RESULT_CONTRACT_VERSION,
  MOBILE_INFERENCE_MODELS,
  REASON_DEFAULT_MAX_TOKENS,
  isMobRetryableError,
  type MobileInferenceResultKind,
  type MobInferenceResponseV1,
  type MobInferenceResultV1,
  type MobNextV1_2,
  type MobRuntimeErrorCode,
  type MobWorkPayloadV1,
  type MobileInferenceModelCategory,
} from "@ai-agent-platform/contracts";
import { createHash } from "node:crypto";

const MOB_INFERENCE_TIMEOUT_MS = 60_000;

function createShortHash(input: string): string {
  return createHash("sha256")
    .update(input, "utf8")
    .digest("hex")
    .slice(0, 16);
}

export interface MobileInferenceAdapterOptions {
  readonly baseUrl: string;
  readonly reasonMaxTokens?: number;
  readonly timeoutMs?: number;
  readonly workerId?: string;
}

export interface MobileInferenceAdapter {
  run(payload: MobWorkPayloadV1, context: {
    readonly workItemId: string;
    readonly taskId: string;
    readonly attempt: number;
  }): Promise<MobInferenceResultV1>;
}

function classifyError(err: unknown): {
  code: MobRuntimeErrorCode;
  message: string;
} {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes("model is busy") || msg.includes("busy")) {
      return { code: "model_busy", message: err.message };
    }
    if (msg.includes("server paused") || msg.includes("paused")) {
      return { code: "server_paused", message: err.message };
    }
    if (
      msg.includes("timeout") ||
      msg.includes("timed out") ||
      msg.includes("etimedout")
    ) {
      return { code: "timeout", message: err.message };
    }
    if (
      msg.includes("econnrefused") ||
      msg.includes("connection refused")
    ) {
      return { code: "connection_refused", message: err.message };
    }
    return { code: "unknown_error", message: err.message };
  }
  return {
    code: "unknown_error",
    message: String(err),
  };
}

function stripThinkTags(content: string): string {
  let result = content;
  const depthPattern = /<think[\s\S]*?<\/think>/gi;
  result = result.replace(depthPattern, "");
  return result.trim();
}

function extractMobNext(raw: string): MobNextV1_2 | null {
  try {
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed) &&
      parsed.contractVersion === MOB_NEXT_CONTRACT_VERSION
    ) {
      const next: Record<string, string> = {};
      const fields = ["continue", "ok", "bhr", "lcl", "controller"];
      for (const f of fields) {
        if (typeof parsed[f] === "string") {
          next[f] = parsed[f];
        } else {
          next[f] = "";
        }
      }
      return {
        contractVersion: MOB_NEXT_CONTRACT_VERSION,
        continue: next.continue || "",
        ok: next.ok || null,
        bhr: next.bhr || null,
        lcl: next.lcl || null,
        controller: next.controller || null,
      };
    }
  } catch {
    // Not valid JSON
  }
  return null;
}

function determineResultKind(
  content: string,
  mobNext: MobNextV1_2 | null,
): MobileInferenceResultKind {
  if (!mobNext) {
    if (
      content.includes("uncertain") ||
      content.includes("confidence") ||
      content.toLowerCase().includes("unsure")
    ) {
      return "uncertain";
    }
    if (
      content.includes("handoff") ||
      content.includes("transfer")
    ) {
      return "handoff";
    }
    return "ok";
  }

  if (mobNext.controller && mobNext.controller.trim().length > 0) {
    return "controller";
  }
  if (
    mobNext.continue &&
    mobNext.continue.trim().length > 0 &&
    mobNext.continue.toLowerCase().includes("handoff")
  ) {
    return "handoff";
  }
  if (
    mobNext.continue &&
    (mobNext.continue.toLowerCase().includes("uncertain") ||
      mobNext.continue.toLowerCase().includes("conflict"))
  ) {
    return "uncertain";
  }
  return "ok";
}

export function createMobileInferenceAdapter(
  options: MobileInferenceAdapterOptions,
): MobileInferenceAdapter {
  const baseUrl = options.baseUrl.replace(/\/$/, "");
  try {
    const parsed = new URL(baseUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new TypeError(
        `MOB base URL must use http or https protocol, got: ${parsed.protocol}`,
      );
    }
  } catch (err) {
    if (err instanceof TypeError && err.message.includes("MOB base URL")) throw err;
    throw new TypeError("MOB base URL must be a valid URL.");
  }

  const reasonMaxTokens =
    options.reasonMaxTokens ?? REASON_DEFAULT_MAX_TOKENS;
  const timeoutMs = options.timeoutMs ?? MOB_INFERENCE_TIMEOUT_MS;
  const workerId = options.workerId ?? "action-gateway-mob-adapter";

  async function callModel(
    modelCategory: MobileInferenceModelCategory,
    systemPrompt: string,
    userPrompt: string,
    temperature: number | undefined,
    topP: number | undefined,
    maxTokens: number | undefined,
  ): Promise<MobInferenceResponseV1> {
    const model =
      modelCategory === "FAST"
        ? MOBILE_INFERENCE_MODELS.FAST
        : MOBILE_INFERENCE_MODELS.REASON;

    const resolvedMaxTokens =
      maxTokens ??
      (modelCategory === "FAST"
        ? FAST_DEFAULT_PARAMS.max_tokens
        : reasonMaxTokens);
    const resolvedTemperature =
      temperature ??
      (modelCategory === "FAST" ? FAST_DEFAULT_PARAMS.temperature : undefined);
    const resolvedTopP =
      topP ??
      (modelCategory === "FAST" ? FAST_DEFAULT_PARAMS.top_p : undefined);

    const body: Record<string, unknown> = {
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: resolvedMaxTokens,
      stream: false,
    };

    if (resolvedTemperature !== undefined) {
      body.temperature = resolvedTemperature;
    }
    if (resolvedTopP !== undefined) {
      body.top_p = resolvedTopP;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(
          `MLXHub returned ${response.status}: ${errorText.slice(0, 256)}`,
        );
      }

      const data = (await response.json()) as Record<string, unknown>;

      const choices = data.choices as
        | Array<{ message?: { content?: string } }>
        | undefined;
      const message = choices?.[0]?.message;
      const content = message?.content;

      if (typeof content !== "string") {
        throw new Error("MLXHub response missing content");
      }

      const usage = data.usage as
        | { prompt_tokens?: number; completion_tokens?: number }
        | undefined;

      return {
        contractVersion: "1.0.0",
        model: modelCategory,
        content,
        usage: {
          prompt_tokens: usage?.prompt_tokens ?? 0,
          completion_tokens: usage?.completion_tokens ?? 0,
        },
      };
    } finally {
      clearTimeout(timer);
    }
  }

  return Object.freeze({
    async run(
      payload: MobWorkPayloadV1,
      context: {
        workItemId: string;
        taskId: string;
        attempt: number;
      },
    ): Promise<MobInferenceResultV1> {
      const resultRef = `mob-result:${createShortHash(
        `${context.workItemId}:${context.attempt}`,
      )}`;

      try {
        const response = await callModel(
          payload.modelCategory,
          payload.systemPrompt,
          payload.userPrompt,
          payload.temperature,
          payload.top_p,
          payload.max_tokens,
        );

        let processedContent = response.content;

        if (payload.modelCategory === "REASON") {
          processedContent = stripThinkTags(response.content);
          if (processedContent.length === 0) {
            return {
              resultContractVersion: MOB_RESULT_CONTRACT_VERSION,
              resultRef,
              workItemId: context.workItemId,
              taskId: context.taskId,
              model: "REASON",
              kind: "uncertain",
              next: null,
              content: null,
              evidenceRefs: [],
              summary:
                "REASON model produced empty output after stripping think tags.",
              error: null,
              retryable: false,
            };
          }
        }

        const mobNext = extractMobNext(processedContent);
        const kind = determineResultKind(processedContent, mobNext);

        const evidenceRef = `mob-evidence:${createShortHash(
          `${context.workItemId}:${context.attempt}`,
        )}`;

        return {
          resultContractVersion: MOB_RESULT_CONTRACT_VERSION,
          resultRef,
          workItemId: context.workItemId,
          taskId: context.taskId,
          model: payload.modelCategory,
          kind,
          next: mobNext,
          content: processedContent,
          evidenceRefs: [evidenceRef],
          summary:
            kind === "ok"
              ? "Mobile inference completed successfully."
              : kind === "uncertain"
                ? "Mobile inference result is uncertain."
                : kind === "handoff"
                  ? "Mobile inference requested handoff."
                  : kind === "controller"
                    ? "Mobile inference deferred to controller."
                    : "Mobile inference completed.",
          error: null,
          retryable: false,
        };
      } catch (err) {
        const classified = classifyError(err);
        return {
          resultContractVersion: MOB_RESULT_CONTRACT_VERSION,
          resultRef,
          workItemId: context.workItemId,
          taskId: context.taskId,
          model: payload.modelCategory,
          kind: "error",
          next: null,
          content: null,
          evidenceRefs: [],
          summary: `Mobile inference failed: ${classified.message}`,
          error: {
            code: classified.code,
            message: classified.message,
          },
          retryable: isMobRetryableError(classified.code),
        };
      }
    },
  });
}
