import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import { io as createSocketClient } from 'socket.io-client';
import User from '../../models/User.js';
import { createHttpServer } from '../../server.js';
import { initializeSocket } from '../../socket/index.js';
import { shutdownRedis } from '../../services/redisService.js';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  resetTestDatabase
} from '../helpers/database.js';

let runtime;
let baseUrl;
let user;

beforeAll(async () => {
  await connectTestDatabase();
  await resetTestDatabase();
  user = await User.create({
    username: 'socket_dev',
    email: 'socket@example.test',
    password: 'ConnectTest!1',
    displayName: 'Socket Developer',
    skills: ['react'],
    isInstructor: true
  });

  runtime = createHttpServer();
  await initializeSocket(runtime.io);
  await new Promise((resolve) => runtime.server.listen(0, '127.0.0.1', resolve));
  const address = runtime.server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  if (runtime?.io) await new Promise((resolve) => runtime.io.close(resolve));
  await shutdownRedis();
  await resetTestDatabase();
  await disconnectTestDatabase();
});

describe('Socket.IO authentication and personal rooms', () => {
  it('rejects unauthenticated sockets', async () => {
    const client = createSocketClient(baseUrl, { transports: ['websocket'], reconnection: false });
    const message = await new Promise((resolve) => {
      client.on('connect_error', (error) => resolve(error.message));
    });
    client.close();
    expect(message).toMatch(/authentication|required|token/i);
  });

  it('connects an authenticated user exactly once', async () => {
    const token = jwt.sign({ id: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '5m' });
    const client = createSocketClient(baseUrl, {
      transports: ['websocket'],
      reconnection: false,
      auth: { token }
    });

    await new Promise((resolve, reject) => {
      client.on('connect', resolve);
      client.on('connect_error', reject);
    });

    expect(runtime.io.sockets.sockets.size).toBe(1);
    expect(runtime.io.sockets.adapter.rooms.has(user._id.toString())).toBe(true);
    client.close();
  });
});
