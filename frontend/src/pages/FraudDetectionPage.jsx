// ===================================
// src/pages/FraudDetectionPage.jsx
import React from 'react';
import { Shield, AlertTriangle, CheckCircle, Eye, Clock } from 'lucide-react';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { useApi } from '../hooks/useApi';
import { fraudService } from '../services/api';
import { getSeverityColor, formatDate } from '../utils/helpers';

const FraudDetectionPage = () => {
  const { data: fraudData, loading, error, refetch } = useApi(() => fraudService.detect());

  const getSeverityIcon = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4" />;
      case 'medium':
        return <Eye className="h-4 w-4" />;
      case 'low':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Détection de Fraudes
        </h1>
        <p className="text-gray-600">
          Système intelligent d'analyse des anomalies dans le FNI
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="card text-center py-12">
          <LoadingSpinner text="Analyse des anomalies en cours..." />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <ErrorMessage error={error} onRetry={refetch} />
      )}

      {/* Content */}
      {!loading && !error && fraudData && (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card text-center">
              <div className="bg-red-100 p-3 rounded-lg w-fit mx-auto mb-3">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                {fraudData.total || 0}
              </h3>
              <p className="text-sm text-gray-600">Anomalies détectées</p>
            </div>
            
            <div className="card text-center">
              <div className="bg-red-100 p-3 rounded-lg w-fit mx-auto mb-3">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                {fraudData.summary?.critical || 0}
              </h3>
              <p className="text-sm text-gray-600">Critiques</p>
            </div>
            
            <div className="card text-center">
              <div className="bg-orange-100 p-3 rounded-lg w-fit mx-auto mb-3">
                <Eye className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                {fraudData.summary?.high || 0}
              </h3>
              <p className="text-sm text-gray-600">Élevées</p>
            </div>
            
            <div className="card text-center">
              <div className="bg-blue-100 p-3 rounded-lg w-fit mx-auto mb-3">
                <CheckCircle className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                {(fraudData.summary?.medium || 0) + (fraudData.summary?.low || 0)}
              </h3>
              <p className="text-sm text-gray-600">Moyennes/Faibles</p>
            </div>
          </div>

          {/* Anomalies List */}
          {fraudData.anomalies && fraudData.anomalies.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Anomalies détectées ({fraudData.anomalies.length})
              </h3>
              
              <div className="space-y-4">
                {fraudData.anomalies.map((anomaly) => (
                  <AnomalyCard key={anomaly.id} anomaly={anomaly} />
                ))}
              </div>
            </div>
          )}

          {/* No Anomalies */}
          {fraudData.anomalies && fraudData.anomalies.length === 0 && (
            <div className="card text-center py-12">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Aucune anomalie détectée
              </h3>
              <p className="text-gray-600">
                Le système n'a trouvé aucune anomalie dans les données récentes.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const AnomalyCard = ({ anomaly }) => {
  const severityClass = getSeverityColor(anomaly.severity);
  
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start space-x-3">
          <div className={`p-2 rounded-lg ${severityClass.replace('text-', 'bg-').replace('-600', '-100').replace('-800', '-200')}`}>
            <AlertTriangle className={`h-4 w-4 ${severityClass.split(' ')[0]}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <h4 className="font-semibold text-gray-900">{anomaly.title}</h4>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${severityClass}`}>
                {anomaly.severity?.toUpperCase()}
              </span>
            </div>
            <p className="text-sm text-gray-600">{anomaly.description}</p>
          </div>
        </div>
      </div>

      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex items-center space-x-2">
          <span className="font-medium">Personne impliquée:</span>
          <span>{anomaly.personInvolved || 'Non spécifié'}</span>
        </div>
        
        {anomaly.detectedAt && (
          <div className="flex items-center space-x-2">
            <Clock className="h-3 w-3" />
            <span>Détectée le {formatDate(anomaly.detectedAt)}</span>
          </div>
        )}
        
        {anomaly.confidence && (
          <div className="flex items-center space-x-2">
            <span className="font-medium">Confiance:</span>
            <span>{anomaly.confidence}%</span>
          </div>
        )}
        
        {anomaly.flags && anomaly.flags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {anomaly.flags.map((flag, index) => (
              <span 
                key={index}
                className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
              >
                {flag.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FraudDetectionPage;