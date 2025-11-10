/**
 * REFLUX API Server
 */

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import flowsRouter from './routes/flows';
import runsRouter from './routes/runs';
import nodesRouter from './routes/nodes';
import webhooksRouter from './routes/webhooks';
import { migrateToLatest } from '@reflux/core';

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/flows', flowsRouter);
app.use('/api/runs', runsRouter);
app.use('/api/nodes', nodesRouter);

// Webhook routes (dynamic, matches any active workflow webhook trigger)
app.use('/webhook', webhooksRouter);

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Start server
async function start() {
  try {
    // Run database migrations
    console.log('🔄 Running database migrations...');
    await migrateToLatest();

    // Start Express server
    app.listen(PORT, () => {
      console.log(`\n🚀 REFLUX API Server running on http://localhost:${PORT}`);
      console.log(`📋 Health check: http://localhost:${PORT}/health`);
      console.log(`\n📚 API Endpoints:`);
      console.log(`  GET    /api/flows - List flows`);
      console.log(`  POST   /api/flows - Create flow`);
      console.log(`  POST   /api/flows/:id/execute - Execute flow`);
      console.log(`  GET    /api/runs - List runs`);
      console.log(`  GET    /api/nodes - List nodes`);
      console.log(`  *      /webhook/* - Dynamic webhook triggers`);
      console.log(`\n⏳ Ready for requests...\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

start();
