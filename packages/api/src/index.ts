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
import adminRouter from './routes/admin';
import { migrateToLatest, initTracing, getMetrics, httpRequestsTotal, httpRequestDuration } from '@reflux/core';

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Prometheus metrics middleware
app.use((req, res, next) => {
  const start = Date.now();

  // Capture response finish event
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000; // Convert to seconds
    const route = req.route?.path || req.path;
    const statusCode = res.statusCode.toString();

    // Record metrics
    httpRequestsTotal.inc({
      method: req.method,
      route,
      status_code: statusCode,
    });

    httpRequestDuration.observe(
      {
        method: req.method,
        route,
        status_code: statusCode,
      },
      duration
    );
  });

  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    const metrics = await getMetrics();
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(metrics);
  } catch (error: any) {
    res.status(500).send(`Error generating metrics: ${error.message}`);
  }
});

// API routes
app.use('/api/flows', flowsRouter);
app.use('/api/runs', runsRouter);
app.use('/api/nodes', nodesRouter);
app.use('/api/admin', adminRouter);

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
    // Initialize OpenTelemetry tracing
    initTracing({
      enabled: process.env.OTEL_ENABLED !== 'false',
      serviceName: 'reflux-api',
      serviceVersion: '0.1.0',
      otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
      environment: process.env.NODE_ENV || 'development',
    });

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
      console.log(`  GET    /api/admin/retention/* - Retention management`);
      console.log(`  *      /webhook/* - Dynamic webhook triggers`);
      console.log(`\n⏳ Ready for requests...\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

start();
