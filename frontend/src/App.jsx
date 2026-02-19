import React, { useState } from 'react';
import HomePage from './pages/HomePage';

function App() {
  const [analysisData, setAnalysisData] = useState(null);
  const [systemStatus, setSystemStatus] = useState('ready');
  const [activeView, setActiveView] = useState('dashboard');

  const getStatusInfo = () => {
    if (analysisData) return { text: 'CONNECTED', color: 'status-active' };
    if (systemStatus === 'loading') return { text: 'PROCESSING', color: 'status-warning' };
    if (systemStatus === 'error') return { text: 'ERROR', color: 'status-error' };
    return { text: 'READY', color: 'status-active' };
  };

  const status = getStatusInfo();

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'upload', label: 'Upload Data' },
    { id: 'analysis', label: 'Analysis', disabled: !analysisData },
    { id: 'graph', label: '2D Network', disabled: !analysisData },
    { id: 'network3d', label: '3D Network', disabled: !analysisData },
    { id: 'rings', label: 'Fraud Rings', disabled: !analysisData },
    { id: 'reports', label: 'Reports', disabled: !analysisData }
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo Section */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 flex items-center justify-center rounded">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-gray-900">
                Fraud Detection
              </h1>
              <p className="text-xs text-gray-500">
                Analysis Platform
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-4">
          {navigationItems.map((item) => (
            <button
              key={item.id}
              onClick={() => !item.disabled && setActiveView(item.id)}
              disabled={item.disabled}
              className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors duration-150 ${
                activeView === item.id
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-100'
              } ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span className="flex-1 text-left">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Footer Status */}
        <div className="p-6 border-t border-gray-200">
          <div className={`${status.color} text-xs justify-center`}>
            <span className="status-indicator"></span>
            <span>SYSTEM {status.text}</span>
          </div>
          {analysisData && (
            <div className="mt-3 text-xs text-gray-500">
              <div className="flex justify-between mb-1">
                <span>Accounts</span>
                <span className="font-mono font-medium text-gray-900">
                  {analysisData.total_accounts?.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Suspicious</span>
                <span className="font-mono font-medium text-red-600">
                  {analysisData.suspicious_accounts_flagged?.toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {navigationItems.find(item => item.id === activeView)?.label || 'Dashboard'}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {analysisData 
                  ? `Analysis ID: ${analysisData.analysis_id?.slice(0, 8)}...`
                  : 'Upload transaction data to begin analysis'
                }
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-xs text-gray-500">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'short', 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <HomePage 
            analysisData={analysisData} 
            setAnalysisData={setAnalysisData}
            setSystemStatus={setSystemStatus}
            activeView={activeView}
            setActiveView={setActiveView}
          />
        </main>
      </div>
    </div>
  );
}

export default App;
