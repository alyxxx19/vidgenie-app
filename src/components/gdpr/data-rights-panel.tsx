/**
 * Panneau de gestion des droits RGPD
 * PHASE 7.3 - Interface utilisateur pour les droits des données
 */

'use client';

import React, { useState, useEffect } from 'react';
import { 
  Shield, Download, Edit, Trash2, Lock, Eye, 
  Clock, CheckCircle, XCircle, AlertCircle, FileText 
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { announceToScreenReader } from '@/lib/accessibility';

interface DataRequest {
  id: string;
  type: 'access' | 'rectification' | 'deletion' | 'portability' | 'restriction';
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  description: string;
  createdAt: string;
  completedAt?: string;
  response?: string;
  statusText: string;
  typeText: string;
}

interface NewRequestData {
  type: DataRequest['type'];
  description: string;
  requestData?: Record<string, any>;
}

const DataRightsPanel: React.FC = () => {
  const { data: session } = useSession();
  const [requests, setRequests] = useState<DataRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newRequest, setNewRequest] = useState<NewRequestData>({
    type: 'access',
    description: '',
  });

  useEffect(() => {
    if (session?.user) {
      loadRequests();
    }
  }, [session]);

  const loadRequests = async () => {
    try {
      const response = await fetch('/api/gdpr/data-request');
      const data = await response.json();
      
      if (data.success) {
        setRequests(data.requests);
      }
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const submitRequest = async () => {
    if (!newRequest.description.trim()) {
      announceToScreenReader('Veuillez fournir une description', 'assertive');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/gdpr/data-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRequest),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        announceToScreenReader(`Demande ${data.requestId} créée avec succès`, 'polite');
        setNewRequest({ type: 'access', description: '' });
        setShowNewRequest(false);
        await loadRequests();
      } else {
        throw new Error(data.error || 'Erreur lors de la création de la demande');
      }
    } catch (error) {
      announceToScreenReader(
        error instanceof Error ? error.message : 'Erreur lors de la création de la demande',
        'assertive'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getRequestIcon = (type: DataRequest['type']) => {
    switch (type) {
      case 'access': return <Eye className="w-5 h-5" />;
      case 'rectification': return <Edit className="w-5 h-5" />;
      case 'deletion': return <Trash2 className="w-5 h-5" />;
      case 'portability': return <Download className="w-5 h-5" />;
      case 'restriction': return <Lock className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  const getStatusIcon = (status: DataRequest['status']) => {
    switch (status) {
      case 'pending': return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'processing': return <AlertCircle className="w-5 h-5 text-blue-500" />;
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'rejected': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const requestDescriptions = {
    access: 'Obtenir une copie de toutes vos données personnelles que nous détenons',
    rectification: 'Corriger ou mettre à jour vos informations personnelles',
    deletion: 'Supprimer définitivement votre compte et vos données personnelles',
    portability: 'Recevoir vos données dans un format structuré et lisible par machine',
    restriction: 'Limiter le traitement de vos données personnelles',
  };

  if (!session?.user) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <p className="text-center text-gray-600 dark:text-gray-300">
          Connectez-vous pour gérer vos droits sur les données personnelles
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-300 rounded w-1/4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-300 rounded"></div>
            <div className="h-4 bg-gray-300 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Shield className="w-8 h-8 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Mes droits sur les données
          </h2>
        </div>
        
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Conformément au RGPD, vous disposez de plusieurs droits concernant vos données personnelles. 
          Vous pouvez exercer ces droits à tout moment en créant une demande ci-dessous.
        </p>

        <button
          onClick={() => setShowNewRequest(!showNewRequest)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Nouvelle demande
        </button>
      </div>

      {/* Formulaire de nouvelle demande */}
      {showNewRequest && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Créer une nouvelle demande
          </h3>

          <div className="space-y-4">
            {/* Type de demande */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type de demande
              </label>
              <select
                value={newRequest.type}
                onChange={(e) => setNewRequest(prev => ({ ...prev, type: e.target.value as DataRequest['type'] }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="access">Droit d'accès</option>
                <option value="rectification">Droit de rectification</option>
                <option value="deletion">Droit à l'effacement</option>
                <option value="portability">Droit à la portabilité</option>
                <option value="restriction">Droit à la limitation</option>
              </select>
              
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {requestDescriptions[newRequest.type]}
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description de votre demande *
              </label>
              <textarea
                value={newRequest.description}
                onChange={(e) => setNewRequest(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
                placeholder="Décrivez votre demande en détail..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
              <p className="mt-1 text-xs text-gray-500">
                Minimum 10 caractères, maximum 1000 caractères
              </p>
            </div>

            {/* Avertissements spécifiques */}
            {newRequest.type === 'deletion' && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-red-800 dark:text-red-200">
                      Attention - Suppression définitive
                    </h4>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                      Cette action supprimera définitivement votre compte et toutes vos données. 
                      Cette action est irréversible et peut être soumise à des obligations légales de conservation.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex space-x-3 pt-4">
              <button
                onClick={submitRequest}
                disabled={submitting || !newRequest.description.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {submitting ? 'Envoi...' : 'Envoyer la demande'}
              </button>
              
              <button
                onClick={() => setShowNewRequest(false)}
                className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Liste des demandes */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Historique de vos demandes
          </h3>
        </div>

        {requests.length === 0 ? (
          <div className="p-6 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-300">
              Vous n'avez encore fait aucune demande concernant vos données personnelles.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {requests.map((request) => (
              <div key={request.id} className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    {getRequestIcon(request.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                        {request.typeText}
                      </h4>
                      
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(request.status)}
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                          {request.statusText}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 dark:text-gray-300 mb-3">
                      {request.description}
                    </p>
                    
                    <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                      <span>
                        Demandée le {new Date(request.createdAt).toLocaleDateString('fr-FR')}
                      </span>
                      
                      {request.completedAt && (
                        <span>
                          Terminée le {new Date(request.completedAt).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                    </div>
                    
                    {request.response && (
                      <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          <strong>Réponse :</strong> {request.response}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Informations légales */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-3">
          Vos droits selon le RGPD
        </h3>
        
        <div className="space-y-3 text-sm text-blue-800 dark:text-blue-300">
          <div className="flex items-start space-x-2">
            <Eye className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p><strong>Droit d'accès :</strong> Obtenir une copie de vos données personnelles</p>
          </div>
          
          <div className="flex items-start space-x-2">
            <Edit className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p><strong>Droit de rectification :</strong> Corriger des informations inexactes</p>
          </div>
          
          <div className="flex items-start space-x-2">
            <Trash2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p><strong>Droit à l'effacement :</strong> Demander la suppression de vos données</p>
          </div>
          
          <div className="flex items-start space-x-2">
            <Download className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p><strong>Droit à la portabilité :</strong> Récupérer vos données dans un format structuré</p>
          </div>
          
          <div className="flex items-start space-x-2">
            <Lock className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p><strong>Droit à la limitation :</strong> Restreindre le traitement de vos données</p>
          </div>
        </div>
        
        <p className="text-xs text-blue-700 dark:text-blue-400 mt-4">
          Nous traitons vos demandes dans un délai de 30 jours maximum conformément à la réglementation RGPD.
        </p>
      </div>
    </div>
  );
};

export default DataRightsPanel;