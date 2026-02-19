import React, { useState, useMemo, memo } from 'react';

const GraphSidePanel = memo(function GraphSidePanel({ data, graphData, selectedNode, selectedRing, onHighlightRing }) {
  const [activeTab, setActiveTab] = useState('node');

  // Calculate statistics
  const suspiciousCount = graphData?.nodes?.filter(n => n.suspicious).length || 0;
  const ringsDetected = useMemo(() => {
    if (!graphData?.nodes) return [];
    const ringMap = new Map();
    graphData.nodes.forEach(node => {
      if (node.ringId) {
        if (!ringMap.has(node.ringId)) {
          ringMap.set(node.ringId, {
            ringId: node.ringId,
            members: [],
            maxRisk: 0,
            patterns: new Set()
          });
        }
        const ring = ringMap.get(node.ringId);
        ring.members.push(node.id);
        ring.maxRisk = Math.max(ring.maxRisk, node.suspicionScore || 0);
        if (node.patterns) {
          node.patterns.forEach(p => ring.patterns.add(p));
        }
      }
    });
    return Array.from(ringMap.values()).map(r => ({
      ...r,
      patterns: Array.from(r.patterns)
    }));
  }, [graphData]);

  const highestRisk = Math.max(...(graphData?.nodes?.map(n => n.suspicionScore || 0) || [0]));

  // Get risk level styling
  const getRiskStyle = (score) => {
    if (score >= 60) return { label: 'Critical', bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' };
    if (score >= 30) return { label: 'High', bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' };
    if (score > 0) return { label: 'Medium', bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' };
    return { label: 'Normal', bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' };
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Tab Switcher */}
      <div className="flex border-b border-gray-300">
        <button
          onClick={() => setActiveTab('node')}
          className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'node'
              ? 'bg-white text-blue-600 border-b-2 border-blue-600'
              : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
          }`}
        >
          Node Details
        </button>
        <button
          onClick={() => setActiveTab('ring')}
          className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'ring'
              ? 'bg-white text-blue-600 border-b-2 border-blue-600'
              : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
          }`}
        >
          Ring Details
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'node' && (
          <div className="p-4">
            {!selectedNode ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-gray-600 mb-6">Click a node to inspect account</p>
                
                {/* Summary Stats */}
                <div className="space-y-3 text-left">
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="text-xs text-gray-500 uppercase font-semibold">Detected Rings</div>
                    <div className="text-2xl font-bold text-gray-900">{ringsDetected.length}</div>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                    <div className="text-xs text-orange-600 uppercase font-semibold">Suspicious Accounts</div>
                    <div className="text-2xl font-bold text-orange-900">{suspiciousCount}</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                    <div className="text-xs text-red-600 uppercase font-semibold">Highest Risk Score</div>
                    <div className="text-2xl font-bold text-red-900">{highestRisk}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Account Header */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Account</div>
                  <div className="text-lg font-mono font-bold text-gray-900 break-all">{selectedNode.id}</div>
                </div>

                {/* Risk Score */}
                {selectedNode.suspicious ? (
                  <div className={`rounded-lg p-4 border ${getRiskStyle(selectedNode.suspicionScore).bg} ${getRiskStyle(selectedNode.suspicionScore).border}`}>
                    <div className={`text-xs uppercase font-semibold mb-2 ${getRiskStyle(selectedNode.suspicionScore).text}`}>
                      Risk Score: {getRiskStyle(selectedNode.suspicionScore).label}
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-4xl font-bold ${getRiskStyle(selectedNode.suspicionScore).text}`}>
                        {selectedNode.suspicionScore}
                      </span>
                      <span className="text-lg text-gray-600">/100</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm font-semibold text-blue-900">Normal Activity</span>
                    </div>
                  </div>
                )}

                {/* Transactions */}
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="text-xs text-gray-500 uppercase font-semibold mb-3">Transactions</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-gray-500">Incoming</div>
                      <div className="text-2xl font-bold text-green-600">{selectedNode.inDegree || 0}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Outgoing</div>
                      <div className="text-2xl font-bold text-blue-600">{selectedNode.outDegree || 0}</div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="text-xs text-gray-500">Total Volume</div>
                    <div className="text-xl font-bold text-gray-900">{selectedNode.totalTransactions || 0}</div>
                  </div>
                </div>

                {/* Detected Patterns */}
                {selectedNode.suspicious && selectedNode.patterns && selectedNode.patterns.length > 0 && (
                  <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                    <div className="text-xs text-orange-600 uppercase font-semibold mb-3">Detected Patterns</div>
                    <div className="space-y-2">
                      {selectedNode.patterns.map((pattern, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-orange-600"></div>
                          <span className="text-sm text-gray-900">{pattern.replace(/_/g, ' ')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ring Membership */}
                {selectedNode.ringId && (
                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                    <div className="text-xs text-purple-600 uppercase font-semibold mb-2">Ring</div>
                    <div className="text-sm font-mono font-bold text-purple-900 mb-3">{selectedNode.ringId}</div>
                    <button
                      onClick={() => onHighlightRing && onHighlightRing(selectedNode.ringId)}
                      className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded transition-colors"
                    >
                      Highlight Ring
                    </button>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  {selectedNode.ringId && (
                    <button
                      onClick={() => setActiveTab('ring')}
                      className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded transition-colors"
                    >
                      View Ring
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'ring' && (
          <div className="p-4">
            {ringsDetected.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-gray-600">No fraud rings detected</p>
              </div>
            ) : (
              <div className="space-y-3">
                {ringsDetected.map((ring, idx) => {
                  const riskStyle = getRiskStyle(ring.maxRisk);
                  const isSelected = selectedRing === ring.ringId;
                  
                  return (
                    <div
                      key={idx}
                      className={`rounded-lg p-4 border-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                      onClick={() => onHighlightRing && onHighlightRing(ring.ringId)}
                    >
                      {/* Ring Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="text-xs text-gray-500 uppercase font-semibold">Ring</div>
                          <div className="text-sm font-mono font-bold text-gray-900">{ring.ringId}</div>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${riskStyle.bg} ${riskStyle.text}`}>
                          {riskStyle.label}
                        </span>
                      </div>

                      {/* Pattern */}
                      {ring.patterns.length > 0 && (
                        <div className="mb-3">
                          <div className="text-xs text-gray-500 mb-1">Pattern</div>
                          <div className="text-sm font-semibold text-gray-900">
                            {ring.patterns[0].replace(/_/g, ' ')}
                          </div>
                        </div>
                      )}

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="bg-gray-50 rounded p-2">
                          <div className="text-xs text-gray-500">Risk</div>
                          <div className="text-lg font-bold text-gray-900">{ring.maxRisk}</div>
                        </div>
                        <div className="bg-gray-50 rounded p-2">
                          <div className="text-xs text-gray-500">Members</div>
                          <div className="text-lg font-bold text-gray-900">{ring.members.length}</div>
                        </div>
                        <div className="bg-gray-50 rounded p-2">
                          <div className="text-xs text-gray-500">Size</div>
                          <div className="text-lg font-bold text-gray-900">{ring.members.length}</div>
                        </div>
                      </div>

                      {/* Members Preview */}
                      <div className="mb-3">
                        <div className="text-xs text-gray-500 mb-2">Members</div>
                        <div className="space-y-1 max-h-24 overflow-y-auto">
                          {ring.members.slice(0, 5).map((member, i) => (
                            <div key={i} className="text-xs font-mono text-gray-700 bg-gray-50 px-2 py-1 rounded">
                              {member}
                            </div>
                          ))}
                          {ring.members.length > 5 && (
                            <div className="text-xs text-gray-500 italic">
                              +{ring.members.length - 5} more
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onHighlightRing && onHighlightRing(ring.ringId);
                        }}
                        className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded transition-colors"
                      >
                        Highlight All
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

export default GraphSidePanel;
