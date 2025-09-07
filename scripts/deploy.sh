#!/bin/bash

# ==================================================
# Script de déploiement principal VidGenie
# PHASE 5.4 - Scripts de déploiement et monitoring
# ==================================================

set -e

# Configuration par défaut
ENVIRONMENT=""
VERSION=""
BACKUP=false
ROLLBACK=false
FORCE=false
VERBOSE=false
CONFIG_FILE=""

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction d'aide
usage() {
    cat << EOF
🚀 VidGenie Deployment Script

Usage: $0 [OPTIONS] ENVIRONMENT

ARGUMENTS:
    ENVIRONMENT     Target environment (dev|staging|production)

OPTIONS:
    -v, --version VERSION    Version/tag to deploy
    -b, --backup            Create backup before deployment
    -r, --rollback VERSION  Rollback to specified version
    -f, --force             Force deployment without confirmations
    -c, --config FILE       Use custom configuration file
    --verbose               Enable verbose logging
    -h, --help              Show this help message

EXAMPLES:
    $0 staging                          # Deploy latest to staging
    $0 production -v v1.2.3 --backup   # Deploy v1.2.3 to prod with backup
    $0 production --rollback v1.2.2    # Rollback production to v1.2.2
    
ENVIRONMENTS:
    dev         - Local development with Docker Compose
    staging     - Staging environment with monitoring
    production  - Production environment with full security

EOF
}

# Fonction de logging
log() {
    local level=$1
    shift
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        "INFO")  echo -e "${BLUE}[INFO]${NC}  [$timestamp] $*" ;;
        "WARN")  echo -e "${YELLOW}[WARN]${NC}  [$timestamp] $*" ;;
        "ERROR") echo -e "${RED}[ERROR]${NC} [$timestamp] $*" ;;
        "SUCCESS") echo -e "${GREEN}[SUCCESS]${NC} [$timestamp] $*" ;;
        "DEBUG") [[ $VERBOSE == true ]] && echo -e "[DEBUG] [$timestamp] $*" ;;
    esac
}

# Validation de l'environnement
validate_environment() {
    local env=$1
    case $env in
        dev|staging|production) return 0 ;;
        *) 
            log "ERROR" "Invalid environment: $env"
            log "ERROR" "Valid environments: dev, staging, production"
            exit 1
            ;;
    esac
}

# Vérification des prérequis
check_prerequisites() {
    log "INFO" "Checking prerequisites for environment: $ENVIRONMENT"
    
    # Vérifications communes
    local required_commands=("docker" "docker-compose" "git" "curl")
    for cmd in "${required_commands[@]}"; do
        if ! command -v $cmd &> /dev/null; then
            log "ERROR" "$cmd is required but not installed"
            exit 1
        fi
    done
    
    # Vérifications spécifiques par environnement
    case $ENVIRONMENT in
        "production"|"staging")
            if [[ -z "$DEPLOY_HOST" ]]; then
                log "ERROR" "DEPLOY_HOST environment variable is required for $ENVIRONMENT"
                exit 1
            fi
            
            if [[ ! -f "$HOME/.ssh/id_rsa" ]] && [[ -z "$SSH_KEY_PATH" ]]; then
                log "ERROR" "SSH key is required for remote deployment"
                exit 1
            fi
            ;;
    esac
    
    log "SUCCESS" "Prerequisites check passed"
}

# Configuration de l'environnement
load_environment_config() {
    local env=$1
    local config_file=""
    
    # Charger le fichier de configuration
    if [[ -n "$CONFIG_FILE" ]]; then
        config_file="$CONFIG_FILE"
    else
        case $env in
            "dev") config_file=".env.docker" ;;
            "staging") config_file=".env.staging" ;;
            "production") config_file=".env.production" ;;
        esac
    fi
    
    if [[ -f "$config_file" ]]; then
        log "INFO" "Loading configuration from $config_file"
        source "$config_file"
    else
        log "WARN" "Configuration file $config_file not found"
        if [[ "$env" != "dev" ]]; then
            log "ERROR" "Configuration file is required for $env environment"
            exit 1
        fi
    fi
    
    # Validation des variables critiques
    if [[ "$env" != "dev" ]]; then
        local required_vars=("DATABASE_URL" "NEXTAUTH_SECRET" "ENCRYPTION_KEY")
        for var in "${required_vars[@]}"; do
            if [[ -z "${!var}" ]]; then
                log "ERROR" "Required environment variable $var is not set"
                exit 1
            fi
        done
    fi
}

