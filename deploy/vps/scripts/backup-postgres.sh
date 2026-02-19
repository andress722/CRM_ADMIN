#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f "deploy/vps/.env.production" ]]; then
  echo "Arquivo deploy/vps/.env.production nao encontrado."
  exit 1
fi

set -a
source deploy/vps/.env.production
set +a

BACKUP_DIR="${1:-/var/backups/ecommerce}"
TIMESTAMP="$(date +%F_%H%M%S)"
OUT_FILE="${BACKUP_DIR}/ecommerce_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" ecommerce-db \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" | gzip > "$OUT_FILE"

echo "Backup gerado: $OUT_FILE"
