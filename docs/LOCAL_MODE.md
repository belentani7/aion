# Local mode

En modo local, AION usa Ollama o llama.cpp cuando responden en sus endpoints locales. El router elige un proveedor local disponible y expone el tipo de tarea solicitado; si no encuentra ninguno devuelve fallback explícito sin redirigir a un servicio de pago.

El usuario debe iniciar el runtime local y configurar, si hace falta, `AION_OLLAMA_URL`, `AION_OLLAMA_MODEL` o `AION_LLAMA_CPP_URL`. Ninguna conversación, repositorio o credencial se envía fuera del entorno por defecto.