# Création de backup
create_backup() {
    if [[ "$BACKUP" != true ]]; then
        return 0
    fi
    
    log "INFO" "Creating backup before deployment"
    local backup_dir="backups/$(date +%Y%m%d_%H%M%S)_${ENVIRONMENT}"
    mkdir -p "$backup_dir"
    
    case $ENVIRONMENT in
        "dev")
            # Backup local
            docker-compose exec postgres pg_dump -U postgres vidgenie_dev > "$backup_dir/database.sql" 2>/dev/null || true
            ;;
        "staging"|"production")
            # Backup distant
            ssh -o StrictHostKeyChecking=no "$DEPLOY_USER@$DEPLOY_HOST" << EOF
                cd /app/vidgenie
                mkdir -p "$backup_dir"
                
                # Backup base de données
                docker-compose -f docker-compose.prod.yml exec -T postgres \
                    pg_dump -U postgres vidgenie > "$backup_dir/database.sql"
                
                # Backup volumes Redis
                docker run --rm -v vidgenie-app_redis_prod_data:/data \
                    -v "\$(pwd)/$backup_dir:/backup" alpine \
                    tar czf /backup/redis_data.tar.gz -C /data .
                
                # Backup configuration
                cp -r config "$backup_dir/"
                cp .env.production "$backup_dir/"
                
                echo "✅ Backup created in $backup_dir"
EOF
            ;;
    esac
    
    log "SUCCESS" "Backup created in $backup_dir"
}

# Déploiement selon l'environnement
deploy_environment() {
    case $ENVIRONMENT in
        "dev")
            deploy_development
            ;;
        "staging")
            deploy_staging
            ;;
        "production")
            deploy_production
            ;;
    esac
}

# Déploiement développement
deploy_development() {
    log "INFO" "Deploying to development environment"
    
    # Nettoyer et rebuilder si force
    if [[ "$FORCE" == true ]]; then
        log "INFO" "Force rebuild requested"
        docker-compose down -v
        docker system prune -f
    fi
    
    # Démarrer les services
    docker-compose up -d --build
    
    # Attendre que les services soient prêts
    log "INFO" "Waiting for services to be ready..."
    sleep 30
    
    # Vérifier la santé des services
    if docker-compose exec -T app node scripts/healthcheck.js; then
        log "SUCCESS" "Development deployment completed successfully"
        log "INFO" "Application available at: http://localhost:3000"
    else
        log "ERROR" "Health check failed"
        exit 1
    fi
}

# Déploiement staging
deploy_staging() {
    log "INFO" "Deploying to staging environment"
    
    # Connexion SSH et déploiement
    ssh -o StrictHostKeyChecking=no "$DEPLOY_USER@$DEPLOY_HOST" << EOF
        set -e
        cd /app/vidgenie
        
        # Pull du code
        git fetch --all
        if [[ -n "$VERSION" ]]; then
            git checkout "$VERSION"
        else
            git pull origin main
        fi
        
        # Mise à jour de la configuration
        echo "DATABASE_URL=$DATABASE_URL" > .env.production
        echo "NEXTAUTH_SECRET=$NEXTAUTH_SECRET" >> .env.production
        echo "NEXTAUTH_URL=https://staging.vidgenie.com" >> .env.production
        echo "ENCRYPTION_KEY=$ENCRYPTION_KEY" >> .env.production
        
        # Build et déploiement
        docker-compose -f docker-compose.prod.yml pull
        docker-compose -f docker-compose.prod.yml build --no-cache
        docker-compose -f docker-compose.prod.yml up -d
        
        # Attente et vérification
        sleep 45
        curl -f https://staging.vidgenie.com/api/health || exit 1
        
        echo "✅ Staging deployment completed"
EOF
    
    log "SUCCESS" "Staging deployment completed"
    log "INFO" "Application available at: https://staging.vidgenie.com"
}

