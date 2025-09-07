#!/bin/bash

# ==================================================
# Script de monitoring et alertes VidGenie
# PHASE 5.4 - Monitoring et observabilité
# ==================================================

set -e

# Configuration
ENVIRONMENT="${ENVIRONMENT:-production}"
GRAFANA_URL="${GRAFANA_URL:-http://localhost:3001}"
PROMETHEUS_URL="${PROMETHEUS_URL:-http://localhost:9090}"
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:-}"
EMAIL_ALERTS="${EMAIL_ALERTS:-}"

# Seuils d'alerte
CPU_THRESHOLD=80
MEMORY_THRESHOLD=85
DISK_THRESHOLD=90
RESPONSE_TIME_THRESHOLD=2000  # ms
ERROR_RATE_THRESHOLD=5        # %

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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
    esac
}

# Fonction d'aide
usage() {
    cat << EOF
📊 VidGenie Monitoring Script

Usage: $0 [COMMAND] [OPTIONS]

COMMANDS:
    status          - Show current system status
    health          - Run health checks
    metrics         - Display key metrics
    alerts          - Check for alerts
    dashboard       - Open Grafana dashboard
    logs            - Show recent logs
    backup-metrics  - Backup monitoring data
    test-alerts     - Test alert mechanisms

OPTIONS:
    -e, --environment ENV    Environment to monitor (dev|staging|production)
    -v, --verbose           Enable verbose output
    -j, --json              Output in JSON format
    -h, --help              Show this help message

EXAMPLES:
    $0 status                    # Show system status
    $0 health -e production     # Health check for production
    $0 metrics --json           # Get metrics in JSON format
    $0 alerts                   # Check for active alerts
    
EOF
}

