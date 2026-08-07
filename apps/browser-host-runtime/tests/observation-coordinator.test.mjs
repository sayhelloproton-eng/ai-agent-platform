import test from "node:test";
import assert from "node:assert/strict";
import { ObservationCoordinator, ensureContentScript, sendTabMessage } from "../src/background/observation-coordinator.js";

test("inactive bound tab degrades screenshot evidence without stealing user focus", async () => {
  let captureCalls = 0;
  globalThis.chrome = {
    tabs: {
      get: async () => ({ id: 20, windowId: 2, active: false }),
      query: async () => [{ id: 10, windowId: 2, active: true }],
      captureVisibleTab: async () => { captureCalls += 1; return "data:image/jpeg;base64,abc"; }
    }
  };
  const stored = [];
  const coordinator = new ObservationCoordinator({ host_id: "host", evidenceStore: { put: async (ref, value) => stored.push({ ref, value }) }, focusDelayMs: 0 });
  const result = await coordinator.captureScreenshot({ binding_id: "binding", chrome_tab_id: 20 });
  assert.equal(result.ref, null);
  assert.equal(result.unavailable_reason, "SCREENSHOT_TAB_NOT_ACTIVE");
  assert.equal(result.temporarily_activated, false);
  assert.equal(captureCalls, 0);
  assert.equal(stored.length, 0);
});


test("screenshot permission failure degrades observation evidence instead of failing", async () => {
  globalThis.chrome = {
    tabs: {
      get: async () => ({ id: 20, windowId: 2, active: true }),
      query: async () => [{ id: 20, windowId: 2, active: true }],
      captureVisibleTab: async () => {
        throw new Error("Either the '<all_urls>' or 'activeTab' permission is required.");
      }
    }
  };
  const stored = [];
  const coordinator = new ObservationCoordinator({ host_id: "host", evidenceStore: { put: async (ref, value) => stored.push({ ref, value }) }, focusDelayMs: 0 });
  const result = await coordinator.captureScreenshot({ binding_id: "binding", chrome_tab_id: 20 });
  assert.equal(result.ref, null);
  assert.equal(result.unavailable_reason, "SCREENSHOT_PERMISSION_UNAVAILABLE");
  assert.equal(result.temporarily_activated, false);
  assert.equal(stored.length, 0);
});


test("missing receiver triggers ChatGPT-scoped content-script reinjection and one retry", async () => {
  let sendCalls = 0;
  const injected = [];
  globalThis.chrome = {
    runtime: { lastError: null },
    tabs: {
      get: async () => ({ id: 20, windowId: 2, active: true, url: "https://chatgpt.com/g/g-test" }),
      sendMessage: (_tabId, message, callback) => {
        sendCalls += 1;
        if (sendCalls <= 2) {
          globalThis.chrome.runtime.lastError = { message: "Could not establish connection. Receiving end does not exist." };
          callback(undefined);
          globalThis.chrome.runtime.lastError = null;
          return;
        }
        if (message.type === "BHR_PING") {
          callback({ ok: true, data: { provider: "chatgpt-web", gpt_ref: "g-test", conversation_ref: null, url: "https://chatgpt.com/g/g-test" } });
          return;
        }
        callback({ ok: true, data: { follow_latest: true } });
      }
    },
    scripting: {
      executeScript: async (request) => { injected.push(request.files[0]); }
    }
  };

  const response = await sendTabMessage(20, { type: "BHR_SET_FOLLOW_LATEST", enabled: true });
  assert.equal(response.ok, true);
  assert.deepEqual(injected, ["src/content/response-lifecycle.js", "src/content/content-script.js"]);
  assert.equal(sendCalls, 4);
});

test("automatic content-script recovery never injects outside ChatGPT", async () => {
  let injected = false;
  globalThis.chrome = {
    runtime: { lastError: null },
    tabs: {
      get: async () => ({ id: 20, windowId: 2, active: true, url: "https://example.com/" }),
      sendMessage: (_tabId, _message, callback) => {
        globalThis.chrome.runtime.lastError = { message: "Could not establish connection. Receiving end does not exist." };
        callback(undefined);
        globalThis.chrome.runtime.lastError = null;
      }
    },
    scripting: { executeScript: async () => { injected = true; } }
  };
  await assert.rejects(
    () => sendTabMessage(20, { type: "BHR_OBSERVE", observation_id: "obs" }),
    (error) => error?.code === "CONTENT_SCRIPT_UNAVAILABLE" && /not an allowed ChatGPT page/i.test(error.message)
  );
  assert.equal(injected, false);
});

