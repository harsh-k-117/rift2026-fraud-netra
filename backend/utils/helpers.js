/**
 * Utility functions for AegisGraph backend
 */

/**
 * Parse timestamp string to Date object
 */
export const parseTimestamp = (timestampStr) => {
  return new Date(timestampStr);
};

/**
 * Calculate time difference in hours
 */
export const getTimeDifferenceInHours = (timestamp1, timestamp2) => {
  const date1 = new Date(timestamp1);
  const date2 = new Date(timestamp2);
  return Math.abs(date2 - date1) / (1000 * 60 * 60);
};

/**
 * Generate canonical form of cycle for duplicate detection
 * Used in cycle detection algorithm
 */
export const getCycleCanonicalForm = (cycle) => {
  const sorted = [...cycle].sort();
  return sorted.join('-');
};

/**
 * Filter false positives
 * Don't flag accounts with transaction count > 50, many partners, no cycles
 */
export const isLegitimateAccount = (node, hasCycle = false) => {
  if (node.total_transactions > 50 && !hasCycle) {
    const uniquePartners = new Set([
      ...node.incoming_edges.map(e => e.from),
      ...node.outgoing_edges.map(e => e.to)
    ]);
    return uniquePartners.size > 20;
  }
  return false;
};
