import express from 'express';
import cors from 'cors';
import uploadRoutes from './routes/upload.js';

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path !== '/health') { // Don't log health checks
      console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Routes
app.use('/api', uploadRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'AegisGraph API is running' });
});

// Start server
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
