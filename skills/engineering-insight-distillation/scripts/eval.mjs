#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, "..");

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function rel(file) {
  return path.relative(root, file).split(path.sep).join("/");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function validateScreening(value) {
  const decisions = new Set(["proceed_full", "needs_evidence", "reject"]);
  const levels = new Set(["low", "medium", "high"]);
  const readiness = new Set(["insufficient", "partial", "sufficient"]);

  assert(value && typeof value === "object", "screening result must be an object");
  assert(value.schema_version === "1.0", "screening schema_version must be 1.0");
  assert(typeof value.candidate_id === "string" && value.candidate_id.length >= 3, "candidate_id is required");
  assert(decisions.has(value.decision), "invalid screening decision");
  assert(levels.has(value.retention_value), "invalid retention_value");
  assert(levels.has(value.materiality), "invalid materiality");
  assert(levels.has(value.transferability), "invalid transferability");
  assert(readiness.has(value.evidence_readiness), "invalid evidence_readiness");
  assert(Array.isArray(value.signals), "signals must be an array");
  assert(typeof value.rationale === "string" && value.rationale.length >= 20, "screening rationale is too short");
  assert(Array.isArray(value.missing_evidence), "missing_evidence must be an array");
  assert(typeof value.recommended_next_step === "string" && value.recommended_next_step.length >= 10, "recommended_next_step is too short");

  if (value.decision === "proceed_full") {
    assert(value.retention_value !== "low", "proceed_full cannot have low retention value");
    assert(value.transferability !== "low", "proceed_full cannot have low transferability");
    assert(value.evidence_readiness !== "insufficient", "proceed_full requires at least partial evidence");
  }
  if (value.decision === "needs_evidence") {
    assert(value.missing_evidence.length > 0, "needs_evidence requires missing evidence");
  }
  if (value.decision === "reject") {
    assert(value.retention_value === "low", "reject requires low retention value");
  }
}

function validateResult(value) {
  const statuses = new Set(["insight_proposed", "needs_evidence", "rejected"]);
  assert(value && typeof value === "object", "distillation result must be an object");
  assert(value.schema_version === "1.1", "distillation schema_version must be 1.1");
  assert(statuses.has(value.result_status), "invalid result_status");
  assert(value.quality_gates && typeof value.quality_gates === "object", "quality_gates are required");
  assert(Array.isArray(value.unresolved_uncertainties), "unresolved_uncertainties must be an array");
  assert(Array.isArray(value.missing_evidence), "missing_evidence must be an array");

  if (value.result_status === "insight_proposed") {
    assert(value.insight && typeof value.insight === "object", "insight_proposed requires insight");
    const insight = value.insight;
    validateInsight(insight);
    assert(insight.lifecycle_status === "active" || insight.lifecycle_status === "revised" || insight.lifecycle_status === "deprecated", "invalid lifecycle_status");
    assert(["candidate", "provisional", "validated", "repeated", "established"].includes(insight.maturity_level), "invalid maturity_level");
    assert(Array.isArray(insight.occurrences) && insight.occurrences.length > 0, "insight requires occurrences");
    if (["repeated", "established"].includes(insight.maturity_level)) {
      assert(insight.occurrences.length >= 2, "repeated or established requires at least two occurrences");
    }
    if (insight.maturity_level === "established") {
      assert(insight.governance?.approval_status === "approved", "established requires approved governance");
    }
    assert(value.rejection_reason === null, "insight_proposed cannot contain rejection_reason");
  }

  if (value.result_status === "needs_evidence") {
    assert(value.insight === null, "needs_evidence requires insight=null");
    assert(value.missing_evidence.length > 0, "needs_evidence requires missing evidence");
  }

  if (value.result_status === "rejected") {
    assert(value.insight === null, "rejected requires insight=null");
    assert(typeof value.rejection_reason === "string" && value.rejection_reason.length >= 10, "rejected requires rejection_reason");
  }
}


function validateInsight(insight) {
  assert(insight && typeof insight === "object", "engineering insight must be an object");
  assert(insight.schema_version === "1.1", "insight schema_version must be 1.1");
  assert(/^EI-[A-Z0-9_-]{3,63}$/.test(insight.insight_id), "invalid insight_id");
  assert(typeof insight.title === "string" && insight.title.length >= 8, "insight title is too short");
  assert(["judgment", "pattern", "anti_pattern", "heuristic", "checklist"].includes(insight.primary_type), "invalid primary_type");
  assert(["candidate", "provisional", "validated", "repeated", "established"].includes(insight.maturity_level), "invalid maturity_level");
  assert(["active", "revised", "deprecated"].includes(insight.lifecycle_status), "invalid lifecycle_status");
  assert(["low", "medium", "high"].includes(insight.evidence_strength), "invalid evidence_strength");
  assert(Array.isArray(insight.source_references) && insight.source_references.length > 0, "insight requires source_references");
  assert(Array.isArray(insight.occurrences) && insight.occurrences.length > 0, "insight requires occurrences");
  assert(insight.governance && typeof insight.governance === "object", "insight requires governance");

  if (["repeated", "established"].includes(insight.maturity_level)) {
    assert(insight.occurrences.length >= 2, "repeated or established requires at least two occurrences");
  }
  if (insight.maturity_level === "established") {
    assert(insight.governance.approval_status === "approved", "established requires approved governance");
  }
}

function validateRegistry(rootPath) {
  const registryRoot = path.resolve(rootPath);
  const registry = readJson(path.join(registryRoot, "registry.json"));
  const governance = readJson(path.join(registryRoot, "governance.json"));
  const relationships = readJson(path.join(registryRoot, "relationships.json"));

  assert(registry.schema_version === "1.0", "registry schema_version must be 1.0");
  assert(typeof registry.registry_id === "string" && registry.registry_id.length >= 3, "registry_id is required");
  assert(Array.isArray(registry.insights), "registry insights must be an array");
  assert(registry.insight_count === registry.insights.length, "registry insight_count mismatch");
  assert(governance.schema_version === "1.0", "governance schema_version must be 1.0");
  assert(Array.isArray(relationships.relationships), "relationships must be an array");

  const ids = new Set();
  const paths = new Set();
  const loaded = new Map();

  for (const item of registry.insights) {
    assert(!ids.has(item.insight_id), `duplicate registry insight_id: ${item.insight_id}`);
    assert(!paths.has(item.path), `duplicate registry path: ${item.path}`);
    ids.add(item.insight_id);
    paths.add(item.path);

    const fullPath = path.join(registryRoot, item.path);
    assert(fs.existsSync(fullPath), `missing insight file: ${item.path}`);
    const insight = readJson(fullPath);
    validateInsight(insight);

    assert(insight.insight_id === item.insight_id, `insight_id mismatch: ${item.insight_id}`);
    assert(insight.title === item.title, `title mismatch: ${item.insight_id}`);
    assert(insight.primary_type === item.primary_type, `primary_type mismatch: ${item.insight_id}`);
    assert(insight.maturity_level === item.maturity_level, `maturity mismatch: ${item.insight_id}`);
    assert(insight.lifecycle_status === item.lifecycle_status, `lifecycle mismatch: ${item.insight_id}`);
    assert(insight.evidence_strength === item.evidence_strength, `evidence mismatch: ${item.insight_id}`);
    assert(insight.governance.approval_status === item.approval_status, `approval mismatch: ${item.insight_id}`);
    loaded.set(item.insight_id, insight);
  }

  for (const edge of relationships.relationships) {
    assert(ids.has(edge.from), `relationship source not found: ${edge.from}`);
    assert(ids.has(edge.to), `relationship target not found: ${edge.to}`);
    assert(edge.from !== edge.to, `self relationship is not allowed: ${edge.from}`);
    assert(typeof edge.type === "string" && edge.type.length >= 3, "relationship type is required");
  }

  return {
    registry_id: registry.registry_id,
    registry_version: registry.registry_version,
    insights: ids.size,
    relationships: relationships.relationships.length,
    delegation_status: governance.review_authority?.delegation?.status ?? "unknown",
  };
}

function scoreTriggers(predictionsFile) {
  const cases = readJson(path.join(root, "tests/evals/trigger-cases.json"));
  const predictions = readJson(predictionsFile);
  const map = new Map(predictions.map((item) => [item.id, Boolean(item.predicted_trigger)]));

  let tp = 0, fp = 0, fn = 0, tn = 0;
  for (const item of cases) {
    assert(map.has(item.id), `missing trigger prediction: ${item.id}`);
    const predicted = map.get(item.id);
    if (item.should_trigger && predicted) tp++;
    else if (!item.should_trigger && predicted) fp++;
    else if (item.should_trigger && !predicted) fn++;
    else tn++;
  }

  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  return { tp, fp, fn, tn, precision, recall, f1, accuracy: (tp + tn) / cases.length };
}

function scoreRubric(scoresFile) {
  const rubric = readJson(path.join(root, "tests/evals/rubric.json"));
  const rows = readJson(scoresFile);
  const dimensions = Object.keys(rubric.dimensions);
  const grouped = new Map();

  for (const row of rows) {
    assert(row.case_id && row.variant, "rubric score requires case_id and variant");
    let total = 0;
    for (const dim of dimensions) {
      const value = row.scores?.[dim];
      assert(Number.isInteger(value) && value >= 0 && value <= 2, `invalid score ${row.case_id}/${row.variant}/${dim}`);
      total += value;
    }
    const list = grouped.get(row.variant) ?? [];
    list.push(total);
    grouped.set(row.variant, list);
  }

  const summary = {};
  for (const [variant, values] of grouped) {
    summary[variant] = {
      cases: values.length,
      average: values.reduce((a, b) => a + b, 0) / values.length,
      max_per_case: dimensions.length * 2,
    };
  }
  return summary;
}

function selfTest() {
  const manifest = readJson(path.join(root, "MANIFEST.json"));
  const actual = walk(root)
    .filter((file) => rel(file) !== "MANIFEST.json")
    .map(rel)
    .concat(["MANIFEST.json"])
    .sort();
  const declared = [...manifest.files].sort();
  assert(JSON.stringify(actual) === JSON.stringify(declared), "manifest file list does not match actual files");
  assert(manifest.file_count === actual.length, "manifest file_count is incorrect");

  for (const file of walk(path.join(root, "assets/schemas"))) {
    if (file.endsWith(".json")) readJson(file);
  }

  const forbidden = [
    ["Microsoft", " Dev Tunnels"].join(""),
    ["Cloud", "flare"].join(""),
    ["/v1/", "tasks"].join(""),
    ["/v1/runtime/", "status"].join(""),
  ];
  for (const file of walk(root)) {
    const relative = rel(file);
    if (relative.startsWith("tests/")) continue;
    const text = fs.readFileSync(file, "utf8");
    for (const token of forbidden) {
      assert(!text.includes(token), `project-bound token outside tests: ${relative} -> ${token}`);
    }
  }

  const triggerCases = readJson(path.join(root, "tests/evals/trigger-cases.json"));
  assert(triggerCases.filter((item) => item.should_trigger).length >= 8, "trigger set needs more positive cases");
  assert(triggerCases.filter((item) => !item.should_trigger).length >= 8, "trigger set needs more negative cases");

  const screeningDir = path.join(root, "tests/evals/pilot-02/screening-outputs");
  const expectedScreening = readJson(path.join(root, "tests/evals/pilot-02/expected-decisions.json"));
  for (const expected of expectedScreening) {
    const result = readJson(path.join(screeningDir, `${expected.case_id}.json`));
    validateScreening(result);
    assert(result.decision === expected.decision, `screening decision mismatch for ${expected.case_id}`);
  }

  const resultDir = path.join(root, "tests/evals/pilot-01/skill-outputs");
  const statusCounts = { insight_proposed: 0, needs_evidence: 0, rejected: 0 };
  for (const file of walk(resultDir).filter((item) => item.endsWith(".json"))) {
    const result = readJson(file);
    validateResult(result);
    statusCounts[result.result_status]++;
  }
  assert(statusCounts.insight_proposed === 5, "pilot-01 must contain five insight proposals");
  assert(statusCounts.needs_evidence === 1, "pilot-01 must contain one needs_evidence result");
  assert(statusCounts.rejected === 1, "pilot-01 must contain one rejected result");

  const triggerMetrics = scoreTriggers(path.join(root, "tests/evals/sample-trigger-predictions.json"));
  assert(triggerMetrics.f1 === 1, "sample trigger predictions must score perfectly");

  const rubricSummary = scoreRubric(path.join(root, "tests/evals/sample-rubric-scores.json"));
  assert(rubricSummary.skill && rubricSummary.baseline, "sample rubric scores need baseline and skill variants");

  return {
    manifest_files: actual.length,
    trigger_cases: triggerCases.length,
    screening_cases: expectedScreening.length,
    pilot_status_counts: statusCounts,
    sample_trigger_metrics: triggerMetrics,
    sample_rubric_summary: rubricSummary,
  };
}

function usage() {
  console.log(`Usage:
  node scripts/eval.mjs self-test
  node scripts/eval.mjs score-triggers <predictions.json>
  node scripts/eval.mjs score-rubric <scores.json>
  node scripts/eval.mjs validate-screening <screening-result.json>
  node scripts/eval.mjs validate-result <distillation-result.json>
  node scripts/eval.mjs validate-insight <engineering-insight.json>
  node scripts/eval.mjs validate-registry <engineering-insight-registry-root>`);
}

try {
  const [command = "self-test", file] = process.argv.slice(2);
  if (command === "self-test") {
    console.log(JSON.stringify({ ok: true, ...selfTest() }, null, 2));
  } else if (command === "score-triggers") {
    assert(file, "predictions file is required");
    console.log(JSON.stringify(scoreTriggers(path.resolve(file)), null, 2));
  } else if (command === "score-rubric") {
    assert(file, "scores file is required");
    console.log(JSON.stringify(scoreRubric(path.resolve(file)), null, 2));
  } else if (command === "validate-screening") {
    assert(file, "screening result file is required");
    validateScreening(readJson(path.resolve(file)));
    console.log(JSON.stringify({ ok: true, file: path.resolve(file) }, null, 2));
  } else if (command === "validate-result") {
    assert(file, "distillation result file is required");
    validateResult(readJson(path.resolve(file)));
    console.log(JSON.stringify({ ok: true, file: path.resolve(file) }, null, 2));
  } else if (command === "validate-insight") {
    assert(file, "engineering insight file is required");
    validateInsight(readJson(path.resolve(file)));
    console.log(JSON.stringify({ ok: true, file: path.resolve(file) }, null, 2));
  } else if (command === "validate-registry") {
    assert(file, "engineering insight registry root is required");
    console.log(JSON.stringify({ ok: true, ...validateRegistry(path.resolve(file)) }, null, 2));
  } else {
    usage();
    fail(`unknown command: ${command}`);
  }
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
