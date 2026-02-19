import { parseCSV } from '../services/csvParser.js';
import { buildGraph } from '../services/graphBuilder.js';
import { detectFraud } from '../services/fraudDetector.js';
import { buildJSONOutput } from '../services/jsonBuilder.js';
import { v4 as uuidv4 } from 'uuid';

// In-memory storage for analysis results
const analysisStore = new Map();

export const uploadCSV = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const startTime = Date.now();
    const analysisId = uuidv4();
    console.log(`\n[${analysisId}] Starting fraud analysis...`);
    console.log(`File size: ${(req.file.buffer.length / 1024).toFixed(2)} KB`);

    // Phase 1: Parse CSV
    console.log('Phase 1: Parsing CSV...');
    const phase1Start = Date.now();
    const csvData = req.file.buffer.toString('utf-8');
    const transactions = parseCSV(csvData);
    const phase1Time = ((Date.now() - phase1Start) / 1000).toFixed(3);
    console.log(`Phase 1 complete: ${transactions.length} transactions parsed in ${phase1Time}s`);

    if (!transactions || transactions.length === 0) {
      return res.status(400).json({ error: 'Invalid CSV format or empty file' });
    }

    // Phase 2: Build Graph
    console.log('Phase 2: Building transaction graph...');
    const phase2Start = Date.now();
    const graph = buildGraph(transactions);
    const phase2Time = ((Date.now() - phase2Start) / 1000).toFixed(3);
    console.log(`Phase 2 complete: ${graph.nodes.size} nodes, ${graph.edges.length} edges in ${phase2Time}s`);

    // Phase 3: Detect Fraud
    console.log('Phase 3: Running fraud detection algorithms...');
    const phase3Start = Date.now();
    const fraudResults = detectFraud(graph, transactions);
    const phase3Time = ((Date.now() - phase3Start) / 1000).toFixed(3);
    console.log(`Phase 3 complete: ${fraudResults.suspiciousAccounts.length} suspicious accounts, ${fraudResults.fraudRings.length} rings in ${phase3Time}s`);

    // Phase 4: Build JSON Output
    console.log('Phase 4: Building JSON output...');
    const phase4Start = Date.now();
    const processingTime = (Date.now() - startTime) / 1000;
    const output = buildJSONOutput(fraudResults, graph, processingTime);
    const phase4Time = ((Date.now() - phase4Start) / 1000).toFixed(3);
    console.log(`Phase 4 complete in ${phase4Time}s`);

    // Build graph visualization data
    console.log('Phase 5: Building visualization data...');
    const phase5Start = Date.now();
    const graphData = buildGraphVisualizationData(graph, output);
    const phase5Time = ((Date.now() - phase5Start) / 1000).toFixed(3);
    console.log(`Phase 5 complete: ${graphData.nodes.length} nodes visualized in ${phase5Time}s`);

    // Store results in memory
    analysisStore.set(analysisId, {
      output,
      graph,
      graphData,
      timestamp: new Date()
    });

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(3);
    console.log(`\nAnalysis complete!`);
    console.log(`Total processing time: ${totalTime}s`);
    console.log(`   - CSV Parsing: ${phase1Time}s (${((phase1Time/totalTime)*100).toFixed(1)}%)`);
    console.log(`   - Graph Build: ${phase2Time}s (${((phase2Time/totalTime)*100).toFixed(1)}%)`);
    console.log(`   - Fraud Detection: ${phase3Time}s (${((phase3Time/totalTime)*100).toFixed(1)}%)`);
    console.log(`   - JSON Build: ${phase4Time}s (${((phase4Time/totalTime)*100).toFixed(1)}%)`);
    console.log(`   - Visualization: ${phase5Time}s (${((phase5Time/totalTime)*100).toFixed(1)}%)`);
    console.log(`Results: ${output.suspicious_accounts.length} suspicious / ${graph.nodes.size} total accounts`);
    console.log(`Rings detected: ${output.fraud_rings.length}\n`);

    // Return response
    res.json({
      analysis_id: analysisId,
      total_accounts: graph.nodes.size,
      total_transactions: transactions.length,
      suspicious_accounts_flagged: output.suspicious_accounts.length,
      fraud_rings_detected: output.fraud_rings.length,
      processing_time_seconds: parseFloat(totalTime),
      data: output,
      graph: graphData
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Failed to process CSV',
      message: error.message 
    });
  }
};

