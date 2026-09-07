# Agentes

El agente inicial separa PLAN y AUDIT. PLAN crea tareas persistidas con dependencias, riesgo y resultado esperado; AUDIT inspecciona el proyecto y registra hallazgos. La finalización debe depender de evidencia, no de texto generado.

En v0.1, la ejecución de procesos, navegación y llamadas a herramientas de alto riesgo permanecen `NOT IMPLEMENTED`. La siguiente etapa debe implementar el ciclo PLAN → ACT → OBSERVE → TEST → DIAGNOSE → FIX con aprobación humana y checkpoints entre cambios.
