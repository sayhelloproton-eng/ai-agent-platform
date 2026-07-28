import {
  CAPABILITY_NAMES,
  isCapabilityName,
  type CapabilityName,
} from "@ai-agent-platform/contracts";

export type CapabilityPolicyDenyReason =
  | "unknown-capability"
  | "not-allowed";

export interface CapabilityPolicy {
  readonly allowedCapabilities: readonly CapabilityName[];
}

export type CapabilityPolicyDecision =
  | {
      readonly allowed: true;
      readonly capability: CapabilityName;
    }
  | {
      readonly allowed: false;
      readonly capability: string;
      readonly reason: CapabilityPolicyDenyReason;
    };

export function createCapabilityPolicy(
  allowedCapabilities: readonly unknown[],
): CapabilityPolicy {
  const allowedSet = new Set<CapabilityName>();

  for (const capability of allowedCapabilities) {
    if (!isCapabilityName(capability)) {
      throw new Error("Capability policy contains an unknown Capability.");
    }

    allowedSet.add(capability);
  }

  const orderedCapabilities = Object.freeze(
    CAPABILITY_NAMES.filter((capability) => allowedSet.has(capability)),
  );

  return Object.freeze({
    allowedCapabilities: orderedCapabilities,
  });
}

export function evaluateCapability(
  policy: CapabilityPolicy,
  capability: unknown,
): CapabilityPolicyDecision {
  if (!isCapabilityName(capability)) {
    return {
      allowed: false,
      capability:
        typeof capability === "string"
          ? capability
          : "[invalid-capability]",
      reason: "unknown-capability",
    };
  }

  if (!policy.allowedCapabilities.includes(capability)) {
    return {
      allowed: false,
      capability,
      reason: "not-allowed",
    };
  }

  return {
    allowed: true,
    capability,
  };
}

export function listAllowedCapabilities(
  policy: CapabilityPolicy,
): readonly CapabilityName[] {
  return Object.freeze([...policy.allowedCapabilities]);
}
