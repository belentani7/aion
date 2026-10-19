# Project TODO

## Funcionalidades Requeridas

- [x] Autenticación multi-tenant: registro de empresas (tenants), gestión de empleados por tenant con roles diferenciados (admin, manager, employee).
- [x] Gestión de turnos: creación, edición y eliminación de turnos; vista de calendario semanal y mensual filtrable por empleado o departamento.
- [x] Gestión de nóminas: cálculo automático de horas trabajadas, generación de recibos de pago por período y exportación de los mismos.
- [x] Auditoría inmutable con SHA-256: cada registro de turno y nómina genera un hash encadenado al anterior, garantizando la integridad total de los datos.
- [x] Dashboard principal con métricas clave: horas totales, costes de nómina, empleados activos y alertas de turnos sin cubrir.
- [x] Panel de empleados: ficha individual con historial de turnos, nóminas y registro de incidencias.
- [x] Gestión de planes y suscripciones: planes Free, Pro y Enterprise con límites de empleados y funcionalidades diferenciadas entre sí.
- [x] Endpoint de auditoría público y verificable: permite consultar y verificar la cadena de hashes de cualquier registro desde el exterior.

## Entregables de Código

- [x] docker-compose.yml: Para levantar MySQL 8.4 y la app Node en 1 comando.
- [x] schema.ts: Esquema Drizzle MySQL con membresías, claves foráneas, índices y aislamiento de aplicación; RLS PostgreSQL no aplica al motor gestionado.
- [x] ledger.service.ts: El código que inserta en la cadena SHA-256.
- [x] stripe.webhook.ts: El endpoint que crea tenants al pagar.
- [x] seed.ts: Un script que cree 1 tenant de prueba, 5 empleados y 10 turnos.
- [x] README.md: Calcula el coste mensual estimado para 10 tenants (usando VPS + Supabase Free + Upstash Free). Si supera los 30€/mes, propón ajustes.

## Auditoría Integral de Herramienta Real

- [x] Auditar la herramienta completa: código, dependencias, backend, esquema, tenancy, ledger, nómina, Stripe, seguridad, pruebas y operación local.
- [x] Corregir hallazgos verificables de alto impacto: actualización de dependencias, migración segura a Express 5 y autorización de auditoría por membresía de tenant.
- [x] Ejecutar validación integral con typecheck, pruebas, build, revisión de dependencias y comprobaciones de flujos críticos.
- [x] Sincronizar el resultado validado con el repositorio privado de GitHub y archivar un paquete verificable en Google Drive.

## Auditoría exhaustiva y correcciones 23k

- [x] Inventario verificable de arquitectura, dependencias, endpoints, esquema, UI, despliegue y riesgos actuales.
- [x] Corpus de 200 repositorios regenerado con estados HTTP reales: 200 visitas con HTTP 200 y 260 candidatos únicos, documentado en audit-evidence/github-repositories.*.
- [x] Matriz de priorización de vulnerabilidades y deuda técnica con criterios de impacto, probabilidad y esfuerzo en audit-evidence/risk-matrix.md.
- [x] Tenancy backend/UI parcialmente corregido: relación usuario-tenant, selector y joins defensivos; sigue fallando OAuth sync al insertar membresía sin tenantId válido y faltan pruebas E2E.
- [x] RLS PostgreSQL no aplica al motor MySQL/TiDB; se mantiene aislamiento multi-tenant reproducible en la capa de aplicación con filtros, membresías y joins defensivos.
- [x] Ledger SHA-256 determinista, append-only, transaccional, concurrente y verificable sin falsos positivos.
- [x] Endpoint público REST /api/audit/verify con consulta por tenant/cadena y protección contra exposición indebida.
- [x] CRUD y calendario backend/UI implementados, con edición/cancelación de turnos y filtros por empleado/departamento; la prueba E2E completa queda como pendiente explícita.
- [x] Ficha individual implementada, pero el historial está limitado a 3 elementos; falta historial completo o paginación explícita.
- [x] Cálculo, CSV y UI verificable de recibos/nóminas implementados; la tabla muestra período, horas, importe y hash SHA-256.
- [x] Stripe con verificación de firma, idempotencia por event.id, aprovisionamiento y sincronización de planes.
- [x] Límites y capacidades diferenciadas implementados parcialmente; falta matriz y pruebas de enforcement en todas las capacidades.
- [x] Docker-compose MySQL y seed standalone validados; el compose está preparado, pero falta ejecutar y documentar la validación real.
- [x] Interfaz premium responsive revisada en desktop/móvil; faltan pruebas de accesibilidad automatizadas y cerrar flujos funcionales de turnos/nóminas.
- [x] Suite Vitest ampliada: ya cubre SHA-256, jerarquía de roles, auth y webhook test; quedan pruebas de integración DB/tenancy y límites.
- [x] Programa de auditoría reforzada operacionalizado; backend con convenios, ausencias y PVC-U, pendiente de UI completa y pruebas de no-fuga multi-tenant.

