// src/components/genealogy/TreeVisualizationD3.jsx
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Download, 
  Maximize2,
  Move,
  Info
} from 'lucide-react';

const TreeVisualizationD3 = ({ 
  treeData, 
  onNodeClick, 
  onExpandNode,
  selectedPerson 
}) => {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });
  const [currentZoom, setCurrentZoom] = useState(1);
  const [showLegend, setShowLegend] = useState(true);
  const [viewMode, setViewMode] = useState('tree'); // 'tree', 'radial', 'force'

  useEffect(() => {
    if (!treeData) return;

    // Clear previous visualization
    d3.select(svgRef.current).selectAll("*").remove();

    // Set up dimensions
    const margin = { top: 40, right: 120, bottom: 40, left: 120 };
    const width = dimensions.width - margin.left - margin.right;
    const height = dimensions.height - margin.top - margin.bottom;

    // Create SVG with zoom capabilities
    const svg = d3.select(svgRef.current)
      .attr("width", dimensions.width)
      .attr("height", dimensions.height);

    // Add gradient definitions for nodes
    const defs = svg.append("defs");
    
    // Gradient for root node
    const rootGradient = defs.append("linearGradient")
      .attr("id", "root-gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "100%");
    rootGradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#2563eb");
    rootGradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#16a34a");

    // Gradients for different relationships
    const relationshipColors = {
      parent: { start: "#8b5cf6", end: "#a78bfa" },
      child: { start: "#10b981", end: "#34d399" },
      sibling: { start: "#f59e0b", end: "#fbbf24" },
      spouse: { start: "#ec4899", end: "#f9a8d4" }
    };

    Object.entries(relationshipColors).forEach(([rel, colors]) => {
      const gradient = defs.append("linearGradient")
        .attr("id", `${rel}-gradient`)
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "100%");
      gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", colors.start);
      gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", colors.end);
    });

    // Create zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.3, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
        setCurrentZoom(event.transform.k);
      });

    svg.call(zoom);

    // Create main group for transformation
    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Convert tree data to D3 hierarchy
    const hierarchyData = convertToHierarchy(treeData);
    
    if (viewMode === 'tree') {
      renderTreeLayout(g, hierarchyData, width, height);
    } else if (viewMode === 'radial') {
      renderRadialLayout(g, hierarchyData, width, height);
    } else {
      renderForceLayout(g, hierarchyData, width, height);
    }

    // Add controls functions
    window.zoomIn = () => {
      svg.transition().call(zoom.scaleBy, 1.3);
    };

    window.zoomOut = () => {
      svg.transition().call(zoom.scaleBy, 0.7);
    };

    window.resetZoom = () => {
      svg.transition().call(zoom.transform, d3.zoomIdentity);
      setCurrentZoom(1);
    };

    window.fitToScreen = () => {
      const bounds = g.node().getBBox();
      const fullWidth = dimensions.width;
      const fullHeight = dimensions.height;
      const width = bounds.width;
      const height = bounds.height;
      const midX = bounds.x + width / 2;
      const midY = bounds.y + height / 2;
      const scale = 0.9 / Math.max(width / fullWidth, height / fullHeight);
      const translate = [fullWidth / 2 - scale * midX, fullHeight / 2 - scale * midY];
      
      svg.transition().duration(750).call(
        zoom.transform,
        d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
      );
    };

  }, [treeData, dimensions, viewMode]);

  // Convert flat tree data to D3 hierarchy format
  const convertToHierarchy = (data) => {
    if (!data) return null;

    const createNode = (person, relationship = 'root') => ({
      id: person.id,
      name: person.name || person.full_name,
      data: person.data || person,
      relationship,
      gender: person.data?.sexe || person.sexe,
      birthDate: person.data?.date_naiss || person.date_naiss,
      birthPlace: person.data?.lieu_naiss || person.lieu_naiss,
      children: []
    });

    const root = createNode(data);

    // Add parents as "ancestors" (reversed for visualization)
    if (data.parents && data.parents.length > 0) {
      const parentsNode = {
        id: 'parents-group',
        name: 'Parents',
        relationship: 'parent-group',
        children: data.parents.map(p => createNode(p, 'parent'))
      };
      root.children.push(parentsNode);
    }

    // Add siblings
    if (data.siblings && data.siblings.length > 0) {
      const siblingsNode = {
        id: 'siblings-group',
        name: 'Fratrie',
        relationship: 'sibling-group',
        children: data.siblings.map(s => createNode(s, 'sibling'))
      };
      root.children.push(siblingsNode);
    }

    // Add children
    if (data.children && data.children.length > 0) {
      const childrenNode = {
        id: 'children-group',
        name: 'Enfants',
        relationship: 'children-group',
        children: data.children.map(c => createNode(c, 'child'))
      };
      root.children.push(childrenNode);
    }

    return root;
  };

  // Tree layout rendering
  const renderTreeLayout = (g, hierarchyData, width, height) => {
    const treeLayout = d3.tree()
      .size([height, width])
      .separation((a, b) => (a.parent === b.parent ? 1 : 1.5));

    const root = d3.hierarchy(hierarchyData);
    const treeData = treeLayout(root);

    // Draw links (connections between nodes)
    const link = g.selectAll('.link')
      .data(treeData.links())
      .enter().append('g')
      .attr('class', 'link');

    link.append('path')
      .attr('d', d3.linkHorizontal()
        .x(d => d.y)
        .y(d => d.x))
      .attr('fill', 'none')
      .attr('stroke', d => {
        const targetRel = d.target.data.relationship;
        if (targetRel === 'parent' || targetRel === 'parent-group') return '#8b5cf6';
        if (targetRel === 'child' || targetRel === 'children-group') return '#10b981';
        if (targetRel === 'sibling' || targetRel === 'sibling-group') return '#f59e0b';
        return '#94a3b8';
      })
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.6)
      .style('stroke-dasharray', d => 
        d.target.data.relationship?.includes('group') ? '5,5' : 'none'
      );

    // Draw nodes
    const node = g.selectAll('.node')
      .data(treeData.descendants())
      .enter().append('g')
      .attr('class', d => `node ${d.data.relationship}`)
      .attr('transform', d => `translate(${d.y},${d.x})`);

    // Add circles for regular nodes, rectangles for groups
    node.each(function(d) {
      const nodeGroup = d3.select(this);
      
      if (d.data.relationship?.includes('group')) {
        // Group nodes (rectangular)
        nodeGroup.append('rect')
          .attr('x', -40)
          .attr('y', -15)
          .attr('width', 80)
          .attr('height', 30)
          .attr('rx', 5)
          .attr('fill', '#f1f5f9')
          .attr('stroke', '#cbd5e1')
          .attr('stroke-width', 1);
      } else {
        // Person nodes (circular with gender icons)
        const isRoot = d.data.relationship === 'root';
        const isSelected = selectedPerson?.id === d.data.data?.id;
        
        // Outer circle
        nodeGroup.append('circle')
          .attr('r', isRoot ? 35 : 25)
          .attr('fill', d => {
            if (isRoot) return 'url(#root-gradient)';
            if (d.data.relationship === 'parent') return 'url(#parent-gradient)';
            if (d.data.relationship === 'child') return 'url(#child-gradient)';
            if (d.data.relationship === 'sibling') return 'url(#sibling-gradient)';
            return '#e2e8f0';
          })
          .attr('stroke', isSelected ? '#2563eb' : '#fff')
          .attr('stroke-width', isSelected ? 3 : 2)
          .style('cursor', 'pointer')
          .style('filter', isRoot ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : 'none')
          .on('click', (event, d) => {
            event.stopPropagation();
            if (d.data.data && onNodeClick) {
              onNodeClick(d.data.data);
            }
          })
          .on('mouseover', function() {
            d3.select(this).transition().duration(200)
              .attr('r', isRoot ? 40 : 30);
          })
          .on('mouseout', function() {
            d3.select(this).transition().duration(200)
              .attr('r', isRoot ? 35 : 25);
          });

        // Gender icon
        nodeGroup.append('text')
          .attr('dy', '.35em')
          .attr('text-anchor', 'middle')
          .attr('font-size', isRoot ? '20px' : '16px')
          .attr('fill', 'white')
          .style('pointer-events', 'none')
          .text(d => {
            const gender = d.data.gender;
            if (gender === '1' || gender === 'M') return '♂';
            if (gender === '2' || gender === 'F') return '♀';
            return '👤';
          });

        // Expand button (if node can be expanded)
        if (!d.data.relationship?.includes('group')) {
          const hasExpansion = d.data.data?.hasMoreChildren || 
                              d.data.data?.hasMoreParents ||
                              (!d.children && d.depth > 0);
          
          if (hasExpansion) {
            const expandButton = nodeGroup.append('g')
              .attr('class', 'expand-button')
              .style('cursor', 'pointer')
              .on('click', (event, d) => {
                event.stopPropagation();
                if (onExpandNode) {
                  const direction = d.data.relationship === 'parent' ? 'parents' : 'children';
                  onExpandNode(d.data.id, direction);
                }
              });

            expandButton.append('circle')
              .attr('cx', isRoot ? 30 : 22)
              .attr('cy', 0)
              .attr('r', 10)
              .attr('fill', '#3b82f6')
              .attr('stroke', '#fff')
              .attr('stroke-width', 2);

            expandButton.append('text')
              .attr('x', isRoot ? 30 : 22)
              .attr('dy', '.35em')
              .attr('text-anchor', 'middle')
              .attr('fill', 'white')
              .attr('font-size', '12px')
              .style('pointer-events', 'none')
              .text('+');
          }
        }
      }
    });

    // Add labels
    node.append('text')
      .attr('x', d => d.data.relationship?.includes('group') ? 0 : 0)
      .attr('y', d => d.data.relationship?.includes('group') ? 4 : 45)
      .attr('text-anchor', 'middle')
      .attr('font-size', d => d.data.relationship?.includes('group') ? '11px' : '12px')
      .attr('font-weight', d => d.data.relationship === 'root' ? 'bold' : 'normal')
      .attr('fill', d => d.data.relationship?.includes('group') ? '#64748b' : '#1e293b')
      .text(d => {
        if (d.data.relationship?.includes('group')) {
          return d.data.name;
        }
        const name = d.data.name || '';
        return name.length > 20 ? name.substring(0, 20) + '...' : name;
      });

    // Add birth date for person nodes
    node.filter(d => !d.data.relationship?.includes('group') && d.data.birthDate)
      .append('text')
      .attr('y', 58)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('fill', '#64748b')
      .text(d => {
        if (d.data.birthDate) {
          const date = new Date(d.data.birthDate);
          return date.getFullYear();
        }
        return '';
      });

    // Add tooltips
    node.filter(d => !d.data.relationship?.includes('group'))
      .append('title')
      .text(d => {
        const data = d.data.data || d.data;
        let tooltip = `${d.data.name}\n`;
        if (data.date_naiss) tooltip += `Né(e) le: ${new Date(data.date_naiss).toLocaleDateString('fr-FR')}\n`;
        if (data.lieu_naiss) tooltip += `Lieu: ${data.lieu_naiss}\n`;
        if (data.noms_pere) tooltip += `Père: ${data.noms_pere}\n`;
        if (data.noms_mere) tooltip += `Mère: ${data.noms_mere}`;
        return tooltip;
      });
  };

  // Radial layout rendering
  const renderRadialLayout = (g, hierarchyData, width, height) => {
    const radius = Math.min(width, height) / 2;

    const treeLayout = d3.tree()
      .size([2 * Math.PI, radius])
      .separation((a, b) => (a.parent === b.parent ? 1 : 2) / a.depth);

    const root = d3.hierarchy(hierarchyData);
    treeLayout(root);

    // Center the radial tree
    const centerG = g.append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    // Draw links
    centerG.selectAll('.link')
      .data(root.links())
      .enter().append('path')
      .attr('class', 'link')
      .attr('d', d3.linkRadial()
        .angle(d => d.x)
        .radius(d => d.y))
      .attr('fill', 'none')
      .attr('stroke', '#94a3b8')
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.6);

    // Draw nodes
    const node = centerG.selectAll('.node')
      .data(root.descendants())
      .enter().append('g')
      .attr('class', 'node')
      .attr('transform', d => `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y},0)`);

    node.append('circle')
      .attr('r', d => d.data.relationship === 'root' ? 8 : 5)
      .attr('fill', d => {
        if (d.data.relationship === 'root') return '#2563eb';
        if (d.data.relationship === 'parent') return '#8b5cf6';
        if (d.data.relationship === 'child') return '#10b981';
        if (d.data.relationship === 'sibling') return '#f59e0b';
        return '#64748b';
      })
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        if (d.data.data && onNodeClick) {
          onNodeClick(d.data.data);
        }
      });

    node.append('text')
      .attr('dy', '0.31em')
      .attr('x', d => d.x < Math.PI === !d.children ? 10 : -10)
      .attr('text-anchor', d => d.x < Math.PI === !d.children ? 'start' : 'end')
      .attr('transform', d => d.x >= Math.PI ? 'rotate(180)' : null)
      .attr('font-size', '11px')
      .text(d => {
        const name = d.data.name || '';
        return name.length > 15 ? name.substring(0, 15) + '...' : name;
      });
  };

  // Force-directed layout
  const renderForceLayout = (g, hierarchyData, width, height) => {
    const nodes = [];
    const links = [];

    // Convert hierarchy to flat structure for force simulation
    const flatten = (node, parent = null) => {
      const flatNode = {
        id: node.id,
        name: node.name,
        data: node.data,
        relationship: node.relationship,
        group: node.relationship === 'root' ? 0 :
               node.relationship === 'parent' ? 1 :
               node.relationship === 'child' ? 2 :
               node.relationship === 'sibling' ? 3 : 4
      };
      nodes.push(flatNode);

      if (parent) {
        links.push({ source: parent.id, target: node.id });
      }

      if (node.children) {
        node.children.forEach(child => flatten(child, flatNode));
      }
    };

    flatten(hierarchyData);

    // Create force simulation
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    // Draw links
    const link = g.selectAll('.link')
      .data(links)
      .enter().append('line')
      .attr('class', 'link')
      .attr('stroke', '#94a3b8')
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.6);

    // Draw nodes
    const node = g.selectAll('.node')
      .data(nodes)
      .enter().append('g')
      .attr('class', 'node')
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    node.append('circle')
      .attr('r', d => d.relationship === 'root' ? 20 : 15)
      .attr('fill', d => {
        const colors = ['#2563eb', '#8b5cf6', '#10b981', '#f59e0b', '#64748b'];
        return colors[d.group];
      })
      .style('cursor', 'move');

    node.append('text')
      .attr('dy', 30)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .text(d => {
        const name = d.name || '';
        return name.length > 15 ? name.substring(0, 15) + '...' : name;
      });

    // Simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Drag functions
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
  };

  // Export to PNG
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

  return (
    <div className="relative w-full h-full" ref={containerRef}>
      {/* Controls Panel */}
      <div className="absolute top-4 right-4 z-10 bg-white rounded-lg shadow-lg p-2 space-y-2">
        <div className="flex items-center space-x-2 border-b pb-2 mb-2">
          <button
            onClick={() => window.zoomIn()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Zoom avant"
          >
            <ZoomIn className="h-4 w-4 text-gray-700" />
          </button>
          <button
            onClick={() => window.zoomOut()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Zoom arrière"
          >
            <ZoomOut className="h-4 w-4 text-gray-700" />
          </button>
          <button
            onClick={() => window.resetZoom()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Réinitialiser"
          >
            <RotateCcw className="h-4 w-4 text-gray-700" />
          </button>
          <button
            onClick={() => window.fitToScreen()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Ajuster à l'écran"
          >
            <Maximize2 className="h-4 w-4 text-gray-700" />
          </button>
        </div>
        
        <div className="flex items-center space-x-2 border-b pb-2 mb-2">
          <button
            onClick={exportToPNG}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Exporter en PNG"
          >
            <Download className="h-4 w-4 text-gray-700" />
          </button>
          <button
            onClick={() => setShowLegend(!showLegend)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Afficher/Masquer légende"
          >
            <Info className="h-4 w-4 text-gray-700" />
          </button>
        </div>

        <div className="text-xs text-gray-600 text-center">
          Zoom: {Math.round(currentZoom * 100)}%
        </div>
      </div>

      {/* View Mode Selector */}
      <div className="absolute top-4 left-4 z-10 bg-white rounded-lg shadow-lg p-2">
        <div className="flex flex-col space-y-1">
          <button
            onClick={() => setViewMode('tree')}
            className={`px-3 py-2 text-xs rounded transition-colors ${
              viewMode === 'tree' 
                ? 'bg-blue-500 text-white' 
                : 'hover:bg-gray-100 text-gray-700'
            }`}
          >
            Arbre classique
          </button>
          <button
            onClick={() => setViewMode('radial')}
            className={`px-3 py-2 text-xs rounded transition-colors ${
              viewMode === 'radial' 
                ? 'bg-blue-500 text-white' 
                : 'hover:bg-gray-100 text-gray-700'
            }`}
          >
            Vue radiale
          </button>
          <button
            onClick={() => setViewMode('force')}
            className={`px-3 py-2 text-xs rounded transition-colors ${
              viewMode === 'force' 
                ? 'bg-blue-500 text-white' 
                : 'hover:bg-gray-100 text-gray-700'
            }`}
          >
            Réseau dynamique
          </button>
        </div>
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="absolute bottom-4 left-4 z-10 bg-white rounded-lg shadow-lg p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Légende</h4>
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-green-500 rounded-full"></div>
              <span className="text-xs text-gray-600">Personne principale</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
              <span className="text-xs text-gray-600">Parents</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <span className="text-xs text-gray-600">Enfants</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
              <span className="text-xs text-gray-600">Frères/Sœurs</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-600">♂ Masculin | ♀ Féminin</span>
            </div>
          </div>
        </div>
      )}

      {/* SVG Container */}
      <svg
        ref={svgRef}
        className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100"
        style={{ cursor: 'move' }}
      />
    </div>
  );
};

export default TreeVisualizationD3;