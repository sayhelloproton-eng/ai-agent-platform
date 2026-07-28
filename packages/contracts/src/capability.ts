export const CAPABILITY_NAMES = [
  "gateway.ping",
  "runtime.status",
  "system.info.safe",
] as const;

export type CapabilityName = (typeof CAPABILITY_NAMES)[number];

export function isCapabilityName(input: unknown): input is CapabilityName {
  return (
    typeof input === "string" &&
    CAPABILITY_NAMES.some((capability) => capability === input)
  );
}
