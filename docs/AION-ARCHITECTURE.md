# EXTRACCION COMPLETA: chat-AION + fff.txt
> Extraido el 2026-07-25. Fuentes: Downloads/chat-AION + Desktop/fff.txt

---

## 1. PROYECTO AION WORKFORCE (SaaS Enterprise)

### 1.1 Que es
Plataforma universal de gestion de turnos, ausencias, cumplimiento laboral, planificacion operativa, adherencia en tiempo real y pre-nomina. Vendible a empresas medianas y grandes.

**Potencial estimado**: $2B-$4B (nivel Google/Microsoft)

### 1.2 Arquitectura Tech Stack
| Capa | Tecnologia |
|------|------------|
| Backend | FastAPI + Pydantic + SQLAlchemy + Alembic + Celery |
| Base de Datos | PostgreSQL (RLS multi-tenant) + Redis |
| Frontend | React + Vite + TypeScript + FullCalendar + Three.js (3D) |
| Planificacion | Google OR-Tools CP-SAT + Algoritmo Genetico + RL |
| Infraestructura | Kubernetes + GCP + Terraform + Argo CD |
| Seguridad | SOC 2 Tipo II + ISO 27001 + ENS Alta |

### 1.3 Modulos del Sistema
1. **Identity & Access**: Multi-tenant, RBAC/ABAC, SSO/SAML/OIDC, SCIM
2. **Turnos 24/7**: Multi-mercado (ES, PT, FI), cobertura 30% min
3. **Cumplimiento Legal**: Motor de reglas versionado (Directiva 2003/88/CE, ET, RD 1561/1995, RGPD)
4. **Ausencias**: 16+ tipos, workflow de aprobacion, impacto en cobertura
5. **Pre-Nomina**: Ledger inmutable, ajustes, exportacion CSV/API
6. **Tiempo Real**: WebSockets/SSE, dashboards, alertas, heatmaps
7. **Notificaciones**: In-app, email, SMS, push, webhook, calendario
8. **Auditoria**: Append-only, hash chain, RGPD
9. **Billing**: Facturacion por seats, planes, limites por plan
10. **Doctor Autonomo**: Self-healing, chaos testing, rollback automatico

### 1.4 Base de Datos (36+ tablas)
```
tenants, users, tenant_roles, employees, contracts, skills,
employee_skills, locations, cost_centers, shift_templates,
shifts, shift_assignments, shift_swaps, absences, absence_types,
absence_approvals, coverage_requirements, compliance_rules,
compliance_rule_versions, compliance_checks, compliance_violations,
compliance_overrides, payroll_rules, payroll_periods, payroll_entries,
payroll_adjustments, notifications, notification_events, audit_logs,
domain_events, rta_events, integrations, webhook_endpoints,
webhook_deliveries, billing_plans, subscriptions, usage_metrics,
feature_flags, api_keys, sessions, devices, incidents, runbooks
```

### 1.5 Roles del Sistema
- owner, admin, squad_lead, operator, employee, auditor, billing, integration

### 1.6 Motor Legal (Reglas Versionadas)
Cada regla tiene: id, nombre, jurisdiccion, norma, articulo, fuente oficial, fecha efectiva, severidad (info/warning/hard_stop), parametros, formula, pruebas, version, estado (draft/active/deprecated)

### 1.7 Plan de Ejecucion (8 Fases)
| Fase | Objetivo | Entregables |
|------|----------|-------------|
| 0 | Congelacion y baseline | Inventario, ADR, deuda tecnica |
| 1 | Multi-tenant persistente | PostgreSQL RLS, tests aislamiento |
| 2 | Motor legal | Reglas versionadas, golden tests |
| 3 | Planificacion | OR-Tools, greedy fallback, simulacion |
| 4 | Ausencias y cobertura | Workflows, reemplazos, documentos |
| 5 | Pre-nomina | Ledger, ajustes, exportacion |
| 6 | Tiempo real | WebSockets, alertas, notificaciones |
| 7 | Producto enterprise | SSO, SCIM, billing, status page |
| 8 | Anti-caidas | Doctor, chaos tests, rollback |

