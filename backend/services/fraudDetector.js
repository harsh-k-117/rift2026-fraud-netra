/**
 * Fraud Detection Engine
 * Optimized for performance with large datasets
 * Following RIFT_2026_HACKATHON.md specification
 */

export const detectFraud = (graph, transactions) => {
  const overallStart = Date.now();
  const fraudRings = [];
  const accountPatterns = new Map(); // Track patterns per account
  let ringIdCounter = 1;

  // Analyze complete dataset with smart performance limits
  const nodeCount = graph.nodes.size;
  const edgeCount = graph.edges.length;
  
  // Smart limits based on dataset size
  const maxCyclesToFind = Math.min(Math.max(200, nodeCount), 2000); // 200-2000 cycles
  const maxShellChains = Math.min(Math.max(100, nodeCount / 2), 1000); // 100-1000 chains
  
  console.log(`  Analyzing ${nodeCount} accounts, ${edgeCount} transactions for fraud patterns...`);

  // 1. Detect Cycles (length 3-5) - Optimized
  console.log(`  [1/3] Detecting circular fund routing (cycles 3-5)...`);
  const cycleStart = Date.now();
  const cycles = detectCycles(graph, maxCyclesToFind);
  const cycleTime = ((Date.now() - cycleStart) / 1000).toFixed(3);
  console.log(`     Found ${cycles.length} cycles in ${cycleTime}s`);
  
  cycles.forEach(cycle => {
    const ringId = `RING-${String(ringIdCounter++).padStart(3, '0')}`;
    fraudRings.push({
      ring_id: ringId,
      member_accounts: cycle,
      pattern_type: 'cycle',
      risk_score: 90
    });
    
    // Mark all members
    cycle.forEach(accountId => {
      if (!accountPatterns.has(accountId)) {
        accountPatterns.set(accountId, { patterns: [], rings: [], scores: [] });
      }
      accountPatterns.get(accountId).patterns.push('cycle');
      accountPatterns.get(accountId).rings.push(ringId);
      accountPatterns.get(accountId).scores.push(40);
    });
  });

  // 2. Detect Smurfing (fan-in and fan-out) - Optimized
  console.log(`  [2/3] Detecting smurfing patterns (fan-in/fan-out ≥10)...`);
  const smurfStart = Date.now();
  const smurfRings = detectSmurfing(graph, transactions, nodeCount > 5000); // Optimize for large datasets
  const smurfTime = ((Date.now() - smurfStart) / 1000).toFixed(3);
  console.log(`     Found ${smurfRings.length} smurfing rings in ${smurfTime}s`);
  
  smurfRings.forEach(smurf => {
    const ringId = `RING-${String(ringIdCounter++).padStart(3, '0')}`;
    fraudRings.push({
      ring_id: ringId,
      member_accounts: smurf.members,
      pattern_type: smurf.type,
      risk_score: smurf.riskScore
    });
    
    // Mark aggregator
    if (!accountPatterns.has(smurf.aggregator)) {
      accountPatterns.set(smurf.aggregator, { patterns: [], rings: [], scores: [] });
    }
    accountPatterns.get(smurf.aggregator).patterns.push('smurf_aggregator');
    accountPatterns.get(smurf.aggregator).rings.push(ringId);
    accountPatterns.get(smurf.aggregator).scores.push(35);
    
    // Mark participants
    smurf.participants.forEach(participantId => {
      if (!accountPatterns.has(participantId)) {
        accountPatterns.set(participantId, { patterns: [], rings: [], scores: [] });
      }
      accountPatterns.get(participantId).patterns.push('smurf_participant');
      accountPatterns.get(participantId).rings.push(ringId);
      accountPatterns.get(participantId).scores.push(20);
    });
  });

  // 3. Detect Shell Networks - Optimized
  console.log(`  [3/3] Detecting layered shell networks (≥3 hops)...`);
  const shellStart = Date.now();
  const shellChains = detectShellNetworks(graph, maxShellChains);
  const shellTime = ((Date.now() - shellStart) / 1000).toFixed(3);
  console.log(`     Found ${shellChains.length} shell chains in ${shellTime}s`);
  
  shellChains.forEach(chain => {
    const ringId = `RING-${String(ringIdCounter++).padStart(3, '0')}`;
    fraudRings.push({
      ring_id: ringId,
      member_accounts: chain.members,
      pattern_type: 'shell_network',
      risk_score: chain.riskScore
    });
    
    chain.intermediates.forEach(accountId => {
      if (!accountPatterns.has(accountId)) {
        accountPatterns.set(accountId, { patterns: [], rings: [], scores: [] });
      }
      accountPatterns.get(accountId).patterns.push('shell_intermediate');
      accountPatterns.get(accountId).rings.push(ringId);
      accountPatterns.get(accountId).scores.push(30);
    });
  });

  // 4. Build suspicious accounts list with scores
  console.log(`  Calculating suspicion scores and filtering...`);
  const scoreStart = Date.now();
  const suspiciousAccounts = [];
  accountPatterns.forEach((data, accountId) => {
    const node = graph.nodes.get(accountId);
    
    // False positive control: don't flag legitimate merchants
    if (isLegitimateAccount(node, data.patterns.includes('cycle'))) {
      return;
    }
    
    const suspicionScore = calculateSuspicionScore(node, data.patterns, data.scores);
    
    suspiciousAccounts.push({
      account_id: accountId,
      suspicion_score: suspicionScore,
      detected_patterns: [...new Set(data.patterns)],
      ring_id: data.rings[0] || null
    });
  });

  // Sort by suspicion score descending
  suspiciousAccounts.sort((a, b) => b.suspicion_score - a.suspicion_score);
  const scoreTime = ((Date.now() - scoreStart) / 1000).toFixed(3);
  console.log(`     Scored ${suspiciousAccounts.length} suspicious accounts in ${scoreTime}s`);

  const totalDetectionTime = ((Date.now() - overallStart) / 1000).toFixed(3);
  console.log(`  Total fraud detection: ${totalDetectionTime}s`);

  return {
    suspiciousAccounts,
    fraudRings
  };
};

