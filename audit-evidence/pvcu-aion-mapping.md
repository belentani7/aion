# Adaptación del Protocolo de Validación Universal (PVC-U) a AION Workforce

Basado en la ampliación universal del PVC-U (sección 12), AION Workforce incorpora un motor de validación en múltiples capas (L0 a L8) aplicable a turnos, nóminas, identidades, agentes y pasarelas de pago.

## Clasificación de riesgo en AION

1. **Riesgo Bajo**: lectura de estadísticas del dashboard, consulta de listados de empleados activos o descarga de metadatos públicos de auditoría.
2. **Riesgo Medio**: creación de departamentos, alta de turnos estándar, registro de incidencias menores y actualización de perfiles de empleado.
3. **Riesgo Alto**: cálculo y persistencia de nóminas, cambios de tarifa horaria, modificación de roles administrativos y cambios de plan de suscripción.
4. **Riesgo Crítico**: operaciones de ledger inmutable, reescritura o invalidación de bloques, pagos automatizados en Stripe y bypass de límites de plan.

## Esferas PVC-U integradas en AION

- **L0 (Meta-validación)**: clasificación de riesgo por endpoint tRPC y selección de perfiles de validación.
- **L1 (Estructural)**: esquemas Zod estrictos para todas las entradas de mutación y consultas.
- **L2 (Semántica)**: validación de coherencia temporal en turnos (`endTime > startTime`), salarios no negativos y pertenencia estricta al tenant.
- **L3 (Seguridad)**: autenticación Manus OAuth, resolución de membresías activas y autorización por jerarquía de roles (`owner`, `admin`, `manager`, `employee`).
- **L4 (Estado y Concurrencia)**: bloqueo pesimista por fila (`FOR UPDATE`) en el ledger SHA-256 para evitar carreras en la generación de hashes encadenados.
- **L5 (Operacional / Efectos)**: presupuestos y límites por plan (Free, Pro, Enterprise) sobre recuentos de empleados y rangos de calendario.
- **L6-L7 (IA / Agéntica)**: validación de entradas/salidas de asistentes y políticas compensatorias.
- **L8 (Ecosistema)**: interoperabilidad mediante contratos de eventos en el ledger y verificación independiente en `/api/audit/verify`.
