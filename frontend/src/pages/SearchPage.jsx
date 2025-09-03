// src/pages/SearchPage.jsx
import React, { useState } from 'react';
import { Search, Filter, User, MapPin, Calendar } from 'lucide-react';
import SearchInput from '../components/common/SearchInput';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { useAsyncAction } from '../hooks/useApi';
import { personService } from '../services/api';
import { formatDate, getGenderIcon } from '../utils/helpers';

const SearchPage = () => {
  const [searchResults, setSearchResults] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    gender: '',
    birthPlace: '',
    birthDateFrom: '',
    birthDateTo: ''
  });
  
  const { loading, error, execute } = useAsyncAction();

  const handleSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const result = await execute(() => personService.search({ 
        q: query,
        ...filters,
        limit: 50
      }));
      setSearchResults(result.results || []);
    } catch (err) {
      console.error('Search failed:', err);
      setSearchResults([]);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Recherche dans le FNI
        </h1>
        <p className="text-gray-600">
          Recherchez des personnes dans le Fichier National de l'Individu
        </p>
      </div>

      {/* Search Form */}
      <div className="card">
        <div className="space-y-4">
          <SearchInput
            placeholder="Rechercher par nom, prénom, ou nom des parents..."
            onSearch={handleSearch}
            className="w-full"
          />
          
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn-secondary flex items-center space-x-2"
            >
              <Filter className="h-4 w-4" />
              <span>Filtres avancés</span>
            </button>
            
            <div className="text-sm text-gray-600">
              {searchResults.length > 0 && `${searchResults.length} résultat(s) trouvé(s)`}
            </div>
          </div>

          {showFilters && (
            <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sexe
                </label>
                <select
                  value={filters.gender}
                  onChange={(e) => handleFilterChange('gender', e.target.value)}
                  className="input-field"
                >
                  <option value="">Tous</option>
                  <option value="1">Masculin</option>
                  <option value="2">Féminin</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lieu de naissance
                </label>
                <input
                  type="text"
                  value={filters.birthPlace}
                  onChange={(e) => handleFilterChange('birthPlace', e.target.value)}
                  placeholder="Ex: Yaoundé"
                  className="input-field"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date de naissance (de)
                </label>
                <input
                  type="date"
                  value={filters.birthDateFrom}
                  onChange={(e) => handleFilterChange('birthDateFrom', e.target.value)}
                  className="input-field"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date de naissance (à)
                </label>
                <input
                  type="date"
                  value={filters.birthDateTo}
                  onChange={(e) => handleFilterChange('birthDateTo', e.target.value)}
                  className="input-field"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="card text-center py-12">
          <LoadingSpinner text="Recherche en cours..." />
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <ErrorMessage error={error} />
      )}

      {/* Results */}
      {!loading && !error && searchResults.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Résultats de la recherche
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {searchResults.map((person) => (
              <PersonCard key={person.id} person={person} />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && searchResults.length === 0 && (
        <div className="card text-center py-12">
          <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Commencez votre recherche
          </h3>
          <p className="text-gray-600">
            Utilisez la barre de recherche pour trouver des personnes dans le FNI
          </p>
        </div>
      )}
    </div>
  );
};

const PersonCard = ({ person }) => {
  return (
    <div className="card hover:shadow-md transition-shadow cursor-pointer">
      <div className="flex items-start space-x-4">
        <div className="bg-fni-blue-100 p-3 rounded-lg">
          <User className="h-6 w-6 text-fni-blue-600" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {person.fullName}
            </h3>
            <span className="text-lg">{getGenderIcon(person.gender)}</span>
          </div>
          
          <div className="space-y-1 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <Calendar className="h-3 w-3" />
              <span>Né(e) le {formatDate(person.birthDate)}</span>
            </div>
            
            {person.birthPlace && (
              <div className="flex items-center space-x-2">
                <MapPin className="h-3 w-3" />
                <span>{person.birthPlace}</span>
              </div>
            )}
            
            {person.father && (
              <p><strong>Père:</strong> {person.father}</p>
            )}
            
            {person.mother && (
              <p><strong>Mère:</strong> {person.mother}</p>
            )}
            
            {person.actNumber && (
              <p className="text-xs text-gray-500">
                <strong>Acte N°:</strong> {person.actNumber}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchPage;