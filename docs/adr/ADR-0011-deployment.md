# ADR-0011: Deployment — Docker Multi-Stage, Cloud Run/GKE, TiDB Cloud

## Status
Accepted (2026-10-19, Pedro Belentani)

## Context

AION needs a deployment strategy that works for local development, staging, and production with EU data residency.

Options considered:
1. **Vercel/Netlify** — Frontend only, not full-stack
2. **Railway/Render** — Simple but limited control, vendor lock-in
3. **Docker + Cloud Run/GKE** — Container-native, autoscaling, GCP EU regions
4. **AWS ECS/Fargate** — Equivalent but team more familiar with GCP
5. **Self-hosted VMs** — Operational burden, not scalable

## Decision

**We will use Docker multi-stage builds deployed to Google Cloud Run (staging) and GKE (production) with TiDB Cloud (EU) for database.**

### Docker Multi-Stage Build

```dockerfile
# Dockerfile
# Stage 1: Base
FROM node:22-alpine AS base
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# Stage 2: Build
FROM base AS builder
COPY . .
RUN pnpm build

# Stage 3: Production
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### Local Development

```yaml
# docker-compose.yml
version: '3.8'
services:
  mysql:
    image: mysql:8.4
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: aion
      MYSQL_USER: aion
      MYSQL_PASSWORD: aion
    ports: ["3306:3306"]
    volumes: [mysql_data:/var/lib/mysql]
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    build: .
    ports: ["3000:3000"]
    environment:
      DATABASE_URL: mysql://aion:aion@mysql:3306/aion
      NODE_ENV: development
      STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY}
      STRIPE_WEBHOOK_SECRET: ${STRIPE_WEBHOOK_SECRET}
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      mysql:
        condition: service_healthy
    volumes: [.:/app, /app/node_modules]

  compliance:
    build: ./services/compliance
    ports: ["8000:8000"]
    environment:
      DATABASE_URL: mysql://aion:aion@mysql:3306/aion

volumes:
  mysql_data:
```

### Staging: Cloud Run

- **Service**: `aion-staging` in `europe-west1` (Belgium)
- **Database**: TiDB Cloud Serverless (EU region)
- **Compliance**: Cloud Run (separate service)
- **Secrets**: Secret Manager (STRIPE_SECRET_KEY, JWT_SECRET, etc.)
- **Domain**: `staging.aion.app` (Cloud Run custom domain)
- **Autoscaling**: 0-10 instances, CPU-based
- **Cost**: ~$20-50/month

### Production: GKE Autopilot

- **Cluster**: `aion-prod` in `europe-west1` + `europe-west9` (multi-zone)
- **Database**: TiDB Cloud Dedicated (EU, HA)
- **Compliance**: GKE Deployment (HPA, 2-20 pods)
- **Ingress**: GKE Ingress (managed SSL, CDN)
- **Secrets**: Secret Manager + Workload Identity
- **Monitoring**: Cloud Monitoring + Logging + OTel Collector
- **Cost**: ~$200-500/month (scales with usage)

### CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm check
      - run: pnpm test
  
  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/build-push-action@v5
        with:
          push: true
          tags: gcr.io/${{ secrets.GCP_PROJECT }}/aion:${{ github.sha }}
  
  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: google-github-actions/deploy-cloudrun@v2
        with:
          service: aion-staging
          image: gcr.io/${{ secrets.GCP_PROJECT }}/aion:${{ github.sha }}
          region: europe-west1
  
  deploy-prod:
    needs: build
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: google-github-actions/get-gke-credentials@v2
        with:
          cluster_name: aion-prod
          location: europe-west1
      - run: kubectl set image deployment/aion aion=gcr.io/${{ secrets.GCP_PROJECT }}/aion:${{ github.sha }}
```

---

## Consequences

### Positive
- **Consistent Environments**: Same container local → staging → prod
- **EU Data Residency**: TiDB Cloud EU, Cloud Run/GKE EU regions
- **Autoscaling**: Cloud Run scales to zero, GKE HPA
- **Cost Effective**: Pay per request (Cloud Run) or per pod (GKE)
- **Rollback**: Instant (container image tags)
- **No Vendor Lock-in**: Standard Docker, Kubernetes, MySQL protocol

### Negative
- **Complexity**: More moving parts than PaaS (mitigated: IaC, documented runbooks)
- **Cold Starts**: Cloud Run ~100-500ms (mitigated: min instances=1 for prod)
- **GCP Knowledge**: Team must know GCP (mitigated: training, documentation)

---

## Related ADRs
- ADR-0001: Modular Monolith (single container)
- ADR-0005: Compliance Service (separate container)
- ADR-0009: Observability (OTel Collector in GKE)

---

## Changelog
| Date | Author | Change |
|------|--------|--------|
| 2026-10-19 | Pedro Belentani | Initial decision |