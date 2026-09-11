require('dotenv').config({ path: require('path').resolve(__dirname, '..', '..', '.env') });
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const cron = require('node-cron');

const { errorHandler } = require('./middleware/errorHandler');
const { processSLAAndEscalations } = require('./services/escalationService');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check — always available even without DB
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  res.json({
    status: dbState === 1 ? 'ok' : 'degraded',
    database: dbStatus[dbState] || 'unknown',
    timestamp: new Date().toISOString(),
    demoMode: process.env.DEMO_MODE === 'true',
    mongoUri: process.env.MONGODB_URI ? (process.env.MONGODB_URI.startsWith('mongodb') ? 'configured' : 'MISSING — set MONGODB_URI in .env') : 'MISSING',
  });
});

// Start HTTP server immediately (health check available right away)
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔧 Demo mode: ${process.env.DEMO_MODE === 'true' ? 'ON' : 'OFF'}`);
  console.log(`🤖 AI demo mode: ${process.env.AI_DEMO_MODE === 'true' ? 'ON' : 'OFF'}`);
  console.log(`🏥 Health: http://localhost:${PORT}/api/health`);
});

// Connect to MongoDB, then mount API routes
const MONGO_URI = process.env.MONGODB_URI;

if (!MONGO_URI || !MONGO_URI.startsWith('mongodb')) {
  console.error('');
  console.error('╔══════════════════════════════════════════════════════╗');
  console.error('║  ⚠️  MONGODB_URI is not configured in .env           ║');
  console.error('║                                                      ║');
  console.error('║  1. Open: civic-issue-platform/.env                  ║');
  console.error('║  2. Replace MISSING_REPLACE_WITH_YOUR_MONGODB_ATLAS_URI ║');
  console.error('║     with your actual Atlas connection string          ║');
  console.error('║  3. Restart the server                               ║');
  console.error('║                                                      ║');
  console.error('║  Get a free URI at: cloud.mongodb.com                ║');
  console.error('╚══════════════════════════════════════════════════════╝');
  console.error('');

  // Mount a fallback for all /api/* routes explaining what's missing
  app.use('/api', (req, res) => {
    res.status(503).json({
      error: 'Service Unavailable',
      message: 'MONGODB_URI is not configured. Edit .env at the project root and restart the server.',
      envFile: 'civic-issue-platform/.env',
    });
  });
  app.use(errorHandler);
} else {
  mongoose.connect(MONGO_URI)
    .then(() => {
      console.log('✅ Connected to MongoDB Atlas');

      // Mount all API routes after successful DB connection
      const authRoutes = require('./routes/auth');
      const issueRoutes = require('./routes/issues');
      const reportRoutes = require('./routes/reports');
      const departmentRoutes = require('./routes/departments');
      const escalationRoutes = require('./routes/escalations');
      const notificationRoutes = require('./routes/notifications');
      const adminRoutes = require('./routes/admin');
      const aiRoutes = require('./routes/ai');

      app.use('/api/auth', authRoutes);
      app.use('/api/issues', issueRoutes);
      app.use('/api/reports', reportRoutes);
      app.use('/api/departments', departmentRoutes);
      app.use('/api/escalations', escalationRoutes);
      app.use('/api/notifications', notificationRoutes);
      app.use('/api/admin', adminRoutes);
      app.use('/api/ai', aiRoutes);

      // Demo routes — only when DEMO_MODE=true
      if (process.env.DEMO_MODE === 'true') {
        const demoRoutes = require('./routes/demo');
        app.use('/api/demo', demoRoutes);
      }

      app.use(errorHandler);

      // Run SLA/escalation check every 5 minutes
      cron.schedule('*/5 * * * *', async () => {
        try {
          await processSLAAndEscalations();
        } catch (err) {
          console.error('SLA cron error:', err.message);
        }
      });
    })
    .catch((err) => {
      console.error('❌ MongoDB connection error:', err.message);
      // Don't exit — HTTP server still serves health check
      app.use('/api', (req, res) => {
        res.status(503).json({ error: 'Database connection failed', message: err.message });
      });
      app.use(errorHandler);
    });
}

module.exports = app;

