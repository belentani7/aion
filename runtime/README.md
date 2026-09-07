# AION Runtime (AIOND)

`aiond.mjs` is the executable core of AION. It is a local-only OpenAI-compatible gateway; it proxies **only** to Ollama or llama.cpp on `127.0.0.1`/`localhost` and never contains an API key or paid provider fallback.

## Run locally

Install Ollama on the machine that will host inference, start it, and pull a model. Then run:

```bash
node runtime/aiond.mjs
node runtime/aion.mjs status
node runtime/aion.mjs models
node runtime/aion.mjs plan "Audita este repositorio y ejecuta sus pruebas"
node runtime/aion.mjs chat "Resume los puntos de entrada de una aplicación Node"
AION_AGENT_APPROVED=YES node runtime/aion-agent.mjs /tmp/aion-workspaces/demo output.js "Escribe un script Node que imprima AION"
```

By default AIOND listens on `127.0.0.1:8088`, Ollama is expected on `127.0.0.1:11434`, and llama.cpp on `127.0.0.1:8080`. It does not bind to external interfaces.

`aion-agent.mjs` requires the explicit `AION_AGENT_APPROVED=YES` confirmation, only writes below `/tmp/aion-workspaces`, executes Node with `AION_NETWORK=OFF`, and appends an immutable JSONL-like audit record at `.aion/executions.jsonl` in the workspace.

## Minimum operational setup

The present workspace has no Ollama/llama.cpp binary and no GPU, so it cannot provide practical local coding inference. Run AIOND on the user's local machine with the model runtime and model weights; use the WebDev app only as the control plane if wanted.

For production use, place AIOND in a user-managed local host or server, protect it behind a local OS account, and never expose port 8088 publicly without a separate authentication and transport layer.
