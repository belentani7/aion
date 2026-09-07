#!/usr/bin/env node
const [command, ...rest] = process.argv.slice(2);
const base = process.env.AION_GATEWAY_URL || 'http://127.0.0.1:8088';

async function request(path, options, allowUnavailable = false) {
  const response = await fetch(`${base}${path}`, options);
  const data = await response.json();
  if (!response.ok && !allowUnavailable) throw new Error(data.error?.message || `AIOND replied ${response.status}`);
  return data;
}

try {
  if (command === 'status') console.log(JSON.stringify(await request('/health', undefined, true), null, 2));
  else if (command === 'models') console.log(JSON.stringify(await request('/v1/models'), null, 2));
  else if (command === 'plan') console.log(JSON.stringify(await request('/v1/aion/plan', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ instruction: rest.join(' ') }) }), null, 2));
  else if (command === 'chat') { const prompt = rest.join(' '); const data = await request('/v1/chat/completions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }) }); console.log(data.choices?.[0]?.message?.content || ''); }
  else { console.error('Usage: aion <status|models|plan|chat> [text]'); process.exitCode = 1; }
} catch (error) { console.error(`AION error: ${error.message}`); process.exitCode = 1; }
