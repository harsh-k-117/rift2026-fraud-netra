/**
 * Build JSON output following EXACT schema from RIFT_2026_HACKATHON.md
 */
export const buildJSONOutput = (fraudResults, graph, processingTime) => {
  const { suspiciousAccounts, fraudRings } = fraudResults;

  // Sort suspicious accounts by suspicion_score descending
  const sortedSuspiciousAccounts = suspiciousAccounts.sort(
    (a, b) => b.suspicion_score - a.suspicion_score
  );

  return {
    suspicious_accounts: sortedSuspiciousAccounts,
    fraud_rings: fraudRings,
    summary: {
      total_accounts_analyzed: graph.nodes.size,
      suspicious_accounts_flagged: suspiciousAccounts.length,
      fraud_rings_detected: fraudRings.length,
      processing_time_seconds: parseFloat(processingTime.toFixed(3))
    }
  };
};
