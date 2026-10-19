# Matriz de Enforcement de Planes y Capacidades — AION Workforce

A continuación se detalla la matriz de capacidades por plan en AION Workforce, utilizada para el enforcement en procedimientos tRPC y contratos de base de datos.

| Capacidad | Plan Free | Plan Pro | Plan Enterprise |
|---|---|---|---|
| **Empleados Activos** | 5 | 100 | Ilimitado (`Number.MAX_SAFE_INTEGER`) |
| **Exportación de Auditoría (CSV)** | No (`false`) | Sí (`true`) | Sí (`true`) |
| **Calendario Avanzado** | No (`false`) | Sí (`true`) | Sí (`true`) |
| **Gestión de Incidencias** | No (`false`) | Sí (`true`) | Sí (`true`) |
| **Convenios Colectivos** | No (`false`) | Sí (`true`) | Sí (`true`) |
| **Gestión de Ausencias** | No (`false`) | Sí (`true`) | Sí (`true`) |
| **Retención de Evidencia** | 7 días | 365 días | 2555 días (7 años) |
| **Historial Ilimitado** | No (`false`) | No (`false`) | Sí (`true`) |

## Garantías de Enforcement
1. **Empleados:** El procedimiento `employees.create` evalúa el recuento actual de empleados activos y compara con `planLimits[plan].employees`.
2. **Exportación CSV:** El procedimiento `payroll.csv` rechaza la solicitud con código `FORBIDDEN` si `planLimits[plan].auditExport` es falso.
3. **Convenios Colectivos:** El procedimiento `agreements.create` y `agreements.list` rechazan solicitudes de tenants en plan Free.
4. **Ausencias:** El procedimiento `absences.create` y `absences.list` validan la capacidad `absences` del plan activo.
