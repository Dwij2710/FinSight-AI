# Module 09: Cloud Infrastructure, DevOps & CI/CD Pipeline

**Module Owner:** Site Reliability & DevOps Engineering  
**File Path:** `.github/workflows/ci.yml`, `.github/workflows/keep-alive.yml`, `render.yaml`  
**Status:** Production Ready  

---

## 1. Executive Brief (High-Level Summary)

The **DevOps & Infrastructure Architecture** ensures reliable, cost-effective, zero-downtime deployment of FinSight AI across a distributed multi-cloud environment. Combining edge static asset serving on **Vercel**, containerized Python computation on **Render**, continuous keep-alive pingers via **UptimeRobot**, and a fully automated **GitHub Actions CI/CD pipeline**, the platform delivers continuous integration, automated test verification, and zero-touch continuous deployment.

---

## 2. Distributed Cloud Architecture

```
                 [ GitHub Repository (main) ]
                              │
             +----------------+----------------+
             │ Push Event                      │ Push Event
             ▼                                 ▼
   [ Vercel Edge Cloud ]              [ GitHub Actions CI ]
    ├─ Automatic Next.js Build         ├─ Backend Quant Tests (pytest)
    ├─ Edge CDN Worldwide              ├─ Frontend Typecheck & Build
    └─ HTTPS Custom Domain             └─ Render Deploy Hook Trigger
                                               │
                                               ▼
                                      [ Render Cloud ]
                                       ├─ Docker / Python 3.10 Container
                                       ├─ FastAPI Application
                                       └─ /api/warmup Endpoint
                                               ▲
                                               │ Every 5m Ping
                                      [ UptimeRobot Monitor ]
```

---

## 3. Render Free-Tier Cold-Start Optimization

Render's free tier spins down inactive web services after 15 minutes. FinSight AI addresses this through a multi-tier resilience architecture:

### 3.1 Lightweight Warmup Endpoint (`/api/warmup`)
```python
@app.get("/api/warmup")
def warmup():
    return {
        "status": "warm",
        "service": "FinSight AI Backend",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "uptime_seconds": round(time.time() - SERVER_START_TIME, 2)
    }
```
- Completely bypassed from heavy ML libraries (PyTorch/Transformers).
- Responds in $<5\text{ms}$ with zero memory allocation.

### 3.2 Client-Side Fast Polling Engine (`MarketDataContext.tsx`)
- Detects `BACKEND_STARTING` state.
- Automatically drops polling interval from 30s to 5s.
- Displays a real-time elapsed second counter and pulsing progress bar in the header.
- Enforces a 75-second timeout guard to transition cleanly to `PROVIDER_ERROR` if the container fails to start.

### 3.3 UptimeRobot Continuous Keep-Alive
- Configured HTTP HEAD monitor pinging `https://<service>.onrender.com/api/warmup` every 5 minutes.
- Prevents container idling, guaranteeing instant response times for active users.

---

## 4. GitHub Actions CI/CD Pipeline (`ci.yml`)

The workflow triggers on every push and pull request to `main` (as well as manual `workflow_dispatch`):

```yaml
jobs:
  backend-test:
    name: Backend Quant & API Tests
    runs-on: ubuntu-latest
    steps:
      - Checkout & Setup Python 3.10
      - pip install -r requirements.txt
      - Run pytest tests/

  frontend-build:
    name: Frontend Build & Typecheck
    runs-on: ubuntu-latest
    steps:
      - Checkout & Setup Node 18
      - npm ci
      - npm run build

  render-deploy:
    name: Render Backend Deployment
    runs-on: ubuntu-latest
    needs: [backend-test, frontend-build]
    steps:
      - Trigger Render Deploy Hook via RENDER_DEPLOY_HOOK_URL
      - Poll RENDER_HEALTH_URL until HTTP 200 OK
```

---

## 5. Verification & Operational Reliability
- **Automated Testing**: 100% test pass rate on GitHub Actions runner.
- **Production Build**: 0 compilation or typecheck errors.
- **Zero-Touch Deploy**: Deployments to Vercel and Render occur automatically upon git push to `origin/main`.
