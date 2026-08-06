import type {
  ApprovalGrantV1,
  BrowserHostRecordV1,
  JsonValue,
} from "@ai-agent-platform/contracts";
import type {
  LocalEvidenceSinkPort,
  LocalResultSinkPort,
  StoredLocalEvidenceReferences,
  StoredLocalWorkResult,
} from "@ai-agent-platform/local-control";
import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";


export class Phase2IntegrationStoreError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly httpStatus: number,
  ) {
    super(message);
    this.name = "Phase2IntegrationStoreError";
  }
}

interface Phase2IntegrationState {
  readonly hosts: Record<string, BrowserHostRecordV1>;
  readonly payloads: Record<string, JsonValue>;
  readonly approvalGrants: Record<string, ApprovalGrantV1>;
  readonly localResults: Record<string, StoredLocalWorkResult>;
  readonly localEvidence: Record<string, StoredLocalEvidenceReferences>;
}

function emptyState(): Phase2IntegrationState {
  return {
    hosts: {},
    payloads: {},
    approvalGrants: {},
    localResults: {},
    localEvidence: {},
  };
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function hash(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex").slice(0, 32);
}

function assertRef(value: string, name: string): void {
  if (value.trim().length === 0 || value.length > 512) {
    throw new TypeError(`${name} must be a non-empty reference no longer than 512 characters.`);
  }
}

function validateState(value: unknown): Phase2IntegrationState {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("Phase 2 Integration Store must contain a JSON object.");
  }
  const state = value as Partial<Phase2IntegrationState>;
  return {
    hosts: clone(state.hosts ?? {}),
    payloads: clone(state.payloads ?? {}),
    approvalGrants: clone(state.approvalGrants ?? {}),
    localResults: clone(state.localResults ?? {}),
    localEvidence: clone(state.localEvidence ?? {}),
  };
}

export class Phase2IntegrationStore {
  private state: Phase2IntegrationState;
  private queue: Promise<void> = Promise.resolve();

  private constructor(
    initialState: Phase2IntegrationState,
    private readonly filePath: string | null,
  ) {
    this.state = initialState;
  }

  static inMemory(): Phase2IntegrationStore {
    return new Phase2IntegrationStore(emptyState(), null);
  }

