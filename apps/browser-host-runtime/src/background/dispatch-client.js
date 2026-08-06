import { APPLICATION_OPERATIONS } from "../shared/constants.js";
import { assertHostCommand, assertUncertainSideEffect } from "../shared/contracts.js";
import { BhrError } from "../shared/errors.js";

function requireObject(value, code, message) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new BhrError(code, message);
  return value;
}

function requireString(value, code, message) {
  if (typeof value !== "string" || value.length === 0) throw new BhrError(code, message);
  return value;
}

export class DispatchClient {
  constructor(gateway) { this.gateway = gateway; }

  async listPending(host_id) {
    const value = await this.gateway.invoke(APPLICATION_OPERATIONS.DISPATCH_LIST_PENDING, { host_id, limit: 1 });
    if (!Array.isArray(value)) throw new BhrError("DISPATCH_LIST_INVALID", "Gateway dispatch list data must be an array.");
    return value;
  }

  async claim(dispatch_ref, host_id) {
    const value = requireObject(
      await this.gateway.invoke(APPLICATION_OPERATIONS.DISPATCH_CLAIM, { dispatch_ref, host_id }),
      "DISPATCH_CLAIM_INVALID",
      "Gateway dispatch claim data must be an object."
    );
    requireString(value.claim_token, "DISPATCH_CLAIM_TOKEN_MISSING", "Gateway dispatch claim data is missing claim_token.");
    return value;
  }

  async get(dispatch_ref, claim_token) {
    return assertHostCommand(await this.gateway.invoke(APPLICATION_OPERATIONS.DISPATCH_GET, { dispatch_ref, claim_token }));
  }

  async resolvePayload(payload_ref) {
    const value = await this.gateway.invoke(APPLICATION_OPERATIONS.PAYLOAD_RESOLVE, { payload_ref });
    if (value === null || value === undefined) throw new BhrError("PAYLOAD_NOT_FOUND", "Gateway returned no payload data.");
    return value;
  }

  async deliveryAck(dispatch_ref, claim_token, delivery) {
    const value = requireObject(
      await this.gateway.invoke(APPLICATION_OPERATIONS.DISPATCH_DELIVERY_ACK, { dispatch_ref, claim_token, delivery }),
      "DELIVERY_ACK_INVALID",
      "Gateway delivery Ack data must be an object."
    );
    requireString(value.delivery_receipt, "DELIVERY_RECEIPT_MISSING", "Gateway delivery Ack data is missing delivery_receipt.");
    requireString(value.report_token, "REPORT_TOKEN_MISSING", "Gateway delivery Ack data is missing report_token.");
    return value;
  }

  async hostResult(dispatch_ref, report_token, result) {
    return this.gateway.invoke(APPLICATION_OPERATIONS.DISPATCH_HOST_RESULT, { dispatch_ref, report_token, result });
  }

  async uncertain(dispatch_ref, credential, uncertain) {
    const checked = assertUncertainSideEffect(uncertain);
    const value = requireObject(credential, "UNCERTAIN_CREDENTIAL_INVALID", "Uncertain report credential must be an object.");
    if (!value.claim_token && !value.report_token) {
      throw new BhrError("UNCERTAIN_CREDENTIAL_MISSING", "Uncertain report requires claim_token or report_token.");
    }
    return this.gateway.invoke(APPLICATION_OPERATIONS.DISPATCH_UNCERTAIN, { dispatch_ref, credential: value, uncertain: checked });
  }

  async fail(dispatch_ref, claim_token, result) {
    return this.gateway.invoke(APPLICATION_OPERATIONS.DISPATCH_FAIL, { dispatch_ref, claim_token, result });
  }
}

export class ApprovalClient {
  constructor(gateway) { this.gateway = gateway; }
  getGrant(approval_ref) { return this.gateway.invoke(APPLICATION_OPERATIONS.APPROVAL_GRANT_GET, { approval_ref }); }
  consume(approval_ref, grant_id, command_id) {
    return this.gateway.invoke(APPLICATION_OPERATIONS.APPROVAL_GRANT_CONSUME, { approval_ref, grant_id, command_id });
  }
}
