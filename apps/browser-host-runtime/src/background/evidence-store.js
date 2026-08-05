const PREFIX = "bhr.evidence.";
const INDEX_KEY = "bhr.evidence.index";

export class EvidenceStore {
  constructor(storage, { maxEntries = 30 } = {}) {
    this.storage = storage;
    this.maxEntries = maxEntries;
  }

  async put(ref, value) {
    await this.storage.set(`${PREFIX}${ref}`, value);
    const index = (await this.storage.get(INDEX_KEY)) ?? [];
    const next = [ref, ...index.filter((item) => item !== ref)].slice(0, this.maxEntries);
    for (const expired of index.slice(this.maxEntries - 1)) {
      if (!next.includes(expired)) await this.storage.remove(`${PREFIX}${expired}`);
    }
    await this.storage.set(INDEX_KEY, next);
    return ref;
  }

  async get(ref) { return this.storage.get(`${PREFIX}${ref}`); }
}
