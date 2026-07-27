---
asset_id: EXP-001
asset_type: experiment
status: validated
evidence_level: verified
canonical_path: docs/09-experiments/EXP-001-public-feishu-wiki-read.md
related_assets: [RSH-001, SKL-001]
---

# EXP-001 Public Feishu Wiki Read

## Goal

验证官方 `lark-cli` 是否可读取其他租户允许公开访问的 Wiki，而不是依赖网页抓取。

## Environment

- `lark-cli 1.0.77`
- 已验证 user / bot access token
- 目标：WaytoAGI 公开 Wiki 根节点

## Steps and Results

- Wiki URL 解析成功，得到 Space、Wiki Node 和 Docx Token。
- user 与 bot identity 均能读取节点和正文。
- outline、完整 Markdown 和 29 个直接子节点读取成功。
- 整个过程未创建、修改或删除飞书数据。

## Limitations

- 结果不是匿名访问；CLI 仍使用有效应用身份。
- 公开网页不保证所有对象都能被 OpenAPI 读取。
- 不同对象类型不能统一使用 `docs +fetch`。

## Conclusion

在具备有效身份和目标资源允许访问的前提下，官方 CLI 可以跨租户读取 Wiki / Docx。该结论支持 Feishu Provider，但不支持匿名抓取或绕过权限。
