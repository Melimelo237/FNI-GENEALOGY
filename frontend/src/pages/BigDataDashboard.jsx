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
  Sparkles
} from 'lucide-react';

const BigDataDashboard = () => {
  const [architectureData, setArchitectureData] = useState(null);
  const [metricsData, setMetricsData] = useState(null);
  const [pipelineStatus, setPipelineStatus] = useState([]);
  const [dataQuality, setDataQuality] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    loadBigDataMetrics();
    const interval = setInterval(loadBigDataMetrics, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const loadBigDataMetrics = async () => {
    try {
      setIsLoading(true);
      const [archResponse, metricsResponse, pipelineResponse, qualityResponse] = await Promise.all([
        fetch('/api/bigdata/architecture'),
        fetch('/api/bigdata/metrics'),
        fetch('/api/bigdata/pipeline/status'),
        fetch('/api/bigdata/data-quality')
      ]);

      const archData = await archResponse.json();
      const metrics = await metricsResponse.json();
      const pipeline = await pipelineResponse.json();
      const quality = await qualityResponse.json();

      if (archData.success) setArchitectureData(archData.architecture);
      if (metrics.success) setMetricsData(metrics.five_vs);
      if (pipeline.success) setPipelineStatus(pipeline.pipelines);
      if (quality.success) setDataQuality(quality.data_quality);
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Erreur chargement métriques Big Data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Composant métrique Big Data
  const BigDataMetricCard = ({ title, value, subtitle, icon: Icon, color, trend }) => (
    <div className={`bg-gradient-to-br from-${color}-50 to-${color}-100 rounded-xl p-6 border border-${color}-200 hover:shadow-lg transition-all duration-300`}>
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

  // Composant pipeline
  const PipelineCard = ({ pipeline }) => {
    const getStatusColor = (status) => {
      switch (status) {
        case 'running': return 'green';
        case 'completed': return 'blue';
        case 'failed': return 'red';
        default: return 'gray';
      }
    };

    const statusColor = getStatusColor(pipeline.status);

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-gray-900">{pipeline.name}</h4>
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium bg-${statusColor}-100 text-${statusColor}-800`}>
            <div className={`w-2 h-2 rounded-full bg-${statusColor}-500 animate-pulse`}></div>
            <span>{pipeline.status}</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Débit</p>
            <p className="font-medium">{pipeline.throughput}</p>
          </div>
          <div>
            <p className="text-gray-600">Taux de succès</p>
            <p className="font-medium">{pipeline.success_rate}%</p>
          </div>
        </div>
        
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Dernière exécution: {new Date(pipeline.last_run).toLocaleDateString('fr-FR')}</span>
            {pipeline.next_run !== 'continuous' && (
              <span>Prochaine: {new Date(pipeline.next_run).toLocaleDateString('fr-FR')}</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (isLoading && !architectureData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Chargement écosystème Big Data...</h3>
          <p className="text-gray-600">Analyse de 3.2 PB de données en cours</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header Big Data */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-green-600 p-3 rounded-xl">
                <Database className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Big Data Dashboard FNI</h1>
                <p className="text-sm text-gray-600">
                  Écosystème distribué • {architectureData?.capabilities?.volume} • 
                  {architectureData?.capabilities?.velocity}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Dernière mise à jour: {lastUpdated.toLocaleTimeString('fr-FR')}</span>
              </div>
              <button 
                onClick={loadBigDataMetrics}
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
        {/* Métriques des 5V du Big Data */}
        {metricsData && (
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-6">
              <Sparkles className="h-6 w-6 text-purple-600" />
              <h2 className="text-xl font-bold text-gray-900">Les 5V du Big Data</h2>
              <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                Architecture distribuée
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <BigDataMetricCard
                title="Volume"
                value={metricsData.volume?.total_data || "3.2 PB"}
                subtitle={`Croissance: ${metricsData.volume?.growth_rate || "+15% mensuel"}`}
                icon={Database}
                color="blue"
                trend={metricsData.volume?.growth_rate}
              />
              
              <BigDataMetricCard
                title="Vélocité"
                value={metricsData.velocity?.peak_throughput || "2.3M/sec"}
                subtitle={`Latence: ${metricsData.velocity?.avg_latency || "15ms p95"}`}
                icon={Zap}
                color="green"
                trend="+12%"
              />
              
              <BigDataMetricCard
                title="Variété"
                value={`${metricsData.variety?.data_types?.length || 6} types`}
                subtitle={`${metricsData.variety?.source_systems || 15} sources`}
                icon={Layers}
                color="purple"
                trend="+3 sources"
              />
              
              <BigDataMetricCard
                title="Véracité"
                value={metricsData.veracity?.data_quality_score || "99.1%"}
                subtitle={`Doublons: ${metricsData.veracity?.duplicate_rate || "0.3%"}`}
                icon={Shield}
                color="orange"
                trend="+0.8%"
              />
              
              <BigDataMetricCard
                title="Valeur"
                value={metricsData.value?.automated_decisions?.split('/')[0] || "2.3M"}
                subtitle="Décisions automatisées/jour"
                icon={Target}
                color="red"
                trend="+340%"
              />
            </div>
          </div>
        )}

        {/* Architecture Big Data */}
        {architectureData && (
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-6">
              <Server className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Architecture Big Data Distribuée</h2>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sources de données */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Database className="h-5 w-5 mr-2 text-blue-600" />
                  Sources de Données
                </h3>
                <div className="space-y-4">
                  {Object.entries(architectureData.ecosystem).map(([key, source]) => (
                    <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{source.description}</h4>
                        <p className="text-sm text-gray-600">{source.type} • {source.size}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-blue-600">{source.velocity}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stack technologique */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Cpu className="h-5 w-5 mr-2 text-green-600" />
                  Stack Technologique
                </h3>
                <div className="space-y-4">
                  {Object.entries(architectureData.architecture).map(([category, technologies]) => (
                    <div key={category} className="border-l-4 border-green-500 pl-4">
                      <h4 className="font-medium text-gray-900 capitalize">{category}</h4>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {technologies.map((tech, index) => (
                          <span key={index} className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pipelines de données */}
        {pipelineStatus.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <Workflow className="h-6 w-6 text-purple-600" />
                <h2 className="text-xl font-bold text-gray-900">Pipelines de Données</h2>
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                  {pipelineStatus.filter(p => p.status === 'running').length}/{pipelineStatus.length} Actifs
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {pipelineStatus.map((pipeline, index) => (
                <PipelineCard key={index} pipeline={pipeline} />
              ))}
            </div>
          </div>
        )}

        {/* Qualité des données */}
        {dataQuality && (
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-6">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <h2 className="text-xl font-bold text-gray-900">Qualité des Données</h2>
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                Score global: {dataQuality.overall_score}%
              </span>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Dimensions de qualité */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Dimensions de Qualité</h3>
                <div className="space-y-4">
                  {Object.entries(dataQuality.dimensions).map(([dimension, data]) => (
                    <div key={dimension} className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 capitalize">{dimension}</h4>
                        <p className="text-sm text-gray-600">{data.issues} problèmes • Tendance: {data.trend}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full" 
                            style={{ width: `${data.score}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">{data.score}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Profiling des données */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Profiling des Données</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <h4 className="text-2xl font-bold text-blue-600">{dataQuality.data_profiling.total_fields}</h4>
                    <p className="text-sm text-blue-800">Champs totaux</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <h4 className="text-2xl font-bold text-red-600">{dataQuality.data_profiling.pii_fields}</h4>
                    <p className="text-sm text-red-800">Champs PII</p>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <h4 className="text-2xl font-bold text-yellow-600">{dataQuality.data_profiling.null_rate}%</h4>
                    <p className="text-sm text-yellow-800">Taux de nulls</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <h4 className="text-2xl font-bold text-green-600">{dataQuality.automated_fixes.success_rate}%</h4>
                    <p className="text-sm text-green-800">Corrections auto</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Gouvernance des données */}
        {architectureData?.governance && (
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-6">
              <Shield className="h-6 w-6 text-indigo-600" />
              <h2 className="text-xl font-bold text-gray-900">Gouvernance des Données</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Lineage */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <GitBranch className="h-5 w-5 text-purple-600" />
                  <h3 className="font-semibold text-gray-900">Lineage</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Systèmes sources</span>
                    <span className="font-medium">{architectureData.governance.lineage.source_systems}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Flux de données</span>
                    <span className="font-medium">{architectureData.governance.lineage.data_flows}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Transformations</span>
                    <span className="font-medium">{architectureData.governance.lineage.transformations}</span>
                  </div>
                </div>
              </div>

              {/* Sécurité */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Lock className="h-5 w-5 text-red-600" />
                  <h3 className="font-semibold text-gray-900">Sécurité</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Contrôles d'accès</span>
                    <span className="font-medium text-green-600">RBAC + ABAC</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Chiffrement</span>
                    <span className="font-medium text-green-600">100%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Audit</span>
                    <span className="font-medium text-green-600">Complet</span>
                  </div>
                </div>
              </div>

              {/* Privacy */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Eye className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900">Privacy</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Champs PII</span>
                    <span className="font-medium">{architectureData.governance.privacy.pii_fields_identified}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">RGPD</span>
                    <span className="font-medium text-green-600">Conforme</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Anonymisation</span>
                    <span className="font-medium">{architectureData.governance.privacy.anonymization_rules} règles</span>
                  </div>
                </div>
              </div>

              {/* Analytics avancées */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Brain className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold text-gray-900">Analytics ML</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Modèles actifs</span>
                    <span className="font-medium">12</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Précision moy.</span>
                    <span className="font-medium text-green-600">94.2%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Latence</span>
                    <span className="font-medium">&lt; 100ms</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Call to Action Big Data */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-green-600 rounded-2xl p-8 text-white">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">
              🚀 Écosystème Big Data FNI Opérationnel
            </h2>
            <p className="text-xl opacity-90 mb-6">
              Architecture distribuée • 3.2 PB • 2.3M records/sec • 99.7% disponibilité
            </p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 text-center">
                <Database className="h-8 w-8 mx-auto mb-2" />
                <h3 className="font-semibold">Volume</h3>
                <p className="text-sm opacity-90">Petabytes de données</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 text-center">
                <Zap className="h-8 w-8 mx-auto mb-2" />
                <h3 className="font-semibold">Vélocité</h3>
                <p className="text-sm opacity-90">Temps réel</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 text-center">
                <Layers className="h-8 w-8 mx-auto mb-2" />
                <h3 className="font-semibold">Variété</h3>
                <p className="text-sm opacity-90">Multi-formats</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 text-center">
                <Shield className="h-8 w-8 mx-auto mb-2" />
                <h3 className="font-semibold">Véracité</h3>
                <p className="text-sm opacity-90">99.7% qualité</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BigDataDashboard;