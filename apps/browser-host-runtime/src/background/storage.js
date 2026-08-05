export class ChromeStorageArea {
  constructor(area) {
    this.area = area;
  }
  async get(key) {
    const result = await this.area.get(key);
    return result[key];
  }
  async set(key, value) {
    await this.area.set({ [key]: value });
  }
  async remove(key) {
    await this.area.remove(key);
  }
}

export class MemoryStorageArea {
  constructor(initial = {}) {
    this.values = new Map(Object.entries(initial));
  }
  async get(key) { return this.values.get(key); }
  async set(key, value) { this.values.set(key, structuredClone(value)); }
  async remove(key) { this.values.delete(key); }
}
