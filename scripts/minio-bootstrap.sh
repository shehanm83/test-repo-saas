#!/usr/bin/env bash
set -euo pipefail

ENDPOINT="${S3_ENDPOINT:-http://localhost:9000}"
ACCESS_KEY="${S3_ACCESS_KEY_ID:-minio}"
SECRET_KEY="${S3_SECRET_ACCESS_KEY:-minio12345}"
APP_BUCKET="${S3_BUCKET_APP:-layertone-app}"
GLOBAL_BUCKET="${S3_BUCKET_GLOBAL:-layertone-global}"

until curl -fsS "$ENDPOINT/minio/health/live" >/dev/null; do
  sleep 1
done

mc() {
  docker run --rm --network host \
    -e MC_HOST_local="http://${ACCESS_KEY}:${SECRET_KEY}@localhost:9000" \
    minio/mc:latest "$@"
}

mc mb -p "local/${APP_BUCKET}" || true
mc mb -p "local/${GLOBAL_BUCKET}" || true
mc anonymous set download "local/${GLOBAL_BUCKET}" || true

echo "MinIO buckets created: ${APP_BUCKET}, ${GLOBAL_BUCKET}"
