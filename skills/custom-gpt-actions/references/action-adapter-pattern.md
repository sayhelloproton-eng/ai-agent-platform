# Action Adapter Pattern

## Problem

Custom GPT Preview may not reproduce internal constants or required fields exactly. Exposing a platform `TaskRequest` asks the model to generate server-owned capability, identity, task ID, input shape, and metadata.

## Stable pattern

Expose a narrow business operation such as zero-parameter `POST /v1/runtime/status`. Do not define a request body when the user supplies no business input.

Construct internal fields on the server:

- contract version;
- unique task ID;
- fixed capability;
- empty or validated input;
- fixed requester type and subject;
- current request timestamp.

Then route the constructed Task through the same authentication, rate limit, concurrency, policy, audit, Runtime Client, and result validation boundaries as the general task endpoint.

## Prohibitions

- Do not accept capability aliases.
- Do not silently rewrite arbitrary general Tasks.
- Do not let client body fields override server-owned values.
- Do not forward the external Authorization header to the Runtime.
- Do not weaken the general `/v1/tasks` Contract for Builder compatibility.
