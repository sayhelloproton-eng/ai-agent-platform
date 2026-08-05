import { randomId } from "../shared/crypto.js";
import { APPLICATION_OPERATIONS } from "../shared/constants.js";

const HOST_KEY = "bhr.host";

export class HostRegistry {
  constructor(storage, gateway) {
    this.storage = storage;
    this.gateway = gateway;
  }

  async getOrCreate() {
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
    return host;
  }

  async register() {
    const host = await this.getOrCreate();
    const result = await this.gateway.invoke(APPLICATION_OPERATIONS.HOST_REGISTER, {
      host_id: host.host_id,
      host_version: host.host_version,
      provider: host.provider,
      capabilities: ["chatgpt-web@v1", "observation@0.1.0", "host-command@0.1.0"]
    });
    const next = { ...host, state: "ONLINE", registered_at: new Date().toISOString() };
    await this.storage.set(HOST_KEY, next);
    return { host: next, result };
  }

  async heartbeat(status = {}) {
    const host = await this.getOrCreate();
    const result = await this.gateway.invoke(APPLICATION_OPERATIONS.HOST_HEARTBEAT, {
      host_id: host.host_id,
      state: status.state ?? host.state,
      active_binding_count: status.active_binding_count ?? 0,
      paused: Boolean(status.paused),
      emergency_stopped: Boolean(status.emergency_stopped)
    });
    await this.storage.set(HOST_KEY, { ...host, last_heartbeat_at: new Date().toISOString() });
    return result;
  }
}
