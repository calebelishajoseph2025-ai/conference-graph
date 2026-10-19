# Conference Graph Explorer (Neo4j + Oracle Comparison Dashboard)

An interactive full-stack academic conference management dashboard designed to demonstrate and justify the transition from an Oracle relational database to a Neo4j graph database for an Academic Conference Management System (**University DBMS Project DA3: Modern Database Technology**).

- **Author:** Caleb Elisha Joseph ([@calebelishajoseph2025-ai](https://github.com/calebelishajoseph2025-ai))
- **Email:** [caleb.elishajoseph2025@vitstudent.ac.in](mailto:caleb.elishajoseph2025@vitstudent.ac.in)
- **License:** [MIT License](LICENSE)
- **Live Deployment Guide:** [DEPLOYMENT.md](DEPLOYMENT.md) (Render + Vercel + Neo4j AuraDB)

---

## 1. Prerequisites

- **Operating System:** Windows 11 (PowerShell)
- **Python:** Python 3.12 (`py -3.12 -m venv .venv`)
- **Node.js:** Node.js v18+ and npm
- **Oracle Database:** Oracle AI Database 26ai Free (Service: `FREEPDB1`, Port `1521`, User: `academic`, Password: `<your-oracle-password>`)
- **Neo4j Database:** Neo4j Desktop 2.x (Database: `neo4j`, Bolt URI: `bolt://127.0.0.1:7687`, User: `neo4j`)

---

## 2. Setup Instructions

### 2.1 Clone & Environment Setup

In PowerShell from `C:\dev\conference-graph`:

```powershell
# 1. Create and activate Python 3.12 virtual environment
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1

# 2. Install backend dependencies
.\.venv\Scripts\python.exe -m pip install -r requirements.txt

# Generate frozen lockfile for reproducible builds
.\.venv\Scripts\python.exe -m pip freeze > requirements.lock.txt

# 3. Configure environment variables
Copy-Item .env.example .env
# Edit .env and configure your local NEO4J_PASSWORD and ADMIN_TOKEN
```

### 2.2 Oracle Database Setup

1. Connect as `SYSTEM` to `FREEPDB1` in SQL*Plus or SQL Developer and create the `academic` user:
   ```sql
   @data/oracle_setup/00_create_user.sql
   ```
2. Connect as `academic` (with configured password) in `FREEPDB1`. From inside `data/oracle_setup`:
   ```sql
   @setup_all.sql
   ```
   *Note:* Research abstracts contain `&`, so `setup_all.sql` automatically uses `SET DEFINE OFF`.
   To reset the Oracle demo dataset at any time, execute `@../oracle_load.sql` as `academic` from inside `data/oracle_setup`.

### 2.3 Neo4j Setup (Neo4j Desktop 2.x)

1. Open **Neo4j Desktop 2.x**.
2. Under **Local instances**, click **Create instance**.
3. Name the instance `conference` and set a password of at least 8 characters (matching `NEO4J_PASSWORD` in `.env`).
4. Start the instance.
5. In Neo4j Desktop, click **Open** -> **Query** tool (do **not** use the Import tool).
6. Copy the CSV files from `C:\dev\conference-graph\data` into the instance's `import/` folder (or use the application's automated reset button).
7. Run `neo4j_load.cypher` **ONCE** (it uses `CREATE`).
   *Alternatively*, you can simply use the dashboard's **Admin -> Reset Neo4j** button to automatically wipe and batch-load all nodes, relationships, constraints, and indexes using parameterized `UNWIND $rows` batches.

### 2.4 Optional Scale Setup (Phase 6b Target)

To prepare for high-volume benchmark testing on synthetic data (e.g. 20,000 authors, 40,000 papers):

1. Connect as `SYSTEM` in `FREEPDB1` and run:
   ```sql
   @data/oracle_setup/02_create_scale_user.sql
   ```
2. Connect as `academic_scale` (with your configured scale password) and run `01_schema.sql` to build the empty relational tables.
3. Once the database target is ready, run the synthetic scale seeder:
   ```powershell
   $env:PYTHONPATH="backend"
   .\.venv\Scripts\python.exe scripts/scale_seed.py --confirm --authors 20000 --papers 40000
   ```

### 2.5 Frontend Setup

```powershell
cd frontend
npm install
cd ..
```

---

## 3. Running the Application

Open two PowerShell terminals:

### Terminal 1: Backend Dev Server (FastAPI + Uvicorn)

```powershell
cd C:\dev\conference-graph
.\.venv\Scripts\Activate.ps1
$env:PYTHONPATH="backend"
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
- API Base: `http://127.0.0.1:8000`
- Interactive OpenAPI Documentation: `http://127.0.0.1:8000/docs` (available in development mode)

### Terminal 2: Frontend Dev Server (React + Vite)

```powershell
cd C:\dev\conference-graph\frontend
npm run dev
```
- Dashboard UI: `http://127.0.0.1:5173`
- All `/api/*` network requests are automatically reverse-proxied to `http://127.0.0.1:8000`.

---

## 4. Verification & Testing

### 4.1 Automated Backend Unit Tests (Pytest)

Run all 40 automated service-layer and endpoint tests:

```powershell
$env:PYTHONPATH="backend"
.\.venv\Scripts\python.exe -m pytest backend/app/tests -v
```

### 4.2 Live Database Smoke Test Suite (`scripts/smoke.py`)

Run the comprehensive live end-to-end smoke test calling all 24 API endpoints against the live databases:

```powershell
.\.venv\Scripts\python.exe scripts/smoke.py
```

### 4.3 Production Frontend Build

Validate TypeScript types and compile the optimized Vite production bundle:

```powershell
cd frontend
npm run build
cd ..
```

---

## 5. Troubleshooting Table

| Symptom | Probable Cause | Corrective Action |
| :--- | :--- | :--- |
| **Neo4j connection refused** | Bolt listening on IPv6 localhost or service stopped | Ensure `NEO4J_URI=bolt://127.0.0.1:7687` (use IP `127.0.0.1`, not `localhost`). Check if instance is started in Neo4j Desktop. |
| **Oracle ORA-12514 / ORA-12541** | Service name or listener mismatch | Confirm DSN is `localhost:1521/FREEPDB1`. Listener must be active on port `1521`. |
| **Oracle ORA-01017: invalid username/password** | Connecting as wrong user | Ensure connecting as `academic` (with the password configured during user creation) and not `SYSTEM`. Tables live in the `academic` schema. |
| **HTTP 403 on `/api/admin/reset-neo4j`** | Missing or invalid admin token | Supply header `X-Admin-Token: <ADMIN_TOKEN>` matching `.env`. Configure the token in the frontend via the top-bar key icon. |
| **HTTP 429 Too Many Requests** | Rate limit triggered | Analytics endpoints (`collab-path`, `within-hops`) have an in-memory rate limiter of 60 req/min per IP to prevent accidental browser traversal denial-of-service. |
| **Oracle Recursive CTE ORA-32044** | Cycle loop in recursive query | In Oracle 26ai, always include `CYCLE author_id SET is_cycle TO 'Y' DEFAULT 'N'` when executing recursive subquery factoring over cyclic graphs. |
| **CORS blocked in browser** | Mismatched allowed origin | The Vite frontend runs on `http://127.0.0.1:5173`. Ensure `ALLOWED_ORIGIN=http://localhost:5173` or `http://127.0.0.1:5173` in `.env`. |

---

## 6. Mapping to the DA3 Rubric & 10-Step Demo Script

The application provides a dedicated **Demo Script Mode** under the **Schema & Evidence** page (`/schema`). Each step maps directly to the assignment evaluation criteria:

| Step | Rubric Requirement | Demonstration Flow & Features | Target Page |
| :---: | :--- | :--- | :--- |
| **1** | **System Architecture & Parity** | Dual-database health check (Oracle 26ai + Neo4j) and 18-metric comparative audit table verifying initial baseline parity. | `Dashboard` (`/`) |
| **2** | **Graph Exploration & Visualization** | Autocomplete search, 1-hop and 2-hop neighborhood expansion with Cytoscape, 150-node protection cap, and live Cypher execution panel. | `Graph Explorer` (`/explorer`) |
| **3** | **Core Operations (CRUD Mutations)** | Paginated research papers table, drawer with authors and status badges, and paper submission with ordered co-authors. | `Papers` (`/papers`) |
| **4** | **Explainable Reviewer Recommender** | Heuristic ranking formula combining shared reviewed keywords (+3.0), track match (+5.0/+3.0), and active workload (-1.0). | `Reviewer Assignment` (`/assignments`) |
| **5** | **Conflict of Interest Detection** | Intentional conflict assignment via benchmark pairs: Neo4j detects multi-hop path (HTTP 409 + red path), while Oracle raises real `ORA-20001` and `ORA-20002` errors. | `Reviewer Assignment` (`/assignments`) |
| **6** | **Triggers & Event Replication** | Review submission (0-10) with automatic acceptance trigger: score >= 9 promotes paper to 'Accepted', replicating Oracle trigger `trg_flag_paper`. | `Reviews` (`/reviews`) |
| **7** | **Graph-Native Shortest Path** | Computes shortest co-author path using `shortestPath((a)-[:WROTE*..8]-(b))` between Emma Krishnan (1) and Lukas Reddy (60) across 3 hops. | `Collaboration Paths` (`/paths`) |
| **8** | **Recursive Co-Author Reachability** | Explores reachable academic network within 1 to 3 co-author hops (`-[:WROTE*2..{2N}]-`) with per-hop breakdown counts. | `Collaboration Paths` (`/paths`) |
| **9** | **Complex Analytics & Aggregations** | Degree centrality ranking (most connected researchers), cross-institution collaboration pairs, and research area publication distributions. | `Network Analytics` (`/analytics`) |
| **10** | **Technology Comparison (SQL vs Cypher)** | Head-to-head performance benchmarks of 5 identical query scenarios over 5 iterations with median ms and result equivalence verification. | `SQL vs Cypher` (`/compare`) |

---

## 7. Security Architecture & Audit Report (Phase 7 Hardening)

### 7.1 Security Architecture Overview

1. **Parameterization:** Cypher queries use `$param` and Oracle SQL uses `:param`. Variable-length path bounds (1 to 3 hops) are strictly validated as integers prior to interpolation.
2. **Input Validation:** Strict Pydantic v2 validation models with `extra="forbid"`, string length constraints, and range bounds.
3. **Localhost Binding:** Development servers bind strictly to `127.0.0.1` to prevent local network exposure.
4. **Admin Protection:** Destructive endpoints (`/api/admin/reset-neo4j`) and live Oracle commits require `X-Admin-Token` constant-time verification (`secrets.compare_digest`) and an explicit `confirm: true` payload.
5. **Memory-Only Token Storage:** The admin token is stored exclusively in volatile React component state, never persisted to `localStorage`, `sessionStorage`, or cookies.
6. **Spreadsheet Formula Injection Mitigation:** All CSV export utilities enforce leading single-quote sanitization on cells beginning with `=`, `+`, `-`, `@`, `\t`, or `\r`.
7. **Resource Timeouts & Caps:** Query timeouts (10s) enforced on all database sessions; neighborhood graph results hard-capped at 150 nodes; request body size capped at 1MB via middleware.
8. **Rate Limiting:** In-memory sliding window rate limiter (60 req/min per IP) protects expensive traversal endpoints (`within-hops`, `collab-path`, `compare/*`, `recommend/*`).
9. **Content Security Policy:** Production CSP headers and frontend meta tag enforce `default-src 'self'` with frame-ancestors denied.

### 7.2 Phase 7 Audit Findings & Fixes

| # | Severity | Area | File:Line | Issue | Fix Applied | Status |
| :-: | :---: | :---: | :--- | :--- | :--- | :---: |
| 1 | **Medium** | D. DoS / Abuse | `backend/app/routers/recommend.py:8` | `GET /api/recommend/reviewers` lacked rate limiter dependency | Added `dependencies=[Depends(analytics_rate_limiter)]` | **FIXED** |
| 2 | **Medium** | D. DoS / Abuse | `backend/app/main.py:45` | Missing request body payload limit allowed unbounded request sizes | Added `RequestBodyLimitMiddleware` capping payloads at 1MB with HTTP 413 | **FIXED** |
| 3 | **Low** | C. Web Security | `backend/app/main.py:65` | Missing explicit Content-Security-Policy response header | Added `Content-Security-Policy: default-src 'none'; frame-ancestors 'none';` | **FIXED** |
| 4 | **Low** | C. Web Security | `frontend/index.html:8` | Missing CSP meta tag for frontend application shell | Added CSP meta tag permitting only local assets and backend API connection | **FIXED** |
| 5 | **Low** | E. Data Integrity | `backend/app/schemas.py:56` | Recommendation regex pattern only permitted `Accept`, `Reject`, `Borderline` | Expanded regex to `^(Accept\|Reject\|Borderline\|Minor Revision\|Major Revision)$` | **FIXED** |
| 6 | **Medium** | B. Auth / Secrets | `backend/app/services/oracle_service.py:37` | Token comparison did not assert `settings.ADMIN_TOKEN` was non-empty before comparison | Added non-empty check and `.strip()` before `secrets.compare_digest` | **FIXED** |

### 7.3 Section 11 Compliance Checklist (37 Audit Items)

| Item # | Category | Description | Status |
| :---: | :--- | :--- | :---: |
| 1 | A. Injection | No Cypher/SQL concatenation with user input; parameterization enforced | **FIXED** |
| 2 | A. Injection | Hop-count interpolation validated strictly as integer in range (1..3) | **FIXED** |
| 3 | A. Injection | Search `CONTAINS` and filter strings parameter-bound and length-capped | **FIXED** |
| 4 | A. Injection | Property value injections impossible via native driver parameters | **FIXED** |
| 5 | A. Injection | Stored values never re-executed as dynamic query text | **FIXED** |
| 6 | B. Auth / Secrets | Admin routes require token; verified using `secrets.compare_digest` | **FIXED** |
| 7 | B. Auth / Secrets | No credentials in repo, code, or logs; `.env` git-ignored, `.env.example` committed | **FIXED** |
| 8 | B. Auth / Secrets | Weak Oracle credentials documented; listener bound to localhost | **ACCEPTED RISK (local academic demo)** |
| 9 | B. Auth / Secrets | Vite and FastAPI bind strictly to `127.0.0.1` | **FIXED** |
| 10 | B. Auth / Secrets | Admin token held in volatile React memory only (no localStorage/cookies) | **FIXED** |
| 11 | C. Web Security | CORS restricted strictly to `ALLOWED_ORIGIN`, no wildcards or credentials | **FIXED** |
| 12 | C. Web Security | Security headers: `nosniff`, `no-referrer`, `no-store`, `DENY`, and CSP | **FIXED** |
| 13 | C. Web Security | No cookie-based auth used; CSRF not applicable | **NOT APPLICABLE (stateless token auth)** |
| 14 | C. Web Security | Strict HTTP method hygiene: reads use GET, mutations use POST/PATCH/DELETE | **FIXED** |
| 15 | C. Web Security | No open redirects, SSRF, or unconstrained file uploads exist | **NOT APPLICABLE (no outbound requests)** |
| 16 | C. Web Security | FastAPI Swagger docs disabled when `ENV=production` | **FIXED** |
| 17 | D. Resource Limits | Hard upper bounds on variable-length paths (`*..8`, `*2..6`); SQL `CYCLE` clause | **FIXED** |
| 18 | D. Resource Limits | In-memory rate limiting (60 req/min) on expensive traversal endpoints | **FIXED** |
| 19 | D. Resource Limits | Server-side pagination bounds enforced (`page >= 1`, `pageSize <= 100`) | **FIXED** |
| 20 | D. Resource Limits | Comparison repeated runs protected by rate limiter | **FIXED** |
| 21 | D. Resource Limits | Connection pools bounded (min 1, max 4); sessions closed via context managers | **FIXED** |
| 22 | E. Integrity | Multi-step writes execute inside single atomic transactions | **FIXED** |
| 23 | E. Integrity | ID collisions protected by uniqueness constraints + transaction retries | **FIXED** |
| 24 | E. Integrity | Graph-native conflict of interest enforced in service layer with email fallback | **FIXED** |
| 25 | E. Integrity | Score (0-10), status, recommendation enums validated server-side | **FIXED** |
| 26 | E. Integrity | Paper deletion cleans up presentations with DETACH DELETE, requires confirm | **FIXED** |
| 27 | E. Integrity | Parity check executes read-only count queries | **FIXED** |
| 28 | F. Privacy | Analytics endpoints return minimal payload (no email addresses exposed) | **FIXED** |
| 29 | F. Privacy | Errors and logs omit sensitive personal data; sanitized error IDs returned | **FIXED** |
| 30 | F. Privacy | CSV exports export only displayed table columns | **FIXED** |
| 31 | G. Supply Chain | `npm audit` and `pip list --outdated` inspected honestly | **FIXED** |
| 32 | G. Supply Chain | Dependencies bounded in ranges and locked in lockfiles | **FIXED** |
| 33 | G. Supply Chain | Docker not used | **NOT APPLICABLE (no Docker used)** |
| 34 | G. Supply Chain | Debug reload off by default; controlled by `ENV` | **FIXED** |
| 35 | H. Frontend | Zero `dangerouslySetInnerHTML`, `eval`, or unadorned `target="_blank"` | **FIXED** |
| 36 | H. Frontend | All dynamic URL parameters sanitized with `encodeURIComponent` / `URLSearchParams` | **FIXED** |
| 37 | H. Frontend | No secrets, tokens, or private keys in the frontend production bundle | **FIXED** |

### 7.4 Security Re-run Commands

Run all verification tools directly in PowerShell:

```powershell
# 1. Dependency Audits
npm --prefix frontend audit
.\.venv\Scripts\python.exe -m pip list --outdated

# 2. Automated Test Suite (52 tests across all phases)
.\.venv\Scripts\python.exe -m pytest

# 3. Live Database Smoke Tests (25 tests)
.\.venv\Scripts\python.exe scripts/smoke.py

# 4. Frontend Production Compilation
npm --prefix frontend run build
```

### 7.5 Manual Attack Verification Scenarios

You can verify server hardening manually using `curl.exe`:

1. **SQL / Cypher Injection Attack in Title / Search:**
   ```powershell
   curl.exe -s "http://127.0.0.1:8000/api/graph/search?q=';+DROP+TABLE+PAPER;+--"
   # Expected: HTTP 200 with empty data array: {"data":[], "meta":{...}} (parameterized safely)
   ```

2. **Excessive Numeric Range (Review Score = 11):**
   ```powershell
   curl.exe -s -X POST "http://127.0.0.1:8000/api/papers/1/reviews" -H "Content-Type: application/json" -d '{\"reviewerId\":1,\"score\":11,\"comments\":\"Invalid\",\"recommendation\":\"Accept\"}'
   # Expected: HTTP 422 Unprocessable Entity (score <= 10 constraint violated)
   ```

3. **Negative Pagination Bound (page = 0):**
   ```powershell
   curl.exe -s "http://127.0.0.1:8000/api/papers?page=0"
   # Expected: HTTP 422 Unprocessable Entity (Input should be greater than or equal to 1)
   ```

4. **Destructive Reset Without Admin Token:**
   ```powershell
   curl.exe -s -X POST "http://127.0.0.1:8000/api/admin/reset-neo4j" -H "Content-Type: application/json" -d '{\"confirm\":true}'
   # Expected: HTTP 403 Forbidden: {"detail":"Invalid or missing X-Admin-Token header"}
   ```

5. **Payload Too Large Attack (> 1MB):**
   ```powershell
   # Send an oversized dummy payload
   $oversized = "A" * 1100000
   curl.exe -s -X POST "http://127.0.0.1:8000/api/papers" -H "Content-Type: application/json" -d "{`"title`":`"$oversized`"}"
   # Expected: HTTP 413 Content Too Large: {"error":"PAYLOAD_TOO_LARGE","detail":"Request body exceeds maximum allowed size of 1048576 bytes (1MB)."}
   ```

---

## 8. Known Limitations (Honest Assessment)

1. **Small Demo Dataset Performance Parity:** On the demo dataset (150 authors, 110 papers, 301 co-author pairs), execution time differences between Oracle and Neo4j are in the single-digit milliseconds. Graph traversal advantages emerge distinctly as dataset size scales (addressed by the Phase 6b synthetic scale feature).
2. **Single-Node Deployment:** Both databases and backend run locally on a single workstation. Distributed clustering, sharding, and high-availability failover are not covered in this university evaluation demo.
3. **In-Memory Rate Limiting:** The API client rate limiter (60 req/min) uses an in-memory sliding window per IP. Restarting the backend process clears active request counts.
4. **Default Oracle Passwords:** For local development and academic evaluation, default credentials should be replaced with strong, non-default passwords in production environments. The backend treats Oracle as internal, never publishes the Oracle port externally, and never returns or logs credentials.
5. **Session-Only Admin Authentication:** There is no multi-user role-based access control (RBAC) system; administrative authorization relies on a single shared pre-shared key (`ADMIN_TOKEN`).

---

## 9. License

This project is licensed under the [MIT License](LICENSE) - see the LICENSE file for details.
Copyright (c) 2026 Caleb Elisha Joseph.
