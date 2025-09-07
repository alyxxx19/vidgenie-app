# ==================================================
# VidGenie Makefile - Commands for development and deployment
# PHASE 5.4 - Unified command interface
# ==================================================

.PHONY: help install dev build test lint clean deploy monitor backup

# Configuration
ENVIRONMENT ?= development
VERSION ?= latest

# Colors for output
GREEN := \033[0;32m
YELLOW := \033[1;33m
RED := \033[0;31m
NC := \033[0m # No Color

# Default target
.DEFAULT_GOAL := help

## Help - Display available commands
help:
	@echo ""
	@echo "🚀 $(GREEN)VidGenie Development Commands$(NC)"
	@echo "=================================="
	@echo ""
	@echo "📦 $(YELLOW)Setup & Installation:$(NC)"
	@echo "  make install          Install dependencies and setup environment"
	@echo "  make install-tools    Install development tools"
	@echo "  make setup-db         Setup and seed database"
	@echo ""
	@echo "🔧 $(YELLOW)Development:$(NC)"
	@echo "  make dev              Start development server"
	@echo "  make dev-docker       Start development with Docker"
	@echo "  make build            Build application for production"
	@echo "  make preview          Preview production build locally"
	@echo ""
	@echo "🧪 $(YELLOW)Testing & Quality:$(NC)"
	@echo "  make test             Run all tests"
	@echo "  make test-unit        Run unit tests only"
	@echo "  make test-e2e         Run end-to-end tests"
	@echo "  make test-performance Run performance tests"
	@echo "  make lint             Run linting and formatting"
	@echo "  make type-check       Run TypeScript type checking"
	@echo "  make audit            Run security and dependency audit"
	@echo ""
	@echo "🚀 $(YELLOW)Deployment:$(NC)"
	@echo "  make deploy ENV=staging    Deploy to staging"
	@echo "  make deploy ENV=production Deploy to production (with confirmation)"
	@echo "  make rollback VERSION=v1.0 Rollback to specific version"
	@echo ""
	@echo "📊 $(YELLOW)Monitoring & Maintenance:$(NC)"
	@echo "  make monitor          Show system status and metrics"
	@echo "  make logs             Show recent application logs"
	@echo "  make backup           Create backup of data and configuration"
	@echo "  make setup-monitoring Setup monitoring stack"
	@echo ""
	@echo "🧹 $(YELLOW)Cleanup:$(NC)"
	@echo "  make clean            Clean build artifacts and dependencies"
	@echo "  make clean-docker     Clean Docker images and containers"
	@echo "  make reset            Reset to clean state (DANGER)"
	@echo ""
	@echo "🔍 $(YELLOW)Inspection:$(NC)"
	@echo "  make inspect          Show system information and health"
	@echo "  make debug            Start application in debug mode"
	@echo ""
	@echo "Usage examples:"
	@echo "  make dev                    # Start development"
	@echo "  make deploy ENV=staging     # Deploy to staging"
	@echo "  make test-performance       # Run performance tests"
	@echo ""

## Setup & Installation
install: ## Install all dependencies
	@echo "📦 Installing dependencies..."
	npm ci
	@echo "🔧 Generating Prisma client..."
	npx prisma generate
	@echo "✅ Installation complete!"

install-tools: ## Install development tools
	@echo "🛠️ Installing development tools..."
	npm install -g typescript @next/codemod eslint
	@if ! command -v docker > /dev/null; then \
		echo "⚠️ Docker not found. Please install Docker manually."; \
	fi
	@if ! command -v k6 > /dev/null; then \
		echo "📊 Installing k6 for performance testing..."; \
		if command -v brew > /dev/null; then \
			brew install k6; \
		else \
			echo "⚠️ Please install k6 manually: https://k6.io/docs/getting-started/installation/"; \
		fi \
	fi
	@echo "✅ Development tools installed!"

setup-db: ## Setup database schema and seed data
	@echo "🗃️ Setting up database..."
	@if [ -f .env ]; then \
		npx prisma db push; \
		echo "✅ Database schema updated!"; \
	else \
		echo "❌ .env file not found. Please create it from .env.example"; \
		exit 1; \
	fi

## Development
dev: ## Start development server
	@echo "🚀 Starting development server..."
	npm run dev

dev-docker: ## Start development with Docker
	@echo "🐳 Starting development with Docker..."
	@if [ ! -f .env ]; then \
		echo "📋 Creating .env from .env.docker..."; \
		cp .env.docker .env; \
	fi
	./scripts/docker-dev.sh

build: ## Build application for production
	@echo "🏗️ Building application..."
	npm run build
	@echo "✅ Build complete!"

preview: ## Preview production build locally
	@echo "👀 Starting preview server..."
	npm run build && npm run start

## Testing & Quality
test: ## Run all tests
	@echo "🧪 Running all tests..."
	npm run type-check
	npm run lint
	npm run test
	@echo "✅ All tests passed!"

test-unit: ## Run unit tests only
	@echo "🧪 Running unit tests..."
	npm run test

test-e2e: ## Run end-to-end tests
	@echo "🧪 Running E2E tests..."
	@if command -v playwright > /dev/null; then \
		npm run test:e2e; \
	else \
		echo "⚠️ Playwright not installed. Run: npx playwright install"; \
	fi

test-performance: ## Run performance tests
	@echo "🔥 Running performance tests..."
	./scripts/performance-test.sh load

lint: ## Run linting and formatting
	@echo "🧹 Running linter..."
	npm run lint
	@echo "✅ Linting complete!"

type-check: ## Run TypeScript type checking
	@echo "🔍 Running type check..."
	npm run type-check
	@echo "✅ Type check complete!"

audit: ## Run security and dependency audit
	@echo "🔒 Running security audit..."
	npm audit --audit-level=moderate
	@if command -v snyk > /dev/null; then \
		snyk test; \
	else \
		echo "⚠️ Snyk not installed. Install with: npm install -g snyk"; \
	fi
	@echo "✅ Audit complete!"

## Deployment
deploy: ## Deploy to specified environment
	@if [ -z "$(ENV)" ]; then \
		echo "❌ ENV parameter required. Use: make deploy ENV=staging"; \
		exit 1; \
	fi
	@echo "🚀 Deploying to $(ENV)..."
	./scripts/deploy.sh $(ENV) --backup

deploy-force: ## Force deploy without confirmation
	@if [ -z "$(ENV)" ]; then \
		echo "❌ ENV parameter required. Use: make deploy-force ENV=staging"; \
		exit 1; \
	fi
	@echo "🚀 Force deploying to $(ENV)..."
	./scripts/deploy.sh $(ENV) --force --backup

rollback: ## Rollback to specified version
	@if [ -z "$(VERSION)" ]; then \
		echo "❌ VERSION parameter required. Use: make rollback VERSION=v1.0.0"; \
		exit 1; \
	fi
	@if [ -z "$(ENV)" ]; then \
		echo "❌ ENV parameter required. Use: make rollback ENV=production VERSION=v1.0.0"; \
		exit 1; \
	fi
	@echo "🔄 Rolling back $(ENV) to $(VERSION)..."
	./scripts/deploy.sh $(ENV) --rollback $(VERSION)

## Monitoring & Maintenance
monitor: ## Show system status and metrics
	@echo "📊 System monitoring..."
	./scripts/monitoring.sh status

logs: ## Show recent application logs
	@echo "📝 Recent logs..."
	./scripts/monitoring.sh logs

backup: ## Create backup of data and configuration
	@echo "💾 Creating backup..."
	./scripts/monitoring.sh backup-metrics
	@if docker-compose ps | grep -q "Up"; then \
		docker-compose exec postgres pg_dump -U postgres vidgenie > "backup_$(shell date +%Y%m%d_%H%M%S).sql"; \
		echo "✅ Database backup created!"; \
	fi

setup-monitoring: ## Setup monitoring stack (Prometheus, Grafana)
	@echo "📊 Setting up monitoring stack..."
	./scripts/setup-monitoring.sh $(ENVIRONMENT)

## Cleanup
clean: ## Clean build artifacts and dependencies
	@echo "🧹 Cleaning build artifacts..."
	rm -rf .next dist build coverage
	rm -rf node_modules/.cache
	npm cache clean --force
	@echo "✅ Cleanup complete!"

clean-docker: ## Clean Docker images and containers
	@echo "🐳 Cleaning Docker resources..."
	docker-compose down -v
	docker system prune -f
	docker volume prune -f
	@echo "✅ Docker cleanup complete!"

reset: ## Reset to clean state (DANGER - removes all data)
	@echo "⚠️ $(RED) WARNING: This will remove ALL data and reset to clean state!$(NC)"
	@echo -n "Are you sure? Type 'YES' to confirm: "
	@read confirm; \
	if [ "$$confirm" = "YES" ]; then \
		echo "🔄 Resetting to clean state..."; \
		docker-compose down -v; \
		docker system prune -af; \
		rm -rf node_modules .next dist build coverage; \
		rm -f .env; \
		echo "✅ Reset complete!"; \
	else \
		echo "❌ Reset cancelled."; \
	fi

## Inspection
inspect: ## Show system information and health
	@echo "🔍 System inspection..."
	@echo ""
	@echo "📋 $(YELLOW)Environment Information:$(NC)"
	@echo "  Node.js: $$(node --version 2>/dev/null || echo 'Not installed')"
	@echo "  npm: $$(npm --version 2>/dev/null || echo 'Not installed')"
	@echo "  Docker: $$(docker --version 2>/dev/null || echo 'Not installed')"
	@echo "  Git: $$(git --version 2>/dev/null || echo 'Not installed')"
	@echo ""
	@echo "📊 $(YELLOW)Project Information:$(NC)"
	@echo "  Name: $$(grep '"name"' package.json | cut -d'"' -f4)"
	@echo "  Version: $$(grep '"version"' package.json | cut -d'"' -f4)"
	@echo "  Environment: $(ENVIRONMENT)"
	@echo ""
	@if docker-compose ps 2>/dev/null | grep -q "Up"; then \
		echo "🐳 $(YELLOW)Docker Services:$(NC)"; \
		docker-compose ps; \
		echo ""; \
	fi
	@if [ -f .env ]; then \
		echo "✅ Environment configuration found"; \
	else \
		echo "⚠️ Environment configuration (.env) missing"; \
	fi

debug: ## Start application in debug mode
	@echo "🐛 Starting in debug mode..."
	DEBUG=* npm run dev

## Database operations
db-push: ## Push database schema changes
	@echo "🗃️ Pushing database schema..."
	npx prisma db push

db-studio: ## Open Prisma Studio
	@echo "🎛️ Opening Prisma Studio..."
	npx prisma studio

db-reset: ## Reset database (DANGER)
	@echo "⚠️ $(RED)WARNING: This will reset the database!$(NC)"
	@echo -n "Are you sure? Type 'YES' to confirm: "
	@read confirm; \
	if [ "$$confirm" = "YES" ]; then \
		npx prisma db push --force-reset; \
		echo "✅ Database reset complete!"; \
	else \
		echo "❌ Database reset cancelled."; \
	fi

## Utility functions
check-env: ## Check if environment file exists
	@if [ ! -f .env ]; then \
		echo "❌ .env file not found!"; \
		echo "📋 Creating from template..."; \
		cp .env.example .env 2>/dev/null || cp .env.docker .env 2>/dev/null; \
		echo "✅ Please edit .env with your configuration"; \
	else \
		echo "✅ Environment file found"; \
	fi

# Version information
version: ## Show version information
	@echo "VidGenie v$$(grep '"version"' package.json | cut -d'"' -f4)"
	@echo "Built with ❤️ by the VidGenie team"