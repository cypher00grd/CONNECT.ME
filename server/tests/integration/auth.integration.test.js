import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { initializeRedis, shutdownRedis } from '../../services/redisService.js';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  resetTestDatabase
} from '../helpers/database.js';

const app = createApp();

beforeAll(async () => {
  await connectTestDatabase();
  await resetTestDatabase();
  await initializeRedis();
});

afterAll(async () => {
  await resetTestDatabase();
  await shutdownRedis();
  await disconnectTestDatabase();
});

describe('API integration', () => {
  it('reports liveness and dependency readiness', async () => {
    const live = await request(app).get('/livez');
    expect(live.status).toBe(200);
    expect(live.body).toEqual({ success: true, status: 'alive' });

    const ready = await request(app).get('/readyz');
    expect(ready.status).toBe(200);
    expect(ready.body).toMatchObject({ success: true, mongo: 'ready', redis: 'ready' });
  });

  it('creates a developer account and returns an access token', async () => {
    const response = await request(app)
      .post('/api/auth/signup')
      .send({
        username: 'integration_dev',
        email: 'integration@example.test',
        password: 'ConnectTest!1',
        displayName: 'Integration Developer',
        skills: ['react'],
        specialization: 'frontend'
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toEqual(expect.any(String));
    expect(response.body.data.email).toBe('integration@example.test');
    expect(response.headers['set-cookie']?.join(';')).toContain('connect_test_refresh=');
  });

  it('rejects malformed signup data and unknown routes', async () => {
    const invalid = await request(app).post('/api/auth/signup').send({ email: 'not-an-email' });
    expect(invalid.status).toBe(400);
    expect(invalid.body.success).toBe(false);

    const missing = await request(app).get('/api/not-a-route');
    expect(missing.status).toBe(404);
  });
});
