import { ASSESSMENT_DECISIONS, CONTRACT_VERSION } from "../shared/constants.js";
import { randomId } from "../shared/crypto.js";
import { assertAssessment } from "../shared/contracts.js";
import { BhrError } from "../shared/errors.js";

export class FixtureModelProvider {
  async analyze({ observation }) {
    let decision = "NO_ACTION";
    const warnings = [];
    if (observation.blocking_ui.length > 0) {
      decision = "REQUEST_HUMAN_REVIEW";
      warnings.push("Blocking UI detected by deterministic fixture.");
    } else if (["LOGIN_REQUIRED", "UNKNOWN", "ERROR"].includes(observation.page_state)) {
      decision = "REQUEST_MORE_OBSERVATION";
    }
    return assertAssessment({
      assessment_version: CONTRACT_VERSION,
      assessment_id: randomId("assessment"),
      observation_id: observation.observation_id,
      decision,
      confidence: decision === "NO_ACTION" ? 0.8 : 0.65,
      evidence_refs: [observation.screenshot_ref, observation.visible_text_ref, observation.dom_summary_ref].filter(Boolean),
      warnings,
      candidate_action: null,
      assessed_at: new Date().toISOString()
    });
  }
}

export class HttpDeepSeekProvider {
  constructor({ endpoint, apiKey = "", timeoutMs = 20000, fetchImpl = fetch }) {
    this.endpoint = endpoint;
    this.apiKey = apiKey;
    this.timeoutMs = timeoutMs;
    this.fetchImpl = fetchImpl;
  }

  async analyze({ observation, evidence }) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const headers = { "content-type": "application/json" };
      if (this.apiKey) headers.authorization = `Bearer ${this.apiKey}`;
      const response = await this.fetchImpl(this.endpoint, {
        method: "POST",
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          inference_version: CONTRACT_VERSION,
          operation: "browser.page.assess",
          profile_id: "page-observer",
          request_id: randomId("inference"),
          input: { observation, evidence },
          output_schema: {
            decision: [...ASSESSMENT_DECISIONS],
            confidence: "number:0..1",
            evidence_refs: "string[]",
            warnings: "string[]",
            candidate_action: "object|null"
          }
        })
      });
      const body = await response.json();
      if (!response.ok) throw new BhrError(body?.error?.code ?? "MODEL_PROVIDER_FAILED", body?.error?.message ?? `Model provider HTTP ${response.status}.`);
      const output = body.result ?? body.output ?? body;
      return assertAssessment({
        assessment_version: CONTRACT_VERSION,
        assessment_id: output.assessment_id ?? randomId("assessment"),
        observation_id: observation.observation_id,
        decision: output.decision,
        confidence: output.confidence,
        evidence_refs: output.evidence_refs ?? [],
        warnings: output.warnings ?? [],
        candidate_action: output.candidate_action ?? null,
        assessed_at: output.assessed_at ?? new Date().toISOString()
      });
    } catch (error) {
      if (error?.name === "AbortError") throw new BhrError("MODEL_PROVIDER_TIMEOUT", "Model provider timed out.");
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}
