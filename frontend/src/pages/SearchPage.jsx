// src/pages/SearchPage.jsx
// src/pages/SearchPageAdvanced.jsx - VERSION FINALE IA & BIG DATA
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Search, 
  Filter, 
  User, 
  MapPin, 
  Calendar, 
  Download,
  FileSpreadsheet,
  Eye,
  Settings,
  Zap,
  Brain,
  Target,
  Map,
  Users,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Loader2,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Database,
  Cpu,
  Globe,
  BookOpen,
  Star,
  ArrowRight,
  RefreshCw,
  HelpCircle,
  BarChart3,
  Hash,
  UserCheck,
  MapIcon,
  CalendarDays,
  Phone,
  FileText,
  ExternalLink
} from 'lucide-react';
import { debounce } from '../utils/helpers';

const SearchPage = () => {
  // États principaux
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  const [searchMode, setSearchMode] = useState('intelligent'); // 'intelligent', 'exact', 'phonetic'
  
  // Filtres avancés
  const [filters, setFilters] = useState({
    gender: '',
    birthPlace: '',
    birthDateFrom: '',
    birthDateTo: '',
    ageRange: [0, 100],
    region: '',
    civilCenter: '',
    profession: '',
    nationality: '',
    hasParents: null,
    hasChildren: null,
    documentType: 'all'
  });

  // États IA et analytics
  const [searchStats, setSearchStats] = useState({
    totalQueries: 0,
    avgResponseTime: 0,
    popularTerms: [],
    searchAccuracy: 0
  });
  const [aiInsights, setAiInsights] = useState([]);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  
  // États UI
  const [activeTab, setActiveTab] = useState('results'); // 'results', 'map', 'analytics', 'export'
  const [viewMode, setViewMode] = useState('list'); // 'list', 'grid', 'timeline'
  const [sortBy, setSortBy] = useState('relevance'); // 'relevance', 'date', 'name', 'location'
  
  // Références
  const searchInputRef = useRef(null);
  const mapContainerRef = useRef(null);

  // Régions du Cameroun pour les filtres géographiques
  const cameroonRegions = [
    'Adamaoua', 'Centre', 'Est', 'Extrême-Nord', 'Littoral',
    'Nord', 'Nord-Ouest', 'Ouest', 'Sud', 'Sud-Ouest'
  ];

  // Fonction de recherche intelligente avec IA
  const performIntelligentSearch = useCallback(
    debounce(async (query, appliedFilters = {}) => {
      if (!query.trim()) {
        setSearchResults([]);
        setSuggestions([]);
        return;
      }

      setIsLoading(true);
      const startTime = Date.now();

      try {
        // 1. Recherche principale avec algorithmes IA
        const searchPayload = {
          q: query,
          mode: searchMode,
          ...appliedFilters,
          limit: 100,
          enablePhonetic: searchMode === 'phonetic' || searchMode === 'intelligent',
          enableFuzzy: searchMode === 'intelligent',
          enableSemantic: searchMode === 'intelligent',
          sortBy,
          includeRelations: true,
          includeAnalytics: true
        };

        const [searchResponse, suggestionsResponse] = await Promise.all([
          fetch('/api/persons/search-advanced', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(searchPayload)
          }),
          // Auto-suggestions intelligentes
          query.length > 2 ? fetch(`/api/persons/suggestions?q=${encodeURIComponent(query)}&limit=10`) : Promise.resolve({ json: () => ({ suggestions: [] }) })
        ]);

        const searchData = await searchResponse.json();
        const suggestionsData = await suggestionsResponse.json();

        if (searchData.success) {
          setSearchResults(searchData.results || []);
          setSuggestions(suggestionsData.suggestions || []);
          
          // Mettre à jour les stats de recherche
          const responseTime = Date.now() - startTime;
          setSearchStats(prev => ({
            ...prev,
            totalQueries: prev.totalQueries + 1,
            avgResponseTime: Math.round((prev.avgResponseTime * (prev.totalQueries - 1) + responseTime) / prev.totalQueries),
            searchAccuracy: searchData.analytics?.accuracy || prev.searchAccuracy
          }));

          // Générer des insights IA si beaucoup de résultats
          if (searchData.results?.length > 10) {
            await generateSearchInsights(searchData.results, query);
          }
        } else {
          setSearchResults([]);
          console.error('Erreur de recherche:', searchData.error);
        }
      } catch (error) {
        console.error('Erreur lors de la recherche:', error);
        setSearchResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    [searchMode, sortBy]
  );

  // Génération d'insights IA sur les résultats
  const generateSearchInsights = async (results, query) => {
    setIsProcessingAI(true);
    try {
      const response = await fetch('/api/analytics/search-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          results: results.slice(0, 50), // Limiter pour éviter surcharge
          query,
          searchMode
        })
      });

      const data = await response.json();
      if (data.success) {
        setAiInsights(data.insights || []);
      }
    } catch (error) {
      console.error('Erreur génération insights:', error);
    } finally {
      setIsProcessingAI(false);
    }
  };

  // Export des résultats en PDF
  const exportToPDF = async () => {
    if (searchResults.length === 0) return;

    try {
      const response = await fetch('/api/export/search-results-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          results: searchResults,
          query: searchQuery,
          filters,
          metadata: {
            exportDate: new Date().toISOString(),
            totalResults: searchResults.length,
            searchMode
          }
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `recherche-fni-${Date.now()}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Erreur export PDF:', error);
    }
  };

  // Export des résultats en Excel
  const exportToExcel = async () => {
    if (searchResults.length === 0) return;

    try {
      const response = await fetch('/api/export/search-results-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          results: searchResults,
          query: searchQuery,
          filters
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `donnees-fni-${Date.now()}.xlsx`;
        link.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Erreur export Excel:', error);
    }
  };

  // Gestion des changements de filtres
  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    if (searchQuery.trim()) {
      performIntelligentSearch(searchQuery, newFilters);
    }
  };

  // Reset des filtres
  const resetFilters = () => {
    const emptyFilters = {
      gender: '',
      birthPlace: '',
      birthDateFrom: '',
      birthDateTo: '',
      ageRange: [0, 100],
      region: '',
      civilCenter: '',
      profession: '',
      nationality: '',
      hasParents: null,
      hasChildren: null,
      documentType: 'all'
    };
    setFilters(emptyFilters);
    if (searchQuery.trim()) {
      performIntelligentSearch(searchQuery, emptyFilters);
    }
  };

  // Composant de suggestion intelligente
  const SuggestionItem = ({ suggestion, onClick }) => (
    <div
      className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
      onClick={() => onClick(suggestion)}
    >
      <div className="flex items-center space-x-3">
        <div className="bg-blue-100 p-2 rounded-lg">
          {suggestion.type === 'person' ? <User className="h-4 w-4 text-blue-600" /> :
           suggestion.type === 'place' ? <MapPin className="h-4 w-4 text-green-600" /> :
           <Search className="h-4 w-4 text-purple-600" />}
        </div>
        <div>
          <p className="font-medium text-gray-900">{suggestion.text}</p>
          <p className="text-xs text-gray-500">
            {suggestion.type === 'person' ? `${suggestion.count} correspondance(s)` :
             suggestion.type === 'place' ? `Lieu: ${suggestion.region}` :
             'Suggestion IA'}
          </p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        {suggestion.confidence && (
          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
            {suggestion.confidence}%
          </span>
        )}
        <ArrowRight className="h-4 w-4 text-gray-400" />
      </div>
    </div>
  );

  // Composant de résultat de recherche enrichi
  const SearchResultCard = ({ person, index }) => {
    const age = person.birthDate ? 
      new Date().getFullYear() - new Date(person.birthDate).getFullYear() : 
      null;

    return (
      <div 
        className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => setSelectedResult(person)}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start space-x-4">
            <div className="bg-gradient-to-br from-blue-500 to-green-500 p-3 rounded-xl">
              <User className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <h3 className="text-lg font-semibold text-gray-900">{person.fullName}</h3>
                <span className="text-lg">
                  {person.gender === '1' || person.gender === 'M' ? '♂️' : 
                   person.gender === '2' || person.gender === 'F' ? '♀️' : '👤'}
                </span>
                {person.matchScore && (
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                    Match: {person.matchScore}%
                  </span>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {person.birthDate ? 
                      `${new Date(person.birthDate).toLocaleDateString('fr-FR')}${age ? ` (${age} ans)` : ''}` :
                      'Date non renseignée'
                    }
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4" />
                  <span>{person.birthPlace || 'Lieu non renseigné'}</span>
                </div>
                
                {person.father && (
                  <div className="flex items-center space-x-2">
                    <UserCheck className="h-4 w-4" />
                    <span><strong>Père:</strong> {person.father}</span>
                  </div>
                )}
                
                {person.mother && (
                  <div className="flex items-center space-x-2">
                    <UserCheck className="h-4 w-4" />
                    <span><strong>Mère:</strong> {person.mother}</span>
                  </div>
                )}
                
                {person.actNumber && (
                  <div className="flex items-center space-x-2">
                    <Hash className="h-4 w-4" />
                    <span><strong>N° Acte:</strong> {person.actNumber}</span>
                  </div>
                )}
                
                {person.civilCenter && (
                  <div className="flex items-center space-x-2">
                    <MapIcon className="h-4 w-4" />
                    <span><strong>Centre:</strong> {person.civilCenter}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <span className="text-xs text-gray-500">Résultat #{index + 1}</span>
            {person.relations && (
              <div className="mt-2 flex flex-col space-y-1">
                {person.relations.siblings > 0 && (
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                    {person.relations.siblings} frère(s)/sœur(s)
                  </span>
                )}
                {person.relations.children > 0 && (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                    {person.relations.children} enfant(s)
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        
        {person.aiHighlights && (
          <div className="bg-blue-50 rounded-lg p-3 mt-4">
            <div className="flex items-center space-x-2 mb-2">
              <Brain className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Points saillants IA</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {person.aiHighlights.map((highlight, idx) => (
                <span key={idx} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                  {highlight}
                </span>
              ))}
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center space-x-4">
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center space-x-1">
              <Eye className="h-4 w-4" />
              <span>Voir détails</span>
            </button>
            <button className="text-green-600 hover:text-green-700 text-sm font-medium flex items-center space-x-1">
              <Users className="h-4 w-4" />
              <span>Arbre généalogique</span>
            </button>
          </div>
          
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            {person.lastUpdated && (
              <>
                <Clock className="h-3 w-3" />
                <span>Mis à jour: {new Date(person.lastUpdated).toLocaleDateString('fr-FR')}</span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Composant d'insight IA
  const AIInsightCard = ({ insight }) => (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200">
      <div className="flex items-start space-x-3">
        <div className="bg-purple-100 p-2 rounded-lg">
          <Brain className="h-5 w-5 text-purple-600" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-purple-900 mb-2">{insight.title}</h4>
          <p className="text-sm text-purple-800 mb-3">{insight.description}</p>
          {insight.recommendations && (
            <div className="space-y-1">
              {insight.recommendations.map((rec, idx) => (
                <div key={idx} className="flex items-center space-x-2">
                  <Target className="h-3 w-3 text-purple-600" />
                  <span className="text-xs text-purple-700">{rec}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
              Confiance: {insight.confidence}%
            </span>
            <span className="text-xs text-purple-600">
              IA • {insight.type}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  useEffect(() => {
    if (searchQuery.trim()) {
      performIntelligentSearch(searchQuery, filters);
    }
  }, [searchQuery, performIntelligentSearch, filters]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Header moderne */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-blue-600 to-green-600 p-3 rounded-xl">
                <Search className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Recherche Intelligente FNI</h1>
                <p className="text-sm text-gray-600">
                  Moteur de recherche IA • {searchStats.totalQueries} requêtes • 
                  {searchStats.avgResponseTime}ms avg
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Mode de recherche */}
              <select 
                value={searchMode}
                onChange={(e) => setSearchMode(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="intelligent">🧠 IA Intelligente</option>
                <option value="exact">🎯 Exacte</option>
                <option value="phonetic">🔊 Phonétique</option>
              </select>
              
              {/* Boutons d'export */}
              <div className="flex items-center space-x-2">
                <button 
                  onClick={exportToPDF}
                  disabled={searchResults.length === 0}
                  className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2 disabled:bg-gray-400 text-sm"
                >
                  <FileText className="h-4 w-4" />
                  <span>PDF</span>
                </button>
                <button 
                  onClick={exportToExcel}
                  disabled={searchResults.length === 0}
                  className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 disabled:bg-gray-400 text-sm"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>Excel</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="px-6 py-6">
        {/* Barre de recherche principale */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une personne... (ex: Jean KAMDEM, Yaoundé 1985, N° acte 123)"
              className="w-full pl-12 pr-20 py-4 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center space-x-2">
              {isLoading && <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />}
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Filter className="h-4 w-4" />
                <span>Filtres</span>
                {showAdvancedFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Suggestions intelligentes */}
          {suggestions.length > 0 && searchQuery.trim() && (
            <div className="mt-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="p-3 border-b border-gray-200">
                <div className="flex items-center space-x-2">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-gray-700">Suggestions IA</span>
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {suggestions.map((suggestion, index) => (
                  <SuggestionItem 
                    key={index} 
                    suggestion={suggestion} 
                    onClick={(s) => {
                      setSearchQuery(s.text);
                      setSuggestions([]);
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Filtres avancés */}
        {showAdvancedFilters && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Filtres Avancés</span>
              </h3>
              <button 
                onClick={resetFilters}
                className="text-gray-600 hover:text-gray-800 text-sm flex items-center space-x-1"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Réinitialiser</span>
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sexe</label>
                <select
                  value={filters.gender}
                  onChange={(e) => handleFilterChange('gender', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Tous</option>
                  <option value="1">♂️ Masculin</option>
                  <option value="2">♀️ Féminin</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Région</label>
                <select
                  value={filters.region}
                  onChange={(e) => handleFilterChange('region', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Toutes les régions</option>
                  {cameroonRegions.map(region => (
                    <option key={region} value={region}>{region}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Lieu de naissance</label>
                <input
                  type="text"
                  value={filters.birthPlace}
                  onChange={(e) => handleFilterChange('birthPlace', e.target.value)}
                  placeholder="Ex: Yaoundé"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date de naissance (de)</label>
                <input
                  type="date"
                  value={filters.birthDateFrom}
                  onChange={(e) => handleFilterChange('birthDateFrom', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date de naissance (à)</label>
                <input
                  type="date"
                  value={filters.birthDateTo}
                  onChange={(e) => handleFilterChange('birthDateTo', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Centre d'état civil</label>
                <input
                  type="text"
                  value={filters.civilCenter}
                  onChange={(e) => handleFilterChange('civilCenter', e.target.value)}
                  placeholder="Ex: Yaoundé 1er"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">A des parents connus</label>
                <select
                  value={filters.hasParents || ''}
                  onChange={(e) => handleFilterChange('hasParents', e.target.value === '' ? null : e.target.value === 'true')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Peu importe</option>
                  <option value="true">Oui</option>
                  <option value="false">Non</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type de document</label>
                <select
                  value={filters.documentType}
                  onChange={(e) => handleFilterChange('documentType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Tous les documents</option>
                  <option value="birth">Actes de naissance</option>
                  <option value="marriage">Actes de mariage</option>
                  <option value="death">Actes de décès</option>
                </select>
              </div>
            </div>
            
            {/* Filtres intelligents IA */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center space-x-2 mb-4">
                <Brain className="h-5 w-5 text-purple-600" />
                <span className="font-medium text-gray-900">Filtres Intelligents IA</span>
                <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs">BETA</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button className="flex items-center justify-center space-x-2 p-3 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors">
                  <Users className="h-4 w-4 text-purple-600" />
                  <span className="text-sm">Familles nombreuses</span>
                </button>
                <button className="flex items-center justify-center space-x-2 p-3 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors">
                  <MapPin className="h-4 w-4 text-blue-600" />
                  <span className="text-sm">Migration urbaine</span>
                </button>
                <button className="flex items-center justify-center space-x-2 p-3 border border-green-200 rounded-lg hover:bg-green-50 transition-colors">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Tendances récentes</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Onglets de navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setActiveTab('results')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'results' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>Résultats ({searchResults.length})</span>
                </div>
              </button>
              
              <button
                onClick={() => setActiveTab('analytics')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'analytics' 
                    ? 'bg-purple-100 text-purple-700' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-4 w-4" />
                  <span>Analytics IA</span>
                  {isProcessingAI && <Loader2 className="h-3 w-3 animate-spin" />}
                </div>
              </button>
              
              <button
                onClick={() => setActiveTab('map')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'map' 
                    ? 'bg-green-100 text-green-700' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Map className="h-4 w-4" />
                  <span>Carte Géo</span>
                </div>
              </button>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Tri et vue */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="relevance">Pertinence</option>
                <option value="date">Date de naissance</option>
                <option value="name">Nom alphabétique</option>
                <option value="location">Lieu de naissance</option>
              </select>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <BookOpen className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <div className="h-4 w-4 grid grid-cols-2 gap-0.5">
                    <div className="bg-current rounded-sm"></div>
                    <div className="bg-current rounded-sm"></div>
                    <div className="bg-current rounded-sm"></div>
                    <div className="bg-current rounded-sm"></div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Contenu des onglets */}
          <div className="p-6">
            {/* Onglet Résultats */}
            {activeTab === 'results' && (
              <div>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Recherche en cours...</h3>
                      <p className="text-gray-600">Analyse des données avec l'IA</p>
                    </div>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="text-center py-12">
                    {searchQuery.trim() ? (
                      <div>
                        <AlertCircle className="h-16 w-16 text-orange-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          Aucun résultat trouvé
                        </h3>
                        <p className="text-gray-600 mb-6">
                          Essayez avec des termes différents ou utilisez la recherche phonétique
                        </p>
                        <div className="flex flex-wrap justify-center gap-3">
                          <button 
                            onClick={() => setSearchMode('phonetic')}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                          >
                            Recherche phonétique
                          </button>
                          <button 
                            onClick={resetFilters}
                            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors text-sm"
                          >
                            Réinitialiser filtres
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          Moteur de Recherche Intelligent FNI
                        </h3>
                        <p className="text-gray-600 mb-6">
                          Commencez votre recherche en tapant un nom, lieu ou numéro d'acte
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                          <div className="bg-blue-50 rounded-lg p-4 text-center">
                            <User className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                            <h4 className="font-medium text-blue-900">Par Nom</h4>
                            <p className="text-sm text-blue-700">Jean KAMDEM</p>
                          </div>
                          <div className="bg-green-50 rounded-lg p-4 text-center">
                            <MapPin className="h-8 w-8 text-green-600 mx-auto mb-2" />
                            <h4 className="font-medium text-green-900">Par Lieu</h4>
                            <p className="text-sm text-green-700">Yaoundé, 1985</p>
                          </div>
                          <div className="bg-purple-50 rounded-lg p-4 text-center">
                            <Hash className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                            <h4 className="font-medium text-purple-900">Par N° Acte</h4>
                            <p className="text-sm text-purple-700">ACT-123456</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    {/* Statistiques de recherche */}
                    <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-4 mb-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <CheckCircle className="h-6 w-6 text-green-600" />
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {searchResults.length.toLocaleString()} résultat(s) trouvé(s)
                            </h3>
                            <p className="text-sm text-gray-600">
                              Mode: {searchMode === 'intelligent' ? 'IA Intelligente' : searchMode === 'exact' ? 'Recherche Exacte' : 'Phonétique'} • 
                              Temps: {searchStats.avgResponseTime}ms • 
                              Précision: {searchStats.searchAccuracy || 95}%
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {searchResults.some(r => r.matchScore) && (
                            <div className="text-right text-sm">
                              <p className="text-gray-600">Score de correspondance</p>
                              <div className="flex items-center space-x-1">
                                <Star className="h-4 w-4 text-yellow-500" />
                                <span className="font-medium">
                                  {Math.round(searchResults.filter(r => r.matchScore).reduce((acc, r) => acc + r.matchScore, 0) / searchResults.filter(r => r.matchScore).length)}%
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Résultats */}
                    <div className={`${viewMode === 'grid' ? 'grid grid-cols-1 lg:grid-cols-2 gap-6' : 'space-y-6'}`}>
                      {searchResults.map((person, index) => (
                        <SearchResultCard key={person.id || index} person={person} index={index} />
                      ))}
                    </div>
                    
                    {/* Pagination si beaucoup de résultats */}
                    {searchResults.length >= 100 && (
                      <div className="mt-8 text-center">
                        <p className="text-gray-600 mb-4">
                          Plus de 100 résultats trouvés. Affichage des 100 premiers.
                        </p>
                        <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
                          Charger plus de résultats
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Onglet Analytics IA */}
            {activeTab === 'analytics' && (
              <div>
                {aiInsights.length === 0 && !isProcessingAI ? (
                  <div className="text-center py-12">
                    <Brain className="h-16 w-16 text-purple-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Analytics IA
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Effectuez une recherche pour générer des insights intelligents
                    </p>
                    <button 
                      onClick={() => generateSearchInsights(searchResults, searchQuery)}
                      disabled={searchResults.length === 0}
                      className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-400 flex items-center space-x-2 mx-auto"
                    >
                      <Brain className="h-4 w-4" />
                      <span>Générer des insights</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
                        <Brain className="h-6 w-6 text-purple-600" />
                        <span>Insights Intelligence Artificielle</span>
                      </h3>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Cpu className="h-4 w-4" />
                        <span>Modèle GPT-4 • Confiance moyenne: 87%</span>
                      </div>
                    </div>
                    
                    {isProcessingAI ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="text-center">
                          <Loader2 className="h-8 w-8 text-purple-600 animate-spin mx-auto mb-3" />
                          <p className="text-gray-600">Analyse des patterns en cours...</p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {aiInsights.map((insight, index) => (
                          <AIInsightCard key={index} insight={insight} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Onglet Carte Géographique */}
            {activeTab === 'map' && (
              <div>
                <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-8 text-center">
                  <Map className="h-16 w-16 text-green-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Carte Géographique Interactive
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Visualisation géospatiale des résultats de recherche sur une carte du Cameroun
                  </p>
                  <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                    <div ref={mapContainerRef} className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
                      <div className="text-center text-gray-500">
                        <Globe className="h-12 w-12 mx-auto mb-3" />
                        <p>Carte interactive en cours de développement</p>
                        <p className="text-sm mt-2">Integration avec Mapbox/Leaflet prévue</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Statistiques géographiques */}
                  {searchResults.length > 0 && (
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white rounded-lg p-4 shadow-sm">
                        <h4 className="font-medium text-gray-900">Lieux uniques</h4>
                        <p className="text-2xl font-bold text-green-600">
                          {new Set(searchResults.filter(r => r.birthPlace).map(r => r.birthPlace)).size}
                        </p>
                      </div>
                      <div className="bg-white rounded-lg p-4 shadow-sm">
                        <h4 className="font-medium text-gray-900">Centres d'état civil</h4>
                        <p className="text-2xl font-bold text-blue-600">
                          {new Set(searchResults.filter(r => r.civilCenter).map(r => r.civilCenter)).size}
                        </p>
                      </div>
                      <div className="bg-white rounded-lg p-4 shadow-sm">
                        <h4 className="font-medium text-gray-900">Couverture régionale</h4>
                        <p className="text-2xl font-bold text-purple-600">
                          {Math.round((new Set(searchResults.filter(r => r.birthPlace).map(r => r.birthPlace)).size / 10) * 100)}%
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Panneau de détails de la personne sélectionnée */}
        {selectedResult && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Détails de la personne</h2>
                  <button 
                    onClick={() => setSelectedResult(null)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="h-6 w-6 text-gray-400" />
                  </button>
                </div>
                
                <div className="space-y-6">
                  {/* Informations principales */}
                  <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-6">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="bg-gradient-to-br from-blue-500 to-green-500 p-4 rounded-xl">
                        <User className="h-8 w-8 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{selectedResult.fullName}</h3>
                        <p className="text-gray-600">
                          {selectedResult.gender === '1' || selectedResult.gender === 'M' ? '♂️ Masculin' : 
                           selectedResult.gender === '2' || selectedResult.gender === 'F' ? '♀️ Féminin' : '👤 Non spécifié'}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Informations détaillées */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-semibold text-gray-900 border-b border-gray-200 pb-2">
                        Informations personnelles
                      </h4>
                      
                      <div className="space-y-3">
                        <div className="flex items-start space-x-3">
                          <CalendarDays className="h-4 w-4 text-gray-500 mt-1" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">Date de naissance</p>
                            <p className="text-sm text-gray-600">
                              {selectedResult.birthDate ? 
                                new Date(selectedResult.birthDate).toLocaleDateString('fr-FR', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                }) :
                                'Non renseignée'
                              }
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-start space-x-3">
                          <MapPin className="h-4 w-4 text-gray-500 mt-1" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">Lieu de naissance</p>
                            <p className="text-sm text-gray-600">{selectedResult.birthPlace || 'Non renseigné'}</p>
                          </div>
                        </div>
                        
                        {selectedResult.actNumber && (
                          <div className="flex items-start space-x-3">
                            <Hash className="h-4 w-4 text-gray-500 mt-1" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">Numéro d'acte</p>
                              <p className="text-sm text-gray-600 font-mono">{selectedResult.actNumber}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h4 className="font-semibold text-gray-900 border-b border-gray-200 pb-2">
                        Informations familiales
                      </h4>
                      
                      <div className="space-y-3">
                        {selectedResult.father && (
                          <div className="flex items-start space-x-3">
                            <UserCheck className="h-4 w-4 text-blue-500 mt-1" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">Père</p>
                              <p className="text-sm text-gray-600">{selectedResult.father}</p>
                            </div>
                          </div>
                        )}
                        
                        {selectedResult.mother && (
                          <div className="flex items-start space-x-3">
                            <UserCheck className="h-4 w-4 text-pink-500 mt-1" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">Mère</p>
                              <p className="text-sm text-gray-600">{selectedResult.mother}</p>
                            </div>
                          </div>
                        )}
                        
                        {selectedResult.civilCenter && (
                          <div className="flex items-start space-x-3">
                            <MapIcon className="h-4 w-4 text-gray-500 mt-1" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">Centre d'état civil</p>
                              <p className="text-sm text-gray-600">{selectedResult.civilCenter}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                    <div className="flex items-center space-x-4">
                      <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
                        <Users className="h-4 w-4" />
                        <span>Voir l'arbre généalogique</span>
                      </button>
                      <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2">
                        <Download className="h-4 w-4" />
                        <span>Télécharger fiche</span>
                      </button>
                    </div>
                    
                    <div className="text-xs text-gray-500">
                      {selectedResult.lastUpdated && (
                        <p>Dernière mise à jour: {new Date(selectedResult.lastUpdated).toLocaleDateString('fr-FR')}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


export default SearchPage;