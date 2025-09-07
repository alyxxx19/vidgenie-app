#!/bin/bash

# ==================================================
# Script de configuration du monitoring VidGenie
# PHASE 5.4 - Setup Prometheus, Grafana et alertes
# ==================================================

set -e

# Configuration
ENVIRONMENT="${1:-production}"
GRAFANA_ADMIN_PASSWORD="${GRAFANA_ADMIN_PASSWORD:-admin123}"

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Création des répertoires de configuration
setup_directories() {
    log "INFO" "Creating monitoring configuration directories"
    
    mkdir -p config/grafana/{dashboards,datasources,plugins}
    mkdir -p config/prometheus/rules
    mkdir -p config/alertmanager
    
    log "SUCCESS" "Directories created"
}

# Configuration des datasources Grafana
setup_grafana_datasources() {
    log "INFO" "Setting up Grafana datasources"
    
    cat > config/grafana/datasources/prometheus.yml << 'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
    jsonData:
      timeInterval: "30s"
EOF

    log "SUCCESS" "Grafana datasources configured"
}

# Dashboards Grafana
setup_grafana_dashboards() {
    log "INFO" "Setting up Grafana dashboards"
    
    # Configuration des dashboards
    cat > config/grafana/dashboards/dashboard.yml << 'EOF'
apiVersion: 1

providers:
  - name: 'VidGenie Dashboards'
    orgId: 1
    folder: 'VidGenie'
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /etc/grafana/provisioning/dashboards
EOF

    # Dashboard principal VidGenie
    cat > config/grafana/dashboards/vidgenie-overview.json << 'EOF'
{
  "dashboard": {
    "id": null,
    "title": "VidGenie - System Overview",
    "tags": ["vidgenie", "overview"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Application Health",
        "type": "stat",
        "targets": [
          {
            "expr": "up{job=\"vidgenie-app\"}",
            "legendFormat": "App Status"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "color": {
              "mode": "thresholds"
            },
            "thresholds": {
              "steps": [
                {"color": "red", "value": 0},
                {"color": "green", "value": 1}
              ]
            }
          }
        },
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0}
      },
      {
        "id": 2,
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m]) * 1000",
            "legendFormat": "Avg Response Time (ms)"
          }
        ],
        "yAxes": [
          {"unit": "ms"},
          {"show": false}
        ],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0}
      },
      {
        "id": 3,
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "Requests/sec"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 8}
      },
      {
        "id": 4,
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"4.*|5.*\"}[5m]) / rate(http_requests_total[5m]) * 100",
            "legendFormat": "Error Rate %"
          }
        ],
        "yAxes": [
          {"unit": "percent", "max": 100},
          {"show": false}
        ],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 8}
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "30s"
  }
}
EOF

    # Dashboard des métriques système
    cat > config/grafana/dashboards/system-metrics.json << 'EOF'
{
  "dashboard": {
    "id": null,
    "title": "VidGenie - System Metrics",
    "tags": ["vidgenie", "system"],
    "panels": [
      {
        "id": 1,
        "title": "CPU Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "100 - (avg by (instance) (rate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)",
            "legendFormat": "CPU Usage %"
          }
        ],
        "yAxes": [
          {"unit": "percent", "max": 100},
          {"show": false}
        ],
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0}
      },
      {
        "id": 2,
        "title": "Memory Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100",
            "legendFormat": "Memory Usage %"
          }
        ],
        "yAxes": [
          {"unit": "percent", "max": 100},
          {"show": false}
        ],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0}
      }
    ]
  }
}
EOF

    log "SUCCESS" "Grafana dashboards configured"
}

