import express from 'express';
import cors from 'cors';
import { config } from './config';
import { router } from './routes';
import { initializeDatabase } from './db/init';

const app = express();

// Security & Parsing Middleware
app.use(cors({
  origin: '*', // In production, restrict to frontend domain
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-webhook-signature']
}));

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Request Logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (config.nodeEnv === 'development' || duration > 1000) {
      console.log(`[HTTP ${req.method}] ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'B2B Multi-Tier Recharge Platform Engine',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    upstream_sandbox: {
      a1topup: config.a1Topup.isSandbox,
      noble_web: config.nobleWeb.isSandbox
    }
  });
});

// Mount API routes
app.use('/api', router);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[UNHANDLED SERVER ERROR]:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Server Initialization
async function startServer() {
  try {
    // Attempt database initialization
    await initializeDatabase().catch((dbErr) => {
      console.warn('[DB WARNING] Could not auto-initialize DB on startup. Ensure PostgreSQL is running via Docker or cloud:', dbErr.message);
    });

    app.listen(config.port, () => {
      console.log(`
=============================================================
🚀 B2B Multi-Tier Recharge Platform Backend Engine
=============================================================
📡 Server Port:         http://localhost:${config.port}
🏥 Health Check:         http://localhost:${config.port}/health
🔒 Upstream Primary:    A1Topup API (${config.a1Topup.isSandbox ? 'Sandbox Mode' : 'Live Mode'})
⚡ Upstream Failover:   Noble Web Studio (${config.nobleWeb.isSandbox ? 'Sandbox Mode' : 'Live Mode'})
💼 Target Margin:       5.0% Admin Spread
🛡️ ACID Locking:        SELECT ... FOR UPDATE Active
⏱️ Deduplication:       30-Second Sliding Window
=============================================================
      `);
    });
  } catch (error) {
    console.error('Fatal failure starting server:', error);
    process.exit(1);
  }
}

startServer();
