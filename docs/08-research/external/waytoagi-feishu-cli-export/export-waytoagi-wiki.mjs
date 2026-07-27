#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";

const ROOT_URL = "https://waytoagi.feishu.cn/wiki/Zsp2wxsKEiRTEjkajJFc7FBGnh3";
const TENANT_ORIGIN = "https://waytoagi.feishu.cn";
const OUTPUT_DIR = resolve("docs/08-research/external/waytoagi-feishu-cli-export");
const PAGES_DIR = join(OUTPUT_DIR, "pages");

mkdirSync(PAGES_DIR, { recursive: true });

function runLark(args, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const stdout = execFileSync("lark-cli", args, {
        encoding: "utf8",
        maxBuffer: 128 * 1024 * 1024,
        stdio: ["ignore", "pipe", "pipe"],
      });
      const result = JSON.parse(stdout);
      if (!result.ok) {
        throw new Error(result.error?.message || JSON.stringify(result.error || result));
      }
      return result;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        const waitUntil = Date.now() + attempt * 750;
        while (Date.now() < waitUntil) {
          // Short synchronous backoff keeps this one-off collector simple.
        }
      }
    }
  }
  const stderr = lastError?.stderr?.toString().trim();
  throw new Error(stderr || lastError?.message || String(lastError));
}

function nodeUrl(nodeToken) {
  return `${TENANT_ORIGIN}/wiki/${nodeToken}`;
}

function getNode(nodeTokenOrUrl) {
  return runLark([
    "wiki",
    "+node-get",
    "--node-token",
    nodeTokenOrUrl,
    "--as",
    "user",
    "--format",
    "json",
  ]).data;
}

function listChildren(spaceId, parentNodeToken) {
  return (
    runLark([
      "wiki",
      "+node-list",
      "--space-id",
      spaceId,
      "--parent-node-token",
      parentNodeToken,
      "--as",
      "user",
      "--page-all",
      "--page-limit",
      "0",
      "--format",
      "json",
    ]).data.nodes || []
  );
}

function fetchMarkdown(url) {
  const result = runLark([
    "docs",
    "+fetch",
    "--doc",
    url,
    "--doc-format",
    "markdown",
    "--detail",
    "simple",
    "--as",
    "user",
    "--format",
    "json",
  ]);
  const content = result.data?.document?.content;
  if (typeof content !== "string") {
    throw new Error("docs +fetch returned no Markdown content");
  }
  return content;
}

