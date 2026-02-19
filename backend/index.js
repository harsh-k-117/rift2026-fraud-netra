import app from './app.js';

const PORT = process.env.PORT || 5001;

// Start server (local development only)
app.listen(PORT, () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`FRAUD NETRA - Graph-Based Financial Crime Detection Engine`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Server running on: http://localhost:${PORT}`);
  console.log(`RIFT 2026 Hackathon - Money Muling Detection Challenge`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Endpoints:`);
  console.log(`   POST /api/upload - Upload CSV for fraud analysis`);
  console.log(`   GET  /health     - Health check`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Ready to detect fraud patterns!\n`);
});
