#!/usr/bin/env node
/**
 * AIOND: local-only, OpenAI-compatible gateway.
 * It intentionally accepts only loopback Ollama/llama.cpp backends.
 */
import http from 'node:http';

const PORT = Number(process.env.AION_PORT || 8088);
const OLLAMA_URL = process.env.AION_OLLAMA_URL || 'http://127.0.0.1:11434';
const LLAMA_CPP_URL = process.env.AION_LLAMA_CPP_URL || 'http://127.0.0.1:8080';
const allowed = new Set(['127.0.0.1', 'localhost', '::1']);

function localUrl(value) {
  const url = new URL(value);
  if (!allowed.has(url.hostname)) throw new Error('AIOND only permits loopback model servers.');
  return url;
}

function send(res, status, payload) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(payload));
}

async function json(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); }
  catch { throw new Error('Invalid JSON body'); }
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(120000) });
  if (!response.ok) throw new Error(`Local model server replied ${response.status}`);
  return response.json();
}

async function ollamaModels() {
  const base = localUrl(OLLAMA_URL);
  const data = await fetchJson(new URL('/api/tags', base));
  return (data.models || []).map(model => model.name);
}

async function llamaHealth() {
  const base = localUrl(LLAMA_CPP_URL);
  await fetchJson(new URL('/health', base));
  return true;
}

async function preferredProvider() {
  try { const models = await ollamaModels(); if (models.length) return { id: 'ollama', models }; } catch {}
  try { await llamaHealth(); return { id: 'llama.cpp', models: [] }; } catch {}
  return null;
}

function taskPlan(instruction) {
  const summary = String(instruction || '').trim();
  if (!summary) throw new Error('instruction is required');
  return {
    objective: summary,
    network: 'OFF',
    providerPolicy: 'LOCAL_ONLY',
    tasks: [
      { id: 'inspect', action: 'Inspect workspace and manifests', risk: 'low', tool: 'filesystem' },
      { id: 'plan', action: `Plan changes for: ${summary}`, risk: 'low', tool: 'planner' },
      { id: 'test', action: 'Run project tests after explicit approval', risk: 'high', tool: 'terminal', dependsOn: ['inspect', 'plan'] },
    ],
  };
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`);
    if (req.method === 'GET' && url.pathname === '/health') {
      const provider = await preferredProvider();
      return send(res, provider ? 200 : 503, { status: provider ? 'ready' : 'no_local_model', provider, localOnly: true, network: 'off' });
    }
    if (req.method === 'GET' && url.pathname === '/v1/models') {
      const provider = await preferredProvider();
      return send(res, 200, { object: 'list', data: (provider?.models || []).map(id => ({ id, object: 'model', owned_by: provider?.id || 'local' })) });
    }
    if (req.method === 'POST' && url.pathname === '/v1/aion/plan') return send(res, 200, taskPlan((await json(req)).instruction));
    if (req.method === 'POST' && url.pathname === '/v1/chat/completions') {
      const payload = await json(req);
      const provider = await preferredProvider();
      if (!provider) return send(res, 503, { error: { message: 'No local model runtime is available. Start Ollama or llama.cpp.', type: 'local_model_unavailable' } });
      if (provider.id === 'ollama') {
        const model = payload.model || provider.models[0];
        const base = localUrl(OLLAMA_URL);
        const data = await fetchJson(new URL('/api/chat', base), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ model, messages: payload.messages || [], stream: false, options: payload.options || {} }) });
        return send(res, 200, { id: `aion-${Date.now()}`, object: 'chat.completion', created: Math.floor(Date.now() / 1000), model, choices: [{ index: 0, message: { role: 'assistant', content: data.message?.content || '' }, finish_reason: 'stop' }] });
      }
      const base = localUrl(LLAMA_CPP_URL);
      const data = await fetchJson(new URL('/v1/chat/completions', base), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...payload, stream: false }) });
      return send(res, 200, data);
    }
    send(res, 404, { error: { message: 'Not found' } });
  } catch (error) { send(res, 400, { error: { message: error instanceof Error ? error.message : 'Unknown error' } }); }
});

server.listen(PORT, '127.0.0.1', () => console.log(`AIOND listening on 127.0.0.1:${PORT} (local model gateway)`));
