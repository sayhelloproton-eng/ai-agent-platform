import test from "node:test";
import assert from "node:assert/strict";
import { FixtureModelProvider } from "../src/background/model-inference.js";

const observation = {
  observation_version: "0.1.0", observation_id: "obs", host_id: "host", binding_id: "binding",
  provider: "chatgpt-web", page_state: "READY", generation_state: "IDLE", follow_latest: true,
  screenshot_ref: null, visible_text_ref: "text", dom_summary_ref: "dom", interactive_elements: [], blocking_ui: [],
  observed_at: new Date().toISOString()
};

test("fixture model only returns allowed assessment decision", async () => {
  const result = await new FixtureModelProvider().analyze({ observation });
  assert.equal(result.decision, "NO_ACTION");
  assert.equal(result.task_update, undefined);
  assert.equal(result.approved, undefined);
});

test("blocking UI escalates to human review", async () => {
  const result = await new FixtureModelProvider().analyze({ observation: { ...observation, blocking_ui: [{ type: "DIALOG" }] } });
  assert.equal(result.decision, "REQUEST_HUMAN_REVIEW");
});
