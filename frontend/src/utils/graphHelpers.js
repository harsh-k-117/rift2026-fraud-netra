/**
 * Graph utility functions for frontend
 */

/**
 * Transform backend graph data to format compatible with react-force-graph-2d
 */
export const transformGraphData = (graphData) => {
  if (!graphData || !graphData.nodes || !graphData.links) {
    return { nodes: [], links: [] };
  }

  return {
    nodes: graphData.nodes,
    links: graphData.links
  };
};

/**
 * Determine node color based on suspicion status
 * Red = High suspicion (score >= 60)
 * Orange = Medium suspicion or ring member (score 30-59)
 * Yellow = Low suspicion (score 1-29)
 * Blue = Normal (score 0)
 */
export const getNodeColor = (node) => {
  if (!node.suspicious) return '#3B82F6'; // blue - normal
  
  if (node.suspicionScore >= 60) return '#EF4444'; // red - high risk
  if (node.suspicionScore >= 30) return '#F97316'; // orange - medium risk
  return '#FCD34D'; // yellow - low risk
};

/**
 * Determine node size based on transaction volume
 */
export const getNodeSize = (node) => {
  const baseSize = 5;
  const scaleFactor = Math.sqrt(node.totalTransactions || 1);
  return baseSize + scaleFactor;
};

/**
 * Format node label for display
 */
export const getNodeLabel = (node) => {
  if (node.suspicious) {
    return `${node.id}\nScore: ${node.suspicionScore}`;
  }
  return node.id;
};
