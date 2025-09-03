// src/pages/GenealogyPage.jsx - VERSION AVEC D3.JS INTÉGRÉ
import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  TreePine, 
  User, 
  Calendar, 
  MapPin, 
  Users, 
  ChevronUp, 
  ChevronDown,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Maximize2,
  UserPlus,
  X,
  Info,
  Eye,
  Grid3X3,
  GitBranch
} from 'lucide-react';
import SearchInput from '../components/common/SearchInput';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import TreeVisualizationD3 from '../components/genealogy/TreeVisualizationD3';
import { useAsyncAction } from '../hooks/useApi';
import { personService, genealogyService } from '../services/api';
import { formatDate, getGenderIcon } from '../utils/helpers';

const GenealogyPage = () => {
  const [searchMode, setSearchMode] = useState('name'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [dateQuery, setDateQuery] = useState('');
  const [placeQuery, setPlaceQuery] = useState('');
  const [actNumberQuery, setActNumberQuery] = useState('');
  
  const [treeData, setTreeData] = useState(null);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [visualizationMode, setVisualizationMode] = useState('d3'); // 'd3' ou 'simple'
  const [treeStats, setTreeStats] = useState(null);
  
  const { loading, error, execute } = useAsyncAction();
  const treeContainerRef = useRef(null);

  const handleSearch = async () => {
    let searchParams = {};
    
    if (searchMode === 'name') {
      if (!searchQuery.trim()) return;
      searchParams = {
        q: searchQuery,
        birthPlace: placeQuery,
        birthDateFrom: dateQuery,
        birthDateTo: dateQuery,
        limit: 10
      };
    } else {
      if (!actNumberQuery.trim()) return;
      searchParams = { actNumber: actNumberQuery };
    }

    try {
      const searchResult = await execute(() => personService.search(searchParams));
      
      if (searchResult.results && searchResult.results.length > 0) {
        const firstPerson = searchResult.results[0];
        await loadPersonTree(firstPerson.id);
      }
    } catch (err) {
      console.error('Search failed:', err);
    }
  };

  const loadPersonTree = async (personId) => {
    try {
      const treeResult = await execute(() => genealogyService.getTree(personId, 3));
      
      if (treeResult.success && treeResult.tree) {
        // Créer la structure de données pour D3.js
        const d3TreeData = convertToD3Format(treeResult.tree);
        setTreeData(d3TreeData);
        setSelectedPerson(treeResult.tree.root);
        setExpandedNodes(new Set([treeResult.tree.root.id]));
        
        // Calculer les statistiques
        setTreeStats({
          totalMembers: treeResult.tree.stats?.totalMembers || 0,
          generations: treeResult.tree.stats?.generations || 0,
          ancestorsFound: treeResult.tree.stats?.ancestorsFound || 0,
          descendantsFound: treeResult.tree.stats?.descendantsFound || 0,
          siblingsFound: treeResult.tree.stats?.siblingsFound || 0
        });
      }
    } catch (err) {
      console.error('Tree loading failed:', err);
    }
  };

  const convertToD3Format = (apiTree) => {
    if (!apiTree || !apiTree.root) return null;

    const createNode = (person, relationship = 'root') => ({
      id: person.id,
      name: person.full_name || `${person.noms_enfant} ${person.prenoms_enfant || ''}`.trim(),
      data: person,
      relationship,
      expanded: false,
      hasMoreChildren: apiTree.descendants && apiTree.descendants.length > 0,
      hasMoreParents: apiTree.ancestors && apiTree.ancestors.length > 0
    });

    const rootNode = createNode(apiTree.root, 'root');

    // Ajouter les ancêtres comme parents
    if (apiTree.ancestors && apiTree.ancestors.length > 0) {
      rootNode.parents = apiTree.ancestors.map(ancestor => 
        createNode(ancestor, 'parent')
      );
    }

    // Ajouter les descendants comme enfants
    if (apiTree.descendants && apiTree.descendants.length > 0) {
      rootNode.children = apiTree.descendants.map(child => 
        createNode(child, 'child')
      );
    }

    // Ajouter les frères et sœurs
    if (apiTree.siblings && apiTree.siblings.length > 0) {
      rootNode.siblings = apiTree.siblings.map(sibling => 
        createNode(sibling, 'sibling')
      );
    }

    // Ajouter le conjoint
    if (apiTree.spouse) {
      rootNode.spouse = {
        name: apiTree.spouse.spouse_name,
        data: apiTree.spouse,
        relationship: 'spouse'
      };
    }

    return rootNode;
  };

  const expandNode = async (nodeId, direction) => {
    if (!treeData) return;

    try {
      const treeResult = await execute(() => genealogyService.getTree(nodeId, 2));
      
      if (treeResult.success && treeResult.tree) {
        const updatedTree = { ...treeData };
        
        // Fonction récursive pour trouver et mettre à jour le nœud
        const updateNode = (node) => {
          if (node.id === nodeId) {
            if (direction === 'children' && treeResult.tree.descendants) {
              node.children = treeResult.tree.descendants.map(child => ({
                id: child.id,
                name: child.full_name,
                data: child,
                relationship: 'child',
                expanded: false
              }));
              node.hasMoreChildren = false;
            }
            
            if (direction === 'parents' && treeResult.tree.ancestors) {
              node.parents = treeResult.tree.ancestors.map(parent => ({
                id: parent.id,
                name: parent.full_name,
                data: parent,
                relationship: 'parent',
                expanded: false
              }));
              node.hasMoreParents = false;
            }
            
            if (direction === 'siblings' && treeResult.tree.siblings) {
              node.siblings = treeResult.tree.siblings.map(sibling => ({
                id: sibling.id,
                name: sibling.full_name,
                data: sibling,
                relationship: 'sibling',
                expanded: false
              }));
            }
            
            node.expanded = true;
            return true;
          }
          
          // Recherche récursive dans les enfants
          if (node.children) {
            for (const child of node.children) {
              if (updateNode(child)) return true;
            }
          }
          
          // Recherche récursive dans les parents
          if (node.parents) {
            for (const parent of node.parents) {
              if (updateNode(parent)) return true;
            }
          }
          
          return false;
        };
        
        updateNode(updatedTree);
        setTreeData(updatedTree);
        setExpandedNodes(prev => new Set([...prev, nodeId]));
        
        // Mettre à jour les statistiques
        const newStats = { ...treeStats };
        if (direction === 'children') {
          newStats.descendantsFound += treeResult.tree.descendants?.length || 0;
        } else if (direction === 'parents') {
          newStats.ancestorsFound += treeResult.tree.ancestors?.length || 0;
        } else if (direction === 'siblings') {
          newStats.siblingsFound += treeResult.tree.siblings?.length || 0;
        }
        newStats.totalMembers = 1 + newStats.ancestorsFound + newStats.descendantsFound + newStats.siblingsFound;
        setTreeStats(newStats);
      }
    } catch (err) {
      console.error('Node expansion failed:', err);
    }
  };

  const resetTree = () => {
    setTreeData(null);
    setSelectedPerson(null);
    setExpandedNodes(new Set());
    setSearchQuery('');
    setDateQuery('');
    setPlaceQuery('');
    setActNumberQuery('');
    setTreeStats(null);
  };

  return (
    <div className="space-y-6">
      {/* Header avec toggle de visualisation */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Arbre Généalogique Intelligent
        </h1>
        <p className="text-gray-600 mb-4">
          Explorez les liens familiaux avec visualisation D3.js interactive
        </p>
        
        {/* Mode de visualisation */}
        {treeData && (
          <div className="flex justify-center space-x-2">
            <button
              onClick={() => setVisualizationMode('d3')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                visualizationMode === 'd3' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <GitBranch className="inline h-4 w-4 mr-2" />
              Visualisation D3.js
            </button>
            <button
              onClick={() => setVisualizationMode('simple')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                visualizationMode === 'simple' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Grid3X3 className="inline h-4 w-4 mr-2" />
              Vue Simplifiée
            </button>
          </div>
        )}
      </div>

      {/* Search Controls */}
      <div className="card space-y-4">
        <div className="flex items-center space-x-4 mb-4">
          <button
            onClick={() => setSearchMode('name')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              searchMode === 'name' 
                ? 'bg-fni-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Recherche par nom
          </button>
          <button
            onClick={() => setSearchMode('actNumber')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              searchMode === 'actNumber' 
                ? 'bg-fni-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Recherche par N° acte
          </button>
        </div>

        {searchMode === 'name' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom et prénom *
              </label>
              <SearchInput
                placeholder="Ex: Jean KAMDEM"
                onSearch={setSearchQuery}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de naissance
              </label>
              <input
                type="date"
                value={dateQuery}
                onChange={(e) => setDateQuery(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lieu de naissance
              </label>
              <input
                type="text"
                value={placeQuery}
                onChange={(e) => setPlaceQuery(e.target.value)}
                placeholder="Ex: Yaoundé"
                className="input-field"
              />
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Numéro d'acte *
            </label>
            <input
              type="text"
              value={actNumberQuery}
              onChange={(e) => setActNumberQuery(e.target.value)}
              placeholder="Ex: 2024-LT1501-N-01766"
              className="input-field"
            />
          </div>
        )}

        <div className="flex items-center justify-between">
          <button
            onClick={handleSearch}
            disabled={loading || (searchMode === 'name' ? !searchQuery : !actNumberQuery)}
            className="btn-primary flex items-center space-x-2"
          >
            <Search className="h-4 w-4" />
            <span>Rechercher</span>
          </button>
          
          {treeData && (
            <button
              onClick={resetTree}
              className="btn-secondary flex items-center space-x-2"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Nouvelle recherche</span>
            </button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="card text-center py-12">
          <LoadingSpinner text="Chargement de l'arbre généalogique..." />
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <ErrorMessage error={error} />
      )}

      {/* Tree Statistics */}
      {!loading && !error && treeData && treeStats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between">
              <Users className="h-8 w-8 text-blue-600" />
              <span className="text-2xl font-bold text-blue-900">{treeStats.totalMembers}</span>
            </div>
            <p className="text-sm text-blue-700 mt-2">Membres total</p>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center justify-between">
              <ChevronUp className="h-8 w-8 text-purple-600" />
              <span className="text-2xl font-bold text-purple-900">{treeStats.ancestorsFound}</span>
            </div>
            <p className="text-sm text-purple-700 mt-2">Ancêtres</p>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
            <div className="flex items-center justify-between">
              <ChevronDown className="h-8 w-8 text-green-600" />
              <span className="text-2xl font-bold text-green-900">{treeStats.descendantsFound}</span>
            </div>
            <p className="text-sm text-green-700 mt-2">Descendants</p>
          </div>
          
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4 border border-yellow-200">
            <div className="flex items-center justify-between">
              <Users className="h-8 w-8 text-yellow-600" />
              <span className="text-2xl font-bold text-yellow-900">{treeStats.siblingsFound}</span>
            </div>
            <p className="text-sm text-yellow-700 mt-2">Frères/Sœurs</p>
          </div>
          
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-4 border border-indigo-200">
            <div className="flex items-center justify-between">
              <TreePine className="h-8 w-8 text-indigo-600" />
              <span className="text-2xl font-bold text-indigo-900">{treeStats.generations}</span>
            </div>
            <p className="text-sm text-indigo-700 mt-2">Générations</p>
          </div>
        </div>
      )}

      {/* Tree Visualization */}
      {!loading && !error && treeData && (
        <div className="space-y-6">
          {visualizationMode === 'd3' ? (
            <div className="card p-0 overflow-hidden" style={{ height: '800px' }}>
              <TreeVisualizationD3 
                treeData={treeData}
                onNodeClick={setSelectedPerson}
                onExpandNode={expandNode}
                selectedPerson={selectedPerson}
              />
            </div>
          ) : (
            <div className="card min-h-[600px] overflow-auto" ref={treeContainerRef}>
              <SimpleTreeVisualization 
                treeData={treeData}
                onNodeClick={setSelectedPerson}
                onExpandNode={expandNode}
                selectedPerson={selectedPerson}
              />
            </div>
          )}
        </div>
      )}

      {/* Person Details Panel */}
      {selectedPerson && (
        <PersonDetailsPanel 
          person={selectedPerson}
          onClose={() => setSelectedPerson(null)}
          onGenerateTree={() => loadPersonTree(selectedPerson.id)}
        />
      )}

      {/* Empty State */}
      {!loading && !error && !treeData && (
        <div className="card text-center py-16">
          <TreePine className="h-24 w-24 text-gray-300 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Explorez l'arbre généalogique avec D3.js
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto mb-8">
            Découvrez une visualisation interactive et moderne de vos liens familiaux. 
            Notre système utilise D3.js pour créer des arbres généalogiques dynamiques 
            avec zoom, drag & drop, et plusieurs modes de visualisation.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg">
              <Search className="h-8 w-8 text-blue-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">1. Recherche</h3>
              <p className="text-sm text-gray-600">
                Trouvez la personne par nom ou numéro d'acte
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg">
              <Eye className="h-8 w-8 text-green-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">2. Visualisation</h3>
              <p className="text-sm text-gray-600">
                3 modes: Arbre, Radial, Réseau dynamique
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg">
              <Users className="h-8 w-8 text-purple-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">3. Exploration</h3>
              <p className="text-sm text-gray-600">
                Cliquez pour révéler parents et enfants
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 rounded-lg">
              <Download className="h-8 w-8 text-yellow-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">4. Export</h3>
              <p className="text-sm text-gray-600">
                Téléchargez l'arbre en PNG haute résolution
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Composant de visualisation simple (fallback)
const SimpleTreeVisualization = ({ treeData, onNodeClick, onExpandNode, selectedPerson }) => {
  if (!treeData) return null;

  return (
    <div className="tree-container p-8">
      <div className="flex flex-col items-center space-y-8">
        {/* Parents Level */}
        {treeData.parents && treeData.parents.length > 0 && (
          <div className="flex justify-center space-x-8">
            {treeData.parents.map((parent) => (
              <TreeNode
                key={parent.id}
                node={parent}
                onClick={() => onNodeClick(parent.data)}
                onExpand={(direction) => onExpandNode(parent.id, direction)}
                isSelected={selectedPerson?.id === parent.data.id}
                relationship="parent"
              />
            ))}
          </div>
        )}

        {/* Root Person with Siblings */}
        <div className="flex items-center space-x-8">
          {treeData.siblings && treeData.siblings.slice(0, 2).map((sibling) => (
            <TreeNode
              key={sibling.id}
              node={sibling}
              onClick={() => onNodeClick(sibling.data)}
              onExpand={(direction) => onExpandNode(sibling.id, direction)}
              isSelected={selectedPerson?.id === sibling.data.id}
              relationship="sibling"
              size="small"
            />
          ))}
          
          <TreeNode
            node={treeData}
            onClick={() => onNodeClick(treeData.data)}
            onExpand={(direction) => onExpandNode(treeData.id, direction)}
            isSelected={selectedPerson?.id === treeData.data.id}
            relationship="root"
            isRoot={true}
          />
          
          {treeData.siblings && treeData.siblings.slice(2, 4).map((sibling) => (
            <TreeNode
              key={sibling.id}
              node={sibling}
              onClick={() => onNodeClick(sibling.data)}
              onExpand={(direction) => onExpandNode(sibling.id, direction)}
              isSelected={selectedPerson?.id === sibling.data.id}
              relationship="sibling"
              size="small"
            />
          ))}
        </div>

        {/* Children Level */}
        {treeData.children && treeData.children.length > 0 && (
          <div className="flex justify-center space-x-8 flex-wrap">
            {treeData.children.map((child) => (
              <TreeNode
                key={child.id}
                node={child}
                onClick={() => onNodeClick(child.data)}
                onExpand={(direction) => onExpandNode(child.id, direction)}
                isSelected={selectedPerson?.id === child.data.id}
                relationship="child"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Composant TreeNode
const TreeNode = ({ 
  node, 
  onClick, 
  onExpand, 
  isSelected, 
  relationship, 
  isRoot = false,
  size = 'normal'
}) => {
  const [showControls, setShowControls] = useState(false);
  
  const getNodeColor = () => {
    if (isRoot) return 'bg-gradient-to-br from-fni-blue-600 to-fni-green-600 text-white';
    if (isSelected) return 'bg-fni-blue-100 border-fni-blue-300 text-fni-blue-900';
    
    switch (relationship) {
      case 'parent': return 'bg-purple-50 border-purple-200 text-purple-900';
      case 'child': return 'bg-green-50 border-green-200 text-green-900';
      case 'sibling': return 'bg-yellow-50 border-yellow-200 text-yellow-900';
      default: return 'bg-gray-50 border-gray-200 text-gray-900';
    }
  };

  const getNodeSize = () => {
    if (size === 'small') return 'w-32 h-20 text-xs';
    return isRoot ? 'w-48 h-28 text-sm' : 'w-40 h-24 text-xs';
  };

  return (
    <div className="flex flex-col items-center space-y-2">
      {/* Expand Parents Button */}
      {relationship !== 'parent' && !isRoot && (
        <button
          onClick={() => onExpand('parents')}
          className="w-6 h-6 bg-purple-100 hover:bg-purple-200 rounded-full flex items-center justify-center text-purple-600 transition-colors"
          title="Voir les parents"
        >
          <ChevronUp className="h-3 w-3" />
        </button>
      )}

      {/* Node */}
      <div
        className={`
          relative ${getNodeSize()} 
          ${getNodeColor()} 
          border-2 rounded-xl cursor-pointer 
          hover:shadow-lg transition-all duration-200 
          hover:scale-105 flex flex-col items-center justify-center p-3
          ${isSelected ? 'ring-2 ring-fni-blue-400' : ''}
        `}
        onClick={onClick}
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        {/* Gender Icon */}
        <div className="text-lg mb-1">
          {getGenderIcon(node.data.sexe)}
        </div>
        
        {/* Name */}
        <div className="text-center font-medium truncate w-full">
          {node.name}
        </div>
        
        {/* Birth Date */}
        {node.data.date_naiss && (
          <div className="text-xs opacity-75 mt-1">
            {formatDate(node.data.date_naiss)}
          </div>
        )}

        {/* Relationship Badge */}
        {!isRoot && (
          <div className="absolute -top-2 -right-2 bg-white text-gray-600 text-xs px-2 py-1 rounded-full shadow-sm border">
            {relationship === 'parent' ? 'Parent' : 
             relationship === 'child' ? 'Enfant' : 
             relationship === 'sibling' ? 'Fratrie' : 'Famille'}
          </div>
        )}
      </div>

      {/* Expand Children Button */}
      {relationship !== 'child' && (
        <button
          onClick={() => onExpand('children')}
          className="w-6 h-6 bg-green-100 hover:bg-green-200 rounded-full flex items-center justify-center text-green-600 transition-colors"
          title="Voir les enfants"
        >
          <ChevronDown className="h-3 w-3" />
        </button>
      )}
    </div>
  );
};

// Panel de détails amélioré
const PersonDetailsPanel = ({ person, onClose, onGenerateTree }) => {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <User className="h-5 w-5 mr-2" />
          Détails de la personne
        </h3>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Informations personnelles</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">Nom:</span>
              <span className="font-medium">{person.full_name || `${person.noms_enfant} ${person.prenoms_enfant || ''}`.trim()}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="h-4 w-4 text-gray-400">{getGenderIcon(person.sexe)}</span>
              <span className="text-gray-600">Sexe:</span>
              <span>{person.sexe === '1' || person.sexe === 'M' ? 'Masculin' : person.sexe === '2' || person.sexe === 'F' ? 'Féminin' : 'Non spécifié'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">Naissance:</span>
              <span>{formatDate(person.date_naiss)}</span>
            </div>
            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">Lieu:</span>
              <span>{person.lieu_naiss || 'Non renseigné'}</span>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-medium text-gray-900 mb-2">Informations familiales</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">Père:</span>
              <span>{person.noms_pere || 'Non renseigné'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">Mère:</span>
              <span>{person.noms_mere || 'Non renseigné'}</span>
            </div>
            {person.num_acte && (
              <div className="flex items-center space-x-2">
                <Info className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">N° Acte:</span>
                <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{person.num_acte}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t flex justify-end space-x-2">
        <button
          onClick={() => onGenerateTree()}
          className="btn-primary flex items-center space-x-2"
        >
          <TreePine className="h-4 w-4" />
          <span>Générer son arbre</span>
        </button>
      </div>
    </div>
  );
};

export default GenealogyPage;