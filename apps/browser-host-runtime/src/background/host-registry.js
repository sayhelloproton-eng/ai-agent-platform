import { randomId } from "../shared/crypto.js";
import { APPLICATION_OPERATIONS } from "../shared/constants.js";

const HOST_KEY = "bhr.host";
const sharedQueues = new WeakMap();

function lockTarget(storage) {
  return storage?.area && typeof storage.area === "object" ? storage.area : storage;
}

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

export class HostRegistry {
  constructor(storage, gateway) {
    this.storage = storage;
    this.gateway = gateway;
  }

  _exclusive(work) {
    const target = lockTarget(this.storage);
    const previous = sharedQueues.get(target) ?? Promise.resolve();
    const run = previous.then(work, work);
    sharedQueues.set(target, run.catch(() => undefined));
    return run;
  }

  async _getOrCreateUnlocked() {
    let host = await this.storage.get(HOST_KEY);
    if (!host) {
      host = {
        host_id: randomId("bhr-host"),
        host_version: "0.1.0",
        provider: "chrome-mv3",
        created_at: new Date().toISOString(),
        state: "STARTING"
      };
      await this.storage.set(HOST_KEY, host);
    }
    return clone(host);
  }

  async getOrCreate() {
    return this._exclusive(() => this._getOrCreateUnlocked());
  }

  async register() {
    return this._exclusive(async () => {
      const host = await this._getOrCreateUnlocked();
      const result = await this.gateway.invoke(APPLICATION_OPERATIONS.HOST_REGISTER, {
        host_id: host.host_id,
        host_version: host.host_version,
        provider: host.provider,
        capabilities: ["chatgpt-web@v1", "observation@0.1.0", "host-command@0.1.0"]
      });
      const next = { ...host, state: "ONLINE", registered_at: new Date().toISOString() };
      await this.storage.set(HOST_KEY, next);
      return { host: clone(next), result };
    });
  }

  async heartbeat(status = {}) {
    return this._exclusive(async () => {
      const host = await this._getOrCreateUnlocked();
      const result = await this.gateway.invoke(APPLICATION_OPERATIONS.HOST_HEARTBEAT, {
        host_id: host.host_id,
        state: status.state ?? host.state,
        active_binding_count: status.active_binding_count ?? 0,
        paused: Boolean(status.paused),
        emergency_stopped: Boolean(status.emergency_stopped)
      });
      const next = { ...host, last_heartbeat_at: new Date().toISOString() };
      await this.storage.set(HOST_KEY, next);
      return result;
    });
  }
}
