# Seguridad y control

La red está desactivada por defecto y el proveedor administrado no se activa automáticamente. Las rutas se normalizan y deben permanecer bajo `/home/ubuntu` o `/tmp/aion-workspaces`; los nombres sensibles `.env`, `.env.local`, `.ssh` y configuraciones Git privadas se bloquean.

Las operaciones de alto riesgo se registran como aprobaciones pendientes. Terminal, tests, browser y clonación remota no se presentan como funcionales hasta añadir un ejecutor aislado con allowlist de comandos, límites de CPU/tiempo, red explícita, redacción de secretos y auditoría de entradas y salidas.
