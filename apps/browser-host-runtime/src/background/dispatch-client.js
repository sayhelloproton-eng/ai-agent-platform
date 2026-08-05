import { APPLICATION_OPERATIONS } from "../shared/constants.js";

export class DispatchClient {
  constructor(gateway) { this.gateway = gateway; }
  listPending(host_id) { return this.gateway.invoke(APPLICATION_OPERATIONS.DISPATCH_LIST_PENDING, { host_id, limit: 1 }); }
  claim(dispatch_ref, host_id) { return this.gateway.invoke(APPLICATION_OPERATIONS.DISPATCH_CLAIM, { dispatch_ref, host_id }); }
  get(dispatch_ref, claim_token) { return this.gateway.invoke(APPLICATION_OPERATIONS.DISPATCH_GET, { dispatch_ref, claim_token }); }
  report(dispatch_ref, claim_token, result) { return this.gateway.invoke(APPLICATION_OPERATIONS.DISPATCH_REPORT, { dispatch_ref, claim_token, result }); }
  resolvePayload(payload_ref) { return this.gateway.invoke(APPLICATION_OPERATIONS.PAYLOAD_RESOLVE, { payload_ref }); }
}

export class ApprovalClient {
  constructor(gateway) { this.gateway = gateway; }
  getGrant(approval_ref) { return this.gateway.invoke(APPLICATION_OPERATIONS.APPROVAL_GRANT_GET, { approval_ref }); }
  consume(approval_ref, grant_id, command_id) {
    return this.gateway.invoke(APPLICATION_OPERATIONS.APPROVAL_GRANT_CONSUME, { approval_ref, grant_id, command_id });
  }
}
