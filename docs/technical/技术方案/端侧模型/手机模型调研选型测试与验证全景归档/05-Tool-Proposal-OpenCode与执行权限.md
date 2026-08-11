# 05｜Tool Proposal、OpenCode 与执行权限

> 核心问题：为什么 native Tool Calling 失败，但手机模型仍然可以安全参与工具工作流？

## 1. Native OpenAI Tool Calling 的真实结论

MLXHub 对 FAST/REASON 的标准 OpenAI：

```text
tools
tool_choice=required
message.tool_calls
```

没有形成可靠链路。

OpenCode PURE CRUD v2 中：

```text
OpenCode 1.18.15
--pure
MCP disabled
Claude compatibility disabled

PURE PING          PASS
CRUD               FAIL
observed_tools     []
filesystem_pass    false
raw API HTTP       200
tool_calls_present false
```

因此冻结：

```text
MLXHub native tools/tool_calls = unsupported dependency
```

除非 MLXHub 版本或 Serving 配置实质变化，不重复这一测试。

## 2. 为什么这不等于 Qwen 没有工具能力

脱离 native parser 以后，Qwen FAST 已通过统一 JSON Tool Proposal：

```text
lookup_private_value
read_file
write_file
run_command
```

验证过：

- tool selection；
- 参数提取；
- no-tool；
- unknown-tool 不编造；
- missing required arg 由 Adapter 拒绝；
- Tool Result 回灌后正确消费结果。

fake tool result `TEST-92817` 回灌后，模型能在最终答案中保持该值。

## 3. Schema 漂移和 Compatibility Adapter

曾观察到：

```json
{"function":"run_command","arguments":"npm test"}
```

而正式结构期望：

```json
{"function":"run_command","arguments":{"command":"npm test"}}
```

因此允许的是：

```text
bounded Normalize
→ JSON Schema Validate again
```

禁止：

```text
“模型差不多说对了”
→ 直接执行副作用
```

## 4. 权限边界实测

```text
read_file       -> ALLOW
write_file      -> REQUIRE_APPROVAL
run_command     -> REQUIRE_APPROVAL
/etc/hosts      -> BLOCK / PATH_OUTSIDE_REPOSITORY
sudo rm -rf /   -> BLOCK / DANGEROUS_COMMAND
```

手机模型本身没有 Mac FS / shell 权限。

## 5. 真实文件写入 E2E

受控链路曾真实执行：

```text
User Intent
→ iPhone Qwen
→ Tool Proposal
→ Normalize / Schema / Scope / Policy / Approval
→ Mac Host Execute
→ Readback
→ Qwen consumes result
```

测试文件内容从：

```text
hello-qwen-tool-e2e
```

变为：

```text
hello-qwen-direct-write-v2
```

这证明的是“**Proposal → 受控 Host 执行**”可行，不是“手机模型天然拥有写权限”。

## 6. OpenCode 的最终定位

OpenCode 可以用 custom OpenAI-compatible Provider 调用 MLXHub FAST；配置 `modalities` 后 Vision 也能进入模型。

但因为 native tool_calls 链不可靠，当前不能把：

```text
Phone Model -> OpenCode bash/edit
```

作为平台能力。

如果未来把 OpenCode 当 Executor，边界必须是：

```text
Qwen Proposal
→ Platform Runtime Capability / Scope
→ Policy
→ Approval
→ OpenCode Executor
→ Result / Evidence
```

## 7. OpenCode PING 的延迟误读

PURE PING 外层 CLI 曾记录 `63.574s`，但后续事件级检查发现模型 step→text 只有约数秒。CLI 启动、agent 生命周期等成本不能全部归因于手机推理。

这也是为什么性能证据必须区分：

```text
client wall time
provider request time
model decode time
```
