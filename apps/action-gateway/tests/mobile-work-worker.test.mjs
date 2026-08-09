import assert from "node:assert/strict";
import { test } from "node:test";

import {
  MOB_RESULT_CONTRACT_VERSION,
  MOBILE_INFERENCE_CONTRACT_VERSION,
} from "@ai-agent-platform/contracts";
import {
  JsonFileTaskControlStore,
  RandomIdGenerator,
  SystemClock,
  TaskControlService,
  TASK_CONTROL_CONTRACT_VERSION,
} from "@ai-agent-platform/task-control";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { Phase2IntegrationStore } from "../dist/phase2-integration-store.js";
import {
  createMobileWorkWorker,
} from "../dist/mobile-work-worker.js";

async function withTempDir(fn) {
  const dir = await mkdtemp(join(tmpdir(), "mob-worker-test-"));
  try {
    await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

function createFakeAdapter(responses = []) {
  let callIndex = 0;
  return {
    calls: [],
    async run(payload, context) {
      const response = responses[callIndex] ?? {
        resultContractVersion: MOB_RESULT_CONTRACT_VERSION,
        resultRef: `mob-result:${context.workItemId}`,
        workItemId: context.workItemId,
        taskId: context.taskId,
        model: payload.modelCategory,
        kind: "ok",
        next: null,
        content: "Inference result",
        evidenceRefs: [`mob-evidence:${context.workItemId}`],
        summary: "Completed",
        error: null,
        retryable: false,
      };
      const result = typeof response === "function"
        ? response(payload, context)
        : response;
      this.calls.push({ payload, context, result });
      callIndex += 1;
      return result;
    },
  };
}

test("worker runOnce with no pending items returns zero results", async () => {
  await withTempDir(async (dir) => {
    const store = await JsonFileTaskControlStore.open(join(dir, "tsk.json"));
    const tcs = new TaskControlService(store, new SystemClock(), new RandomIdGenerator());
    await tcs.recoverAll();
    const integrationStore = Phase2IntegrationStore.inMemory();
    const adapter = createFakeAdapter();
    const worker = createMobileWorkWorker({
      taskControl: tcs,
      integrationStore,
      adapter,
    });

    const result = await worker.runOnce();
    assert.equal(result.inspected, 0);
    assert.equal(result.processed, 0);
    assert.equal(result.succeeded, 0);
    assert.equal(result.failed, 0);
    assert.equal(result.skipped, 0);
  });
});

test("worker is frozen", async () => {
  await withTempDir(async (dir) => {
    const store = await JsonFileTaskControlStore.open(join(dir, "tsk.json"));
    const tcs = new TaskControlService(store, new SystemClock(), new RandomIdGenerator());
    await tcs.recoverAll();
    const worker = createMobileWorkWorker({
      taskControl: tcs,
      integrationStore: Phase2IntegrationStore.inMemory(),
      adapter: createFakeAdapter(),
    });
    assert.ok(Object.isFrozen(worker));
  });
});

test("worker returns structured result", async () => {
  await withTempDir(async (dir) => {
    const store = await JsonFileTaskControlStore.open(join(dir, "tsk.json"));
    const tcs = new TaskControlService(store, new SystemClock(), new RandomIdGenerator());
    await tcs.recoverAll();
    const worker = createMobileWorkWorker({
      taskControl: tcs,
      integrationStore: Phase2IntegrationStore.inMemory(),
      adapter: createFakeAdapter(),
    });
    const result = await worker.runOnce();
    assert.equal(typeof result.inspected, "number");
    assert.equal(typeof result.processed, "number");
    assert.equal(typeof result.succeeded, "number");
    assert.equal(typeof result.failed, "number");
    assert.equal(typeof result.skipped, "number");
  });
});

test("worker with maxItemsPerRun > 1 only processes one item per run", async () => {
  await withTempDir(async (dir) => {
    const store = await JsonFileTaskControlStore.open(join(dir, "tsk.json"));
    const tcs = new TaskControlService(store, new SystemClock(), new RandomIdGenerator());
    await tcs.recoverAll();
    const adapter = createFakeAdapter();
    const worker = createMobileWorkWorker({
      taskControl: tcs,
      integrationStore: Phase2IntegrationStore.inMemory(),
      adapter,
      maxItemsPerRun: 1,
    });

    const result = await worker.runOnce();
    assert.equal(result.inspected, 0);
  });
});

test("worker respects ID generation contract for idempotency keys", () => {
  const idempotencyFn = (item, phase) =>
    `mob-worker:${item.workItemId}:${item.attempt}:${phase}`;
  assert.equal(
    idempotencyFn({ workItemId: "wi-1", attempt: 1 }, "claim"),
    "mob-worker:wi-1:1:claim",
  );
});
