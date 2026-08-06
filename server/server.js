import 'dotenv/config';
import http from 'http';
import { fileURLToPath } from 'url';
import { resolve } from 'path';
import { Server } from 'socket.io';

import connectDB from './config/db.js';
import { createApp } from './app.js';
import { corsOptions } from './middleware/security.js';
import { initializeSocket } from './socket/index.js';
import { startRoomCleanupJob } from './utils/roomCleanup.js';

export const createHttpServer = () => {
  const app = createApp();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: corsOptions,
    maxHttpBufferSize: Number(process.env.SOCKET_MAX_BUFFER_SIZE || 1_000_000)
  });

  app.set('io', io);
  return { app, server, io };
};

export const startServer = async ({ port = process.env.PORT || 5000 } = {}) => {
  await connectDB();
  const runtime = createHttpServer();
  await initializeSocket(runtime.io);
  const cleanupTask = startRoomCleanupJob(runtime.io);

  await new Promise((resolveListen, rejectListen) => {
    runtime.server.once('error', rejectListen);
    runtime.server.listen(port, () => {
      runtime.server.off('error', rejectListen);
      resolveListen();
    });
  });

  console.log(`🚀 Server running on port ${port}`);
  console.log('📡 Socket.io ready');
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  return { ...runtime, cleanupTask };
};

const entryPath = process.argv[1] ? resolve(process.argv[1]) : '';
const isMainModule = entryPath === fileURLToPath(import.meta.url);

if (isMainModule) {
  startServer().catch((error) => {
    console.error('Failed to start server:', error);
    process.exitCode = 1;
  });
}