  static async open(filePath: string): Promise<Phase2IntegrationStore> {
    const resolved = resolve(filePath);
    await mkdir(dirname(resolved), { recursive: true });
    let state = emptyState();
    try {
      state = validateState(JSON.parse(await readFile(resolved, "utf8")));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    return new Phase2IntegrationStore(state, resolved);
  }

  private async read<T>(reader: (state: Readonly<Phase2IntegrationState>) => T): Promise<T> {
    await this.queue;
    return reader(clone(this.state));
  }

  private async transact<T>(writer: (draft: Phase2IntegrationState) => T | Promise<T>): Promise<T> {
    let resolveResult!: (value: T | PromiseLike<T>) => void;
    let rejectResult!: (reason?: unknown) => void;
    const result = new Promise<T>((resolveResultValue, rejectResultValue) => {
      resolveResult = resolveResultValue;
      rejectResult = rejectResultValue;
    });
    this.queue = this.queue.then(async () => {
      const draft = clone(this.state);
      try {
        const value = await writer(draft);
        if (this.filePath !== null) {
          const temporary = `${this.filePath}.tmp-${process.pid}-${Date.now()}`;
          await writeFile(temporary, `${JSON.stringify(draft, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
          await rename(temporary, this.filePath);
        }
        this.state = draft;
        resolveResult(value);
      } catch (error) {
        rejectResult(error);
      }
    });
    return result;
  }

  async putPayload(payloadRef: string, value: JsonValue): Promise<void> {
    assertRef(payloadRef, "payloadRef");
    await this.transact((state) => {
      const existing = state.payloads[payloadRef];
      if (existing !== undefined && JSON.stringify(existing) !== JSON.stringify(value)) {
        throw new Phase2IntegrationStoreError("PAYLOAD_REF_CONFLICT", "Payload reference already exists with different content.", 409);
      }
      state.payloads[payloadRef] = clone(value);
    });
  }

  async getPayload(payloadRef: string): Promise<JsonValue | null> {
    assertRef(payloadRef, "payloadRef");
    return this.read((state) => clone(state.payloads[payloadRef] ?? null));
  }

  async putApprovalGrant(grant: ApprovalGrantV1): Promise<void> {
    assertRef(grant.approvalRef, "approvalRef");
    await this.transact((state) => {
      const existing = state.approvalGrants[grant.approvalRef];
      if (existing !== undefined && JSON.stringify(existing) !== JSON.stringify(grant)) {
        throw new Phase2IntegrationStoreError("APPROVAL_REF_CONFLICT", "Approval reference already exists with different content.", 409);
      }
      state.approvalGrants[grant.approvalRef] = clone(grant);
    });
  }

  async getApprovalGrant(approvalRef: string): Promise<ApprovalGrantV1 | null> {
    return this.read((state) => clone(state.approvalGrants[approvalRef] ?? null));
  }

  async consumeApprovalGrant(
    approvalRef: string,
    grantId: string,
    commandId: string,
  ): Promise<ApprovalGrantV1> {
    return this.transact((state) => {
      const grant = state.approvalGrants[approvalRef];
      if (grant === undefined) throw new Phase2IntegrationStoreError("APPROVAL_NOT_FOUND", "Approval Grant was not found.", 404);
      if (grant.grantId !== grantId || grant.commandId !== commandId) {
        throw new Phase2IntegrationStoreError("APPROVAL_BINDING_MISMATCH", "Approval Grant binding does not match the requested Command.", 409);
      }
      if (grant.consumedAt !== null) throw new Phase2IntegrationStoreError("APPROVAL_ALREADY_CONSUMED", "Approval Grant was already consumed.", 409);
      if (Date.parse(grant.expiresAt) <= Date.now()) throw new Phase2IntegrationStoreError("APPROVAL_EXPIRED", "Approval Grant has expired.", 409);
      const consumed: ApprovalGrantV1 = {
        ...grant,
        consumedAt: new Date().toISOString(),
        consumedBy: commandId,
      };
      state.approvalGrants[approvalRef] = consumed;
      return clone(consumed);
    });
  }

  async registerHost(input: {
    readonly hostId: string;
    readonly instanceId: string;
    readonly capabilities: readonly string[];
    readonly ttlMs: number;
  }): Promise<BrowserHostRecordV1> {
    const now = new Date();
    const record: BrowserHostRecordV1 = {
      hostId: input.hostId,
      instanceId: input.instanceId,
      capabilities: [...new Set(input.capabilities)],
      registeredAt: now.toISOString(),
      lastHeartbeatAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + input.ttlMs).toISOString(),
    };
    await this.transact((state) => {
      state.hosts[input.hostId] = record;
    });
    return record;
  }

  async heartbeatHost(hostId: string, ttlMs: number): Promise<BrowserHostRecordV1> {
    return this.transact((state) => {
      const existing = state.hosts[hostId];
      if (existing === undefined) throw new Phase2IntegrationStoreError("HOST_NOT_REGISTERED", "Browser Host is not registered.", 409);
      const now = new Date();
      const updated: BrowserHostRecordV1 = {
        ...existing,
        lastHeartbeatAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
      };
      state.hosts[hostId] = updated;
      return clone(updated);
    });
  }

  async getHost(hostId: string): Promise<BrowserHostRecordV1 | null> {
    return this.read((state) => clone(state.hosts[hostId] ?? null));
  }

  createLocalResultSink(): LocalResultSinkPort {
    return {
      load: async ({ idempotency_key }) =>
        this.read((state) => clone(state.localResults[idempotency_key] ?? null)),
      persist: async (input) =>
        this.transact((state) => {
          const existing = state.localResults[input.idempotency_key];
          if (existing !== undefined) return clone(existing);
          const result: StoredLocalWorkResult = {
            ...clone(input),
            result_ref: `local-result:${hash(input.idempotency_key)}`,
          };
          state.localResults[input.idempotency_key] = result;
          return clone(result);
        }),
    };
  }

  createLocalEvidenceSink(): LocalEvidenceSinkPort {
    return {
      load: async ({ idempotency_key }) =>
        this.read((state) => clone(state.localEvidence[idempotency_key] ?? null)),
      persist: async (input) =>
        this.transact((state) => {
          const existing = state.localEvidence[input.idempotency_key];
          if (existing !== undefined) return clone(existing);
          const evidenceCount = input.local_result === null ? 0 : 1;
          const result: StoredLocalEvidenceReferences = {
            idempotency_key: input.idempotency_key,
            request_fingerprint: input.request_fingerprint,
            result_ref: input.result_ref,
            evidence_refs: Array.from(
              { length: evidenceCount },
              (_, index) => `local-evidence:${hash(input.idempotency_key)}:${index + 1}`,
            ),
          };
          state.localEvidence[input.idempotency_key] = result;
          return clone(result);
        }),
    };
  }

  async snapshot(): Promise<Phase2IntegrationState> {
    return this.read((state) => clone(state));
  }
}
