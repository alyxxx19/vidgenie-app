/**
 * Dashboard d'audit de sécurité
 * PHASE 8.3 - Interface admin pour l'audit de sécurité
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  Shield, AlertTriangle, CheckCircle, XCircle, Clock, 
  Download, Play, RefreshCw, Eye, FileText, BarChart3,
  TrendingUp, TrendingDown, Zap, Lock, UserCheck, Database,
  Globe, Server, Monitor, Settings, Target
} from 'lucide-react';
import { announceToScreenReader } from '@/lib/accessibility';

// Types
interface SecurityAuditResult {
  id: string;
  timestamp: string;
  overallScore: number;
  status: 'pass' | 'warning' | 'fail';
  categories: Record<string, SecurityCategory>;
  vulnerabilities: SecurityVulnerability[];
  recommendations: SecurityRecommendation[];
  metadata: {
    scanDuration: number;
    checkCount: number;
    environment: string;
  };
}

interface SecurityCategory {
  name: string;
  score: number;
  maxScore: number;
  status: 'pass' | 'warning' | 'fail';
  checks: SecurityCheck[];
  criticalIssues: number;
  warningIssues: number;
}

interface SecurityCheck {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'pass' | 'fail' | 'warning' | 'skip';
  score: number;
  maxScore: number;
  details?: string;
  remediation?: string;
  compliance?: string[];
}

interface SecurityVulnerability {
  id: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  description: string;
  impact: string;
  remediation: string;
}

interface SecurityRecommendation {
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  title: string;
  description: string;
  implementation: string;
}

interface QuickStatus {
  overallHealth: 'good' | 'warning' | 'critical';
  criticalIssues: number;
  recommendations: number;
  complianceScore: number;
  uptime: number;
}

const SecurityAuditDashboard: React.FC = () => {
  const [auditResult, setAuditResult] = useState<SecurityAuditResult | null>(null);
  const [quickStatus, setQuickStatus] = useState<QuickStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [auditing, setAuditing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'categories' | 'vulnerabilities' | 'recommendations' | 'compliance'>('overview');

  useEffect(() => {
    loadQuickStatus();
  }, []);

  const loadQuickStatus = async () => {
    try {
      const response = await fetch('/api/admin/security-audit?action=status');
      const data = await response.json();
      
      if (data.success) {
        setQuickStatus(data.status);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du statut:', error);
    } finally {
      setLoading(false);
    }
  };

  const runFullAudit = async (format: 'json' | 'csv' | 'pdf' = 'json') => {
    setAuditing(true);
    announceToScreenReader('Démarrage de l\'audit de sécurité', 'polite');

    try {
      const response = await fetch('/api/admin/security-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format }),
      });

      if (format === 'csv' || format === 'pdf') {
        // Télécharger le fichier
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `security-audit-${new Date().toISOString().split('T')[0]}.${format}`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        announceToScreenReader(`Rapport d'audit téléchargé en ${format.toUpperCase()}`, 'polite');
        return;
      }

      const data = await response.json();

      if (data.success) {
        setAuditResult(data.audit);
        announceToScreenReader(
          `Audit terminé: Score ${data.audit.overallScore}/100, Statut ${data.audit.status}`,
          'polite'
        );
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      announceToScreenReader(
        `Erreur d'audit: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        'assertive'
      );
    } finally {
      setAuditing(false);
    }
  };

  const getCategoryIcon = (categoryKey: string) => {
    const icons = {
      authentication: UserCheck,
      authorization: Lock,
      dataProtection: Database,
      network: Globe,
      infrastructure: Server,
      compliance: FileText,
      monitoring: Monitor,
    };
    return icons[categoryKey as keyof typeof icons] || Settings;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'fail': return <XCircle className="w-5 h-5 text-red-600" />;
      case 'skip': return <Clock className="w-5 h-5 text-gray-600" />;
      default: return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'good': return <CheckCircle className="w-8 h-8 text-green-600" />;
      case 'warning': return <AlertTriangle className="w-8 h-8 text-yellow-600" />;
      case 'critical': return <XCircle className="w-8 h-8 text-red-600" />;
      default: return <Clock className="w-8 h-8 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-300 rounded w-1/3"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-300 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <Shield className="w-8 h-8 text-blue-600 mr-3" />
            Audit de Sécurité
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Surveillance de la posture de sécurité et conformité
          </p>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={() => runFullAudit('json')}
            disabled={auditing}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            {auditing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            <span>{auditing ? 'Audit en cours...' : 'Lancer Audit'}</span>
          </button>

          {auditResult && (
            <div className="flex space-x-2">
              <button
                onClick={() => runFullAudit('csv')}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg"
                title="Télécharger CSV"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={() => runFullAudit('pdf')}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg"
                title="Télécharger PDF"
              >
                <FileText className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Statut rapide */}
      {quickStatus && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center">
              {getHealthIcon(quickStatus.overallHealth)}
              <div className="ml-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">État Général</p>
                <p className="text-lg font-bold capitalize text-gray-900 dark:text-white">
                  {quickStatus.overallHealth === 'good' ? 'Bon' : 
                   quickStatus.overallHealth === 'warning' ? 'Attention' : 'Critique'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center">
              <XCircle className="w-8 h-8 text-red-500" />
              <div className="ml-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">Issues Critiques</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {quickStatus.criticalIssues}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Target className="w-8 h-8 text-purple-500" />
              <div className="ml-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">Score Conformité</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {quickStatus.complianceScore}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center">
              <TrendingUp className="w-8 h-8 text-green-500" />
              <div className="ml-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">Uptime</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {Math.floor(quickStatus.uptime / 3600)}h
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Résultats d'audit */}
      {auditResult && (
        <>
          {/* Score global */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Score Global de Sécurité
                </h2>
                <p className="text-gray-600 dark:text-gray-300">
                  Audit effectué le {new Date(auditResult.timestamp).toLocaleString('fr-FR')}
                </p>
              </div>
              
              <div className="text-right">
                <div className="text-4xl font-bold text-gray-900 dark:text-white">
                  {auditResult.overallScore}
                  <span className="text-2xl text-gray-500">/100</span>
                </div>
                <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                  auditResult.status === 'pass' ? 'bg-green-100 text-green-800' :
                  auditResult.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {auditResult.status === 'pass' ? 'Conforme' :
                   auditResult.status === 'warning' ? 'Attention' : 'Critique'}
                </div>
              </div>
            </div>

            {/* Barre de progression */}
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full ${
                    auditResult.overallScore >= 80 ? 'bg-green-600' :
                    auditResult.overallScore >= 60 ? 'bg-yellow-600' : 'bg-red-600'
                  }`}
                  style={{ width: `${auditResult.overallScore}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Onglets */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              {[
                { key: 'overview', label: 'Vue d\'ensemble', icon: BarChart3 },
                { key: 'categories', label: 'Catégories', icon: Settings },
                { key: 'vulnerabilities', label: 'Vulnérabilités', icon: AlertTriangle },
                { key: 'recommendations', label: 'Recommandations', icon: Target },
                { key: 'compliance', label: 'Conformité', icon: FileText },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                      activeTab === tab.key
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Contenu des onglets */}
          <div className="space-y-6">
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(auditResult.categories).map(([key, category]) => {
                  const Icon = getCategoryIcon(key);
                  const percentage = category.maxScore > 0 ? (category.score / category.maxScore) * 100 : 0;
                  
                  return (
                    <div
                      key={key}
                      className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setSelectedCategory(key)}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <Icon className="w-8 h-8 text-blue-600" />
                          <h3 className="ml-3 text-lg font-medium text-gray-900 dark:text-white">
                            {category.name}
                          </h3>
                        </div>
                        {getStatusIcon(category.status)}
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Score:</span>
                          <span className="text-sm font-medium">
                            {category.score}/{category.maxScore}
                          </span>
                        </div>
                        
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              percentage >= 80 ? 'bg-green-600' :
                              percentage >= 60 ? 'bg-yellow-600' : 'bg-red-600'
                            }`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>

                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Critiques: {category.criticalIssues}</span>
                          <span>Avertissements: {category.warningIssues}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'categories' && selectedCategory && auditResult.categories[selectedCategory] && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {auditResult.categories[selectedCategory].name}
                  </h2>
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    Retour à la vue d'ensemble
                  </button>
                </div>

                <div className="space-y-3">
                  {auditResult.categories[selectedCategory].checks.map((check) => (
                    <div
                      key={check.id}
                      className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            {getStatusIcon(check.status)}
                            <h3 className="font-medium text-gray-900 dark:text-white">
                              {check.name}
                            </h3>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(check.severity)}`}>
                              {check.severity}
                            </span>
                          </div>
                          
                          <p className="text-gray-600 dark:text-gray-300 mt-2">
                            {check.description}
                          </p>
                          
                          {check.details && (
                            <p className="text-sm text-gray-500 mt-2">
                              {check.details}
                            </p>
                          )}
                          
                          {check.remediation && (
                            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                              <p className="text-sm text-blue-800 dark:text-blue-200">
                                <strong>Remédiation:</strong> {check.remediation}
                              </p>
                            </div>
                          )}
                          
                          {check.compliance && check.compliance.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {check.compliance.map((comp, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded"
                                >
                                  {comp}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900 dark:text-white">
                            {check.score}/{check.maxScore}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'vulnerabilities' && (
              <div className="space-y-4">
                {auditResult.vulnerabilities.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-300">
                      Aucune vulnérabilité détectée
                    </p>
                  </div>
                ) : (
                  auditResult.vulnerabilities.map((vuln) => (
                    <div key={vuln.id} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <Zap className="w-5 h-5 text-red-500" />
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                              {vuln.title}
                            </h3>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(vuln.severity)}`}>
                              {vuln.severity}
                            </span>
                          </div>
                          
                          <p className="text-gray-600 dark:text-gray-300 mb-3">
                            {vuln.description}
                          </p>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                                Impact:
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-300">
                                {vuln.impact}
                              </p>
                            </div>
                            
                            <div>
                              <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                                Remédiation:
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-300">
                                {vuln.remediation}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'recommendations' && (
              <div className="space-y-4">
                {auditResult.recommendations.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-300">
                      Aucune recommandation - Excellente posture de sécurité !
                    </p>
                  </div>
                ) : (
                  auditResult.recommendations.map((rec, index) => (
                    <div key={index} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                      <div className="flex items-start space-x-4">
                        <Target className="w-6 h-6 text-blue-500 flex-shrink-0 mt-1" />
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                              {rec.title}
                            </h3>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(rec.priority)}`}>
                              {rec.priority}
                            </span>
                            <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
                              {rec.category}
                            </span>
                          </div>
                          
                          <p className="text-gray-600 dark:text-gray-300 mb-3">
                            {rec.description}
                          </p>
                          
                          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
                            <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-1">
                              Implémentation:
                            </h4>
                            <p className="text-sm text-blue-800 dark:text-blue-300">
                              {rec.implementation}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'compliance' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {['RGPD', 'OWASP', 'ANSSI', 'ISO27001'].map((framework) => (
                  <div key={framework} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                      {framework}
                    </h3>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Score de conformité:</span>
                        <span className="text-sm font-medium">85%</span>
                      </div>
                      
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-green-600"
                          style={{ width: '85%' }}
                        ></div>
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        <div className="flex justify-between">
                          <span>Conforme: 17/20</span>
                          <span>Partiellement: 2/20</span>
                          <span>Non-conforme: 1/20</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {!auditResult && !auditing && (
        <div className="text-center py-12">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Aucun audit complet n'a été effectué récemment
          </p>
          <button
            onClick={() => runFullAudit()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 mx-auto"
          >
            <Play className="w-5 h-5" />
            <span>Lancer le Premier Audit</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default SecurityAuditDashboard;