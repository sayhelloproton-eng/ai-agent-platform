import type {
  CapabilityDescriptor,
  LocalCapability,
} from "./contracts.js";

export const CAPABILITY_DESCRIPTORS: readonly CapabilityDescriptor[] =
  Object.freeze([
    {
      capability: "local.health.read",
      execution_mode: "SYNC",
      side_effect: false,
      batch_allowed: true,
      summary: "Read CLI, contract and registry health.",
    },
    {
      capability: "local.capabilities.read",
      execution_mode: "SYNC",
      side_effect: false,
      batch_allowed: true,
      summary: "Read the current Local Capability Catalog.",
    },
    {
      capability: "local.project.describe",
      execution_mode: "SYNC",
      side_effect: false,
      batch_allowed: true,
      summary: "Describe a registered project without exposing its absolute path.",
    },
    {
      capability: "local.repository.snapshot.read",
      execution_mode: "SYNC",
      side_effect: false,
      batch_allowed: true,
      summary: "Read branch, HEAD, upstream, worktree and recent commits.",
    },
    {
      capability: "local.repository.tree.read",
      execution_mode: "SYNC",
      side_effect: false,
      batch_allowed: true,
      summary: "Read a bounded, paginated repository tree.",
    },
    {
      capability: "local.repository.file.read",
      execution_mode: "SYNC",
      side_effect: false,
      batch_allowed: true,
      summary: "Read a bounded UTF-8 file range inside a registered project.",
    },
    {
      capability: "local.runtime.status.read",
      execution_mode: "SYNC",
      side_effect: false,
      batch_allowed: true,
      summary: "Read a registered runtime health probe.",
    },
    {
      capability: "local.executor.status.read",
      execution_mode: "SYNC",
      side_effect: false,
      batch_allowed: true,
      summary: "Read installation and version status for a registered executor.",
    },
    {
      capability: "local.query.batch",
      execution_mode: "SYNC",
      side_effect: false,
      batch_allowed: false,
      summary: "Execute a bounded set of read-only Local queries.",
    },
    {
      capability: "local.service.ensure_running",
      execution_mode: "ASYNC",
      side_effect: true,
      batch_allowed: false,
      summary: "Ensure a registered service is running using a fixed local template.",
    },
  ] satisfies readonly CapabilityDescriptor[]);

const descriptorMap = new Map<LocalCapability, CapabilityDescriptor>(
  CAPABILITY_DESCRIPTORS.map((descriptor) => [
    descriptor.capability,
    descriptor,
  ]),
);

export function getCapabilityDescriptor(
  capability: LocalCapability,
): CapabilityDescriptor {
  const descriptor = descriptorMap.get(capability);
  if (descriptor === undefined) {
    throw new Error(`Missing descriptor for ${capability}`);
  }
  return descriptor;
}
