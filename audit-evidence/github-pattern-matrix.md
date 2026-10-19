# Matriz comparativa GitHub → AION Workforce

**Corpus:** 200 páginas públicas visitadas con HTTP 200 el 13 de agosto de 2026. 260 candidatos únicos fueron consultados mediante GitHub Search/API; se seleccionaron 200 para visita y se registraron en `github-repositories.csv`/`.json`.

La matriz no evalúa la seguridad total de cada repositorio. Resume patrones reutilizables observados por categoría, contrasta su aplicabilidad con el motor real MySQL/TiDB y señala la evidencia local de AION.

| Categoría observada | Repositorios representativos del corpus | Patrón observado | Estado en AION | Evidencia local | Riesgo/decisión |
|---|---|---|---|---|---|
| Contexto multi-tenant | [drizzle-multitenant](https://github.com/mateusflorez/drizzle-multitenant), [ultimate-backend](https://github.com/juicycleff/ultimate-backend), [nextacular](https://github.com/nextacular/nextacular) | Resolver organización desde identidad/contexto y no desde un `limit(1)` global | Adoptado en backend y UI | `server/tenant-context.ts`, `server/db.ts`, `Home.tsx` selector persistente | E2E con dos tenants pendiente |
| RBAC | [nextjs-fastify-saas-rbac](https://github.com/rcrdk/nextjs-fastify-saas-rbac) y resultados `rbac` | Jerarquía de roles y guards antes de mutaciones | Adoptado | `requireRole`, `roleRank`, procedimientos protegidos | Falta prueba de integración por rol en DB |
| Aislamiento SQL | Resultados `postgres row level security saas`, [drizzle-multitenant](https://github.com/mateusflorez/drizzle-multitenant) | RLS o filtros obligatorios por tenant en cada consulta | Parcial/adaptado | filtros `tenantId`, joins defensivos, FK e índices | RLS PostgreSQL no aplica a MySQL/TiDB |
| Esquema de membresías | Resultados `multi-tenant saas`, [nextacular](https://github.com/nextacular/nextacular) | Tabla organización-usuario con rol/estado y unicidad | Adoptado | `tenant_members`, índice único tenant/user | Invitaciones completas quedan fuera del MVP |
| Billing por módulos | [saas-api-boilerplate](https://github.com/tapTapCode/saas-api-boilerplate), [nextacular](https://github.com/nextacular/nextacular) | Billing, capacidades y webhooks separados del dominio | Adoptado | `stripe.service.ts`, `stripe.webhook.ts`, `planLimits` | Price IDs y reglas comerciales de producción pendientes |
| Idempotencia Stripe | [saas-api-boilerplate](https://github.com/tapTapCode/saas-api-boilerplate) y resultados `stripe subscriptions typescript` | Verificar firma y deduplicar por ID de evento | Adoptado | raw middleware antes de JSON, `event.id`, evento test | Falta prueba con firma real y sandbox reclamado |
| Límites de uso | Resultados `multi tenant saas`, `workforce management typescript` | Capacidad centralizada por plan y enforcement server-side | Adoptado parcialmente | límite de empleados, calendario avanzado, incidencias, CSV | Falta matriz E2E de todas las capacidades |
| Ledger append-only | Resultados `audit trail typescript`, `hash chain typescript` | Registro inmutable con hash previo, payload canónico y verificación | Adoptado | `ledger.service.ts`, tests SHA-256, endpoint público | Versionar representación temporal histórica |
| Integridad verificable externa | Resultados `audit ledger sha256 typescript` | Endpoint de auditoría que expone cadena verificable sin payload sensible | Adoptado | `/api/audit/verify`, smoke test sobre 20 eventos | Rate limiting público recomendado |
| Concurrencia | [ultimate-backend](https://github.com/juicycleff/ultimate-backend) y resultados `event sourcing` | Lock/transacción para secuencias y eventos | Adoptado en ledger | `SELECT ... FOR UPDATE`, transacción | Requiere prueba de carga concurrente |
| Scheduling | Resultados `nodejs employee scheduling`, `calendar scheduling react typescript` | Rangos temporales, filtros, vista semanal/mensual y acciones inline | Adoptado en MVP | `shifts.list`, calendario React, filtros, editar/cancelar | E2E visual y zona horaria avanzada pendientes |
| Payroll/timesheets | Resultados `timesheet payroll nodejs`, `workforce payroll shifts` | Derivar horas desde turnos completados y guardar recibo por período | Adoptado | `TIMESTAMPDIFF`, `calculatePeriod`, `payrollEntries` | Reglas laborales/fiscales reales no incluidas |
| Exportación | Resultados `react payroll management`, `payroll management typescript` | Exportación server-side con autorización por plan | Adoptado | `payroll.csv`, descarga CSV UI | PDF/firmado electrónico fuera de alcance |
| Perfil de empleado | Resultados `employee scheduling`, `workforce management typescript` | Historial vinculado de turnos, nóminas e incidencias | Adoptado en UI | `employees.get`, panel scrollable de historial completo | Paginación server-side recomendable para grandes tenants |
| Incidencias | Resultados `workforce management typescript` | Incidencias con severidad/estado y permisos de manager | Adoptado parcialmente | router `incidents`, límite Pro/Enterprise | Falta UI dedicada de edición/listado |
| Frontend operativo | [nextacular](https://github.com/nextacular/nextacular), resultados `react payroll management` | Dashboard de métricas, responsive y estados de acción | Adoptado | `Home.tsx`, revisión visual desktop/móvil | Accesibilidad automatizada pendiente |
| Configuración Docker | Resultados `saas boilerplate docker`, `nodejs mysql saas` | Servicio DB separado y app Node reproducible | Adaptado | `docker-compose.yml` MySQL 8.4 | Docker daemon no disponible en sandbox |

## Decisiones de descarte

| Patrón | Motivo de no adopción literal |
|---|---|
| RLS PostgreSQL | La base gestionada comprobada es MySQL/TiDB; mezclar dialectos sería más peligroso que declarar la limitación. |
| Redis obligatorio para rate limiting | No existe dependencia ni requisito operativo en el MVP; se priorizó el aislamiento y la idempotencia. Debe añadirse antes de exponer endpoints públicos a tráfico alto. |
| Event sourcing completo | AION necesita un ledger de auditoría encadenado, no reconstruir todo el estado del dominio desde eventos. |
| Microservicios/CQRS | El runtime gestionado es un único proceso Node; separar servicios aumentaría complejidad y superficie operacional sin evidencia de necesidad. |
| Stripe como fuente duplicada de importes/estado | Se conservan IDs esenciales y datos de negocio; los detalles de Stripe deben consultarse desde Stripe. |

## Evidencia de visita

La evidencia de las 200 visitas HTTP se encuentra en `github-repositories.csv` y `github-repositories.json`; la ejecución corregida está en `github-corpus-run.log` y reporta `requested: 200`, `visited: 200`, `uniqueCandidates: 260`, con `pageStatus: 200` para los 200 registros seleccionados.
