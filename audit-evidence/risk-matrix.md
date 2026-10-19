# AION Workforce — matriz de riesgo y deuda técnica

| ID | Área | Riesgo | Impacto | Probabilidad | Esfuerzo | Prioridad | Estado |
|---|---|---|---:|---:|---:|---:|---|
| R-01 | Tenancy | Error de membresía durante OAuth podría dejar al usuario sin tenant | 5 | 3 | 2 | P0 | Corregido y verificado con owner onboarding; falta E2E con dos tenants |
| R-02 | Tenancy | MySQL no proporciona RLS PostgreSQL | 5 | 5 | 5 | P0 | Declarado; migración a PostgreSQL sería decisión de arquitectura |
| R-03 | Nómina | Reglas legales/fiscales no modeladas | 5 | 4 | 5 | P0 | Pendiente de requisitos legales y revisión profesional |
| R-04 | API | Falta de E2E multi-tenant | 5 | 3 | 3 | P1 | Pendiente en staging |
| R-05 | Stripe | Price IDs, impuestos y cancelaciones de producción | 5 | 3 | 3 | P1 | Webhook/checkout preparados; configuración comercial pendiente |
| R-06 | Operación | Docker daemon no disponible en sandbox | 3 | 3 | 2 | P1 | Compose revisado; ejecución pendiente en CI/host |
| R-07 | Turnos | UI de edición, cancelación y filtros requiere E2E | 3 | 3 | 2 | P1 | Implementado y compilado; E2E pendiente |
| R-08 | Nómina | Exportación CSV y recibos requieren prueba de descarga autenticada | 3 | 3 | 2 | P1 | Implementado; E2E pendiente |
| R-09 | Ledger | Eventos históricos dependen de compatibilidad temporal acotada | 4 | 2 | 3 | P1 | Verificación retrocompatible ±5 s; versionado histórico recomendado |
| R-10 | Frontend | Accesibilidad automatizada no ejecutada | 3 | 3 | 2 | P2 | Revisión visual manual completada; automatización pendiente |
| R-11 | Frontend | Bundle JS supera 500 kB minificado | 2 | 4 | 3 | P2 | Build pasa; code-splitting recomendado |
| R-12 | Seguridad | Threat modeling STRIDE formal no completado | 4 | 2 | 3 | P2 | Pendiente de revisión independiente |

## Criterio

Impacto, probabilidad y esfuerzo se puntúan de 1 a 5. `P0` bloquea el uso productivo; `P1` requiere corrección antes de un piloto serio; `P2` es deuda gestionable pero debe planificarse.
