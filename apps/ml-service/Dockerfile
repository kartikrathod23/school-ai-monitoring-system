# ── Python ML Service ──────────────────────────────────────────
# Build context must be the project ROOT (not apps/ml-service),
# so we can access the attendance_system shared library.
#
# In docker-compose.yml, use:
#   build:
#     context: .          ← project root
#     dockerfile: apps/ml-service/Dockerfile
#
FROM python:3.11-slim AS base

# System libs required by opencv and psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libgl1 \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Install Python dependencies ──────────────────────────────────
COPY apps/ml-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── Copy ml-service source ────────────────────────────────────────
COPY apps/ml-service/main.py .
COPY apps/ml-service/core/ ./core/
COPY apps/ml-service/routers/ ./routers/

# ── Copy the shared attendance_system ML library ─────────────────
COPY apps/ml-worker/src/ml/attendance_system/ ./attendance_system/

# Expose ml-worker source so "from src.xxx import" works
ENV PYTHONPATH="/app/attendance_system:/app"

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
