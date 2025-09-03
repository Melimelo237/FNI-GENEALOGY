// src/pages/Dashboard.jsx - VERSION COMPLÈTE
import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  TreePine, 
  AlertTriangle, 
  MessageCircle,
  Search,
  BarChart3,
  Shield,
  ChevronRight,
  Activity,
  Database,
  Clock,
  TrendingUp,
  CheckCircle,
  Eye,
  Bell,
  Server,
  Zap
} from 'lucide-react';
import StatCard from '../components/common/StatCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { useApi } from '../hooks/useApi';
import { healthService, personService } from '../services/api';

const Dashboard = () => {
  const { 
    data: healthData, 
    loading: healthLoading, 
    error: healthError, 
    refetch: refetchHealth 
  } = useApi(() => healthService.check());
  
  const { 
    data: statsData, 
    loading: statsLoading, 
    error: statsError, 
    refetch: refetchStats 
  } = useApi(() => personService.getStats());

  const quickActions = [
    {
      title: 'Recherche Citoyens',
      description: 'Rechercher des personnes dans la base FNI avec filtres avancés',
      icon: Search,
      color: 'blue',
      href: '/search',
      stats: 'Base de données active'
    },
    {
      title: 'Arbres Généalogiques',
      description: 'Générer et visualiser des arbres familiaux interactifs',
      icon: TreePine,
      color: 'green',
      href: '/genealogy',
      stats: 'Algorithme IA intégré'
    },
    {
      title: 'Analyses Démographiques',
      description: 'Statistiques et tendances de la population camerounaise',
      icon: BarChart3,
      color: 'purple',
      href: '/analytics',
      stats: 'Temps réel'
    },
    {
      title: 'Détection de Fraudes',
      description: 'Identifier les anomalies et incohérences dans les données',
      icon: Shield,
      color: 'red',
      href: '/fraud',
      stats: 'Surveillance active'
    },
    {
      title: 'Assistant IA',
      description: 'Aide intelligente pour les procédures d\'état civil',
      icon: MessageCircle,
      color: 'yellow',
      href: '/chat',
      stats: 'Disponible 24h/24'
    }
  ];

  const getSystemStats = () => {
    if (!healthData || !statsData) return [];
    
    return [
      {
        title: 'Citoyens Enregistrés',
        value: statsData.stats?.total?.toLocaleString() || '0',
        change: '+2.3%',
        period: '7 derniers jours',
        icon: Users,
        color: 'blue'
      },
      {
        title: 'Hommes',
        value: statsData.stats?.male?.toLocaleString() || '0',
        change: `${statsData.stats?.malePercentage || 0}%`,
        period: 'du total',
        icon: Users,
        color: 'blue'
      },
      {
        title: 'Femmes',
        value: statsData.stats?.female?.toLocaleString() || '0',
        change: `${statsData.stats?.femalePercentage || 0}%`,
        period: 'du total',
        icon: Users,
        color: 'green'
      },
      {
        title: 'Enregistrements BD',
        value: healthData.total_records?.toLocaleString() || '0',
        change: '+15.7%',
        period: 'Ce mois',
        icon: Database,
        color: 'purple'
      }
    ];
  };

  const getRecentActivities = () => [
    {
      icon: Search,
      text: '147 nouvelles recherches effectuées',
      time: 'Dernière heure',
      color: 'blue'
    },
    {
      icon: TreePine,
      text: '23 arbres généalogiques générés',
      time: 'Aujourd\'hui',
      color: 'green'
    },
    {
      icon: AlertTriangle,
      text: '5 anomalies détectées et traitées',
      time: '24 dernières heures',
      color: 'red'
    },
    {
      icon: MessageCircle,
      text: '89 interactions avec l\'assistant IA',
      time: 'Ce matin',
      color: 'purple'
    },
    {
      icon: Users,
      text: '456 nouveaux enregistrements ajoutés',
      time: 'Cette semaine',
      color: 'blue'
    }
  ];

  const getSystemStatus = () => [
    {
      service: 'Base de données PostgreSQL',
      status: 'operational',
      icon: Database,
      details: `${healthData?.total_records?.toLocaleString() || '0'} enregistrements`
    },
    {
      service: 'APIs Backend Node.js',
      status: 'operational',
      icon: Server,
      details: '5 endpoints actifs'
    },
    {
      service: 'Moteur de recherche FNI',
      status: 'operational',
      icon: Search,
      details: 'Index optimisé'
    },
    {
      service: 'Système de détection fraudes',
      status: 'operational',
      icon: Shield,
      details: 'Analyse en temps réel'
    },
    {
      service: 'Assistant IA conversationnel',
      status: 'operational',
      icon: MessageCircle,
      details: 'Modèle entraîné'
    }
  ];

  if (healthLoading || statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" text="Chargement du tableau de bord..." />
      </div>
    );
  }

  if (healthError || statsError) {
    return (
      <ErrorMessage 
        error={healthError || statsError} 
        onRetry={() => {
          refetchHealth();
          refetchStats();
        }}
      />
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero Section */}
      <div className="text-center relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-4xl md:text-5xl font-bold text-gradient mb-4">
            Système FNI Généalogique
          </h1>
          <p className="text-xl text-gray-600 mb-2 max-w-3xl mx-auto">
            Bureau National de l'État Civil - République du Cameroun
          </p>
          <p className="text-lg text-gray-500 mb-6">
            Plateforme intelligente d'exploitation des données d'état civil
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-500 mb-8">
            <div className="flex items-center space-x-2 bg-white/50 px-4 py-2 rounded-full">
              <Activity className="h-4 w-4 text-green-500 animate-pulse" />
              <span>Système opérationnel</span>
            </div>
            <div className="flex items-center space-x-2 bg-white/50 px-4 py-2 rounded-full">
              <Clock className="h-4 w-4 text-blue-500" />
              <span>Dernière sync: {new Date().toLocaleTimeString('fr-FR')}</span>
            </div>
            <div className="flex items-center space-x-2 bg-white/50 px-4 py-2 rounded-full">
              <Database className="h-4 w-4 text-purple-500" />
              <span>{healthData?.total_records?.toLocaleString() || '0'} enregistrements</span>
            </div>
          </div>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full opacity-5">
          <div className="absolute top-10 left-10 animate-float">
            <TreePine className="h-16 w-16 text-fni-green-600" />
          </div>
          <div className="absolute top-20 right-20 animate-float" style={{ animationDelay: '1s' }}>
            <Users className="h-12 w-12 text-fni-blue-600" />
          </div>
          <div className="absolute bottom-10 left-1/4 animate-float" style={{ animationDelay: '2s' }}>
            <BarChart3 className="h-14 w-14 text-purple-600" />
          </div>
        </div>
      </div>

      {/* System Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {getSystemStats().map((stat, index) => (
          <div key={index} className="animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
            <StatCard {...stat} />
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Actions Rapides</h2>
          <p className="text-gray-600 text-lg">
            Accédez rapidement aux fonctionnalités principales du système
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quickActions.map((action, index) => (
            <QuickActionCard key={action.title} {...action} delay={index * 0.1} />
          ))}
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* System Status */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900 flex items-center">
              <Server className="h-6 w-6 mr-3 text-fni-blue-600" />
              État des Services
            </h3>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-600 font-medium">Tous opérationnels</span>
            </div>
          </div>
          
          <div className="space-y-4">
            {getSystemStatus().map((item, index) => (
              <SystemStatusItem key={index} {...item} />
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900 flex items-center">
              <TrendingUp className="h-6 w-6 mr-3 text-fni-green-600" />
              Activité Récente
            </h3>
            <button className="text-fni-blue-600 hover:text-fni-blue-700 text-sm font-medium flex items-center">
              Voir tout
              <ChevronRight className="h-4 w-4 ml-1" />
            </button>
          </div>
          
          <div className="space-y-4">
            {getRecentActivities().map((activity, index) => (
              <ActivityItem key={index} {...activity} delay={index * 0.1} />
            ))}
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-fni-blue-50 to-fni-blue-100 rounded-2xl p-6 border border-fni-blue-200">
          <div className="flex items-center space-x-4 mb-4">
            <div className="bg-fni-blue-600 p-3 rounded-xl">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-fni-blue-900">Performance</h4>
              <p className="text-sm text-fni-blue-700">Temps de réponse moyen</p>
            </div>
          </div>
          <div className="text-3xl font-bold text-fni-blue-800 mb-2">0.24s</div>
          <div className="flex items-center text-sm text-fni-blue-600">
            <TrendingUp className="h-3 w-3 mr-1" />
            <span>15% plus rapide ce mois</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-fni-green-50 to-fni-green-100 rounded-2xl p-6 border border-fni-green-200">
          <div className="flex items-center space-x-4 mb-4">
            <div className="bg-fni-green-600 p-3 rounded-xl">
              <Eye className="h-6 w-6 text-white" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-fni-green-900">Disponibilité</h4>
              <p className="text-sm text-fni-green-700">Uptime du système</p>
            </div>
          </div>
          <div className="text-3xl font-bold text-fni-green-800 mb-2">99.9%</div>
          <div className="flex items-center text-sm text-fni-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            <span>30 derniers jours</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200">
          <div className="flex items-center space-x-4 mb-4">
            <div className="bg-purple-600 p-3 rounded-xl">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-purple-900">Sécurité</h4>
              <p className="text-sm text-purple-700">Incidents détectés</p>
            </div>
          </div>
          <div className="text-3xl font-bold text-purple-800 mb-2">0</div>
          <div className="flex items-center text-sm text-purple-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            <span>Cette semaine</span>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="bg-gradient-to-r from-fni-blue-600 via-fni-blue-700 to-fni-green-600 rounded-2xl p-8 text-white text-center relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Explorez le Patrimoine Familial Camerounais
          </h2>
          <p className="text-xl opacity-90 mb-8 max-w-3xl mx-auto">
            Utilisez l'intelligence artificielle pour découvrir vos racines, 
            analyser les tendances démographiques et préserver l'histoire familiale.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4">
            <Link 
              to="/search" 
              className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-8 py-3 rounded-xl font-semibold transition-all duration-200 hover:scale-105"
            >
              Commencer une recherche
            </Link>
            <Link 
              to="/genealogy" 
              className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-8 py-3 rounded-xl font-semibold transition-all duration-200 hover:scale-105"
            >
              Créer un arbre généalogique
            </Link>
            <Link 
              to="/chat" 
              className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-8 py-3 rounded-xl font-semibold transition-all duration-200 hover:scale-105"
            >
              Poser une question
            </Link>
          </div>
        </div>
        
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 left-8 animate-float">
            <TreePine className="h-20 w-20" />
          </div>
          <div className="absolute bottom-8 right-12 animate-float" style={{ animationDelay: '1.5s' }}>
            <Users className="h-16 w-16" />
          </div>
          <div className="absolute top-1/2 left-1/4 animate-float" style={{ animationDelay: '3s' }}>
            <BarChart3 className="h-12 w-12" />
          </div>
        </div>
      </div>
    </div>
  );
};

// Composant QuickActionCard
const QuickActionCard = ({ title, description, icon: Icon, color, href, stats, delay = 0 }) => {
  const colorClasses = {
    blue: 'from-fni-blue-50 to-fni-blue-100 border-fni-blue-200 hover:border-fni-blue-300 hover:shadow-fni-blue-100',
    green: 'from-fni-green-50 to-fni-green-100 border-fni-green-200 hover:border-fni-green-300 hover:shadow-fni-green-100',
    red: 'from-red-50 to-red-100 border-red-200 hover:border-red-300 hover:shadow-red-100',
    purple: 'from-purple-50 to-purple-100 border-purple-200 hover:border-purple-300 hover:shadow-purple-100',
    yellow: 'from-yellow-50 to-yellow-100 border-yellow-200 hover:border-yellow-300 hover:shadow-yellow-100',
  };

  const iconColorClasses = {
    blue: 'bg-fni-blue-600 text-white',
    green: 'bg-fni-green-600 text-white',
    red: 'bg-red-600 text-white',
    purple: 'bg-purple-600 text-white',
    yellow: 'bg-yellow-600 text-white',
  };

  return (
    <Link 
      to={href}
      className={`group block bg-gradient-to-br ${colorClasses[color]} border rounded-2xl p-6 hover:shadow-xl hover:scale-105 transition-all duration-300 animate-slide-up`}
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-4 rounded-xl ${iconColorClasses[color]} group-hover:scale-110 transition-transform duration-200`}>
          <Icon className="h-8 w-8" />
        </div>
        <ChevronRight className="h-6 w-6 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all duration-200" />
      </div>
      
      <div className="space-y-3">
        <h3 className="text-xl font-bold text-gray-900 group-hover:text-gray-700 transition-colors">
          {title}
        </h3>
        <p className="text-gray-600 leading-relaxed">
          {description}
        </p>
        <div className="flex items-center space-x-2 text-sm font-medium text-gray-500">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>{stats}</span>
        </div>
      </div>
    </Link>
  );
};

// Composant ActivityItem
const ActivityItem = ({ icon: Icon, text, time, color, delay = 0 }) => {
  const colorClasses = {
    blue: 'bg-fni-blue-100 text-fni-blue-600',
    green: 'bg-fni-green-100 text-fni-green-600',
    red: 'bg-red-100 text-red-600',
    purple: 'bg-purple-100 text-purple-600',
  };

  return (
    <div 
      className="flex items-start space-x-4 p-4 hover:bg-gray-50 rounded-xl transition-colors animate-slide-up"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className={`p-2 rounded-lg flex-shrink-0 ${colorClasses[color]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 mb-1">{text}</p>
        <div className="flex items-center space-x-2">
          <Clock className="h-3 w-3 text-gray-400" />
          <p className="text-xs text-gray-500">{time}</p>
        </div>
      </div>
    </div>
  );
};

// Composant SystemStatusItem
const SystemStatusItem = ({ service, status, icon: Icon, details }) => {
  const statusColors = {
    operational: 'text-green-600 bg-green-100',
    warning: 'text-yellow-600 bg-yellow-100',
    error: 'text-red-600 bg-red-100'
  };

  const statusLabels = {
    operational: 'Opérationnel',
    warning: 'Attention',
    error: 'Erreur'
  };

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      <div className="flex items-center space-x-3">
        <Icon className="h-5 w-5 text-gray-600" />
        <div>
          <p className="font-medium text-gray-900">{service}</p>
          <p className="text-xs text-gray-500">{details}</p>
        </div>
      </div>
      <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusColors[status]}`}>
        {statusLabels[status]}
      </span>
    </div>
  );
};

export default Dashboard;