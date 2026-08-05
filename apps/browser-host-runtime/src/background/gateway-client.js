import { BhrError } from "../shared/errors.js";
import { randomId } from "../shared/crypto.js";

export class HttpGatewayClient {
  constructor({ endpoint, apiKey = "", timeoutMs = 5000, fetchImpl = fetch }) {
    this.endpoint = endpoint;
    this.apiKey = apiKey;
    this.timeoutMs = timeoutMs;
    this.fetchImpl = fetchImpl;
  }

  async invoke(operation, payload) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const headers = { "content-type": "application/json" };
      if (this.apiKey) headers.authorization = `Bearer ${this.apiKey}`;
      const response = await this.fetchImpl(this.endpoint, {
        method: "POST",
        headers,
        signal: controller.signal,
        body: JSON.stringify({ request_id: randomId("bhr-request"), operation, payload })
      });
      const text = await response.text();
      let body = null;
      try { body = text ? JSON.parse(text) : null; } catch { throw new BhrError("GATEWAY_RESPONSE_INVALID", "Gateway returned invalid JSON."); }
      if (!response.ok) throw new BhrError(body?.error?.code ?? "GATEWAY_REQUEST_FAILED", body?.error?.message ?? `Gateway request failed with HTTP ${response.status}.`);
      if (body?.ok === false) throw new BhrError(body.error?.code ?? "GATEWAY_OPERATION_FAILED", body.error?.message ?? "Gateway operation failed.");
      return body?.result ?? body;
    } catch (error) {
      if (error?.name === "AbortError") throw new BhrError("GATEWAY_TIMEOUT", "Gateway request timed out.");
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}

export class FixtureGatewayClient {
  constructor(storage) {
    this.storage = storage;
    this.key = "bhr.fixture.gateway_state";
  }

  async state() {
    return (await this.storage.get(this.key)) ?? { host: null, dispatches: [], grants: {}, payloads: {}, reports: [] };
  }

  async save(state) { await this.storage.set(this.key, state); }

  async invoke(operation, payload) {
    const state = await this.state();
    switch (operation) {
      case "browser.host.register":
        state.host = { ...payload, registered_at: new Date().toISOString() };
        await this.save(state);
        return { host_id: payload.host_id, status: "REGISTERED" };
      case "browser.host.heartbeat":
        state.host = { ...(state.host ?? {}), ...payload, last_heartbeat_at: new Date().toISOString() };
        await this.save(state);
        return { status: "ALIVE" };
      case "browser.dispatch.listPending":
        return state.dispatches.filter((item) => item.status === "PENDING").map(({ command, ...item }) => item);
      case "browser.dispatch.claim": {
        const item = state.dispatches.find((candidate) => candidate.dispatch_ref === payload.dispatch_ref);
        if (!item || item.status !== "PENDING") throw new BhrError("DISPATCH_ALREADY_CLAIMED", "Fixture dispatch is not available.");
        item.status = "CLAIMED";
        item.claim_token = randomId("fixture-claim");
        item.claimed_by = payload.host_id;
        await this.save(state);
        return { dispatch_ref: item.dispatch_ref, claim_token: item.claim_token, expires_at: item.command.expires_at };
      }
      case "browser.dispatch.get": {
        const item = state.dispatches.find((candidate) => candidate.dispatch_ref === payload.dispatch_ref);
        if (!item || item.claim_token !== payload.claim_token) throw new BhrError("CLAIM_TOKEN_INVALID", "Fixture claim token is invalid.");
        return item.command;
      }
      case "browser.payload.resolve":
        return state.payloads[payload.payload_ref] ?? null;
      case "approval.grant.get":
        return state.grants[payload.approval_ref] ?? null;
      case "approval.grant.consume": {
        const grant = state.grants[payload.approval_ref];
        if (!grant) throw new BhrError("APPROVAL_NOT_FOUND", "Fixture approval grant was not found.");
        if (grant.consumed_at) throw new BhrError("APPROVAL_ALREADY_CONSUMED", "Fixture approval grant is already consumed.");
        grant.consumed_at = new Date().toISOString();
        grant.consumed_by = payload.command_id;
        await this.save(state);
        return { status: "CONSUMED", consumed_at: grant.consumed_at };
      }
      case "browser.dispatch.report": {
        const item = state.dispatches.find((candidate) => candidate.dispatch_ref === payload.dispatch_ref);
        if (item) item.status = "REPORTED";
        state.reports.push(payload);
        await this.save(state);
        return { status: "RECORDED" };
      }
      default:
        throw new BhrError("FIXTURE_OPERATION_UNSUPPORTED", `Fixture operation is not supported: ${operation}`);
    }
  }

  async enqueue({ dispatch_ref, command, payload = null, grant = null }) {
    const state = await this.state();
    if (state.dispatches.some((item) => item.dispatch_ref === dispatch_ref)) return;
    state.dispatches.push({ dispatch_ref, status: "PENDING", command });
    if (command.action.payload_ref && payload) state.payloads[command.action.payload_ref] = payload;
    if (command.approval_ref && grant) state.grants[command.approval_ref] = grant;
    await this.save(state);
  }
}
