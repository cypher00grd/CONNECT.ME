import { beforeEach, describe, expect, it, vi } from 'vitest';

const redisMocks = vi.hoisted(() => ({
  buildRedisKey: vi.fn((...parts) => parts.join(':')),
  bumpDomainCacheVersion: vi.fn(async () => 2),
  getCachedJson: vi.fn(),
  getDomainCacheVersion: vi.fn(async () => '1'),
  isRedisCacheEnabled: vi.fn(() => true),
  setCachedJson: vi.fn(async () => 'OK')
}));

vi.mock('../../services/redisService.js', () => redisMocks);

import { cacheAuthenticatedResponse, invalidateCacheDomains } from '../../middleware/cache.js';

const createResponse = () => {
  const response = {
    statusCode: 200,
    headers: {},
    body: undefined,
    setHeader: vi.fn((key, value) => { response.headers[key] = value; }),
    status: vi.fn((code) => { response.statusCode = code; return response; }),
    json: vi.fn((body) => { response.body = body; return response; })
  };
  return response;
};

const request = {
  user: { _id: { toString: () => 'user-one' } },
  baseUrl: '/api/users',
  path: '/suggestions',
  query: { tech: 'react' }
};

beforeEach(() => {
  vi.clearAllMocks();
  redisMocks.isRedisCacheEnabled.mockReturnValue(true);
  redisMocks.getDomainCacheVersion.mockResolvedValue('1');
});

describe('cache middleware', () => {
  it('bypasses Redis when caching is disabled', async () => {
    redisMocks.isRedisCacheEnabled.mockReturnValue(false);
    const response = createResponse();
    const next = vi.fn();
    await cacheAuthenticatedResponse({ domain: 'suggestions', ttlSeconds: 30 })(request, response, next);
    expect(next).toHaveBeenCalledOnce();
    expect(response.headers['X-Cache-Status']).toBe('BYPASS');
  });

  it('returns a cache hit without invoking the controller', async () => {
    redisMocks.getCachedJson.mockResolvedValue({ success: true, data: ['cached'] });
    const response = createResponse();
    const next = vi.fn();
    await cacheAuthenticatedResponse({ domain: 'suggestions', ttlSeconds: 30 })(request, response, next);
    expect(next).not.toHaveBeenCalled();
    expect(response.body).toEqual({ success: true, data: ['cached'] });
    expect(response.headers['X-Cache-Status']).toBe('HIT');
  });

  it('stores a successful cache miss before sending it', async () => {
    redisMocks.getCachedJson.mockResolvedValue(null);
    const response = createResponse();
    const next = vi.fn();
    await cacheAuthenticatedResponse({ domain: 'suggestions', ttlSeconds: 30 })(request, response, next);
    expect(next).toHaveBeenCalledOnce();
    await response.json({ success: true, data: ['fresh'] });
    expect(redisMocks.setCachedJson).toHaveBeenCalledWith(
      expect.stringContaining('suggestions'),
      { success: true, data: ['fresh'] },
      30
    );
    expect(response.body).toEqual({ success: true, data: ['fresh'] });
  });

  it('falls back to the controller after a cache error', async () => {
    redisMocks.getDomainCacheVersion.mockRejectedValue(new Error('offline'));
    const response = createResponse();
    const next = vi.fn();
    await cacheAuthenticatedResponse({ domain: 'rooms', ttlSeconds: 15 })(request, response, next);
    expect(next).toHaveBeenCalledOnce();
    expect(response.headers['X-Cache-Status']).toBe('BYPASS');
  });

  it('increments domain versions after successful mutations', async () => {
    const response = createResponse();
    const next = vi.fn();
    invalidateCacheDomains('rooms', 'suggestions')(request, response, next);
    expect(next).toHaveBeenCalledOnce();
    await response.json({ success: true });
    expect(redisMocks.bumpDomainCacheVersion).toHaveBeenCalledTimes(2);
  });

  it('does not invalidate after an error response', () => {
    const response = createResponse();
    response.statusCode = 400;
    invalidateCacheDomains('rooms')(request, response, () => {});
    response.json({ success: false });
    expect(redisMocks.bumpDomainCacheVersion).not.toHaveBeenCalled();
  });
});
