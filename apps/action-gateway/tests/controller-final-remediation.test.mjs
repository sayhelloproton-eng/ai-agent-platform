import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  InMemoryTaskControlStore,
  TASK_CONTROL_CONTRACT_VERSION,
  TaskControlService,
} from "@ai-agent-platform/task-control";

import {
  InMemoryControllerIdempotencySnapshotStore,
  JsonFileControllerIdempotencySnapshotStore,
} from "../dist/controller-idempotency-store.js";
import { createTaskControlControllerAdapter } from "../dist/task-control-controller-adapter.js";
import { createControllerCommandReceiptFixture } from "./fixtures/controller-command-receipt-fixture.mjs";

class ManualClock {
  constructor(value = "2026-08-06T00:00:00.000Z") {
    this.value = new Date(value);
  }
  now() {
    return new Date(this.value);
  }
}

class SequenceIds {
  constructor() {
    this.value = 0;
  }
  next(prefix) {
    this.value += 1;
    return `${prefix}-${String(this.value).padStart(4, "0")}`;
  }
  token(prefix) {
    this.value += 1;
    return `${prefix}-${String(this.value).padStart(4, "0")}`;
  }
}

const identity = {
  profileId: "ai-agent-platform-controller",
  roleId: "controller",
  projectIds: ["ai-agent-platform"],
};

async function createTaskService(taskId) {
  const service = new TaskControlService(
    new InMemoryTaskControlStore(),
    new ManualClock(),
    new SequenceIds(),
  );
  await service.createTask({
    contractVersion: TASK_CONTROL_CONTRACT_VERSION,
    taskId,
    title: "Final CTL remediation",
    objective: "Verify stable receipt and lock recovery.",
    requiredRole: "controller",
    requirementRef: `requirement:${taskId}`,
    idempotencyKey: `intake:${taskId}`,
    producerRef: "final-remediation-test",
  });
  return service;
}

function createPlanRequest(claim) {
  return {
    taskId: claim.taskId,
    claimToken: claim.claimToken,
    expectedTaskVersion: claim.taskVersion,
    expectedPlanVersion: null,
    idempotencyKey: "receipt-create-plan",
    command: {
      type: "CREATE_PLAN",
      reasonSummary: "Create the receipt recovery plan.",
      payload: {
        nodes: [
          {
            nodeId: "node-01",
            title: "Inspect",
            kind: "DECISION",
            requiredRole: "controller",
          },
          {
            nodeId: "node-02",
            title: "Finish",
            kind: "FINALIZE",
            requiredRole: "controller",
            dependsOn: ["node-01"],
          },
        ],
      },
    },
  };
}

class FailFirstCommandSnapshotStore {
  constructor(delegate) {
    this.delegate = delegate;
    this.failed = false;
  }
  get(scope) {
    return this.delegate.get(scope);
  }
  async putIfAbsent(scope, snapshot) {
    if (!this.failed && scope.includes(":command:")) {
      this.failed = true;
      throw new Error("simulated CTL cache crash after Task Control commit");
    }
    return this.delegate.putIfAbsent(scope, snapshot);
  }
}

test("active Controller idempotency lock is not removed", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "aap-ctl-active-lock-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const statePath = join(directory, "state.json");
  const now = new Date("2026-08-06T00:00:00.000Z");
  const store = await JsonFileControllerIdempotencySnapshotStore.open(statePath, {
    now: () => new Date(now),
    retryCount: 1,
    retryDelayMs: 0,
    ttlMs: 1_000,
    hostId: "test-host",
    isProcessAlive: () => true,
  });
  const lockPath = `${statePath}.lock`;
  await writeFile(
    lockPath,
    `${JSON.stringify({
      formatVersion: 1,
      ownerId: "active-owner",
      pid: 1234,
      hostId: "test-host",
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() - 1).toISOString(),
    })}\n`,
  );
  await assert.rejects(
    store.putIfAbsent("scope", {
      fingerprint: "fingerprint",
      result: { ok: true },
      createdAt: now.toISOString(),
    }),
    /lock timed out/,
  );
  assert.match(await readFile(lockPath, "utf8"), /active-owner/);
});

