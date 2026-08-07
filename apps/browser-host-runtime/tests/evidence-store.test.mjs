import test from "node:test";
import assert from "node:assert/strict";
import { EvidenceStore } from "../src/background/evidence-store.js";
import { MemoryStorageArea } from "../src/background/storage.js";

class YieldingStorage extends MemoryStorageArea {
  async get(key) { await new Promise((resolve) => setTimeout(resolve, 0)); return super.get(key); }
  async set(key, value) { await new Promise((resolve) => setTimeout(resolve, 0)); return super.set(key, value); }
  async remove(key) { await new Promise((resolve) => setTimeout(resolve, 0)); return super.remove(key); }
}

test("concurrent evidence writes across runtime instances preserve a bounded coherent index", async () => {
  const storage = new YieldingStorage();
  const first = new EvidenceStore(storage, { maxEntries: 10 });
  const second = new EvidenceStore(storage, { maxEntries: 10 });
  const refs = Array.from({ length: 20 }, (_, index) => `ref-${index}`);
  await Promise.all(refs.map((ref, index) => (index % 2 ? first : second).put(ref, { index })));
  const index = await storage.get("bhr.evidence.index");
  assert.equal(index.length, 10);
  assert.equal(new Set(index).size, 10);
  for (const ref of index) assert.ok(await storage.get(`bhr.evidence.${ref}`));
  const storedEvidenceRefs = [...storage.values.keys()].filter((key) => key.startsWith("bhr.evidence.ref-"));
  assert.equal(storedEvidenceRefs.length, 10);
});
