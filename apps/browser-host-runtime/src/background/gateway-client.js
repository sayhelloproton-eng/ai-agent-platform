import { BhrError } from "../shared/errors.js";
import { randomId } from "../shared/crypto.js";
import { GATEWAY_ENVELOPE_VERSION } from "../shared/constants.js";

function parseJson(text) {
  try { return text ? JSON.parse(text) : null; }
  catch { throw new BhrError("GATEWAY_RESPONSE_INVALID_JSON", "Gateway returned invalid JSON."); }
}

export function parseGatewaySuccessEnvelope(body, { operation = "unknown" } = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new BhrError("GATEWAY_ENVELOPE_INVALID", "Gateway response must be an object Envelope.");
  }
  const envelopeVersion = body.gatewayEnvelopeVersion ?? body.gateway_envelope_version ?? null;
  if (envelopeVersion !== null && envelopeVersion !== GATEWAY_ENVELOPE_VERSION) {
    throw new BhrError("GATEWAY_ENVELOPE_VERSION_UNSUPPORTED", `Gateway Envelope version ${envelopeVersion} is not supported.`, {
      operation,
      supported: GATEWAY_ENVELOPE_VERSION,
      received: envelopeVersion
    });
  }
  if (body.ok !== true) {
    throw new BhrError(
      body.error?.code ?? "GATEWAY_ERROR_ENVELOPE",
      body.error?.message ?? "Gateway returned an error Envelope.",
      { operation, requestId: body.requestId ?? null, gateway: body.error?.details ?? null }
    );
  }
  if (typeof body.requestId !== "string" || body.requestId.length === 0) {
    throw new BhrError("GATEWAY_REQUEST_ID_MISSING", "Gateway success Envelope is missing requestId.", { operation });
  }
  if (!Object.prototype.hasOwnProperty.call(body, "data") || body.data === null || body.data === undefined) {
    throw new BhrError("GATEWAY_DATA_MISSING", "Gateway success Envelope contains no data.", { operation, requestId: body.requestId });
  }
  return body.data;
}

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
    const requestId = randomId("bhr-request");
    try {
      const headers = { "content-type": "application/json" };
      if (this.apiKey) headers.authorization = `Bearer ${this.apiKey}`;
      let response;
      try {
        response = await this.fetchImpl(this.endpoint, {
          method: "POST",
          headers,
          signal: controller.signal,
          body: JSON.stringify({ requestId, operation, payload })
        });
      } catch (error) {
        if (error?.name === "AbortError") throw new BhrError("GATEWAY_TIMEOUT", "Gateway request timed out.", { operation, requestId });
        throw new BhrError("GATEWAY_UNAVAILABLE", "Gateway HTTP transport is unavailable.", { operation, requestId, cause: error?.message ?? String(error) });
      }
      const body = parseJson(await response.text());
      if (!response.ok) {
        throw new BhrError(
          body?.error?.code ?? "GATEWAY_HTTP_ERROR",
          body?.error?.message ?? `Gateway request failed with HTTP ${response.status}.`,
          { operation, requestId: body?.requestId ?? requestId, httpStatus: response.status }
        );
      }
      return parseGatewaySuccessEnvelope(body, { operation });
    } finally {
      clearTimeout(timer);
    }
  }
}

function fixtureState() {
  return { host: null, dispatches: [], grants: {}, payloads: {}, deliveryAcks: [], hostResults: [], uncertainReports: [], failures: [] };
}

export class FixtureGatewayClient {
  constructor(storage) {
    this.storage = storage;
    this.key = "bhr.fixture.gateway_state";
    this.testOnly = true;
  }

  async state() { return (await this.storage.get(this.key)) ?? fixtureState(); }
  async save(state) { await this.storage.set(this.key, state); }

