#!/usr/bin/env bash
# One-command E2E: start deps, backend (local upload), run test, save results.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Ensuring services..."
bash "$ROOT/scripts/run-e2e-services.sh"
bash "$ROOT/scripts/restart-backend-local.sh"

echo "==> Running full E2E test..."
export USE_LOCAL_UPLOAD=true
export E2E_RUN_TAG="${E2E_RUN_TAG:-$(date +%s | tail -c 6)}"
node "$ROOT/scripts/e2e-full-flow.mjs" 2>&1 | tee "$ROOT/scripts/e2e-run.log"

echo ""
echo "Results:"
echo "  scripts/e2e-test-results.json"
echo "  scripts/e2e-test-results.txt"
echo "  scripts/e2e-run.log"
