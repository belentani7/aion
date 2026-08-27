import { invokeLLM, listLLMModels } from "../../server/_core/llm.ts";

const models = await listLLMModels();
if (!models.data.some(model => model.id === "qwen2.5-coder:0.5b")) throw new Error("Local Ollama model was not exposed through AIOND");

const response = await invokeLLM({ messages: [{ role: "user", content: "Responde únicamente: core local conectado" }] });
const content = response.choices?.[0]?.message?.content || "";
if (!content.trim()) throw new Error("Local gateway returned an empty completion");
console.log("CORE_LOCAL_GATEWAY=PASS");