# Règles d'alerte Prometheus
setup_prometheus_alerts() {
    log "INFO" "Setting up Prometheus alert rules"
    
    cat > config/prometheus/rules/vidgenie-alerts.yml << 'EOF'
groups:
  - name: vidgenie.alerts
    rules:
      # Application down
      - alert: VidGenieAppDown
        expr: up{job="vidgenie-app"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "VidGenie application is down"
          description: "The VidGenie application has been down for more than 1 minute."

      # High response time
      - alert: VidGenieHighResponseTime
        expr: rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m]) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "VidGenie high response time"
          description: "Response time is {{ $value }}s for more than 5 minutes."

      # High error rate
      - alert: VidGenieHighErrorRate
        expr: rate(http_requests_total{status=~"4.*|5.*"}[5m]) / rate(http_requests_total[5m]) * 100 > 5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "VidGenie high error rate"
          description: "Error rate is {{ $value }}% for more than 5 minutes."

      # Database down
      - alert: VidGenieDatabaseDown
        expr: up{job="postgres"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "VidGenie database is down"
          description: "PostgreSQL database has been down for more than 2 minutes."

      # Redis down
      - alert: VidGenieRedisDown
        expr: up{job="redis"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "VidGenie Redis is down"
          description: "Redis cache has been down for more than 2 minutes."

      # High CPU usage
      - alert: VidGenieHighCPU
        expr: 100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "VidGenie high CPU usage"
          description: "CPU usage is {{ $value }}% for more than 10 minutes."

      # High memory usage
      - alert: VidGenieHighMemory
        expr: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > 85
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "VidGenie high memory usage"
          description: "Memory usage is {{ $value }}% for more than 10 minutes."

      # High disk usage
      - alert: VidGenieHighDisk
        expr: (node_filesystem_size_bytes - node_filesystem_free_bytes) / node_filesystem_size_bytes * 100 > 90
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "VidGenie high disk usage"
          description: "Disk usage is {{ $value }}% on {{ $labels.mountpoint }}."
EOF

    log "SUCCESS" "Prometheus alert rules configured"
}

# Configuration Alertmanager
setup_alertmanager() {
    log "INFO" "Setting up Alertmanager configuration"
    
    cat > config/alertmanager/alertmanager.yml << 'EOF'
global:
  smtp_smarthost: 'localhost:587'
  smtp_from: 'alerts@vidgenie.com'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'web.hook'
  routes:
    - match:
        severity: critical
      receiver: critical-alerts
    - match:
        severity: warning
      receiver: warning-alerts

receivers:
  - name: 'web.hook'
    webhook_configs:
      - url: 'http://127.0.0.1:5001/'

  - name: 'critical-alerts'
    slack_configs:
      - api_url: '${SLACK_WEBHOOK_URL}'
        channel: '#alerts'
        title: '🚨 CRITICAL: {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
        send_resolved: true

  - name: 'warning-alerts'
    slack_configs:
      - api_url: '${SLACK_WEBHOOK_URL}'
        channel: '#monitoring'
        title: '⚠️ WARNING: {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
        send_resolved: true

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'dev', 'instance']
EOF

    log "SUCCESS" "Alertmanager configured"
}

# Mise à jour de la configuration Prometheus
update_prometheus_config() {
    log "INFO" "Updating Prometheus configuration with alert rules"
    
    # Backup de la config existante
    if [[ -f "config/prometheus.yml" ]]; then
        cp config/prometheus.yml config/prometheus.yml.backup
    fi
    
    cat > config/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'vidgenie-prod'
    replica: 'prometheus-1'

rule_files:
  - "rules/*.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'vidgenie-app'
    static_configs:
      - targets: ['app:3000']
    metrics_path: '/api/metrics'
    scrape_interval: 30s

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']
    scrape_interval: 30s

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']
EOF

    log "SUCCESS" "Prometheus configuration updated"
}

# Setup des exporteurs additionnels
setup_exporters() {
    log "INFO" "Adding monitoring exporters to docker-compose"
    
    # Ajouter les exporteurs au docker-compose.prod.yml s'ils n'existent pas
    if ! grep -q "postgres-exporter" docker-compose.prod.yml; then
        cat >> docker-compose.prod.yml << 'EOF'

  # PostgreSQL Exporter
  postgres-exporter:
    image: prometheuscommunity/postgres-exporter:latest
    container_name: vidgenie-postgres-exporter
    restart: unless-stopped
    environment:
      DATA_SOURCE_NAME: "${DATABASE_URL}"
    networks:
      - vidgenie-prod
    depends_on:
      - postgres

  # Redis Exporter
  redis-exporter:
    image: oliver006/redis_exporter:latest
    container_name: vidgenie-redis-exporter
    restart: unless-stopped
    environment:
      REDIS_ADDR: "redis:6379"
    networks:
      - vidgenie-prod
    depends_on:
      - redis

  # Alertmanager
  alertmanager:
    image: prom/alertmanager:latest
    container_name: vidgenie-alertmanager
    restart: unless-stopped
    ports:
      - "9093:9093"
    volumes:
      - ./config/alertmanager:/etc/alertmanager
      - alertmanager_data:/alertmanager
    networks:
      - vidgenie-prod
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
      - '--storage.path=/alertmanager'
      - '--web.external-url=http://localhost:9093'

volumes:
  alertmanager_data:
    driver: local
EOF
        
        log "SUCCESS" "Monitoring exporters added to docker-compose"
    fi
}

