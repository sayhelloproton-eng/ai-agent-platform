import { APPLICATION_OPERATIONS, HOST_RESULT_STATUS } from "../shared/constants.js";

const successful = new Set([HOST_RESULT_STATUS.DELIVERED, HOST_RESULT_STATUS.ACTION_SUCCEEDED]);

export class DispatchClient {
  constructor(gateway) { this.gateway = gateway; }
  listPending(host_id) { return this.gateway.invoke(APPLICATION_OPERATIONS.DISPATCH_LIST_PENDING, { host_id, limit: 1 }); }
  claim(dispatch_ref, host_id) { return this.gateway.invoke(APPLICATION_OPERATIONS.DISPATCH_CLAIM, { dispatch_ref, host_id }); }
  get(dispatch_ref, claim_token) { return this.gateway.invoke(APPLICATION_OPERATIONS.DISPATCH_GET, { dispatch_ref, claim_token }); }
  ack(dispatch_ref, claim_token, result) { return this.gateway.invoke(APPLICATION_OPERATIONS.DISPATCH_ACK, { dispatch_ref, claim_token, result }); }
  fail(dispatch_ref, claim_token, result) { return this.gateway.invoke(APPLICATION_OPERATIONS.DISPATCH_FAIL, { dispatch_ref, claim_token, result }); }
  report(dispatch_ref, claim_token, result) {
    return successful.has(result.status) ? this.ack(dispatch_ref, claim_token, result) : this.fail(dispatch_ref, claim_token, result);
  }
  resolvePayload(payload_ref) { return this.gateway.invoke(APPLICATION_OPERATIONS.PAYLOAD_RESOLVE, { payload_ref }); }
}

export class ApprovalClient {
  constructor(gateway) { this.gateway = gateway; }
  getGrant(approval_ref) { return this.gateway.invoke(APPLICATION_OPERATIONS.APPROVAL_GRANT_GET, { approval_ref }); }
  consume(approval_ref, grant_id, command_id) {
    return this.gateway.invoke(APPLICATION_OPERATIONS.APPROVAL_GRANT_CONSUME, { approval_ref, grant_id, command_id });
  }
}
