import React, { useEffect, useState, useRef } from 'react';
import FileUpload from '../components/FileUpload';
import GraphVisualization2D from '../components/GraphVisualization2D';
import GraphVisualization3D from '../components/GraphVisualization3D';
import GraphSidePanel from '../components/GraphSidePanel';
import RingsTable from '../components/RingsTable';

function HomePage({ analysisData, setAnalysisData, setSystemStatus, activeView, setActiveView }) {
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedRing, setSelectedRing] = useState(null);
  const graphRef = useRef(null);
  
  // Debug logging
  useEffect(() => {
    console.log('HomePage: activeView changed to', activeView, {
      hasAnalysisData: !!analysisData,
      hasGraphData: !!analysisData?.graph,
      nodeCount: analysisData?.graph?.nodes?.length || 0
    });
  }, [activeView, analysisData]);

  // Dashboard View
  const DashboardView = () => (
    <div className="p-6 space-y-6">
      {analysisData ? (
        <>
          {/* Statistics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="stat-card">
                <div className="stat-label">Total Transactions</div>
                <div className="stat-value">{analysisData.total_transactions?.toLocaleString()}</div>
                <div className="stat-trend">Analyzed in dataset</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Unique Accounts</div>
                <div className="stat-value">{analysisData.total_accounts?.toLocaleString()}</div>
                <div className="stat-trend">Network participants</div>
              </div>
              <div className="stat-card border-l-4 border-l-orange-500">
                <div className="stat-label">Suspicious Accounts</div>
                <div className="stat-value text-orange-600">{analysisData.suspicious_accounts_flagged?.toLocaleString()}</div>
                <div className="stat-trend">
                  {((analysisData.suspicious_accounts_flagged / analysisData.total_accounts) * 100).toFixed(1)}% of total
                </div>
              </div>
              <div className="stat-card border-l-4 border-l-red-500">
                <div className="stat-label">Fraud Rings Detected</div>
                <div className="stat-value text-red-600">{analysisData.fraud_rings_detected?.toLocaleString()}</div>
                <div className="stat-trend">Criminal networks identified</div>
              </div>
            </div>

            {/* Processing Time */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-sm font-semibold text-gray-900">Analysis Performance</h3>
              </div>
              <div className="card-body">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Processing Time</div>
                    <div className="text-2xl font-semibold font-mono">
                      {analysisData.processing_time_seconds?.toFixed(3)}s
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Analysis ID</div>
                    <div className="text-sm font-mono text-gray-900">
                      {analysisData.analysis_id}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-sm font-semibold text-gray-900">Quick Actions</h3>
              </div>
              <div className="card-body">
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setActiveView('graph')} className="btn btn-secondary text-left">
                    <div className="text-xs text-gray-500">View</div>
                    <div className="font-medium">Network Graph</div>
                  </button>
                  <button onClick={() => setActiveView('rings')} className="btn btn-secondary text-left">
                    <div className="text-xs text-gray-500">View</div>
                    <div className="font-medium">Fraud Rings</div>
                  </button>
                  <button onClick={() => setActiveView('analysis')} className="btn btn-secondary text-left">
                    <div className="text-xs text-gray-500">View</div>
                    <div className="font-medium">Full Analysis</div>
                  </button>
                  <button onClick={() => {
                    const dataStr = JSON.stringify(analysisData.data, null, 2);
                    const blob = new Blob([dataStr], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `fraud-analysis-${analysisData.analysis_id}.json`;
                    link.click();
                  }} className="btn btn-primary text-left">
                    <div className="text-xs text-blue-100">Export</div>
                    <div className="font-medium">JSON Report</div>
                  </button>
                </div>
              </div>
            </div>
        </>
      ) : (
        <div className="card">
          <div className="card-body text-center py-12">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Analysis Data</h3>
              <p className="text-sm text-gray-500 mb-6">Upload transaction data to begin fraud detection analysis</p>
              <button onClick={() => setActiveView('upload')} className="btn btn-primary">
                Go to Upload
              </button>
            </div>
          </div>
      )}
    </div>
  );

  // Upload View
  const UploadView = () => (
    <div className="p-6">
      <FileUpload 
        onAnalysisComplete={(data) => {
          setAnalysisData(data);
          setActiveView('dashboard');
        }} 
        setSystemStatus={setSystemStatus} 
      />
    </div>
  );

  // Analysis View  
  const AnalysisView = () => (
    <div className="p-6">
      {analysisData?.data && (
        <div className="card">
          <div className="card-header flex justify-between items-center">
            <h3 className="text-sm font-semibold text-gray-900">Suspicious Accounts Analysis</h3>
            <span className="badge badge-danger">
              {analysisData.data.suspicious_accounts.length} Accounts Flagged
            </span>
          </div>
          <div className="card-body">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Account ID</th>
                    <th>Suspicion Score</th>
                    <th>Risk Level</th>
                    <th>Detected Patterns</th>
                    <th>Ring ID</th>
                  </tr>
                </thead>
                <tbody>
                  {analysisData.data.suspicious_accounts.slice(0, 50).map((account) => (
                    <tr key={account.account_id}>
                      <td className="font-mono text-sm">{account.account_id}</td>
                      <td className="font-mono font-semibold">{account.suspicion_score}</td>
                      <td>
                        <span className={`badge ${
                          account.suspicion_score >= 80 ? 'badge-danger' :
                          account.suspicion_score >= 60 ? 'badge-warning' :
                          'badge-info'
                        }`}>
                          {account.suspicion_score >= 80 ? 'CRITICAL' :
                           account.suspicion_score >= 60 ? 'HIGH' : 'MEDIUM'}
                        </span>
                      </td>
                      <td className="text-xs">
                        {account.detected_patterns.map((pattern, idx) => (
                          <span key={idx} className="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded mr-1 mb-1">
                            {pattern}
                          </span>
                        ))}
                      </td>
                      <td className="font-mono text-xs text-gray-600">{account.ring_id || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Graph View - 2D Network Visualization
  const GraphView = () => (
    <div className="h-full">
      <GraphVisualization2D 
        ref={graphRef}
        data={analysisData?.data} 
        graphData={analysisData?.graph}
        totalAccounts={analysisData?.total_accounts}
        totalTransactions={analysisData?.total_transactions}
        onNodeSelect={setSelectedNode}
        onRingSelect={setSelectedRing}
      />
    </div>
  );

  // 3D Network View - Separate page for 3D mesh visualization
  const Network3DView = () => (
    <div className="h-full w-full bg-gray-50">
      <GraphVisualization3D 
        data={analysisData?.data}
        graphData={analysisData?.graph}
      />
    </div>
  );

  // Rings View
  const RingsView = () => (
    <div className="p-6">
      <div className="card">
        <div className="card-header">
          <h3 className="text-sm font-semibold text-gray-900">Detected Fraud Rings</h3>
        </div>
        <div className="card-body">
          <RingsTable rings={analysisData?.data?.fraud_rings || []} />
        </div>
      </div>
    </div>
  );

  // 3D Universe View
  // Reports View
  const ReportsView = () => (
    <div className="p-6">
      <div className="card">
        <div className="card-header">
          <h3 className="text-sm font-semibold text-gray-900">Analysis Report</h3>
        </div>
        <div className="card-body">
          <div className="space-y-6">
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Executive Summary</h4>
              <div className="bg-gray-50 p-4 rounded border border-gray-200 space-y-2 text-sm">
                <p><strong>Total Transactions Analyzed:</strong> {analysisData?.total_transactions?.toLocaleString()}</p>
                <p><strong>Unique Accounts:</strong> {analysisData?.total_accounts?.toLocaleString()}</p>
                <p><strong>Suspicious Accounts:</strong> {analysisData?.suspicious_accounts_flagged?.toLocaleString()} ({((analysisData?.suspicious_accounts_flagged / analysisData?.total_accounts) * 100).toFixed(2)}%)</p>
                <p><strong>Fraud Rings:</strong> {analysisData?.fraud_rings_detected}</p>
                <p><strong>Processing Time:</strong> {analysisData?.processing_time_seconds?.toFixed(3)} seconds</p>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Export Options</h4>
              <div className="flex gap-3">
                <button onClick={() => {
                  const dataStr = JSON.stringify(analysisData?.data, null, 2);
                  const blob = new Blob([dataStr], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `fraud-analysis-${analysisData?.analysis_id}.json`;
                  link.click();
                }} className="btn btn-primary">
                  Download JSON Report
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render based on active view
  const renderView = () => {
    console.log('HomePage: Rendering view:', activeView);
    switch(activeView) {
      case 'dashboard':
        return <DashboardView />;
      case 'upload':
        return <UploadView />;
      case 'analysis':
        return <AnalysisView />;
      case 'graph':
        return <GraphView />;
      case 'network3d':
        return <Network3DView />;
      case 'rings':
        return <RingsView />;
      case 'reports':
        return <ReportsView />;
      default:
        return <DashboardView />;
    }
  };

  return renderView();
}

export default HomePage;
