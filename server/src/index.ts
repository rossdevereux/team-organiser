import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import compression from 'compression';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { requireAuth, optionalAuth, AuthenticatedRequest } from './middleware/auth.js';

import apiRouter from './routes/api.js';
import adminRouter from './routes/admin.js';
import billingRouter from './routes/billing.js';
import supportRouter from './routes/support.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '8080', 10);

// Basic middleware
app.use(cors({ exposedHeaders: ['ETag'] }));
app.use(compression({ threshold: 256 }));
app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

// Request logger
app.use((req, _res, next) => {
  const start = Date.now();
  const { method, originalUrl } = req;
  _res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${method} ${originalUrl} ${_res.statusCode} - ${duration}ms`);
  });
  next();
});

/**
 * Health check endpoint tested by frontend and Cloud Run
 */
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'team-organiser-api',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    serverTime: Date.now(),
  });
});

/**
 * Football sub-rotation sample endpoint (Domain relevant)
 */
app.get('/api/teams/sample', optionalAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    teamName: 'The Rovers FC',
    matchFormat: '7-a-side',
    targetRotationMinutes: 10,
    activeLineup: [
      { id: 'p1', name: 'Alex M.', position: 'GK', minutesPlayed: 20 },
      { id: 'p2', name: 'Jordan K.', position: 'DEF', minutesPlayed: 15 },
      { id: 'p3', name: 'Sam R.', position: 'DEF', minutesPlayed: 15 },
      { id: 'p4', name: 'Taylor B.', position: 'MID', minutesPlayed: 20 },
      { id: 'p5', name: 'Chris P.', position: 'MID', minutesPlayed: 10 },
      { id: 'p6', name: 'Morgan L.', position: 'FWD', minutesPlayed: 10 },
      { id: 'p7', name: 'Jamie D.', position: 'FWD', minutesPlayed: 20 },
    ],
    bench: [
      { id: 'p8', name: 'Casey H.', position: 'SUB', minutesPlayed: 5, readyToSub: true },
      { id: 'p9', name: 'Riley T.', position: 'SUB', minutesPlayed: 5, readyToSub: true },
      { id: 'p10', name: 'Quinn W.', position: 'SUB', minutesPlayed: 0, readyToSub: true },
    ],
    requestedBy: req.user ? req.user.email || req.user.uid : 'anonymous',
  });
});

/**
 * Protected user route demonstrating JWT / Firebase auth middleware
 */
app.get('/api/user/profile', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    message: 'Authenticated access granted',
    user: req.user,
    timestamp: new Date().toISOString(),
  });
});

// Prevent browsers and CDN edge caches from caching dynamic football match & squad mutations
app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Mount SubShuffle full-stack API routes
app.use('/api', apiRouter);

// Mount SubShuffle RBAC Admin routes (Users, Club Settings, Backups)
app.use('/api/admin', adminRouter);

// Mount SubShuffle Stripe Billing & Monetisation routes
app.use('/api/billing', billingRouter);

// Mount SubShuffle Support & Jira Service Management routes
app.use('/api/support', supportRouter);

// Fallback for unmatched /api routes
app.all('/api/*', (_req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'API route not found',
  });
});

// Static asset serving with production caching headers if client/dist exists
const candidatesDist = [
  path.resolve(process.cwd(), '../client/dist'),
  path.resolve(process.cwd(), 'client/dist'),
  path.resolve(__dirname, '../../client/dist'),
];
const clientDist = candidatesDist.find((p) => fs.existsSync(p));

if (clientDist) {
  app.use(
    express.static(clientDist, {
      maxAge: 0,
      setHeaders: (res, filePath) => {
        const norm = filePath.replace(/\\/g, '/');
        if (norm.includes('/assets/')) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else if (/\.(jpg|jpeg|gif|png|svg|webp|ico)$/i.test(norm)) {
          res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
        } else if (/\.(woff|woff2|ttf|otf|eot)$/i.test(norm)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else if (norm.endsWith('/manifest.json')) {
          res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=86400');
        } else if (norm.endsWith('/sw.js') || norm.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
      },
    })
  );

  app.get('*', (_req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Team Organiser API server listening on http://0.0.0.0:${port}`);
  console.log(`🩺 Health check available at http://0.0.0.0:${port}/api/health`);
});

// Graceful shutdown handling for Cloud Run scale-to-zero lifecycle
const handleShutdown = (signal: string) => {
  console.log(`Received ${signal}. Gracefully shutting down...`);
  server.close(() => {
    console.log('HTTP server closed. Exiting process.');
    process.exit(0);
  });

  // Force close if graceful shutdown takes too long
  setTimeout(() => {
    console.error('Forcefully terminating server.');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
