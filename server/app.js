import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import statusMonitor from 'express-status-monitor';

import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import ticketRoutes from './routes/ticketRoutes.js';
import issueRoutes from './routes/issueRoutes.js';
import activityRoutes from './routes/activityRoutes.js';
import { stripeWebhook } from './controllers/bookingController.js';
import { errorHandler } from './middleware/errorHandler.js';
import {
  authRateLimiter,
  corsOptions,
  generalRateLimiter,
  httpLogger,
  parameterPollutionProtection,
  paymentRateLimiter,
  sanitizeRequest,
  securityHeaders
} from './middleware/security.js';
import { isRedisReady } from './services/redisService.js';

// ─── In-memory latency histogram for /metrics endpoint ──────────────────────
const latencyStore = {
  samples: [],          // { route, method, statusCode, durationMs, timestamp }
  maxSamples: 10_000    // rolling window
};

const recordLatency = (req, res, next) => {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    const route = req.route?.path
      ? `${req.method} ${req.baseUrl}${req.route.path}`
      : `${req.method} ${req.baseUrl || req.path}`;

    latencyStore.samples.push({
      route,
      method: req.method,
      statusCode: res.statusCode,
      durationMs,
      timestamp: Date.now()
    });

    // Trim oldest entries beyond the rolling window
    if (latencyStore.samples.length > latencyStore.maxSamples) {
      latencyStore.samples = latencyStore.samples.slice(-latencyStore.maxSamples);
    }
  });

  next();
};

const percentile = (sortedValues, p) => {
  if (sortedValues.length === 0) return null;
  const idx = Math.ceil((p / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, idx)];
};

const computeMetrics = (windowMs = 60_000) => {
  const cutoff = Date.now() - windowMs;
  const recent = latencyStore.samples.filter((s) => s.timestamp >= cutoff);

  // Group by route
  const byRoute = {};
  for (const s of recent) {
    if (!byRoute[s.route]) byRoute[s.route] = [];
    byRoute[s.route].push(s.durationMs);
  }

  const routeMetrics = Object.entries(byRoute).map(([route, durations]) => {
    const sorted = durations.slice().sort((a, b) => a - b);
    const total = sorted.reduce((sum, v) => sum + v, 0);
    return {
      route,
      count: sorted.length,
      avg: +(total / sorted.length).toFixed(2),
      min: +sorted[0].toFixed(2),
      max: +sorted[sorted.length - 1].toFixed(2),
      p50: +percentile(sorted, 50).toFixed(2),
      p90: +percentile(sorted, 90).toFixed(2),
      p95: +percentile(sorted, 95).toFixed(2),
      p99: +percentile(sorted, 99).toFixed(2)
    };
  });

  // Overall
  const allDurations = recent.map((s) => s.durationMs).sort((a, b) => a - b);
  const allTotal = allDurations.reduce((sum, v) => sum + v, 0);
  const overall = allDurations.length > 0
    ? {
        count: allDurations.length,
        avg: +(allTotal / allDurations.length).toFixed(2),
        min: +allDurations[0].toFixed(2),
        max: +allDurations[allDurations.length - 1].toFixed(2),
        p50: +percentile(allDurations, 50).toFixed(2),
        p90: +percentile(allDurations, 90).toFixed(2),
        p95: +percentile(allDurations, 95).toFixed(2),
        p99: +percentile(allDurations, 99).toFixed(2)
      }
    : null;

  return { windowMs, sampleCount: recent.length, overall, routes: routeMetrics };
};

// ─── App factory ────────────────────────────────────────────────────────────

export const createApp = ({ io = null } = {}) => {
  const app = express();
  app.set('trust proxy', 1);
  if (io) app.set('io', io);

  // Live status dashboard — mount FIRST so it captures all traffic.
  // Visit http://localhost:5000/status 
  app.use(statusMonitor({
    title: 'Connect.dev Status',
    path: '/status',
    spans: [
      { interval: 1, retention: 60 },    // every 1s, keep 60 data points (1 min)
      { interval: 5, retention: 60 },    // every 5s, keep 60 data points (5 min)
      { interval: 15, retention: 60 },   // every 15s, keep 60 data points (15 min)
      { interval: 60, retention: 60 }    // every 60s, keep 60 data points (1 hr)
    ],
    chartVisibility: {
      cpu: true,
      mem: true,
      load: true,
      heap: true,
      responseTime: true,
      rps: true,
      statusCodes: true
    }
  }));

  // Latency histogram recorder — captures per-route percentiles
  app.use(recordLatency);

  app.use(httpLogger);
  app.use(securityHeaders);
  app.use(cors(corsOptions));
  app.post('/api/bookings/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

  app.use(generalRateLimiter);
  app.use('/api/auth/login', authRateLimiter);
  app.use('/api/auth/signup', authRateLimiter);
  app.use('/api/auth/refresh', authRateLimiter);
  app.use('/api/bookings', paymentRateLimiter);
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(sanitizeRequest);
  app.use(parameterPollutionProtection);

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/rooms', roomRoutes);
  app.use('/api/bookings', bookingRoutes);
  app.use('/api/tickets', ticketRoutes);
  app.use('/api/issues', issueRoutes);
  app.use('/api/activity', activityRoutes);
  app.use('/api/upload', uploadRoutes);

  app.get('/health', (req, res) => {
    res.status(200).json({
      success: true,
      message: 'API is running',
      timestamp: new Date().toISOString()
    });
  });

  app.get('/livez', (req, res) => {
    res.status(200).json({ success: true, status: 'alive' });
  });

  app.get('/readyz', (req, res) => {
    const mongoReady = mongoose.connection.readyState === 1;
    const redisConfigured = Boolean(process.env.REDIS_URL);
    const redisReady = !redisConfigured || isRedisReady();
    const ready = mongoReady && redisReady;

    res.status(ready ? 200 : 503).json({
      success: ready,
      mongo: mongoReady ? 'ready' : 'not_ready',
      redis: redisReady ? 'ready' : 'not_ready'
    });
  });

  // JSON latency metrics endpoint — returns p50/p90/p95/p99 per route
  // Usage: GET /metrics            (last 60 seconds)
  //        GET /metrics?window=300  (last 5 minutes, in seconds)
  app.get('/metrics', (req, res) => {
    const windowSeconds = Number(req.query.window) || 60;
    const metrics = computeMetrics(windowSeconds * 1000);
    res.status(200).json({
      success: true,
      ...metrics,
      generatedAt: new Date().toISOString()
    });
  });

  app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
  });

  app.use(errorHandler);
  return app;
};

export default createApp;
