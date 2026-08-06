import helmet from 'helmet';
import hpp from 'hpp';
import mongoSanitize from 'express-mongo-sanitize';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import pino from 'pino';
import pinoHttp from 'pino-http';
import crypto from 'crypto';

const parseOrigins = (...values) => (
  values
    .filter(Boolean)
    .flatMap((value) => String(value).split(','))
    .map((value) => value.trim())
    .filter(Boolean)
);

const isProduction = process.env.NODE_ENV === 'production';
const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '';

export const allowedOrigins = [
  ...new Set([
    ...parseOrigins(process.env.CLIENT_URL, process.env.CLIENT_URLS, vercelUrl),
    'http://localhost:5173',
    'http://127.0.0.1:5173'
  ])
];

export const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Origin is not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
  credentials: true
};

export const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      '*.password',
      '*.token',
      '*.refreshToken',
      '*.stripeSecretKey',
      '*.api_secret'
    ],
    remove: true
  }
});

export const httpLogger = pinoHttp({
  logger,
  genReqId: (req) => req.headers['x-request-id'] || crypto.randomUUID(),
  customProps: (req) => ({
    userId: req.user?._id?.toString?.() || undefined
  })
});

export const securityHeaders = helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: isProduction
    ? {
        useDefaults: true,
        directives: {
          'default-src': ["'self'"],
          'base-uri': ["'self'"],
          'frame-ancestors': ["'none'"],
          'img-src': ["'self'", 'data:', 'https://res.cloudinary.com'],
          'connect-src': ["'self'", ...allowedOrigins],
          'script-src': ["'self'"],
          'style-src': ["'self'", "'unsafe-inline'"]
        }
      }
    : false,
  hsts: isProduction
    ? {
        maxAge: 15552000,
        includeSubDomains: true
      }
    : false
});

const sanitize = mongoSanitize.sanitize;

export const sanitizeRequest = (req, res, next) => {
  if (req.body) {
    req.body = sanitize(req.body, { replaceWith: '_' });
  }

  if (req.params) {
    req.params = sanitize(req.params, { replaceWith: '_' });
  }

  if (req.query) {
    sanitize(req.query, { replaceWith: '_' });
  }

  next();
};

export const parameterPollutionProtection = hpp({
  whitelist: ['tags', 'skills']
});

const buildLimiter = ({ windowMs, limit, message }) => (
  rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message
    }
  })
);

export const generalRateLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_GENERAL || 600),
  message: 'Too many requests.'
});

export const authRateLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_AUTH || 20),
  message: 'Too many authentication attempts. Please try again later.'
});

export const uploadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_UPLOAD || 60),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?._id?.toString?.() || ipKeyGenerator(req.ip),
  message: {
    success: false,
    message: 'Too many uploads. Please try again later.'
  }
});

export const paymentRateLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_PAYMENT || 30),
  message: 'Too many payment attempts. Please try again later.'
});

export const createSocketEventRateLimiter = ({ windowMs = 10_000, limit = 80 } = {}) => {
  return (socket, eventName) => {
    const now = Date.now();
    const key = `${eventName || 'event'}`;

    if (!socket.data.rateLimits) {
      socket.data.rateLimits = new Map();
    }

    const current = socket.data.rateLimits.get(key);
    if (!current || current.resetAt <= now) {
      socket.data.rateLimits.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }

    current.count += 1;
    return current.count <= limit;
  };
};
