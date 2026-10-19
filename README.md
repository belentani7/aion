# AION Unified

Plataforma SaaS enterprise de gestión de fuerza laboral: turnos, ausencias, cumplimiento normativo, pre-nómina, validación IA y audit trail inmutable.

## Arquitectura

```
aion-unified/
├── client/                  # React 19 + Vite + Tailwind + shadcn/ui
├── server/                  # Express 5 + tRPC + Drizzle ORM
│   ├── _core/               # Auth, SDK, heartbeat, OAuth, storage
│   ├── aion/                # AI Agent core (model router, safe executor)
│   ├── pvcu*.ts             # Validación PVC-U (IA + agentes)
│   ├── stripe*.ts           # Billing (Stripe Checkout)
│   ├── ledger.service.ts    # Audit trail inmutable con hash chain
│   ├── tenant-context.ts    # Multi-tenancy + RBAC
│   ├── payroll-policy.ts    # Cálculo de nóminas + convenios
│   └── plan-policy.ts       # Enforcement de planes (free/pro/enterprise)
├── shared/                  # Tipos y constantes compartidas
├── services/
│   └── compliance/          # Motor de cumplimiento laboral EU (Python)
│       ├── agent.py         # ES/PT/FI/UE — validación de turnos
│       └── Dockerfile
├── drizzle/                 # Migraciones DB (MySQL + PostgreSQL)
├── audit-evidence/          # Evidencias de auditoría ISO 23000
├── presentation-{pt,es,en}/ # Slides de producto (PT > ES > EN)
├── magic/                   # Demos interactivas (shader, sfx, lore)
├── docs/                    # Blueprint de arquitectura
├── Dockerfile               # Multi-stage build (deps → build → prod)
└── docker-compose.yml       # MySQL + App + Compliance
```

## Stack

| Capa | Tecnología |
|------|------------|
| Frontend | React 19, Vite 7, Tailwind 4, shadcn/ui, Recharts, Framer Motion |
| Backend | Express 5, tRPC 11, Drizzle ORM, Zod 4 |
| Base de datos | MySQL 8.4 (prod), PostgreSQL (soporte dual) |
| Pagos | Stripe Checkout + Webhooks |
| Auth | JWT (jose), OAuth, cookies seguras |
| Compliance | Python 3.12 — legislación laboral ES/PT/FI/UE |
| Infra | Docker Compose, Node 22, multi-stage build |

## Módulos funcionales

- **Gestión de turnos** — calendario, asignación, cobertura
- **Empleados y departamentos** — CRUD multi-tenant con paginación cursor
- **Pre-nómina** — cálculo automático desde turnos, convenios colectivos, CSV export
- **Cumplimiento normativo** — motor Python que valida contra Estatuto Trabajadores (ES), Código Trabalho (PT), Working Hours Act (FI), Directiva UE 2003/88/CE
- **Incidencias** — gestión de incidentes por empleado con severidad
- **Ausencias** — registro y aprobación
- **Audit trail** — ledger inmutable con hash chain verificable
- **Validación IA (PVC-U)** — validación de interacciones con modelos, ciclo de vida, acciones de agentes
- **AI Agent core** — importación de proyectos, plan, ejecución segura, memory, model router
- **Billing** — planes free/pro/enterprise con Stripe Checkout
- **Multi-tenancy** — aislamiento por tenant, RBAC (owner/admin/manager/employee)
- **Open Data** — meteorología (Open-Meteo), provenance records
- **Observabilidad** — logging de validaciones

## Inicio rápido

```bash
# Desarrollo local
cp .env.example .env
# Editar .env con tus valores
pnpm install
pnpm dev

# Docker
cp .env.example .env
docker compose up --build
```

## Tests

```bash
pnpm test
# Compliance engine
cd services/compliance && python -m pytest test_agent.py
```

## Repos de origen

Este monorepo unifica código de:

| Repo original | Qué aportó |
|--------------|------------|
| `aion-workforce-enterprise` | Base completa (client/server/shared, Docker, Stripe, i18n, audit) |
| `aion` | AI Agent core (server/aion/, safeExecutor, modelRouter) |
| `aion-compliance` | Motor de compliance Python EU (services/compliance/) |
| `nexus-aion-enterprise` | Documentación de arquitectura (docs/) |

Repos descartados: `aion-acquisition-engine-audited` (scaffold vacío), `08-AION-WORKFORCE` (prototipo superado), `aion-showcase` (HTML estático).

## Licencia

MIT — Pedro Belentani 2026.
