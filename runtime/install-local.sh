#!/usr/bin/env bash
set -euo pipefail

if ! command -v ollama >/dev/null 2>&1; then
  echo "Installing Ollama from the official distribution..."
  curl -fsSL https://ollama.com/install.sh | sh
fi

echo "Ollama installed: $(ollama --version)"
echo "Start the local model server with: ollama serve"
echo "Then fetch a coding model, for example: ollama pull qwen2.5-coder:7b"
echo "Start AIOND separately with: node runtime/aiond.mjs"
