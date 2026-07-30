# OpenAPI Builder Compatibility

OpenAI documents that GPT Actions use authentication plus an OpenAPI Schema, recommends testing Actions in Preview, and points to the official ActionsGPT for Schema help. This repository Skill complements that official aid by preserving project-specific rules verified against the Builder: [Configuring actions in GPTs](https://help.openai.com/en/articles/9442513-gpt-actions-domain-settings-chatgpt-enterprise).

## Verified structural rules

- Treat Builder support as potentially stricter than a general OpenAPI validator.
- Every `type: object` must define meaningful `properties`.
- `components` must be a mapping object.
- `components.securitySchemes` must be a mapping object with named schemes.
- GPT Builder 当前要求 `components.schemas` 显式存在且为对象，即使没有复用 Schema 也要写成内联空映射 `schemas: {}`。
- Never omit `components.schemas` or emit `schemas:`, `schemas: []`, or `schemas: null`.
- When shared Schema definitions are used, `components.schemas` must remain a non-array mapping of named Schema objects.
- Resolve every local `$ref` before importing the Schema.
- Keep `operationId` unique and expose only the intended Action operation.

## Authentication

Describe Bearer authentication through a named HTTP security scheme. Configure the actual API Key in Builder Authentication. Never place a Key, Authorization value, or example credential in the Schema.
