# Skill Engineering Rules

> 作用范围：`skills/**`。本文件细化根项目宪法，不得推翻根 `AGENTS.md`。

## 1. Skill 定位

Skill 是可复用的 Agent 能力资产，不是脚本集合。

每个 Skill 应说明：

- Purpose；
- Problem；
- Target Agent / User；
- Capability Boundary；
- Inputs；
- Outputs；
- Workflow；
- Provider；
- Error Handling；
- Security；
- Examples；
- Tests；
- Limitations；
- Future Evolution。

Skill 不替 Project Owner 做最终决策，也不得把未经验证的内容写成项目事实。

## 2. README.md 与 SKILL.md

### README.md

面向人类开发者，解释：

- 设计与边界；
- 安装和配置；
- 使用方式；
- 示例和测试；
- 维护与演进；
- 相关 Architecture、ADR 和工程资产。

### SKILL.md

面向 Agent Runtime，描述：

- 触发条件；
- 能力和非目标；
- 输入输出；
- 执行流程；
- 工具依赖；
- 安全、确认和停止规则。

README 与 SKILL 不得完全重复，也不得互相替代。详细设计应进入正式文档，运行时规则保持最小且可执行。

## 3. Provider 解耦

Skill 领域能力不得直接绑定：

- 飞书或其他单一知识平台；
- CLI；
- 单一模型；
- 单一 SDK；
- 单一存储。

上层依赖 Capability、Port、Contract 或稳定接口。Provider / Adapter 负责具体鉴权、分页、重试、格式转换和底层错误。

Provider 私有 Token、CLI 输出结构或 SDK 类型不得泄漏到领域模型。

## 4. Schema、Example 与测试

新增或修改 Skill 能力时必须同步检查：

- 输入输出 Schema；
- Example；
- 测试与 Fixtures；
- README；
- SKILL.md；
- Provider 契约和错误表达；
- 相关设计资产和版本记录。

必须报告真实执行的验证命令和结果。未运行的测试不得声称通过；失败或环境缺失必须明确标记。

## 5. 安全与写入

- 默认只读、最小权限和最小上下文；
- 写入必须遵守预览、确认、幂等和回读验收；
- 删除、权限、公开分享、批量移动和历史重写不得自动执行；
- 不在代码、Fixture、Example 或文档中提交真实凭据和租户私有标识；
- 不把第三方完整正文或个人隐私作为测试数据；
- Provider 失败不得伪装为能力成功。

## 6. Skill 专属 AGENTS.md

只有当某个 Skill 具有明显特殊的安全边界、验证命令、Provider 规则或目录约束时，才在其自身目录增加 `AGENTS.md`。

专属规则：

- 只能细化本文件和根宪法；
- 不得降低安全或验证标准；
- 必须说明作用范围和特殊原因；
- 不得复制整份上层规则。

本阶段不创建 `skills/ai-knowledge/AGENTS.md`；是否需要在后续 Skill 重构中决定。

## 7. 修改与验收

修改 Skill 前：

1. 明确能力边界和允许文件；
2. 阅读相关 README、SKILL、Schema、测试、Architecture 和 ADR；
3. 先计划 Contract / Schema、Provider 或安全边界变化；
4. 进行小批次、可 Review 的修改；
5. 运行相关最小测试；
6. 报告 Git diff、验证证据、限制和未完成项。
