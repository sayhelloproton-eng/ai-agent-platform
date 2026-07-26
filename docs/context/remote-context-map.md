# Remote Context Map

## GitHub

- Repository: `sayhelloproton-eng/ai-agent-platform`
- URL: https://github.com/sayhelloproton-eng/ai-agent-platform
- Visibility: `PRIVATE`
- Default Branch: `main`
- Current Commit: `c5ea37bb14a724798ff8628fc6b2d367135d02e3`
- Remote: `git@github.com:sayhelloproton-eng/ai-agent-platform.git`

## Feishu

- Space: 智能体工程探索
- Space ID: `<FEISHU_SPACE_ID>`
- Homepage: https://<FEISHU_TENANT>.feishu.cn/docx/<FEISHU_HOME_DOCX_TOKEN>
- Project Status Document: https://<FEISHU_TENANT>.feishu.cn/wiki/<FEISHU_PROJECT_STATUS_WIKI_TOKEN>
  - Wiki Node Token: `<FEISHU_PROJECT_STATUS_WIKI_TOKEN>`
  - Docx Token: `<FEISHU_PROJECT_STATUS_DOCX_TOKEN>`
- Context Sync Research: https://<FEISHU_TENANT>.feishu.cn/wiki/<FEISHU_CONTEXT_SYNC_WIKI_TOKEN>
  - Wiki Node Token: `<FEISHU_CONTEXT_SYNC_WIKI_TOKEN>`
  - Docx Token: `<FEISHU_CONTEXT_SYNC_DOCX_TOKEN>`
- ADR-001: https://<FEISHU_TENANT>.feishu.cn/wiki/<FEISHU_ADR_001_WIKI_TOKEN>
  - Wiki Node Token: `<FEISHU_ADR_001_WIKI_TOKEN>`
  - Docx Token: `<FEISHU_ADR_001_DOCX_TOKEN>`
- GitHub Initialization Record: https://<FEISHU_TENANT>.feishu.cn/wiki/<FEISHU_ENGINEERING_WIKI_TOKEN>
  - Wiki Node Token: `<FEISHU_ENGINEERING_WIKI_TOKEN>`
  - Docx Token: `<FEISHU_ENGINEERING_DOCX_TOKEN>`
- Latest Agent Log: https://<FEISHU_TENANT>.feishu.cn/wiki/<FEISHU_AGENT_LOG_WIKI_TOKEN>
  - Wiki Node Token: `<FEISHU_AGENT_LOG_WIKI_TOKEN>`
  - Docx Token: `<FEISHU_AGENT_LOG_DOCX_TOKEN>`

## Source-of-Truth Rules

| Asset Type | Primary Source |
|---|---|
| Code / Skill / Script / Schema | GitHub |
| Project background / decisions / progress | Feishu |
| Active discussion | ChatGPT Project |
| Executable current task | Git `docs/context/current-task.md` + Feishu status |

## Recovery Order

1. 克隆 GitHub 仓库并检出默认分支。
2. 阅读 `README.md`、`docs/context/project-context.md` 和 `docs/context/current-task.md`。
3. 登录飞书，读取首页、项目状态和相关 ADR。
4. 让 Agent 基于 Knowledge Index 获取最小必要上下文。
