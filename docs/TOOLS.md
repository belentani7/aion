# Herramientas

Cada herramienta declara nombre, descripción, permisos, nivel de riesgo y estado. En v0.1 el registro visible incluye filesystem, terminal, Git, tests, browser y managed_llm.

Filesystem implementa inspección real del workspace. Git remoto, terminal, tests y browser se muestran como `NOT IMPLEMENTED` o bloqueados cuando la política actual no permite ejecutarlos. Antes de habilitarlos deben registrar entrada, salida, código de salida, duración, aprobación y resultado.
