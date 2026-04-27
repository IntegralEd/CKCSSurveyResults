#!/usr/bin/env node
/**
 * scripts/inspect-assessment-shapes.mjs
 *
 * Diagnostic for cross-level integrity on Assessment_Results_School_Item.
 *
 * For each sampled row, computes the expected Full_Credit and Partial_Credit
 * percentages at each level (school / city / region / network) from the
 * count + responses pair, and compares against the stored percentage at
 * ±0.5pp tolerance (one-half percentage point).
 *
 * Hypothesis being tested: stored pct ≈ count / item_responses at every level,
 * differences exceeding ±0.5pp indicate stale lookups, denominator mismatch
 * (total_respondents vs item_responses), or formula bugs.
 *
 * Usage: npm run inspect:assessment-shapes
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

const TABLE_SCHOOL_ITEM = 'tblD7Kjxmno3JuhAk';
const TOLERANCE_PP = 0.5; // ±0.5 percentage points

// Map: level label → field names for [count_full, count_partial, responses, pct_full, pct_partial]
const LEVELS = {
  School: {
    countFull: 'Full_Credit_All_Count',
    countPartial: 'Partial_Credit_Count',
    responses: 'Item_Responses',
    pctFull: 'Full_Credit_All',       // decimal 0–1
    pctPartial: 'Partial_Credit',     // decimal 0–1
  },
  City: {
    countFull: 'City_Full_Credit_Count',
    countPartial: 'City_Partial_Credit_Count',
    responses: 'City_Item_Responses',
    pctFull: 'City_Full_Credit_Percent',
    pctPartial: 'City_Partial_Credit_Percent',
  },
  Region: {
    countFull: 'Region_Full_Credit_All_Count (from Assessment_Results_Region_Item)',
    countPartial: 'Region_Partial_Credit_Count',
    responses: 'Region_Responses_Count',
    pctFull: 'Region_Full_Credit_Pct',
    pctPartial: 'Region_Partial_Credit_Pct',
  },
  Network: {
    countFull: 'Network_Full_Credit_Count (from Assessment_Network_Results)',
    countPartial: 'Network_Partial_Credit_Count (from Assessment_Network_Results)',
    responses: 'Network_Responses_Count (from Assessment_Network_Results)',
    pctFull: 'Network_Full_Credit_Pct (from Assessment_Network_Results)',
    // No Network_Partial_Credit_Pct lookup exists on the school table yet —
    // we'll compute-only and skip the stored-value comparison.
    pctPartial: null,
  },
};

const ALL_FIELDS = Array.from(
  new Set(
    Object.values(LEVELS)
      .flatMap((l) => Object.values(l))
      .filter((v) => v != null),
  ),
);

function loadDotEnv(p) {
  if (!existsSync(p)) return;
  for (const raw of readFileSync(p, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const k = line.slice(0, eq).trim();
    let v = line.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (process.env[k] === undefined) process.env[k] = v;
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

/** Unwrap a value that may be a multipleLookupValues array of length 1. */
function unwrap(v) {
  if (Array.isArray(v)) return v[0];
  return v;
}

/** Coerce to a finite number, or null. */
function num(v) {
  const u = unwrap(v);
  if (u == null || u === '') return null;
  const n = typeof u === 'number' ? u : Number(u);
  return Number.isFinite(n) ? n : null;
}

async function fetchRecords(baseId, tableId, opts = {}) {
  const params = new URLSearchParams();
  params.set('maxRecords', String(opts.maxRecords ?? 10));
  for (const f of opts.fields ?? []) params.append('fields[]', f);
  const url = `https://api.airtable.com/v0/${baseId}/${tableId}?${params}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${requireEnv('AIRTABLE_API_KEY')}` },
  });
  if (!res.ok) {
    throw new Error(`Airtable ${tableId} ${res.status}: ${await res.text()}`);
  }
  return (await res.json()).records ?? [];
}

