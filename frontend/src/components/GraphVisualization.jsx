import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import { getNodeColor } from '../utils/graphHelpers';

function GraphVisualization({ data, graphData }) {
  const cyRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [selectedNode, setSelectedNode] = useState(null);
  const [showOnlySuspicious, setShowOnlySuspicious] = useState(false);
  const [riskFilter, setRiskFilter] = useState('all');
  const [searchAccountId, setSearchAccountId] = useState('');
  const [searchMessage, setSearchMessage] = useState('');
  const [cytoscapeElements, setCytoscapeElements] = useState([]);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [hoverNodeId, setHoverNodeId] = useState(null);
  const [layoutType, setLayoutType] = useState('auto'); // New: layout selector
  const popperInstancesRef = useRef(new Set()); // Track all popper instances

  // Get layout config based on selected type and dataset size
  const getLayoutConfig = useCallback((type, nodeCount) => {
    const layouts = {
      'cose': {
        name: 'cose',
        animate: false,
        fit: true,
        padding: 50,
        nodeRepulsion: 400000,
        idealEdgeLength: 100,
        edgeElasticity: 100,
        nestingFactor: 1.2,
        gravity: 0.25,
        numIter: 500,
        initialTemp: 200,
        coolingFactor: 0.95,
        minTemp: 1.0,
        randomize: true,
        nodeOverlap: 20,
        componentSpacing: 100
      },
      'circle': {
        name: 'circle',
        animate: false,
        fit: true,
        padding: 50,
        avoidOverlap: true,
        radius: Math.max(300, nodeCount / 2),
        startAngle: 0,
        sweep: 2 * Math.PI,
        clockwise: true,
        sort: (a, b) => b.data('degree') - a.data('degree'),
        spacing: 20
      },
      'grid': {
        name: 'grid',
        animate: false,
        fit: true,
        padding: 50,
        avoidOverlap: true,
        avoidOverlapPadding: 10,
        rows: Math.ceil(Math.sqrt(nodeCount)),
        cols: Math.ceil(Math.sqrt(nodeCount))
      },
      'concentric': {
        name: 'concentric',
        animate: false,
        fit: true,
        padding: 50,
        concentric: (node) => node.data('degree'),
        levelWidth: () => 2,
        minNodeSpacing: 50
      }
    };

    return layouts[type] || layouts['cose'];
  }, []);

  // Cytoscape layout configuration - memoized and adaptive based on dataset size
  const layoutConfig = useMemo(() => {
    const nodeCount = graphData?.nodes?.length || 0;
    
    // Auto-select best layout for dataset size
    if (layoutType === 'auto') {
      if (nodeCount > 500) return getLayoutConfig('circle', nodeCount);
      if (nodeCount > 200) return getLayoutConfig('grid', nodeCount);
      return getLayoutConfig('cose', nodeCount);
    }
    
    return getLayoutConfig(layoutType, nodeCount);
  }, [graphData, layoutType, getLayoutConfig]);

  // Aggregate edges: combine multiple transactions between same nodes - MEMOIZED
  const aggregateEdges = useCallback((links) => {
    const edgeMap = new Map();
    
    links.forEach(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      const key = `${sourceId}->${targetId}`;
      
      if (edgeMap.has(key)) {
        const existing = edgeMap.get(key);
        existing.txCount += 1;
        existing.totalAmount += link.amount || 0;
      } else {
        edgeMap.set(key, {
          source: sourceId,
          target: targetId,
          txCount: 1,
          totalAmount: link.amount || 0
        });
      }
    });
    
    return Array.from(edgeMap.values());
  }, []);

  // Transform data to Cytoscape format - MEMOIZED
  const transformToCytoscapeFormat = useCallback((nodes, links) => {
    const elements = [];
    
    // Add nodes
    nodes.forEach(node => {
      elements.push({
        data: {
          id: node.id,
          label: node.id,
          suspicious: node.suspicious || false,
          suspicionScore: node.suspicionScore || 0,
          patterns: node.patterns || [],
          ringId: node.ringId || null,
          totalTransactions: node.totalTransactions || 0,
          inDegree: node.inDegree || 0,
          outDegree: node.outDegree || 0,
          degree: (node.inDegree || 0) + (node.outDegree || 0)
        }
      });
    });
    
    // Aggregate and add edges
    const aggregatedEdges = aggregateEdges(links);
    aggregatedEdges.forEach((edge, idx) => {
      elements.push({
        data: {
          id: `edge-${idx}`,
          source: edge.source,
          target: edge.target,
          txCount: edge.txCount,
          totalAmount: edge.totalAmount
        }
      });
    });
    
    return elements;
  }, [aggregateEdges]);

  // Filter nodes based on settings - MEMOIZED
  const getFilteredData = useCallback(() => {
    if (!graphData || !graphData.nodes) return { nodes: [], links: [] };
    
    const filteredNodes = graphData.nodes.filter(node => {
      if (showOnlySuspicious && !node.suspicious) return false;
      
      const score = node.suspicionScore || 0;
      if (riskFilter === 'high' && score < 60) return false;
      if (riskFilter === 'medium' && (score < 30 || score >= 60)) return false;
      if (riskFilter === 'low' && (score < 1 || score >= 30)) return false;
      if (riskFilter === 'normal' && score > 0) return false;
      
      return true;
    });
    
    const nodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredLinks = graphData.links.filter(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      return nodeIds.has(sourceId) && nodeIds.has(targetId);
    });
    
    return { nodes: filteredNodes, links: filteredLinks };
  }, [graphData, showOnlySuspicious, riskFilter]);

  // Update Cytoscape elements when data or filters change
  useEffect(() => {
    if (!graphData) return;
    const { nodes, links } = getFilteredData();
    const elements = transformToCytoscapeFormat(nodes, links);
    setCytoscapeElements(elements);
  }, [graphData, showOnlySuspicious, riskFilter, getFilteredData, transformToCytoscapeFormat]);

  // Re-run layout when new graph data is loaded (CSV upload)
  useEffect(() => {
    if (!cyRef.current || !graphData || graphData.nodes.length === 0) return;
    
    const cy = cyRef.current;
    // Small delay to ensure elements are mounted
    const timer = setTimeout(() => {
      const layout = cy.layout(layoutConfig);
      layout.run();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [graphData]);

  // Handle window resize
  useEffect(() => {
    const updateDimensions = () => {
      const sidebarWidth = selectedNode ? 350 : 0;
      setDimensions({
        width: Math.min(window.innerWidth - 150 - sidebarWidth, 1400),
        height: 700
      });
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [selectedNode]);

  // Clean up all popper instances
  const cleanupPoppers = useCallback(() => {
    popperInstancesRef.current.forEach(popper => {
      try {
        const popperDiv = popper.state?.elements?.popper;
        if (popperDiv && popperDiv.parentNode) {
          popperDiv.parentNode.removeChild(popperDiv);
        }
        popper.destroy();
      } catch (e) {
        // Ignore cleanup errors
      }
    });
    popperInstancesRef.current.clear();
  }, []);

  // Initialize Cytoscape event handlers
  useEffect(() => {
    if (!cyRef.current) return;
    
    const cy = cyRef.current;
    let zoomTimeout;
    
    // Track zoom level for conditional labels - DEBOUNCED
    const handleZoom = () => {
      clearTimeout(zoomTimeout);
      zoomTimeout = setTimeout(() => {
        setZoomLevel(cy.zoom());
      }, 100);
    };
    
    cy.on('zoom', handleZoom);
    
    // Node hover handlers
    cy.on('mouseover', 'node', (evt) => {
      const node = evt.target;
      setHoverNodeId(node.id());
      
      // Highlight connected edges
      const connectedEdges = node.connectedEdges();
      connectedEdges.addClass('hover-highlight');
      
      // Show tooltip
      const data = node.data();
      const tooltipContent = `
        <div style="background: white; 
                    padding: 12px; 
                    border-radius: 6px; 
                    border: 2px solid ${data.suspicious ? '#EF4444' : '#3B82F6'}; 
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    color: #1F2937;
                    font-family: system-ui, -apple-system, sans-serif;
                    min-width: 200px;">
          <div style="font-weight: 600; font-size: 14px; margin-bottom: 8px; color: #111827; font-family: monospace;">${data.id}</div>
          ${data.suspicious ? `
            <div style="background: #FEE2E2; padding: 6px 8px; border-radius: 4px; margin-bottom: 6px; border-left: 3px solid #EF4444;">
              <div style="color: #7F1D1D; font-size: 11px; font-weight: 600; margin-bottom: 2px;">SUSPICIOUS ACCOUNT</div>
              <div style="color: #991B1B;">Score: <span style="font-weight: 700;">${data.suspicionScore}</span></div>
            </div>
          ` : '<div style="color: #059669; font-size: 12px; font-weight: 600; padding: 4px 0;">Normal Account</div>'}
          ${data.ringId ? `<div style="color: #D97706; font-size: 11px; font-weight: 600; background: #FEF3C7; padding: 4px 8px; border-radius: 4px; margin: 4px 0;">Ring: ${data.ringId}</div>` : ''}
          <div style="font-size: 11px; color: #6B7280; margin-top: 8px; padding-top: 8px; border-top: 1px solid #E5E7EB;">
            <div style="margin-bottom: 4px;">Transactions: <strong>${data.totalTransactions || 0}</strong></div>
            <div>Incoming: <strong style="color: #059669;">${data.inDegree || 0}</strong> | Outgoing: <strong style="color: #DC2626;">${data.outDegree || 0}</strong></div>
          </div>
        </div>
      `;
      
      // Clean up old popper if exists
      if (node.popperRefObj) {
        const oldDiv = node.popperRefObj.state?.elements?.popper;
        if (oldDiv && oldDiv.parentNode) oldDiv.parentNode.removeChild(oldDiv);
        node.popperRefObj.destroy();
        popperInstancesRef.current.delete(node.popperRefObj);
      }
      
      const popperInstance = node.popper({
        content: () => {
          const div = document.createElement('div');
          div.innerHTML = tooltipContent;
          document.body.appendChild(div);
          return div;
        },
        popper: {
          placement: 'top',
          modifiers: [
            { name: 'offset', options: { offset: [0, 10] } }
          ]
        }
      });
      
      node.popperRefObj = popperInstance;
      popperInstancesRef.current.add(popperInstance);
    });
    
    cy.on('mouseout', 'node', (evt) => {
      const node = evt.target;
      setHoverNodeId(null);
      cy.elements('.hover-highlight').removeClass('hover-highlight');
      
      // Remove tooltip
      if (node.popperRefObj) {
        const popperDiv = node.popperRefObj.state?.elements?.popper;
        if (popperDiv && popperDiv.parentNode) {
          popperDiv.parentNode.removeChild(popperDiv);
        }
        popperInstancesRef.current.delete(node.popperRefObj);
        node.popperRefObj.destroy();
        node.popperRefObj = null;
      }
    });
    
    // Edge hover handlers for aggregated transaction info
    cy.on('mouseover', 'edge', (evt) => {
      const edge = evt.target;
      const data = edge.data();
      
      if (data.txCount > 1) {
        const tooltipContent = `
          <div style="background: white; 
                      padding: 10px 12px; 
                      border-radius: 6px; 
                      border: 2px solid #3B82F6;
                      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                      color: #1F2937;
                      font-family: system-ui, -apple-system, sans-serif;">
            <div style="font-weight: 600; color: #1F2937; margin-bottom: 4px; font-size: 12px;">
              ${data.source} → ${data.target}
            </div>
            <div style="font-size: 11px; color: #6B7280;">
              Transactions: <span style="font-weight: 700; color: #111827;">${data.txCount}</span><br/>
              ${data.totalAmount > 0 ? `Total Amount: <span style="color: #059669; font-weight: 600;">$${data.totalAmount.toLocaleString()}</span>` : ''}
            </div>
          </div>
        `;
        
        // Clean up old popper if exists
        if (edge.popperRefObj) {
          const oldDiv = edge.popperRefObj.state?.elements?.popper;
          if (oldDiv && oldDiv.parentNode) oldDiv.parentNode.removeChild(oldDiv);
          edge.popperRefObj.destroy();
          popperInstancesRef.current.delete(edge.popperRefObj);
        }
        
        const popperInstance = edge.popper({
          content: () => {
            const div = document.createElement('div');
            div.innerHTML = tooltipContent;
            document.body.appendChild(div);
            return div;
          },
          popper: {
            placement: 'top'
          }
        });
        
        edge.popperRefObj = popperInstance;
        popperInstancesRef.current.add(popperInstance);
      }
    });
    
    cy.on('mouseout', 'edge', (evt) => {
      const edge = evt.target;
      if (edge.popperRefObj) {
        const popperDiv = edge.popperRefObj.state?.elements?.popper;
        if (popperDiv && popperDiv.parentNode) {
          popperDiv.parentNode.removeChild(popperDiv);
        }
        popperInstancesRef.current.delete(edge.popperRefObj);
        edge.popperRefObj.destroy();
        edge.popperRefObj = null;
      }
    });
    
    // Node click handler
    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      const nodeData = {
        id: node.data('id'),
        suspicious: node.data('suspicious'),
        suspicionScore: node.data('suspicionScore'),
        patterns: node.data('patterns'),
        ringId: node.data('ringId'),
        totalTransactions: node.data('totalTransactions'),
        inDegree: node.data('inDegree'),
        outDegree: node.data('outDegree')
      };
      
      setSelectedNode(nodeData);
      
      // Highlight connected nodes
      const neighbors = node.neighborhood();
      cy.elements().removeClass('highlighted faded');
      node.addClass('highlighted');
      neighbors.addClass('highlighted');
      cy.elements().not(neighbors.union(node)).addClass('faded');
      
      // Center on node
      cy.animate({
        center: { eles: node },
        zoom: 2,
        duration: 500
      });
    });
    
    // Click on background to deselect
    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        setSelectedNode(null);
        cy.elements().removeClass('highlighted faded');
      }
    });
    
    return () => {
      clearTimeout(zoomTimeout);
      cy.removeAllListeners();
      cleanupPoppers();
    };
  }, [cleanupPoppers]);

  // Fit graph to view
  const fitToScreen = () => {
    if (cyRef.current) {
      cyRef.current.fit(null, 50);
    }
  };

  // Handle search
  const handleSearch = () => {
    if (!searchAccountId.trim()) {
      setSearchMessage('Please enter an account ID');
      return;
    }
    
    if (!cyRef.current) return;
    
    const cy = cyRef.current;
    const node = cy.getElementById(searchAccountId.trim());
    
    if (node.length === 0) {
      setSearchMessage(`Account "${searchAccountId}" not found in dataset`);
      return;
    }
    
    // Check if visible (not filtered out)
    if (node.style('display') === 'none') {
      setSearchMessage(`Account "${searchAccountId}" exists but is filtered out. Clear filters to view.`);
      return;
    }
    
    // Focus on node
    const nodeData = {
      id: node.data('id'),
      suspicious: node.data('suspicious'),
      suspicionScore: node.data('suspicionScore'),
      patterns: node.data('patterns'),
      ringId: node.data('ringId'),
      totalTransactions: node.data('totalTransactions'),
      inDegree: node.data('inDegree'),
      outDegree: node.data('outDegree')
    };
    
    setSelectedNode(nodeData);
    setSearchMessage(`Focused on ${searchAccountId.trim()}`);
    
    // Highlight and center
    const neighbors = node.neighborhood();
    cy.elements().removeClass('highlighted faded');
    node.addClass('highlighted');
    neighbors.addClass('highlighted');
    cy.elements().not(neighbors.union(node)).addClass('faded');
    
    cy.animate({
      center: { eles: node },
      zoom: 2,
      duration: 500
    });
  };

  // Cytoscape stylesheet
  const cytoscapeStylesheet = [
    {
      selector: 'node',
      style: {
        'background-color': (ele) => {
          const score = ele.data('suspicionScore') || 0;
          if (!ele.data('suspicious')) return '#3B82F6'; // blue
          if (score >= 60) return '#EF4444'; // red
          if (score >= 30) return '#F97316'; // orange
          return '#FCD34D'; // yellow
        },
        'width': (ele) => {
          const degree = ele.data('degree') || 0;
          const baseSize = ele.data('suspicious') ? 25 : 20;
          return Math.min(baseSize + Math.sqrt(degree) * 3, 60);
        },
        'height': (ele) => {
          const degree = ele.data('degree') || 0;
          const baseSize = ele.data('suspicious') ? 25 : 20;
          return Math.min(baseSize + Math.sqrt(degree) * 3, 60);
        },
        // Conditional labels: show only for suspicious nodes or when zoomed in
        'label': (ele) => {
          const isSuspicious = ele.data('suspicious');
          const isHovered = ele.id() === hoverNodeId;
          if (isHovered || isSuspicious || zoomLevel > 1.5) {
            return ele.data('label');
          }
          return '';
        },
        'font-size': '11px',
        'font-weight': 'bold',
        'text-valign': 'bottom',
        'text-halign': 'center',
        'text-margin-y': 5,
        'color': '#E5E7EB',
        'text-outline-width': 3,
        'text-outline-color': '#1F2937',
        'border-width': 2,
        'border-color': '#ffffff',
        'overlay-opacity': 0
      }
    },
    {
      selector: 'node.highlighted',
      style: {
        'border-width': 4,
        'border-color': '#FBBF24',
        'z-index': 10
      }
    },
    {
      selector: 'node.faded',
      style: {
        'opacity': 0.3
      }
    },
    {
      selector: 'edge',
      style: {
        'width': (ele) => {
          const txCount = ele.data('txCount') || 1;
          return Math.min(1 + Math.log(txCount), 5);
        },
        'line-color': '#4B5563',
        'target-arrow-color': '#4B5563',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        'arrow-scale': 1,
        'opacity': 0.4
      }
    },
    {
      selector: 'edge.hover-highlight',
      style: {
        'line-color': '#60A5FA',
        'target-arrow-color': '#60A5FA',
        'width': 3,
        'opacity': 0.9,
        'z-index': 999
      }
    },
    {
      selector: 'edge.highlighted',
      style: {
        'width': 4,
        'line-color': '#FBBF24',
        'target-arrow-color': '#FBBF24',
        'opacity': 1,
        'z-index': 999,
        'arrow-scale': 1.5
      }
    },
    {
      selector: 'edge.faded',
      style: {
        'opacity': 0.1
      }
    }
  ];

  // Check if graphData exists BEFORE calling getFilteredData()
  if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
    return (
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center bg-gray-50">
        <div className="text-gray-500">
          <svg
            className="mx-auto h-16 w-16 text-gray-400 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            No Graph Data
          </h3>
          <p className="text-sm text-gray-600">
            Upload a CSV file to visualize the transaction network
          </p>
        </div>
      </div>
    );
  }

  // Now safe to call getFilteredData() after we know graphData exists
  const { nodes, links } = getFilteredData();

  return (
    <div className="relative flex gap-6 w-full">
      {/* Main Graph Area */}
      <div className="flex-1 min-w-0">
        {/* Controls Panel */}
        <div className="mb-6 bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          {/* Stats and Legend */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h4 className="font-semibold text-sm mb-3 text-gray-900">Risk Level Classification</h4>
              <div className="flex flex-wrap gap-3 text-sm">
                <div className="bg-gray-50 px-3 py-2 rounded border border-gray-200 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="font-medium text-gray-700 text-xs">Critical ≥60</span>
                </div>
                <div className="bg-gray-50 px-3 py-2 rounded border border-gray-200 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                  <span className="font-medium text-gray-700 text-xs">High 30-59</span>
                </div>
                <div className="bg-gray-50 px-3 py-2 rounded border border-gray-200 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-300"></div>
                  <span className="font-medium text-gray-700 text-xs">Medium 1-29</span>
                </div>
                <div className="bg-gray-50 px-3 py-2 rounded border border-gray-200 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="font-medium text-gray-700 text-xs">Normal</span>
                </div>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 px-5 py-3 rounded-lg">
              <div className="text-sm font-bold text-gray-900">
                {nodes.length} <span className="text-xs text-gray-500 font-normal">Accounts</span> • {links.length} <span className="text-xs text-gray-500 font-normal">Transactions</span>
              </div>
              <div className="text-xs text-red-600 mt-1.5 font-semibold flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                {nodes.filter(n => n.suspicious).length} Suspicious
              </div>
            </div>
          </div>
          
          {/* Layout Selector and Filters */}
          <div className="mb-4 pb-4 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Layout Type */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-600">Layout Algorithm</label>
                <select
                  value={layoutType}
                  onChange={(e) => setLayoutType(e.target.value)}
                  className="text-sm border border-gray-300 rounded px-3 py-2 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="auto">Auto (Recommended)</option>
                  <option value="cose">Force-Directed</option>
                  <option value="circle">Circular</option>
                  <option value="grid">Grid</option>
                  <option value="concentric">Concentric</option>
                </select>
              </div>

              {/* Risk Filter */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-600">Risk Level Filter</label>
                <select
                  value={riskFilter}
                  onChange={(e) => setRiskFilter(e.target.value)}
                  className="text-sm border border-gray-300 rounded px-3 py-2 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Levels</option>
                  <option value="high">High Risk Only</option>
                  <option value="medium">Medium Risk Only</option>
                  <option value="low">Low Risk Only</option>
                  <option value="normal">Normal Only</option>
                </select>
              </div>

              {/* Suspicious Only Toggle */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-600">View Options</label>
                <label className="flex items-center gap-2 bg-gray-50 border border-gray-300 rounded px-3 py-2 cursor-pointer hover:bg-gray-100 transition">
                  <input
                    type="checkbox"
                    checked={showOnlySuspicious}
                    onChange={(e) => setShowOnlySuspicious(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Suspicious Only</span>
                </label>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-600">Actions</label>
                <div className="flex gap-2">
                  {(showOnlySuspicious || riskFilter !== 'all') && (
                    <button
                      onClick={() => {
                        setShowOnlySuspicious(false);
                        setRiskFilter('all');
                      }}
                      className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded border border-gray-300 transition font-medium flex-1"
                    >
                      Clear Filters
                    </button>
                  )}
                  <button
                    onClick={fitToScreen}
                    className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded transition font-medium flex-1"
                  >
                    Fit to View
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            <p className="text-xs text-blue-900">
              <strong className="font-semibold">Tip:</strong> Click nodes to view details • Hover to reveal connections • Use scroll wheel to zoom • Drag to pan the network
            </p>
          </div>
          
          {/* Search Section */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 bg-gray-100 border border-gray-300 p-2 rounded">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchAccountId}
                onChange={(e) => setSearchAccountId(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search by account ID..."
                className="flex-1 text-sm border border-gray-300 rounded px-4 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleSearch}
                className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded transition font-medium"
              >
                Search
              </button>
            </div>
            {searchMessage && (
              <div className={`mt-3 text-xs px-4 py-2 rounded border font-medium ${
                searchMessage.includes('Focused') ? 'bg-green-50 text-green-800 border-green-200' :
                searchMessage.includes('not found') ? 'bg-red-50 text-red-800 border-red-200' :
                'bg-yellow-50 text-yellow-800 border-yellow-200'
              }`}>
                {searchMessage}
              </div>
            )}
          </div>
        </div>

        {/* Graph Container */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden shadow-sm relative" 
             style={{ minHeight: '600px' }}>
          <CytoscapeComponent
            elements={cytoscapeElements}
            style={{ 
              width: `${dimensions.width}px`, 
              height: `${dimensions.height}px`,
              background: '#FAFAFA'
            }}
            stylesheet={cytoscapeStylesheet}
            layout={layoutConfig}
            cy={(cy) => { cyRef.current = cy; }}
            wheelSensitivity={0.2}
          />
        </div>
        
        {/* Controls Info */}
        <div className="mt-4 text-xs text-center bg-gray-50 border border-gray-200 px-6 py-3 rounded-lg">
          <span className="text-gray-600">
            <strong className="text-gray-900">Navigation:</strong> Drag to pan • Scroll to zoom • Click to investigate • Hover for details
          </span>
        </div>
      </div>

      {/* Side Panel */}
      {selectedNode && (
        <div className="w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-5 overflow-y-auto max-h-[750px]">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-bold text-gray-900">Account Details</h3>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-3">
            {/* Account ID */}
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Account ID</div>
              <div className="text-base font-mono font-bold text-gray-900 break-all">{selectedNode.id}</div>
            </div>

            {/* Status Badge */}
            <div className={`p-3 rounded-lg border-2 ${
              selectedNode.suspicious 
                ? 'bg-red-50 border-red-300' 
                : 'bg-green-50 border-green-300'
            }`}>
              <div className="text-xs text-gray-600 uppercase font-semibold mb-1">Status</div>
              <div className={`text-base font-bold flex items-center gap-2 ${
                selectedNode.suspicious ? 'text-red-700' : 'text-green-700'
              }`}>
                {selectedNode.suspicious ? (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    SUSPICIOUS
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    NORMAL
                  </>
                )}
              </div>
            </div>

            {/* Suspicion Score */}
            {selectedNode.suspicious && (
              <div className="bg-gradient-to-r from-red-50 to-orange-50 p-3 rounded-lg border border-red-200">
                <div className="text-xs text-gray-600 uppercase font-semibold mb-1">Suspicion Score</div>
                <div className="flex items-baseline gap-2 mb-2">
                  <div className="text-3xl font-bold text-red-700">{selectedNode.suspicionScore}</div>
                  <div className="text-sm text-gray-500">/ 100</div>
                </div>
                <div className="bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      selectedNode.suspicionScore >= 60 ? 'bg-red-600' :
                      selectedNode.suspicionScore >= 30 ? 'bg-orange-500' :
                      'bg-yellow-400'
                    }`}
                    style={{ width: `${selectedNode.suspicionScore}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Ring ID */}
            {selectedNode.ringId && (
              <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                <div className="text-xs text-gray-600 uppercase font-semibold mb-1 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Fraud Ring
                </div>
                <div className="text-base font-mono font-bold text-orange-700">{selectedNode.ringId}</div>
              </div>
            )}

            {/* Detected Patterns */}
            {selectedNode.patterns && selectedNode.patterns.length > 0 && (
              <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                <div className="text-xs text-gray-600 uppercase font-semibold mb-2">Detected Patterns</div>
                <div className="flex flex-wrap gap-2">
                  {selectedNode.patterns.map((pattern, idx) => (
                    <span
                      key={idx}
                      className="text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded font-medium"
                    >
                      {pattern.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Transaction Stats */}
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <div className="text-xs text-gray-600 uppercase font-semibold mb-3">Transaction Statistics</div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-700">{selectedNode.totalTransactions || 0}</div>
                  <div className="text-xs text-gray-600 mt-1">Total</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{selectedNode.inDegree || 0}</div>
                  <div className="text-xs text-gray-600 mt-1">Incoming</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">{selectedNode.outDegree || 0}</div>
                  <div className="text-xs text-gray-600 mt-1">Outgoing</div>
                </div>
              </div>
            </div>

            {/* Risk Level Indicator */}
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <div className="text-xs text-gray-600 uppercase font-semibold mb-2">Risk Classification</div>
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full border-2 border-white shadow-sm flex-shrink-0"
                  style={{ backgroundColor: getNodeColor(selectedNode) }}
                ></div>
                <div>
                  <div className="text-sm font-bold text-gray-900">
                    {selectedNode.suspicionScore >= 60 ? 'Critical Risk' :
                     selectedNode.suspicionScore >= 30 ? 'High Risk' :
                     selectedNode.suspicionScore >= 1 ? 'Medium Risk' : 'Normal Activity'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {selectedNode.suspicionScore >= 60 ? 'Immediate investigation required' :
                     selectedNode.suspicionScore >= 30 ? 'Review recommended' :
                     selectedNode.suspicionScore >= 1 ? 'Monitor activity' : 'No action needed'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GraphVisualization;