/**
 * Cycle detection using DFS - HIGHLY OPTIMIZED
 * Detect cycles of length 3-5 only
 * @param {Object} graph - The transaction graph
 * @param {Number} maxCycles - Maximum number of cycles to find (performance limit)
 */
const detectCycles = (graph, maxCycles = 200) => {
  const cycles = [];
  const globalVisited = new Set(); // Track globally visited nodes to avoid redundant searches
  const cycleSignatures = new Set(); // Track unique cycles
  
  // Early termination flag
  let shouldStop = false;
  
  const dfs = (nodeId, path, recStack, depth) => {
    if (shouldStop || cycles.length >= maxCycles) {
      shouldStop = true;
      return true; // Early termination
    }
    
    recStack.add(nodeId);
    
    const node = graph.nodes.get(nodeId);
    if (!node || !node.outgoing_edges || node.outgoing_edges.length === 0) {
      recStack.delete(nodeId);
      return false;
    }
    
    // Strict depth limit for performance (only check cycles 3-5)
    if (depth >= 5) {
      recStack.delete(nodeId);
      return false;
    }
    
    // Limit edges to explore per node for large graphs
    const edgesToExplore = node.outgoing_edges.slice(0, 20);
    
    for (const edge of edgesToExplore) {
      if (shouldStop) return true;
      
      const neighbor = edge.to;
      
      // Found a cycle back to a node in current path
      if (recStack.has(neighbor)) {
        const cycleStart = path.indexOf(neighbor);
        if (cycleStart !== -1 && cycleStart >= 0) {
          const cycle = path.slice(cycleStart);
          const cycleLength = cycle.length;
          
          // Only keep cycles of length 3-5
          if (cycleLength >= 3 && cycleLength <= 5) {
            const signature = getCanonicalCycle(cycle);
            if (!cycleSignatures.has(signature)) {
              cycleSignatures.add(signature);
              cycles.push([...cycle]);
              
              // Early exit if we found enough
              if (cycles.length >= maxCycles) {
                shouldStop = true;
                return true;
              }
            }
          }
        }
      } else if (!globalVisited.has(neighbor)) {
        // Only recurse if not globally visited and depth allows
        if (dfs(neighbor, [...path, neighbor], recStack, depth + 1)) {
          return true;
        }
      }
    }
    
    recStack.delete(nodeId);
    return false;
  };
  
  // Try DFS from each unvisited node, but limit total nodes checked
  const nodesToCheck = Array.from(graph.nodes.keys());
  const checkLimit = Math.min(nodesToCheck.length, maxCycles * 3); // Sample for large graphs
  
  for (let i = 0; i < checkLimit && !shouldStop; i++) {
    const nodeId = nodesToCheck[i];
    if (!globalVisited.has(nodeId)) {
      globalVisited.add(nodeId);
      dfs(nodeId, [nodeId], new Set(), 0);
    }
  }
  
  return cycles;
};

