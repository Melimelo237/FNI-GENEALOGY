// src/components/genealogy/InteractiveD3Tree.jsx
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
  Loader2
} from 'lucide-react';

const InteractiveD3Tree = ({ 
  initialPersonId,
  onNodeClick,
  height = 800 
}) => {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [currentTree, setCurrentTree] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [dimensions, setDimensions] = useState({ width: 1200, height });
  const [searchMode, setSearchMode] = useState('name'); // 'name' ou 'actNumber'
  const [searchValue, setSearchValue] = useState('');
  const [treeStats, setTreeStats] = useState({ nodes: 0, depth: 0 });

  // Fonction pour charger les données d'une personne
  const loadPersonData = useCallback(async (personId) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/genealogy/build-tree/${personId}?depth=1`);
      const data = await response.json();
      if (data.success) {
        setTreeStats({
          nodes: data.tree.metadata?.totalNodes || 1,
          depth: data.tree.metadata?.depth || 1
        });
        return data.tree;
      }
    } catch (error) {
      console.error('Erreur chargement arbre:', error);
    }
    setLoading(false);
    return null;
  }, []);

  // Fonction pour charger les parents d'un nœud
  const loadParents = useCallback(async (nodeId) => {
    try {
      const response = await fetch(`/api/genealogy/find-parents/${nodeId}`);
      const data = await response.json();
      if (data.success) {
        return data.parents;
      }
    } catch (error) {
      console.error('Erreur chargement parents:', error);
    }
    return null;
  }, []);

  // Fonction pour charger les enfants d'un nœud
  const loadChildren = useCallback(async (nodeId) => {
    try {
      const response = await fetch(`/api/genealogy/find-children/${nodeId}`);
      const data = await response.json();
      if (data.success) {
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
        // Recherche par nom avec API persons
        endpoint = `/api/persons/search?q=${encodeURIComponent(searchValue)}&limit=1`;
      }

      const response = await fetch(endpoint);
      const data = await response.json();
      
      if (data.success) {
        const personId = searchMode === 'actNumber' 
          ? data.person.id 
          : data.results?.[0]?.id;
          
        if (personId) {
          const treeData = await loadPersonData(personId);
          if (treeData) {
            setCurrentTree(treeData);
            renderTree(treeData);
          }
        }
      }
    } catch (error) {
      console.error('Erreur recherche:', error);
    }
    setLoading(false);
  };

  // Préparer les données pour la hiérarchie D3
  const prepareHierarchyData = useCallback((treeData) => {
    if (!treeData || !treeData.root) return null;

    // Créer le nœud racine
    const rootNode = {
      id: treeData.root.id,
      type: 'root',
      person: treeData.root,
      canExpandParents: !expandedNodes.has(`parents-${treeData.root.id}`),
      canExpandChildren: !expandedNodes.has(`children-${treeData.root.id}`),
      children: []
    };

    // Structure temporaire pour organiser les nœuds
    const parentsGroup = [];
    const childrenGroup = [];
    const siblingsGroup = [];

    // Ajouter les parents
    if (treeData.parents) {
      if (treeData.parents.father) {
        parentsGroup.push({
          id: treeData.parents.father.id,
          type: 'parent',
          subtype: 'father',
          person: treeData.parents.father,
          canExpandParents: !expandedNodes.has(`parents-${treeData.parents.father.id}`),
          canExpandChildren: !expandedNodes.has(`children-${treeData.parents.father.id}`)
        });
      }
      if (treeData.parents.mother) {
        parentsGroup.push({
          id: treeData.parents.mother.id,
          type: 'parent',
          subtype: 'mother',
          person: treeData.parents.mother,
          canExpandParents: !expandedNodes.has(`parents-${treeData.parents.mother.id}`),
          canExpandChildren: !expandedNodes.has(`children-${treeData.parents.mother.id}`)
        });
      }
    }

    // Ajouter les enfants
    if (treeData.children && treeData.children.length > 0) {
      treeData.children.forEach(child => {
        childrenGroup.push({
          id: child.id,
          type: 'child',
          person: child,
          canExpandParents: !expandedNodes.has(`parents-${child.id}`),
          canExpandChildren: !expandedNodes.has(`children-${child.id}`)
        });
      });
    }

    // Ajouter les frères et sœurs (max 4 pour l'affichage)
    if (treeData.siblings && treeData.siblings.length > 0) {
      treeData.siblings.slice(0, 4).forEach(sibling => {
        siblingsGroup.push({
          id: sibling.id,
          type: 'sibling',
          person: sibling,
          canExpandParents: !expandedNodes.has(`parents-${sibling.id}`),
          canExpandChildren: !expandedNodes.has(`children-${sibling.id}`)
        });
      });
    }

    // Organiser les nœuds en arbre
    // Parents au-dessus
    if (parentsGroup.length > 0) {
      const parentsNode = {
        id: 'parents-group',
        type: 'group',
        subtype: 'parents',
        children: parentsGroup
      };
      rootNode.children.push(parentsNode);
    }

    // Frères et sœurs sur les côtés
    if (siblingsGroup.length > 0) {
      const siblingsNode = {
        id: 'siblings-group',
        type: 'group',
        subtype: 'siblings',
        children: siblingsGroup
      };
      rootNode.children.push(siblingsNode);
    }

    // Enfants en dessous
    if (childrenGroup.length > 0) {
      const childrenNode = {
        id: 'children-group',
        type: 'group',
        subtype: 'children',
        children: childrenGroup
      };
      rootNode.children.push(childrenNode);
    }

    return rootNode;
  }, [expandedNodes]);

  // Rendu de l'arbre avec D3.js
  const renderTree = useCallback((treeData) => {
    if (!treeData || !svgRef.current) return;

    // Nettoyer le SVG précédent
    d3.select(svgRef.current).selectAll("*").remove();

    const margin = { top: 100, right: 150, bottom: 100, left: 150 };
    const width = dimensions.width - margin.left - margin.right;
    const height = dimensions.height - margin.top - margin.bottom;

    // Créer le SVG principal
    const svg = d3.select(svgRef.current)
      .attr("width", dimensions.width)
      .attr("height", dimensions.height);

    // Ajouter les définitions (gradients, patterns)
    const defs = svg.append("defs");
    
    // Gradient pour le nœud principal
    const mainGradient = defs.append("linearGradient")
      .attr("id", "main-gradient")
      .attr("x1", "0%").attr("y1", "0%")
      .attr("x2", "100%").attr("y2", "100%");
    mainGradient.append("stop")
      .attr("offset", "0%").attr("stop-color", "#2563eb");
    mainGradient.append("stop")
      .attr("offset", "100%").attr("stop-color", "#16a34a");

    // Gradients pour les relations
    const colors = {
      parent: { primary: "#8b5cf6", secondary: "#a78bfa" },
      child: { primary: "#10b981", secondary: "#34d399" },
      sibling: { primary: "#f59e0b", secondary: "#fbbf24" }
    };

    Object.entries(colors).forEach(([type, color]) => {
      const gradient = defs.append("linearGradient")
        .attr("id", `${type}-gradient`)
        .attr("x1", "0%").attr("y1", "0%")
        .attr("x2", "100%").attr("y2", "100%");
      gradient.append("stop")
        .attr("offset", "0%").attr("stop-color", color.primary);
      gradient.append("stop")
        .attr("offset", "100%").attr("stop-color", color.secondary);
    });

    // Créer le groupe principal avec zoom
    const g = svg.append("g")
      .attr("transform", `translate(${dimensions.width / 2},${dimensions.height / 2})`);

    // Zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.3, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    // Préparer les données pour l'arbre
    const hierarchyData = prepareHierarchyData(treeData);
    if (!hierarchyData) return;
    
    // Créer le layout d'arbre
    const treeLayout = d3.tree()
      .size([2 * Math.PI, Math.min(width, height) / 2])
      .separation((a, b) => {
        return (a.parent === b.parent ? 1 : 2) / a.depth;
      });

    // Créer la hiérarchie
    const root = d3.hierarchy(hierarchyData);
    const treeNodes = treeLayout(root);

    // Fonction pour convertir les coordonnées polaires en cartésiennes
    const project = (x, y) => {
      const angle = x - Math.PI / 2;
      return [y * Math.cos(angle), y * Math.sin(angle)];
    };

    // Dessiner les liens
    const link = g.selectAll('.link')
      .data(treeNodes.links())
      .enter().append('g')
      .attr('class', 'link');

    link.append('path')
      .attr('d', d => {
        const source = project(d.source.x, d.source.y);
        const target = project(d.target.x, d.target.y);
        return `M${source[0]},${source[1]} L${target[0]},${target[1]}`;
      })
      .attr('fill', 'none')
      .attr('stroke', d => {
        if (d.target.data.type === 'group') return '#e5e7eb';
        if (d.target.data.type === 'parent') return '#8b5cf6';
        if (d.target.data.type === 'child') return '#10b981';
        if (d.target.data.type === 'sibling') return '#f59e0b';
        return '#94a3b8';
      })
      .attr('stroke-width', d => d.target.data.type === 'group' ? 1 : 2)
      .attr('stroke-opacity', d => d.target.data.type === 'group' ? 0.3 : 0.6)
      .attr('stroke-dasharray', d => {
        return d.target.data.type === 'sibling' ? '5,5' : 'none';
      });

    // Dessiner les nœuds
    const node = g.selectAll('.node')
      .data(treeNodes.descendants())
      .enter().append('g')
      .attr('class', 'node')
      .attr('transform', d => {
        const [x, y] = project(d.x, d.y);
        return `translate(${x},${y})`;
      });

    // Filtrer les nœuds de groupe (invisibles)
    const actualNodes = node.filter(d => d.data.type !== 'group');

    // Ajouter les cercles pour chaque nœud
    actualNodes.append('circle')
      .attr('r', d => {
        if (d.data.type === 'root') return 35;
        if (expandedNodes.has(`children-${d.data.id}`) || expandedNodes.has(`parents-${d.data.id}`)) return 30;
        return 25;
      })
      .attr('fill', d => {
        if (d.data.type === 'root') return 'url(#main-gradient)';
        if (d.data.type === 'parent') return 'url(#parent-gradient)';
        if (d.data.type === 'child') return 'url(#child-gradient)';
        if (d.data.type === 'sibling') return 'url(#sibling-gradient)';
        return '#e2e8f0';
      })
      .attr('stroke', d => selectedNode?.id === d.data.person?.id ? '#2563eb' : '#fff')
      .attr('stroke-width', d => selectedNode?.id === d.data.person?.id ? 3 : 2)
      .style('cursor', 'pointer')
      .style('filter', d => d.data.type === 'root' ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : 'none')
      .on('click', handleNodeClick)
      .on('mouseover', function(event, d) {
        d3.select(this).transition().duration(200)
          .attr('r', d.data.type === 'root' ? 40 : 30);
        showTooltip(event, d);
      })
      .on('mouseout', function(event, d) {
        d3.select(this).transition().duration(200)
          .attr('r', d.data.type === 'root' ? 35 : 25);
        hideTooltip();
      });

    // Ajouter l'icône de genre
    actualNodes.append('text')
      .attr('dy', '.35em')
      .attr('text-anchor', 'middle')
      .attr('font-size', d => d.data.type === 'root' ? '20px' : '16px')
      .attr('fill', 'white')
      .style('pointer-events', 'none')
      .text(d => {
        const sexe = d.data.person?.sexe;
        if (sexe === '1') return '♂';
        if (sexe === '2') return '♀';
        return '👤';
      });

    // Ajouter les boutons d'expansion pour les parents
    actualNodes.filter(d => d.data.canExpandParents && d.data.person)
      .append('g')
      .attr('class', 'expand-parents')
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        expandParents(d.data.id);
      })
      .each(function(d) {
        const g = d3.select(this);
        g.append('circle')
          .attr('cx', 0)
          .attr('cy', -40)
          .attr('r', 12)
          .attr('fill', '#8b5cf6')
          .attr('stroke', '#fff')
          .attr('stroke-width', 2);
        g.append('text')
          .attr('x', 0)
          .attr('y', -36)
          .attr('text-anchor', 'middle')
          .attr('fill', 'white')
          .attr('font-size', '16px')
          .text('↑');
      });

    // Ajouter les boutons d'expansion pour les enfants
    actualNodes.filter(d => d.data.canExpandChildren && d.data.person)
      .append('g')
      .attr('class', 'expand-children')
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        expandChildren(d.data.id);
      })
      .each(function(d) {
        const g = d3.select(this);
        g.append('circle')
          .attr('cx', 0)
          .attr('cy', 40)
          .attr('r', 12)
          .attr('fill', '#10b981')
          .attr('stroke', '#fff')
          .attr('stroke-width', 2);
        g.append('text')
          .attr('x', 0)
          .attr('y', 44)
          .attr('text-anchor', 'middle')
          .attr('fill', 'white')
          .attr('font-size', '16px')
          .text('↓');
      });

    // Ajouter les labels des noms
    actualNodes.append('text')
      .attr('y', d => d.data.type === 'root' ? 55 : 45)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('font-weight', d => d.data.type === 'root' ? 'bold' : 'normal')
      .attr('fill', '#1e293b')
      .text(d => {
        const person = d.data.person;
        if (!person) return '';
        const name = `${person.noms_enfant || ''} ${person.prenoms_enfant || ''}`.trim();
        return name.length > 25 ? name.substring(0, 25) + '...' : name;
      });

    // Ajouter la date de naissance
    actualNodes.append('text')
      .attr('y', d => d.data.type === 'root' ? 70 : 60)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('fill', '#64748b')
      .text(d => {
        const date = d.data.person?.date_naiss;
        if (!date) return '';
        try {
          return new Date(date).getFullYear();
        } catch {
          return '';
        }
      });

    // Fonctions de contrôle du zoom
    window.treeZoomIn = () => {
      svg.transition().call(zoom.scaleBy, 1.3);
    };

    window.treeZoomOut = () => {
      svg.transition().call(zoom.scaleBy, 0.7);
    };

    window.treeResetZoom = () => {
      svg.transition().call(
        zoom.transform, 
        d3.zoomIdentity.translate(dimensions.width / 2, dimensions.height / 2)
      );
    };

    window.treeFitToScreen = () => {
      const bounds = g.node().getBBox();
      const fullWidth = dimensions.width;
      const fullHeight = dimensions.height;
      const width = bounds.width;
      const height = bounds.height;
      const midX = bounds.x + width / 2;
      const midY = bounds.y + height / 2;
      const scale = 0.8 / Math.max(width / fullWidth, height / fullHeight);
      const translate = [fullWidth / 2 - scale * midX, fullHeight / 2 - scale * midY];
      
      svg.transition().duration(750).call(
        zoom.transform,
        d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
      );
    };
  }, [dimensions, selectedNode, expandedNodes, prepareHierarchyData]);

  // Gérer le clic sur un nœud
  const handleNodeClick = async (event, d) => {
    event.stopPropagation();
    if (!d.data.person) return;
    
    setSelectedNode(d.data.person);
    
    if (onNodeClick) {
      onNodeClick(d.data.person);
    }
  };

  // Expansion des parents
  const expandParents = async (nodeId) => {
    if (expandedNodes.has(`parents-${nodeId}`)) return;
    
    setLoading(true);
    const parents = await loadParents(nodeId);
    
    if (parents && (parents.father || parents.mother)) {
      // Mettre à jour l'arbre avec les nouveaux parents
      setExpandedNodes(prev => new Set([...prev, `parents-${nodeId}`]));
      
      // Mettre à jour currentTree avec les nouveaux parents
      const updatedTree = { ...currentTree };
      
      // Fonction récursive pour trouver et mettre à jour le nœud
      const findAndUpdateNode = (node) => {
        if (node.root && node.root.id === nodeId) {
          node.parents = parents;
          return true;
        }
        if (node.children) {
          for (const child of node.children) {
            if (child.id === nodeId) {
              // Créer une nouvelle structure pour ce sous-arbre
              const childTree = {
                root: child,
                parents: parents,
                children: [],
                siblings: []
              };
              Object.assign(child, childTree);
              return true;
            }
          }
        }
        if (node.siblings) {
          for (const sibling of node.siblings) {
            if (sibling.id === nodeId) {
              const siblingTree = {
                root: sibling,
                parents: parents,
                children: [],
                siblings: []
              };
              Object.assign(sibling, siblingTree);
              return true;
            }
          }
        }
        return false;
      };
      
      findAndUpdateNode(updatedTree);
      setCurrentTree(updatedTree);
      renderTree(updatedTree);
    }
    setLoading(false);
  };

  // Expansion des enfants
  const expandChildren = async (nodeId) => {
    if (expandedNodes.has(`children-${nodeId}`)) return;
    
    setLoading(true);
    const children = await loadChildren(nodeId);
    
    if (children && children.length > 0) {
      // Mettre à jour l'arbre avec les nouveaux enfants
      setExpandedNodes(prev => new Set([...prev, `children-${nodeId}`]));
      
      // Mettre à jour currentTree avec les nouveaux enfants
      const updatedTree = { ...currentTree };
      
      // Fonction récursive pour trouver et mettre à jour le nœud
      const findAndUpdateNode = (node) => {
        if (node.root && node.root.id === nodeId) {
          node.children = children;
          return true;
        }
        if (node.parents) {
          if (node.parents.father?.id === nodeId) {
            const fatherTree = {
              ...node.parents.father,
              children: children
            };
            node.parents.father = fatherTree;
            return true;
          }
          if (node.parents.mother?.id === nodeId) {
            const motherTree = {
              ...node.parents.mother,
              children: children
            };
            node.parents.mother = motherTree;
            return true;
          }
        }
        return false;
      };
      
      findAndUpdateNode(updatedTree);
      setCurrentTree(updatedTree);
      renderTree(updatedTree);
    }
    setLoading(false);
  };

  // Tooltip pour les détails
  const showTooltip = (event, d) => {
    const person = d.data.person;
    if (!person) return;

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

  // Export en PNG
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

  // Effet initial
  useEffect(() => {
    if (initialPersonId) {
      loadPersonData(initialPersonId).then(treeData => {
        if (treeData) {
          setCurrentTree(treeData);
          renderTree(treeData);
        }
      });
    }
  }, [initialPersonId, loadPersonData, renderTree]);

  // Re-render quand les données changent
  useEffect(() => {
    if (currentTree) {
      renderTree(currentTree);
    }
  }, [currentTree, renderTree]);

  // Mise à jour des dimensions
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

      {/* Statistiques de l'arbre */}
      {treeStats.nodes > 0 && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 bg-white rounded-lg shadow-lg px-4 py-2">
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
                <strong>{treeStats.depth}</strong> génération{treeStats.depth > 1 ? 's' : ''}
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
            <div className="w-4 h-4 bg-gradient-to-r from-blue-600 to-green-600 rounded-full"></div>
            <span>Personne principale</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
            <span>Parents</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-500 rounded-full"></div>
            <span>Enfants</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
            <span>Frères/Sœurs</span>
          </div>
          <div className="mt-2 pt-2 border-t border-gray-200">
            <div>♂ Masculin | ♀ Féminin</div>
            <div className="flex items-center space-x-2 mt-1">
              <div className="flex items-center">
                <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs">↑</div>
                <span className="ml-1">Voir parents</span>
              </div>
              <div className="flex items-center">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">↓</div>
                <span className="ml-1">Voir enfants</span>
              </div>
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
          
          <div className="mt-4 pt-3 border-t border-gray-200">
            <button
              onClick={async () => {
                const treeData = await loadPersonData(selectedNode.id);
                if (treeData) {
                  setCurrentTree(treeData);
                  setExpandedNodes(new Set());
                  renderTree(treeData);
                }
              }}
              className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              <Users className="h-4 w-4 mr-2" />
              Centrer sur cette personne
            </button>
          </div>
        </div>
      )}

      {/* Instructions d'utilisation */}
      {!currentTree && !loading && (
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

export default InteractiveD3Tree;