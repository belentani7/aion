import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../server/db.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function loadDb({ env = {}, createPool = () => ({}), drizzle = () => ({}), clearProjectFromMemory = () => {} } = {}) {
  const module = { exports: {} };
  const tables = Object.fromEntries(['users', 'aionTasks', 'aionExecutions', 'aionMemory', 'aionProjects'].map(key => [key, { id: key, projectId: key }]));
  const mocks = {
    'drizzle-orm': { eq: () => ({}) },
    'drizzle-orm/mysql2': { drizzle },
    'mysql2/promise': { createPool },
    '../drizzle/schema': tables,
    './aion/store': { clearProjectFromMemory },
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

test('project deletion propagates DB failure and leaves memory intact', async () => {
  let cleared = false;
  let attempted = 0;
  let rolledBack = false;
  const db = loadDb({
    env: { DATABASE_URL: 'mysql://test.invalid/db' },
    clearProjectFromMemory: () => { cleared = true; },
    drizzle: () => ({ transaction: async (work) => {
      try {
        await work({ delete: () => ({ where: async () => {
          attempted++;
          if (attempted === 2) throw new Error('delete rejected');
        } }) });
      } catch (error) {
        rolledBack = true;
        throw error;
      }
    } }),
  });
  await assert.rejects(db.deleteProjectData(17), /delete rejected/);
  assert.equal(rolledBack, true);
  assert.equal(cleared, false);
  assert.equal(attempted, 2);
});

test('project deletion commits all table deletes before clearing memory', async () => {
  const events = [];
  const db = loadDb({
    env: { DATABASE_URL: 'mysql://test.invalid/db' },
    clearProjectFromMemory: (id) => { events.push('memory:' + id); },
    drizzle: () => ({ transaction: async (work) => {
      events.push('begin');
      await work({ delete: (table) => ({ where: async () => { events.push(table.id); } }) });
      events.push('commit');
    } }),
  });
  await db.deleteProjectData(17);
  assert.deepEqual(events, ['begin', 'aionTasks', 'aionExecutions', 'aionMemory', 'aionProjects', 'commit', 'memory:17']);
});

test('project deletion clears ephemeral store without database', async () => {
  const cleared = [];
  const db = loadDb({ clearProjectFromMemory: (id) => { cleared.push(id); } });
  await db.deleteProjectData(17);
  assert.deepEqual(cleared, [17]);
});

test('project deletion refuses success when configured database pool cannot initialize', async () => {
  let cleared = false;
  const db = loadDb({
    env: { DATABASE_URL: 'mysql://test.invalid/db' },
    createPool: () => { throw new Error('offline'); },
    clearProjectFromMemory: () => { cleared = true; },
  });
  await assert.rejects(db.deleteProjectData(17), /database.*unavailable.*delete/i);
  assert.equal(cleared, false, 'memory must remain intact when persistent deletion did not run');
});

test('project deletion refuses success when ORM initialization fails', async () => {
  let cleared = false;
  const db = loadDb({
    env: { DATABASE_URL: 'mysql://test.invalid/db' },
    drizzle: () => { throw new Error('ORM offline'); },
    clearProjectFromMemory: () => { cleared = true; },
  });
  await assert.rejects(db.deleteProjectData(17), /database.*unavailable.*delete/i);
  assert.equal(cleared, false);
});