# Vérification des services Docker
check_docker_services() {
    log "INFO" "Checking Docker services status"
    
    local services=("app" "postgres" "redis" "nginx" "prometheus" "grafana")
    local failed_services=()
    
    for service in "${services[@]}"; do
        if docker-compose ps "$service" | grep -q "Up"; then
            log "SUCCESS" "✅ $service is running"
        else
            log "ERROR" "❌ $service is not running"
            failed_services+=("$service")
        fi
    done
    
    if [[ ${#failed_services[@]} -gt 0 ]]; then
        log "ERROR" "Failed services: ${failed_services[*]}"
        return 1
    fi
    
    return 0
}

# Vérification de santé de l'application
check_app_health() {
    log "INFO" "Checking application health"
    
    local health_url="http://localhost:3000/api/health"
    if [[ "$ENVIRONMENT" == "production" ]]; then
        health_url="https://vidgenie.com/api/health"
    elif [[ "$ENVIRONMENT" == "staging" ]]; then
        health_url="https://staging.vidgenie.com/api/health"
    fi
    
    local response=$(curl -s -w "HTTPSTATUS:%{http_code};TIME:%{time_total}" "$health_url" || echo "FAILED")
    
    if [[ "$response" == "FAILED" ]]; then
        log "ERROR" "❌ Application health check failed - no response"
        return 1
    fi
    
    local http_code=$(echo "$response" | sed -E 's/.*HTTPSTATUS:([0-9]+).*/\1/')
    local response_time=$(echo "$response" | sed -E 's/.*TIME:([0-9.]+).*/\1/')
    local response_time_ms=$(echo "$response_time * 1000" | bc)
    
    if [[ "$http_code" == "200" ]]; then
        log "SUCCESS" "✅ Application is healthy (${response_time_ms%.*}ms)"
        
        if (( $(echo "$response_time_ms > $RESPONSE_TIME_THRESHOLD" | bc -l) )); then
            log "WARN" "⚠️ Slow response time: ${response_time_ms%.*}ms (threshold: ${RESPONSE_TIME_THRESHOLD}ms)"
        fi
        return 0
    else
        log "ERROR" "❌ Application health check failed - HTTP $http_code"
        return 1
    fi
}

# Vérification de la base de données
check_database_health() {
    log "INFO" "Checking database health"
    
    local db_result=$(docker-compose exec -T postgres pg_isready -U postgres 2>/dev/null || echo "FAILED")
    
    if echo "$db_result" | grep -q "accepting connections"; then
        log "SUCCESS" "✅ Database is healthy"
        
        # Vérifier les connexions actives
        local active_connections=$(docker-compose exec -T postgres psql -U postgres -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null | xargs || echo "0")
        log "INFO" "Active database connections: $active_connections"
        
        return 0
    else
        log "ERROR" "❌ Database health check failed"
        return 1
    fi
}

# Vérification de Redis
check_redis_health() {
    log "INFO" "Checking Redis health"
    
    local redis_result=$(docker-compose exec -T redis redis-cli ping 2>/dev/null || echo "FAILED")
    
    if [[ "$redis_result" == "PONG" ]]; then
        log "SUCCESS" "✅ Redis is healthy"
        
        # Statistiques Redis
        local redis_info=$(docker-compose exec -T redis redis-cli info memory 2>/dev/null || echo "")
        local used_memory=$(echo "$redis_info" | grep "used_memory_human:" | cut -d: -f2 | tr -d '\r')
        if [[ -n "$used_memory" ]]; then
            log "INFO" "Redis memory usage: $used_memory"
        fi
        
        return 0
    else
        log "ERROR" "❌ Redis health check failed"
        return 1
    fi
}

# Métriques système
get_system_metrics() {
    log "INFO" "Collecting system metrics"
    
    # CPU usage
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')
    log "INFO" "CPU Usage: ${cpu_usage}%"
    
    # Memory usage
    local memory_info=$(free -m | grep "Mem:")
    local total_mem=$(echo $memory_info | awk '{print $2}')
    local used_mem=$(echo $memory_info | awk '{print $3}')
    local memory_percentage=$((used_mem * 100 / total_mem))
    log "INFO" "Memory Usage: ${memory_percentage}% (${used_mem}MB / ${total_mem}MB)"
    
    # Disk usage
    local disk_usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    log "INFO" "Disk Usage: ${disk_usage}%"
    
    # Load average
    local load_avg=$(uptime | awk -F'load average:' '{print $2}')
    log "INFO" "Load Average: $load_avg"
    
    # Check thresholds
    if (( $(echo "${cpu_usage%.*} > $CPU_THRESHOLD" | bc -l) )); then
        log "WARN" "⚠️ High CPU usage: ${cpu_usage}%"
    fi
    
    if [[ $memory_percentage -gt $MEMORY_THRESHOLD ]]; then
        log "WARN" "⚠️ High memory usage: ${memory_percentage}%"
    fi
    
    if [[ $disk_usage -gt $DISK_THRESHOLD ]]; then
        log "WARN" "⚠️ High disk usage: ${disk_usage}%"
    fi
}

# Métriques Docker
get_docker_metrics() {
    log "INFO" "Collecting Docker metrics"
    
    # Statistiques des conteneurs
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}" || true
}

# Métriques Prometheus
get_prometheus_metrics() {
    if ! curl -s "$PROMETHEUS_URL" >/dev/null 2>&1; then
        log "WARN" "Prometheus not accessible at $PROMETHEUS_URL"
        return 1
    fi
    
    log "INFO" "Collecting Prometheus metrics"
    
    # Quelques métriques clés via l'API Prometheus
    local metrics=(
        "up"
        "nodejs_heap_size_used_bytes"
        "http_requests_total"
        "http_request_duration_seconds"
    )
    
    for metric in "${metrics[@]}"; do
        local result=$(curl -s "$PROMETHEUS_URL/api/v1/query?query=$metric" | jq -r '.data.result[0].value[1] // "N/A"' 2>/dev/null || echo "N/A")
        log "INFO" "$metric: $result"
    done
}

# Vérification des alertes
check_alerts() {
    log "INFO" "Checking for active alerts"
    
    local alerts_found=false
    
    # Vérifier les alertes système
    get_system_metrics >/dev/null 2>&1
    
    # Vérifier les logs d'erreur récents
    local error_count=$(docker-compose logs --since 1h app 2>/dev/null | grep -i "error\|exception\|fatal" | wc -l || echo "0")
    if [[ $error_count -gt 10 ]]; then
        log "WARN" "⚠️ High error count in logs: $error_count errors in the last hour"
        alerts_found=true
    fi
    
    # Vérifier les alertes Prometheus si disponible
    if curl -s "$PROMETHEUS_URL" >/dev/null 2>&1; then
        local prometheus_alerts=$(curl -s "$PROMETHEUS_URL/api/v1/alerts" 2>/dev/null | jq -r '.data.alerts[] | select(.state=="firing") | .labels.alertname' 2>/dev/null || echo "")
        
        if [[ -n "$prometheus_alerts" ]]; then
            log "WARN" "⚠️ Active Prometheus alerts:"
            echo "$prometheus_alerts" | while read -r alert; do
                [[ -n "$alert" ]] && log "WARN" "  - $alert"
            done
            alerts_found=true
        fi
    fi
    
    if [[ "$alerts_found" == false ]]; then
        log "SUCCESS" "✅ No active alerts"
    fi
    
    return 0
}

# Envoi d'alertes
send_alert() {
    local message="$1"
    local level="${2:-WARNING}"
    
    log "INFO" "Sending $level alert: $message"
    
    # Slack
    if [[ -n "$SLACK_WEBHOOK" ]]; then
        local emoji="⚠️"
        [[ "$level" == "CRITICAL" ]] && emoji="🚨"
        [[ "$level" == "INFO" ]] && emoji="ℹ️"
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$emoji VidGenie [$ENVIRONMENT] - $message\"}" \
            "$SLACK_WEBHOOK" >/dev/null 2>&1 || true
    fi
    
    # Email (si configuré)
    if [[ -n "$EMAIL_ALERTS" ]]; then
        echo "$message" | mail -s "VidGenie Alert [$ENVIRONMENT]" "$EMAIL_ALERTS" 2>/dev/null || true
    fi
}

# Affichage du statut général
show_status() {
    log "INFO" "VidGenie System Status - Environment: $ENVIRONMENT"
    echo "=================================================="
    
    local overall_status="HEALTHY"
    
    if ! check_docker_services; then
        overall_status="DEGRADED"
    fi
    
    if ! check_app_health; then
        overall_status="UNHEALTHY"
    fi
    
    if ! check_database_health; then
        overall_status="UNHEALTHY"
    fi
    
    if ! check_redis_health; then
        overall_status="UNHEALTHY"
    fi
    
    echo "=================================================="
    case $overall_status in
        "HEALTHY")
            log "SUCCESS" "🎉 System Status: HEALTHY"
            ;;
        "DEGRADED")
            log "WARN" "⚠️ System Status: DEGRADED"
            send_alert "System is in degraded state" "WARNING"
            ;;
        "UNHEALTHY")
            log "ERROR" "🚨 System Status: UNHEALTHY"
            send_alert "System is unhealthy - immediate attention required" "CRITICAL"
            ;;
    esac
    echo "=================================================="
}

