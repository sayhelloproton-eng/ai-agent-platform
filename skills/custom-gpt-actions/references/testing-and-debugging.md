# Testing and Debugging

## Required sequence

1. **Local structure validation**
   - generate the resolved OpenAPI;
   - assert `components` and `securitySchemes` are mappings;
   - reject empty or invalid `schemas`;
   - resolve every local `$ref`;
   - assert the exact path, method, `operationId`, request body boundary, security, and response properties;
   - verify the resolved file contains no credential.
2. **Builder parsing**
   - import the resolved Schema;
   - confirm the Builder lists only the intended operation;
   - treat every Builder validation message as evidence of an unsupported or ambiguous Schema shape.
3. **Preview real call**
   - configure the existing Bearer Key through Builder Authentication;
   - invoke the intended operation;
   - confirm a real network Action occurred;
   - validate status and safe business response fields without exposing credentials or full diagnostic bodies.

Do not skip from local validation directly to claiming compatibility. A successful Builder parse is distinct from a successful authenticated Preview call.

## Debugging discipline

Reduce the failing Schema to the smallest compatible structure without inventing unused definitions. Fix the Schema or server adapter boundary; do not relax internal Contracts merely to make Preview pass.
