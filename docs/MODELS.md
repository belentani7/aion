# Modelos

AION detecta Ollama mediante `AION_OLLAMA_URL` y consulta `/api/tags` con timeout corto. Si no responde, el estado visible es **Sin motor local**. La ausencia de un modelo no activa ningún proveedor externo.

La siguiente iteración debe introducir una interfaz `ModelProvider` con `chat`, `streaming`, `tool calling`, `structured output`, embeddings y capacidades declaradas. Los adaptadores de llama.cpp y endpoints compatibles deben ser opt-in, con configuración separada y registro de coste. Un proveedor administrado solo podrá habilitarse mediante una aprobación explícita persistida.
