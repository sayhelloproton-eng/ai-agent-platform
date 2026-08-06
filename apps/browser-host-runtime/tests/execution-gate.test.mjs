import test from "node:test";
import assert from "node:assert/strict";
import { ExecutionGate } from "../src/background/execution-gate.js";

test("startup, alarm and manual processing share one serialized execution gate", async () => {
  const gate = new ExecutionGate();
  const order = [];
  const first = gate.run("startup", async () => {
    order.push("startup:start");
    await new Promise((resolve) => setTimeout(resolve, 10));
    order.push("startup:end");
  });
  const second = gate.run("alarm", async () => {
    order.push("alarm:start");
    order.push("alarm:end");
  });
  const third = gate.run("manual", async () => {
    order.push("manual:start");
    order.push("manual:end");
  });
  await Promise.all([first, second, third]);
  assert.deepEqual(order, [
    "startup:start", "startup:end",
    "alarm:start", "alarm:end",
    "manual:start", "manual:end"
  ]);
});
