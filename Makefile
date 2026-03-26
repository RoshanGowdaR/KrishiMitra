.PHONY: dev prod build stop clean test lint help logs logs-be logs-fe shell-be shell-fe

help:
	@echo "KrishiMitra Docker Commands"
	@echo "================================"
	@echo "make dev       - Start development with hot reload"
	@echo "make prod      - Start production build"
	@echo "make build     - Build all Docker images"
	@echo "make stop      - Stop all containers"
	@echo "make clean     - Remove containers and images"
	@echo "make test      - Run backend tests"
	@echo "make lint      - Run ruff linter"
	@echo "make logs      - View container logs"
	@echo "make shell-be  - Open backend container shell"
	@echo "make shell-fe  - Open frontend container shell"

dev:
	docker-compose -f docker-compose.dev.yml up --build

prod:
	docker-compose up --build

build:
	docker-compose build

stop:
	docker-compose down
	docker-compose -f docker-compose.dev.yml down

clean:
	docker-compose down --rmi all --volumes --remove-orphans
	docker-compose -f docker-compose.dev.yml down \
	  --rmi all --volumes --remove-orphans

test:
	docker-compose -f docker-compose.dev.yml run --rm \
	  backend python -m pytest tests/ -v

lint:
	docker-compose -f docker-compose.dev.yml run --rm \
	  backend python -m ruff check .

logs:
	docker-compose logs -f

logs-be:
	docker-compose logs -f backend

logs-fe:
	docker-compose logs -f frontend

shell-be:
	docker exec -it krishimitra-backend bash

shell-fe:
	docker exec -it krishimitra-frontend sh
