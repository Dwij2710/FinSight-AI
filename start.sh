#!/usr/bin/env bash
export PORT="${PORT:-10000}"
export PYTHONPATH="."
export PYTHONUNBUFFERED="1"
echo "[FinSight AI] Launching API on port $PORT..."
exec uvicorn main:app --host 0.0.0.0 --port "$PORT"
