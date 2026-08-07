import test from "node:test";
import assert from "node:assert/strict";
import { BrowserActionExecutor } from "../src/background/action-executor.js";
import { binding, hostCommand } from "./test-helpers.mjs";

test("content action error details survive the service-worker boundary", async () => {
  globalThis.chrome = {
    runtime: { lastError: null },
    tabs: {
      sendMessage: (_tabId, _message, callback) => callback({
        ok: false,
        error: {
          code: "PAGE_ACTION_UNCERTAIN",
          message: "delivery uncertain",
          details: { reason: "SUBMISSION_CONFIRMATION_TIMEOUT" }
        }
      })
    }
  };
  const executor = new BrowserActionExecutor();
  await assert.rejects(
    () => executor.execute({
      binding: binding(),
      command: hostCommand(),
      resolved_payload: { text: "continue" }
    }),
    (error) => error?.code === "PAGE_ACTION_UNCERTAIN" && error?.details?.reason === "SUBMISSION_CONFIRMATION_TIMEOUT"
  );
});