export const getAnalysis = (req, res) => {
  const { id } = req.params;
  const result = analysisStore.get(id);

  if (!result) {
    return res.status(404).json({ error: 'Analysis not found' });
  }

  res.json(result.output);
};

/**
 * Build graph visualization data for frontend - OPTIMIZED
 * Analyze all data, but smartly limit visualization for performance
 */
const buildGraphVisualizationData = (graph, output) => {
  const nodes = [];
  const links = [];
  const MAX_RENDER_NODES = 2000; // Maximum nodes to render for performance
  
  // Create lookup for suspicious accounts
  const suspiciousMap = new Map();
  output.suspicious_accounts.forEach(acc => {
    suspiciousMap.set(acc.account_id, {
      score: acc.suspicion_score,
      patterns: acc.detected_patterns,
      ringId: acc.ring_id
    });
  });
  
  const includedNodes = new Set();
  const totalNodes = graph.nodes.size;
  
  if (totalNodes <= MAX_RENDER_NODES) {
    // Small dataset: include all nodes
    graph.nodes.forEach((_, accountId) => includedNodes.add(accountId));
  } else {
    // Large dataset: prioritize suspicious nodes and their network
    console.log(`  Large graph (${totalNodes} nodes) - prioritizing for visualization`);
    
    // 1. Always include all suspicious nodes
    suspiciousMap.forEach((data, accountId) => {
      includedNodes.add(accountId);
    });
    
    // 2. Include direct neighbors of suspicious nodes (1-hop)
    suspiciousMap.forEach((data, accountId) => {
      const node = graph.nodes.get(accountId);
      if (node && includedNodes.size < MAX_RENDER_NODES) {
        node.incoming_edges.forEach(edge => {
          if (includedNodes.size < MAX_RENDER_NODES) {
            includedNodes.add(edge.from);
          }
        });
        node.outgoing_edges.forEach(edge => {
          if (includedNodes.size < MAX_RENDER_NODES) {
            includedNodes.add(edge.to);
          }
        });
      }
    });
    
    // 3. Fill remaining with high-activity nodes
    if (includedNodes.size < MAX_RENDER_NODES) {
      const remaining = MAX_RENDER_NODES - includedNodes.size;
      const candidates = Array.from(graph.nodes.entries())
        .filter(([id]) => !includedNodes.has(id))
        .sort(([, a], [, b]) => b.total_transactions - a.total_transactions)
        .slice(0, remaining);
      
      candidates.forEach(([id]) => includedNodes.add(id));
    }
    
    console.log(`  Rendering ${includedNodes.size}/${totalNodes} nodes (all data analyzed)`);
  }
  
  // Build nodes from included set
  includedNodes.forEach(accountId => {
    const nodeData = graph.nodes.get(accountId);
    if (!nodeData) return;
    
    const suspicious = suspiciousMap.get(accountId);
    
    nodes.push({
      id: accountId,
      name: accountId,
      suspicious: !!suspicious,
      suspicionScore: suspicious?.score || 0,
      patterns: suspicious?.patterns || [],
      ringId: suspicious?.ringId || null,
      totalTransactions: nodeData.total_transactions,
      inDegree: nodeData.in_degree,
      outDegree: nodeData.out_degree
    });
  });
  
  // Build links - only between included nodes
  const linkSet = new Set();
  graph.edges.forEach(edge => {
    // Only include edges between nodes we're showing
    if (!includedNodes.has(edge.from) || !includedNodes.has(edge.to)) return;
    
    const linkKey = `${edge.from}-${edge.to}`;
    if (!linkSet.has(linkKey)) {
      linkSet.add(linkKey);
      links.push({
        source: edge.from,
        target: edge.to,
        amount: edge.amount,
        timestamp: edge.timestamp
      });
    }
  });
  
  return { nodes, links };
};

export { analysisStore };
