# GCP Deployment Guide — AION Unified

## Prerequisites

- GCP Project: `gen-lang-client-0074247882`
- GitHub repo: `belentani7/aion-unified` (must exist)
- Vercel account linked to GitHub
- Domain configured (optional)

## Infrastructure Already Provisioned

### ✅ Artifact Registry
```
Repository: aion-docker
Location: europe-west1
Format: Docker
```

### ✅ Service Accounts
```
aion-cloudrun@gen-lang-client-0074247882.iam.gserviceaccount.com
  - roles/run.invoker
```

### ✅ IAM Roles (Cloud Build Service Account)
```
780063646780@cloudbuild.gserviceaccount.com
  - roles/run.admin
  - roles/artifactregistry.writer
  - roles/secretmanager.secretAccessor
```

### ✅ Secret Manager (15 secrets)
| Secret | Description |
|--------|-------------|
| `mysql-root-password` | MySQL root password |
| `mysql-password` | MySQL app user password |
| `mysql-user` | MySQL app username |
| `mysql-database` | MySQL database name |
| `jwt-secret` | RS256 JWT signing key (base64) |
| `stripe-secret-key` | Stripe secret key |
| `stripe-webhook-secret` | Stripe webhook signing secret |
| `stripe-pro-price-id` | Stripe Pro plan price ID |
| `stripe-enterprise-price-id` | Stripe Enterprise plan price ID |
| `compliance-api-url` | Compliance service URL |
| `scheduling-api-url` | Scheduling service URL |
| `diligence-api-url` | Diligence service URL |
| `client-origin` | Frontend origin for CORS |

### ✅ Cloud Build Config
- `cloudbuild.yaml` — Multi-stage pipeline (audit → lint → test → build → deploy)
- `trigger.yaml` — GitHub push trigger config (apply after repo creation)

## Deploy Steps

### 1. Create GitHub Repository
```bash
gh repo create aion-unified --private --description "AION Unified - Enterprise Workforce Management SaaS" --clone
cd aion-unified
cp -r ~/Downloads/aion-extracted/aion-unified/* .
git add . && git commit -m "feat: initial AION Unified with ADR-0012"
git push -u origin main
```

### 2. Create Cloud Build Trigger
```bash
# After repo exists and code is pushed
gcloud builds triggers create github --config=trigger.yaml
```

### 3. Update Secret Values (Production)
```bash
# Update with real production values
echo "real_mysql_root_password" | gcloud secrets versions add mysql-root-password --data-file=- --project=gen-lang-client-0074247882
echo "real_mysql_password" | gcloud secrets versions add mysql-password --data-file=-
echo "aion_prod_user" | gcloud secrets versions add mysql-user --data-file=-
echo "aion_production" | gcloud secrets versions add mysql-database --data-file=-
# ... repeat for all secrets with real values
```

### 4. Trigger First Build
```bash
# Push to main triggers Cloud Build automatically
git push origin main

# Or manual trigger
gcloud builds submit --config=cloudbuild.yaml
```

### 4. Connect Vercel (Frontend)
```bash
vercel login
vercel link
# Select "aion-unified" repo
# Build command: pnpm run build
# Output directory: dist
# Framework: Vite
vercel --prod
```

### 5. Configure Custom Domain (Optional)
```bash
# Cloud Run
gcloud run domain-mappings create --service=aion-staging --domain=aion.yourdomain.com --region=europe-west1

# Vercel
vercel domains add yourdomain.com
```

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   GitHub    │────▶│ Cloud Build │────▶│ Artifact    │
│   (main)    │     │  (ci/cd)    │     │  Registry   │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                    ┌─────────────┐            │
                    │  Cloud Run  │◀───────────┘
                    │  (staging)  │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
         ┌─────────┐ ┌──────────┐ ┌────────────┐
         │  MySQL  │ │Compliance│ │ Scheduling │
         │ (TiDB)  │ │ (Python) │ │ (Python)   │
         └─────────┘ └──────────┘ └────────────┘
```

## Monitoring & Alerting

```bash
# View Cloud Run logs
gcloud run services logs read aion-staging --region=europe-west1 --limit=50

# View build history
gcloud builds list --limit=10

# Set up alerting (budget, errors, latency)
gcloud alpha monitoring policies create --policy-from-file=alert-policy.yaml
```

## Rollback

```bash
# List revisions
gcloud run revisions list --service=aion-staging --region=europe-west1

# Rollback to previous revision
gcloud run services update-traffic aion-staging --to-revisions=REVISION_NAME=100 --region=europe-west1
```

## Cost Optimization

- Cloud Run: Pay per request (min 0 instances)
- Artifact Registry: ~$0.10/GB/month
- Cloud Build: 120 build-minutes/day free
- Secret Manager: 6 secret versions free/month
- Cloud Run: 2M requests/month free

## Security Checklist

- [ ] All secrets in Secret Manager (not in code)
- [ ] Cloud Run service account least privilege
- [ ] Cloud Build uses dedicated service account
- [ ] Binary authorization enabled (future)
- [ ] VPC connector for private MySQL (TiDB Cloud)
- [ ] Binary authorization policy (future)
- [ ] CMEK for Cloud Run (future)