/**
 * Get canonical form of cycle for duplicate detection
 */
const getCanonicalCycle = (cycle) => {
  const sorted = [...cycle].sort();
  return sorted.join('-');
};

/**
 * Smurfing detection (Fan-in and Fan-out) - HIGHLY OPTIMIZED
 * >=10 unique senders/receivers within 72-hour window
 */
const detectSmurfing = (graph, transactions, isLargeDataset = false) => {
  const smurfRings = [];
  const WINDOW_HOURS = 72;
  const THRESHOLD = 10;
  const MAX_RINGS = isLargeDataset ? 50 : 200; // Limit for performance
  
  // Group transactions by account and sort
  const receiverMap = new Map();
  const senderMap = new Map();
  
  transactions.forEach(tx => {
    if (!receiverMap.has(tx.receiver_id)) receiverMap.set(tx.receiver_id, []);
    receiverMap.get(tx.receiver_id).push(tx);
    
    if (!senderMap.has(tx.sender_id)) senderMap.set(tx.sender_id, []);
    senderMap.get(tx.sender_id).push(tx);
  });
  
  // Fan-in detection: Many senders -> One receiver
  let fanInCount = 0;
  for (const [receiverId, txs] of receiverMap) {
    if (smurfRings.length >= MAX_RINGS) break;
    
    // Quick filter: skip if clearly not enough transactions
    if (txs.length < THRESHOLD) continue;
    
    // Count unique senders quickly
    const uniqueSenders = new Set(txs.map(tx => tx.sender_id));
    if (uniqueSenders.size < THRESHOLD) continue; // Early skip
    
    // Sort once for temporal analysis
    txs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    const senders = findSmurfPatternOptimized(txs, 'sender_id', WINDOW_HOURS, THRESHOLD);
    if (senders.length >= THRESHOLD) {
      fanInCount++;
      smurfRings.push({
        type: 'fan_in_smurfing',
        aggregator: receiverId,
        participants: senders,
        members: [receiverId, ...senders],
        riskScore: 85
      });
    }
  }
  
  // Fan-out detection: One sender -> Many receivers
  let fanOutCount = 0;
  for (const [senderId, txs] of senderMap) {
    if (smurfRings.length >= MAX_RINGS) break;
    
    // Quick filter: skip if clearly not enough transactions
    if (txs.length < THRESHOLD) continue;
    
    // Count unique receivers quickly
    const uniqueReceivers = new Set(txs.map(tx => tx.receiver_id));
    if (uniqueReceivers.size < THRESHOLD) continue; // Early skip
    
    txs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    const receivers = findSmurfPatternOptimized(txs, 'receiver_id', WINDOW_HOURS, THRESHOLD);
    if (receivers.length >= THRESHOLD) {
      fanOutCount++;
      smurfRings.push({
        type: 'fan_out_smurfing',
        aggregator: senderId,
        participants: receivers,
        members: [senderId, ...receivers],
        riskScore: 85
      });
    }
  }
  
  console.log(`     (Fan-in: ${fanInCount}, Fan-out: ${fanOutCount})`);
  
  return smurfRings;
};

/**
 * Helper: Find accounts in sliding window - OPTIMIZED
 * Uses early termination and breaks when threshold met
 */