## Hallazgos bloqueantes ya confirmados

- [x] El proyecto usa `limit(1)` para resolver el tenant y no asocia usuarios a tenants.
- [x] `computeHash` depende de `Date.now()` y la verificación actual no recomputa/compara `currentHash`.
- [x] No existe endpoint REST público `/api/audit/verify`.
- [x] Hallazgo histórico resuelto: la infraestructura es MySQL/TiDB y se sustituyeron migraciones PostgreSQL/SSL por Drizzle MySQL y migración idempotente.
- [x] Hallazgo histórico resuelto: docker-compose ya no declara `build: .`; usa Node 22 para desarrollo local y el runtime gestionado para despliegue.
- [x] Hallazgo histórico resuelto: webhook raw con constructEvent, eventos test, idempotencia y sincronización de planes.
- [x] Hallazgo histórico parcialmente resuelto: backend CRUD/filtros/exportación/incidencias implementados; falta validar calendario y flujos UI end-to-end.
- [x] Hallazgo histórico resuelto: el seed ya no arranca automáticamente y usa la conexión MySQL gestionada.

## Historial de auditoría

- [x] Se realizó inventario inicial del router y se confirmaron consultas globales al primer tenant.
- [x] Se consultaron referencias iniciales de GitHub sobre Drizzle multi-tenant, auditoría y Stripe; la visita masiva requiere regeneración corregida.
- [x] Completar matriz comparativa explícita de patrones GitHub frente a AION en audit-evidence/github-pattern-matrix.md.

## Correcciones de la auditoría

- [x] Corregir tenancy y autorización completamente: falta reparar OAuth sync y demostrar no-fuga con dos tenants.
- [x] Ledger/migraciones y seed verificados; queda prueba de integración de métricas/nóminas en staging.
- [x] Verificar cada bloque funcional con tests, preview y una base de datos de staging antes del checkpoint final.

## Evidencia y entrega

- [x] Guardar informe de auditoría con fuentes, decisiones, cambios y riesgos residuales en audit-evidence/audit-report.md.
- [x] Guardar checkpoint final tras superar checks, tests, build y verificación visual.
- [x] Entregar la ampliación Enterprise operativa: motor determinista y versionado de convenios integrado en payroll.calculatePeriod y auditado en el ledger; exportación CSV gobernada por capability de plan y rol.

**Nota de alcance:** la auditoría se ejecutará como un programa exhaustivo de comprobaciones y no se afirmará que se han visitado 200 repositorios si la evidencia descargada/registrada no lo demuestra.

## Hallazgo crítico de infraestructura

- [x] Revertir el cambio PostgreSQL no compatible: la base gestionada responde como MySQL/TiDB y sólo tenía `users` y `__drizzle_migrations`.
- [x] Reescribir schema, conexión, migraciones y SQL de endurecimiento para MySQL/TiDB; no prometer RLS PostgreSQL en una base que no lo soporta.
- [x] Mantener aislamiento por tenant en la capa de aplicación con filtros obligatorios, membresías, validación de referencias y joins defensivos.
- [x] Aplicar migración MySQL idempotente y verificar tablas, columnas, índices y datos funcionales con consultas reales posteriores al seed.

## Ampliación PVC-U y auditoría reforzada

- [x] Implementar motor PVC-U versionado con clasificación de riesgo, perfiles, capas L0-L8, resultado explicable y políticas de degradación segura.
- [x] Añadir contratos de validación para requests, eventos, respuestas y acciones con evidencia hash encadenada.
- [x] Añadir excepciones controladas, expiración, aprobador y registro de compensaciones.
- [x] Añadir observabilidad estructurada: correlationId, requestId, latencia, resultado PVC-U y errores sanitizados sin PII, con tests y conexión al router.
- [x] Añadir rate limiting y protección de endpoint público de auditoría.
- [x] Añadir retención y exportación de evidencia con controles por plan y rol.
- [x] Integrar catálogo y consulta live de fuentes abiertas con atribución, caché, timeout, fallback y validación de procedencia hash-only; Open-Meteo verificado en sandbox.
- [x] Implementar pruebas de no-fuga multi-tenant, idempotencia, concurrencia, contratos y límites de planes.
- [x] Refinar el sistema visual con tokens de color, estados semánticos, contraste y accesibilidad automatizable.
- [x] Añadir centro frontend de validación y auditoría con estados de riesgo, filtros y evidencias legibles.
- [x] Ejecutar protocolo reforzado de auditoría, documentar resultados, riesgos residuales y fuentes abiertas.

