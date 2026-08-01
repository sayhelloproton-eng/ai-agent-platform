import { access, readFile, readdir } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const GENERATED_DIR = path.join(ROOT, "platform-registry/generated");
const REQUIRED_ASSET_FIELDS = [
  "asset_id",
  "asset_type",
  "status",
  "evidence_level",
  "materialized",
  "current_path",
  "target_path",
  "canonical_path",
  "publication_status",
  "migration_state",
];
const FORBIDDEN_UNMATERIALIZED_STATUSES = new Set([
  "accepted",
  "approved",
  "implemented",
  "verified",
  "validated",
]);

const errors = [];

async function read(relativePath) {
  return readFile(path.join(ROOT, relativePath), "utf8");
}

function parseScalar(rawValue) {
  const value = rawValue.trim();
  if (value === "" || value === "null" || value === "~") return null;
  if (value === "[]") return [];
  if (value === "true") return true;
  if (value === "false") return false;
  return value.replace(/^['"]|['"]$/g, "");
}

function asArray(value) {
  if (value === null || value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function parseRecords(text, startKey) {
  const records = [];
  let current = null;
  let activeList = null;

  for (const line of text.split(/\r?\n/)) {
    const start = line.match(new RegExp(`^-\\s+${startKey}:\\s*(.+?)\\s*$`));
    if (start) {
      if (current) records.push(current);
      current = { [startKey]: parseScalar(start[1]) };
      activeList = null;
      continue;
    }
    if (!current) continue;

    const field = line.match(/^  ([a-z_]+):(?:\s*(.*))?$/);
    if (field) {
      const [, key, rawValue = ""] = field;
      const value = parseScalar(rawValue);
      current[key] = value;
      activeList = value === null ? key : null;
      continue;
    }

    const listItem = line.match(/^  -\s+(.+?)\s*$/);
    if (listItem && activeList) {
      if (!Array.isArray(current[activeList])) current[activeList] = [];
      current[activeList].push(parseScalar(listItem[1]));
    }
  }

  if (current) records.push(current);
  return records;
}

function parseRelationTypes(text) {
  return new Set(
    [...text.matchAll(/^\s*-\s+id:\s*(.+?)\s*$/gm)]
      .map((match) => parseScalar(match[1])),
  );
}

function parseTopLevelDocument(text) {
  const document = {};
  let activeList = null;

  for (const line of text.split(/\r?\n/)) {
    const field = line.match(/^([a-z_]+):(?:\s*(.*))?$/);
    if (field) {
      const [, key, rawValue = ""] = field;
      const value = parseScalar(rawValue);
      document[key] = value;
      activeList = value === null ? key : null;
      continue;
    }
    const listItem = line.match(/^-\s+(.+?)\s*$/);
    if (listItem && activeList) {
      if (!Array.isArray(document[activeList])) document[activeList] = [];
      document[activeList].push(parseScalar(listItem[1]));
    }
  }

  return document;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  if (rows[0]?.[0]) rows[0][0] = rows[0][0].replace(/^\uFEFF/, "");
  return rows;
}

function fail(message) {
  errors.push(message);
}

function isSafeRepositoryPath(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    fail(`${label} must be a non-empty repository-relative path`);
    return false;
  }
  if (path.isAbsolute(value)) {
    fail(`${label} must not be absolute: ${value}`);
    return false;
  }
  if (value.split(/[\\/]+/).includes("..")) {
    fail(`${label} must not contain '..': ${value}`);
    return false;
  }

  const resolved = path.resolve(ROOT, value);
  if (resolved !== ROOT && !resolved.startsWith(`${ROOT}${path.sep}`)) {
    fail(`${label} points outside the repository: ${value}`);
    return false;
  }
  return true;
}

async function pathExists(relativePath) {
  try {
    await access(path.join(ROOT, relativePath), constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function findSupersedeCycles(assetsById) {
  const visiting = new Set();
  const visited = new Set();

  function visit(assetId, chain) {
    if (visiting.has(assetId)) {
      fail(`superseded_by cycle: ${[...chain, assetId].join(" -> ")}`);
      return;
    }
    if (visited.has(assetId)) return;

    visiting.add(assetId);
    const targets = asArray(assetsById.get(assetId)?.superseded_by);
    for (const target of targets) {
      if (assetsById.has(target)) visit(target, [...chain, assetId]);
    }
    visiting.delete(assetId);
    visited.add(assetId);
  }

  for (const assetId of assetsById.keys()) visit(assetId, []);
}

async function main() {
  const requiredFiles = [
    "platform-registry/README.md",
    "platform-registry/AGENTS.md",
    "platform-registry/assets.yaml",
    "platform-registry/relations.yaml",
    "platform-registry/relation-types.yaml",
    "platform-registry/projections.yaml",
    "platform-registry/implementation-status.yaml",
    "platform-registry/releases.yaml",
    "platform-registry/migrations/README.md",
    "platform-registry/migrations/current-migration.yaml",
    "platform-registry/migrations/asset-migration-matrix.csv",
    "platform-registry/generated/README.md",
    "platform-registry/schemas/asset.schema.json",
    "platform-registry/schemas/implementation-status.schema.json",
    "platform-registry/schemas/migration.schema.json",
  ];
  for (const relativePath of requiredFiles) {
    if (!(await pathExists(relativePath))) fail(`missing required file ${relativePath}`);
  }

  const assetSchema = JSON.parse(
    await read("platform-registry/schemas/asset.schema.json"),
  );
  const implementationSchema = JSON.parse(
    await read("platform-registry/schemas/implementation-status.schema.json"),
  );
  const allowedAssetStatuses = new Set(
    assetSchema.properties.status.enum,
  );
  const allowedEvidenceLevels = new Set(
    assetSchema.properties.evidence_level.enum,
  );
  const allowedMigrationStates = new Set(
    assetSchema.properties.migration_state.enum,
  );
  const allowedPublicationStatuses = new Set(
    assetSchema.properties.publication_status.enum,
  );
  const allowedImplementationStatuses = new Set(
    implementationSchema.properties.status.enum,
  );

  const assets = parseRecords(
    await read("platform-registry/assets.yaml"),
    "asset_id",
  );
  const assetsById = new Map();
  const canonicalOwners = new Map();
  let plannedAssets = 0;
  let materializedAssets = 0;
  let acceptedAssets = 0;
  let missingCanonicalPaths = 0;
  let duplicateCanonicalPaths = 0;
  let invalidStatuses = 0;
  let invalidSupersededReferences = 0;

  for (const asset of assets) {
    for (const field of REQUIRED_ASSET_FIELDS) {
      if (!(field in asset)) fail(`asset ${asset.asset_id ?? "<unknown>"} missing ${field}`);
    }
    if (!asset.asset_id) continue;
    if (assetsById.has(asset.asset_id)) fail(`duplicate asset_id ${asset.asset_id}`);
    assetsById.set(asset.asset_id, asset);

    if (!asset.asset_type) fail(`asset ${asset.asset_id} missing asset_type`);
    if (!allowedAssetStatuses.has(asset.status)) {
      invalidStatuses += 1;
      fail(`asset ${asset.asset_id} has invalid status ${asset.status}`);
    }
    if (!allowedEvidenceLevels.has(asset.evidence_level)) {
      fail(`asset ${asset.asset_id} has invalid evidence_level ${asset.evidence_level}`);
    }
    if (!allowedMigrationStates.has(asset.migration_state)) {
      fail(`asset ${asset.asset_id} has invalid migration_state ${asset.migration_state}`);
    }
    if (!allowedPublicationStatuses.has(asset.publication_status)) {
      fail(`asset ${asset.asset_id} has invalid publication_status ${asset.publication_status}`);
    }
    if (typeof asset.materialized !== "boolean") {
      fail(`asset ${asset.asset_id} materialized must be boolean`);
      continue;
    }

    if (asset.status === "accepted") acceptedAssets += 1;

    if (asset.materialized) {
      materializedAssets += 1;
      if (!asset.canonical_path || !asset.current_path) {
        fail(`materialized asset ${asset.asset_id} requires canonical_path and current_path`);
      }
      if (asset.canonical_path !== asset.current_path) {
        fail(`materialized asset ${asset.asset_id} canonical_path must equal current_path`);
      }
    } else {
      plannedAssets += 1;
      if (asset.canonical_path !== null || asset.current_path !== null) {
        fail(`planned asset ${asset.asset_id} must not have canonical_path or current_path`);
      }
      if (!asset.target_path) {
        fail(`planned asset ${asset.asset_id} requires target_path`);
      }
      if (FORBIDDEN_UNMATERIALIZED_STATUSES.has(asset.status)) {
        fail(`planned asset ${asset.asset_id} cannot use status ${asset.status}`);
      }
      if (asset.publication_status !== "unpublished") {
        fail(`planned asset ${asset.asset_id} must be unpublished`);
      }
      if (asset.node_id || asset.feishu_node_id) {
        fail(`planned asset ${asset.asset_id} must not have a Feishu node ID`);
      }
    }

    for (const field of ["canonical_path", "current_path", "target_path"]) {
      const value = asset[field];
      if (value === null) continue;
      if (!isSafeRepositoryPath(value, `asset ${asset.asset_id} ${field}`)) continue;
      const exists = await pathExists(value);
      if ((field === "canonical_path" || field === "current_path") && !exists) {
        if (field === "canonical_path") missingCanonicalPaths += 1;
        fail(`asset ${asset.asset_id} ${field} does not exist: ${value}`);
      }
      if (field === "target_path" && !exists &&
          !["planned", "in_progress"].includes(asset.migration_state)) {
        fail(`asset ${asset.asset_id} missing target_path requires a planned migration state`);
      }
    }

    if (asset.canonical_path) {
      const owner = canonicalOwners.get(asset.canonical_path);
      if (owner) {
        duplicateCanonicalPaths += 1;
        fail(`duplicate canonical_path ${asset.canonical_path}: ${owner}, ${asset.asset_id}`);
      } else {
        canonicalOwners.set(asset.canonical_path, asset.asset_id);
      }
    }
  }

  for (const asset of assets) {
    for (const target of asArray(asset.superseded_by)) {
      if (target === asset.asset_id || !assetsById.has(target)) {
        invalidSupersededReferences += 1;
        fail(`asset ${asset.asset_id} has invalid superseded_by ${target}`);
      }
    }
  }
  findSupersedeCycles(assetsById);

  const relationTypes = parseRelationTypes(
    await read("platform-registry/relation-types.yaml"),
  );
  const relations = parseRecords(
    await read("platform-registry/relations.yaml"),
    "from",
  );
  for (const relation of relations) {
    if (!assetsById.has(relation.from)) {
      fail(`relation source not registered: ${relation.from}`);
    }
    if (!relationTypes.has(relation.type)) {
      fail(`unknown relation type: ${relation.type}`);
    }
    for (const target of asArray(relation.to)) {
      if (!assetsById.has(target)) fail(`relation target not registered: ${target}`);
    }
  }

  const capabilities = parseRecords(
    await read("platform-registry/implementation-status.yaml"),
    "id",
  );
  const capabilityIds = new Set();
  for (const capability of capabilities) {
    if (!capability.id) {
      fail("implementation status entry missing id");
      continue;
    }
    if (capabilityIds.has(capability.id)) {
      fail(`duplicate implementation status id ${capability.id}`);
    }
    capabilityIds.add(capability.id);
    if (!allowedImplementationStatuses.has(capability.status)) {
      fail(`implementation status ${capability.id} has invalid status ${capability.status}`);
    }
    if (!Array.isArray(capability.implemented_by) ||
        !Array.isArray(capability.evidence)) {
      fail(`implementation status ${capability.id} requires implemented_by and evidence arrays`);
      continue;
    }
    for (const assetId of capability.implemented_by) {
      if (!assetsById.has(assetId)) {
        fail(`implementation status ${capability.id} references unknown asset ${assetId}`);
      }
    }
    for (const evidencePath of capability.evidence) {
      if (!isSafeRepositoryPath(evidencePath, `implementation status ${capability.id} evidence`)) continue;
      if (!(await pathExists(evidencePath))) {
        fail(`implementation status ${capability.id} evidence does not exist: ${evidencePath}`);
      }
    }
    if (capability.status === "verified" &&
        (capability.implemented_by.length === 0 || capability.evidence.length === 0)) {
      fail(`verified implementation status ${capability.id} requires implementation and evidence`);
    }
  }

  const projection = await read("platform-registry/projections.yaml");
  for (const required of [
    "direction: git_to_feishu",
    "mode: overwrite",
    "pre_read_content: false",
    "semantic_diff: false",
    "reverse_write: false",
  ]) {
    if (!projection.includes(required)) fail(`projection policy missing ${required}`);
  }
  const mappings = parseRecords(projection, "asset_id");
  for (const mapping of mappings) {
    const asset = assetsById.get(mapping.asset_id);
    if (!asset) {
      fail(`projection references unknown asset ${mapping.asset_id}`);
      continue;
    }
    if (!asset.materialized || asset.publication_status !== "published") {
      fail(`projection asset ${mapping.asset_id} is not materialized and published`);
    }
    if (!mapping.node_id) fail(`projection asset ${mapping.asset_id} missing node_id`);
  }

  const migrationText = await read(
    "platform-registry/migrations/current-migration.yaml",
  );
  const migration = parseTopLevelDocument(migrationText);
  const completedBatches = asArray(migration.completed_batches);
  if (!["planned", "in_review", "completed", "blocked"].includes(migration.status)) {
    fail(`migration has invalid status ${migration.status}`);
  }
  if (!migration.current_batch) fail("migration missing current_batch");
  if (completedBatches.includes(migration.current_batch)) {
    fail(`migration current_batch is already completed: ${migration.current_batch}`);
  }
  if (migration.status === "in_review" && !migration.current_batch) {
    fail("in_review migration requires current_batch");
  }
  if (!isSafeRepositoryPath(migration.matrix, "migration matrix")) {
    fail("migration matrix path is invalid");
  } else if (!(await pathExists(migration.matrix))) {
    fail(`migration matrix does not exist: ${migration.matrix}`);
  }
  const matrixText = await read(migration.matrix);
  const matrixRows = parseCsv(matrixText);
  const matrixHeader = matrixRows[0] ?? [];
  for (const requiredColumn of [
    "current_path",
    "action",
    "target_path",
    "asset_id",
    "batch",
  ]) {
    if (!matrixHeader.includes(requiredColumn)) {
      fail(`migration matrix missing column ${requiredColumn}`);
    }
  }
  const matrixIndexes = Object.fromEntries(
    matrixHeader.map((column, index) => [column, index]),
  );
  for (const [rowIndex, row] of matrixRows.slice(1).entries()) {
    if (row.length === 1 && row[0] === "") continue;
    for (const field of ["current_path", "target_path"]) {
      const value = row[matrixIndexes[field]]?.trim();
      if (value) isSafeRepositoryPath(value, `migration matrix row ${rowIndex + 2} ${field}`);
    }
  }
  if (matrixText.includes("docs/technical/归档/知识资产")) {
    fail("migration matrix contains the obsolete archive path docs/technical/归档/知识资产");
  }

  const generatedFiles = await readdir(GENERATED_DIR);
  for (const fileName of generatedFiles) {
    if (fileName !== "README.md") {
      fail(`generated directory contains an unsupported placeholder or unmanaged file: ${fileName}`);
    }
  }

  const releaseText = await read("platform-registry/releases.yaml");
  const releaseRecords = parseRecords(releaseText, "release_id");
  const releasesById = new Map();
  for (const release of releaseRecords) {
    if (typeof release.release_id !== "string" || release.release_id.length === 0) {
      fail("release record missing release_id");
      continue;
    }
    if (releasesById.has(release.release_id)) {
      fail(`duplicate release_id ${release.release_id}`);
      continue;
    }
    releasesById.set(release.release_id, release);
  }

  function validateRelease(releaseId, expectedFields) {
    const release = releasesById.get(releaseId);
    if (!release) {
      fail(`missing required release ${releaseId}`);
      return null;
    }
    for (const [field, expected] of Object.entries(expectedFields)) {
      if (release[field] !== expected) {
        fail(`${releaseId} ${field} must be ${expected}, got ${release[field] ?? "<missing>"}`);
      }
    }
    return release;
  }

  validateRelease("KNOWLEDGE-REBUILD-V2-BATCH-01", {
    status: "completed",
    branch: "knowledge-rebuild-v2",
    publication_status: "unpublished",
    feishu_status: "not_started",
  });

  const batch10 = validateRelease("KNOWLEDGE-REBUILD-V2-BATCH-10", {
    status: "completed",
    repository_review_status: "accepted",
    branch: "main",
    source_branch: "knowledge-rebuild-v2",
    publication_status: "unpublished",
    feishu_status: "not_started",
    merge_strategy: "fast-forward-only",
  });
  if (batch10) {
    const expectedImplementationCommit = "f377303025a260def940206ac264668913f6618b";
    const implementationEvidence = [
      batch10.implementation_commit,
      batch10.source_implementation_commit,
    ].filter((value) => value !== null && value !== undefined);
    if (!implementationEvidence.includes(expectedImplementationCommit)) {
      fail(`KNOWLEDGE-REBUILD-V2-BATCH-10 missing implementation evidence ${expectedImplementationCommit}`);
    }
    if (implementationEvidence.length === 2 && implementationEvidence[0] !== implementationEvidence[1]) {
      fail("KNOWLEDGE-REBUILD-V2-BATCH-10 implementation evidence fields conflict");
    }
  }

  if (errors.length > 0) {
    for (const message of errors) console.error(`Registry check failed: ${message}`);
    process.exitCode = 1;
    return;
  }

  console.log(
    [
      `Platform Registry check passed: ${assets.length} assets, ${relations.length} relations.`,
      `Planned assets: ${plannedAssets}; materialized assets: ${materializedAssets}; accepted assets: ${acceptedAssets}.`,
      `Missing canonical paths: ${missingCanonicalPaths}; duplicate canonical paths: ${duplicateCanonicalPaths}.`,
      `Invalid statuses: ${invalidStatuses}; invalid superseded_by references: ${invalidSupersededReferences}.`,
    ].join("\n"),
  );
}

await main();
