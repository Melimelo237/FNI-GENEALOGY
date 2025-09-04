// src/pages/GenealogyPage.jsx - VERSION FINALE AVEC D3.JS
import React, { useState } from 'react';
import { 
  TreePine, 
  Users, 
  Search,
  Info,
  GitBranch,
  Database,
  Cpu,
  Zap
} from 'lucide-react';
import TreeVisualizationFixed from '../components/genealogy/TreeVisualizationFixed';

const GenealogyPage = () => {
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [showInstructions, setShowInstructions] = useState(true);

  const handleNodeClick = (person) => {
    setSelectedPerson(person);
    console.log('Personne sélectionnée:', person);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Arbre Généalogique Intelligent
        </h1>
        <p className="text-gray-600">
          Exploration interactive des liens familiaux avec visualisation D3.js
        </p>
      </div>

      {/* Statistiques de performance */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <Database className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-blue-900">100M+</span>
          </div>
          <p className="text-sm text-blue-700 mt-2">Enregistrements supportés</p>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
          <div className="flex items-center justify-between">
            <Zap className="h-8 w-8 text-green-600" />
            <span className="text-2xl font-bold text-green-900">&lt;50ms</span>
          </div>
          <p className="text-sm text-green-700 mt-2">Temps de recherche</p>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center justify-between">
            <Cpu className="h-8 w-8 text-purple-600" />
            <span className="text-2xl font-bold text-purple-900">IA</span>
          </div>
          <p className="text-sm text-purple-700 mt-2">Matching intelligent</p>
        </div>
        
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4 border border-yellow-200">
          <div className="flex items-center justify-between">
            <GitBranch className="h-8 w-8 text-yellow-600" />
            <span className="text-2xl font-bold text-yellow-900">∞</span>
          </div>
          <p className="text-sm text-yellow-700 mt-2">Générations explorables</p>
        </div>
      </div>

      {/* Visualisation D3.js */}
      <div className="card p-0 overflow-hidden" style={{ height: '800px' }}>
        <TreeVisualizationFixed 
          initialPersonId={selectedPerson?.id}
          onNodeClick={handleNodeClick}
          height={800}
        />
      </div>

      {/* Instructions d'utilisation */}
      {showInstructions && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="space-y-2">
                <h3 className="font-semibold text-blue-900">
                  Guide d'utilisation de l'arbre généalogique
                </h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• <strong>Recherche</strong> : Par nom complet ou numéro d'acte</li>
                  <li>• <strong>Navigation</strong> : Cliquez sur ↑ pour voir les parents, ↓ pour les enfants</li>
                  <li>• <strong>Zoom</strong> : Utilisez la molette ou les boutons de contrôle</li>
                  <li>• <strong>Détails</strong> : Cliquez sur une personne pour voir ses informations</li>
                  <li>• <strong>Export</strong> : Téléchargez l'arbre en PNG haute résolution</li>
                </ul>
                
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <p className="text-xs text-blue-700">
                    <strong>Algorithme de matching :</strong> Basé sur les invariants (date et lieu de naissance) 
                    pour garantir une précision maximale même sur des centaines de millions d'enregistrements.
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowInstructions(false)}
              className="text-blue-600 hover:text-blue-800"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Informations techniques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center space-x-3 mb-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Search className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Recherche intelligente</h3>
          </div>
          <p className="text-sm text-gray-600">
            Double mode de recherche : par nom avec date/lieu de naissance ou directement par numéro d'acte. 
            Index PostgreSQL optimisés pour des performances sub-secondes.
          </p>
        </div>
        
        <div className="card">
          <div className="flex items-center space-x-3 mb-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <GitBranch className="h-5 w-5 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Expansion progressive</h3>
          </div>
          <p className="text-sm text-gray-600">
            Chargement à la demande des branches de l'arbre. Seules les données visibles sont chargées, 
            garantissant une fluidité même avec des arbres massifs.
          </p>
        </div>
        
        <div className="card">
          <div className="flex items-center space-x-3 mb-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Cpu className="h-5 w-5 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Cache intelligent</h3>
          </div>
          <p className="text-sm text-gray-600">
            Système de cache NodeCache avec TTL d'1 heure. Les requêtes fréquentes sont servies 
            instantanément depuis la mémoire.
          </p>
        </div>
      </div>
    </div>
  );
};

export default GenealogyPage;