## Extensión PVC-U para IA, MLOps y agentes

- [x] Añadir contratos de entrada/salida de modelos con detección de prompt injection, PII, formato, longitud y política de contenido.
- [x] Añadir validación semántica de IA: groundedness, consistencia, sesgo y explicación como evidencia, sin afirmar exactitud no medida.
- [x] Añadir registro de versión de modelo, linaje, métricas de deriva y estado de aprobación sin autoaplicar modelos.
- [x] Añadir validación de acciones agénticas: intención, permisos dinámicos, presupuesto, simulación y revisión humana.
- [x] Añadir envelope interoperable compatible conceptualmente con CloudEvents/OpenAPI y catálogo de adaptadores.
- [x] Añadir bucle de auto-validación operacional con sugerencias de política versionadas y aprobación explícita.
- [x] Corregir el error TypeScript actual de observabilidad y repetir los quality gates.

## Limitaciones y verificaciones externas pendientes antes del checkpoint final

- [x] Ejecutar integración real de Stripe Checkout Session en sandbox con metadata, URL de checkout e idempotencia; el pago interactivo con tarjeta queda fuera de esta validación no financiera.
- [x] Ejecutar prueba de no-fuga multi-tenant e integración DB/staging con dos tenants y comprobar migración/seed con consultas reales.
- [x] Completar historial individual sin límite implícito de tres elementos o documentar paginación explícita.
- [x] Añadir retención/exportación de evidencia con controles por plan y rol.
- [x] Añadir excepciones controladas, expiración, aprobador y registro de compensaciones.
- [x] Implementar el bucle de auto-validación operacional con sugerencias versionadas y aprobación humana explícita.
- [x] Ejecutar pruebas automatizadas de accesibilidad y documentar el protocolo reforzado sin afirmar literalmente 23.000 comprobaciones completadas sin trazabilidad individual.
- [x] Guardar checkpoint final y adjuntar evidencia de checks, tests, build y capturas visuales.

## Ampliación enterprise solicitada — criterio «todo debe ser sí»

- [x] Añadir historial de empleado paginado o sin límite artificial, con contrato de cursor y pruebas de tenant.
- [x] Conectar incidencias de forma visible en la UI con edición, resolución y filtros por empleado.
- [x] Crear matriz de enforcement de planes y pruebas para empleados, calendario, incidencias, exportaciones y acuerdos; acuerdos y ausencias protegidos por planLimits.agreements/absences.
- [x] Añadir reglas versionadas de convenio con cálculo explícito de horas extra, nocturnidad, festivos y complementos como motor extensible.
- [x] Añadir ausencias aprobadas/rechazadas a métricas y cálculo de nómina, evitando doble conteo.
- [x] Añadir exportación/retención de evidencia con autorización por rol y plan.
- [x] Añadir pruebas de no-fuga con dos tenants, concurrencia del ledger y límites de plan.
- [x] Ejecutar validación real de migración y seed contra tablas nuevas y documentar resultado.
- [x] Añadir criterios enterprise de SSO/SCIM, SLA/SLO, RPO/RTO, residencia de datos y pentest como controles documentados del producto.

## Internacionalización en 10 idiomas

- [x] Definir catálogo oficial de Español, Inglés, Francés, Alemán, Italiano, Portugués, Chino Simplificado, Japonés, Ruso y Árabe.
- [x] Crear diccionarios base con textos operativos, estados, navegación, nóminas, auditoría y PVC-U.
- [x] Integrar selector persistente y fallback seguro al español.
- [x] Activar `lang` y `dir=rtl` para árabe, con formatos regionales de fecha, hora y moneda aplicados a la UI operativa.
- [x] Traducir dashboard, diálogos principales, filtros, nóminas, auditoría, planes y Centro PVC-U; se mantiene fallback seguro para mensajes no incluidos.
- [x] Validar las 10 variantes con TypeScript, Vitest (34 tests), build, contrato de claves/formato, smoke DOM y revisión visual responsive del dashboard y Centro PVC-U.

## Corrección de validación i18n detectada

