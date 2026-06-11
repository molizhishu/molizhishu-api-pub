#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
ENV_FILE="${1:-docker.env}"

cd "$ROOT_DIR"

if ! command -v docker >/dev/null 2>&1 && [ -x /usr/local/bin/docker ]; then
  PATH="/usr/local/bin:$PATH"
  export PATH
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE. Please run: cp docker.env.example docker.env" >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker daemon is not running. Please start Docker Desktop and retry." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

if docker compose version >/dev/null 2>&1; then
  exec docker compose up -d --build
fi

if command -v docker-compose >/dev/null 2>&1; then
  exec docker-compose up -d --build
fi

echo "Docker Compose is not available. Install Docker Compose v2 or docker-compose v1." >&2
exit 1
