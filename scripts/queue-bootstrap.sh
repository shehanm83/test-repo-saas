#!/usr/bin/env bash
set -euo pipefail

endpoint="${SQS_ENDPOINT:-http://localhost:9324}"

for queue in studio-generations studio-captions studio-generations-dlq; do
  curl -fsS -X POST "${endpoint}/?Action=CreateQueue&QueueName=${queue}" >/dev/null
  echo "ElasticMQ queue ready: ${queue}"
done
