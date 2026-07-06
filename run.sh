#!/usr/bin/env bash
# Boot Semvex locally. Creates a venv, installs deps, and serves on :8000.
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -d .venv ]; then
  python3 -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate
pip install -q -r requirements.txt

echo "→ Semvex running at http://localhost:8000"
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
