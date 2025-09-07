#!/bin/bash

# ==================================================
# Script pour déployer l'environnement de production Docker
# PHASE 5.2 - Scripts Docker Compose Production
# ==================================================

set -e

echo "🚀 Deploying VidGenie production environment..."

# Variables
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"

# Vérifications préalables
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Production environment file $ENV_FILE not found."
    echo "Please create it based on .env.docker template with production values."
    exit 1
fi

# Vérifier les variables critiques
echo "🔍 Checking critical environment variables..."
source "$ENV_FILE"

REQUIRED_VARS=(
    "DATABASE_URL"
    "NEXTAUTH_SECRET"
    "NEXTAUTH_URL"
    "ENCRYPTION_KEY"
)

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Required environment variable $var is not set in $ENV_FILE"
        exit 1
    fi
done

echo "✅ All required environment variables are set"

# Créer les répertoires nécessaires
echo "📁 Creating necessary directories..."
mkdir -p logs
mkdir -p config/nginx/ssl
mkdir -p config/grafana/{dashboards,datasources}

# Générer certificats SSL auto-signés si ils n'existent pas (pour test)
if [ ! -f config/nginx/ssl/cert.pem ]; then
    echo "🔒 Generating self-signed SSL certificates..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout config/nginx/ssl/key.pem \
        -out config/nginx/ssl/cert.pem \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
    echo "⚠️  Using self-signed certificates. Replace with real certificates in production!"
fi

# Backup des données existantes si demandé
if [ "$1" == "--backup" ]; then
    echo "💾 Creating backup..."
    BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    # Backup des volumes Docker
    docker run --rm -v vidgenie-app_redis_prod_data:/data \
        -v "$(pwd)/$BACKUP_DIR:/backup" alpine \
        tar czf /backup/redis_data.tar.gz -C /data .
    
    echo "✅ Backup created in $BACKUP_DIR"
fi

# Build et déploiement
echo "🏗️  Building production images..."
docker-compose -f "$COMPOSE_FILE" build --no-cache

echo "🚀 Starting production services..."
docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d

# Attendre que les services soient prêts
echo "⏳ Waiting for services to be ready..."
sleep 30

# Vérifier l'état des services
echo "📊 Checking service status..."
docker-compose -f "$COMPOSE_FILE" ps

# Health checks
echo "🏥 Running health checks..."
sleep 10

APP_HEALTH=$(docker-compose -f "$COMPOSE_FILE" exec -T app node scripts/healthcheck.js 2>/dev/null && echo "✅" || echo "❌")
REDIS_HEALTH=$(docker-compose -f "$COMPOSE_FILE" exec -T redis redis-cli ping 2>/dev/null | grep -q "PONG" && echo "✅" || echo "❌")

echo "Health Status:"
echo "   • Application: $APP_HEALTH"
echo "   • Redis:       $REDIS_HEALTH"

# Configuration post-déploiement
echo "⚙️  Post-deployment configuration..."

# Attendre que l'app soit complètement prête
sleep 20

# Afficher les informations de déploiement
echo ""
echo "✅ Production deployment completed!"
echo ""
echo "🔗 Available services:"
echo "   • Application:     https://localhost (port 443)"
echo "   • Prometheus:      http://localhost:9090"
echo "   • Grafana:         http://localhost:3001"
echo ""
echo "🛠️  Useful commands:"
echo "   • View logs:       docker-compose -f $COMPOSE_FILE logs -f [service]"
echo "   • Stop services:   docker-compose -f $COMPOSE_FILE down"
echo "   • Update:          ./scripts/docker-prod.sh --update"
echo "   • Backup:          ./scripts/docker-prod.sh --backup"
echo ""
echo "📊 Monitoring:"
echo "   • Check metrics at http://localhost:9090"
echo "   • Grafana dashboards at http://localhost:3001 (admin/admin123)"
echo ""
echo "⚠️  Security reminders:"
echo "   • Change default passwords"
echo "   • Use real SSL certificates"
echo "   • Configure firewall rules"
echo "   • Set up proper backup strategy"

# Update mode
if [ "$1" == "--update" ]; then
    echo "🔄 Updating production deployment..."
    docker-compose -f "$COMPOSE_FILE" pull
    docker-compose -f "$COMPOSE_FILE" build --no-cache
    docker-compose -f "$COMPOSE_FILE" up -d
    echo "✅ Update completed"
fi