const findSmurfPatternOptimized = (transactions, accountField, windowHours, threshold) => {
  const allAccounts = new Set();
  let maxWindowSize = 0;
  
  // Early termination: check first window only for large datasets
  const checkLimit = Math.min(transactions.length, 100);
  
  for (let i = 0; i < checkLimit; i++) {
    const windowAccounts = new Set();
    const startTime = new Date(transactions[i].timestamp);
    const endTime = new Date(startTime.getTime() + windowHours * 60 * 60 * 1000);
    
    // Binary search for end of window (since sorted)
    let j = i;
    while (j < transactions.length) {
      const currentTime = new Date(transactions[j].timestamp);
      if (currentTime > endTime) break;
      
      windowAccounts.add(transactions[j][accountField]);
      j++;
    }
    
    if (windowAccounts.size > maxWindowSize) {
      maxWindowSize = windowAccounts.size;
      if (windowAccounts.size >= threshold) {
        windowAccounts.forEach(acc => allAccounts.add(acc));
      }
    }
    
    // Early exit if threshold met
    if (allAccounts.size >= threshold) break;
  }
  
  return Array.from(allAccounts);
};

/**
 * Shell Network Detection - OPTIMIZED
 * Paths length >=3 with low-activity intermediates (<=3 transactions)
 */
const detectShellNetworks = (graph, maxChains = 100) => {
  const shellChains = [];
  const MAX_DEPTH = 4;
  const LOW_ACTIVITY_THRESHOLD = 3;
  const visitedPaths = new Set();
  
  // Only check nodes with low activity as potential intermediates
  const lowActivityNodes = new Set();
  for (const [nodeId, node] of graph.nodes) {
    if (node.total_transactions <= LOW_ACTIVITY_THRESHOLD) {
      lowActivityNodes.add(nodeId);
    }
  }
  
  // Limit nodes to check from (sample for large graphs)
  const nodesToCheck = Array.from(graph.nodes.keys()).slice(0, 500);
  
  // BFS from selected nodes only
  for (const startNode of nodesToCheck) {
    if (shellChains.length >= maxChains) break;
    
    const queue = [{ node: startNode, path: [startNode], depth: 0 }];
    const visited = new Set([startNode]);
    
    while (queue.length > 0 && shellChains.length < maxChains) {
      const { node, path, depth } = queue.shift();
      
      if (depth >= MAX_DEPTH) continue;
      
      const currentNode = graph.nodes.get(node);
      if (!currentNode || !currentNode.outgoing_edges) continue;
      
      // Limit edges checked per node
      const edgesToCheck = currentNode.outgoing_edges.slice(0, 10);
      
      for (const edge of edgesToCheck) {
        const neighbor = edge.to;
        
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          const newPath = [...path, neighbor];
          
          // Check if path qualifies as shell network
          if (newPath.length >= 3 && newPath.length <= 5) {
            const intermediates = newPath.slice(1, -1);
            
            // All intermediates must be low activity
            if (intermediates.every(id => lowActivityNodes.has(id))) {
              const pathSignature = newPath.join('->');
              if (!visitedPaths.has(pathSignature)) {
                visitedPaths.add(pathSignature);
                shellChains.push({
                  members: newPath,
                  intermediates: intermediates,
                  riskScore: 75
                });
                if (shellChains.length >= maxChains) break;
              }
            }
          }
          
          // Only continue if potential for shell chain exists
          if (newPath.length < MAX_DEPTH) {
            queue.push({ node: neighbor, path: newPath, depth: depth + 1 });
          }
        }
      }
    }
  }
  
  return shellChains;
};

/**
 * Calculate suspicion score using additive model
 */
const calculateSuspicionScore = (node, patterns, scores) => {
  let score = scores.reduce((sum, s) => sum + s, 0);
  
  // Additional scoring
  if (node.total_transactions > 20) {
    score += 15; // High velocity
  }
  
  // Check for large amounts
  const avgAmount = node.outgoing_edges.reduce((sum, e) => sum + e.amount, 0) / 
                    Math.max(node.outgoing_edges.length, 1);
  if (avgAmount > 5000) {
    score += 10;
  }
  
  // Clamp to 100
  return Math.min(Math.round(score), 100);
};

/**
 * False positive control
 * Don't flag accounts with >50 transactions and many partners
 */
const isLegitimateAccount = (node, hasCycle) => {
  if (node.total_transactions > 50 && !hasCycle) {
    const uniquePartners = new Set([
      ...node.incoming_edges.map(e => e.from),
      ...node.outgoing_edges.map(e => e.to)
    ]);
    return uniquePartners.size > 20;
  }
  return false;
};
