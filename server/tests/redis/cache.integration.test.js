import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  buildRedisKey,
  bumpDomainCacheVersion,
  getCachedJson,
  getDomainCacheVersion,
  getHelpersBusyCached,
  initializeRedis,
  isRedisReady,
  markUserOnline,
  runRedis,
  setCachedJson,
  setHelperBusy,
  shutdownRedis
} from '../../services/redisService.js';

const testKey = buildRedisKey('integration', 'json');

beforeAll(async () => {
  await initializeRedis();
  if (!isRedisReady()) throw new Error('Redis test service is not available');
  await runRedis((client) => client.del(testKey));
});

afterAll(async () => {
  await runRedis((client) => client.del(testKey));
  await shutdownRedis();
});

describe('Redis integration', () => {
  it('round-trips cached JSON and removes corrupt values', async () => {
    await setCachedJson(testKey, { success: true, data: ['one'] }, 30);
    await expect(getCachedJson(testKey)).resolves.toEqual({ success: true, data: ['one'] });

    await runRedis((client) => client.set(testKey, '{invalid-json'));
    await expect(getCachedJson(testKey)).resolves.toBeNull();
    await expect(runRedis((client) => client.exists(testKey))).resolves.toBe(0);
  });

  it('increments domain versions for constant-time invalidation', async () => {
    const before = Number(await getDomainCacheVersion('integration-domain'));
    await bumpDomainCacheVersion('integration-domain');
    const after = Number(await getDomainCacheVersion('integration-domain'));
    expect(after).toBe(before + 1);
  });

  it('batches helper busy lookups', async () => {
    await setHelperBusy('helper-one', 'ticket-one', 30);
    const busy = await getHelpersBusyCached(['helper-one', 'helper-two']);
    expect(busy.get('helper-one')).toBe(true);
    expect(busy.get('helper-two')).toBe(false);
  });

  it('stores presence under the configured prefix', async () => {
    await markUserOnline('presence-user', 'socket-one', 30);
    const count = await runRedis((client) => client.sCard(buildRedisKey('online', 'user', 'presence-user', 'sockets')));
    expect(count).toBe(1);
  });
});
