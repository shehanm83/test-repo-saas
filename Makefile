.PHONY: dev dev\:up dev\:down dev\:reset minio\:bootstrap

dev: dev\:up minio\:bootstrap
	@echo "Local stack is up."
	@echo "  Postgres:   localhost:5432"
	@echo "  MinIO:      http://localhost:9001 (minio / minio12345)"
	@echo "  ElasticMQ:  http://localhost:9324"
	@echo "  Mailpit:    http://localhost:8025"

dev\:up:
	docker compose up -d

dev\:down:
	docker compose down

dev\:reset:
	docker compose down -v
	docker compose up -d

minio\:bootstrap:
	./scripts/minio-bootstrap.sh
