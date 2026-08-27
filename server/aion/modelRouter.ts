export type TaskKind = "fast" | "coding" | "reasoning" | "vision" | "research" | "long_context";
export type ModelCapabilities = { reasoning: boolean; coding: boolean; vision: boolean; toolCalling: boolean; contextLength: number; cost: "free" | "paid" | "unknown" };
export type ModelProvider = { id: string; label: string; available(): Promise<boolean>; capabilities: ModelCapabilities; chat(input: { messages: Array<{ role: string; content: string }> }): Promise<{ text: string }> };

async function reachable(url: string) { try { const r = await fetch(url, { signal: AbortSignal.timeout(1200) }); return r.ok; } catch { return false; } }

export const ollamaProvider: ModelProvider = {
  id: "ollama", label: "Ollama local", capabilities: { reasoning: true, coding: true, vision: false, toolCalling: true, contextLength: 32768, cost: "free" },
  available: () => reachable(`${process.env.AION_OLLAMA_URL || "http://127.0.0.1:11434"}/api/tags`),
  chat: async ({ messages }) => { const url = process.env.AION_OLLAMA_URL || "http://127.0.0.1:11434"; const r = await fetch(`${url}/api/chat`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ model: process.env.AION_OLLAMA_MODEL || "", messages, stream: false }), signal: AbortSignal.timeout(120000) }); if (!r.ok) throw new Error(`Ollama respondió ${r.status}`); const data = await r.json() as { message?: { content?: string } }; return { text: data.message?.content || "" }; },
};

export const managedProvider: ModelProvider = {
  id: "managed", label: "Managed LLM (opt-in)", capabilities: { reasoning: true, coding: true, vision: true, toolCalling: true, contextLength: 128000, cost: "paid" },
  available: async () => process.env.AION_MANAGED_LLM_ENABLED === "true" && Boolean(process.env.AION_MANAGED_LLM_URL),
  chat: async ({ messages }) => { if (process.env.AION_MANAGED_LLM_ENABLED !== "true" || !process.env.AION_MANAGED_LLM_URL) throw new Error("Managed LLM desactivado; requiere aprobación y configuración explícitas"); const r = await fetch(`${process.env.AION_MANAGED_LLM_URL}/chat/completions`, { method: "POST", headers: { "content-type": "application/json", ...(process.env.AION_MANAGED_LLM_API_KEY ? { authorization: `Bearer ${process.env.AION_MANAGED_LLM_API_KEY}` } : {}) }, body: JSON.stringify({ messages, stream: false }), signal: AbortSignal.timeout(120000) }); if (!r.ok) throw new Error(`Managed LLM respondió ${r.status}`); const data = await r.json() as { choices?: Array<{ message?: { content?: string } }> }; return { text: data.choices?.[0]?.message?.content || "" }; },
};

export const llamaCppProvider: ModelProvider = {
  id: "llama.cpp", label: "llama.cpp local", capabilities: { reasoning: true, coding: true, vision: false, toolCalling: false, contextLength: 32768, cost: "free" },
  available: () => reachable(`${process.env.AION_LLAMA_CPP_URL || "http://127.0.0.1:8080"}/health`),
  chat: async ({ messages }) => { const url = process.env.AION_LLAMA_CPP_URL || "http://127.0.0.1:8080"; const r = await fetch(`${url}/v1/chat/completions`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages, stream: false }), signal: AbortSignal.timeout(120000) }); if (!r.ok) throw new Error(`llama.cpp respondió ${r.status}`); const data = await r.json() as { choices?: Array<{ message?: { content?: string } }> }; return { text: data.choices?.[0]?.message?.content || "" }; },
};

export async function routeLocalModel(kind: TaskKind, options?: { allowManaged?: boolean }) {
  const providers = options?.allowManaged ? [ollamaProvider, llamaCppProvider, managedProvider] : [ollamaProvider, llamaCppProvider];
  const required: keyof ModelCapabilities | null = kind === "vision" ? "vision" : kind === "coding" ? "coding" : kind === "reasoning" ? "reasoning" : kind === "long_context" ? "contextLength" : null;
  const candidates = providers.filter(provider => required === null || (required === "contextLength" ? provider.capabilities.contextLength >= 16000 : Boolean(provider.capabilities[required])));
  for (const provider of candidates) if (await provider.available()) return { provider, kind, fallback: false };
  return { provider: null, kind, fallback: true };
}
