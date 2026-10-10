import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { requireAuth, optionalAuth, AuthenticatedRequest } from './middleware/auth.js';

import apiRouter from './routes/api.js';
import adminRouter from './routes/admin.js';

dotenv.config();

const app = express();
const port = parseInt(process.env.PORT || '8080', 10);

// Basic middleware
app.use(cors());
app.use(express.json());

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

// Mount SubShuffle full-stack API routes
app.use('/api', apiRouter);

// Mount SubShuffle RBAC Admin routes (Users, Club Settings, Backups)
app.use('/api/admin', adminRouter);

// Fallback for unmatched /api routes
app.all('/api/*', (_req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'API route not found',
  });
});

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
  }, 10000);
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