# Configuration des métriques de l'application
setup_app_metrics() {
    log "INFO" "Setting up application metrics endpoint"
    
    # Créer l'endpoint de métriques pour Next.js
    mkdir -p src/pages/api
    
    cat > src/pages/api/metrics.ts << 'EOF'
/**
 * Endpoint de métriques Prometheus pour monitoring
 * PHASE 5.4 - Application monitoring
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { performance } from 'perf_hooks';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Métriques simples en mémoire (pour démo)
const metrics = {
  requests_total: 0,
  request_duration_seconds: [],
  active_connections: 0,
  last_request_time: Date.now(),
};

// Middleware pour collecter les métriques
export const collectMetrics = (req: NextApiRequest) => {
  metrics.requests_total += 1;
  metrics.last_request_time = Date.now();
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const startTime = performance.now();
    
    // Métriques de base de données
    const dbMetrics = await Promise.all([
      prisma.user.count(),
      prisma.asset.count(),
      prisma.job.count({ where: { status: 'pending' } }),
    ]);

    const endTime = performance.now();
    const queryDuration = (endTime - startTime) / 1000;

    // Format Prometheus
    const prometheusMetrics = `
# HELP vidgenie_requests_total Total number of requests
# TYPE vidgenie_requests_total counter
vidgenie_requests_total ${metrics.requests_total}

# HELP vidgenie_users_total Total number of users
# TYPE vidgenie_users_total gauge
vidgenie_users_total ${dbMetrics[0]}

# HELP vidgenie_assets_total Total number of assets
# TYPE vidgenie_assets_total gauge
vidgenie_assets_total ${dbMetrics[1]}

# HELP vidgenie_pending_jobs Total number of pending jobs
# TYPE vidgenie_pending_jobs gauge
vidgenie_pending_jobs ${dbMetrics[2]}

# HELP vidgenie_db_query_duration_seconds Database query duration
# TYPE vidgenie_db_query_duration_seconds gauge
vidgenie_db_query_duration_seconds ${queryDuration}

# HELP vidgenie_last_request_timestamp Last request timestamp
# TYPE vidgenie_last_request_timestamp gauge
vidgenie_last_request_timestamp ${metrics.last_request_time}

# HELP vidgenie_app_info Application information
# TYPE vidgenie_app_info gauge
vidgenie_app_info{version="${process.env.npm_package_version || 'unknown'}",environment="${process.env.NODE_ENV || 'unknown'}"} 1
`.trim();

    res.setHeader('Content-Type', 'text/plain');
    res.status(200).send(prometheusMetrics);
    
  } catch (error) {
    console.error('Metrics collection error:', error);
    res.status(500).json({ error: 'Failed to collect metrics' });
  }
}
EOF

    # Créer l'endpoint de santé s'il n'existe pas
    if [[ ! -f "src/pages/api/health.ts" ]]; then
        cat > src/pages/api/health.ts << 'EOF'
/**
 * Endpoint de health check pour monitoring
 * PHASE 5.4 - Application health monitoring
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const startTime = Date.now();
    
    // Test de connexion à la base de données
    await prisma.$queryRaw`SELECT 1`;
    
    const dbResponseTime = Date.now() - startTime;
    
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: {
          status: 'healthy',
          responseTime: dbResponseTime
        },
        memory: {
          usage: process.memoryUsage(),
          status: 'healthy'
        },
        uptime: process.uptime()
      }
    };
    
    res.status(200).json(healthStatus);
    
  } catch (error) {
    console.error('Health check error:', error);
    
    const errorStatus = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      checks: {
        database: {
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Connection failed'
        }
      }
    };
    
    res.status(503).json(errorStatus);
  }
}
EOF
    fi
    
    log "SUCCESS" "Application metrics endpoints created"
}

# Test du monitoring
test_monitoring_setup() {
    log "INFO" "Testing monitoring setup"
    
    # Vérifier que les services de monitoring démarrent
    if docker-compose -f docker-compose.prod.yml up -d prometheus grafana; then
        log "SUCCESS" "Monitoring services started"
        
        # Attendre que les services soient prêts
        sleep 20
        
        # Test Prometheus
        if curl -s http://localhost:9090/-/healthy >/dev/null; then
            log "SUCCESS" "✅ Prometheus is healthy"
        else
            log "WARN" "⚠️ Prometheus health check failed"
        fi
        
        # Test Grafana
        if curl -s http://localhost:3001/api/health >/dev/null; then
            log "SUCCESS" "✅ Grafana is healthy"
        else
            log "WARN" "⚠️ Grafana health check failed"
        fi
        
    else
        log "ERROR" "Failed to start monitoring services"
        return 1
    fi
}

# Fonction principale
main() {
    log "INFO" "Setting up VidGenie monitoring stack for environment: $ENVIRONMENT"
    
    setup_directories
    setup_grafana_datasources
    setup_grafana_dashboards
    setup_prometheus_alerts
    setup_alertmanager
    update_prometheus_config
    setup_exporters
    setup_app_metrics
    
    log "SUCCESS" "Monitoring setup completed!"
    
    echo ""
    echo "📊 Monitoring Stack Configured:"
    echo "   • Prometheus:     http://localhost:9090"
    echo "   • Grafana:        http://localhost:3001 (admin/admin123)"
    echo "   • Alertmanager:   http://localhost:9093"
    echo ""
    echo "🚀 Next steps:"
    echo "   1. Start monitoring: docker-compose -f docker-compose.prod.yml up -d"
    echo "   2. Test setup: ./scripts/monitoring.sh status"
    echo "   3. Configure Slack webhook: export SLACK_WEBHOOK_URL='...'"
    echo "   4. Import additional dashboards in Grafana"
    echo ""
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        test_monitoring_setup
    fi
}

# Exécution du script
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi