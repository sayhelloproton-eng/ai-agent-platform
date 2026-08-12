---
docId: EXECUTION-EXECUTION-LOCAL-TECH-DESIGN
title: 05 · execution-local 详细技术方案
docType: module-design
authority: normative
lifecycle: frozen
domain: execution
moduleRef: execution-local
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs:
- EXECUTION-EXECUTION-LOCAL-TECH-DESIGN
- EXECUTION-DOC-02-01
---

# 05 · execution-local 详细技术方案

## 1. 定位

`execution-local` 是本机真实 Executor，v1 作为 npm library 被 `execution-runtime` 同进程加载。

它不拥有 Policy/Approval/Task/Model 业务逻辑。

## 2. [FROZEN] P0 Capability Families

```text
Workspace / File
Git
Project / Package / Dependency
Build / Test / Quality
Code Query / CodeGraph
Process / Runtime
Network / Endpoint
Shell / CLI Escape Hatch
```

## 3. Local Execution Envelope

每次 local execute 至少具有：

```text
executionRef
caller/task/worker refs
projectRoot
capability
target
cwd
parameters
controlled env
timeout
maxOutput
```

## 4. Project Path Boundary

路径边界就是当前 `projectRoot`。

所有路径先 canonicalize；symlink/`..`/绝对路径最终真实目标必须仍在 projectRoot。

特殊保留区：

```text
<projectRoot>/.ai-agent-platform/**
```

普通 Worker File/Shell Capability Hard DENY。

项目目录外的 HOME、其他仓库、系统目录默认不可访问。

## 5. File

推荐 typed operations：

```text
readFile
listDirectory
searchFiles
searchText
getFileMetadata
writeFile
createDirectory
movePath
deletePath
```

只读 + scope clear → deterministic。

mutation → FAST；大范围删除、关键配置覆盖、Task 语义明显不一致时升级。

Evidence：path, beforeHash, afterHash, bytes, diffRef。

## 6. Git

```text
getStatus
getDiff
getLog
getCurrentBranch
showCommit
createBranch
checkoutBranch
stage
commit
push
```

只读 deterministic。

正常 mutation FAST。

push 不 blanket human；检查 remote/branch/commit/Task intent。force push / history overwrite / unusual remote → REASON/Human。

## 7. Project / Package / Dependency

```text
getProjectInfo
getPackageManager
getPackageScripts
getDependencies
installDependency
removeDependency
installProjectDependencies
```

install 等不能仅视为 shell，因为可能修改 manifest/lockfile、执行 lifecycle scripts、下载 native code。

Result 应至少报告 package manager、requested package、resolved version、manifest/lockfile change、exit code、log refs。

## 8. Build / Test / Quality

```text
runTests
runBuild
runLint
runTypecheck
runProjectScript
```

默认 FAST，因为 script 名称并不能保证无副作用。

Result：exitCode、duration、可可靠解析的 passed/failed/skipped、reportRefs、stdout/stderr refs。

解析不到统计不要伪造数字。

## 9. Code Query / CodeGraph

```text
findSymbol
findReferences
findCallers
findCallees
findImports
```

v1 read-only deterministic。

底层可先用 `rg` + TypeScript Compiler API / LSP，未来升级 implementation 而不改 capability contract。

## 10. Process / Runtime

```text
startProcess
stopProcess
restartProcess
getProcessStatus
listManagedProcesses
readProcessLogs
checkPort
```

只完整管理平台自己启动的 process。

### One-shot

适用 test/build/install/git/shell。

```text
spawn
→ capture output
→ wait exit/timeout/cancel
→ cleanup process tree
→ result
```

### Managed Process

适用 dev server/API server。

```text
spawn
→ readiness verify
→ return processRef
```

readiness 可为 endpoint/port/logPattern。

processRef 必须是平台管理引用，不能让 Agent 自由 kill arbitrary PID。

## 11. Network / Endpoint

建议 typed capability：

```text
checkEndpoint
httpRequest / healthCheck
```

明确允许 host 的安全 GET/health deterministic。

写方法 FAST。

必须限制：scheme/host/method/redirect/body/credential，防止 redirect 把敏感信息带去未知域。

## 12. Shell / CLI Escape Hatch

`runCommand` 存在，但任何场景都不 deterministic direct。

优先：

```ts
{ command: 'npm', args: ['run', 'test'] }
```

而不是复杂 string shell。

如果包含 `| > >> && || ; $() backticks` 等复杂 shell syntax，风险上调，通常 REASON。

无法静态理解的命令不做“100% shell proving”；让 FAST/REASON/Human 决策。

## 13. Environment / Secret

子进程 env：

```text
safe base env
+ capability-required env
+ project-allowed env
```

不继承整份 runtime `process.env`。

`.env*` 由项目自己的脚本按正常机制加载，但平台不主动把内容送模型。

日志 redaction：Bearer/API key/password/token/cookie/private key。

## 14. Hard DENY

```text
canonical path outside projectRoot
.ai-agent-platform access
sudo/elevation
shutdown/reboot
format/partition
obvious system-wide destruction
platform credential reads
```

## 15. Output / Logging

所有 process-like capability 支持：

```text
timeout
maxOutput
cancel
process tree cleanup
stdout/stderr capture
```

stdout/stderr 完整落盘；API 只回 summary + refs。

建议支持分页读取 output，而不是一次回全量。

## 16. Local UNKNOWN Recovery

- writeFile timeout → read hash；
- git commit lost response → inspect HEAD/log；
- dependency install crash → inspect package.json/lockfile/known side effects；
- managed process response lost → processRef/port/readiness reconcile；
- unknown shell external effect → 无法确认则 UNKNOWN。

任何不能证明 NOT_APPLIED 的副作用都不能盲重跑。

## 17. Carrier File Import / Export 复用现有 File + Network mechanics

Execution 不新增 File Service，也不新增 OpenAI 专用业务实体。

当 Gateway 收到 `openaiFileIdRefs[].download_link` 时，物理获取 bytes 复用现有 Network/File typed capability，并施加：

```text
caller/target scope
HTTPS URL validation
bounded size
MIME/filename validation
hash
timeout
temporary staging
secret/log redaction
```

该 `download_link` 是约 5 分钟的 transient locator，不能持久化为 durable evidence locator。

P0 物理导入预算与 Gateway Config Slot 对齐：单文件最多 `10_000_000` bytes、单次 ingress aggregate 最多 `50_000_000` bytes、每个远端 fetch timeout `15_000ms`。实现采用 streaming → temporary staging，不把全部输入一次性放入内存。`name/mime_type/download_link` 均视为 external-untrusted；filename 不能成为本地路径，MIME 需与实际 bytes/detected type 做校验。Carrier 专用 fetch 仅允许 HTTPS，redirect 需逐跳重验，禁止访问 localhost/private/link-local/metadata endpoint，且不得附带平台 credential。

Fetch timeout / locator expired 只证明 transport/materialization 未完成，不等价于 business Action 未执行；恢复前先查 owning Domain facts 与 idempotency/action/execution result，只有能证明未产生 business mutation 的 transport 才可重试。

当平台需要通过 `openaiFileResponse` URL 方式返回文件时，Execution 只提供/读取现有 artifact/output truth；Gateway 负责生成对 OpenAI 可取的短期 opaque relay。Execution 不因此成为 Gateway transport Owner。

公开互联网 research 不扩展为 Execution 通用 Search capability；Carrier Web Search 处理认知型公开资料检索，Execution Network 保留精确 URL、LAN/localhost、endpoint probe、authenticated engineering request 等确定性能力。
