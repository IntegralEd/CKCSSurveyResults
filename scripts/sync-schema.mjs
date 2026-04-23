#!/usr/bin/env node
/**
 * scripts/sync-schema.mjs
 *
 * Pulls the live Airtable schema via the Meta API and writes a deterministic
 * snapshot to Reference/schema.generated.{json,csv}. Committed snapshot +
 * CI drift check = we notice the moment a field or table is renamed in Airtable.
 *
 * Required env:
 *   AIRTABLE_API_KEY   PAT with schema.bases:read on the target base
 *   AIRTABLE_BASE_ID   e.g. app8bFS8L3YQAmFzz
 *
 * Loads .env.local then .env if present (repo root) so local runs "just work".
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

// Table IDs this app depends on. Kept in sync with src/lib/airtable.ts and
// src/lib/assessmentAirtable.ts. A missing ID here fails the sync loudly.
const REQUIRED_TABLE_IDS = [
  'tblE1rwPUjtxodIvZ', // Survey_Respondents
  'tbl9lguOzNO8VjMvY', // Survey_Items
  'tbla8CWwKDBuQwmtq', // Survey_Item_Comments
  'tblwEdi9EQhCsixNd', // Survey_School_Item_Results
  'tblTyVLW0R8MxmQ0S', // Schools
  'tblWQJewTlrkfypPP', // Users_Sync
  'tblKXWbABAC2WoXCn', // Regions
  'tblD7Kjxmno3JuhAk', // Assessment_School_Item
  'tblwgM7tZ0e1sEpfX', // Assessment_Banks
  'tblqIgPFR3mCHjQRo', // Assessment_Items
];

// ─── Env loading ─────────────────────────────────────────────────────────────

function loadDotEnv(path) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, 'utf8');
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadDotEnv(resolve(repoRoot, '.env.local'));
loadDotEnv(resolve(repoRoot, '.env'));

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing required env: ${name}`);
    process.exit(1);
  }
  return v;
}

// ─── Meta API fetch ─────────────────────────────────────────────────────────

async function fetchSchema(apiKey, baseId) {
  const url = `https://api.airtable.com/v0/meta/bases/${baseId}/tables`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Meta API ${res.status}: ${body}`);
  }
  return res.json();
}

// ─── Shaping ─────────────────────────────────────────────────────────────────

function normalize(schema) {
  const tablesById = new Map(schema.tables.map((t) => [t.id, t]));

  const tables = schema.tables
    .map((t) => ({
      id: t.id,
      name: t.name,
      primaryFieldId: t.primaryFieldId ?? null,
      fields: [...t.fields]
        .map((f) => {
          const linkedTableId = f.options?.linkedTableId ?? null;
          return {
            id: f.id,
            name: f.name,
            type: f.type,
            linkedTableId,
            linkedTableName: linkedTableId
              ? tablesById.get(linkedTableId)?.name ?? null
              : null,
          };
        })
        .sort((a, b) => a.id.localeCompare(b.id)),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  return { tables };
}

function toCsv(normalized) {
  const header = [
    'Table_Name',
    'Table_ID',
    'Field_ID',
    'Field_Name',
    'Field_Type',
    'Is_Linked_Field',
    'Linked_Table_ID',
    'Linked_Table',
  ];
  const rows = [header.join(',')];
  for (const t of normalized.tables) {
    for (const f of t.fields) {
      rows.push(
        [
          t.name,
          t.id,
          f.id,
          f.name,
          f.type,
          f.linkedTableId ? 'checked' : '',
          f.linkedTableId ?? '',
          f.linkedTableName ?? '',
        ]
          .map(csvCell)
          .join(','),
      );
    }
  }
  // Trailing newline keeps git diffs clean.
  return rows.join('\n') + '\n';
}

function csvCell(v) {
  const s = v == null ? '' : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const apiKey = requireEnv('AIRTABLE_API_KEY');
  const baseId = requireEnv('AIRTABLE_BASE_ID');

  const raw = await fetchSchema(apiKey, baseId);
  const normalized = normalize(raw);

  const foundIds = new Set(normalized.tables.map((t) => t.id));
  const missing = REQUIRED_TABLE_IDS.filter((id) => !foundIds.has(id));
  if (missing.length) {
    console.error(
      `Schema sync FAILED: required table IDs not found in base ${baseId}:`,
    );
    for (const id of missing) console.error(`  - ${id}`);
    console.error(
      'Either the base ID is wrong or a table was deleted/recreated.',
    );
    process.exit(2);
  }

  const jsonPath = resolve(repoRoot, 'Reference/schema.generated.json');
  const csvPath = resolve(repoRoot, 'Reference/schema.generated.csv');

  writeFileSync(
    jsonPath,
    JSON.stringify({ baseId, ...normalized }, null, 2) + '\n',
  );
  writeFileSync(csvPath, toCsv(normalized));

  const totalFields = normalized.tables.reduce(
    (n, t) => n + t.fields.length,
    0,
  );
  console.log(
    `Schema sync OK: ${normalized.tables.length} tables, ${totalFields} fields → Reference/schema.generated.{json,csv}`,
  );
}

main().catch((err) => {
  console.error(err?.stack ?? err);
  process.exit(1);
});
