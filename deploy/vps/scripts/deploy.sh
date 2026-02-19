#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f "deploy/vps/.env.production" ]]; then
  echo "Arquivo deploy/vps/.env.production nao encontrado."
  echo "Copie deploy/vps/.env.production.example e preencha os segredos."
  exit 1
fi

docker compose -f deploy/vps/docker-compose.prod.yml --env-file deploy/vps/.env.production pull postgres || true
docker compose -f deploy/vps/docker-compose.prod.yml --env-file deploy/vps/.env.production build api
docker compose -f deploy/vps/docker-compose.prod.yml --env-file deploy/vps/.env.production up -d

echo "Deploy concluido."
echo "Healthcheck: curl -fsS http://127.0.0.1:\${API_HOST_PORT:-5071}/health"
