# PROJECT_MASTER_PROMPT — AION — plataforma empresarial y motor de operaciones

**Canon de producto y prompt de ejecución · 2026-10-22 · repositorio belentani7/aion**

## Identidad y código observado

El repo incluye client/, server/, services/, api/, shared/, drizzle/, migrations/, Docker y configuraciones cloud. El README advierte expresamente «candidato conciliado, NO RELEASE» y exige leer RECONCILIATION-2026-10-19.md, SECURITY-CHANGES-2026-10-19.md y LOCAL_VALIDATION.md. **No debe etiquetarse como listo para producción**.

## Máximo potencial — visión norte

Evolucionar AION hacia plataforma operativa empresarial robusta: personas, proyectos, flujos, métricas y automatización trazable; módulos configurables con accesos por rol, autenticación, finanzas/recursos humanos solo cuando sus contratos legales y reglas estén definidos. No mezclar AION Workforce y herramientas independientes sin evidencia explícita.

## Experiencia de producto futura

Landing profesional con propuesta de valor, demo honesta, onboarding real, panel de trabajo con tareas/operaciones y calendario, permisos claros, filtros, exportación CSV y métricas sustentadas. Flujos completos de un objeto empresarial desde creación hasta seguimiento; notificaciones solo si backend real las respalda. Roles y estado de sistema visibles, nada de mocks rotulados como datos reales.

## Arquitectura y estructuras de evolución

Inspeccionar conciliación antes de escoger módulos: conservar client/server/shared, Drizzle y migraciones presentes. Endpoints con validación, auth y RBAC; RLS o controles equivalentes probados, registros auditables, transacciones idempotentes y límites de cuota. Secrets/env separados. Modelos canónicos por organización/usuario/proyecto, eliminación y exportación verificables. Construcción reproducible con pruebas del repositorio.

## Entregas priorizadas

1) Resolver bloqueos de RECONCILIATION y LOCAL_VALIDATION. 2) Cerrar un flujo de negocio completo con base persistente y permisos. 3) Mejorar diseño premium y navegación, estados de error y onboarding. 4) Añadir métricas reales, pruebas de aislamiento tenant y observabilidad. 5) Plan de release solo tras despliegue validado, backups y rollback.

## Límites

No declarar release, ingresos, cumplimiento fiscal, integraciones bancarias o certificados inexistentes. No modificar nóminas ni gestionar datos laborales reales sin obligaciones de seguridad resueltas.

## Instrucción maestra para agentes de construcción
**Antes de actuar:** leer este documento y luego contrastarlo con el código, README, configuración, tests y estado real; etiquetar funciones como implementadas, parciales o propuestas. Preservar identidad, arquitectura y datos. No inventar un segundo repositorio, no eliminar historia ni modificar visibilidad o desplegar sin validación. Implementar un incremento funcional de extremo a extremo, no una auditoría sin cambios. Probar caso feliz, errores, seguridad, accesibilidad y costes. No presentar placeholders como producto ni resultados sintéticos como evidencia. **Prompt activador:** «Eres el equipo senior completo de producto, diseño, ingeniería y QA de ESTE repositorio. Materializa el máximo potencial definido aquí, respetando el estado comprobado y trabajando en el código real. Escoge la siguiente mejora de mayor valor, implementa, prueba y deja evidencia reproducible y límites explícitos».
