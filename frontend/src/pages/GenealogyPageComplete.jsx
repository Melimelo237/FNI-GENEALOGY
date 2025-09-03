// src/pages/GenealogyPageComplete.jsx - PAGE GÉNÉALOGIE INTÉGRÉE
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  Search, 
  TreePine, 
  User, 
  Calendar, 
  MapPin, 
  Users, 
  Hash,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Download,
  Share2,
  Info,
  Clock,
  AlertCircle,
  CheckCircle,
  Zap,
  BarChart3,
  X
} from 'lucide-react';
import InteractiveGenealogyTree from '../components/genealogy/InteractiveGenealogyTree';
import { useAsyncAction } from '../hooks/useApi';
import { advancedGenealogyService } from '../services/api';
import { formatDate, getGenderIcon } from '../utils/helpers';

const GenealogyPageComplete = () => {
  // ============================================================================
  // 📊 STATE MANAGEMENT
  // ============================================================================
  
  // États de recherche
  const [searchMode, setSearchMode] = useState('identity'); // 'identity' ou 'actNumber'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilters, setSearchFilters] = useState({
    birthDate: '',
    birthPlace: '',
    actNumber: ''
  });
  const [searchResults, setSearchResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // États de l'arbre
  const [selectedPersonId, setSelectedPersonId] = useState(null);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [treeStats, setTreeStats] = useState(null);
  const [treeHistory, setTreeHistory] = useState([]);
  const [currentTreeIndex, setCurrentTreeIndex] = useState(-1);
  
  // États UI
  const [showPersonDetails, setShowPersonDetails] = useState(false);
  const [showTreeStats, setShowTreeStats] = useState(true);
  const [showSearchPanel, setShowSearchPanel] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [performanceMetrics, setPerformanceMetrics] = useState(null);
  
  // États de chargement
  const { loading, error, execute } = useAsyncAction();
  const searchTimeout = useRef(null);

  // ============================================================================
  // 🔍 FONCTIONS DE RECHERCHE
  // ============================================================================

  // Recherche intelligente avec auto-complétion
  const handleSearchQuery = useCallback(async (query) => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Débounce la recherche
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    searchTimeout.current = setTimeout(async () => {
      try {
        const result = await advancedGenealogyService.searchWithSuggestions(query, {
          ...searchFilters,
          maxSuggestions: 8
        });
        
        setSuggestions(result.suggestions || []);
        setShowSuggestions(result.suggestions?.length > 0);
        
        // Afficher les résultats immédiats s'il y en a
        if (result.results?.length > 0) {
          setSearchResults(result.results);
        }
      } catch (error) {
        console.error('Erreur auto-complétion:', error);
      }
    }, 300);
  }, [searchFilters]);

  // Recherche principale
  const handleSearch = async () => {
    if (searchMode === 'identity' && searchQuery.length < 2) return;
    if (searchMode === 'actNumber' && !searchFilters.actNumber) return;

    try {
      const params = searchMode === 'identity' 
        ? {
            searchType: 'identity',
            query: searchQuery,
            birthDate: searchFilters.birthDate,
            birthPlace: searchFilters.birthPlace
          }
        : {
            searchType: 'actNumber',
            actNumber: searchFilters.actNumber
          };

      const result = await execute(() => advancedGenealogyService.search(params));
      
      if (result.success && result.results?.length > 0) {
        setSearchResults(result.results);
        
        // Auto-sélection si un seul résultat avec haute confiance
        if (result.results.length === 1 && result.results[0].confidence > 90) {
          handlePersonSelect(result.results[0]);
        }
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error('Erreur recherche:', err);
      setSearchResults([]);
    }
  };

  // Sélection d'une personne pour l'arbre
  const handlePersonSelect = (person) => {
    setSelectedPersonId(person.id);
    setSelectedPerson(person);
    setShowPersonDetails(true);
    
    // Ajouter à l'historique
    const newHistoryEntry = {
      id: person.id,
      name: `${person.noms_enfant} ${person.prenoms_enfant || ''}`.trim(),
      timestamp: Date.now()
    };
    
    setTreeHistory(prev => {
      const newHistory = [...prev.slice(0, currentTreeIndex + 1), newHistoryEntry];
      setCurrentTreeIndex(newHistory.length - 1);
      return newHistory;
    });
    
    // Pré-charger les relations probables
    advancedGenealogyService.preload(person.id);
    
    // Masquer les suggestions et résultats
    setShowSuggestions(false);
    setSearchResults([]);
  };

  // ============================================================================
  // 🎯 GESTION DE L'ARBRE
  // ============================================================================

  // Callback quand l'arbre est mis à jour
  const handleTreeUpdate = (stats) => {
    setTreeStats(stats);
    
    // Mettre à jour les métriques de performance
    const perfStats = advancedGenealogyService.getPerformanceStats();
    setPerformanceMetrics(perfStats);
  };

  // Navigation dans l'historique
  const navigateHistory = (direction) => {
    const newIndex = direction === 'back' 
      ? Math.max(0, currentTreeIndex - 1)
      : Math.min(treeHistory.length - 1, currentTreeIndex + 1);
    
    if (newIndex !== currentTreeIndex) {
      setCurrentTreeIndex(newIndex);
      const historyEntry = treeHistory[newIndex];
      setSelectedPersonId(historyEntry.id);
    }
  };

  // Réinitialiser l'arbre
  const resetTree = () => {
    setSelectedPersonId(null);
    setSelectedPerson(null);
    setTreeStats(null);
    setTreeHistory([]);
    setCurrentTreeIndex(-1);
    setSearchQuery('');
    setSearchFilters({ birthDate: '', birthPlace: '', actNumber: '' });
    setSearchResults([]);
    setSuggestions([]);
    advancedGenealogyService.clearCache();
  };

  // ============================================================================
  // 🎨 COMPOSANTS UI
  // ============================================================================

  // Panneau de recherche
  const SearchPanel = () => (
    <div className={`bg-white rounded-xl shadow-lg transition-all duration-300 ${showSearchPanel ? 'p-6' : 'p-2'}`}>
      {/* Header du panneau */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900 flex items-center">
          <Search className="h-5 w-5 mr-2 text-blue-600" />
          Recherche Généalogique
        </h2>
        <button
          onClick={() => setShowSearchPanel(!showSearchPanel)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          {showSearchPanel ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {showSearchPanel && (
        <div className="space-y-4">
          {/* Modes de recherche */}
          <div className="flex space-x-2">
            <button
              onClick={() => setSearchMode('identity')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                searchMode === 'identity' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <User className="inline h-4 w-4 mr-2" />
              Par identité
            </button>
            <button
              onClick={() => setSearchMode('actNumber')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                searchMode === 'actNumber' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Hash className="inline h-4 w-4 mr-2" />
              Par n° d'acte
            </button>
          </div>

          {/* Champs de recherche */}
          {searchMode === 'identity' ? (
            <div className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    handleSearchQuery(e.target.value);
                  }}
                  placeholder="Nom et prénom de la personne..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                
                {/* Suggestions auto-complétion */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-20 mt-1 max-h-60 overflow-y-auto">
                    {suggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        onClick={() => {
                          setSearchQuery(suggestion.suggestion);
                          setSearchResults(suggestion.results);
                          setShowSuggestions(false);
                        }}
                      >
                        <div className="font-medium text-gray-900">{suggestion.suggestion}</div>
                        <div className="text-sm text-gray-600">
                          {suggestion.results.length} résultat(s) • Confiance: {suggestion.confidence}%
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date de naissance
                  </label>
                  <input
                    type="date"
                    value={searchFilters.birthDate}
                    onChange={(e) => setSearchFilters(prev => ({ ...prev, birthDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lieu de naissance
                  </label>
                  <input
                    type="text"
                    value={searchFilters.birthPlace}
                    onChange={(e) => setSearchFilters(prev => ({ ...prev, birthPlace: e.target.value }))}
                    placeholder="Ex: Yaoundé"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Numéro d'acte de naissance
              </label>
              <input
                type="text"
                value={searchFilters.actNumber}
                onChange={(e) => setSearchFilters(prev => ({ ...prev, actNumber: e.target.value }))}
                placeholder="Ex: 2024-YAO1-N-00123"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Boutons d'action */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleSearch}
              disabled={loading || (searchMode === 'identity' ? !searchQuery : !searchFilters.actNumber)}
              className="btn-primary flex items-center space-x-2 disabled:opacity-50"
            >
              <Search className="h-4 w-4" />
              <span>{loading ? 'Recherche...' : 'Rechercher'}</span>
            </button>

            {(selectedPersonId || searchResults.length > 0) && (
              <button
                onClick={resetTree}
                className="btn-secondary flex items-center space-x-2"
              >
                <TreePine className="h-4 w-4" />
                <span>Nouvelle recherche</span>
              </button>
            )}
          </div>

          {/* Résultats de recherche */}
          {searchResults.length > 0 && (
            <div className="border-t pt-4">
              <h3 className="font-semibold text-gray-900 mb-3">
                Résultats ({searchResults.length})
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {searchResults.map((person) => (
                  <SearchResultCard
                    key={person.id}
                    person={person}
                    onSelect={() => handlePersonSelect(person)}
                    isSelected={selectedPersonId === person.id}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // Carte de résultat de recherche
  const SearchResultCard = ({ person, onSelect, isSelected }) => (
    <div
      className={`p-4 border rounded-lg cursor-pointer transition-all ${
        isSelected 
          ? 'border-blue-500 bg-blue-50' 
          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <span className="text-lg">{getGenderIcon(person.sexe)}</span>
            <h4 className="font-semibold text-gray-900">
              {person.noms_enfant} {person.prenoms_enfant}
            </h4>
            {person.confidence && (
              <span className={`text-xs px-2 py-1 rounded-full ${
                person.confidence >= 90 ? 'bg-green-100 text-green-800' :
                person.confidence >= 80 ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {person.confidence}%
              </span>
            )}
          </div>
          
          <div className="mt-2 space-y-1 text-sm text-gray-600">
            {person.date_naiss && (
              <div className="flex items-center space-x-2">
                <Calendar className="h-3 w-3" />
                <span>Né(e) le {formatDate(person.date_naiss)}</span>
              </div>
            )}
            {person.lieu_naiss && (
              <div className="flex items-center space-x-2">
                <MapPin className="h-3 w-3" />
                <span>{person.lieu_naiss}</span>
              </div>
            )}
            {person.num_acte && (
              <div className="flex items-center space-x-2">
                <Hash className="h-3 w-3" />
                <span className="font-mono text-xs">{person.num_acte}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {person.canHaveParents && (
            <div className="w-2 h-2 bg-purple-500 rounded-full" title="Peut avoir des parents" />
          )}
          {person.canHaveChildren && (
            <div className="w-2 h-2 bg-green-500 rounded-full" title="Peut avoir des enfants" />
          )}
        </div>
      </div>
    </div>
  );

  // Panneau de statistiques de l'arbre
  const TreeStatsPanel = () => (
    showTreeStats && treeStats && (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2 text-green-600" />
            Statistiques de l'arbre
          </h3>
          <button
            onClick={() => setShowTreeStats(false)}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <Users className="h-6 w-6 text-blue-600" />
              <span className="text-2xl font-bold text-blue-900">{treeStats.totalNodes}</span>
            </div>
            <p className="text-sm text-blue-700 mt-1">Total nœuds</p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <ChevronUp className="h-6 w-6 text-purple-600" />
              <span className="text-2xl font-bold text-purple-900">{treeStats.generations.ancestors}</span>
            </div>
            <p className="text-sm text-purple-700 mt-1">Générations ancêtres</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <ChevronDown className="h-6 w-6 text-green-600" />
              <span className="text-2xl font-bold text-green-900">{treeStats.generations.descendants}</span>
            </div>
            <p className="text-sm text-green-700 mt-1">Générations descendants</p>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <TreePine className="h-6 w-6 text-yellow-600" />
              <span className="text-2xl font-bold text-yellow-900">{treeStats.maxDepth}</span>
            </div>
            <p className="text-sm text-yellow-700 mt-1">Profondeur max</p>
          </div>
        </div>

        {performanceMetrics && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="font-medium text-gray-700 mb-2">Performance</h4>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <Zap className="h-3 w-3" />
                <span>Cache: {performanceMetrics.cacheSize} entrées</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-3 w-3" />
                <span>Hit rate: {performanceMetrics.cacheHitRate}%</span>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  );

  // Panneau de détails de la personne
  const PersonDetailsPanel = () => (
    selectedPerson && showPersonDetails && (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <User className="h-5 w-5 mr-2 text-blue-600" />
            Détails de la personne
          </h3>
          <button
            onClick={() => setShowPersonDetails(false)}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Informations principales */}
          <div className="flex items-start space-x-4">
            <div className="bg-gradient-to-br from-blue-500 to-green-500 p-3 rounded-full">
              <span className="text-white text-xl">{getGenderIcon(selectedPerson.sexe)}</span>
            </div>
            <div className="flex-1">
              <h4 className="text-xl font-bold text-gray-900">
                {selectedPerson.noms_enfant} {selectedPerson.prenoms_enfant}
              </h4>
              <p className="text-gray-600">
                {selectedPerson.sexe === '1' ? 'Masculin' : selectedPerson.sexe === '2' ? 'Féminin' : 'Non spécifié'}
              </p>
            </div>
          </div>

          {/* Informations détaillées */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h5 className="font-medium text-gray-900 mb-2">Naissance</h5>
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span>{formatDate(selectedPerson.date_naiss) || 'Non renseigné'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span>{selectedPerson.lieu_naiss || 'Non renseigné'}</span>
                </div>
              </div>
            </div>

            <div>
              <h5 className="font-medium text-gray-900 mb-2">Administration</h5>
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <Hash className="h-4 w-4 text-gray-400" />
                  <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                    {selectedPerson.num_acte || 'Non renseigné'}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Info className="h-4 w-4 text-gray-400" />
                  <span>{selectedPerson.centre_etat || 'Non renseigné'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Filiation */}
          <div>
            <h5 className="font-medium text-gray-900 mb-2">Filiation</h5>
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-gray-400" />
                <span>Père: {selectedPerson.noms_pere || 'Non renseigné'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-gray-400" />
                <span>Mère: {selectedPerson.noms_mere || 'Non renseigné'}</span>
              </div>
            </div>
          </div>

          {/* Indicateurs de qualité */}
          <div>
            <h5 className="font-medium text-gray-900 mb-2">Qualité des données</h5>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  selectedPerson.confidence >= 90 ? 'bg-green-500' :
                  selectedPerson.confidence >= 80 ? 'bg-yellow-500' : 'bg-red-500'
                }`}></div>
                <span className="text-sm">Confiance: {selectedPerson.confidence || 85}%</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Données validées</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-2 pt-4 border-t">
            <button
              onClick={() => {/* TODO: Générer rapport */}}
              className="flex-1 btn-secondary flex items-center justify-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Exporter</span>
            </button>
            <button
              onClick={() => {/* TODO: Partager */}}
              className="flex-1 btn-secondary flex items-center justify-center space-x-2"
            >
              <Share2 className="h-4 w-4" />
              <span>Partager</span>
            </button>
          </div>
        </div>
      </div>
    )
  );

  // Navigation historique
  const HistoryNavigation = () => (
    treeHistory.length > 0 && (
      <div className="bg-white rounded-xl shadow-lg p-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900 flex items-center">
            <Clock className="h-4 w-4 mr-2" />
            Historique ({treeHistory.length})
          </h4>
          <div className="flex space-x-2">
            <button
              onClick={() => navigateHistory('back')}
              disabled={currentTreeIndex <= 0}
              className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <button
              onClick={() => navigateHistory('forward')}
              disabled={currentTreeIndex >= treeHistory.length - 1}
              className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        {treeHistory.length > 0 && (
          <div className="mt-2 text-sm text-gray-600">
            Actuel: {treeHistory[currentTreeIndex]?.name}
          </div>
        )}
      </div>
    )
  );

  // ============================================================================
  // 🎯 EFFECTS
  // ============================================================================

  useEffect(() => {
    // Nettoyage à la fermeture
    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, []);

  // Gestion du mode plein écran
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // ============================================================================
  // 🎨 RENDER PRINCIPAL
  // ============================================================================

  return (
    <div className={`min-h-screen transition-all duration-300 ${
      isFullscreen ? 'p-0' : 'p-4 md:p-8'
    }`}>
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        {!isFullscreen && (
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Arbre Généalogique Interactif
            </h1>
            <p className="text-gray-600 text-lg">
              Explorez les liens familiaux avec la technologie D3.js et l'intelligence artificielle
            </p>
          </div>
        )}

        {/* Layout principal */}
        <div className={`grid gap-6 transition-all duration-300 ${
          isFullscreen ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-4'
        }`}>
          
          {/* Panneau latéral gauche */}
          {!isFullscreen && (
            <div className="lg:col-span-1 space-y-6">
              <SearchPanel />
              <TreeStatsPanel />
              <PersonDetailsPanel />
              <HistoryNavigation />
            </div>
          )}

          {/* Zone principale de l'arbre */}
          <div className={`${isFullscreen ? 'col-span-1' : 'lg:col-span-3'} relative`}>
            <div className={`bg-white rounded-xl shadow-lg overflow-hidden ${
              isFullscreen ? 'h-screen' : 'h-[800px]'
            }`}>
              
              {/* Bouton plein écran */}
              <button
                onClick={() => {
                  if (isFullscreen) {
                    document.exitFullscreen();
                  } else {
                    document.documentElement.requestFullscreen();
                  }
                }}
                className="absolute top-4 left-4 z-30 p-2 bg-white rounded-lg shadow-lg hover:bg-gray-50 transition-colors"
                title={isFullscreen ? 'Quitter plein écran' : 'Mode plein écran'}
              >
                {isFullscreen ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>

              {/* Composant arbre interactif */}
              {selectedPersonId ? (
                <InteractiveGenealogyTree
                  initialPersonId={selectedPersonId}
                  onPersonSelect={handlePersonSelect}
                  onTreeUpdate={handleTreeUpdate}
                  config={{
                    nodeRadius: 28,
                    nodeSpacing: { x: 220, y: 140 },
                    animations: { duration: 800, ease: 'ease-out' }
                  }}
                />
              ) : (
                /* État vide */
                <div className="flex items-center justify-center h-full">
                  <div className="text-center max-w-md">
                    <TreePine className="h-24 w-24 text-gray-300 mx-auto mb-6" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                      Commencez votre exploration
                    </h2>
                    <p className="text-gray-600 mb-6">
                      Recherchez une personne par son nom ou numéro d'acte pour générer 
                      son arbre généalogique interactif.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <Search className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                        <p className="font-medium text-blue-900">Recherche</p>
                        <p className="text-blue-700">Trouvez la personne</p>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg">
                        <TreePine className="h-8 w-8 text-green-600 mx-auto mb-2" />
                        <p className="font-medium text-green-900">Exploration</p>
                        <p className="text-green-700">Clic par clic</p>
                      </div>
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <Users className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                        <p className="font-medium text-purple-900">Découverte</p>
                        <p className="text-purple-700">Liens familiaux</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Overlay de chargement */}
              {loading && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
                  <div className="bg-white rounded-xl p-6 flex items-center space-x-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
                    <span className="text-lg font-medium">Chargement de l'arbre...</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Messages d'erreur */}
        {error && (
          <div className="fixed bottom-4 right-4 z-50">
            <div className="bg-red-500 text-white p-4 rounded-lg shadow-lg flex items-center space-x-3 max-w-md">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
              <button
                onClick={() => window.location.reload()}
                className="text-red-200 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GenealogyPageComplete;