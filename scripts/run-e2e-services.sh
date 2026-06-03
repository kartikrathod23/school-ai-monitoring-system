#!/usr/bin/env bash
# Start infrastructure + backend + ml-worker + Python ML for E2E tests.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Starting PostgreSQL (docker-compose)..."
docker compose up -d postgres 2>/dev/null || docker-compose up -d postgres

echo "==> Starting Redis..."
if ! redis-cli ping >/dev/null 2>&1; then
  if docker ps -a --format '{{.Names}}' | grep -q '^school_redis$'; then
    docker start school_redis >/dev/null 2>&1 || true
  else
    docker run -d --name school_redis -p 6379:6379 redis:7-alpine >/dev/null 2>&1 || true
  fi
  sleep 1
fi

echo "==> Prisma migrate (backend)..."
cd "$ROOT/apps/backend"
npx prisma migrate deploy 2>/dev/null || npx prisma db push
npx prisma db seed 2>/dev/null || true

echo "==> Starting Python ML service (port 8000)..."
cd "$ROOT/apps/ml-worker/src/ml/python_service"
if [[ -f venv/bin/activate ]]; then
  source venv/bin/activate
elif [[ -f "$ROOT/apps/face_attendance/venv/bin/activate" ]]; then
  source "$ROOT/apps/face_attendance/venv/bin/activate"
fi
if ! curl -sf http://127.0.0.1:8000/health >/dev/null 2>&1; then
  nohup python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 \
    > /tmp/school-ml-python.log 2>&1 &
  echo "    Python PID $! (log: /tmp/school-ml-python.log)"
  sleep 3
fi

echo "==> Starting backend (port 5000)..."
cd "$ROOT/apps/backend"
if ! curl -sf http://127.0.0.1:5000/ >/dev/null 2>&1; then
  export USE_LOCAL_UPLOAD=true
  export LOCAL_UPLOAD_BASE_URL=http://127.0.0.1:5000
  nohup env USE_LOCAL_UPLOAD=true LOCAL_UPLOAD_BASE_URL=http://127.0.0.1:5000 npm run dev > /tmp/school-backend.log 2>&1 &
  echo "    Backend PID $! (log: /tmp/school-backend.log)"
  sleep 4
fi

echo "==> Starting ML worker..."
cd "$ROOT/apps/ml-worker"
npx prisma generate >/dev/null 2>&1 || true
if ! pgrep -f "ml-worker.*src/index" >/dev/null 2>&1; then
  nohup npm run dev > /tmp/school-ml-worker.log 2>&1 &
  echo "    ML worker PID $! (log: /tmp/school-ml-worker.log)"
  sleep 2
fi

echo ""
echo "Services ready. Run: node scripts/e2e-full-flow.mjs"
echo "Logs: /tmp/school-{backend,ml-worker,ml-python}.log"
