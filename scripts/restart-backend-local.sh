#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/apps/backend"
export USE_LOCAL_UPLOAD=true
export LOCAL_UPLOAD_BASE_URL=http://127.0.0.1:5000
if command -v fuser >/dev/null 2>&1; then
  fuser -k 5000/tcp 2>/dev/null || true
  sleep 1
fi
nohup env USE_LOCAL_UPLOAD=true LOCAL_UPLOAD_BASE_URL=http://127.0.0.1:5000 npm run dev > /tmp/school-backend.log 2>&1 &
echo "Backend restarting with USE_LOCAL_UPLOAD=true (log: /tmp/school-backend.log)"
sleep 4
curl -sf http://127.0.0.1:5000/ && echo ""
