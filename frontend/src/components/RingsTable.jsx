import React, { useState, useMemo } from 'react';

function RingsTable({ rings }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'risk_score', direction: 'desc' });
  const [expandedRow, setExpandedRow] = useState(null);

  if (!rings || rings.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-lg font-semibold text-gray-900 mb-2">No Fraud Rings Detected</p>
        <p className="text-sm text-gray-500">Dataset appears clean - no suspicious patterns identified</p>
      </div>
    );
  }

  const handleSort = (key) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
  };

  const filteredAndSortedRings = useMemo(() => {
    let filtered = rings.filter(ring =>
      ring.ring_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ring.pattern_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ring.member_accounts?.some(acc => acc.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        
        if (sortConfig.key === 'member_accounts') {
          aVal = a.member_accounts?.length || 0;
          bVal = b.member_accounts?.length || 0;
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [rings, searchTerm, sortConfig]);

  const getRiskLevel = (score) => {
    if (score >= 80) return { label: 'CRITICAL', class: 'badge-danger' };
    if (score >= 60) return { label: 'HIGH', class: 'badge-warning' };
    if (score >= 40) return { label: 'MEDIUM', class: 'badge-info' };
    return { label: 'LOW', class: 'badge-success' };
  };

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortConfig.direction === 'asc' ? (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search by Ring ID, Pattern Type, or Account"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="btn btn-secondary"
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('ring_id')} className="cursor-pointer hover:bg-gray-100">
                <div className="flex items-center gap-2">
                  Ring ID
                  <SortIcon columnKey="ring_id" />
                </div>
              </th>
              <th onClick={() => handleSort('pattern_type')} className="cursor-pointer hover:bg-gray-100">
                <div className="flex items-center gap-2">
                  Pattern Type
                  <SortIcon columnKey="pattern_type" />
                </div>
              </th>
              <th onClick={() => handleSort('member_accounts')} className="cursor-pointer hover:bg-gray-100">
                <div className="flex items-center gap-2">
                  Members
                  <SortIcon columnKey="member_accounts" />
                </div>
              </th>
              <th onClick={() => handleSort('risk_score')} className="cursor-pointer hover:bg-gray-100">
                <div className="flex items-center gap-2">
                  Risk Score
                  <SortIcon columnKey="risk_score" />
                </div>
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedRings.map((ring, index) => {
              const riskInfo = getRiskLevel(ring.risk_score);
              return (
                <React.Fragment key={index}>
                  <tr 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setExpandedRow(expandedRow === index ? null : index)}
                  >
                    <td className="font-mono text-sm">{ring.ring_id}</td>
                    <td>
                      <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                        {ring.pattern_type}
                      </span>
                    </td>
                    <td className="font-semibold">{ring.member_accounts?.length || 0}</td>
                    <td>
                      <div className="flex items-center gap-3">
                        <span className={`badge ${riskInfo.class}`}>
                          {riskInfo.label}
                        </span>
                        <span className="font-mono font-semibold">{ring.risk_score}</span>
                      </div>
                    </td>
                    <td>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedRow(expandedRow === index ? null : index);
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                      >
                        {expandedRow === index ? 'Collapse' : 'Details'}
                        <svg className={`w-4 h-4 transition-transform ${expandedRow === index ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                  {expandedRow === index && (
                    <tr className="bg-gray-50">
                      <td colSpan="5" className="p-6">
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <h4 className="text-sm font-semibold text-gray-900 mb-3">Network Members ({ring.member_accounts?.length || 0})</h4>
                            <div className="bg-white rounded border border-gray-200 p-4 max-h-40 overflow-y-auto">
                              <div className="flex flex-wrap gap-2">
                                {ring.member_accounts?.map((acc, i) => (
                                  <span key={i} className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs font-mono rounded">
                                    {acc}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-gray-900 mb-3">Analysis Details</h4>
                            <div className="bg-white rounded border border-gray-200 p-4 space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-500">Pattern Type:</span>
                                <span className="font-medium text-gray-900">{ring.pattern_type}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Threat Level:</span>
                                <span className={`badge ${riskInfo.class}`}>{riskInfo.label}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Risk Score:</span>
                                <span className="font-mono font-semibold text-gray-900">{ring.risk_score}/100</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredAndSortedRings.length === 0 && searchTerm && (
        <div className="text-center py-12">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-gray-900 font-semibold mb-2">No Results Found</p>
          <p className="text-sm text-gray-500">No rings match "{searchTerm}"</p>
        </div>
      )}
    </div>
  );
}

export default RingsTable;
