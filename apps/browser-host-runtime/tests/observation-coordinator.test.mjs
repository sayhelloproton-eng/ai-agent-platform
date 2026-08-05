import test from "node:test";
import assert from "node:assert/strict";
import { ObservationCoordinator } from "../src/background/observation-coordinator.js";

test("specified inactive tab is temporarily activated for screenshot and previous tab is restored", async () => {
  const updates = [];
  globalThis.chrome = {
    tabs: {
      get: async () => ({ id: 20, windowId: 2, active: false }),
      query: async () => [{ id: 10, windowId: 2, active: true }],
      update: async (id, patch) => { updates.push({ id, patch }); return { id, windowId: 2, ...patch }; },
      captureVisibleTab: async () => "data:image/jpeg;base64,abc"
    }
  };
  const stored = [];
  const coordinator = new ObservationCoordinator({ host_id: "host", evidenceStore: { put: async (ref, value) => stored.push({ ref, value }) }, focusDelayMs: 0 });
  const result = await coordinator.captureScreenshot({ binding_id: "binding", chrome_tab_id: 20 });
  assert.equal(result.temporarily_activated, true);
  assert.deepEqual(updates, [
    { id: 20, patch: { active: true } },
    { id: 10, patch: { active: true } }
  ]);
  assert.equal(stored.length, 1);
  assert.equal(stored[0].value.chrome_tab_id, 20);
});
