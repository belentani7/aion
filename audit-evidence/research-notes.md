# Evidencia de auditoría — referencias revisadas

## 1. mateusflorez/drizzle-multitenant

URL: https://github.com/mateusflorez/drizzle-multitenant

El repositorio presenta aislamiento por esquema, propagación explícita del contexto de tenant, migraciones paralelas y guards/interceptors para validar el tenant en frameworks Node. El patrón aplicable a AION es separar la resolución del tenant del acceso a datos y hacer que el contexto sea obligatorio en cada operación. También destaca la necesidad de migraciones reproducibles y de pruebas para guards, contexto y conexión.

Aplicación prevista: reemplazar las consultas globales `limit(1)` de AION por un `TenantContext` derivado del usuario autenticado, encapsular filtros por `tenantId` y añadir pruebas de aislamiento.

## 2. tapTapCode/saas-api-boilerplate

URL: https://github.com/tapTapCode/saas-api-boilerplate

El repositorio organiza explícitamente organizaciones, suscripciones, uso y webhooks; documenta tiers Free/Pro/Enterprise con límites distintos; utiliza Redis para rate limiting distribuido; y señala como riesgos conocidos la recuperación insuficiente de webhooks y la falta de granularidad en el rate limit. El patrón aplicable a AION es tratar billing, límites, idempotencia y uso como módulos independientes, sin confiar en cambios manuales del plan.

Aplicación prevista: verificar firmas Stripe, registrar eventos procesados idempotentemente, sincronizar estado de suscripción y centralizar las capacidades de cada plan.

## Hallazgos confirmados en AION

La implementación actual resuelve siempre el primer tenant con `limit(1)`, no asocia usuarios a tenants, no aplica RLS, no ofrece endpoint REST público de auditoría, calcula hashes con `Date.now()` y no compara el hash recomputado con `currentHash`. El webhook no verifica firma Stripe, el seed se ejecuta al arrancar y falla ante problemas de conexión, y `docker-compose.yml` referencia un Dockerfile inexistente.

Estos hallazgos son observaciones del código local y no dependen de snippets externos.

## Criterio de investigación

Se ampliará el corpus mediante GitHub Search/API y se registrarán URL, categoría, señales de calidad y patrón reutilizable. No se afirmará que se han inspeccionado 200 repositorios si la evidencia local no contiene sus metadatos o README procesados.
