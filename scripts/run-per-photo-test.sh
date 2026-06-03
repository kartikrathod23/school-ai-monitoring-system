#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
bash "$ROOT/scripts/run-e2e-services.sh"
bash "$ROOT/scripts/restart-backend-local.sh"
export USE_LOCAL_UPLOAD=true
node "$ROOT/scripts/e2e-per-photo-test.mjs" 2>&1 | tee "$ROOT/scripts/per-photo-attendance.log"
echo ""
echo "Log:  scripts/per-photo-attendance.log"
echo "JSON: scripts/per-photo-attendance-results.json"
