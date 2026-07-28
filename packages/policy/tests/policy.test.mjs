import assert from "node:assert/strict";
import { test } from "node:test";

import { CAPABILITY_NAMES } from "@ai-agent-platform/contracts";
import {
  createCapabilityPolicy,
  evaluateCapability,
  listAllowedCapabilities,
} from "../dist/index.js";

test("allows an explicitly configured Capability", () => {
  const policy = createCapabilityPolicy(["gateway.ping"]);

  assert.deepEqual(evaluateCapability(policy, "gateway.ping"), {
    allowed: true,
    capability: "gateway.ping",
  });
});

test("denies a known Capability that is not allowed", () => {
  const policy = createCapabilityPolicy(["gateway.ping"]);

  assert.deepEqual(evaluateCapability(policy, "runtime.status"), {
    allowed: false,
    capability: "runtime.status",
    reason: "not-allowed",
  });
});

test("denies an unknown Capability", () => {
  const policy = createCapabilityPolicy(["gateway.ping"]);

  assert.deepEqual(evaluateCapability(policy, "unknown.value"), {
    allowed: false,
    capability: "unknown.value",
    reason: "unknown-capability",
  });
});

test("safely denies a non-string Capability", () => {
  const policy = createCapabilityPolicy(["gateway.ping"]);

  assert.deepEqual(evaluateCapability(policy, { secret: "not-returned" }), {
    allowed: false,
    capability: "[invalid-capability]",
    reason: "unknown-capability",
  });
});

test("an empty allowlist denies every known Capability", () => {
  const policy = createCapabilityPolicy([]);

  for (const capability of CAPABILITY_NAMES) {
    assert.equal(evaluateCapability(policy, capability).allowed, false);
  }
});

test("deduplicates repeated Capabilities", () => {
  const policy = createCapabilityPolicy([
    "gateway.ping",
    "gateway.ping",
  ]);

  assert.deepEqual(listAllowedCapabilities(policy), ["gateway.ping"]);
});

test("orders the allowlist according to Contracts", () => {
  const policy = createCapabilityPolicy([
    "system.info.safe",
    "gateway.ping",
    "runtime.status",
  ]);

  assert.deepEqual(listAllowedCapabilities(policy), CAPABILITY_NAMES);
});

test("rejects an unknown Capability during policy creation", () => {
  assert.throws(
    () => createCapabilityPolicy(["gateway.ping", "unknown.value"]),
    {
      message: "Capability policy contains an unknown Capability.",
    },
  );
});

test("does not retain or mutate the caller input array", () => {
  const input = ["gateway.ping"];
  const policy = createCapabilityPolicy(input);

  input.push("runtime.status");

  assert.deepEqual(input, ["gateway.ping", "runtime.status"]);
  assert.deepEqual(listAllowedCapabilities(policy), ["gateway.ping"]);
});

test("returned lists cannot mutate policy state", () => {
  const policy = createCapabilityPolicy(["gateway.ping"]);
  const returned = listAllowedCapabilities(policy);

  assert.throws(() => returned.push("runtime.status"), TypeError);
  assert.deepEqual(listAllowedCapabilities(policy), ["gateway.ping"]);
});

test("listAllowedCapabilities returns only configured Capabilities", () => {
  const policy = createCapabilityPolicy(["system.info.safe"]);

  assert.deepEqual(listAllowedCapabilities(policy), ["system.info.safe"]);
});

test("never produces a Capability outside the Contracts allowlist", () => {
  const policy = createCapabilityPolicy(CAPABILITY_NAMES);
  const knownCapabilities = new Set(CAPABILITY_NAMES);

  for (const capability of listAllowedCapabilities(policy)) {
    assert.equal(knownCapabilities.has(capability), true);
  }
});
