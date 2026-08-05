import type {
  ClaimControllerTaskRequest,
  ClaimControllerTaskResult,
  ControllerCommandResult,
  GetTaskDecisionContextRequest,
  ReleaseControllerTaskRequest,
  ReleaseControllerTaskResult,
  SubmitControllerCommandRequest,
  TaskDecisionContext,
} from "@ai-agent-platform/contracts";

export interface ControllerIdentity {
  readonly profileId: string;
  readonly roleId: string;
  readonly projectIds: readonly string[];
}

export type ControllerTaskControlResult<T> = T | Promise<T>;

/**
 * Controller-facing application port.
 *
 * Implementations may be synchronous test fixtures or asynchronous adapters to
 * the formal Task Control domain. The Gateway only depends on this port.
 */
export interface ControllerTaskControl {
  getDecisionContext(
    request: GetTaskDecisionContextRequest,
    identity: ControllerIdentity,
  ): ControllerTaskControlResult<TaskDecisionContext>;
  claimTask(
    request: ClaimControllerTaskRequest,
    identity: ControllerIdentity,
  ): ControllerTaskControlResult<ClaimControllerTaskResult>;
  submitCommand(
    request: SubmitControllerCommandRequest,
    identity: ControllerIdentity,
  ): ControllerTaskControlResult<ControllerCommandResult>;
  releaseTask(
    request: ReleaseControllerTaskRequest,
    identity: ControllerIdentity,
  ): ControllerTaskControlResult<ReleaseControllerTaskResult>;
}
