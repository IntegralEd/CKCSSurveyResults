#!/usr/bin/env node
/**
 * scripts/verify-schema.mjs
 *
 * Runs the schema sync then fails if the generated files have drifted from
 * what's committed. Used by CI and the opt-in pre-commit hook.
 *
 * Exit codes:
 *   0  no drift
 *   1  sync error (missing env, network, missing required table, etc.)
 *   3  drift detected (details printed to stderr)
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

const TRACKED = [
  'Reference/schema.generated.json',
  'Reference/schema.generated.csv',
];

const sync = spawnSync(
  process.execPath,
  [resolve(__dirname, 'sync-schema.mjs')],
  { stdio: 'inherit', cwd: repoRoot },
);
if (sync.status !== 0) process.exit(1);

let diff = '';
try {
  diff = execFileSync('git', ['diff', '--', ...TRACKED], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
} catch (err) {
  console.error('git diff failed:', err?.message ?? err);
  process.exit(1);
}

if (diff.trim()) {
  console.error('\nSchema drift detected. Airtable schema has changed vs. the committed snapshot:\n');
  console.error(diff);
  console.error(
    '\nIf this change is expected, run `npm run schema:sync` and commit the updated Reference/schema.generated.{json,csv}.',
  );
  process.exit(3);
}

console.log('Schema snapshot is up to date.');
