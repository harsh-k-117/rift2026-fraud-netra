import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';
import SpriteText from 'three-spritetext';

// Configuration for 3D visualization
const CONFIG_3D = {
  // Risk thresholds
  RISK_CRITICAL: 60,
  RISK_HIGH: 30,
  
  // Colors (matching 2D graph)
  COLOR_CYCLE: '#8b5cf6',
  COLOR_CRITICAL: '#f97316',
  COLOR_HIGH: '#fb923c',
  COLOR_MEDIUM: '#fbbf24',
  COLOR_NORMAL: '#60a5fa',
  COLOR_LINK_NORMAL: '#1a2840',
  COLOR_LINK_HIGHLIGHT: '#ff4466',
  
  // Node sizing
  NODE_SIZE_MIN: 3,
  NODE_SIZE_MAX: 12,
  NODE_SIZE_MULTIPLIER: 0.4,
  
  // Visual effects - Optimized for performance
  PARTICLE_COUNT: 2,
  PARTICLE_SPEED: 0.006,
  LINK_WIDTH_NORMAL: 0.5,
  LINK_WIDTH_HIGHLIGHT: 2,
  GLOW_INTENSITY: 0.3,
  
  // Labels
  LABEL_SIZE: 3,
  LABEL_COLOR: '#c8d8f0',
  LABEL_BG_COLOR: '#050a12',
};

// Get node color based on risk
const getNodeColor = (node) => {
  if (node.patterns?.some(p => p.toLowerCase().includes('cycle') || p.toLowerCase().includes('circular'))) {
    return CONFIG_3D.COLOR_CYCLE;
  }
  if (node.suspicionScore >= CONFIG_3D.RISK_CRITICAL) return CONFIG_3D.COLOR_CRITICAL;
  if (node.suspicionScore >= CONFIG_3D.RISK_HIGH) return CONFIG_3D.COLOR_HIGH;
  if (node.suspicious) return CONFIG_3D.COLOR_MEDIUM;
  return CONFIG_3D.COLOR_NORMAL;
};