  async invoke(operation, payload) {
    const state = await this.state();
    state.deliveryAcks ??= [];
    state.hostResults ??= [];
    state.uncertainReports ??= [];
    state.failures ??= [];
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
      case "browser.payload.resolve": {
        const resolved = state.payloads[payload.payload_ref];
        if (resolved === undefined || resolved === null) throw new BhrError("PAYLOAD_NOT_FOUND", "Fixture payload was not found.");
        return resolved;
      }
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
      case "browser.dispatch.deliveryAck": {
        const item = state.dispatches.find((candidate) => candidate.dispatch_ref === payload.dispatch_ref);
        const existing = state.deliveryAcks.find((entry) => entry.delivery?.delivery_id === payload.delivery?.delivery_id);
        if (existing) return { status: "ALREADY_RECORDED", delivery_receipt: existing.delivery_receipt, report_token: existing.report_token };
        if (!item || item.claim_token !== payload.claim_token) throw new BhrError("CLAIM_TOKEN_INVALID", "Fixture claim token is invalid during delivery Ack.");
        const delivery_receipt = randomId("fixture-delivery-receipt");
        const report_token = randomId("fixture-report-token");
        state.deliveryAcks.push({ ...payload, delivery_receipt, report_token, recorded_at: new Date().toISOString() });
        item.status = "DELIVERED";
        item.delivery_receipt = delivery_receipt;
        item.report_token = report_token;
        // Delivery Ack ends the delivery claim. Later Host Result uses the report token,
        // so a Controller Claim cannot invalidate the browser observation report.
        item.claim_token = null;
        await this.save(state);
        return { status: "RECORDED", delivery_receipt, report_token };
      }
      case "browser.dispatch.hostResult": {
        const item = state.dispatches.find((candidate) => candidate.dispatch_ref === payload.dispatch_ref);
        const duplicate = state.hostResults.find((entry) => entry.result?.result_id === payload.result?.result_id);
        if (duplicate) return { status: "ALREADY_RECORDED", result_id: payload.result.result_id };
        if (!item || item.report_token !== payload.report_token) throw new BhrError("REPORT_TOKEN_INVALID", "Fixture report token is invalid.");
        item.status = "REPORTED";
        state.hostResults.push({ ...payload, recorded_at: new Date().toISOString() });
        await this.save(state);
        return { status: "RECORDED", result_id: payload.result?.result_id };
      }
      case "browser.dispatch.uncertain": {
        const item = state.dispatches.find((candidate) => candidate.dispatch_ref === payload.dispatch_ref);
        const duplicate = state.uncertainReports.find((entry) => entry.uncertain?.uncertain_id === payload.uncertain?.uncertain_id);
        if (duplicate) return { status: "ALREADY_RECORDED", uncertain_id: payload.uncertain.uncertain_id };
        const credentialValid = Boolean(item) && (
          (payload.credential?.claim_token && item.claim_token === payload.credential.claim_token) ||
          (payload.credential?.report_token && item.report_token === payload.credential.report_token)
        );
        if (!credentialValid) throw new BhrError("UNCERTAIN_CREDENTIAL_INVALID", "Fixture uncertain report credential is invalid.");
        item.status = "UNCERTAIN_REVIEW";
        state.uncertainReports.push({ ...payload, recorded_at: new Date().toISOString() });
        await this.save(state);
        return { status: "RECORDED", uncertain_id: payload.uncertain?.uncertain_id };
      }
      case "browser.dispatch.fail": {
        const item = state.dispatches.find((candidate) => candidate.dispatch_ref === payload.dispatch_ref);
        const duplicate = state.failures.find((entry) => entry.result?.result_id === payload.result?.result_id);
        if (duplicate) return { status: "ALREADY_RECORDED", result_id: payload.result.result_id };
        if (!item || item.claim_token !== payload.claim_token) throw new BhrError("CLAIM_TOKEN_INVALID", "Fixture claim token is invalid during dispatch failure.");
        item.status = "FAILED";
        state.failures.push({ ...payload, recorded_at: new Date().toISOString() });
        await this.save(state);
        return { status: "RECORDED", result_id: payload.result?.result_id };
      }
      case "browser.dispatch.ack":
      case "browser.dispatch.report":
        throw new BhrError("LEGACY_REPORT_OPERATION_DISABLED", "Legacy single-stage dispatch reporting is disabled in the round-two Fixture.");
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
