// src/components/genealogy/TreeVisualizationFixed.jsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Download, 
  Maximize2,
  User,
  Users,
  Info,
  ChevronUp,
  ChevronDown,
  Search,
  X,
  Loader2,
  GitBranch,
  Grid3X3,
  Network
} from 'lucide-react';

const TreeVisualizationFixed = ({ 
  initialPersonId,
  onNodeClick,
  height = 800 
}) => {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [treeData, setTreeData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState({});
  const [dimensions, setDimensions] = useState({ width: 1200, height });
  const [searchMode, setSearchMode] = useState('name');
  const [searchValue, setSearchValue] = useState('');
  const [viewMode, setViewMode] = useState('pyramid'); // 'pyramid', 'radial', 'horizontal'
  const [treeStats, setTreeStats] = useState({ nodes: 0, depth: 0 });

  // Structure de données pour l'arbre hiérarchique
  const [hierarchicalTree, setHierarchicalTree] = useState({
    root: null,
    parents: {},
    children: {},
    siblings: {}
  });

  // Fonction pour charger les données d'une personne
  const loadPersonData = useCallback(async (personId) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/genealogy/build-tree/${personId}?depth=1`);
      const data = await response.json();
      if (data.success) {
        // Initialiser l'arbre hiérarchique
        const tree = {
          root: data.tree.root,
          parents: {},
          children: {},
          siblings: {}
        };
        
        if (data.tree.parents) {
          tree.parents[personId] = data.tree.parents;
        }
        if (data.tree.children) {
          tree.children[personId] = data.tree.children;
        }
        if (data.tree.siblings) {
          tree.siblings[personId] = data.tree.siblings;
        }
        
        setHierarchicalTree(tree);
        setTreeData(data.tree);
        setTreeStats({
          nodes: data.tree.metadata?.totalNodes || 1,
          depth: data.tree.metadata?.depth || 1
        });
        
        return data.tree;
      }
    } catch (error) {
      console.error('Erreur chargement arbre:', error);
    } finally {
      setLoading(false);
    }
    return null;
  }, []);

  // Fonction pour charger les parents
  const loadParents = useCallback(async (nodeId) => {
    try {
      const response = await fetch(`/api/genealogy/find-parents/${nodeId}`);
      const data = await response.json();
      if (data.success && data.parents) {
        // Mettre à jour l'arbre hiérarchique sans écraser les données existantes
        setHierarchicalTree(prev => ({
          ...prev,
          parents: {
            ...prev.parents,
            [nodeId]: data.parents
          }
        }));
        
        setExpandedNodes(prev => ({
          ...prev,
          [`parents-${nodeId}`]: true
        }));
        
        // Mettre à jour les stats
        setTreeStats(prev => ({
          ...prev,
          nodes: prev.nodes + (data.parents.father ? 1 : 0) + (data.parents.mother ? 1 : 0)
        }));
        
        return data.parents;
      }
    } catch (error) {
      console.error('Erreur chargement parents:', error);
    }
    return null;
  }, []);

  // Fonction pour charger les enfants
  const loadChildren = useCallback(async (nodeId) => {
    try {
      const response = await fetch(`/api/genealogy/find-children/${nodeId}`);
      const data = await response.json();
      if (data.success && data.children) {
        // Mettre à jour l'arbre hiérarchique
        setHierarchicalTree(prev => ({
          ...prev,
          children: {
            ...prev.children,
            [nodeId]: data.children
          }
        }));
        
        setExpandedNodes(prev => ({
          ...prev,
          [`children-${nodeId}`]: true
        }));
        
        // Mettre à jour les stats
        setTreeStats(prev => ({
          ...prev,
          nodes: prev.nodes + data.children.length
        }));
        
        return data.children;
      }
    } catch (error) {
      console.error('Erreur chargement enfants:', error);
    }
    return [];
  }, []);

  // Fonction de recherche
  const handleSearch = async () => {
    if (!searchValue.trim()) return;
    
    setLoading(true);
    try {
      let endpoint = '';
      if (searchMode === 'actNumber') {
        endpoint = `/api/genealogy/search-by-act?actNumber=${encodeURIComponent(searchValue)}`;
      } else {
        endpoint = `/api/persons/search?q=${encodeURIComponent(searchValue)}&limit=1`;
      }

      const response = await fetch(endpoint);
      const data = await response.json();
      
      if (data.success) {
        const personId = searchMode === 'actNumber' 
          ? data.person.id 
          : data.results?.[0]?.id;
          
        if (personId) {
          // Réinitialiser l'arbre
          setExpandedNodes({});
          const treeData = await loadPersonData(personId);
          if (treeData) {
            renderVisualization();
          }
        }
      }
    } catch (error) {
      console.error('Erreur recherche:', error);
    } finally {
      setLoading(false);
    }
  };

  // Rendu de la visualisation pyramidale
  const renderPyramidView = useCallback(() => {
    if (!svgRef.current || !hierarchicalTree.root) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 80, right: 20, bottom: 80, left: 20 };
    const width = dimensions.width - margin.left - margin.right;
    const height = dimensions.height - margin.top - margin.bottom;

    // Créer les gradients
    const defs = svg.append("defs");
    
    const mainGradient = defs.append("linearGradient")
      .attr("id", "main-gradient")
      .attr("gradientTransform", "rotate(45)");
    mainGradient.append("stop").attr("offset", "0%").attr("stop-color", "#3B82F6");
    mainGradient.append("stop").attr("offset", "100%").attr("stop-color", "#10B981");

    const parentGradient = defs.append("linearGradient")
      .attr("id", "parent-gradient");
    parentGradient.append("stop").attr("offset", "0%").attr("stop-color", "#8B5CF6");
    parentGradient.append("stop").attr("offset", "100%").attr("stop-color", "#A78BFA");

    const childGradient = defs.append("linearGradient")
      .attr("id", "child-gradient");
    childGradient.append("stop").attr("offset", "0%").attr("stop-color", "#10B981");
    childGradient.append("stop").attr("offset", "100%").attr("stop-color", "#34D399");

    // Groupe principal avec zoom
    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Zoom
    const zoom = d3.zoom()
      .scaleExtent([0.3, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    // Construire la pyramide hiérarchique
    const centerX = width / 2;
    const levelHeight = 120;
    const nodeWidth = 180;
    const nodeHeight = 60;
    const horizontalSpacing = 20;

    // Position de la personne racine (centre)
    const rootY = height / 2;

    // Fonction pour dessiner un nœud
    const drawNode = (x, y, person, type) => {
      const nodeGroup = g.append("g")
        .attr("class", "node")
        .attr("transform", `translate(${x},${y})`);

      // Rectangle du nœud
      nodeGroup.append("rect")
        .attr("x", -nodeWidth/2)
        .attr("y", -nodeHeight/2)
        .attr("width", nodeWidth)
        .attr("height", nodeHeight)
        .attr("rx", 8)
        .attr("fill", type === 'root' ? "url(#main-gradient)" : 
                     type === 'parent' ? "url(#parent-gradient)" : 
                     "url(#child-gradient)")
        .attr("stroke", selectedNode?.id === person.id ? "#3B82F6" : "#fff")
        .attr("stroke-width", selectedNode?.id === person.id ? 3 : 2)
        .style("cursor", "pointer")
        .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.1))")
        .on("click", () => handleNodeSelect(person))
        .on("mouseover", function(event) {
          d3.select(this)
            .transition().duration(200)
            .style("filter", "drop-shadow(0 4px 8px rgba(0,0,0,0.2))");
          showTooltip(event, person);
        })
        .on("mouseout", function() {
          d3.select(this)
            .transition().duration(200)
            .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.1))");
          hideTooltip();
        });

      // Icône de genre
      nodeGroup.append("text")
        .attr("x", -nodeWidth/2 + 20)
        .attr("y", 5)
        .attr("font-size", "20px")
        .attr("fill", "white")
        .text(person.sexe === '1' ? '♂' : person.sexe === '2' ? '♀' : '👤');

      // Nom
      const fullName = `${person.noms_enfant || ''} ${person.prenoms_enfant || ''}`.trim();
      nodeGroup.append("text")
        .attr("x", 0)
        .attr("y", -5)
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .attr("font-weight", "600")
        .attr("fill", "white")
        .text(fullName.length > 20 ? fullName.substring(0, 20) + '...' : fullName);

      // Date de naissance
      nodeGroup.append("text")
        .attr("x", 0)
        .attr("y", 15)
        .attr("text-anchor", "middle")
        .attr("font-size", "11px")
        .attr("fill", "rgba(255,255,255,0.9)")
        .text(person.date_naiss ? new Date(person.date_naiss).getFullYear() : '');

      // Bouton expansion parents
      if (!expandedNodes[`parents-${person.id}`] && type !== 'parent') {
        nodeGroup.append("g")
          .attr("class", "expand-btn")
          .style("cursor", "pointer")
          .on("click", (event) => {
            event.stopPropagation();
            expandParents(person.id);
          })
          .call(g => {
            g.append("circle")
              .attr("cx", 0)
              .attr("cy", -nodeHeight/2 - 15)
              .attr("r", 12)
              .attr("fill", "#8B5CF6")
              .attr("stroke", "#fff")
              .attr("stroke-width", 2);
            g.append("text")
              .attr("x", 0)
              .attr("y", -nodeHeight/2 - 11)
              .attr("text-anchor", "middle")
              .attr("fill", "white")
              .attr("font-size", "14px")
              .text("↑");
          });
      }

      // Bouton expansion enfants
      if (!expandedNodes[`children-${person.id}`] && type !== 'child') {
        nodeGroup.append("g")
          .attr("class", "expand-btn")
          .style("cursor", "pointer")
          .on("click", (event) => {
            event.stopPropagation();
            expandChildren(person.id);
          })
          .call(g => {
            g.append("circle")
              .attr("cx", 0)
              .attr("cy", nodeHeight/2 + 15)
              .attr("r", 12)
              .attr("fill", "#10B981")
              .attr("stroke", "#fff")
              .attr("stroke-width", 2);
            g.append("text")
              .attr("x", 0)
              .attr("y", nodeHeight/2 + 19)
              .attr("text-anchor", "middle")
              .attr("fill", "white")
              .attr("font-size", "14px")
              .text("↓");
          });
      }

      return nodeGroup;
    };

    // Fonction récursive pour dessiner l'arbre
    const drawTree = () => {
      // Dessiner la personne racine
      drawNode(centerX, rootY, hierarchicalTree.root, 'root');

      // Dessiner les parents et grands-parents
      const drawParentsLevel = (personId, x, y, level) => {
        const parents = hierarchicalTree.parents[personId];
        if (!parents || !expandedNodes[`parents-${personId}`]) return;

        const spacing = nodeWidth + horizontalSpacing;
        
        if (parents.father) {
          const fatherX = x - spacing/2;
          const fatherY = y - levelHeight;
          drawNode(fatherX, fatherY, parents.father, 'parent');
          
          // Ligne de connexion
          g.append("line")
            .attr("x1", fatherX)
            .attr("y1", fatherY + nodeHeight/2)
            .attr("x2", x)
            .attr("y2", y - nodeHeight/2)
            .attr("stroke", "#8B5CF6")
            .attr("stroke-width", 2)
            .attr("opacity", 0.6);
          
          // Récursion pour les grands-parents paternels
          if (level < 3) {
            drawParentsLevel(parents.father.id, fatherX, fatherY, level + 1);
          }
        }
        
        if (parents.mother) {
          const motherX = x + spacing/2;
          const motherY = y - levelHeight;
          drawNode(motherX, motherY, parents.mother, 'parent');
          
          // Ligne de connexion
          g.append("line")
            .attr("x1", motherX)
            .attr("y1", motherY + nodeHeight/2)
            .attr("x2", x)
            .attr("y2", y - nodeHeight/2)
            .attr("stroke", "#8B5CF6")
            .attr("stroke-width", 2)
            .attr("opacity", 0.6);
          
          // Récursion pour les grands-parents maternels
          if (level < 3) {
            drawParentsLevel(parents.mother.id, motherX, motherY, level + 1);
          }
        }
      };

      // Dessiner les enfants et petits-enfants
      const drawChildrenLevel = (personId, x, y, level) => {
        const children = hierarchicalTree.children[personId];
        if (!children || !expandedNodes[`children-${personId}`] || children.length === 0) return;

        const totalWidth = children.length * nodeWidth + (children.length - 1) * horizontalSpacing;
        const startX = x - totalWidth/2 + nodeWidth/2;
        
        children.forEach((child, index) => {
          const childX = startX + index * (nodeWidth + horizontalSpacing);
          const childY = y + levelHeight;
          drawNode(childX, childY, child, 'child');
          
          // Ligne de connexion
          g.append("line")
            .attr("x1", x)
            .attr("y1", y + nodeHeight/2)
            .attr("x2", childX)
            .attr("y2", childY - nodeHeight/2)
            .attr("stroke", "#10B981")
            .attr("stroke-width", 2)
            .attr("opacity", 0.6);
          
          // Récursion pour les petits-enfants
          if (level < 3) {
            drawChildrenLevel(child.id, childX, childY, level + 1);
          }
        });
      };

      // Dessiner tous les niveaux
      drawParentsLevel(hierarchicalTree.root.id, centerX, rootY, 1);
      drawChildrenLevel(hierarchicalTree.root.id, centerX, rootY, 1);
    };

    drawTree();

    // Fonctions de contrôle du zoom
    window.treeZoomIn = () => svg.transition().call(zoom.scaleBy, 1.3);
    window.treeZoomOut = () => svg.transition().call(zoom.scaleBy, 0.7);
    window.treeResetZoom = () => svg.transition().call(zoom.transform, d3.zoomIdentity);
    window.treeFitToScreen = () => {
      const bounds = g.node().getBBox();
      const scale = 0.9 / Math.max(bounds.width / width, bounds.height / height);
      svg.transition().duration(750).call(
        zoom.transform,
        d3.zoomIdentity
          .translate(width / 2, height / 2)
          .scale(scale)
          .translate(-bounds.x - bounds.width / 2, -bounds.y - bounds.height / 2)
      );
    };
  }, [hierarchicalTree, expandedNodes, selectedNode, dimensions]);

  // Fonction pour afficher le tooltip
  const showTooltip = (event, person) => {
    const tooltip = d3.select('body').append('div')
      .attr('class', 'tree-tooltip')
      .style('position', 'absolute')
      .style('background', 'white')
      .style('border', '1px solid #ddd')
      .style('border-radius', '8px')
      .style('padding', '12px')
      .style('box-shadow', '0 4px 6px rgba(0,0,0,0.1)')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .style('z-index', 1000);

    const html = `
      <div style="font-size: 14px;">
        <strong>${person.noms_enfant || ''} ${person.prenoms_enfant || ''}</strong><br/>
        <span style="color: #64748b; font-size: 12px;">
          ${person.sexe === '1' ? '♂ Masculin' : person.sexe === '2' ? '♀ Féminin' : '👤 Non spécifié'}<br/>
          Né(e) le: ${person.date_naiss ? new Date(person.date_naiss).toLocaleDateString('fr-FR') : 'Non renseigné'}<br/>
          Lieu: ${person.lieu_naiss || 'Non renseigné'}<br/>
          ${person.noms_pere ? `Père: ${person.noms_pere}<br/>` : ''}
          ${person.noms_mere ? `Mère: ${person.noms_mere}<br/>` : ''}
          ${person.num_acte ? `N° Acte: ${person.num_acte}` : ''}
        </span>
      </div>
    `;

    tooltip.html(html)
      .style('left', (event.pageX + 10) + 'px')
      .style('top', (event.pageY - 10) + 'px')
      .transition().duration(200)
      .style('opacity', 1);
  };

  const hideTooltip = () => {
    d3.selectAll('.tree-tooltip').remove();
  };

  // Fonction d'expansion des parents
  const expandParents = async (nodeId) => {
    setLoading(true);
    await loadParents(nodeId);
    setLoading(false);
    renderVisualization();
  };

  // Fonction d'expansion des enfants
  const expandChildren = async (nodeId) => {
    setLoading(true);
    await loadChildren(nodeId);
    setLoading(false);
    renderVisualization();
  };

  // Sélection d'un nœud
  const handleNodeSelect = (person) => {
    setSelectedNode(person);
    if (onNodeClick) {
      onNodeClick(person);
    }
  };

  // Rendu selon le mode de vue
  const renderVisualization = useCallback(() => {
    if (viewMode === 'pyramid') {
      renderPyramidView();
    }
    // Ajouter d'autres modes si nécessaire
  }, [viewMode, renderPyramidView]);

  // Export PNG
  const exportToPNG = () => {
    const svgElement = svgRef.current;
    const svgString = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    
    img.onload = () => {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `arbre-genealogique-${Date.now()}.png`;
        link.href = url;
        link.click();
      });
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
  };

  // Effects
  useEffect(() => {
    if (hierarchicalTree.root) {
      renderVisualization();
    }
  }, [hierarchicalTree, expandedNodes, renderVisualization]);

  useEffect(() => {
    if (initialPersonId) {
      loadPersonData(initialPersonId).then(() => {
        renderVisualization();
      });
    }
  }, [initialPersonId, loadPersonData, renderVisualization]);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: height
        });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [height]);

  return (
    <div className="relative w-full bg-gray-50 rounded-lg overflow-hidden" ref={containerRef}>
      {/* Barre de recherche */}
      <div className="absolute top-4 left-4 z-20 bg-white rounded-lg shadow-lg p-4 max-w-md">
        <div className="flex items-center space-x-2 mb-3">
          <button
            onClick={() => setSearchMode('name')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              searchMode === 'name' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Par nom
          </button>
          <button
            onClick={() => setSearchMode('actNumber')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              searchMode === 'actNumber' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Par N° acte
          </button>
        </div>
        
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder={searchMode === 'name' ? 'Nom et prénom...' : 'Numéro d\'acte...'}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <button
            onClick={handleSearch}
            disabled={loading || !searchValue.trim()}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            <Search className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Sélecteur de mode de vue */}
      <div className="absolute top-20 right-4 z-20 bg-white rounded-lg shadow-lg p-2">
        <div className="flex flex-col space-y-1">
          <button
            onClick={() => setViewMode('pyramid')}
            className={`px-3 py-2 text-xs rounded flex items-center space-x-2 transition-colors ${
              viewMode === 'pyramid' 
                ? 'bg-blue-600 text-white' 
                : 'hover:bg-gray-100 text-gray-700'
            }`}
          >
            <Grid3X3 className="h-4 w-4" />
            <span>Vue Pyramidale</span>
          </button>
          <button
            onClick={() => setViewMode('radial')}
            className={`px-3 py-2 text-xs rounded flex items-center space-x-2 transition-colors ${
              viewMode === 'radial' 
                ? 'bg-blue-600 text-white' 
                : 'hover:bg-gray-100 text-gray-700'
            }`}
            disabled
          >
            <Network className="h-4 w-4" />
            <span>Vue Radiale</span>
          </button>
          <button
            onClick={() => setViewMode('horizontal')}
            className={`px-3 py-2 text-xs rounded flex items-center space-x-2 transition-colors ${
              viewMode === 'horizontal' 
                ? 'bg-blue-600 text-white' 
                : 'hover:bg-gray-100 text-gray-700'
            }`}
            disabled
          >
            <GitBranch className="h-4 w-4" />
            <span>Vue Horizontale</span>
          </button>
        </div>
      </div>

      {/* Contrôles de zoom */}
      <div className="absolute top-4 right-4 z-20 bg-white rounded-lg shadow-lg p-2">
        <div className="flex flex-col space-y-2">
          <button
            onClick={() => window.treeZoomIn?.()}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
            title="Zoom avant"
          >
            <ZoomIn className="h-5 w-5 text-gray-700" />
          </button>
          <button
            onClick={() => window.treeZoomOut?.()}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
            title="Zoom arrière"
          >
            <ZoomOut className="h-5 w-5 text-gray-700" />
          </button>
          <button
            onClick={() => window.treeResetZoom?.()}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
            title="Réinitialiser"
          >
            <RotateCcw className="h-5 w-5 text-gray-700" />
          </button>
          <button
            onClick={() => window.treeFitToScreen?.()}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
            title="Adapter à l'écran"
          >
            <Maximize2 className="h-5 w-5 text-gray-700" />
          </button>
          <button
            onClick={exportToPNG}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
            title="Exporter en PNG"
          >
            <Download className="h-5 w-5 text-gray-700" />
          </button>
        </div>
      </div>

      {/* Statistiques */}
      {treeStats.nodes > 0 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20 bg-white rounded-lg shadow-lg px-4 py-2">
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-1">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="text-gray-700">
                <strong>{treeStats.nodes}</strong> personnes
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <Info className="h-4 w-4 text-green-600" />
              <span className="text-gray-700">
                <strong>{Object.keys(expandedNodes).length}</strong> branches explorées
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Légende */}
      <div className="absolute bottom-4 left-4 z-20 bg-white rounded-lg shadow-lg p-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
          <Info className="h-4 w-4 mr-1" />
          Légende
        </h4>
        <div className="space-y-1 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gradient-to-r from-blue-600 to-green-600 rounded"></div>
            <span>Personne principale</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-purple-500 rounded"></div>
            <span>Parents/Ancêtres</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span>Enfants/Descendants</span>
          </div>
          <div className="mt-2 pt-2 border-t border-gray-200">
            <div>♂ Masculin | ♀ Féminin</div>
            <div className="flex items-center space-x-2 mt-1">
              <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs">↑</div>
              <span className="text-xs">Voir parents</span>
            </div>
            <div className="flex items-center space-x-2 mt-1">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">↓</div>
              <span className="text-xs">Voir enfants</span>
            </div>
          </div>
        </div>
      </div>

      {/* Panneau de détails */}
      {selectedNode && (
        <div className="absolute bottom-4 right-4 z-20 bg-white rounded-lg shadow-lg p-4 max-w-sm animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 flex items-center">
              <User className="h-4 w-4 mr-2" />
              Détails de la personne
            </h3>
            <button
              onClick={() => setSelectedNode(null)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-3 gap-2 pb-2 border-b border-gray-200">
              <div className="text-gray-600">Nom:</div>
              <div className="col-span-2 font-medium">
                {selectedNode.noms_enfant} {selectedNode.prenoms_enfant || ''}
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <div className="text-gray-600">Sexe:</div>
              <div className="col-span-2">
                {selectedNode.sexe === '1' ? '♂ Masculin' : selectedNode.sexe === '2' ? '♀ Féminin' : 'Non spécifié'}
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <div className="text-gray-600">Né(e) le:</div>
              <div className="col-span-2">
                {selectedNode.date_naiss ? new Date(selectedNode.date_naiss).toLocaleDateString('fr-FR') : 'Non renseigné'}
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <div className="text-gray-600">Lieu:</div>
              <div className="col-span-2">{selectedNode.lieu_naiss || 'Non renseigné'}</div>
            </div>
            
            {selectedNode.noms_pere && (
              <div className="grid grid-cols-3 gap-2">
                <div className="text-gray-600">Père:</div>
                <div className="col-span-2">{selectedNode.noms_pere}</div>
              </div>
            )}
            
            {selectedNode.noms_mere && (
              <div className="grid grid-cols-3 gap-2">
                <div className="text-gray-600">Mère:</div>
                <div className="col-span-2">{selectedNode.noms_mere}</div>
              </div>
            )}
            
            {selectedNode.num_acte && (
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-200">
                <div className="text-gray-600">N° Acte:</div>
                <div className="col-span-2">
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs">{selectedNode.num_acte}</code>
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-4 pt-3 border-t border-gray-200 space-y-2">
            <button
              onClick={async () => {
                setExpandedNodes({});
                await loadPersonData(selectedNode.id);
                renderVisualization();
              }}
              className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              <Users className="h-4 w-4 mr-2" />
              Centrer sur cette personne
            </button>
            
            {!expandedNodes[`parents-${selectedNode.id}`] && (
              <button
                onClick={() => expandParents(selectedNode.id)}
                className="w-full px-3 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center"
              >
                <ChevronUp className="h-4 w-4 mr-2" />
                Voir ses parents
              </button>
            )}
            
            {!expandedNodes[`children-${selectedNode.id}`] && (
              <button
                onClick={() => expandChildren(selectedNode.id)}
                className="w-full px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
              >
                <ChevronDown className="h-4 w-4 mr-2" />
                Voir ses enfants
              </button>
            )}
          </div>
        </div>
      )}

      {/* Instructions si aucun arbre */}
      {!hierarchicalTree.root && !loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
            <div className="mb-4">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-100 to-green-100 rounded-full flex items-center justify-center">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Arbre Généalogique Interactif
            </h2>
            <p className="text-gray-600 mb-6">
              Recherchez une personne par son nom ou numéro d'acte pour commencer à explorer son arbre généalogique.
            </p>
            
            <div className="space-y-3 text-left text-sm text-gray-600">
              <div className="flex items-start">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 font-bold text-xs">1</span>
                </div>
                <span className="ml-2">Entrez un nom ou numéro d'acte dans la barre de recherche</span>
              </div>
              <div className="flex items-start">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 font-bold text-xs">2</span>
                </div>
                <span className="ml-2">Cliquez sur les boutons ↑ ou ↓ pour explorer parents et enfants</span>
              </div>
              <div className="flex items-start">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 font-bold text-xs">3</span>
                </div>
                <span className="ml-2">Utilisez la molette ou les boutons pour zoomer</span>
              </div>
              <div className="flex items-start">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 font-bold text-xs">4</span>
                </div>
                <span className="ml-2">Exportez l'arbre en image PNG haute résolution</span>
              </div>
            </div>
            
            <div className="mt-6 p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-700">
                <strong>💡 Astuce :</strong> L'arbre se construit progressivement. Les données restent visibles même après expansion de nouvelles branches.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-30">
          <div className="bg-white rounded-lg shadow-lg p-6 flex flex-col items-center">
            <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-3" />
            <p className="text-gray-700 font-medium">Chargement des données...</p>
            <p className="text-gray-500 text-sm mt-1">Veuillez patienter</p>
          </div>
        </div>
      )}

      {/* SVG Container */}
      <svg
        ref={svgRef}
        className="w-full bg-gradient-to-br from-gray-50 via-white to-blue-50"
        style={{ height: `${height}px`, cursor: 'move' }}
      />

      {/* Styles CSS pour les animations */}

    </div>
  );
};

export default TreeVisualizationFixed;