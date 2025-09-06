#!/usr/bin/env npx tsx

/**
 * Checklist de déploiement production - VidGenie V2
 * Phase 5 - Production Deployment du PRD V2
 * 
 * Ce script valide tous les critères avant le déploiement en production
 * et génère un rapport de conformité détaillé
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface ChecklistItem {
  id: string;
  category: string;
  title: string;
  description: string;
  status: 'pending' | 'passed' | 'failed' | 'manual';
  automated: boolean;
  priority: 'critical' | 'high' | 'medium' | 'low';
  details?: string;
  evidence?: string;
  recommendation?: string;
}

interface DeploymentReport {
  timestamp: string;
  environment: 'production';
  version: string;
  checklist: ChecklistItem[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    pending: number;
    manual: number;
    readyForDeployment: boolean;
    criticalIssues: number;
  };
  deploymentDecision: 'approved' | 'blocked' | 'manual_review';
  nextSteps: string[];
}

class ProductionDeploymentChecklist {
  private checklist: ChecklistItem[] = [];
  private projectRoot: string;

  constructor() {
    this.projectRoot = process.cwd();
    this.initializeChecklist();
  }

  async runChecklist(): Promise<DeploymentReport> {
    console.log('🚀 Production Deployment Checklist - VidGenie V2');
    console.log('================================================\\n');

    // Run all automated checks
    await this.runAutomatedChecks();

    // Generate report
    const report = this.generateReport();

    // Save report
    await this.saveReport(report);

    // Print summary
    this.printSummary(report);

    return report;
  }

  private initializeChecklist(): void {
    this.checklist = [
      // =================================================================
      // SECURITY & COMPLIANCE
      // =================================================================
      {
        id: 'SEC001',
        category: 'Security',
        title: 'Security Audit Completed',
        description: 'Complete security audit has been performed and passed',
        status: 'pending',
        automated: true,
        priority: 'critical'
      },
      {
        id: 'SEC002',
        category: 'Security',
        title: 'API Key Encryption',
        description: 'All API keys are encrypted with AES-256-GCM',
        status: 'pending',
        automated: true,
        priority: 'critical'
      },
      {
        id: 'SEC003',
        category: 'Security',
        title: 'Environment Variables',
        description: 'No secrets in environment variables or code',
        status: 'pending',
        automated: true,
        priority: 'critical'
      },
      {
        id: 'SEC004',
        category: 'Security',
        title: 'HTTPS Configuration',
        description: 'All endpoints use HTTPS with valid SSL certificates',
        status: 'pending',
        automated: false,
        priority: 'critical'
      },

      // =================================================================
      // TESTING & QUALITY ASSURANCE
      // =================================================================
      {
        id: 'TEST001',
        category: 'Testing',
        title: 'Unit Tests Passing',
        description: 'All unit tests pass with >90% coverage',
        status: 'pending',
        automated: true,
        priority: 'critical'
      },
      {
        id: 'TEST002',
        category: 'Testing',
        title: 'Integration Tests Passing',
        description: 'All integration tests pass successfully',
        status: 'pending',
        automated: true,
        priority: 'critical'
      },
      {
        id: 'TEST003',
        category: 'Testing',
        title: 'E2E Tests Passing',
        description: 'End-to-end workflow tests pass completely',
        status: 'pending',
        automated: true,
        priority: 'critical'
      },
      {
        id: 'TEST004',
        category: 'Testing',
        title: 'Load Testing Completed',
        description: 'System handles expected production load',
        status: 'pending',
        automated: true,
        priority: 'high'
      },
      {
        id: 'TEST005',
        category: 'Testing',
        title: 'UAT Approval',
        description: 'User Acceptance Testing completed and approved',
        status: 'pending',
        automated: false,
        priority: 'critical'
      },

      // =================================================================
      // DATABASE & MIGRATIONS
      // =================================================================
      {
        id: 'DB001',
        category: 'Database',
        title: 'Migration Scripts Ready',
        description: 'All database migration scripts are tested and ready',
        status: 'pending',
        automated: true,
        priority: 'critical'
      },
      {
        id: 'DB002',
        category: 'Database',
        title: 'Backup Strategy',
        description: 'Automated backup strategy is configured and tested',
        status: 'pending',
        automated: false,
        priority: 'critical'
      },
      {
        id: 'DB003',
        category: 'Database',
        title: 'Rollback Plan',
        description: 'Database rollback procedures are documented and tested',
        status: 'pending',
        automated: false,
        priority: 'high'
      },

      // =================================================================
      // INFRASTRUCTURE & DEPLOYMENT
      // =================================================================
      {
        id: 'INFRA001',
        category: 'Infrastructure',
        title: 'Production Environment Ready',
        description: 'Production infrastructure is provisioned and configured',
        status: 'pending',
        automated: false,
        priority: 'critical'
      },
      {
        id: 'INFRA002',
        category: 'Infrastructure',
        title: 'CDN Configuration',
        description: 'CDN is configured for optimal asset delivery',
        status: 'pending',
        automated: false,
        priority: 'high'
      },
      {
        id: 'INFRA003',
        category: 'Infrastructure',
        title: 'Load Balancer Setup',
        description: 'Load balancing is configured for high availability',
        status: 'pending',
        automated: false,
        priority: 'high'
      },

      // =================================================================
      // MONITORING & OBSERVABILITY
      // =================================================================
      {
        id: 'MON001',
        category: 'Monitoring',
        title: 'Error Tracking Setup',
        description: 'Sentry or similar error tracking is configured',
        status: 'pending',
        automated: true,
        priority: 'critical'
      },
      {
        id: 'MON002',
        category: 'Monitoring',
        title: 'Performance Monitoring',
        description: 'Application performance monitoring is active',
        status: 'pending',
        automated: false,
        priority: 'high'
      },
      {
        id: 'MON003',
        category: 'Monitoring',
        title: 'Health Check Endpoints',
        description: 'Health check endpoints are implemented and tested',
        status: 'pending',
        automated: true,
        priority: 'critical'
      },
      {
        id: 'MON004',
        category: 'Monitoring',
        title: 'Alerting Configuration',
        description: 'Critical alerts are configured for key metrics',
        status: 'pending',
        automated: false,
        priority: 'high'
      },

      // =================================================================
      // API & EXTERNAL SERVICES
      // =================================================================
      {
        id: 'API001',
        category: 'APIs',
        title: 'External API Keys Valid',
        description: 'All external API keys are valid and have sufficient quotas',
        status: 'pending',
        automated: true,
        priority: 'critical'
      },
      {
        id: 'API002',
        category: 'APIs',
        title: 'Rate Limiting Configured',
        description: 'API rate limiting is properly configured',
        status: 'pending',
        automated: true,
        priority: 'high'
      },
      {
        id: 'API003',
        category: 'APIs',
        title: 'Error Handling Robust',
        description: 'All API endpoints have proper error handling',
        status: 'pending',
        automated: true,
        priority: 'high'
      },

      // =================================================================
      // COMPLIANCE & DOCUMENTATION
      // =================================================================
      {
        id: 'DOC001',
        category: 'Documentation',
        title: 'Deployment Guide Updated',
        description: 'Deployment documentation is current and complete',
        status: 'pending',
        automated: false,
        priority: 'high'
      },
      {
        id: 'DOC002',
        category: 'Documentation',
        title: 'Runbook Available',
        description: 'Operations runbook is complete and accessible',
        status: 'pending',
        automated: false,
        priority: 'high'
      },
      {
        id: 'DOC003',
        category: 'Documentation',
        title: 'Privacy Policy Updated',
        description: 'Privacy policy reflects current data handling',
        status: 'pending',
        automated: false,
        priority: 'medium'
      },

      // =================================================================
      // BUSINESS CONTINUITY
      // =================================================================
      {
        id: 'BC001',
        category: 'Business Continuity',
        title: 'Disaster Recovery Plan',
        description: 'Disaster recovery procedures are documented and tested',
        status: 'pending',
        automated: false,
        priority: 'high'
      },
      {
        id: 'BC002',
        category: 'Business Continuity',
        title: 'Support Team Ready',
        description: 'Support team is trained and ready for launch',
        status: 'pending',
        automated: false,
        priority: 'medium'
      }
    ];
  }

  private async runAutomatedChecks(): Promise<void> {
    console.log('🔄 Running automated checks...');

    for (const item of this.checklist.filter(i => i.automated)) {
      console.log(`   Checking: ${item.title}...`);
      
      try {
        await this.runSpecificCheck(item);
      } catch (error) {
        item.status = 'failed';
        item.details = `Check failed: ${error}`;
      }
    }

    console.log('✅ Automated checks completed\\n');
  }

  private async runSpecificCheck(item: ChecklistItem): Promise<void> {
    switch (item.id) {
      case 'SEC001':
        await this.checkSecurityAudit(item);
        break;
      case 'SEC002':
        await this.checkApiKeyEncryption(item);
        break;
      case 'SEC003':
        await this.checkEnvironmentSecrets(item);
        break;
      case 'TEST001':
        await this.checkUnitTests(item);
        break;
      case 'TEST002':
        await this.checkIntegrationTests(item);
        break;
      case 'TEST003':
        await this.checkE2ETests(item);
        break;
      case 'TEST004':
        await this.checkLoadTesting(item);
        break;
      case 'DB001':
        await this.checkMigrations(item);
        break;
      case 'MON001':
        await this.checkErrorTracking(item);
        break;
      case 'MON003':
        await this.checkHealthEndpoints(item);
        break;
      case 'API001':
        await this.checkExternalApiKeys(item);
        break;
      case 'API002':
        await this.checkRateLimiting(item);
        break;
      case 'API003':
        await this.checkApiErrorHandling(item);
        break;
      default:
        item.status = 'manual';
    }
  }

  private async checkSecurityAudit(item: ChecklistItem): Promise<void> {
    const auditReportPath = path.join(this.projectRoot, 'security-audit-report.json');
    
    if (fs.existsSync(auditReportPath)) {
      const report = JSON.parse(fs.readFileSync(auditReportPath, 'utf8'));
      
      if (report.summary && report.summary.overallScore >= 80 && report.summary.criticalIssues === 0) {
        item.status = 'passed';
        item.details = `Security audit passed with score ${report.summary.overallScore}/100`;
        item.evidence = auditReportPath;
      } else {
        item.status = 'failed';
        item.details = `Security audit failed: score ${report.summary.overallScore}/100, critical issues: ${report.summary.criticalIssues}`;
        item.recommendation = 'Run security audit script and fix all critical issues';
      }
    } else {
      item.status = 'failed';
      item.details = 'Security audit report not found';
      item.recommendation = 'Run: npx tsx scripts/security-audit.ts';
    }
  }

  private async checkApiKeyEncryption(item: ChecklistItem): Promise<void> {
    const encryptionServicePath = path.join(this.projectRoot, 'src/services/encryption.ts');
    
    if (fs.existsSync(encryptionServicePath)) {
      const content = fs.readFileSync(encryptionServicePath, 'utf8');
      
      if (content.includes('aes-256-gcm') && content.includes('generateIV')) {
        item.status = 'passed';
        item.details = 'AES-256-GCM encryption service is implemented';
      } else {
        item.status = 'failed';
        item.details = 'Encryption service missing or incomplete';
      }
    } else {
      item.status = 'failed';
      item.details = 'Encryption service not found';
      item.recommendation = 'Implement EncryptionService with AES-256-GCM';
    }
  }

  private async checkEnvironmentSecrets(item: ChecklistItem): Promise<void> {
    try {
      // Check for hardcoded secrets in common patterns
      const result = execSync('grep -r "sk-[a-zA-Z0-9]\\{32,\\}" src/ --include="*.ts" --include="*.js" || true', 
        { encoding: 'utf8' });
      
      if (result.trim()) {
        item.status = 'failed';
        item.details = 'Potential hardcoded API keys found in source code';
        item.recommendation = 'Move all API keys to environment variables';
      } else {
        item.status = 'passed';
        item.details = 'No hardcoded secrets found in source code';
      }
    } catch (error) {
      item.status = 'failed';
      item.details = `Secret scan failed: ${error}`;
    }
  }

  private async checkUnitTests(item: ChecklistItem): Promise<void> {
    try {
      const result = execSync('npm test tests/services/ 2>&1', { encoding: 'utf8' });
      
      if (result.includes('PASS') && !result.includes('FAIL')) {
        // Extract coverage if available
        const coverageMatch = result.match(/All files[\\s\\S]*?(\\d+(?:\\.\\d+)?)%/);
        const coverage = coverageMatch ? parseFloat(coverageMatch[1]) : 0;
        
        if (coverage >= 90) {
          item.status = 'passed';
          item.details = `Unit tests passed with ${coverage}% coverage`;
        } else {
          item.status = 'failed';
          item.details = `Unit tests passed but coverage is ${coverage}% (required: 90%)`;
        }
      } else {
        item.status = 'failed';
        item.details = 'Unit tests are failing';
        item.recommendation = 'Fix failing unit tests before deployment';
      }
    } catch (error) {
      item.status = 'failed';
      item.details = `Unit tests failed to run: ${error}`;
    }
  }

  private async checkIntegrationTests(item: ChecklistItem): Promise<void> {
    try {
      const result = execSync('npm test tests/api/ tests/integration/ 2>&1', { encoding: 'utf8' });
      
      if (result.includes('PASS') && !result.includes('FAIL')) {
        item.status = 'passed';
        item.details = 'Integration tests passed successfully';
      } else {
        item.status = 'failed';
        item.details = 'Integration tests are failing';
        item.recommendation = 'Fix failing integration tests';
      }
    } catch (error) {
      item.status = 'failed';
      item.details = `Integration tests failed to run: ${error}`;
    }
  }

  private async checkE2ETests(item: ChecklistItem): Promise<void> {
    try {
      const result = execSync('npm test tests/e2e/ 2>&1', { encoding: 'utf8' });
      
      if (result.includes('PASS') && !result.includes('FAIL')) {
        item.status = 'passed';
        item.details = 'E2E tests passed successfully';
      } else {
        item.status = 'failed';
        item.details = 'E2E tests are failing';
        item.recommendation = 'Fix failing E2E tests';
      }
    } catch (error) {
      item.status = 'failed';
      item.details = `E2E tests failed to run: ${error}`;
    }
  }

  private async checkLoadTesting(item: ChecklistItem): Promise<void> {
    const loadTestReportPath = path.join(this.projectRoot, 'performance-report.json');
    
    if (fs.existsSync(loadTestReportPath)) {
      const report = JSON.parse(fs.readFileSync(loadTestReportPath, 'utf8'));
      
      // Check if load testing results meet requirements
      if (report.summary && report.summary.averageResponseTime < 2000) {
        item.status = 'passed';
        item.details = `Load testing passed: ${report.summary.averageResponseTime}ms avg response time`;
        item.evidence = loadTestReportPath;
      } else {
        item.status = 'failed';
        item.details = 'Load testing results do not meet performance requirements';
      }
    } else {
      item.status = 'failed';
      item.details = 'Load testing report not found';
      item.recommendation = 'Run: npx tsx scripts/performance-benchmark.ts';
    }
  }

  private async checkMigrations(item: ChecklistItem): Promise<void> {
    try {
      const result = execSync('npx prisma migrate status', { encoding: 'utf8' });
      
      if (result.includes('Database is up to date')) {
        item.status = 'passed';
        item.details = 'Database migrations are up to date';
      } else {
        item.status = 'failed';
        item.details = 'Pending database migrations detected';
        item.recommendation = 'Run: npx prisma migrate deploy';
      }
    } catch (error) {
      item.status = 'failed';
      item.details = `Migration check failed: ${error}`;
    }
  }

  private async checkErrorTracking(item: ChecklistItem): Promise<void> {
    const envFiles = ['.env.production', '.env.local', '.env'];
    let sentryFound = false;
    
    for (const envFile of envFiles) {
      const envPath = path.join(this.projectRoot, envFile);
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        if (content.includes('SENTRY_DSN') || content.includes('NEXT_PUBLIC_SENTRY_DSN')) {
          sentryFound = true;
          break;
        }
      }
    }
    
    if (sentryFound) {
      item.status = 'passed';
      item.details = 'Sentry error tracking is configured';
    } else {
      item.status = 'failed';
      item.details = 'No error tracking service configured';
      item.recommendation = 'Configure Sentry or similar error tracking service';
    }
  }

  private async checkHealthEndpoints(item: ChecklistItem): Promise<void> {
    const healthEndpointPath = path.join(this.projectRoot, 'src/app/api/health/route.ts');
    
    if (fs.existsSync(healthEndpointPath)) {
      item.status = 'passed';
      item.details = 'Health check endpoint is implemented';
    } else {
      item.status = 'failed';
      item.details = 'Health check endpoint not found';
      item.recommendation = 'Implement /api/health endpoint';
    }
  }

  private async checkExternalApiKeys(item: ChecklistItem): Promise<void> {
    // This would typically make test API calls to validate keys
    // For now, just check if they're configured
    const envVars = ['OPENAI_API_KEY', 'FAL_API_KEY', 'RUNWAY_API_KEY'];
    const configuredKeys = envVars.filter(key => process.env[key]);
    
    if (configuredKeys.length >= 2) { // Need at least OpenAI + one video provider
      item.status = 'passed';
      item.details = `${configuredKeys.length} external API keys configured`;
    } else {
      item.status = 'failed';
      item.details = 'Insufficient external API keys configured';
      item.recommendation = 'Configure at least OpenAI and one video generation API';
    }
  }

  private async checkRateLimiting(item: ChecklistItem): Promise<void> {
    const middlewarePath = path.join(this.projectRoot, 'src/middleware.ts');
    
    if (fs.existsSync(middlewarePath)) {
      const content = fs.readFileSync(middlewarePath, 'utf8');
      
      if (content.includes('rate') && content.includes('limit')) {
        item.status = 'passed';
        item.details = 'Rate limiting is implemented in middleware';
      } else {
        item.status = 'manual';
        item.details = 'Rate limiting implementation requires manual verification';
      }
    } else {
      item.status = 'failed';
      item.details = 'No middleware found for rate limiting';
      item.recommendation = 'Implement rate limiting middleware';
    }
  }

  private async checkApiErrorHandling(item: ChecklistItem): Promise<void> {
    const apiRoutes = this.findApiRoutes();
    let routesWithErrorHandling = 0;
    
    for (const route of apiRoutes) {
      const content = fs.readFileSync(route, 'utf8');
      if (content.includes('try') && content.includes('catch')) {
        routesWithErrorHandling++;
      }
    }
    
    const percentage = apiRoutes.length > 0 ? (routesWithErrorHandling / apiRoutes.length) * 100 : 0;
    
    if (percentage >= 80) {
      item.status = 'passed';
      item.details = `${percentage.toFixed(1)}% of API routes have error handling`;
    } else {
      item.status = 'failed';
      item.details = `Only ${percentage.toFixed(1)}% of API routes have error handling`;
      item.recommendation = 'Add proper error handling to all API routes';
    }
  }

  private findApiRoutes(): string[] {
    const routes: string[] = [];
    const apiDir = path.join(this.projectRoot, 'src/app/api');
    
    if (!fs.existsSync(apiDir)) return routes;
    
    const walkDir = (dir: string) => {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const itemPath = path.join(dir, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
          walkDir(itemPath);
        } else if (item === 'route.ts' || item === 'route.js') {
          routes.push(itemPath);
        }
      }
    };
    
    walkDir(apiDir);
    return routes;
  }

  private generateReport(): DeploymentReport {
    const passed = this.checklist.filter(i => i.status === 'passed').length;
    const failed = this.checklist.filter(i => i.status === 'failed').length;
    const pending = this.checklist.filter(i => i.status === 'pending').length;
    const manual = this.checklist.filter(i => i.status === 'manual').length;
    const criticalIssues = this.checklist.filter(i => i.priority === 'critical' && i.status === 'failed').length;
    
    const readyForDeployment = criticalIssues === 0 && failed === 0 && pending === 0;
    
    let deploymentDecision: 'approved' | 'blocked' | 'manual_review';
    if (criticalIssues > 0) {
      deploymentDecision = 'blocked';
    } else if (failed > 0 || pending > 0) {
      deploymentDecision = 'manual_review';
    } else {
      deploymentDecision = 'approved';
    }

    const nextSteps: string[] = [];
    if (criticalIssues > 0) {
      nextSteps.push('🔴 Resolve all critical issues before deployment');
    }
    if (failed > 0) {
      nextSteps.push('❌ Fix all failed checks');
    }
    if (pending > 0 || manual > 0) {
      nextSteps.push('📋 Complete all manual verification steps');
    }
    if (readyForDeployment) {
      nextSteps.push('🚀 Ready for production deployment!');
      nextSteps.push('📊 Begin gradual rollout strategy');
      nextSteps.push('👥 Notify support and operations teams');
    }

    return {
      timestamp: new Date().toISOString(),
      environment: 'production',
      version: this.getAppVersion(),
      checklist: this.checklist,
      summary: {
        total: this.checklist.length,
        passed,
        failed,
        pending,
        manual,
        readyForDeployment,
        criticalIssues
      },
      deploymentDecision,
      nextSteps
    };
  }

  private getAppVersion(): string {
    try {
      const packageJson = JSON.parse(fs.readFileSync(path.join(this.projectRoot, 'package.json'), 'utf8'));
      return packageJson.version || '1.0.0';
    } catch {
      return '1.0.0';
    }
  }

  private async saveReport(report: DeploymentReport): Promise<void> {
    const reportPath = path.join(this.projectRoot, 'production-deployment-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📄 Deployment report saved to: ${reportPath}`);
  }

  private printSummary(report: DeploymentReport): void {
    console.log('\\n🚀 Production Deployment Checklist Summary');
    console.log('==========================================');
    console.log(`Version: ${report.version}`);
    console.log(`Timestamp: ${new Date(report.timestamp).toLocaleString()}`);
    console.log(`\\nResults: ${report.summary.passed}/${report.summary.total} checks passed`);
    console.log(`✅ Passed: ${report.summary.passed}`);
    console.log(`❌ Failed: ${report.summary.failed}`);
    console.log(`⏳ Pending: ${report.summary.pending}`);
    console.log(`📋 Manual: ${report.summary.manual}`);
    console.log(`🔴 Critical Issues: ${report.summary.criticalIssues}`);

    console.log(`\\n🎯 Deployment Decision: ${report.deploymentDecision.toUpperCase()}`);
    
    if (report.deploymentDecision === 'approved') {
      console.log('\\n🟢 ✅ READY FOR PRODUCTION DEPLOYMENT!');
    } else if (report.deploymentDecision === 'blocked') {
      console.log('\\n🔴 ❌ DEPLOYMENT BLOCKED - Critical issues must be resolved');
    } else {
      console.log('\\n🟡 ⚠️ MANUAL REVIEW REQUIRED - Some checks need attention');
    }

    console.log('\\n📋 Next Steps:');
    report.nextSteps.forEach(step => {
      console.log(`   ${step}`);
    });

    // Print failed checks
    const failedChecks = report.checklist.filter(c => c.status === 'failed');
    if (failedChecks.length > 0) {
      console.log('\\n❌ Failed Checks:');
      failedChecks.forEach(check => {
        console.log(`   ${check.id}: ${check.title}`);
        console.log(`      ${check.details}`);
        if (check.recommendation) {
          console.log(`      💡 ${check.recommendation}`);
        }
      });
    }
  }
}

async function main(): Promise<void> {
  try {
    const checklist = new ProductionDeploymentChecklist();
    const report = await checklist.runChecklist();
    
    // Exit with appropriate code
    if (report.deploymentDecision === 'blocked') {
      process.exit(1);
    } else if (report.deploymentDecision === 'manual_review') {
      process.exit(2);
    }
    
  } catch (error) {
    console.error('💥 Checklist failed:', error);
    process.exit(1);
  }
}

// Handle cleanup on exit
process.on('SIGINT', () => {
  console.log('\\n🛑 Checklist interrupted');
  process.exit(0);
});

// Run the checklist
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}