test("dead and expired Controller idempotency locks are recovered", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "aap-ctl-stale-lock-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const statePath = join(directory, "state.json");
  const now = new Date("2026-08-06T00:00:10.000Z");
  const store = await JsonFileControllerIdempotencySnapshotStore.open(statePath, {
    now: () => new Date(now),
    retryCount: 3,
    retryDelayMs: 0,
    ttlMs: 1_000,
    hostId: "test-host",
    isProcessAlive: () => false,
  });
  await writeFile(
    `${statePath}.lock`,
    `${JSON.stringify({
      formatVersion: 1,
      ownerId: "dead-owner",
      pid: 999999,
      hostId: "test-host",
      createdAt: "2026-08-06T00:00:00.000Z",
      expiresAt: "2026-08-06T00:00:01.000Z",
    })}\n`,
  );
  const existing = await store.putIfAbsent("scope", {
    fingerprint: "fingerprint",
    result: { ok: true },
    createdAt: now.toISOString(),
  });
  assert.equal(existing, null);
  assert.deepEqual((await store.get("scope")).result, { ok: true });
});

test("Task Control receipt recovers a commit when the CTL response cache crashes", async () => {
  const service = await createTaskService("task-receipt-crash-001");
  const receiptService = createControllerCommandReceiptFixture(service);
  const failingStore = new FailFirstCommandSnapshotStore(
    new InMemoryControllerIdempotencySnapshotStore(),
  );
  const firstAdapter = createTaskControlControllerAdapter(receiptService, {
    projectId: "ai-agent-platform",
    claimTtlMs: 60_000,
    idempotencyStore: failingStore,
  });
  const context = await firstAdapter.getDecisionContext(
    { taskId: "task-receipt-crash-001" },
    identity,
  );
  const claim = await firstAdapter.claimTask(
    {
      taskId: context.task.taskId,
      expectedTaskVersion: context.task.taskVersion,
      idempotencyKey: "receipt-claim",
    },
    identity,
  );
  const request = createPlanRequest(claim);
  await assert.rejects(
    firstAdapter.submitCommand(request, identity),
    /simulated CTL cache crash/,
  );
  const committedVersion = (await service.getTask(context.task.taskId)).taskVersion;

  const restartedAdapter = createTaskControlControllerAdapter(receiptService, {
    projectId: "ai-agent-platform",
    claimTtlMs: 60_000,
    idempotencyStore: new InMemoryControllerIdempotencySnapshotStore(),
  });
  const recovered = await restartedAdapter.submitCommand(request, identity);
  assert.equal(recovered.idempotentReplay, true);
  assert.equal(recovered.task.taskVersion, committedVersion);
  assert.equal(recovered.task.plan.currentNodeId, "node-01");
  assert.equal((await service.getTask(context.task.taskId)).taskVersion, committedVersion);
});

test("Controller profile declares only the adapter's actual command boundaries", async () => {
  const roleInstructions = await readFile(
    new URL("../../../agent-profiles/roles/controller/instructions.md", import.meta.url),
    "utf8",
  );
  const actionIntent = await readFile(
    new URL("../../../agent-profiles/roles/controller/action-intent.yaml", import.meta.url),
    "utf8",
  );
  assert.match(roleInstructions, /allowedControllerCommands/);
  assert.match(roleInstructions, /INSERT_NODE_AFTER/);
  assert.match(roleInstructions, /REQUEST_ROLE_WORK/);
  assert.match(actionIntent, /PAUSE、RESUME、FAIL/);
  assert.doesNotMatch(actionIntent, /REQUEST_ROLE_WORK.*已支持/);
});
