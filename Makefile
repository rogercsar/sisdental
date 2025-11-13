.PHONY: help dev build test clean docker-up docker-down docker-logs install lint format

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install all dependencies
	@echo "Installing backend dependencies..."
	cd backend && go mod download
	@echo "Installing frontend dependencies..."
	cd frontend && pnpm install

dev: ## Start both backend and frontend in development mode
	@echo "Starting development servers..."
	@trap 'kill %1; kill %2' SIGINT; \
	(cd backend && air) & \
	(cd frontend && pnpm dev) & \
	wait

dev-backend: ## Start only backend in development mode
	cd backend && go run main.go

dev-frontend: ## Start only frontend in development mode
	cd frontend && pnpm dev

build: ## Build both backend and frontend for production
	@echo "Building backend..."
	cd backend && go build -o bin/sis-dental main.go
	@echo "Building frontend..."
	cd frontend && pnpm build

build-backend: ## Build backend for production
	cd backend && go build -o bin/sis-dental main.go

build-frontend: ## Build frontend for production
	cd frontend && pnpm build

test: ## Run all tests
	@echo "Running backend tests..."
	cd backend && go test ./...
	@echo "Running frontend tests..."
	cd frontend && pnpm test

test-backend: ## Run backend tests
	cd backend && go test ./...

test-frontend: ## Run frontend tests
	cd frontend && pnpm test

lint: ## Run linters for both backend and frontend
	@echo "Linting backend..."
	cd backend && go fmt ./... && go vet ./...
	@echo "Linting frontend..."
	cd frontend && pnpm lint

format: ## Format code for both backend and frontend
	@echo "Formatting backend..."
	cd backend && go fmt ./...
	@echo "Formatting frontend..."
	cd frontend && pnpm lint --fix

clean: ## Clean build artifacts
	@echo "Cleaning backend..."
	cd backend && rm -rf bin/ tmp/
	@echo "Cleaning frontend..."
	cd frontend && rm -rf dist/ node_modules/.vite/

docker-up: ## Start development environment with Docker
	docker-compose up -d

docker-down: ## Stop development environment
	docker-compose down

docker-logs: ## Show Docker logs
	docker-compose logs -f

docker-build: ## Build Docker images
	docker-compose build

docker-rebuild: ## Rebuild Docker images from scratch
	docker-compose build --no-cache

migrate-up: ## Run database migrations up
	cd backend && go run main.go migrate up

migrate-down: ## Run database migrations down
	cd backend && go run main.go migrate down

migrate-reset: ## Reset database migrations
	cd backend && go run main.go migrate reset

setup: install ## Setup the project for the first time
	@echo "Setting up project..."
	@if [ ! -f backend/.env ]; then \
		echo "Creating backend .env file from example..."; \
		cp backend/.env.example backend/.env; \
		echo "Please edit backend/.env with your configuration"; \
	fi
	@echo "Setup complete!"

prod-setup: ## Setup for production deployment
	@echo "Setting up for production..."
	$(MAKE) build
	@echo "Production setup complete!"

health-check: ## Check if services are running
	@echo "Checking backend health..."
	@curl -f http://localhost:8080/health || echo "Backend not running"
	@echo "Checking frontend..."
	@curl -f http://localhost:5173 || echo "Frontend not running"