function GraphVisualization3D({ data, graphData }) {
  const fgRef = useRef();
  const containerRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [selectedNode, setSelectedNode] = useState(null);
  const [highlightNodes, setHighlightNodes] = useState(new Set());
  const [highlightLinks, setHighlightLinks] = useState(new Set());
  const [hoverNode, setHoverNode] = useState(null);
  const [showOnlySuspicious, setShowOnlySuspicious] = useState(false);
  const [riskFilter, setRiskFilter] = useState('all');
  const [showLabels, setShowLabels] = useState(false); // Default off for performance
  const [simulation, setSimulation] = useState('running');
  const [meshMode, setMeshMode] = useState(false); // Default off for performance

  // Calculate statistics
  const statistics = useMemo(() => {
    if (!graphData || !graphData.nodes) {
      return {
        totalAccounts: 0,
        totalTransactions: 0,
        suspiciousAccounts: 0,
        criticalRisk: 0,
        highRisk: 0,
        normalAccounts: 0,
        cycles: 0,
        smurfs: 0,
        shells: 0
      };
    }

    const nodes = graphData.nodes;
    const links = graphData.links;
    const suspicious = nodes.filter(n => n.suspicious);
    const critical = suspicious.filter(n => n.suspicionScore >= CONFIG_3D.RISK_CRITICAL);
    const high = suspicious.filter(n => n.suspicionScore >= CONFIG_3D.RISK_HIGH && n.suspicionScore < CONFIG_3D.RISK_CRITICAL);
    const normal = nodes.filter(n => !n.suspicious);
    
    const cycles = nodes.filter(n => n.patterns?.some(p => 
      p.toLowerCase().includes('cycle') || p.toLowerCase().includes('circular')
    )).length;
    
    const smurfs = nodes.filter(n => n.patterns?.some(p => 
      p.toLowerCase().includes('fan') || p.toLowerCase().includes('smurf')
    )).length;
    
    const shells = nodes.filter(n => n.patterns?.some(p => 
      p.toLowerCase().includes('shell') || p.toLowerCase().includes('layered')
    )).length;

    return {
      totalAccounts: nodes.length,
      totalTransactions: links.length,
      suspiciousAccounts: suspicious.length,
      criticalRisk: critical.length,
      highRisk: high.length,
      normalAccounts: normal.length,
      cycles,
      smurfs,
      shells
    };
  }, [graphData]);

  // Filter and prepare graph data
  const graphDataFiltered = useMemo(() => {
    if (!graphData || !graphData.nodes || !graphData.links) return { nodes: [], links: [] };

    let filteredNodes = [...graphData.nodes];

    // Apply filters
    if (showOnlySuspicious) {
      filteredNodes = filteredNodes.filter(node => node.suspicious);
    }

    if (riskFilter !== 'all') {
      filteredNodes = filteredNodes.filter(node => {
        if (riskFilter === 'critical') return node.suspicionScore >= CONFIG_3D.RISK_CRITICAL;
        if (riskFilter === 'high') return node.suspicionScore >= CONFIG_3D.RISK_HIGH && node.suspicionScore < CONFIG_3D.RISK_CRITICAL;
        if (riskFilter === 'medium') return node.suspicionScore > 0 && node.suspicionScore < CONFIG_3D.RISK_HIGH;
        if (riskFilter === 'normal') return !node.suspicious;
        return true;
      });
    }

    const nodeIds = new Set(filteredNodes.map(n => n.id));
    let filteredLinks = graphData.links.filter(link => 
      nodeIds.has(link.source) && nodeIds.has(link.target)
    );

    return {
      nodes: filteredNodes.map(node => ({
        id: node.id,
        name: node.id,
        val: Math.max(
          CONFIG_3D.NODE_SIZE_MIN,
          Math.min(
            Math.log10((node.totalTransactions || 1) + 1) * CONFIG_3D.NODE_SIZE_MULTIPLIER * 10,
            CONFIG_3D.NODE_SIZE_MAX
          )
        ),
        color: getNodeColor(node),
        ...node
      })),
      links: filteredLinks.map(link => ({
        source: link.source,
        target: link.target,
        value: link.amount || 1
      }))
    };
  }, [graphData, showOnlySuspicious, riskFilter]);

  // Handle node click
  const handleNodeClick = useCallback((node) => {
    if (!node) return;
    
    setSelectedNode(node);
    
    // Highlight connected nodes and links
    const neighbors = new Set();
    const linkSet = new Set();
    
    graphDataFiltered.links.forEach(link => {
      const sourceId = link.source.id || link.source;
      const targetId = link.target.id || link.target;
      
      if (sourceId === node.id) {
        neighbors.add(targetId);
        linkSet.add(link);
      }
      if (targetId === node.id) {
        neighbors.add(sourceId);
        linkSet.add(link);
      }
    });
    
    neighbors.add(node.id);
    setHighlightNodes(neighbors);
    setHighlightLinks(linkSet);

    // Center camera on node
    if (fgRef.current) {
      const distance = 200;
      fgRef.current.cameraPosition(
        { x: node.x, y: node.y, z: node.z + distance },
        node,
        1000
      );
    }
  }, [graphDataFiltered.links]);

  // Custom node rendering with 3D mesh and labels
  const nodeThreeObject = useCallback((node) => {
    const isHighlighted = highlightNodes.has(node.id);
    const isHovered = hoverNode?.id === node.id;
    const isDimmed = highlightNodes.size > 0 && !isHighlighted;
    
    const group = new THREE.Group();
    
    // Create geometry - optimized with lower detail
    const geometry = meshMode 
      ? new THREE.IcosahedronGeometry(node.val, 0) // Lower detail
      : new THREE.SphereGeometry(node.val, 12, 12); // Lower segments
    
    // Create material with glow effect
    const material = new THREE.MeshPhongMaterial({
      color: node.color,
      emissive: node.color,
      emissiveIntensity: isHighlighted || isHovered ? CONFIG_3D.GLOW_INTENSITY * 2 : CONFIG_3D.GLOW_INTENSITY,
      shininess: 80,
      transparent: isDimmed,
      opacity: isDimmed ? 0.15 : 1,
      specular: 0x222222,
      wireframe: meshMode && (isHighlighted || isHovered), // Show wireframe on interaction
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    group.add(mesh);
    
    // Add wireframe edges for mesh mode
    if (meshMode && !isHighlighted && !isHovered && !isDimmed) {
      const edges = new THREE.EdgesGeometry(geometry);
      const lineMaterial = new THREE.LineBasicMaterial({ 
        color: node.color, 
        transparent: true, 
        opacity: 0.3 
      });
      const wireframe = new THREE.LineSegments(edges, lineMaterial);
      group.add(wireframe);
    }
    
    // Add outer glow ring for suspicious nodes
    if (node.suspicious && !isDimmed) {
      const ringGeometry = new THREE.RingGeometry(node.val * 1.3, node.val * 1.5, 32);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: node.color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.3
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      mesh.add(ring);
    }
    
    // Add label for highlighted/hovered nodes or when labels are enabled
    if ((isHighlighted || isHovered || showLabels) && !isDimmed) {
      const sprite = new SpriteText(node.id);
      sprite.color = isHighlighted || isHovered ? '#ffffff' : CONFIG_3D.LABEL_COLOR;
      sprite.textHeight = CONFIG_3D.LABEL_SIZE;
      sprite.backgroundColor = CONFIG_3D.LABEL_BG_COLOR;
      sprite.padding = 2;
      sprite.borderRadius = 2;
      sprite.position.y = node.val + 8;
      group.add(sprite);
    }
    
    return group;
  }, [highlightNodes, hoverNode, showLabels, meshMode]);

  // Link styling
  const linkWidth = useCallback((link) => {
    return highlightLinks.has(link) ? CONFIG_3D.LINK_WIDTH_HIGHLIGHT : CONFIG_3D.LINK_WIDTH_NORMAL;
  }, [highlightLinks]);

  const linkColor = useCallback((link) => {
    const sourceNode = graphDataFiltered.nodes.find(n => (n.id === link.source.id || n.id === link.source));
    const targetNode = graphDataFiltered.nodes.find(n => (n.id === link.target.id || n.id === link.target));
    
    const isCycle = sourceNode?.patterns?.some(p => p.toLowerCase().includes('cycle')) || 
                    targetNode?.patterns?.some(p => p.toLowerCase().includes('cycle'));
                    
    if (highlightLinks.has(link)) return CONFIG_3D.COLOR_LINK_HIGHLIGHT;
    if (isCycle) return '#ff4466';
    return CONFIG_3D.COLOR_LINK_NORMAL;
  }, [highlightLinks, graphDataFiltered.nodes]);

  const linkOpacity = useCallback((link) => {
    if (highlightLinks.size === 0) return 0.4;
    return highlightLinks.has(link) ? 0.9 : 0.05;
  }, [highlightLinks]);

  // Initialize force simulation - optimized
  useEffect(() => {
    if (fgRef.current) {
      fgRef.current.d3Force('charge').strength(-80);
      fgRef.current.d3Force('link').distance(60);
      fgRef.current.d3Force('center').strength(0.03);
    }
  }, []);

  // Control simulation
  useEffect(() => {
    if (fgRef.current) {
      if (simulation === 'paused') {
        fgRef.current.pauseAnimation();
      } else {
        fgRef.current.resumeAnimation();
      }
    }
  }, [simulation]);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    handleResize(); // Initial size
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50 border-l border-gray-200">
        <div className="text-center px-6">
          <div className="text-6xl mb-4"></div>
          <h3 className="text-xl font-bold mb-2 text-gray-900">3D Network Mesh</h3>
          <p className="text-gray-500 text-sm">Upload data to visualize in 3D</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full relative bg-white border-l border-gray-200 overflow-hidden flex flex-col">
      {/* Header Stats Bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4 flex-wrap shadow-sm">
        <div className="text-blue-600 font-bold text-sm tracking-wider uppercase flex items-center gap-2">
          
          3D Network Analysis
        </div>
        
        <div className="flex gap-3 ml-auto flex-wrap">
          {[
            { label: 'NODES', val: statistics.totalAccounts, color: 'border-blue-500 bg-blue-50 text-blue-700' },
            { label: 'LINKS', val: statistics.totalTransactions, color: 'border-blue-500 bg-blue-50 text-blue-700' },
            { label: 'CYCLES', val: statistics.cycles, color: 'border-purple-500 bg-purple-50 text-purple-700' },
            { label: 'SMURFS', val: statistics.smurfs, color: 'border-cyan-500 bg-cyan-50 text-cyan-700' },
            { label: 'SHELLS', val: statistics.shells, color: 'border-orange-500 bg-orange-50 text-orange-700' },
          ].map(({ label, val, color }) => (
            <div key={label} className={`text-center border ${color} rounded px-3 py-1 shadow-sm`}>
              <div className={`text-lg font-bold`}>{val}</div>
              <div className="text-[9px] text-gray-600 tracking-widest font-medium">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 3D Graph Container */}
      <div className="flex-1 relative" ref={containerRef}>
        <ForceGraph3D
          ref={fgRef}
          graphData={graphDataFiltered}
          nodeLabel="id"
          nodeThreeObject={nodeThreeObject}
          nodeVal="val"
          linkWidth={linkWidth}
          linkColor={linkColor}
          linkOpacity={linkOpacity}
          linkDirectionalParticles={CONFIG_3D.PARTICLE_COUNT}
          linkDirectionalParticleWidth={link => highlightLinks.has(link) ? 2 : 0}
          linkDirectionalParticleSpeed={CONFIG_3D.PARTICLE_SPEED}
          onNodeClick={handleNodeClick}
          onNodeHover={setHoverNode}
          onBackgroundClick={() => {
            setSelectedNode(null);
            setHighlightNodes(new Set());
            setHighlightLinks(new Set());
          }}
          enableNodeDrag={true}
          enableNavigationControls={true}
          showNavInfo={false}
          backgroundColor="rgba(0,0,0,0)"
          width={dimensions.width}
          height={dimensions.height}
        />

        {/* Controls Panel - Top Right */}
        <div className="absolute top-4 right-4 space-y-2 w-[320px]">
          {/* Filters */}
          <div className="bg-white/95 backdrop-blur-md border border-gray-200 rounded-lg p-3 shadow-lg">
            <div className="text-xs text-gray-700 font-bold mb-2 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filters
            </div>
            
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="w-full text-xs bg-white text-gray-900 border border-gray-300 rounded px-2 py-2 mb-2 focus:outline-none focus:border-blue-500 transition"
            >
              <option value="all">All Risk Levels</option>
              <option value="critical">Critical (≥60)</option>
              <option value="high">High (30-59)</option>
              <option value="medium">Medium (1-29)</option>
              <option value="normal">Normal</option>
            </select>
            
            <button
              onClick={() => setShowOnlySuspicious(!showOnlySuspicious)}
              className={`w-full text-xs px-3 py-2 rounded font-semibold transition-all ${
                showOnlySuspicious 
                  ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg shadow-red-500/30' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {showOnlySuspicious ? 'Suspicious Only' : 'Show All Accounts'}
            </button>

            {(showOnlySuspicious || riskFilter !== 'all') && (
              <button
                onClick={() => {
                  setShowOnlySuspicious(false);
                  setRiskFilter('all');
                }}
                className="w-full text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded transition-all"
              >
                Reset Filters
              </button>
            )}
          </div>

          {/* View Controls */}
          <div className="bg-white/95 backdrop-blur-md border border-gray-200 rounded-lg p-3 shadow-lg">
            <div className="text-xs text-gray-700 font-bold mb-2">View Options</div>
            
            <button
              onClick={() => setMeshMode(!meshMode)}
              className={`w-full text-xs px-3 py-2 rounded font-semibold transition-all mb-2 ${
                meshMode 
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {meshMode ? 'Mesh Mode ON' : 'Smooth Mode'}
            </button>

            <button
              onClick={() => setShowLabels(!showLabels)}
              className={`w-full text-xs px-3 py-2 rounded font-semibold transition-all mb-2 ${
                showLabels 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {showLabels ? 'Labels ON' : 'Labels OFF'}
            </button>

            <button
              onClick={() => setSimulation(simulation === 'running' ? 'paused' : 'running')}
              className={`w-full text-xs px-3 py-2 rounded font-semibold transition-all ${
                simulation === 'running'
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {simulation === 'running' ? 'Simulation ON' : 'Simulation OFF'}
            </button>
          </div>

          {/* Legend */}
          <div className="bg-white/95 backdrop-blur-md border border-gray-200 rounded-lg p-3 shadow-lg">
            <div className="text-xs text-gray-700 font-bold mb-2 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Color Legend
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full shadow-lg" style={{ backgroundColor: CONFIG_3D.COLOR_NORMAL }}></div>
                <span className="text-[10px] text-gray-700">Normal Node</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full shadow-lg" style={{ backgroundColor: CONFIG_3D.COLOR_CYCLE }}></div>
                <span className="text-[10px] text-gray-700">Cycle Pattern</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full shadow-lg" style={{ backgroundColor: CONFIG_3D.COLOR_MEDIUM }}></div>
                <span className="text-[10px] text-gray-700">Medium Risk</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full shadow-lg" style={{ backgroundColor: CONFIG_3D.COLOR_HIGH }}></div>
                <span className="text-[10px] text-gray-700">High Risk</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full shadow-lg" style={{ backgroundColor: CONFIG_3D.COLOR_CRITICAL }}></div>
                <span className="text-[10px] text-gray-700">Critical Risk</span>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-white/95 backdrop-blur-md border border-gray-200 rounded-lg p-3 shadow-lg">
            <div className="text-xs text-gray-700 font-bold mb-2">Controls</div>
            <div className="text-[10px] text-gray-600 space-y-1">
              <div>• Drag to rotate view</div>
              <div>• Scroll to zoom in/out</div>
              <div>• Click node for details</div>
              <div>• Right-click to pan</div>
            </div>
          </div>
        </div>

        {/* Selected Node Detail Panel - Bottom */}
        {selectedNode && (
          <div className="absolute bottom-4 left-4 right-4 bg-slate-900/98 backdrop-blur-md border-2 border-blue-500/60 rounded-lg p-4 shadow-2xl max-h-[40vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <div 
                  className="w-5 h-5 rounded-full border-2 border-white shadow-lg"
                  style={{ backgroundColor: selectedNode.color, boxShadow: `0 0 10px ${selectedNode.color}` }}
                ></div>
                <h4 className="font-bold text-base text-white tracking-wide">NODE DETAIL</h4>
              </div>
              <button
                onClick={() => {
                  setSelectedNode(null);
                  setHighlightNodes(new Set());
                  setHighlightLinks(new Set());
                }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-2">
              {/* Account ID */}
              <div className="bg-slate-800/80 rounded-lg p-2 border border-slate-700">
                <div className="text-[9px] text-slate-400 uppercase font-semibold mb-1 tracking-wider">Account ID</div>
                <div className="text-sm font-mono font-bold text-white break-all">{selectedNode.id}</div>
              </div>
              
              {/* Transaction Stats Grid */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-blue-900/60 rounded-lg p-2 border border-blue-700/50">
                  <div className="text-[9px] text-blue-300 uppercase font-semibold tracking-wider">TX Count</div>
                  <div className="text-base font-bold text-blue-100">{selectedNode.totalTransactions || 0}</div>
                </div>
                <div className="bg-green-900/60 rounded-lg p-2 border border-green-700/50">
                  <div className="text-[9px] text-green-300 uppercase font-semibold tracking-wider">Incoming</div>
                  <div className="text-base font-bold text-green-100">{selectedNode.inDegree || 0}</div>
                </div>
                <div className="bg-purple-900/60 rounded-lg p-2 border border-purple-700/50">
                  <div className="text-[9px] text-purple-300 uppercase font-semibold tracking-wider">Outgoing</div>
                  <div className="text-base font-bold text-purple-100">{selectedNode.outDegree || 0}</div>
                </div>
              </div>

              {/* Risk Information */}
              {selectedNode.suspicious ? (
                <>
                  <div className="bg-red-900/70 rounded-lg p-3 border border-red-500/50">
                    <div className="text-[9px] text-red-300 uppercase font-semibold mb-1 tracking-wider flex items-center gap-1">
                      <span></span> Risk Score
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-red-100">{selectedNode.suspicionScore}</span>
                      <span className="text-sm text-red-300">/100</span>
                    </div>
                    <div className="mt-2 bg-slate-800 rounded-full h-1.5">
                      <div
                        className="bg-gradient-to-r from-red-500 to-orange-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${selectedNode.suspicionScore}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Detected Patterns */}
                  {selectedNode.patterns && selectedNode.patterns.length > 0 && (
                    <div className="bg-orange-900/70 rounded-lg p-3 border border-orange-500/50">
                      <div className="text-[9px] text-orange-300 uppercase font-semibold mb-2 tracking-wider">Fraud Patterns</div>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedNode.patterns.map((pattern, idx) => (
                          <span 
                            key={idx} 
                            className="bg-orange-600 text-white px-2 py-1 rounded text-[9px] font-bold shadow-lg"
                          >
                            {pattern.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Fraud Ring */}
                  {selectedNode.ringId && (
                    <div className="bg-yellow-900/70 rounded-lg p-2 border border-yellow-500/50">
                      <div className="text-[9px] text-yellow-300 uppercase font-semibold tracking-wider">Fraud Ring ID</div>
                      <div className="text-sm font-mono font-bold text-yellow-100">{selectedNode.ringId}</div>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-green-900/60 rounded-lg p-3 border border-green-500/50 flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-semibold text-green-100">Normal Activity Detected</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default GraphVisualization3D;
