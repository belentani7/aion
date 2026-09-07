# AION: arquitectura inicial

AION v0.1 se organiza alrededor de un control center React + tRPC + Express. El panel consulta un estado agregado que reúne proyectos, ejecuciones, aprobaciones, herramientas y runtime de modelos. La persistencia usa tablas separadas para `aion_projects`, `aion_audit_findings`, `aion_executions`, `aion_approvals` y `aion_session_memory`.

## Contratos actuales

El importador de filesystem acepta únicamente rutas bajo `/home/ubuntu` o `/tmp/aion-workspaces`, no atraviesa rutas sensibles y nunca lee archivos `.env`. El análisis inspecciona la estructura visible, manifiestos conocidos, scripts, posibles entrypoints y riesgos básicos. Cada importación produce un registro de ejecución.

El registro de herramientas es explícito. Filesystem y Git aparecen como disponibles para inspección; terminal, tests y browser permanecen `NOT IMPLEMENTED` hasta completar un ejecutor aislado. El proveedor administrado se muestra como `disabled_by_default` y no existe una ruta automática de activación.

## Límites honestos de v0.1

La clonación Git remota se registra como solicitud pendiente y queda bloqueada porque la red está apagada por defecto. La aprobación aún no puede resolverse desde la UI: su procedimiento devuelve `NOT IMPLEMENTED` hasta añadir identidad, confirmación fuerte y auditoría de la decisión. El router comprueba Ollama en `AION_OLLAMA_URL` o `http://127.0.0.1:11434`, pero todavía no ejecuta chat ni tool calling. El terminal y los tests requieren una capa de proceso aislada, límites de recursos, red y secretos antes de habilitarse.

Estas limitaciones son visibles en la interfaz y no se sustituyen por respuestas simuladas.
