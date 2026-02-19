/**
 * Build directed graph using adjacency list model
 * Following RIFT_2026_HACKATHON.md specification
 */
export const buildGraph = (transactions) => {
  const startTime = Date.now();
  const graph = {
    nodes: new Map(),
    edges: []
  };

  console.log(`     Building graph from ${transactions.length} transactions...`);

  // Initialize or update nodes and edges
  transactions.forEach(tx => {
    const { sender_id, receiver_id, amount, timestamp, transaction_id } = tx;

    // Initialize sender node if not exists
    if (!graph.nodes.has(sender_id)) {
      graph.nodes.set(sender_id, {
        account_id: sender_id,
        outgoing_edges: [],
        incoming_edges: [],
        total_transactions: 0,
        in_degree: 0,
        out_degree: 0
      });
    }

    // Initialize receiver node if not exists
    if (!graph.nodes.has(receiver_id)) {
      graph.nodes.set(receiver_id, {
        account_id: receiver_id,
        outgoing_edges: [],
        incoming_edges: [],
        total_transactions: 0,
        in_degree: 0,
        out_degree: 0
      });
    }

    // Create edge object
    const edge = {
      transaction_id,
      from: sender_id,
      to: receiver_id,
      amount,
      timestamp
    };

    graph.edges.push(edge);

    // Update sender node
    const senderNode = graph.nodes.get(sender_id);
    senderNode.outgoing_edges.push(edge);
    senderNode.out_degree++;
    senderNode.total_transactions++;

    // Update receiver node
    const receiverNode = graph.nodes.get(receiver_id);
    receiverNode.incoming_edges.push(edge);
    receiverNode.in_degree++;
    receiverNode.total_transactions++;
  });

  const buildTime = ((Date.now() - startTime) / 1000).toFixed(3);
  console.log(`     Graph built: ${graph.nodes.size} nodes, ${graph.edges.length} edges (${buildTime}s)`);

  return graph;
};