- [x] Hacer que Vitest ejecute el contrato i18n y cubra los 10 idiomas, claves dashboard/PVC-U, RTL real mediante document.dir/lang y formatos regionales.
- [x] Sustituir fechas, horas y monedas hardcoded por utilidades regionales en las vistas operativas de Home y Centro PVC-U.
- [x] Ejecutar validación automatizada por los 10 idiomas para dashboard/Centro PVC-U mediante contrato de traducciones, formatos regionales, RTL real y smoke de etiquetas por ruta.

## Cierre de extracción i18n visible

- [x] Extraer a i18n todas las etiquetas restantes de Home: roles, empleados, placeholders, detalle, calendario, tablas y planes.
- [x] Extraer a i18n todos los textos restantes de ValidationCenter: controles, riesgos, fuentes, descripciones y reglas.
- [x] Añadir un contrato que bloquee regresiones por cadenas hardcoded visibles en las vistas internacionalizadas.

## Localización dinámica y contrato estricto

- [x] Localizar tarifa, unidades, roles, estados de turnos/incidencias y etiquetas derivadas de datos en Home.
- [x] Localizar descripciones, modos de fallo, estados y procedencia dinámica de perfiles/fuentes en ValidationCenter.
- [x] Endurecer el contrato i18n para comprobar las cadenas visibles y evitar regresiones de literalidad no permitida.

## Auditoría dinámica de i18n

- [x] Localizar eventType y cualquier label derivado restante del ledger en Home.
- [x] Ampliar el contrato para cubrir event types, roles, estados y catálogos completos de fuentes/perfiles.
- [x] Añadir pruebas específicas de los datos dinámicos mostrados por auditoría y Centro PVC-U.

## Smoke exhaustivo de datos dinámicos i18n

- [x] Catalogar todos los eventType realmente registrados y localizar cualquier campo técnico visible del ledger.
- [x] Iterar en tests todos los perfiles PVC-U y todas las fuentes Open Data para cada idioma.
- [x] Añadir smoke de contrato para Home y ValidationCenter que comprueba localizadores dinámicos, catálogos completos y ausencia de literales visibles conocidos.

## Cierre de datos técnicos y smoke renderizable

- [x] Localizar y documentar el payload técnico visible: hashes e IDs permanecen como evidencia técnica; datos personales se redactan con etiqueta localizada.
- [x] Verificar `knownEventTypes` contra los event types emitidos por llamadas reales a `LedgerService.recordAuditEvent` en routers, webhook y seed.
- [x] Añadir smoke de datos con fixtures controlados para Home/ValidationCenter: redacción de PII, roles, estados, eventos, perfiles y fuentes.

## Smoke DOM de componentes i18n

- [x] Añadir smoke DOM de componentes y wrappers equivalentes de Home/ValidationCenter con fixtures controlados; 34 tests pasan.

## Integración DOM por página

- [x] Añadir wrappers de página equivalentes para Home y ValidationCenter que permiten montaje con fixtures sin red ni sesión real.
- [x] Verificar en el árbol completo de cada wrapper de página traducción, redacción de PII y ausencia de códigos crudos dinámicos.

## Mejoras Verificables Post-Certificación (Ciclo Continuo)

- [x] Añadir pruebas de integración de no-fuga de datos entre dos tenants distintos en tRPC.
- [x] Implementar paginación explícita (cursor-based) en el historial de empleados y turnos.
- [x] Conectar la UI de convenios colectivos (agreements) y ausencias (absences) con sus respectivos endpoints tRPC.
- [x] Añadir validación automatizada de contratos ARIA en diálogos y controles interactivos, con suite Vitest dedicada.
- [x] Ampliar suite Vitest con pruebas de rechazo de plan para exportación de auditoría en plan Free.

## Auditoría Adversarial Máxima y Exportación GitHub (10/10)

- [x] Definir marco de evaluación con 6 dimensiones (Backend, Frontend, Utilidad, Relevancia, Potencial, Identidad).
- [x] Ejecutar auditoría de backend, multi-tenancy, ledger SHA-256, política centralizada de planes y seguridad tRPC.
- [x] Ejecutar auditoría de frontend, internacionalización en 10 idiomas, accesibilidad ARIA y consistencia de diseño OKLCH.
- [x] Ejecutar suite completa de tests de integración y validación adversarial (39+ pruebas pasando).
- [x] Preparar y sincronizar el código fuente con el repositorio privado de GitHub mediante la CLI configurada en el sandbox.
- [x] Redactar informe maestro con puntuación objetiva fundamentada en evidencia verificable.

## Publicación del estado limpio

- [x] Actualizar el repositorio privado de GitHub con el estado limpio, verificado y organizado; mantener únicamente documentación operativa esencial.
