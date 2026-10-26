import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const ci = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');

test('CI never hides install, typecheck, test or build failures', () => {
  assert.doesNotMatch(ci, /\|\|\s*(?:true|npm\s+install)\b|--if-present/);
});

test('CI installs the committed lockfile without arbitrary lifecycle scripts', () => {
  assert.match(ci, /^\s*run:\s*npm ci --ignore-scripts --legacy-peer-deps\s*$/m);
});

test('CI executes every mandatory product verification gate', () => {
  for (const command of ['npm run check', 'npm test', 'node validation/source-contract.mjs', 'npm run build']) {
    assert.ok(ci.split('\n').some(line => line.trim() === `run: ${command}`), `missing gate: ${command}`);
  }
});

test('CI verifies pull requests and has read-only source permission', () => {
  assert.match(ci, /^\s*pull_request:/m);
  assert.match(ci, /^permissions:\s*\n\s*contents:\s*read\s*$/m);
});
