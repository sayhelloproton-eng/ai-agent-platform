# Assets

Machine-readable project profiles, JSON Schemas and output templates used by the Skill.

The model separates dynamic Agent Runtime Context from stable Human Knowledge:

```text
context/            -> Context Package -> Agent
docs/knowledge/     -> Knowledge Item   -> Projection Publish -> Feishu
docs/technical/     -> Engineering Documentation
docs/learning/      -> Learning Assets
docs/adr/           -> Architecture Decisions
```

Git is canonical. Feishu is a Projection Target, and only reviewed content under `docs/knowledge/` is eligible for publication. Files must not contain real credentials or tenant-private data.
