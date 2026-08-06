import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { setupHandlers } from './handlers.js';
import { createAdapter } from '@socket.io/redis-adapter';
import { getRedisClients, initializeRedis } from '../services/redisService.js';
import { createSocketEventRateLimiter } from '../middleware/security.js';

export const initializeSocket = async (io) => {
  await initializeRedis();
  const { pubClient, subClient } = getRedisClients();

  if (pubClient && subClient) {
    io.adapter(createAdapter(pubClient, subClient));
    console.log('Socket.io Redis adapter enabled');
  }

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();
    } catch (error) {
      console.error('Socket auth error:', error.message);
      next(new Error('Invalid token'));
    }
  });

  const socketEventAllowed = createSocketEventRateLimiter({
    windowMs: Number(process.env.SOCKET_RATE_WINDOW_MS || 10_000),
    limit: Number(process.env.SOCKET_RATE_LIMIT || 80)
  });

  // Handle connections
  io.on('connection', (socket) => {
    socket.use(([eventName], next) => {
      if (!socketEventAllowed(socket, eventName)) {
        return next(new Error('Too many socket events. Please slow down.'));
      }

      next();
    });

    setupHandlers(socket, io);
  });

  console.log('🔌 Socket.io initialized');
};
