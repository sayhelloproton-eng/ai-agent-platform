# ARC-015 多平台执行器与 Usher 适配架构

## 1. 文档定位

本文定义 `ai-agent-platform` 如何看待多种 AI 编码工具的配置差异，并评估 Usher 作为第三方配置同步适配器的边界。Usher 不是 Task Control、Agent Runtime 或多执行器调度器。

## 2. 问题背景

Codex、Claude Code、Gemini CLI、Cursor、Windsurf 和 Cline 对 MCP、Skills 与指令文件采用不同路径和格式。人工分别维护会导致配置漂移、Secret 扩散、Skill 版本分叉和新设备接入成本。

平台需要统一资产真源，但不能把某个第三方同步工具的内部配置直接写入领域模型。

## 3. Usher 当前能力

Usher 的公开定位是从单一配置管理多种 AI 编码工具的 MCP Server 与 Agent Skill，并执行同步和健康检查。它可以：

- 将 MCP 配置写入多个工具的宿主格式；
- 将 Skill 安装到统一位置并链接到各工具；
- 使用系统 Keychain 或受限文件保存凭证；
- 叠加项目级 MCP 配置；
- 通过 `sync` 和 `doctor` 检查配置。

这些能力属于配置分发和宿主适配，不等于任务状态、权限审批、执行 Lease、结果证据或多 Agent 编排。

## 4. 平台适配位置

推荐边界：

```text
Git Agent / Skill / Tool Registry
→ Release Plan
→ Host Configuration Adapter
→ Usher（可选实现）
→ Codex / Claude Code / Gemini CLI / Cursor
```

平台只向 Adapter 提供受控的 Skill、MCP 和凭证引用。Adapter 负责生成宿主格式；Task Control 不直接依赖 Usher。

## 5. 采用条件与风险

引入前需要验证：

- 当前工具版本和配置路径是否匹配；
- 同步是否覆盖用户已有配置；
- Skill 注入是否破坏 AGENTS / CLAUDE 等项目规则；
- 凭证回填是否真的避免明文落盘；
- `sync` 的幂等、Diff、回滚和审计能力；
- Intel macOS 环境的二进制与 Keychain 行为。

在验证完成前，Usher 只能作为候选 Adapter，不写成项目已采用组件。

## 6. 当前事实边界

当前项目没有安装、集成或验证 Usher。多平台配置仍由各 Host 自身规则和人工任务管理。平台已经具备 Git Skill、Registry 和 Agent Profile 设计，但尚无统一 Host Publisher。

## 7. 后续边界

后续可建立只读 PoC：从一个测试 Skill 和一个无 Secret MCP 配置生成 Preview，与 Codex 实际配置做 Diff；通过后再决定是否把 Usher封装为可替换 Adapter。

## 8. 结论与原则

- Usher 是配置同步工具，不是任务编排器。
- Git 仍是 Agent、Skill 和 Tool 配置真源。
- 第三方工具只能位于 Adapter 层。
- 正式采用前必须验证 Diff、幂等、Secret 与回滚。
- 不让配置同步工具获得未授权的任务执行能力。

## 9. 关联资产

- [ARC-010 Execution Lane](./ARC-010-Execution-Lane执行通道模型.md)
- [ARC-012 Agent Profile 与 Skills](./ARC-012-Agent-Profile与Skills资产化.md)
- [CAP-008 Agent 扩展与治理](../02_基础产品与能力/CAP-008-Agent扩展与治理-AGENTSRulesSkillsHooksMCP与Plugins.md)

## 10. 来源

- [Usher GitHub README](https://github.com/vietnamesekid/usher)
