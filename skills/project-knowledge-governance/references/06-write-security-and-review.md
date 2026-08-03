# Write, Security and Review Gates

A proposal does not authorize a write. Require exact path scope, preview, user confirmation, validation and read-back for formal or external changes. Never auto-delete, move, change permission, publish publicly, force-push or expose secrets. Redact tenant identifiers and personal/private context from public knowledge.

For Feishu projection, no delete or create may occur until Desired Projection and Existing Tree have been compared and `mapping-diff.json` plus `operation-plan.json` exist. The preview must name every reused, created, overwritten and deleted node. Apply must use the exact user-approved confirmation phrase, and readback must verify title, level, parent, text, revision and media counts.

Deletion validates `space_id`, Wiki `node_token`, title and preservation status immediately before execution. A raw Wiki node token is deleted with `lark-cli wiki +node-delete --obj-type wiki`; `docx` describes the carried content object and is not the delete input token type. Missing tokens, conflicting parentage, ambiguous preserved nodes or an operation outside the selected Space are stop conditions.
