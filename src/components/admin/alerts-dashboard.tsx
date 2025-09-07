/**
 * Dashboard des alertes pour l'admin
 * PHASE 8.2 - Interface d'administration des alertes
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle, Bell, BellOff, CheckCircle, Clock, XCircle,
  Plus, Edit, Trash2, Eye, Mail, MessageSquare, Webhook,
  TrendingUp, TrendingDown, Activity, Zap, Settings
} from 'lucide-react';
import { announceToScreenReader } from '@/lib/accessibility';

// Types
interface AlertRule {
  id: string;
  name: string;
  description: string;
  metricPath: string;
  operator: string;
  threshold: number;
  severity: 'info' | 'warning' | 'critical';
  enabled: boolean;
  cooldownMinutes: number;
  channels: Array<{
    type: 'email' | 'slack' | 'webhook' | 'sms';
    target: string;
    enabled: boolean;
  }>;
  createdBy: string;
  createdAt: string;
  lastTriggered?: string;
}

interface AlertInstance {
  id: string;
  ruleId: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  metricValue: number;
  threshold: number;
  timestamp: string;
  status: 'active' | 'acknowledged' | 'resolved';
}

interface PredictiveInsight {
  type: 'trend' | 'anomaly' | 'forecast';
  metricPath: string;
  severity: 'info' | 'warning' | 'critical';
  description: string;
  confidence: number;
  timeframe: string;
  recommendations: string[];
  data: Record<string, any>;
}

const AlertsDashboard: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertInstance[]>([]);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [insights, setInsights] = useState<PredictiveInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'alerts' | 'rules' | 'insights'>('alerts');
  const [showCreateRule, setShowCreateRule] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);

  // Données pour la création de règles
  const [newRule, setNewRule] = useState({
    name: '',
    description: '',
    metricPath: 'users.churnRate',
    operator: '>',
    threshold: 10,
    severity: 'warning' as const,
    cooldownMinutes: 60,
    channels: [{ type: 'email' as const, target: '', enabled: true }],
  });

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 300000); // Refresh toutes les 5 minutes
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [alertsRes, rulesRes, insightsRes] = await Promise.all([
        fetch('/api/alerts?action=check'),
        fetch('/api/alerts?action=rules'),
        fetch('/api/alerts?action=insights'),
      ]);

      const [alertsData, rulesData, insightsData] = await Promise.all([
        alertsRes.json(),
        rulesRes.json(),
        insightsRes.json(),
      ]);

      if (alertsData.success) {
        setAlerts(alertsData.alerts || []);
      }

      if (rulesData.success) {
        setRules(rulesData.rules || []);
      }

      if (insightsData.success) {
        setInsights(insightsData.insights || []);
      }

      announceToScreenReader(
        `Données mises à jour: ${alertsData.alerts?.length || 0} alertes actives`,
        'polite'
      );
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      announceToScreenReader('Erreur lors du chargement des données', 'assertive');
    } finally {
      setLoading(false);
    }
  };

  const handleAlertAction = async (alertId: string, action: 'acknowledge' | 'resolve') => {
    try {
      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, alertId }),
      });

      const data = await response.json();

      if (data.success) {
        announceToScreenReader(
          `Alerte ${action === 'acknowledge' ? 'acquittée' : 'résolue'}`,
          'polite'
        );
        loadData();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      announceToScreenReader(
        `Erreur: ${error instanceof Error ? error.message : 'Action échouée'}`,
        'assertive'
      );
    }
  };

  const createRule = async () => {
    if (!newRule.name.trim() || !newRule.channels[0].target.trim()) {
      announceToScreenReader('Veuillez remplir tous les champs obligatoires', 'assertive');
      return;
    }

    try {
      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRule),
      });

      const data = await response.json();

      if (data.success) {
        announceToScreenReader('Règle d\'alerte créée avec succès', 'polite');
        setShowCreateRule(false);
        setNewRule({
          name: '',
          description: '',
          metricPath: 'users.churnRate',
          operator: '>',
          threshold: 10,
          severity: 'warning',
          cooldownMinutes: 60,
          channels: [{ type: 'email', target: '', enabled: true }],
        });
        loadData();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      announceToScreenReader(
        `Erreur: ${error instanceof Error ? error.message : 'Création échouée'}`,
        'assertive'
      );
    }
  };

  const toggleRuleEnabled = async (ruleId: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/alerts/${ruleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });

      const data = await response.json();

      if (data.success) {
        announceToScreenReader(
          `Règle ${enabled ? 'activée' : 'désactivée'}`,
          'polite'
        );
        loadData();
      }
    } catch (error) {
      announceToScreenReader('Erreur lors de la modification', 'assertive');
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'info': return <AlertTriangle className="w-5 h-5 text-blue-500" />;
      default: return <AlertTriangle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'trend': return <TrendingUp className="w-5 h-5 text-blue-500" />;
      case 'anomaly': return <Zap className="w-5 h-5 text-red-500" />;
      case 'forecast': return <Activity className="w-5 h-5 text-purple-500" />;
      default: return <Activity className="w-5 h-5 text-gray-500" />;
    }
  };

  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="w-4 h-4" />;
      case 'slack': return <MessageSquare className="w-4 h-4" />;
      case 'webhook': return <Webhook className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const metricOptions = [
    { value: 'users.churnRate', label: 'Taux de churn utilisateurs' },
    { value: 'users.newUsers', label: 'Nouveaux utilisateurs' },
    { value: 'users.activeUsers', label: 'Utilisateurs actifs' },
    { value: 'revenue.conversionRate', label: 'Taux de conversion' },
    { value: 'revenue.monthlyRevenue', label: 'Revenus mensuels' },
    { value: 'performance.errorRate', label: 'Taux d\'erreur' },
    { value: 'performance.averageResponseTime', label: 'Temps de réponse moyen' },
    { value: 'content.generationSuccessRate', label: 'Taux de succès génération' },
  ];

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-300 rounded w-1/3"></div>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Centre d'Alertes
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Surveillance intelligente et alertes prédictives
          </p>
        </div>

        <button
          onClick={() => loadData()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          disabled={loading}
        >
          Actualiser
        </button>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center">
            <AlertTriangle className="w-8 h-8 text-red-500" />
            <div className="ml-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">Alertes Actives</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {alerts.filter(a => a.status === 'active').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Settings className="w-8 h-8 text-blue-500" />
            <div className="ml-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">Règles Actives</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {rules.filter(r => r.enabled).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Activity className="w-8 h-8 text-purple-500" />
            <div className="ml-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">Insights Prédictifs</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {insights.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <div className="ml-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">Taux de Résolution</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {alerts.length > 0 
                  ? Math.round((alerts.filter(a => a.status === 'resolved').length / alerts.length) * 100)
                  : 100}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'alerts', label: 'Alertes', count: alerts.length },
            { key: 'rules', label: 'Règles', count: rules.length },
            { key: 'insights', label: 'Insights', count: insights.length },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </nav>
      </div>

      {/* Contenu des onglets */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          {alerts.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-300">
                Aucune alerte active - Tout va bien !
              </p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className={`bg-white dark:bg-gray-800 p-6 rounded-lg shadow border-l-4 ${
                  alert.severity === 'critical'
                    ? 'border-red-500'
                    : alert.severity === 'warning'
                    ? 'border-yellow-500'
                    : 'border-blue-500'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    {getSeverityIcon(alert.severity)}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        {alert.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300 mt-1">
                        {alert.message}
                      </p>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                        <span>Valeur: {alert.metricValue.toFixed(2)}</span>
                        <span>Seuil: {alert.threshold}</span>
                        <span>{new Date(alert.timestamp).toLocaleString('fr-FR')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    {alert.status === 'active' && (
                      <>
                        <button
                          onClick={() => handleAlertAction(alert.id, 'acknowledge')}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Acquitter
                        </button>
                        <button
                          onClick={() => handleAlertAction(alert.id, 'resolve')}
                          className="text-green-600 hover:text-green-800 text-sm font-medium"
                        >
                          Résoudre
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'rules' && (
        <div className="space-y-4">
          <div className="flex justify-between">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              Règles d'Alerte
            </h2>
            <button
              onClick={() => setShowCreateRule(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Nouvelle Règle</span>
            </button>
          </div>

          {/* Formulaire de création */}
          {showCreateRule && (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium mb-4">Créer une Nouvelle Règle</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nom *</label>
                  <input
                    type="text"
                    value={newRule.name}
                    onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Nom de la règle"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Métrique</label>
                  <select
                    value={newRule.metricPath}
                    onChange={(e) => setNewRule(prev => ({ ...prev, metricPath: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {metricOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Opérateur</label>
                  <select
                    value={newRule.operator}
                    onChange={(e) => setNewRule(prev => ({ ...prev, operator: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value=">">Supérieur à (&gt;)</option>
                    <option value=">=">Supérieur ou égal (≥)</option>
                    <option value="<">Inférieur à (&lt;)</option>
                    <option value="<=">Inférieur ou égal (≤)</option>
                    <option value="==">Égal à (=)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Seuil</label>
                  <input
                    type="number"
                    value={newRule.threshold}
                    onChange={(e) => setNewRule(prev => ({ ...prev, threshold: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    step="0.1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Sévérité</label>
                  <select
                    value={newRule.severity}
                    onChange={(e) => setNewRule(prev => ({ ...prev, severity: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="info">Info</option>
                    <option value="warning">Avertissement</option>
                    <option value="critical">Critique</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Email de notification *</label>
                  <input
                    type="email"
                    value={newRule.channels[0].target}
                    onChange={(e) => setNewRule(prev => ({
                      ...prev,
                      channels: [{ ...prev.channels[0], target: e.target.value }]
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="admin@example.com"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={newRule.description}
                  onChange={(e) => setNewRule(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Description de la règle d'alerte"
                />
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={createRule}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                >
                  Créer la Règle
                </button>
                <button
                  onClick={() => setShowCreateRule(false)}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}

          {/* Liste des règles */}
          <div className="space-y-3">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow flex items-center justify-between"
              >
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => toggleRuleEnabled(rule.id, !rule.enabled)}
                    className={`p-2 rounded-lg ${
                      rule.enabled
                        ? 'bg-green-100 text-green-600'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {rule.enabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
                  </button>

                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {rule.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {rule.metricPath} {rule.operator} {rule.threshold} 
                      <span className={`ml-2 px-2 py-1 rounded text-xs ${
                        rule.severity === 'critical' ? 'bg-red-100 text-red-800' :
                        rule.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {rule.severity}
                      </span>
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      {rule.channels.map((channel, idx) => (
                        <div key={idx} className="flex items-center text-xs text-gray-500">
                          {getChannelIcon(channel.type)}
                          <span className="ml-1">{channel.target}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button className="text-gray-600 hover:text-gray-800">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button className="text-red-600 hover:text-red-800">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'insights' && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            Insights Prédictifs
          </h2>

          {insights.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-300">
                Aucun insight disponible - Collecte de données en cours...
              </p>
            </div>
          ) : (
            insights.map((insight, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow"
              >
                <div className="flex items-start space-x-3">
                  {getInsightIcon(insight.type)}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {insight.type === 'trend' ? 'Tendance' :
                         insight.type === 'anomaly' ? 'Anomalie' : 'Prédiction'}
                      </h3>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          insight.severity === 'critical' ? 'bg-red-100 text-red-800' :
                          insight.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {insight.severity}
                        </span>
                        <span className="text-xs text-gray-500">
                          Confiance: {Math.round(insight.confidence * 100)}%
                        </span>
                      </div>
                    </div>

                    <p className="text-gray-600 dark:text-gray-300 mb-3">
                      {insight.description}
                    </p>

                    {insight.recommendations.length > 0 && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
                        <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2">
                          Recommandations:
                        </h4>
                        <ul className="list-disc list-inside text-sm text-blue-800 dark:text-blue-300 space-y-1">
                          {insight.recommendations.map((rec, idx) => (
                            <li key={idx}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default AlertsDashboard;