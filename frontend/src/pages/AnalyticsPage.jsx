// ===================================
// src/pages/AnalyticsPage.jsx
import React from 'react';
import { BarChart3, TrendingUp, PieChart, Users } from 'lucide-react';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { useApi } from '../hooks/useApi';
import { analyticsService } from '../services/api';

const AnalyticsPage = () => {
  const { data: analyticsData, loading, error, refetch } = useApi(() => analyticsService.getDemographics());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Analyses Démographiques
        </h1>
        <p className="text-gray-600">
          Statistiques et tendances de la population camerounaise
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="card text-center py-12">
          <LoadingSpinner text="Chargement des analyses..." />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <ErrorMessage error={error} onRetry={refetch} />
      )}

      {/* Content */}
      {!loading && !error && analyticsData && (
        <div className="space-y-8">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card text-center">
              <div className="bg-fni-blue-100 p-4 rounded-lg w-fit mx-auto mb-4">
                <Users className="h-8 w-8 text-fni-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">
                {analyticsData.analytics?.summary?.totalBirths?.toLocaleString() || '0'}
              </h3>
              <p className="text-gray-600">Total des naissances</p>
            </div>
            
            <div className="card text-center">
              <div className="bg-fni-green-100 p-4 rounded-lg w-fit mx-auto mb-4">
                <TrendingUp className="h-8 w-8 text-fni-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">
                {analyticsData.analytics?.genderDistribution?.length || 0}
              </h3>
              <p className="text-gray-600">Catégories de genre</p>
            </div>
            
            <div className="card text-center">
              <div className="bg-purple-100 p-4 rounded-lg w-fit mx-auto mb-4">
                <PieChart className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">
                {analyticsData.analytics?.topBirthPlaces?.length || 0}
              </h3>
              <p className="text-gray-600">Lieux principaux</p>
            </div>
          </div>

          {/* Gender Distribution */}
          {analyticsData.analytics?.genderDistribution && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Répartition par sexe
              </h3>
              <div className="space-y-3">
                {analyticsData.analytics.genderDistribution.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-gray-700">{item.gender}</span>
                    <div className="flex items-center space-x-3 flex-1 mx-4">
                      <div className="flex-1 bg-gray-200 rounded-full h-3">
                        <div 
                          className="h-3 bg-fni-blue-500 rounded-full transition-all duration-500"
                          style={{ width: `${item.percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900 min-w-[60px]">
                        {item.count?.toLocaleString()} ({item.percentage}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Birth Places */}
          {analyticsData.analytics?.topBirthPlaces && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Principaux lieux de naissance
              </h3>
              <div className="space-y-3">
                {analyticsData.analytics.topBirthPlaces.slice(0, 10).map((place, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-gray-700">{place.place}</span>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-gray-900">
                        {place.count?.toLocaleString()}
                      </span>
                      {place.percentage && (
                        <span className="text-xs text-gray-500">
                          ({place.percentage}%)
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AnalyticsPage;