/** Compare stored vs computed pct, returning a row of the result. */
function checkLevel(label, fields, cfg) {
  const countFull = num(fields[cfg.countFull]);
  const countPartial = num(fields[cfg.countPartial]);
  const responses = num(fields[cfg.responses]);
  const pctFull = cfg.pctFull ? num(fields[cfg.pctFull]) : null;
  const pctPartial = cfg.pctPartial ? num(fields[cfg.pctPartial]) : null;

  const expectedFull = responses && responses > 0 ? countFull / responses : null;
  const expectedPartial = responses && responses > 0 ? countPartial / responses : null;

  function evaluate(stored, expected) {
    if (stored == null && expected == null) return { status: 'no-data', delta: null };
    if (stored == null || expected == null) return { status: 'missing', delta: null };
    const deltaPp = (stored - expected) * 100;
    return {
      status: Math.abs(deltaPp) <= TOLERANCE_PP ? 'pass' : 'FAIL',
      delta: deltaPp,
    };
  }

  const full = evaluate(pctFull, expectedFull);
  const partial = evaluate(pctPartial, expectedPartial);
  return { label, countFull, countPartial, responses, pctFull, expectedFull, full, pctPartial, expectedPartial, partial };
}

function fmt(n, digits = 4) {
  if (n == null) return '—';
  return n.toFixed(digits);
}

function fmtPct(n) {
  if (n == null) return '—';
  return (n * 100).toFixed(2) + '%';
}

function fmtDelta(n) {
  if (n == null) return '—';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}pp`;
}

async function main() {
  const baseId = requireEnv('AIRTABLE_BASE_ID');

  const rows = await fetchRecords(baseId, TABLE_SCHOOL_ITEM, {
    maxRecords: 10,
    fields: ALL_FIELDS,
  });

  console.log(`\nQC consistency check: stored pct vs computed (count / responses)`);
  console.log(`Tolerance: ±${TOLERANCE_PP}pp\n`);

  let totalChecks = 0;
  let totalFails = 0;

  for (const rec of rows) {
    console.log(`─── ${rec.id} ───`);
    for (const [label, cfg] of Object.entries(LEVELS)) {
      const r = checkLevel(label, rec.fields, cfg);
      const fullLine =
        `  ${label.padEnd(8)} Full     stored=${fmtPct(r.pctFull).padStart(7)}` +
        `  computed=${fmtPct(r.expectedFull).padStart(7)}` +
        `  Δ=${fmtDelta(r.full.delta).padStart(8)}` +
        `  count=${fmt(r.countFull, 0)} / responses=${fmt(r.responses, 0)}` +
        `  [${r.full.status}]`;
      const partialLine =
        `  ${label.padEnd(8)} Partial  stored=${fmtPct(r.pctPartial).padStart(7)}` +
        `  computed=${fmtPct(r.expectedPartial).padStart(7)}` +
        `  Δ=${fmtDelta(r.partial.delta).padStart(8)}` +
        `  count=${fmt(r.countPartial, 0)} / responses=${fmt(r.responses, 0)}` +
        `  [${r.partial.status}]`;
      console.log(fullLine);
      console.log(partialLine);
      for (const c of [r.full, r.partial]) {
        if (c.status === 'pass' || c.status === 'FAIL') totalChecks++;
        if (c.status === 'FAIL') totalFails++;
      }
    }
    console.log('');
  }

  console.log('─── summary ───');
  console.log(`  ${rows.length} rows × 4 levels × 2 metrics = ${rows.length * 8} potential checks`);
  console.log(`  ${totalChecks} comparable (had both stored and computed values)`);
  console.log(`  ${totalFails} FAIL (Δ > ±${TOLERANCE_PP}pp)`);
  console.log(`  ${totalChecks - totalFails} pass`);
}

main().catch((err) => {
  console.error(err?.stack ?? err);
  process.exit(1);
});
