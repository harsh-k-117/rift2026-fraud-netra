import React, { useState } from 'react';
import HomePage from './pages/HomePage';

function App() {
  const [analysisData, setAnalysisData] = useState(null);
  const [systemStatus, setSystemStatus] = useState('ready');

  const getStatusInfo = () => {
    if (analysisData) return { text: 'CONNECTED', color: 'status-active' };
    if (systemStatus === 'loading') return { text: 'PROCESSING', color: 'status-warning' };
    if (systemStatus === 'error') return { text: 'ERROR', color: 'status-error' };
    return { text: 'READY', color: 'status-active' };
  };

  const status = getStatusInfo();

  return (
    <div className="app-container">
      {/* Professional Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            {/* Logo and Title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 flex items-center justify-center rounded">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Fraud Detection System
                </h1>
                <p className="text-xs text-gray-500">
                  Transaction Network Analysis Platform
                </p>
              </div>
            </div>

            {/* System Status */}
            <div className={status.color}>
              <span className="status-indicator"></span>
              <span>SYSTEM {status.text}</span>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="relative">
        <HomePage 
          analysisData={analysisData} 
          setAnalysisData={setAnalysisData}
          setSystemStatus={setSystemStatus}
        />
      </main>

      {/* Professional Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex justify-between items-center text-sm text-gray-500">
            <div>
              <span className="font-medium text-gray-900">Fraud Detection System</span> 
              {' • '}
              Financial Crime Intelligence Platform
              {' • '}
              RIFT 2026
            </div>
            <div>
              Version 1.0.0
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
