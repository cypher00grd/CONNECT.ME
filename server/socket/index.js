import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { setupHandlers } from './handlers.js';

export const initializeSocket = (io) => {
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

  // Handle connections
  io.on('connection', (socket) => {
    setupHandlers(socket, io);
  });

  console.log('🔌 Socket.io initialized');
};