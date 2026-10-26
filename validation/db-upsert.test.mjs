import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../server/db.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function loadDb({ env = {}, createPool = () => ({}), drizzle = () => ({}) } = {}) {
  const module = { exports: {} };
  const tables = Object.fromEntries(['users', 'aionTasks', 'aionExecutions', 'aionMemory', 'aionProjects'].map(key => [key, { id: key, projectId: key }]));
  const mocks = {
    'drizzle-orm': { eq: () => ({}) },
    'drizzle-orm/mysql2': { drizzle },
    'mysql2/promise': { createPool },
    '../drizzle/schema': tables,
    './aion/store': { clearProjectFromMemory: () => {} },
    './_core/env': { ENV: { ownerOpenId: 'owner' } },
  };
  runInNewContext(compiled, {
    module, exports: module.exports,
    require: (name) => {
      if (!Object.hasOwn(mocks, name)) throw new Error(`Unexpected import: ${name}`);
      return mocks[name];
    },
    process: { env },
    console: { warn() {} },
    Date,
  }, { filename: 'server/db.ts', timeout: 2000 });
  return module.exports;
}

test('OAuth persistence fails closed when DATABASE_URL is absent', async () => {
  const db = loadDb();
  await assert.rejects(db.upsertUser({ openId: 'person' }), /database.*unavailable|database.*required/i);
});

test('OAuth persistence fails closed when database initialization fails', async () => {
  const db = loadDb({ env: { DATABASE_URL: 'mysql://test.invalid/db' }, createPool: () => { throw new Error('offline'); } });
  await assert.rejects(db.upsertUser({ openId: 'person' }), /database.*unavailable|database.*required/i);
});

test('OAuth persistence awaits successful insert before resolving', async () => {
  let saved;
  let committed = false;
  const db = loadDb({
    env: { DATABASE_URL: 'mysql://test.invalid/db' },
    drizzle: () => ({ insert: () => ({ values: (value) => {
      saved = value;
      return { onDuplicateKeyUpdate: async () => { await Promise.resolve(); committed = true; } };
    } }) }),
  });
  await db.upsertUser({ openId: 'owner', email: 'owner@example.invalid' });
  assert.equal(committed, true);
  assert.equal(saved.openId, 'owner');
  assert.equal(saved.role, 'admin');
});

test('OAuth persistence propagates write errors', async () => {
  const db = loadDb({
    env: { DATABASE_URL: 'mysql://test.invalid/db' },
    drizzle: () => ({ insert: () => ({ values: () => ({ onDuplicateKeyUpdate: async () => { throw new Error('write rejected'); } }) }) }),
  });
  await assert.rejects(db.upsertUser({ openId: 'person' }), /write rejected/);
});

test('OAuth persistence refuses empty identity', async () => {
  await assert.rejects(loadDb().upsertUser({ openId: '' }), /openId is required/);
});
