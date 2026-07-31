# 基础产品与能力

## 目录职责

解释 ChatGPT、Custom GPT、Codex、AGENTS、Rules、Skills、Hooks、MCP 与 Plugins 的产品能力、配置和工程边界。

## 正式资产

| ID | 文件 | 当前状态 |
|---|---|---|
| CAP-001 | `CAP-001-什么是ChatGPT-产品模型与Agent入口.md` | accepted |
| CAP-002 | `CAP-002-ChatGPT产品形态与能力边界.md` | accepted |
| CAP-003 | `CAP-003-ChatGPT配置权限与使用基线.md` | accepted |
| CAP-004 | `CAP-004-CustomGPT产品能力与边界.md` | accepted |
| CAP-005 | `CAP-005-CustomGPT-Instructions-Knowledge-Actions与发布配置.md` | accepted |
| CAP-006 | `CAP-006-Codex产品与执行体系.md` | partial |
| CAP-007 | `CAP-007-Codex配置权限与执行基线.md` | partial |
| CAP-008 | `CAP-008-Agent扩展与治理-AGENTSRulesSkillsHooksMCP与Plugins.md` | partial |

CAP-006～CAP-008 首次落库后等待真实 Commit Review；目录正文在全库发布前保持 `unpublished`。

## 维护规则

- 当前产品事实使用官方来源并记录核验日期；
- 用户账号观察不能写成普遍事实；
- 首次物化为 `partial`，真实 Commit Review 后再决定 `accepted`；
- 系统元数据进入 `platform-registry/`；
- 复杂图在正文冻结后生成；
- Host 产品路径与本仓库 Git 真源分开。
