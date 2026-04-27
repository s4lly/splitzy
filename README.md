# Splitzy

A full-stack application for receipt analysis, expense tracking, and bill splitting among friends.

## Overview

Splitzy is a web application that allows users to upload receipts or bills, analyzes them using AI to extract line items and amounts, and provides an interface to split expenses among friends. The application consists of a Flask backend API that processes receipt images using OpenAI's vision capabilities, and a React frontend that provides a user-friendly interface.

## Setup Instructions

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker (optional, for full local development stack)

### Environment Variables

This project uses `.env.example` files as templates. Copy them to create your local configuration:

```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env

# Zero-Query (required for Docker Compose)
cp zero-query/.env.example zero-query/.env
```

Then edit the `.env` files with your actual values. For local-only overrides, you can also create `.env.local` files which take priority.

**Note:** The `zero-query/.env` file is required when using Docker Compose (Option B setup). The `docker-compose.yml` will use `zero-query/.env.example` as a fallback, but you should create `zero-query/.env` with your actual Clerk API keys and other configuration values.

### Development Modes

You can develop in two ways:

#### Option A: Connect to Deployed Environment (Simpler)

For simple changes or quick testing, connect directly to a deployed database:

1. Get the `DATABASE_URL` from your dev/staging environment (e.g., Neon)
2. Set it in `backend/.env`
3. Start the backend and frontend as described below

This approach doesn't require Docker.

#### Option B: Full Local Development Stack (Recommended for Zero features)

For working on Zero sync features or testing with a fresh database, run the complete stack locally using Docker:

**Before starting Docker services, set up environment files:**

```bash
# Copy zero-query environment file (required for docker-compose)
cp zero-query/.env.example zero-query/.env
# Edit zero-query/.env with your actual Clerk keys and other values
```

Then start the services:

```bash
# First-time setup (with database restore from a dump file)
./backend/scripts/setup-local-db.sh backend/dumps/mydumpfile.bak

# Or start fresh without restoring data
./backend/scripts/setup-local-db.sh
```

**Importing a production dump:** `docker compose up -d` reuses the existing database container and data. For a deterministic local copy of production, use `./backend/scripts/setup-local-db.sh backend/dumps/yourdump.bak`: it runs a **clean restore** (drops existing DB objects from the dump, then restores). If restore fails, the script exits and Zero services are not started. Create dumps with `./backend/scripts/create-dump.sh` (app-data only by default). App-only dumps contain only the **public schema** (tables, sequences, indexes, FKs)—no Zero schemas, publications, subscriptions, or event triggers—so restore succeeds and Zero services recreate their objects when they start. Dumps from an older or mixed configuration are not supported; regenerate with the current script. Use `--include-zero` only when you intentionally need Zero schemas and replication metadata in the dump (e.g. debugging replication).

This starts:

- **PostgreSQL** at `localhost:5432`
- **Zero Query API** at `localhost:3000`
- **Zero Cache** at `localhost:4848` (built from the root `Dockerfile`; same image definition as production)

The root **Dockerfile** is the single source of truth for zero-cache. Zero version upgrades go only there; then run `docker-compose up -d --build zero-cache-local` to rebuild locally.

Set this in `backend/.env`:

```
DATABASE_URL=postgresql://postgres:pass@localhost:5432/splitzy
```

**Docker commands:**

```bash
docker-compose up -d          # Start all services
docker-compose down           # Stop all services
docker-compose down -v        # Stop and delete all data
docker-compose logs -f        # Follow logs
```

**Updating a single service:**

To update one service without restarting the others (e.g., after making changes to `zero-query` or the root `Dockerfile` for zero-cache):

```bash
# Rebuild and restart a single service
docker-compose up -d --build zero-query-local
# Or after changing the root Dockerfile (zero-cache):
docker-compose up -d --build zero-cache-local

# Just restart without rebuilding
docker-compose up -d zero-query-local

# Force recreate even if nothing changed
docker-compose up -d --force-recreate zero-query-local

# Clean rebuild (no cache)
docker-compose build --no-cache zero-query-local
docker-compose up -d zero-query-local
```

This works for any service: `db-splitzy-local`, `zero-query-local`, or `zero-cache-local`. Dependent services will automatically reconnect after the updated service becomes healthy.

