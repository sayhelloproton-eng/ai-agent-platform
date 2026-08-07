const PREFIX = "bhr.evidence.";
const INDEX_KEY = "bhr.evidence.index";
const sharedQueues = new WeakMap();

function lockTarget(storage) {
  return storage?.area && typeof storage.area === "object" ? storage.area : storage;
}

export class EvidenceStore {
  constructor(storage, { maxEntries = 30 } = {}) {
    this.storage = storage;
    this.maxEntries = maxEntries;
  }

  _exclusive(work) {
    const target = lockTarget(this.storage);
    const previous = sharedQueues.get(target) ?? Promise.resolve();
    const run = previous.then(work, work);
    sharedQueues.set(target, run.catch(() => undefined));
    return run;
  }

  async put(ref, value) {
    return this._exclusive(async () => {
      await this.storage.set(`${PREFIX}${ref}`, value);
      const index = (await this.storage.get(INDEX_KEY)) ?? [];
      const next = [ref, ...index.filter((item) => item !== ref)].slice(0, this.maxEntries);
      for (const expired of index.slice(this.maxEntries - 1)) {
        if (!next.includes(expired)) await this.storage.remove(`${PREFIX}${expired}`);
      }
      await this.storage.set(INDEX_KEY, next);
      return ref;
    });
  }

  async get(ref) { return this.storage.get(`${PREFIX}${ref}`); }
}
