---
docId: MODEL-DOC-03-05
title: 09 · Vision 与多模态输入
docType: modality-contract
authority: normative
lifecycle: frozen
domain: model-reasoning
subdomain: null
subdomains: []
provides: []
requires: []
contractRefs: []
---

# 09 · Vision 与多模态输入

## 1. [FROZEN] Vision 不是模型角色

只存在逻辑推理角色：FAST / REASON。

Vision 表示请求含 image input。

## 2. 调用路径

```text
Browser Extension
→ deterministic DOM/URL/runtime facts first
→ need semantic image judgment
→ infer(specRef, mode, typed facts, image)
→ Model Runtime validates role image capability
→ Provider Adapter transforms image payload
→ structured Vision result
```

## 3. [FROZEN] 能力校验

请求 `FAST + image`：FAST role 必须支持 image。

请求 `REASON + image`：REASON role 必须支持 image。

AUTO：只有 Spec 允许时可选择满足 required modalities 的 role。

不满足 → `CAPABILITY_UNSUPPORTED`。

## 4. [FROZEN] 不允许隐式降级

禁止：

```text
图片发送失败
→ 丢掉图片继续文本推理
```

也禁止由 Adapter 把 unsupported image request 改成文字描述后继续。

## 5. [FROZEN] Provider wire format 隔离

上层不关心：

```text
image_url
base64 URI
multipart
provider custom field
```

Adapter 负责转换。

## 6. [FROZEN] Vision 输出也必须 Spec 化

例如 `browser.page-state.v1`：

```text
pageState
activityKind
confidence
recommendedNext (有限枚举)
reasonCode
```

Vision 不能因为有图片就回到开放式聊天模式。

## 7. [FROZEN] 日志

默认不把 image base64 落盘到模型日志。

可以记录：

- mimeType；
- byte size；
- fingerprint；
- 调用领域已有 screenshotRef（如有）。

## 10. File Bridge 的图像非对称性

OpenAI Action 可以把 Conversation 中的用户图片作为 `openaiFileIdRefs` 输入给平台，但 `openaiFileResponse` 不能向 Conversation 返回 image/video。

因此平台侧 screenshot / Browser page image → Vision 的既有路径继续成立；File Bridge 只减少文档/文件型动态上下文 transport，不替代 Model Vision。
