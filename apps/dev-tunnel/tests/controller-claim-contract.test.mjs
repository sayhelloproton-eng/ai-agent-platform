import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const TEMPLATE = new URL("../openapi/custom-gpt-action.openapi.template.yaml", import.meta.url);
const INSTRUCTIONS = new URL("../../../agent-profiles/custom-gpts/ai-agent-platform-controller/instructions.md", import.meta.url);

test("claimControllerTask exposes a dedicated response contract with required opaque claimToken", () => {
  const template = readFileSync(TEMPLATE, "utf8");
  assert.match(template, /version: 1\.4\.0/u);
  assert.match(
    template,
    /\/v1\/controller\/task-claim:[\s\S]*?operationId: claimControllerTask[\s\S]*?\$ref: "#\/components\/schemas\/ControllerClaimSuccessEnvelope"/u,
  );
  const claimEnvelope = template.match(
    /\n {4}ControllerClaimSuccessEnvelope:(?<schema>[\s\S]*?)\n {4}ControllerSuccessEnvelope:/u,
  );
  assert.notEqual(claimEnvelope, null);
  assert.match(claimEnvelope.groups.schema, /claimToken:/u);
  assert.match(claimEnvelope.groups.schema, /required: \[contractVersion, taskId, taskVersion, claim, claimToken, idempotentReplay\]/u);
  assert.match(claimEnvelope.groups.schema, /Never substitute claim\.claimId/u);
  assert.match(claimEnvelope.groups.schema, /claimId:[\s\S]*?diagnostics only/u);
});

test("submitControllerCommand tells the model to copy data.claimToken exactly and reject claimId substitution", () => {
  const template = readFileSync(TEMPLATE, "utf8");
  const request = template.match(
    /\n {4}ControllerCommandRequest:(?<schema>[\s\S]*?)\n {4}ControllerReleaseRequest:/u,
  );
  assert.notEqual(request, null);
  assert.match(request.groups.schema, /claimToken:/u);
  assert.match(request.groups.schema, /Copy the exact opaque data\.claimToken returned by claimControllerTask/u);
  assert.match(request.groups.schema, /Never use claim\.claimId/u);
});

test("Controller instructions forbid using claimId as claimToken", () => {
  const instructions = readFileSync(INSTRUCTIONS, "utf8");
  assert.match(instructions, /data\.claimToken/u);
  assert.match(instructions, /claim\.claimId/u);
  assert.match(instructions, /不是授权 Token/u);
  assert.match(instructions, /立即停止，不得猜测/u);
});
