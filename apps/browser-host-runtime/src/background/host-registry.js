import { randomId } from "../shared/crypto.js";
import { ACTION_TYPES, APPLICATION_OPERATIONS } from "../shared/constants.js";
import { BhrError } from "../shared/errors.js";

const HOST_KEY = "bhr.host";
const sharedQueues = new WeakMap();

// Runtime implementation support and production routing eligibility are separate
// contracts. Phase 2 Level 2 intentionally exposes only the read-only action
// whose end-to-end safety protocol is complete. High-risk actions remain
// fail-closed until Approval Draft/resume and exactly-once recovery are complete.
export const PRODUCTION_ROUTABLE_CAPABILITIES = Object.freeze([
  "chatgpt-web@v1",
  "observation@0.1.0",
  "host-command@0.1.0",
  ACTION_TYPES.OBSERVE_PAGE
]);

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

  async _registerUnlocked(host) {
    const startedAt = new Date().toISOString();
    await this.storage.set(HOST_KEY, {
      ...host,
      state: "REGISTERING",
      last_register_attempt_at: startedAt,
      last_error: null
    });
    try {
      const result = await this.gateway.invoke(APPLICATION_OPERATIONS.HOST_REGISTER, {
        host_id: host.host_id,
        host_version: host.host_version,
        provider: host.provider,
        capabilities: [...PRODUCTION_ROUTABLE_CAPABILITIES]
      });
      const ackAt = new Date().toISOString();
      const next = {
        ...host,
        state: "ONLINE",
        registered_at: ackAt,
        last_register_attempt_at: startedAt,
        last_gateway_ack_at: ackAt,
        last_error: null
      };
      await this.storage.set(HOST_KEY, next);
      return { host: clone(next), result };
    } catch (error) {
      const next = {
        ...host,
        state: "DEGRADED",
        last_register_attempt_at: startedAt,
        last_error: error instanceof Error ? error.message : String(error)
      };
      await this.storage.set(HOST_KEY, next);
      throw error;
    }
  }

  async register() {
    return this._exclusive(async () => this._registerUnlocked(await this._getOrCreateUnlocked()));
  }

  async heartbeat(status = {}) {
    return this._exclusive(async () => {
      let host = await this._getOrCreateUnlocked();
      const attemptAt = new Date().toISOString();
      await this.storage.set(HOST_KEY, { ...host, last_heartbeat_attempt_at: attemptAt });
      const sendHeartbeat = () => this.gateway.invoke(APPLICATION_OPERATIONS.HOST_HEARTBEAT, {
        host_id: host.host_id,
        state: status.state ?? host.state,
        active_binding_count: status.active_binding_count ?? 0,
        paused: Boolean(status.paused),
        emergency_stopped: Boolean(status.emergency_stopped)
      });
      try {
        let result;
        try {
          result = await sendHeartbeat();
        } catch (error) {
          if (!(error instanceof BhrError) || error.code !== "HOST_NOT_REGISTERED") throw error;
          const registered = await this._registerUnlocked(host);
          host = registered.host;
          result = await sendHeartbeat();
        }
        const ackAt = new Date().toISOString();
        const next = {
          ...host,
          state: status.emergency_stopped ? "STOPPED" : status.paused ? "PAUSED" : "ONLINE",
          last_heartbeat_at: ackAt,
          last_heartbeat_success_at: ackAt,
          last_gateway_ack_at: ackAt,
          last_error: null
        };
        await this.storage.set(HOST_KEY, next);
        return result;
      } catch (error) {
        const next = {
          ...host,
          state: "DEGRADED",
          last_heartbeat_attempt_at: attemptAt,
          last_error: error instanceof Error ? error.message : String(error)
        };
        await this.storage.set(HOST_KEY, next);
        throw error;
      }
    });
  }
}
