#!/usr/bin/env node

/**
 * Script de vérification de santé pour Docker
 * PHASE 5.1 - Docker healthcheck
 */

const http = require('http');
const process = require('process');

const HEALTH_CHECK_PORT = process.env.PORT || 3000;
const HEALTH_CHECK_HOST = process.env.HOSTNAME || 'localhost';
const HEALTH_CHECK_PATH = '/api/health';
const TIMEOUT = 10000; // 10 secondes

/**
 * Effectue la vérification de santé
 */
function performHealthCheck() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: HEALTH_CHECK_HOST,
      port: HEALTH_CHECK_PORT,
      path: HEALTH_CHECK_PATH,
      method: 'GET',
      timeout: TIMEOUT,
      headers: {
        'User-Agent': 'Docker-HealthCheck/1.0',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const healthData = JSON.parse(data);
            if (healthData.status === 'healthy' || healthData.status === 'ok') {
              resolve({
                status: 'healthy',
                statusCode: res.statusCode,
                response: healthData,
              });
            } else {
              reject(new Error(`Health check failed: ${healthData.status || 'unknown'}`));
            }
          } catch (parseError) {
            // Si ce n'est pas du JSON mais status 200, considérer comme sain
            resolve({
              status: 'healthy',
              statusCode: res.statusCode,
              response: data,
            });
          }
        } else {
          reject(new Error(`Health check returned status ${res.statusCode}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(new Error(`Health check request failed: ${err.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Health check timed out after ${TIMEOUT}ms`));
    });

    req.end();
  });
}

/**
 * Fonction principale
 */
async function main() {
  try {
    console.log(`Performing health check on http://${HEALTH_CHECK_HOST}:${HEALTH_CHECK_PORT}${HEALTH_CHECK_PATH}`);
    
    const result = await performHealthCheck();
    
    console.log('✅ Health check passed:', {
      status: result.status,
      statusCode: result.statusCode,
      timestamp: new Date().toISOString(),
    });
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Health check failed:', {
      error: error.message,
      timestamp: new Date().toISOString(),
      host: HEALTH_CHECK_HOST,
      port: HEALTH_CHECK_PORT,
      path: HEALTH_CHECK_PATH,
    });
    
    process.exit(1);
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  main();
}

module.exports = { performHealthCheck };