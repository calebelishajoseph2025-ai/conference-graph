# Deployment Guide: Vercel & Render

This guide explains how to deploy the **Conference Graph Explorer** live to the web using **Vercel** for the React frontend and **Render** for the FastAPI backend, along with strategies for hosting or tunneling the Neo4j and Oracle databases.

---

## Architecture Overview

```
                      ┌────────────────────────────────────────┐
                      │             User's Browser             │
                      └──────────────────┬─────────────────────┘
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 │                                               │
                 ▼ (HTTPS / Global CDN)                          ▼ (API Requests)
      ┌─────────────────────┐                         ┌─────────────────────┐
      │   Vercel Frontend   │ ──────────────────────► │   Render Backend    │
      │   (React + Vite)    │  (Direct API or Proxy)  │  (FastAPI + Uvicorn)│
      └─────────────────────┘                         └──────────┬──────────┘
                                                                 │
                                         ┌───────────────────────┴───────────────────────┐
                                         ▼                                               ▼
                              ┌─────────────────────┐                         ┌─────────────────────┐
                              │    Neo4j Database   │                         │   Oracle Database   │
                              │  (AuraDB / Local)   │                         │  (OCI Free / Local) │
                              └─────────────────────┘                         └─────────────────────┘
```

---

## Part 1: Deploying the Backend on Render

Render hosts the Python FastAPI application with automatic HTTPS, continuous deployment from GitHub, and zero-downtime restarts.

### Option A: 1-Click Blueprint (Recommended)

1. Push your repository to GitHub.
2. Log into [Render.com](https://render.com/).
3. Click **New +** -> **Blueprint**.
4. Select your GitHub repository. Render reads the included `render.yaml` file automatically.
5. Provide your database environment variables when prompted and click **Apply**.

### Option B: Manual Web Service Setup

1. In Render, click **New +** -> **Web Service**.
2. Connect your GitHub repository.
3. Configure the following settings:
   - **Name:** `conference-graph-api`
   - **Language / Runtime:** `Python 3`
   - **Region:** `Oregon (US West)` (or closest to your database)
   - **Branch:** `main`
   - **Root Directory:** leave blank (repository root)
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Plan:** `Free`
4. Under **Environment Variables**, add:
   - `PYTHONPATH`: `backend`
   - `ENV`: `production`
   - `ALLOWED_ORIGIN`: `https://<your-vercel-app>.vercel.app,http://localhost:5173`
   - `ALLOWED_ORIGIN_REGEX`: `^https://.*\.vercel\.app$`
   - `ADMIN_TOKEN`: `generate-a-random-32-char-token`
   - `DATA_DIR`: `./data`
   - `NEO4J_URI`: `bolt://...` or `neo4j+s://...`
   - `NEO4J_USER`: `neo4j`
   - `NEO4J_PASSWORD`: `<your-neo4j-password>`
   - `NEO4J_DATABASE`: `neo4j`
   - `ORACLE_USER`: `academic`
   - `ORACLE_PASSWORD`: `<your-oracle-password>`
   - `ORACLE_DSN`: `<host:port/service>`
5. Click **Create Web Service**.
6. Once deployed, note your service URL: `https://<service-name>.onrender.com`.
7. Verify backend health by visiting `https://<service-name>.onrender.com/api/health`.

> **Note on Render Free Tier:** Free instances spin down after 15 minutes of inactivity and take ~50 seconds to wake up on the first incoming request.

---

## Part 2: Deploying the Frontend on Vercel

Vercel provides edge hosting, global CDN caching, and automatic SSL for the Vite React application.

### Step-by-Step Vercel Deployment

1. Log into [Vercel.com](https://vercel.com/) with GitHub.
2. Click **Add New...** -> **Project**.
3. Select your repository.
4. In the **Configure Project** screen:
   - **Framework Preset:** Vite
   - **Root Directory:** Click **Edit** and choose `frontend`.
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Under **Environment Variables**, add:
   - **Name:** `VITE_API_URL`
   - **Value:** `https://<your-render-service>.onrender.com` (do not include trailing `/api`)
6. Click **Deploy**.
7. Vercel will build and deploy your application to a `https://<project-name>.vercel.app` URL.

### Single-Domain API Rewrites (Alternative to CORS)

If you prefer serving the API under the same domain to eliminate CORS headers completely, edit `frontend/vercel.json` before deploying:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/api/:match*",
      "destination": "https://<your-render-service>.onrender.com/api/:match*"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

When using rewrites, you do not need `VITE_API_URL` in Vercel because `/api/*` is proxied server-to-server.

---

## Part 3: Database Hosting Strategies

Because this application relies on **Neo4j** (graph) and **Oracle** (relational), choose the strategy that best fits your requirements:

### Strategy 1: Live Demo Tunneling (Recommended for Academic & University Presentations)

If you already have Oracle 23ai/26ai and Neo4j Desktop installed and populated locally:
1. Run your databases (and optionally the backend) on your local machine.
2. Expose your local backend via **Cloudflare Tunnel** or **ngrok**:
   ```powershell
   # Free temporary tunnel without account creation:
   npx localtunnel --port 8000
   # OR with ngrok:
   ngrok http 8000
   # OR with cloudflared:
   cloudflared tunnel --url http://127.0.0.1:8000
   ```
3. Set the generated public HTTPS URL as `VITE_API_URL` in Vercel.
4. Your website is 100% live on Vercel, accessible to professors, evaluators, and team members from any device!

### Strategy 2: Cloud-Native Databases

1. **Neo4j AuraDB (100% Free):**
   - Create a free instance at [Neo4j Aura](https://neo4j.com/cloud/platform/aura-graph-database/).
   - Copy the `neo4j+s://<instance-id>.databases.neo4j.io` URI and password.
   - Use the **Admin -> Reset Neo4j** button in your deployed dashboard to automatically load the schema and demo data into AuraDB!
2. **Oracle Database:**
   - **Oracle Cloud Infrastructure (OCI) Always Free:** Oracle offers two free Autonomous Databases (20 GB each) forever.
   - **Cloud VPS / Docker:** Run `container-registry.oracle.com/database/free:latest` on any Linux cloud server (DigitalOcean, Hetzner, AWS EC2, or OCI Ampere VM).

---

## Verification Checklist

- [ ] Backend health check responds: `GET https://<render-backend>/api/health`
- [ ] Vercel app loads home dashboard cleanly
- [ ] Direct routing works on refresh (e.g. visiting `/compare` directly doesn't 404)
- [ ] Admin actions function with `ADMIN_TOKEN`
- [ ] Parity check runs successfully on the Comparison screen