test("concurrent recovery for one tab performs only one content-script reinjection", async () => {
  let receiverReady = false;
  const injected = [];
  globalThis.chrome = {
    runtime: { lastError: null },
    tabs: {
      get: async () => ({ id: 42, windowId: 2, active: true, url: "https://chatgpt.com/g/g-test" }),
      sendMessage: (_tabId, _message, callback) => {
        if (!receiverReady) {
          globalThis.chrome.runtime.lastError = { message: "Could not establish connection. Receiving end does not exist." };
          callback(undefined);
          globalThis.chrome.runtime.lastError = null;
          return;
        }
        callback({ ok: true, data: { provider: "chatgpt-web", gpt_ref: "g-test", conversation_ref: null, url: "https://chatgpt.com/g/g-test" } });
      }
    },
    scripting: {
      executeScript: async (request) => {
        injected.push(request.files[0]);
        await new Promise((resolve) => setTimeout(resolve, 1));
        if (request.files[0] === "src/content/content-script.js") receiverReady = true;
      }
    }
  };

  const [first, second] = await Promise.all([ensureContentScript(42), ensureContentScript(42)]);
  assert.equal(first.ready, true);
  assert.equal(second.ready, true);
  assert.deepEqual(injected, ["src/content/response-lifecycle.js", "src/content/content-script.js"]);
});

test("message-port closure is not treated as a missing receiver and is never auto-retried", async () => {
  let sendCalls = 0;
  let injectionCalls = 0;
  globalThis.chrome = {
    runtime: { lastError: null },
    tabs: {
      sendMessage: (_tabId, _message, callback) => {
        sendCalls += 1;
        globalThis.chrome.runtime.lastError = { message: "The message port closed before a response was received." };
        callback(undefined);
        globalThis.chrome.runtime.lastError = null;
      },
      get: async () => ({ id: 20, windowId: 2, active: true, url: "https://chatgpt.com/g/g-test" })
    },
    scripting: { executeScript: async () => { injectionCalls += 1; } }
  };

  await assert.rejects(
    () => sendTabMessage(20, { type: "BHR_EXECUTE_ACTION", action_type: "SUBMIT_MESSAGE", payload: { text: "continue" } }),
    (error) => error?.code === "CONTENT_SCRIPT_MESSAGE_FAILED"
  );
  assert.equal(sendCalls, 1);
  assert.equal(injectionCalls, 0);
});


test("observation exposes explicit screenshot unavailability reason in the public observation result", async () => {
  globalThis.chrome = {
    runtime: { lastError: null },
    tabs: {
      sendMessage: (_tabId, message, callback) => {
        if (message.type === "BHR_OBSERVE") {
          callback({
            ok: true,
            data: {
              provider: "chatgpt-web",
              gpt_ref: "g-test",
              conversation_ref: "c-test",
              url: "https://chatgpt.com/g/g-test/c/c-test",
              page_state: "READY",
              generation_state: "IDLE",
              follow_latest: true,
              visible_text: "hello",
              dom_summary: {},
              accessibility_summary: {},
              message_summary: {},
              interactive_elements: [],
              blocking_ui: [],
              observed_at: "2026-08-07T15:06:17.559Z"
            }
          });
          return;
        }
        callback({ ok: true, data: { provider: "chatgpt-web" } });
      },
      get: async () => ({ id: 20, windowId: 2, active: true, url: "https://chatgpt.com/g/g-test/c/c-test" }),
      query: async () => [{ id: 20, windowId: 2, active: true }],
      captureVisibleTab: async () => {
        throw new Error("Either the '<all_urls>' or 'activeTab' permission is required.");
      }
    }
  };
  const stored = [];
  const coordinator = new ObservationCoordinator({ host_id: "host", evidenceStore: { put: async (ref, value) => stored.push({ ref, value }) } });
  const observed = await coordinator.observe({ binding_id: "binding", chrome_tab_id: 20 }, { includeScreenshot: true });
  assert.equal(observed.observation.screenshot_ref, null);
  assert.equal(observed.observation.screenshot_unavailable_reason, "SCREENSHOT_PERMISSION_UNAVAILABLE");
  assert.equal(observed.local.screenshot_unavailable_reason, "SCREENSHOT_PERMISSION_UNAVAILABLE");
});
