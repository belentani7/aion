import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const ci = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');
const requiredCommands = ['npm run check', 'npm test', 'node validation/source-contract.mjs', 'npm run build'];

function verifyJob(workflow) {
  assert.match(workflow, /^jobs:\s*$/m, 'CI must declare jobs');
  const match = /^  verify:\s*$/m.exec(workflow);
  assert.ok(match, 'CI must declare the verify job');
  const remainder = workflow.slice(match.index + match[0].length);
  const nextJob = /^  [A-Za-z_][\w-]*:\s*$/m.exec(remainder);
  return nextJob ? remainder.slice(0, nextJob.index) : remainder;
}

function assertRequiredGates(workflow) {
  const job = verifyJob(workflow);
  // A skipped job or a tolerated failure can report green without running a gate.
  assert.doesNotMatch(job, /^\s+(?:if|continue-on-error)\s*:/m);
  const commands = job.split('\n').map(line => line.trim());
  for (const command of requiredCommands) {
    assert.ok(commands.includes('run: ' + command), 'missing gate in verify job: ' + command);
  }
}

test('CI never hides install, typecheck, test or build failures', () => {
  assert.doesNotMatch(ci, /\|\|\s*(?:true|npm\s+install)\b|--if-present/);
});

test('CI installs the committed lockfile without arbitrary lifecycle scripts', () => {
  assert.match(verifyJob(ci), /^\s*run:\s*npm ci --ignore-scripts --legacy-peer-deps\s*$/m);
});

test('CI executes every mandatory product verification gate', () => {
  assertRequiredGates(ci);
});

test('CI verifies pull requests and has read-only source permission', () => {
  assert.match(ci, /^\s*pull_request:/m);
  assert.match(ci, /^permissions:\s*\n\s*contents:\s*read\s*$/m);
});

test('CI regression: a failed test cannot be tolerated as success', () => {
  const unsafe = ci.replace('        run: npm test\n', '        run: npm test\n        continue-on-error: true\n');
  assert.notEqual(unsafe, ci, 'mutation must be applied');
  assert.throws(() => assertRequiredGates(unsafe), /continue-on-error/);
});

test('CI regression: a job or gate cannot be disabled by a condition', () => {
  for (const mutation of [
    ci.replace('    steps:\n', '    if: false\n    steps:\n'),
    ci.replace('        run: npm test\n', '        if: ${{ false }}\n        run: npm test\n'),
  ]) {
    assert.notEqual(mutation, ci, 'mutation must be applied');
    assert.throws(() => assertRequiredGates(mutation), /if/);
  }
});

test('CI regression: gates in an unrelated job cannot satisfy verification', () => {
  const unsafe = ci.replace('        run: npm test\n', '        run: echo skipped\n') + '\n  decoy:\n    runs-on: ubuntu-latest\n    steps:\n      - run: npm test\n';
  assert.notEqual(unsafe, ci, 'mutation must be applied');
  assert.throws(() => assertRequiredGates(unsafe), /missing gate in verify job: npm test/);
});