### 1.8 Zonas Criticas (Protocolo Obligatorio)
| Zona | Riesgo | Control |
|------|--------|---------|
| Autenticacion | Suplantacion | MFA, SSO, RBAC, tests negativos |
| Aislamiento multi-tenant | Fuga de datos | PostgreSQL RLS, tenant_id |
| Motor legal | Incumplimiento | Reglas versionadas, golden tests |
| Planificacion | Turnos ilegales | Simulacion, explicabilidad, aprobacion |
| Pre-nomina | Errores financieros | Ledger inmutable, doble revision |
| Auditoria | Perdida de evidencia | Append-only, hash chain |

### 1.9 Metricas de Resiliencia
- Disponibilidad: 99.95%
- RPO: <=5 min, RTO: <=30 min
- API CRUD p95: <250ms, p99: <800ms
- Scheduler 500 emp/7d: <60s
- Scheduler 2000 emp/7d: <5 min

---

## 2. CCC BARCELONA (Caso Real - Contact Center)

### 2.1 Contexto
- Centro de contacto con moderadores de contenido
- Mercados: Espanol, Portugues, Finlandes
- Horario: 24/7 rotativo, 39h/semana
- Convenio: Call Center (39h, dia corto 6h/semana)
- Turnos: 07-15, 15-23, 22-06 (nocturno fijo para algunos)
- ~1100 empleados

### 2.2 Crisis Super Nova (Julio 2020)
**Problema**: Facebook pidio actualizar hardware "Super Nova" en 4 dias
**Caos logistico**:
- 1100 empleados debian cambiar equipo fisicamente en la torre
- Capacidad: 40-80 personas a la vez
- Gente en dia libre citada, gente de turno de noche sacada antes
- 80+ empleados no pudieron conectar tras el cambio
- Horarios de atencion: 9am-11am, 3pm-4:30pm, luego 9am-8pm

**Soluciones manuales (caoticas)**:
- Correos masivos con horarios diferentes cada dia
- TM prometiendo "corregir el TAM" manualmente
- Reduccion de turno como compensacion (sin sistema automatico)
- Amenazas de ausencia si no venian

### 2.3 Variables de Nomina (30+ conceptos)
**Ingresos Fijos**:
1. Salario Base
2. Plus Exclusividad (5% bruto anual)
3. Plus Idiomas (PT/BRA)
4. Prorrateo Pagas Extras
5. Mejora Voluntaria Absorbible

**Variables de Tiempo**:
6. Plus Nocturnidad (22:00-06:00)
7. Plus Transporte (si turno cruza 00:00-06:00)
8. Horas Extra (Diurnas/Nocturnas)
9. Recargo Domingo

**Festivos**:
10. Recargo Dia Festivo Normal
11. Recargo Dia Festivo Especial (25 Dic, 1 Ene, 6 Ene, 24/31 Dic 20:00-00:00)

**Incapacidad Temporal**:
12. Prestac. S. Social Enfermedad
13. Pago cargo Empresa Enfermedad
14. Complemento IT (dias 1-3: 70%, 4-20: 75%, 21+: 100%)

**Beneficios**:
15. Cheque Restaurante Edenred (9EUR/dia, min 6h continuas)
16. Seguro Medico DKV

**Deducciones**:
17. Contingencias Comunes (4.70%), Desempleo (1.55%), Formacion (0.10%)
18. IRPF (19.17%)
19. Imp. Reg. Liquido de mas/menos (ajuste automatico)

### 2.4 Soluciones que el Software Deberia Tener
1. **Modulo Eventos Masivos**: Asignacion automatica de slots por capacidad, priorizacion por tipo de turno
2. **Generacion Automatica TOIL**: Credito de horas al venir fuera de turno
3. **Escudo TAM/AZE**: Inyeccion automatica de codigo "Evento Corporativo - Exento"
4. **Deteccion de Turno Nocturno**: Slots antes de las 22:00 para trabajadores nocturnos
5. **Heatmap de Cobertura**: Alerta cuando un mercado cae del 30%
6. **Matriz de Habilidades**: Asignacion por idioma (ES/PT/FI)
7. **Algoritmo 39h**: Dia corto automatico (8h-2h = 6h)
8. **Portal Self-Service**: Intercambio de turnos validado automaticamente

---

