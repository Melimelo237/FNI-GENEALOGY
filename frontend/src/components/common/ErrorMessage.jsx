// ===================================
// src/components/common/ErrorMessage.jsx
import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

const ErrorMessage = ({ error, onRetry }) => {
  return (
    <div className="card text-center py-8">
      <div className="flex flex-col items-center space-y-4">
        <div className="bg-red-100 p-4 rounded-full">
          <AlertCircle className="h-8 w-8 text-red-600" />
        </div>
        
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Une erreur s'est produite
          </h3>
          <p className="text-gray-600 mb-4 max-w-md">
            {error || 'Impossible de charger les données. Veuillez réessayer.'}
          </p>
        </div>
        
        {onRetry && (
          <button
            onClick={onRetry}
            className="btn-primary flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Réessayer</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorMessage;