import React, { useRef, useEffect, useState, useMemo, useImperativeHandle, forwardRef } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import Cytoscape from 'cytoscape';

// Configuration constants
const GRAPH_CONFIG = {
  // Risk thresholds
  RISK_CRITICAL: 60,
  RISK_HIGH: 30,
  
  // Node sizing
  NODE_SIZE_BASE: 20,
  NODE_SIZE_MAX: 50,
  NODE_SIZE_MULTIPLIER: 5,
  
  // Node styling
  NODE_BORDER_RING: 4,
  NODE_BORDER_NORMAL: 2,
  
  // Edge styling
  EDGE_WIDTH_MIN: 0.5,
  EDGE_WIDTH_MAX: 4,
  
  // Colors
  COLOR_NORMAL: '#3b82f6',      // Blue
  COLOR_MEDIUM: '#fbbf24',      // Yellow
  COLOR_HIGH: '#fb923c',        // Orange
  COLOR_CRITICAL: '#ef4444',    // Red
  COLOR_RING_BORDER: '#a855f7', // Purple
  
  // Layout
  LARGE_GRAPH_THRESHOLD: 500,
};

function GraphVisualization2D({ data, graphData, onNodeSelect, onRingSelect, totalAccounts, totalTransactions }, ref) {
  const cyRef = useRef(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedRing, setSelectedRing] = useState(null);
  const [showOnlySuspicious, setShowOnlySuspicious] = useState(false);
  const [showOnlyRings, setShowOnlyRings] = useState(false);
  const [hideLowValueEdges, setHideLowValueEdges] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    highlightRing: (ringId) => {
      highlightRing(ringId);
    },
    resetView: () => {
      resetView();
    }
  }));

  // Get node color based on risk
  const getNodeColor = (node) => {
    if (!node.suspicious) return GRAPH_CONFIG.COLOR_NORMAL;
    if (node.suspicionScore >= GRAPH_CONFIG.RISK_CRITICAL) return GRAPH_CONFIG.COLOR_CRITICAL;
    if (node.suspicionScore >= GRAPH_CONFIG.RISK_HIGH) return GRAPH_CONFIG.COLOR_HIGH;
    return GRAPH_CONFIG.COLOR_MEDIUM;
  };

  // Get risk level text
  const getRiskLevel = (score) => {
    if (score >= GRAPH_CONFIG.RISK_CRITICAL) return 'Critical';
    if (score >= GRAPH_CONFIG.RISK_HIGH) return 'High';
    if (score > 0) return 'Medium';
    return 'Normal';
  };

  // Prepare Cytoscape elements - optimized
  const elements = useMemo(() => {
    console.log('GraphVisualization2D: Preparing elements', { 
      hasGraphData: !!graphData, 
      nodeCount: graphData?.nodes?.length 
    });
    
    if (!graphData || !graphData.nodes) return [];

    let filteredNodes = [...graphData.nodes];

    // Apply filters
    if (showOnlySuspicious) {
      filteredNodes = filteredNodes.filter(node => node.suspicious);
    }

    if (showOnlyRings) {
      filteredNodes = filteredNodes.filter(node => node.ringId);
    }

    const nodeIds = new Set(filteredNodes.map(n => n.id));
    let filteredLinks = graphData.links.filter(link => 
      nodeIds.has(link.source) && nodeIds.has(link.target)
    );

    // Hide low-value edges
    if (hideLowValueEdges && filteredLinks.length > 0) {
      const amounts = filteredLinks.map(l => l.amount || 0).filter(a => a > 0);
      if (amounts.length > 0) {
        amounts.sort((a, b) => a - b);
        const median = amounts[Math.floor(amounts.length / 2)] || 0;
        filteredLinks = filteredLinks.filter(link => (link.amount || 0) >= median * 0.5);
      }
    }

    // Prepare nodes
    const cyNodes = filteredNodes.map(node => {
      const baseSize = GRAPH_CONFIG.NODE_SIZE_BASE;
      const volumeMultiplier = Math.log10((node.totalTransactions || 1) + 1) * GRAPH_CONFIG.NODE_SIZE_MULTIPLIER;
      const size = Math.min(baseSize + volumeMultiplier, GRAPH_CONFIG.NODE_SIZE_MAX);
      
      return {
        data: {
          id: node.id,
          label: '',
          color: getNodeColor(node),
          size: size,
          borderWidth: node.ringId ? GRAPH_CONFIG.NODE_BORDER_RING : GRAPH_CONFIG.NODE_BORDER_NORMAL,
          borderColor: node.ringId ? GRAPH_CONFIG.COLOR_RING_BORDER : '#fff',
          // Store only essential data
          suspicious: node.suspicious,
          suspicionScore: node.suspicionScore || 0,
          ringId: node.ringId,
          patterns: node.patterns,
          totalTransactions: node.totalTransactions,
          inDegree: node.inDegree,
          outDegree: node.outDegree
        }
      };
    });

    // Prepare edges
    const cyEdges = filteredLinks.map((link, idx) => {
      const logAmount = Math.log10((link.amount || 1) + 1);
      const width = Math.max(
        GRAPH_CONFIG.EDGE_WIDTH_MIN, 
        Math.min(logAmount / 2, GRAPH_CONFIG.EDGE_WIDTH_MAX)
      );
      
      return {
        data: {
          id: `e${idx}`,
          source: link.source,
          target: link.target,
          amount: link.amount,
          weight: width
        }
      };
    });

    console.log('GraphVisualization2D: Elements prepared', { 
      nodes: cyNodes.length, 
      edges: cyEdges.length 
    });

    return [...cyNodes, ...cyEdges];
  }, [graphData, showOnlySuspicious, showOnlyRings, hideLowValueEdges]);

  // Cytoscape stylesheet
  const stylesheet = useMemo(() => [
    {
      selector: 'node',
      style: {
        'background-color': 'data(color)',
        'width': 'data(size)',
        'height': 'data(size)',
        'border-width': 'data(borderWidth)',
        'border-color': 'data(borderColor)',
        'border-style': 'solid'
      }
    },
    {
      selector: 'node:selected',
      style: {
        'border-width': 5,
        'border-color': '#000',
        'overlay-opacity': 0.2,
        'overlay-color': '#000'
      }
    },
    {
      selector: 'edge',
      style: {
        'width': 'data(weight)',
        'line-color': '#94a3b8',
        'target-arrow-color': '#94a3b8',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        'arrow-scale': 1,
        'opacity': 0.6
      }
    },
    {
      selector: 'edge:selected',
      style: {
        'width': 3,
        'line-color': '#1e40af',
        'target-arrow-color': '#1e40af',
        'opacity': 1
      }
    },
    {
      selector: '.highlighted',
      style: {
        'border-width': 5,
        'border-color': '#000',
        'z-index': 999
      }
    },
    {
      selector: '.dimmed',
      style: {
        'opacity': 0.15
      }
    },
    {
      selector: '.ring-highlight',
      style: {
        'border-width': 5,
        'border-color': GRAPH_CONFIG.COLOR_RING_BORDER,
        'z-index': 999
      }
    }
  ], []);

  // Layout configuration - optimized for performance
  const layout = useMemo(() => {
    const nodeCount = elements.filter(e => !e.data.source).length;
    
    // Use different layouts based on graph size
    if (nodeCount > 1000) {
      // Very large graph - use preset or circle
      return {
        name: 'circle',
        fit: true,
        padding: 50,
        animate: false,
        avoidOverlap: true,
        spacingFactor: 1.5
      };
    } else if (nodeCount > GRAPH_CONFIG.LARGE_GRAPH_THRESHOLD) {
      // Large graph - fast cose with minimal iterations
      return {
        name: 'cose',
        animate: false,
        fit: true,
        padding: 50,
        nodeRepulsion: 200000,
        idealEdgeLength: 100,
        edgeElasticity: 50,
        numIter: 300,
        gravity: 1,
        initialTemp: 100,
        coolingFactor: 0.99,
        minTemp: 1.0
      };
    } else {
      // Small to medium graph - better layout
      return {
        name: 'cose',
        animate: false, // Disable animation for faster rendering
        fit: true,
        padding: 50,
        nodeRepulsion: 400000,
        idealEdgeLength: 80,
        edgeElasticity: 100,
        numIter: 500,
        gravity: 40,
        initialTemp: 200,
        coolingFactor: 0.95,
        minTemp: 1.0
      };
    }
  }, [elements]);

  // Setup Cytoscape event handlers
  useEffect(() => {
    if (!cyRef.current) {
      setIsLoading(false);
      return;
    }

    const cy = cyRef.current;
    setIsLoading(true);

    // Debounce tap events to prevent multiple rapid fires
    let tapTimeout = null;

    // Node click handler
    const handleNodeTap = (event) => {
      if (tapTimeout) clearTimeout(tapTimeout);
      tapTimeout = setTimeout(() => {
        const node = event.target.data();
        setSelectedNode(node);
        setSelectedRing(null);
        if (onNodeSelect) onNodeSelect(node);
        if (onRingSelect) onRingSelect(null);
        
        // Highlight connected nodes
        const connectedNodes = event.target.neighborhood('node');
        const connectedEdges = event.target.connectedEdges();
        
        cy.elements().addClass('dimmed');
        event.target.removeClass('dimmed').addClass('highlighted');
        connectedNodes.removeClass('dimmed');
        connectedEdges.removeClass('dimmed');
      }, 50);
    };

    cy.on('tap', 'node', handleNodeTap);

    // Background tap to deselect
    cy.on('tap', (event) => {
      if (event.target === cy) {
        if (tapTimeout) clearTimeout(tapTimeout);
        setSelectedNode(null);
        setSelectedRing(null);
        if (onNodeSelect) onNodeSelect(null);
        if (onRingSelect) onRingSelect(null);
        cy.elements().removeClass('dimmed highlighted ring-highlight');
      }
    });

    // Fit graph on mount - with delay to ensure rendering is complete
    const timer = setTimeout(() => {
      try {
        cy.fit();
        cy.center();
      } catch (e) {
        console.error('Error fitting graph:', e);
      }
      setIsLoading(false);
    }, 200);

    return () => {
      clearTimeout(timer);
      if (tapTimeout) clearTimeout(tapTimeout);
      cy.removeAllListeners();
    };
  }, [elements, onNodeSelect, onRingSelect]);

  // Reset view
  const resetView = () => {
    if (cyRef.current) {
      cyRef.current.fit();
      cyRef.current.elements().removeClass('dimmed highlighted ring-highlight');
      setSelectedNode(null);
      setSelectedRing(null);
      if (onNodeSelect) onNodeSelect(null);
      if (onRingSelect) onRingSelect(null);
    }
  };

  // Focus on suspicious nodes
  const focusSuspicious = () => {
    if (cyRef.current) {
      const suspiciousNodes = cyRef.current.nodes().filter(node => node.data('suspicious'));
      if (suspiciousNodes.length > 0) {
        cyRef.current.fit(suspiciousNodes, 50);
      }
    }
  };

  // Highlight ring
  const highlightRing = (ringId) => {
    if (cyRef.current && ringId) {
      const cy = cyRef.current;
      const ringNodes = cy.nodes().filter(node => node.data('ringId') === ringId);
      
      if (ringNodes.length > 0) {
        cy.elements().addClass('dimmed');
        ringNodes.removeClass('dimmed').addClass('ring-highlight');
        
        // Also highlight edges between ring members
        ringNodes.forEach(node => {
          node.connectedEdges().forEach(edge => {
            const source = edge.source().data('ringId');
            const target = edge.target().data('ringId');
            if (source === ringId && target === ringId) {
              edge.removeClass('dimmed');
            }
          });
        });
        
        cy.fit(ringNodes, 50);
        setSelectedRing(ringId);
        setSelectedNode(null);
        if (onRingSelect) onRingSelect(ringId);
        if (onNodeSelect) onNodeSelect(null);
      }
    }
  };

  if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            No Graph Data Available
          </h3>
          <p className="text-sm text-gray-600">
            Upload a CSV file to visualize the transaction network
          </p>
        </div>
      </div>
    );
  }

  const suspiciousCount = graphData.nodes.filter(n => n.suspicious).length;
  const ringsDetected = new Set(graphData.nodes.filter(n => n.ringId).map(n => n.ringId)).size;
  const highestRisk = Math.max(...graphData.nodes.map(n => n.suspicionScore || 0));
  
  const nodeCount = elements.filter(e => !e.data.source).length;
  const edgeCount = elements.filter(e => e.data.source).length;

  return (
    <div className="h-full bg-white relative">
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-95 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
            <div className="text-lg text-gray-900 font-bold mb-2">Loading Network Graph</div>
            <div className="text-sm text-gray-600">
              Processing {nodeCount} nodes and {edgeCount} edges...
            </div>
            <div className="text-xs text-gray-500 mt-2">
              This may take a moment for large datasets
            </div>
          </div>
        </div>
      )}
      
      <CytoscapeComponent
        elements={elements}
        style={{ width: '100%', height: '100%' }}
        stylesheet={stylesheet}
        layout={layout}
        cy={(cy) => { 
          cyRef.current = cy;
          cy.userPanningEnabled(true);
          cy.userZoomingEnabled(true);
          cy.boxSelectionEnabled(false);
          
          // Add ready event to hide loading faster
          cy.ready(() => {
            console.log('Cytoscape ready');
            setTimeout(() => setIsLoading(false), 100);
          });
        }}
        autoungrabify={false}
        wheelSensitivity={0.2}
      />
      
      {/* TOP LEFT - Network Stats Badge */}
      <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm border border-gray-300 rounded-lg px-4 py-2 shadow-lg">
        <div className="font-bold text-sm text-gray-900">Transaction Network</div>
        <div className="text-xs text-gray-600 mt-0.5">
          {totalAccounts || graphData.nodes.length} Accounts • {totalTransactions || graphData.links.length} Transactions • {ringsDetected} Rings Detected
        </div>
      </div>

      {/* TOP RIGHT - Minimal Controls */}
      <div className="absolute top-4 right-4 flex gap-2">
        <button
          onClick={focusSuspicious}
          className="px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold rounded shadow-lg transition-colors"
        >
          Focus Suspicious
        </button>
        <button
          onClick={() => setShowOnlyRings(!showOnlyRings)}
          className={`px-3 py-2 text-xs font-semibold rounded shadow-lg transition-colors ${
            showOnlyRings 
              ? 'bg-purple-600 hover:bg-purple-700 text-white' 
              : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'
          }`}
        >
          Show Rings
        </button>
        <button
          onClick={resetView}
          className="px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded shadow-lg border border-gray-300 transition-colors"
        >
          Reset View
        </button>
      </div>

      {/* BOTTOM LEFT - Compact Legend */}
      <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm border border-gray-300 rounded-lg px-3 py-2 shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: GRAPH_CONFIG.COLOR_NORMAL }}></div>
            <span className="text-xs text-gray-700">Blue = Normal</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: GRAPH_CONFIG.COLOR_MEDIUM }}></div>
            <span className="text-xs text-gray-700">Yellow = Medium risk</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: GRAPH_CONFIG.COLOR_HIGH }}></div>
            <span className="text-xs text-gray-700">Orange = High risk</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: GRAPH_CONFIG.COLOR_CRITICAL }}></div>
            <span className="text-xs text-gray-700">Red = Critical</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full border-2" style={{ borderColor: GRAPH_CONFIG.COLOR_RING_BORDER, backgroundColor: '#fff' }}></div>
            <span className="text-xs text-gray-700">Purple border = Ring member</span>
          </div>
        </div>
      </div>

      {/* BOTTOM RIGHT - Simple Filters */}
      <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm border border-gray-300 rounded-lg px-3 py-2 shadow-lg">
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showOnlySuspicious}
              onChange={(e) => setShowOnlySuspicious(e.target.checked)}
              className="w-3 h-3"
            />
            <span className="text-xs text-gray-700">Show only suspicious</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showOnlyRings}
              onChange={(e) => setShowOnlyRings(e.target.checked)}
              className="w-3 h-3"
            />
            <span className="text-xs text-gray-700">Show only rings</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hideLowValueEdges}
              onChange={(e) => setHideLowValueEdges(e.target.checked)}
              className="w-3 h-3"
            />
            <span className="text-xs text-gray-700">Hide low-value edges</span>
          </label>
        </div>
      </div>
    </div>
  );
}

export default forwardRef(GraphVisualization2D);