## 3. GESTION DE EXCEL A SOFTWARE (Migracion)

### 3.1 El "Infierno de Excel"
- Turnos en Excel, vacaciones en otro archivo, listas en otro
- Team Leaders gastando horas corrigiendo
- Sin control de versiones, sin auditoria
- Imposible prever cobertura en tiempo real

### 3.2 Fases de Migracion
| Mes | Fase | Accion |
|-----|------|--------|
| 1 | Modo Espejo | Software lee Excel, genera horario, pero Excel sigue oficial |
| 2 | Piloto | Migra solo un mercado (ej. Portugues) |
| 3 | Go-Live | Se apaga Excel como entrada, solo como reporte de salida |

### 3.3 Algoritmo de Planificacion (CSP)
- **Restriccion 1**: Suma(Horas Semanales) == 39
- **Restriccion 2**: 1 dia/semana con Horas = (Jornada - 2h)
- **Restriccion 3**: Cobertura minima 30% por mercado
- **Restriccion 4**: Matriz de habilidades (idioma x turno)
- **Restriccion 5**: Descanso minimo 12h entre turnos

---

## 4. REPOSITORIOS GIT RELEVANTES

### 4.1 AION Workforce (Proyecto Propio)
- Arquitectura: FastAPI + PostgreSQL + Redis + React
- Multi-tenant con RLS
- Motor legal versionado
- 36+ tablas de base de datos

### 4.2 Referencias del Ecosistema
| Repo | Utilidad |
|------|----------|
| Google OR-Tools | Optimizacion de planificacion |
| FullCalendar | Vista de calendario |
| Three.js | Dashboards 3D |
| Playwright | Testing E2E |
| k6 | Load testing |
| OpenTelemetry | Observabilidad |
| Prometheus + Grafana | Metricas y dashboards |
| Argo CD | GitOps deployment |
| Terraform | Infraestructura como codigo |

---

## 5. NORMATIVA LEGAL DE REFERENCIA

### 5.1 Union Europea
- Directiva 2003/88/CE: Ordenacion del tiempo de trabajo
- Directiva (UE) 2019/1152: Condiciones laborales transparentes
- Reglamento (UE) 2016/679: RGPD

### 5.2 Espana
- Estatuto de los Trabajadores (RDL 2/2015)
- Real Decreto 1561/1995: Jornadas especiales
- LOPDGDD 3/2018
- Esquema Nacional de Seguridad

### 5.3 Portugal
- Codigo do Trabalho
- Autoridade para as Condicoes do Trabalho (ACT)

### 5.4 Finlandia
- Working Hours Act (2019/872)

---

## 6. TAREAS EXTRAIDAS

### Inmediatas
1. [ ] Crear estructura AION Workforce en repositorio
2. [ ] Implementar PostgreSQL multi-tenant con RLS
3. [ ] Crear motor de cumplimiento legal versionado
4. [ ] Implementar modulo de planificacion con OR-Tools
5. [ ] Crear migrador de Excel a software

### Corto Plazo
6. [ ] Implementar modulo de ausencias (16+ tipos)
7. [ ] Crear pre-nomina con ledger inmutable
8. [ ] Implementar tiempo real con WebSockets
9. [ ] Crear portal self-service para empleados
10. [ ] Implementar modulo de eventos masivos

### Mediano Plazo
11. [ ] SSO/SAML/OIDC + SCIM
12. [ ] Billing y facturacion
13. [ ] Doctor autonomo y chaos testing
14. [ ] Status page y documentacion
15. [ ] Security whitepaper y DPA template

---

## 7. CHECKLIST PARA VENDER A EMPRESAS

### Seguridad
- MFA, SSO, RBAC/ABAC
- Auditoria inmutable
- Cifrado en transito y reposo
- Gestion de secretos
- Escaneo SAST/DAST
- SBOM, pentesting

### Privacidad
- RGPD by design
- Retencion configurable
- Portabilidad y supresión
- DPIA, DPA, subprocessors

### Fiabilidad
- SLA 99.95%
- Backups PITR
- DR plan, chaos testing
- Status page

### Operacion
- Onboarding/offboarding
- SCIM, API keys
- Webhooks, logs exportables
- Soporte multi-idioma
