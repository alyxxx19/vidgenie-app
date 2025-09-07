#!/bin/bash

# ==================================================
# Script de tests de performance VidGenie
# PHASE 5.4 - Tests de charge et performance
# ==================================================

set -e

# Configuration
TARGET_URL="${TARGET_URL:-http://localhost:3000}"
DURATION="${DURATION:-30s}"
CONCURRENT_USERS="${CONCURRENT_USERS:-10}"
RAMP_UP="${RAMP_UP:-5s}"
TEST_TYPE="${TEST_TYPE:-load}"

# Couleurs
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

usage() {
    cat << EOF
🔥 VidGenie Performance Testing Suite

Usage: $0 [OPTIONS] [TEST_TYPE]

TEST_TYPES:
    load        - Standard load testing (default)
    stress      - Stress testing with high load
    spike       - Spike testing with sudden load increases
    endurance   - Long duration testing
    api         - API endpoint specific testing

OPTIONS:
    -u, --url URL           Target URL (default: http://localhost:3000)
    -d, --duration TIME     Test duration (default: 30s)
    -c, --concurrent N      Concurrent users (default: 10)
    -r, --ramp-up TIME      Ramp up time (default: 5s)
    -o, --output FILE       Output file for results
    -h, --help              Show this help

EXAMPLES:
    $0 load -c 50 -d 2m                    # 50 users for 2 minutes
    $0 stress -c 200 -d 5m                 # Stress test
    $0 api -u http://localhost:3000/api    # API testing
    
EOF
}

# Installation des outils de test si nécessaire
check_tools() {
    log "INFO" "Checking performance testing tools"
    
    # K6 (outil de test de performance moderne)
    if ! command -v k6 &> /dev/null; then
        log "WARN" "k6 not found, installing..."
        if command -v brew &> /dev/null; then
            brew install k6
        elif command -v apt-get &> /dev/null; then
            sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
            echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
            sudo apt-get update
            sudo apt-get install k6
        else
            log "ERROR" "Please install k6 manually: https://k6.io/docs/getting-started/installation/"
            exit 1
        fi
    fi
    
    # Artillery (alternative)
    if ! command -v artillery &> /dev/null; then
        log "INFO" "Installing artillery as backup tool"
        npm install -g artillery || log "WARN" "Failed to install artillery"
    fi
    
    log "SUCCESS" "Performance tools ready"
}

# Test de base avec k6
run_load_test() {
    log "INFO" "Running load test: $CONCURRENT_USERS users for $DURATION"
    
    # Créer le script k6
    cat > /tmp/k6-load-test.js << EOF
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Métriques customisées
const errorRate = new Rate('errors');
const responseTimeApi = new Trend('response_time_api');

export const options = {
  stages: [
    { duration: '${RAMP_UP}', target: ${CONCURRENT_USERS} },
    { duration: '${DURATION}', target: ${CONCURRENT_USERS} },
    { duration: '${RAMP_UP}', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% des requêtes sous 2s
    http_req_failed: ['rate<0.1'],     // Taux d'erreur < 10%
    errors: ['rate<0.05'],             // Taux d'erreur custom < 5%
  },
};

export default function () {
  // Test de la page d'accueil
  let response = http.get('${TARGET_URL}');
  check(response, {
    'homepage status is 200': (r) => r.status === 200,
    'homepage response time < 2000ms': (r) => r.timings.duration < 2000,
  }) || errorRate.add(1);
  
  // Test de l'API health
  response = http.get('${TARGET_URL}/api/health');
  check(response, {
    'health API status is 200': (r) => r.status === 200,
    'health API response time < 500ms': (r) => r.timings.duration < 500,
  }) || errorRate.add(1);
  
  responseTimeApi.add(response.timings.duration);
  
  // Test de l'API auth providers
  response = http.get('${TARGET_URL}/api/auth/providers');
  check(response, {
    'auth API status is 200': (r) => r.status === 200,
  }) || errorRate.add(1);
  
  // Simulation d'usage réaliste
  sleep(Math.random() * 3 + 1); // 1-4 secondes entre les requêtes
}

export function handleSummary(data) {
  return {
    '/tmp/k6-summary.json': JSON.stringify(data, null, 2),
    '/tmp/k6-summary.html': htmlReport(data),
  };
}

function htmlReport(data) {
  const pass = data.metrics.http_req_failed.values.rate < 0.1;
  return \`<!DOCTYPE html>
<html>
<head><title>VidGenie Load Test Results</title></head>
<body>
  <h1>VidGenie Performance Test Results</h1>
  <h2>Summary</h2>
  <p><strong>Status:</strong> \${pass ? '✅ PASS' : '❌ FAIL'}</p>
  <p><strong>Total Requests:</strong> \${data.metrics.http_reqs.values.count}</p>
  <p><strong>Failed Requests:</strong> \${data.metrics.http_req_failed.values.rate * 100}%</p>
  <p><strong>Average Response Time:</strong> \${Math.round(data.metrics.http_req_duration.values.avg)}ms</p>
  <p><strong>95th Percentile:</strong> \${Math.round(data.metrics.http_req_duration.values['p(95)'])}ms</p>
  <p><strong>RPS:</strong> \${Math.round(data.metrics.http_reqs.values.rate)}</p>
</body>
</html>\`;
}
EOF
    
    # Exécuter le test k6
    if k6 run /tmp/k6-load-test.js; then
        log "SUCCESS" "Load test completed"
        
        # Afficher les résultats
        if [[ -f "/tmp/k6-summary.json" ]]; then
            local total_requests=$(jq -r '.metrics.http_reqs.values.count' /tmp/k6-summary.json)
            local error_rate=$(jq -r '.metrics.http_req_failed.values.rate' /tmp/k6-summary.json)
            local avg_response=$(jq -r '.metrics.http_req_duration.values.avg' /tmp/k6-summary.json)
            local p95_response=$(jq -r '.metrics.http_req_duration.values["p(95)"]' /tmp/k6-summary.json)
            local rps=$(jq -r '.metrics.http_reqs.values.rate' /tmp/k6-summary.json)
            
            echo ""
            log "INFO" "📊 Test Results:"
            echo "   • Total Requests: $total_requests"
            echo "   • Error Rate: $(echo "$error_rate * 100" | bc)%"
            echo "   • Avg Response Time: ${avg_response%.*}ms"
            echo "   • 95th Percentile: ${p95_response%.*}ms"
            echo "   • Requests/sec: ${rps%.*}"
            echo ""
        fi
        
        return 0
    else
        log "ERROR" "Load test failed"
        return 1
    fi
}

# Test de stress
run_stress_test() {
    log "INFO" "Running stress test: ramping up to high load"
    
    cat > /tmp/k6-stress-test.js << EOF
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up
    { duration: '5m', target: 100 },  // Normal load
    { duration: '2m', target: 200 },  // Stress load
    { duration: '3m', target: 200 },  // Maintain stress
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(99)<5000'], // Plus permissif en stress
    http_req_failed: ['rate<0.2'],      // 20% d'erreur acceptable
  },
};

export default function () {
  const responses = http.batch([
    ['GET', '${TARGET_URL}'],
    ['GET', '${TARGET_URL}/api/health'],
    ['GET', '${TARGET_URL}/dashboard'],
  ]);
  
  responses.forEach((response, i) => {
    check(response, {
      [\`request \${i} status is 200\`]: (r) => r.status === 200,
    });
  });
  
  sleep(0.5); // Plus agressif
}
EOF
    
    k6 run /tmp/k6-stress-test.js
}

# Test de spike
run_spike_test() {
    log "INFO" "Running spike test: sudden load increases"
    
    cat > /tmp/k6-spike-test.js << EOF
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 10 },   // Baseline
    { duration: '10s', target: 100 }, // Spike!
    { duration: '1m', target: 10 },   // Back to baseline
    { duration: '10s', target: 150 }, // Bigger spike!
    { duration: '1m', target: 10 },   // Recovery
  ],
};

export default function () {
  const response = http.get('${TARGET_URL}');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 10s': (r) => r.timings.duration < 10000, // Plus permissif
  });
}
EOF
    
    k6 run /tmp/k6-spike-test.js
}

# Test d'endurance
run_endurance_test() {
    log "INFO" "Running endurance test: long duration with moderate load"
    
    cat > /tmp/k6-endurance-test.js << EOF
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 20 },   // Ramp up
    { duration: '30m', target: 20 },  // Maintain load for 30 minutes
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    http_req_failed: ['rate<0.05'],
  },
};

export default function () {
  http.get('${TARGET_URL}');
  http.get('${TARGET_URL}/api/health');
  
  // Simulate real user behavior
  sleep(Math.random() * 5 + 2);
}
EOF
    
    k6 run /tmp/k6-endurance-test.js
}

# Test API spécifique
run_api_test() {
    log "INFO" "Running API performance test"
    
    cat > /tmp/k6-api-test.js << EOF
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 50 },
    { duration: '3m', target: 50 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    'http_req_duration{endpoint:health}': ['p(95)<200'],
    'http_req_duration{endpoint:auth}': ['p(95)<500'],
  },
};

export default function () {
  // Test health endpoint
  let response = http.get('${TARGET_URL}/api/health', {
    tags: { endpoint: 'health' }
  });
  check(response, {
    'health API OK': (r) => r.status === 200,
  });
  
  // Test auth providers
  response = http.get('${TARGET_URL}/api/auth/providers', {
    tags: { endpoint: 'auth' }
  });
  check(response, {
    'auth API OK': (r) => r.status === 200,
  });
  
  // Test with authentication (mock)
  const headers = { 'Authorization': 'Bearer fake-token' };
  response = http.get('${TARGET_URL}/api/user/profile', { 
    headers,
    tags: { endpoint: 'profile' }
  });
  // Expect 401 or 403 without real auth
  check(response, {
    'profile API responds': (r) => r.status === 401 || r.status === 403 || r.status === 200,
  });
}
EOF
    
    k6 run /tmp/k6-api-test.js
}

# Analyse des résultats
analyze_results() {
    log "INFO" "Analyzing performance test results"
    
    if [[ -f "/tmp/k6-summary.json" ]]; then
        local summary_file="/tmp/k6-summary.json"
        
        # Extraire les métriques clés
        local total_requests=$(jq -r '.metrics.http_reqs.values.count' "$summary_file")
        local error_rate=$(jq -r '.metrics.http_req_failed.values.rate' "$summary_file")
        local avg_response=$(jq -r '.metrics.http_req_duration.values.avg' "$summary_file")
        local p95_response=$(jq -r '.metrics.http_req_duration.values["p(95)"]' "$summary_file")
        local max_response=$(jq -r '.metrics.http_req_duration.values.max' "$summary_file")
        local rps=$(jq -r '.metrics.http_reqs.values.rate' "$summary_file")
        
        # Déterminer le statut global
        local status="PASS"
        local issues=()
        
        # Vérifier les seuils
        if (( $(echo "$error_rate > 0.1" | bc -l) )); then
            status="FAIL"
            issues+=("High error rate: $(echo "$error_rate * 100" | bc)%")
        fi
        
        if (( $(echo "$p95_response > 2000" | bc -l) )); then
            status="WARN"
            issues+=("Slow 95th percentile: ${p95_response%.*}ms")
        fi
        
        if (( $(echo "$avg_response > 1000" | bc -l) )); then
            status="WARN"
            issues+=("Slow average response: ${avg_response%.*}ms")
        fi
        
        # Affichage du rapport
        echo ""
        echo "=================================================="
        echo "📊 PERFORMANCE TEST REPORT"
        echo "=================================================="
        echo "Target URL: $TARGET_URL"
        echo "Test Type: $TEST_TYPE"
        echo "Duration: $DURATION"
        echo "Concurrent Users: $CONCURRENT_USERS"
        echo ""
        
        case $status in
            "PASS")  echo -e "${GREEN}✅ OVERALL STATUS: PASS${NC}" ;;
            "WARN")  echo -e "${YELLOW}⚠️ OVERALL STATUS: WARNING${NC}" ;;
            "FAIL")  echo -e "${RED}❌ OVERALL STATUS: FAIL${NC}" ;;
        esac
        
        echo ""
        echo "📈 METRICS:"
        echo "   • Total Requests: $total_requests"
        echo "   • Requests/sec: ${rps%.*}"
        echo "   • Error Rate: $(echo "$error_rate * 100" | bc -l)%"
        echo "   • Avg Response Time: ${avg_response%.*}ms"
        echo "   • 95th Percentile: ${p95_response%.*}ms"
        echo "   • Max Response Time: ${max_response%.*}ms"
        
        if [[ ${#issues[@]} -gt 0 ]]; then
            echo ""
            echo "⚠️ ISSUES FOUND:"
            for issue in "${issues[@]}"; do
                echo "   • $issue"
            done
        fi
        
        echo ""
        echo "📄 Detailed report: /tmp/k6-summary.html"
        echo "=================================================="
        
        # Copier les résultats si demandé
        if [[ -n "$OUTPUT_FILE" ]]; then
            cp "$summary_file" "$OUTPUT_FILE"
            log "SUCCESS" "Results saved to $OUTPUT_FILE"
        fi
        
        return $([ "$status" == "FAIL" ] && echo 1 || echo 0)
    else
        log "ERROR" "No test results found"
        return 1
    fi
}

# Nettoyage
cleanup() {
    rm -f /tmp/k6-*.js /tmp/k6-summary.* 2>/dev/null || true
}

# Fonction principale
main() {
    local output_file=""
    
    # Parse des arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            load|stress|spike|endurance|api)
                TEST_TYPE="$1"
                shift
                ;;
            -u|--url)
                TARGET_URL="$2"
                shift 2
                ;;
            -d|--duration)
                DURATION="$2"
                shift 2
                ;;
            -c|--concurrent)
                CONCURRENT_USERS="$2"
                shift 2
                ;;
            -r|--ramp-up)
                RAMP_UP="$2"
                shift 2
                ;;
            -o|--output)
                OUTPUT_FILE="$2"
                shift 2
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
    
    trap cleanup EXIT
    
    log "INFO" "Starting VidGenie performance test"
    log "INFO" "Test type: $TEST_TYPE"
    log "INFO" "Target: $TARGET_URL"
    
    check_tools
    
    # Exécuter le test selon le type
    case $TEST_TYPE in
        "load")     run_load_test ;;
        "stress")   run_stress_test ;;
        "spike")    run_spike_test ;;
        "endurance") run_endurance_test ;;
        "api")      run_api_test ;;
        *)
            log "ERROR" "Unknown test type: $TEST_TYPE"
            exit 1
            ;;
    esac
    
    analyze_results
}

# Exécution du script
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi