import { describe, expect, it } from 'vitest';
import { buildResponseCacheKey, normalizeQuery } from '../../middleware/cache.js';

describe('response cache identity', () => {
  it('normalizes query keys and array values', () => {
    expect(normalizeQuery({ z: 'last', tags: ['react', 'node'], a: 1 })).toEqual({
      a: '1',
      tags: ['node', 'react'],
      z: 'last'
    });
  });

  it('returns the same key for equivalent query ordering', () => {
    const base = { domain: 'suggestions', version: '4', userId: 'user-1', path: '/api/users/suggestions' };
    const left = buildResponseCacheKey({ ...base, query: { tech: 'react', level: 'mid' } });
    const right = buildResponseCacheKey({ ...base, query: { level: 'mid', tech: 'react' } });
    expect(left).toBe(right);
  });

  it('separates users and cache versions', () => {
    const base = { domain: 'rooms', path: '/api/rooms/feed', query: {} };
    expect(buildResponseCacheKey({ ...base, version: '1', userId: 'one' }))
      .not.toBe(buildResponseCacheKey({ ...base, version: '1', userId: 'two' }));
    expect(buildResponseCacheKey({ ...base, version: '1', userId: 'one' }))
      .not.toBe(buildResponseCacheKey({ ...base, version: '2', userId: 'one' }));
  });
});