# Logs récents
show_recent_logs() {
    log "INFO" "Recent application logs (last 50 lines)"
    docker-compose logs --tail=50 app || true
}

# Sauvegarde des métriques
backup_metrics() {
    log "INFO" "Backing up monitoring data"
    
    local backup_dir="monitoring-backup/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    
    # Backup Prometheus data
    if docker-compose ps prometheus | grep -q "Up"; then
        docker run --rm -v vidgenie-app_prometheus_data:/data \
            -v "$(pwd)/$backup_dir:/backup" alpine \
            tar czf /backup/prometheus_data.tar.gz -C /data . || true
    fi
    
    # Backup Grafana data
    if docker-compose ps grafana | grep -q "Up"; then
        docker run --rm -v vidgenie-app_grafana_data:/data \
            -v "$(pwd)/$backup_dir:/backup" alpine \
            tar czf /backup/grafana_data.tar.gz -C /data . || true
    fi
    
    # Export current metrics
    get_system_metrics > "$backup_dir/system_metrics.txt" 2>&1
    docker stats --no-stream > "$backup_dir/docker_stats.txt" 2>&1
    
    log "SUCCESS" "Monitoring data backed up to $backup_dir"
}

# Test des alertes
test_alerts() {
    log "INFO" "Testing alert mechanisms"
    
    send_alert "This is a test alert from the monitoring system" "INFO"
    log "SUCCESS" "Test alert sent"
}

# Fonction principale
main() {
    local command=""
    local json_output=false
    local verbose=false
    
    # Parse des arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            status|health|metrics|alerts|dashboard|logs|backup-metrics|test-alerts)
                command="$1"
                shift
                ;;
            -e|--environment)
                ENVIRONMENT="$2"
                shift 2
                ;;
            -j|--json)
                json_output=true
                shift
                ;;
            -v|--verbose)
                verbose=true
                shift
                ;;
            -h|--help)
                usage
                exit 0
                ;;
            *)
                log "ERROR" "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done
    
    # Commande par défaut
    if [[ -z "$command" ]]; then
        command="status"
    fi
    
    # Exécution de la commande
    case $command in
        "status")
            show_status
            ;;
        "health")
            check_app_health && check_database_health && check_redis_health
            ;;
        "metrics")
            get_system_metrics
            get_docker_metrics
            get_prometheus_metrics
            ;;
        "alerts")
            check_alerts
            ;;
        "dashboard")
            log "INFO" "Opening Grafana dashboard"
            open "$GRAFANA_URL" 2>/dev/null || xdg-open "$GRAFANA_URL" 2>/dev/null || echo "Please open: $GRAFANA_URL"
            ;;
        "logs")
            show_recent_logs
            ;;
        "backup-metrics")
            backup_metrics
            ;;
        "test-alerts")
            test_alerts
            ;;
    esac
}

# Exécution du script
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi