export {
  CAPABILITY_DESCRIPTORS,
  getCapabilityDescriptor,
} from "./capability-registry.js";
export {
  LOCAL_CAPABILITIES,
  LOCAL_CLI_PACKAGE,
  LOCAL_CLI_VERSION,
  LOCAL_ERROR_CODES,
  LOCAL_REQUEST_VERSION,
  LOCAL_RESULT_VERSION,
  isJsonObject,
  isJsonValue,
  type CapabilityDescriptor,
  type JsonObject,
  type JsonValue,
  type LocalActor,
  type LocalBudget,
  type LocalCapability,
  type LocalCorrelation,
  type LocalErrorCategory,
  type LocalErrorCode,
  type LocalErrorData,
  type LocalExecutionMode,
  type LocalRequest,
  type LocalResult,
  type LocalResultStatus,
  type LocalScope,
} from "./contracts.js";
export { LocalControlError } from "./errors.js";
export {
  executeLocalRequest,
  type ExecuteLocalRequestOptions,
} from "./invoke.js";
export {
  createDefaultRegistry,
  getExecutor,
  getProject,
  getRuntime,
  getService,
  type ExecutorRegistration,
  type LocalRegistry,
  type ProjectRegistration,
  type RuntimeRegistration,
  type ServiceRegistration,
  type ServiceStartTemplate,
} from "./registry.js";
export {
  defaultProcessRunner,
  type DetachedProcessResult,
  type ProcessRunOptions,
  type ProcessRunResult,
  type ProcessRunner,
} from "./process.js";
export { validateLocalRequest } from "./request-validator.js";

export {
  LOCAL_CONTROL_FIXED_ARGS,
  LocalControlTransportError,
  createLocalControlProcessClient,
  type LocalControlClient,
  type LocalControlProcessClientOptions,
  type LocalControlTransportErrorCode,
} from "./gateway-process-adapter.js";
export {
  createLocalWorkConsumer,
  summarizeLocalResult,
  type LocalResultPersistencePort,
  type LocalWorkConsumerOptions,
  type LocalWorkConsumerReport,
  type PersistedLocalResultReferences,
} from "./work-consumer-adapter.js";
export {
  validateLocalResult,
  type ExpectedLocalResultIdentity,
} from "./result-validator.js";