# Déploiement production
deploy_production() {
    log "INFO" "Deploying to production environment"
    
    # Confirmation pour la production
    if [[ "$FORCE" != true ]]; then
        echo -n "⚠️  You are about to deploy to PRODUCTION. Continue? [y/N] "
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            log "INFO" "Deployment cancelled"
            exit 0
        fi
    fi
    
    # Déploiement avec rolling update
    ssh -o StrictHostKeyChecking=no "$DEPLOY_USER@$DEPLOY_HOST" << EOF
        set -e
        cd /app/vidgenie
        
        # Pull du code
        git fetch --all
        if [[ -n "$VERSION" ]]; then
            git checkout "$VERSION"
        else
            git pull origin main
        fi
        
        # Configuration production
        echo "DATABASE_URL=$DATABASE_URL" > .env.production
        echo "NEXTAUTH_SECRET=$NEXTAUTH_SECRET" >> .env.production
        echo "NEXTAUTH_URL=https://vidgenie.com" >> .env.production
        echo "ENCRYPTION_KEY=$ENCRYPTION_KEY" >> .env.production
        
        # Rolling deployment
        docker-compose -f docker-compose.prod.yml pull
        docker-compose -f docker-compose.prod.yml build --no-cache
        
        # Déploiement progressif
        docker-compose -f docker-compose.prod.yml up -d --no-deps app
        sleep 60
        
        # Vérification health check
        if curl -f https://vidgenie.com/api/health; then
            # Mise à jour des autres services
            docker-compose -f docker-compose.prod.yml up -d
            echo "✅ Production deployment completed successfully"
        else
            echo "❌ Health check failed, rolling back"
            docker-compose -f docker-compose.prod.yml rollback
            exit 1
        fi
EOF
    
    log "SUCCESS" "Production deployment completed"
    log "INFO" "Application available at: https://vidgenie.com"
}

# Rollback
rollback_deployment() {
    if [[ -z "$VERSION" ]]; then
        log "ERROR" "Version is required for rollback"
        exit 1
    fi
    
    log "INFO" "Rolling back to version: $VERSION"
    
    case $ENVIRONMENT in
        "dev")
            git checkout "$VERSION"
            docker-compose down
            docker-compose up -d --build
            ;;
        "staging"|"production")
            ssh -o StrictHostKeyChecking=no "$DEPLOY_USER@$DEPLOY_HOST" << EOF
                cd /app/vidgenie
                git checkout "$VERSION"
                docker-compose -f docker-compose.prod.yml down
                docker-compose -f docker-compose.prod.yml up -d --build
EOF
            ;;
    esac
    
    log "SUCCESS" "Rollback completed to version: $VERSION"
}

# Post-deployment tasks
post_deployment_tasks() {
    log "INFO" "Running post-deployment tasks"
    
    # Nettoyage des images Docker non utilisées
    case $ENVIRONMENT in
        "dev")
            docker system prune -f
            ;;
        "staging"|"production")
            ssh -o StrictHostKeyChecking=no "$DEPLOY_USER@$DEPLOY_HOST" \
                "docker system prune -f"
            ;;
    esac
    
    # Monitoring et alertes
    log "INFO" "Setting up monitoring alerts"
    # TODO: Intégrer avec Prometheus/Grafana
    
    log "SUCCESS" "Post-deployment tasks completed"
}

# Fonction principale
main() {
    # Parse des arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -v|--version)
                VERSION="$2"
                shift 2
                ;;
            -b|--backup)
                BACKUP=true
                shift
                ;;
            -r|--rollback)
                ROLLBACK=true
                VERSION="$2"
                shift 2
                ;;
            -f|--force)
                FORCE=true
                shift
                ;;
            -c|--config)
                CONFIG_FILE="$2"
                shift 2
                ;;
            --verbose)
                VERBOSE=true
                shift
                ;;
            -h|--help)
                usage
                exit 0
                ;;
            -*)
                log "ERROR" "Unknown option: $1"
                usage
                exit 1
                ;;
            *)
                if [[ -z "$ENVIRONMENT" ]]; then
                    ENVIRONMENT="$1"
                else
                    log "ERROR" "Too many arguments"
                    usage
                    exit 1
                fi
                shift
                ;;
        esac
    done
    
    # Validation des arguments
    if [[ -z "$ENVIRONMENT" ]]; then
        log "ERROR" "Environment is required"
        usage
        exit 1
    fi
    
    validate_environment "$ENVIRONMENT"
    
    # Exécution
    log "INFO" "Starting deployment process"
    log "INFO" "Environment: $ENVIRONMENT"
    log "INFO" "Version: ${VERSION:-latest}"
    log "INFO" "Backup: $BACKUP"
    log "INFO" "Rollback: $ROLLBACK"
    
    check_prerequisites
    load_environment_config "$ENVIRONMENT"
    
    if [[ "$ROLLBACK" == true ]]; then
        rollback_deployment
    else
        create_backup
        deploy_environment
        post_deployment_tasks
    fi
    
    log "SUCCESS" "Deployment process completed successfully! 🚀"
}

# Exécution du script
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi