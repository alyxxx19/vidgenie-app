#!/bin/bash

# ==================================================
# Script pour démarrer l'environnement de développement Docker
# PHASE 5.2 - Scripts Docker Compose
# ==================================================

set -e

echo "🚀 Starting VidGenie development environment..."

# Vérifier que Docker est installé
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Copier le fichier d'environnement s'il n'existe pas
if [ ! -f .env ]; then
    echo "📋 Creating .env file from .env.docker template..."
    cp .env.docker .env
    echo "⚠️  Please edit .env file with your actual API keys and configuration"
fi

# Créer les répertoires nécessaires
echo "📁 Creating necessary directories..."
mkdir -p logs
mkdir -p config/nginx/ssl
mkdir -p config/grafana/{dashboards,datasources}

# Nettoyer les containers existants si demandé
if [ "$1" == "--clean" ]; then
    echo "🧹 Cleaning existing containers and volumes..."
    docker-compose down -v
    docker system prune -f
fi

# Démarrer les services
echo "🔧 Starting development services..."
docker-compose up -d

# Attendre que les services soient prêts
echo "⏳ Waiting for services to be ready..."
sleep 10

# Vérifier l'état des services
echo "📊 Checking service status..."
docker-compose ps

# Afficher les logs récents
echo "📝 Recent logs:"
docker-compose logs --tail=20

# Informations utiles
echo ""
echo "✅ Development environment is ready!"
echo ""
echo "🔗 Available services:"
echo "   • Application:     http://localhost:3000"
echo "   • Adminer (DB):    http://localhost:8080"
echo "   • Redis Commander: http://localhost:8081"
echo ""
echo "🛠️  Useful commands:"
echo "   • View logs:       docker-compose logs -f [service]"
echo "   • Stop services:   docker-compose down"
echo "   • Rebuild:         docker-compose build --no-cache"
echo "   • Shell access:    docker-compose exec app sh"
echo ""
echo "⚠️  Don't forget to:"
echo "   1. Configure your .env file with real API keys"
echo "   2. Run 'npm run db:push' to setup the database schema"
echo "   3. Create your first user via the application"