function exportMarkdownFallback(url) {
  const temporaryDirectory = mkdtempSync(join(tmpdir(), "lark-wiki-export-"));
  try {
    runLark([
      "drive",
      "+export",
      "--url",
      url,
      "--file-extension",
      "markdown",
      "--output-dir",
      temporaryDirectory,
      "--as",
      "user",
      "--format",
      "json",
    ]);
    const markdownFiles = readdirSync(temporaryDirectory).filter((file) =>
      file.toLowerCase().endsWith(".md"),
    );
    if (markdownFiles.length !== 1) {
      throw new Error(`drive +export produced ${markdownFiles.length} Markdown files`);
    }
    return readFileSync(join(temporaryDirectory, markdownFiles[0]), "utf8");
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

function yamlString(value) {
  return JSON.stringify(value == null ? "" : String(value));
}

function safeFilename(title) {
  const cleaned = String(title || "未命名页面")
    .replaceAll("/", "／")
    .replaceAll("\\", "＼")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/g, "");
  return [...(cleaned || "未命名页面")].slice(0, 100).join("");
}

function pageMarkdown(node, body, exportError = "") {
  const title = node.title || `${node.obj_type || "page"}-${node.node_token.slice(0, 8)}`;
  const frontmatter = [
    "---",
    `title: ${yamlString(title)}`,
    `node_token: ${yamlString(node.node_token)}`,
    `obj_token: ${yamlString(node.obj_token)}`,
    `source_url: ${yamlString(node.url)}`,
    `updated_time: ${yamlString(node.updated_time)}`,
  ];
  if (exportError) {
    frontmatter.push(`export_error: ${yamlString(exportError)}`);
  }
  frontmatter.push("---", "", `# ${title}`, "", "## 正文", "");
  return `${frontmatter.join("\n")}${body}${body.endsWith("\n") ? "" : "\n"}`;
}

function treeLines(root, childrenByParent) {
  const lines = [root.title || "未命名页面"];
  function appendChildren(parentToken, prefix) {
    const children = childrenByParent.get(parentToken) || [];
    children.forEach((child, index) => {
      const last = index === children.length - 1;
      lines.push(`${prefix}${last ? "└── " : "├── "}${child.title || "未命名页面"}`);
      appendChildren(child.node_token, `${prefix}${last ? "    " : "│   "}`);
    });
  }
  appendChildren(root.node_token, "");
  return `${lines.join("\n")}\n`;
}

const rootDetail = getNode(ROOT_URL);
const root = {
  node_token: rootDetail.node_token,
  obj_token: rootDetail.obj_token,
  title: rootDetail.title,
  parent_node: rootDetail.parent_node_token || "",
  node_type: rootDetail.node_type,
  obj_type: rootDetail.obj_type,
  url: ROOT_URL,
  has_child: Boolean(rootDetail.has_child),
  updated_time: rootDetail.updated_at || "",
  depth: 0,
};

const nodes = [root];
const childrenByParent = new Map();
const queue = [root];
const seenTokens = new Set([root.node_token]);

console.log(`Root: ${root.title} (${root.node_token})`);

while (queue.length > 0) {
  const parent = queue.shift();
  if (!parent.has_child) continue;
  const listedChildren = listChildren(rootDetail.space_id, parent.node_token);
  const children = [];
  for (const listed of listedChildren) {
    if (seenTokens.has(listed.node_token)) {
      throw new Error(`Duplicate node token in tree: ${listed.node_token}`);
    }
    const detail = getNode(listed.node_token);
    const child = {
      node_token: detail.node_token,
      obj_token: detail.obj_token,
      title: detail.title || listed.title || "",
      parent_node: detail.parent_node_token || parent.node_token,
      node_type: detail.node_type || listed.node_type,
      obj_type: detail.obj_type || listed.obj_type,
      url: nodeUrl(detail.node_token),
      has_child: Boolean(detail.has_child),
      updated_time: detail.updated_at || "",
      depth: parent.depth + 1,
    };
    seenTokens.add(child.node_token);
    nodes.push(child);
    children.push(child);
    queue.push(child);
  }
  childrenByParent.set(parent.node_token, children);
  console.log(`Tree: ${nodes.length} node(s) discovered`);
}

const spaceInfo = {
  url: ROOT_URL,
  space_id: rootDetail.space_id,
  wiki_token: root.node_token,
  root_node_token: root.node_token,
  root_obj_token: root.obj_token,
  title: root.title,
};

writeFileSync(join(OUTPUT_DIR, "space-info.json"), `${JSON.stringify(spaceInfo, null, 2)}\n`);
writeFileSync(join(OUTPUT_DIR, "wiki-tree.json"), `${JSON.stringify(nodes, null, 2)}\n`);
writeFileSync(join(OUTPUT_DIR, "wiki-tree.md"), treeLines(root, childrenByParent));

const failures = [];
const pageFiles = [];
for (let index = 0; index < nodes.length; index += 1) {
  const node = nodes[index];
  const number = String(index + 1).padStart(3, "0");
  const title = node.title || `${node.obj_type || "page"}-${node.node_token.slice(0, 8)}`;
  const filename = `${number}-${safeFilename(title)}.md`;
  let body = "";
  let exportError = "";
  try {
    body = fetchMarkdown(node.url);
  } catch (fetchError) {
    try {
      body = exportMarkdownFallback(node.url);
    } catch (fallbackError) {
      exportError =
        `docs +fetch: ${fetchError.message}; drive +export: ${fallbackError.message}`.replace(
          /\s+/g,
          " ",
        );
      body = `> 原始 Markdown 正文读取失败：${exportError}\n`;
      failures.push({
        title,
        node_token: node.node_token,
        obj_type: node.obj_type,
        filename,
        error: exportError,
      });
    }
  }
  writeFileSync(join(PAGES_DIR, filename), pageMarkdown(node, body, exportError));
  pageFiles.push(filename);
  console.log(
    `Page ${index + 1}/${nodes.length}: ${exportError ? "FAILED" : "OK"} ${basename(filename)}`,
  );
}

const duplicateFilenames = pageFiles.filter(
  (filename, index) => pageFiles.indexOf(filename) !== index,
);
const diskPageFiles = readdirSync(PAGES_DIR)
  .filter((file) => file.endsWith(".md"))
  .sort();
const invalidPages = [];
for (const filename of diskPageFiles) {
  const content = readFileSync(join(PAGES_DIR, filename), "utf8");
  const required = [
    /^---\n/,
    /^title: /m,
    /^node_token: /m,
    /^obj_token: /m,
    /^source_url: /m,
    /^updated_time: /m,
    /^## 正文$/m,
  ];
  if (required.some((pattern) => !pattern.test(content))) {
    invalidPages.push(filename);
  }
}

const integrity = {
  tree_node_count: nodes.length,
  pages_markdown_count: diskPageFiles.length,
  counts_match: nodes.length === diskPageFiles.length,
  pages_with_required_metadata_and_markdown: diskPageFiles.length - invalidPages.length,
  invalid_pages: invalidPages,
  duplicate_filenames: [...new Set(duplicateFilenames)],
  duplicate_node_tokens: [],
  pages_with_source_markdown: nodes.length - failures.length,
  pages_with_error_placeholder: failures.length,
  error_placeholder_files: failures.map((failure) => failure.filename).filter(Boolean),
  failed_nodes: failures.length,
  complete:
    nodes.length === diskPageFiles.length &&
    invalidPages.length === 0 &&
    duplicateFilenames.length === 0 &&
    failures.length === 0,
};
writeFileSync(
  join(OUTPUT_DIR, "integrity-check.json"),
  `${JSON.stringify(integrity, null, 2)}\n`,
);

const failureSection =
  failures.length === 0
    ? "无。\n"
    : `${failures
        .map(
          (failure) =>
            `- title: ${failure.title}\n  - node_token: ${failure.node_token}\n  - error: ${failure.error}`,
        )
        .join("\n")}\n`;

const report = `# WaytoAGI Feishu Wiki Export Report

## 基础信息

Wiki: ${root.title}

URL: ${ROOT_URL}

Space ID: ${rootDetail.space_id}

## 采集统计

总节点数量：${nodes.length}

成功获取：${nodes.length - failures.length}

失败数量：${failures.length}

## 文件输出

目录：${OUTPUT_DIR}

pages 数量：${diskPageFiles.length}

## 完整性检查

- wiki-tree.json 节点数量：${nodes.length}
- pages Markdown 文件数量：${diskPageFiles.length}
- 数量一致：${integrity.counts_match ? "是" : "否"}
- metadata / markdown 结构有效：${invalidPages.length === 0 ? "是" : "否"}
- 包含原始 Markdown 正文：${nodes.length - failures.length}
- 失败占位 Markdown：${failures.length}
- 重复文件名：${duplicateFilenames.length}
- 重复 node_token：0
- 完整镜像成功：${integrity.complete ? "是" : "否"}

## 执行命令

\`\`\`bash
lark-cli wiki +node-get --node-token <wiki-url-or-node-token> --as user --format json
lark-cli wiki +node-list --space-id ${rootDetail.space_id} --parent-node-token <node-token> --as user --page-all --page-limit 0 --format json
lark-cli docs +fetch --doc <wiki-url> --doc-format markdown --detail simple --as user --format json
lark-cli drive +export --url <wiki-url> --file-extension markdown --output-dir <temporary-directory> --as user --format json
node docs/08-research/external/waytoagi-feishu-cli-export/export-waytoagi-wiki.mjs
\`\`\`

所有飞书命令均为只读查询或导出；未执行创建、更新、删除、授权或权限修改。

## 失败记录

${failureSection}`;

writeFileSync(join(OUTPUT_DIR, "export-report.md"), report);

console.log(JSON.stringify({ spaceInfo, integrity }, null, 2));
