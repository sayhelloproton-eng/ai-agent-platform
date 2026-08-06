import { JsonFileTaskControlStore, TASK_CONTROL_CONTRACT_VERSION, TaskControlService } from "../../dist/index.js";

class Clock {
  now() { return new Date("2026-08-06T12:00:00.000Z"); }
}
class Ids {
  constructor() { this.value = 0; }
  next(prefix) { this.value += 1; return `${prefix}-child-${this.value}`; }
  token(prefix) { this.value += 1; return `${prefix}-child-${this.value}`; }
}

const [mode, filePath, staleLockMsRaw = "30000"] = process.argv.slice(2);
const staleLockMs = Number(staleLockMsRaw);
try {
  const store = await JsonFileTaskControlStore.open(filePath, { staleLockMs });
  if (mode === "write-hold") {
    const service = new TaskControlService(store, new Clock(), new Ids());
    await service.intakeTask({
      contractVersion: TASK_CONTROL_CONTRACT_VERSION,
      taskId: "task-cross-process",
      title: "cross process",
      objective: "prove one writer",
      requiredRole: "controller",
      idempotencyKey: "cross-process-intake",
      producerRef: "child-process",
    });
    process.stdout.write("LOCKED\n");
    setInterval(() => undefined, 1000);
  } else {
    await store.close();
    process.stdout.write("OPENED\n");
  }
} catch (error) {
  process.stderr.write(`${error?.code ?? error?.name ?? "ERROR"}:${error?.message ?? String(error)}\n`);
  process.exitCode = 3;
}
