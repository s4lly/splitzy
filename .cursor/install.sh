#!/usr/bin/env bash
#
# Cloud Agent install script for Splitzy.
#
# Idempotent bootstrap that prepares the repository for local development in a
# Cloud Agent VM:
#   1. Generates dev-safe .env files (only when missing) so the Flask backend and
#      Vite frontend can boot without real secrets. Real secrets provided via the
#      Cloud Agent Secrets panel are injected as environment variables and take
#      precedence over these files at runtime (load_dotenv does not override the
#      process environment, and Vite prefers pre-existing env vars over .env).
#   2. Installs the pnpm workspace (frontend, zero-query, shared-zero) and builds
#      the shared-zero package that the other packages type-check against.
#   3. Creates the backend Python virtualenv and installs requirements.
#
# Safe to run repeatedly.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# Well-formed but non-functional placeholder Clerk publishable key
# (base64 of "cloud-dev.clerk.accounts.dev$"). Lets the frontend boot; real
# auth requires a genuine key supplied via env/secrets.
DUMMY_CLERK_PK="pk_test_Y2xvdWQtZGV2LmNsZXJrLmFjY291bnRzLmRldiQ"

echo "==> [1/3] Generating dev .env files (only if missing)"

if [ ! -f backend/.env ]; then
  cat > backend/.env <<EOF
# Auto-generated dev defaults for Cloud Agent (see .cursor/install.sh).
# Real secrets injected as environment variables override these values.

# Leave DATABASE_URL unset so the backend falls back to a local SQLite file.
# Set it to a Postgres URL for the full Zero stack.
# DATABASE_URL=postgresql://postgres:pass@localhost:5432/splitzy

VERCEL_ENV=development

# Placeholder Clerk credentials so create_app() can start. Requests that
# actually validate a Clerk session need real keys.
CLERK_SECRET_KEY=sk_test_cloud_agent_placeholder
CLERK_WEBHOOK_SECRET=whsec_cloud_agent_placeholder
CLERK_AUTHORIZED_PARTIES=http://localhost:5173

# create_app() refuses to start without VERCEL_FUNCTION_URL, so point it at the
# local \`vercel dev\` address. Nothing serves that port by default: receipt image
# uploads fail (after a 30s request timeout) until you run
# \`pnpm --filter frontend run vercel:link\` once and then
# \`pnpm --filter frontend run dev:vercel\` in a spare terminal -- both need a real
# Vercel login, and the upload itself also needs a genuine BLOB_READ_WRITE_TOKEN.
# The rest of the app (including receipt analysis from an existing URL) works
# without it.
VERCEL_FUNCTION_URL=http://localhost:3001/api/upload-to-blob

# Placeholder AI key; real receipt analysis needs a genuine Google API key.
GOOGLE_API_KEY=cloud_agent_placeholder

SECRET_KEY=cloud_agent_dev_secret_key
PORT=5001
EOF
  echo "    created backend/.env"
else
  echo "    backend/.env already exists, leaving untouched"
fi

if [ ! -f frontend/.env ]; then
  cat > frontend/.env <<EOF
# Auto-generated dev defaults for Cloud Agent (see .cursor/install.sh).
# Real secrets injected as environment variables override these values.

REACT_APP_API_URL=http://localhost:5001/api
VITE_VERCEL_ENV=development
VERCEL_DEV_PORT=3001

# Placeholder Clerk publishable key so the app boots. Sign-in needs a real key.
VITE_CLERK_PUBLISHABLE_KEY=$DUMMY_CLERK_PK

# index.tsx requires a PostHog key to be present; this disables real analytics.
REACT_APP_POSTHOG_PROJECT_API_KEY=phc_cloud_agent_placeholder

# ZeroProvider throws at module load if these are unset, so point them at the
# local Zero stack ports (docker-compose). Sync only works once those services
# run; the app still renders without them.
VITE_ZERO_CACHE_URL=http://localhost:4848
VITE_ZERO_QUERY_URL=http://localhost:3000/api/query
VITE_ZERO_MUTATE_URL=http://localhost:3000/api/mutate
EOF
  echo "    created frontend/.env"
else
  echo "    frontend/.env already exists, leaving untouched"
fi

if [ ! -f zero-query/.env ]; then
  cat > zero-query/.env <<EOF
# Auto-generated dev defaults for Cloud Agent (see .cursor/install.sh).
# Real secrets injected as environment variables override these values.

ZERO_UPSTREAM_DB=postgresql://postgres:pass@localhost:5432/splitzy
CLERK_SECRET_KEY=sk_test_cloud_agent_placeholder
CLERK_PUBLISHABLE_KEY=$DUMMY_CLERK_PK
CLERK_AUTHORIZED_PARTIES=http://localhost:5173
PORT=3000
NODE_ENV=development
EOF
  echo "    created zero-query/.env"
else
  echo "    zero-query/.env already exists, leaving untouched"
fi

echo "==> [2/3] Installing pnpm workspace dependencies"
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
pnpm install --frozen-lockfile
echo "    building @splitzy/shared-zero"
pnpm --filter @splitzy/shared-zero run build

echo "==> [3/3] Setting up backend Python virtualenv"
# The default image ships Python 3.12 without the venv/ensurepip module, so
# install it once (baked into the environment build snapshot). Idempotent: skip
# when venv already works.
if ! python3 -c "import ensurepip" >/dev/null 2>&1; then
  echo "    installing python3-venv (ensurepip missing)"
  sudo apt-get update -qq
  sudo apt-get install -y -qq "python3-venv" || \
    sudo apt-get install -y -qq "python3.12-venv"
fi
cd backend
if [ ! -f .venv/bin/activate ]; then
  rm -rf .venv
  python3 -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate
python -m pip install --upgrade pip >/dev/null
pip install -r requirements.txt
deactivate
cd "$REPO_ROOT"

echo "==> Install complete."
