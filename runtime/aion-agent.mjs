#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const [workspaceArg, targetArg, ...instructionParts] = process.argv.slice(2);
const base = process.env.AION_GATEWAY_URL || 'http://127.0.0.1:8088';
const workspace = path.resolve(workspaceArg || '');
const permittedRoot = '/tmp/aion-workspaces';
if (!workspace.startsWith(`${permittedRoot}${path.sep}`)) throw new Error(`Workspace must be located under ${permittedRoot}`);
if (!targetArg || targetArg.startsWith('/') || targetArg.includes('..')) throw new Error('Target must be a safe relative path');
const instruction = instructionParts.join(' ').trim();
if (!instruction) throw new Error('Provide a coding instruction');
if (process.env.AION_AGENT_APPROVED !== 'YES') throw new Error('Execution requires explicit confirmation: AION_AGENT_APPROVED=YES');
const auditDir = path.join(workspace, '.aion');
const auditLog = path.join(auditDir, 'executions.jsonl');

async function log(event, details = {}) {
  await fs.mkdir(auditDir, { recursive: true });
  await fs.appendFile(auditLog, `${JSON.stringify({ at: new Date().toISOString(), event, approved: true, network: 'OFF', ...details })}\n`, 'utf8');
}

async function request(pathname, payload) {
  const response = await fetch(`${base}${pathname}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || `Gateway replied ${response.status}`);
  return data;
}

function cleanCode(text) {
  return text.replace(/^```(?:javascript|js|typescript|ts)?\s*/i, '').replace(/\s*```[\s\S]*$/m, '').trim();
}

function runNode(file) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [file], { cwd: workspace, stdio: 'pipe', env: { ...process.env, AION_NETWORK: 'OFF' } });
    let output = '';
    child.stdout.on('data', chunk => output += chunk);
    child.stderr.on('data', chunk => output += chunk);
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve(output) : reject(new Error(output || `node exited ${code}`)));
  });
}

const plan = await request('/v1/aion/plan', { instruction });
await log('planned', { instruction, target: targetArg, taskCount: plan.tasks.length });
const completion = await request('/v1/chat/completions', { messages: [{ role: 'system', content: 'Return only runnable JavaScript. Do not use markdown fences or explanations.' }, { role: 'user', content: instruction }] });
const code = cleanCode(completion.choices?.[0]?.message?.content || '');
if (!code) throw new Error('Local model returned no code');
const output = path.resolve(workspace, targetArg);
if (!output.startsWith(`${workspace}${path.sep}`)) throw new Error('Path escape blocked');
await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(output, `${code}\n`, 'utf8');
const validation = await runNode(output);
await log('completed', { target: output, validation: validation.trim() || 'node exited 0' });
console.log(JSON.stringify({ status: 'completed', provider: 'local', plan, file: output, auditLog, validation: validation.trim() || 'node exited 0' }, null, 2));
