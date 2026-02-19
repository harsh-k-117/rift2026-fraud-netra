import React from 'react';
import { BarChart, Bar, PieChart, Pie, LineChart, Line, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function StatisticsPanel({ data, graphData }) {
  if (!graphData || !graphData.nodes) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <p>No data available</p>
      </div>
    );
  }

  // Calculate statistics
  const suspiciousNodes = graphData.nodes.filter(n => n.suspicious);
  const criticalRisk = suspiciousNodes.filter(n => n.suspicionScore >= 60);
  const highRisk = suspiciousNodes.filter(n => n.suspicionScore >= 30 && n.suspicionScore < 60);
  const mediumRisk = suspiciousNodes.filter(n => n.suspicionScore > 0 && n.suspicionScore < 30);
  
  // Count fraud patterns
  const patternCounts = {};
  suspiciousNodes.forEach(node => {
    node.patterns.forEach(pattern => {
      patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
    });
  });

  // Risk distribution data for pie chart
  const riskDistribution = [
    { name: 'Critical', value: criticalRisk.length, color: '#dc2626' },
    { name: 'High', value: highRisk.length, color: '#ea580c' },
    { name: 'Medium', value: mediumRisk.length, color: '#eab308' },
    { name: 'Normal', value: graphData.nodes.length - suspiciousNodes.length, color: '#3b82f6' }
  ];

  // Pattern distribution for bar chart
  const patternData = Object.entries(patternCounts)
    .map(([name, count]) => ({ name: name.split(' ').slice(0, 2).join(' '), count }))
    .slice(0, 10);

  // Transaction degree distribution
  const degreeData = graphData.nodes
    .slice(0, 20)
    .map(node => ({
      account: node.id.slice(0, 8),
      transactions: node.totalTransactions,
      suspicious: node.suspicious
    }))
    .sort((a, b) => b.transactions - a.transactions);

  return (
    <div className="h-full overflow-y-auto bg-white p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">Analytics Dashboard</h2>
        <p className="text-sm text-gray-500 mt-1">Real-time fraud detection insights</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-xs font-semibold text-blue-600 uppercase">Total Accounts</div>
          <div className="text-3xl font-bold text-blue-900 mt-1">{graphData.nodes.length}</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-xs font-semibold text-red-600 uppercase">Suspicious</div>
          <div className="text-3xl font-bold text-red-900 mt-1">{suspiciousNodes.length}</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="text-xs font-semibold text-purple-600 uppercase">Transactions</div>
          <div className="text-3xl font-bold text-purple-900 mt-1">{graphData.links.length}</div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="text-xs font-semibold text-orange-600 uppercase">Critical Risk</div>
          <div className="text-3xl font-bold text-orange-900 mt-1">{criticalRisk.length}</div>
        </div>
      </div>

      {/* Risk Distribution Chart */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Risk Distribution</h3>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={riskDistribution}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {riskDistribution.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Pattern Detection Chart */}
      {patternData.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Detected Fraud Patterns</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={patternData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={11} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#9333ea" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top Accounts by Transaction Volume */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Top Active Accounts</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={degreeData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="account" angle={-45} textAnchor="end" height={60} fontSize={10} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="transactions" fill="#3b82f6">
              {degreeData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.suspicious ? '#dc2626' : '#3b82f6'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-3 flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-600 rounded"></div>
            <span className="text-gray-600">Normal</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-600 rounded"></div>
            <span className="text-gray-600">Suspicious</span>
          </div>
        </div>
      </div>

      {/* Summary Table */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Risk Summary</h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center py-2 border-b border-gray-200">
            <span className="text-sm text-gray-700">Critical Risk Accounts</span>
            <span className="text-sm font-bold text-red-600">{criticalRisk.length}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-200">
            <span className="text-sm text-gray-700">High Risk Accounts</span>
            <span className="text-sm font-bold text-orange-600">{highRisk.length}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-200">
            <span className="text-sm text-gray-700">Medium Risk Accounts</span>
            <span className="text-sm font-bold text-yellow-600">{mediumRisk.length}</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-gray-700">Detection Rate</span>
            <span className="text-sm font-bold text-gray-900">
              {((suspiciousNodes.length / graphData.nodes.length) * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StatisticsPanel;