### Backend Setup

Built with **Flask**, **SQLAlchemy**, **PostgreSQL**, and **OpenAI API** for receipt image analysis.

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd <repository-name>
   ```

2. Navigate to the backend directory and create/activate a virtual environment:

   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows, use: venv\Scripts\activate
   ```

3. Install Python dependencies:

   ```bash
   pip install -r requirements.txt
   ```

4. Set up environment variables (see [Environment Variables](#environment-variables) above):

   ```bash
   cp .env.example .env
   # Edit .env with your DATABASE_URL and other values
   ```

5. Run database migrations (if using a fresh database):

   ```bash
   flask db upgrade
   ```

6. **Start the Flask application:** From the `backend/` directory with the virtual environment activated, run:
   ```bash
   gunicorn --bind localhost:5001 app:app
   ```
   The backend will start at http://localhost:5001

### Frontend Setup

Built with **React**, **Vite**, **Tailwind CSS**, **Shadcn UI**, and **Rocicorp Zero** for real-time sync.

1. Install Node.js dependencies from the repository root:

   ```bash
   pnpm install
   ```

2. Set up environment variables:

   ```bash
   cd frontend
   cp .env.example .env
   # Edit .env with your actual values
   ```

3. Build all workspace packages (from repo root):

   ```bash
   pnpm -r run build
   ```

   This compiles all packages (`shared-zero`, `zero-query`, `frontend`) in dependency order. Run this after a fresh clone or whenever a dependency package has changed.

4. Start the development server (from repo root):
   ```bash
   pnpm --filter frontend run dev
   ```
   The frontend will start at http://localhost:5173

### Production Deployment Checklist (Vercel + Render)

Use this checklist before/after production deploys to avoid auth and Zero sync issues.

1. **Clerk publishable key**
   - Set `VITE_CLERK_PUBLISHABLE_KEY` in frontend production env.
   - `pk_live_*` is recommended.
   - `pk_test_*` is supported (for testing/no custom domain), but Clerk will show browser warnings and enforce development-instance limits.

2. **Zero version parity**
   - Keep frontend + zero-query `@rocicorp/zero` package versions aligned.
   - Zero-cache version is pinned only in the root **Dockerfile** (used by both local docker-compose and production). Change it there to upgrade; then rebuild/redeploy zero-cache.

3. **Allowed frontend origins**
   - In Render zero-query env, set `FRONTEND_ORIGINS` to include your deployed frontend URL(s), for example:
     - `https://splitzy-kappa.vercel.app`
   - If you use preview deployments, add those origins too.

4. **If you see `VersionNotSupported` protocol errors**
   - Typical error: `server is at sync protocol v44 and does not support v45`.
   - This usually means your frontend client is newer than deployed zero-cache.
   - Fix by redeploying/upgrading zero-cache (and zero-query if needed) so versions are compatible, then retest.

5. **If the root Dockerfile base image (`rocicorp/zero`) was changed**
   - Rebuild and redeploy zero-cache: locally run `docker-compose up -d --build zero-cache-local`; in production, redeploy the zero-cache service from the same Dockerfile.

## Project Structure

```text
splitzy/
├── backend/                  # Flask API
│   ├── app.py
│   ├── blueprints/           # Route handlers
│   ├── models/               # SQLAlchemy models
│   ├── schemas/              # Marshmallow schemas
│   ├── migrations/           # Alembic migrations
│   ├── scripts/              # DB dump/restore helpers
│   ├── tests/
│   └── requirements.txt
├── frontend/                 # React app (Vite)
│   ├── src/
│   ├── api/                  # Vercel serverless functions
│   └── package.json
├── zero-query/               # Zero Query API server
│   ├── src/
│   ├── Dockerfile
│   └── package.json
├── shared-zero/              # Shared Zero schema + types
│   ├── src/
│   └── package.json
├── Dockerfile                # Zero-cache image (single source of truth)
├── docker-compose.yml
├── package.json              # pnpm workspace root
└── pnpm-workspace.yaml
```

## Development

### Running Tests

```bash
# Backend tests
pytest

# Frontend tests
pnpm --filter frontend run test
```
