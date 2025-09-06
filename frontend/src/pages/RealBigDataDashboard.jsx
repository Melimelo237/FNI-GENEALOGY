import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Zap, 
  BarChart3, 
  Shield, 
  Target,
  Server,
  Activity,
  Cpu,
  HardDrive,
  Network,
  Eye,
  CheckCircle,
  AlertTriangle,
  Clock,
  TrendingUp,
  TrendingDown,
  Layers,
  GitBranch,
  Workflow,
  RefreshCw,
  Download,
  Settings,
  Globe,
  Lock,
  Users,
  FileText,
  Brain,
  Sparkles,
  Play,
  Loader2,
  Gauge,
  MapPin,
  Calendar,
  Smartphone
} from 'lucide-react';

const RealBigDataDashboard = () => {
  const [realMetrics, setRealMetrics] = useState(null);
  const [batchProcessing, setBatchProcessing] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [performanceData, setPerformanceData] = useState(null);

  useEffect(() => {
    loadRealBigDataMetrics();
    const interval = setInterval(loadRealBigDataMetrics, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const loadRealBigDataMetrics = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/real-bigdata/metrics');
      const data = await response.json();
      
      if (data.success) {
        setRealMetrics(data.metrics);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Erreur chargement métriques réelles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const runBatchProcessing = async () => {
    try {
      setIsProcessing(true);
      const response = await fetch('/api/real-bigdata/process-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chunkSize: 5000, 
          operation: 'demographic_analysis' 
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setBatchProcessing(data.batch_processing);
      }
    } catch (error) {
      console.error('Erreur traitement batch:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const loadPerformanceAnalysis = async () => {
    try {
      const response = await fetch('/api/real-bigdata/performance-analysis');
      const data = await response.json();
      if (data.success) {
        setPerformanceData(data.performance_analysis);
      }
    } catch (error) {
      console.error('Erreur analyse performance:', error);
    }
  };

  // Composant métrique Big Data réelle
  const RealBigDataMetric = ({ title, value, subtitle, icon: Icon, color, trend, isReal = true }) => (
    <div className={`bg-gradient-to-br from-${color}-50 to-${color}-100 rounded-xl p-6 border border-${color}-200 hover:shadow-lg transition-all duration-300 relative`}>
      {isReal && (
        <div className="absolute top-2 right-2">
          <div className="flex items-center space-x-1 bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>LIVE</span>
          </div>
        </div>
      )}
      
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 bg-${color}-600 rounded-xl shadow-lg`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        {trend && (
          <div className={`flex items-center space-x-1 text-sm font-medium px-2 py-1 rounded-full ${
            trend.startsWith('+') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {trend.startsWith('+') ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span>{trend}</span>
          </div>
        )}
      </div>
      
      <h3 className={`text-3xl font-bold text-${color}-900 mb-2`}>{value}</h3>
      <p className={`text-sm font-medium text-${color}-800 mb-1`}>{title}</p>
      {subtitle && <p className={`text-xs text-${color}-600`}>{subtitle}</p>}
    </div>
  );

  // Composant de traitement batch
  const BatchProcessingCard = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-purple-600 rounded-xl">
            <Workflow className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Traitement Big Data par Chunks</h3>
            <p className="text-sm text-gray-600">Simulation MapReduce sur vos vraies données</p>
          </div>
        </div>
        
        <button
          onClick={runBatchProcessing}
          disabled={isProcessing}
          className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2 disabled:bg-gray-400"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              <span>Démarrer traitement</span>
            </>
          )}
        </button>
      </div>

      {batchProcessing && (
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <h4 className="text-2xl font-bold text-purple-600">{batchProcessing.processed_chunks}</h4>
              <p className="text-sm text-purple-800">Chunks traités</p>
            </div>
            <div className="text-center">
              <h4 className="text-2xl font-bold text-purple-600">{batchProcessing.total_records?.toLocaleString()}</h4>
              <p className="text-sm text-purple-800">Records analysés</p>
            </div>
            <div className="text-center">
              <h4 className="text-2xl font-bold text-purple-600">{batchProcessing.actual_processing_time}</h4>
              <p className="text-sm text-purple-800">Temps réel</p>
            </div>
            <div className="text-center">
              <h4 className="text-2xl font-bold text-purple-600">{batchProcessing.performance?.records_per_second?.toLocaleString()}</h4>
              <p className="text-sm text-purple-800">Records/sec</p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-3">
            <h5 className="font-medium text-gray-900 mb-2">Résultats Top Lieux de Naissance :</h5>
            <div className="space-y-1">
              {batchProcessing.results?.top_locations?.slice(0, 5).map(([location, count], index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-gray-700">{location}</span>
                  <span className="font-medium text-purple-600">{count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (isLoading && !realMetrics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Calcul des métriques Big Data réelles...</h3>
          <p className="text-gray-600">Analyse de votre base PostgreSQL en cours</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-green-600 p-3 rounded-xl">
                <Database className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Big Data FNI - Données Réelles</h1>
                <p className="text-sm text-gray-600">
                  Connecté à PostgreSQL • {realMetrics?.volume?.total_records?.toLocaleString()} enregistrements • 
                  Dernière mise à jour: {lastUpdated.toLocaleTimeString('fr-FR')}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Base de données connectée</span>
              </div>
              <button 
                onClick={loadRealBigDataMetrics}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Actualiser</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="px-6 py-6">
        {/* Métriques Big Data réelles */}
        {realMetrics && (
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-6">
              <Sparkles className="h-6 w-6 text-purple-600" />
              <h2 className="text-xl font-bold text-gray-900">Métriques Big Data - Données Réelles</h2>
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                Connecté à votre base PostgreSQL
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
              <RealBigDataMetric
                title="Volume Réel"
                value={realMetrics.volume.total_records?.toLocaleString()}
                subtitle={`Taille: ${realMetrics.volume.table_size_human}`}
                icon={Database}
                color="blue"
                trend={realMetrics.volume.growth_rate}
                isReal={true}
              />
              
              <RealBigDataMetric
                title="Vélocité Mesurée"
                value={realMetrics.velocity.estimated_throughput}
                subtitle={`Latence: ${realMetrics.velocity.avg_query_latency}`}
                icon={Zap}
                color="green"
                isReal={true}
              />
              
              <RealBigDataMetric
                title="Variété Analysée"
                value={`${realMetrics.variety.unique_data_types} types`}
                subtitle={`${realMetrics.variety.geographic_diversity.unique_birth_places} lieux uniques`}
                icon={Layers}
                color="purple"
                isReal={true}
              />
              
              <RealBigDataMetric
                title="Véracité Calculée"
                value={realMetrics.veracity.overall_quality_score}
                subtitle={`Complétude: ${realMetrics.veracity.completeness.score}`}
                icon={Shield}
                color="orange"
                isReal={true}
              />
              
              <RealBigDataMetric
                title="Valeur Générée"
                value={realMetrics.value.business_insights_generated?.toString()}
                subtitle="Insights automatisés"
                icon={Target}
                color="red"
                isReal={true}
              />
            </div>
          </div>
        )}

        {/* Section traitement par chunks */}
        <div className="mb-8">
          <BatchProcessingCard />
        </div>

        {/* Détails techniques réels */}
        {realMetrics && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Volume détaillé */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <HardDrive className="h-5 w-5 mr-2 text-blue-600" />
                Analyse Volume - Données Réelles
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <span className="font-medium text-blue-900">Enregistrements totaux</span>
                  <span className="text-xl font-bold text-blue-600">
                    {realMetrics.volume.total_records?.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-700">Taille sur disque</span>
                  <span className="font-bold text-gray-900">{realMetrics.volume.table_size_human}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <span className="font-medium text-green-700">Moyenne mensuelle</span>
                  <span className="font-bold text-green-600">
                    {realMetrics.volume.monthly_average?.toLocaleString()} nouveaux records
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                  <span className="font-medium text-purple-700">Densité de données</span>
                  <span className="font-bold text-purple-600">
                    {realMetrics.volume.data_density?.toLocaleString()} records/MB
                  </span>
                </div>
              </div>
            </div>

            {/* Performance réelle */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Gauge className="h-5 w-5 mr-2 text-green-600" />
                Performance Mesurée
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <span className="font-medium text-green-700">Requête simple</span>
                  <span className="font-bold text-green-600">{realMetrics.velocity.simple_query_performance}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                  <span className="font-medium text-yellow-700">Requête complexe</span>
                  <span className="font-bold text-yellow-600">{realMetrics.velocity.complex_query_performance}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <span className="font-medium text-blue-700">Throughput estimé</span>
                  <span className="font-bold text-blue-600">{realMetrics.velocity.estimated_throughput}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                  <span className="font-medium text-purple-700">Indexation</span>
                  <span className="font-bold text-purple-600">{realMetrics.velocity.indexing_status}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Analyse de qualité réelle */}
        {realMetrics?.veracity && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
              Qualité des Données - Analyse Réelle
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Complétude */}
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <h4 className="text-3xl font-bold text-blue-600 mb-2">
                  {realMetrics.veracity.completeness.score}
                </h4>
                <p className="text-blue-800 font-medium">Complétude</p>
                <div className="mt-2 text-sm text-blue-700">
                  <p>Noms manquants: {realMetrics.veracity.completeness.missing_names}</p>
                  <p>Dates manquantes: {realMetrics.veracity.completeness.missing_dates}</p>
                </div>
              </div>
              
              {/* Précision */}
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <h4 className="text-3xl font-bold text-green-600 mb-2">
                  {realMetrics.veracity.accuracy.score}
                </h4>
                <p className="text-green-800 font-medium">Précision</p>
                <div className="mt-2 text-sm text-green-700">
                  <p>Entrées invalides: {realMetrics.veracity.accuracy.invalid_entries}</p>
                  <p>Dates futures: {realMetrics.veracity.accuracy.future_dates}</p>
                </div>
              </div>
              
              {/* Cohérence */}
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <h4 className="text-3xl font-bold text-orange-600 mb-2">
                  {realMetrics.veracity.consistency.duplicate_rate}
                </h4>
                <p className="text-orange-800 font-medium">Taux de doublons</p>
                <div className="mt-2 text-sm text-orange-700">
                  <p>Doublons potentiels: {realMetrics.veracity.consistency.potential_duplicates}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Call to Action */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-green-600 rounded-2xl p-8 text-white">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">
              🚀 Big Data FNI - Données Réelles Connectées
            </h2>
            <p className="text-xl opacity-90 mb-6">
              {realMetrics?.volume?.total_records?.toLocaleString()} enregistrements • 
              Qualité {realMetrics?.veracity?.overall_quality_score} • 
              Performance {realMetrics?.velocity?.avg_query_latency}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 text-center">
                <Database className="h-8 w-8 mx-auto mb-2" />
                <h3 className="font-semibold">Volume</h3>
                <p className="text-sm opacity-90">Données réelles PostgreSQL</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 text-center">
                <Zap className="h-8 w-8 mx-auto mb-2" />
                <h3 className="font-semibold">Vélocité</h3>
                <p className="text-sm opacity-90">Performance mesurée</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 text-center">
                <Layers className="h-8 w-8 mx-auto mb-2" />
                <h3 className="font-semibold">Variété</h3>
                <p className="text-sm opacity-90">Sources multiples</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 text-center">
                <Shield className="h-8 w-8 mx-auto mb-2" />
                <h3 className="font-semibold">Véracité</h3>
                <p className="text-sm opacity-90">Qualité calculée</p>
              </div>
            </div>
            
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <button 
                onClick={runBatchProcessing}
                disabled={isProcessing}
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-6 py-3 rounded-xl font-semibold transition-all duration-200 hover:scale-105 flex items-center space-x-2"
              >
                <Workflow className="h-5 w-5" />
                <span>Traitement Big Data</span>
              </button>
              <button 
                onClick={loadPerformanceAnalysis}
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-6 py-3 rounded-xl font-semibold transition-all duration-200 hover:scale-105 flex items-center space-x-2"
              >
                <BarChart3 className="h-5 w-5" />
                <span>Analyse Performance</span>
              </button>
              <button 
                onClick={loadRealBigDataMetrics}
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-6 py-3 rounded-xl font-semibold transition-all duration-200 hover:scale-105 flex items-center space-x-2"
              >
                <RefreshCw className="h-5 w-5" />
                <span>Actualiser métriques</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealBigDataDashboard;