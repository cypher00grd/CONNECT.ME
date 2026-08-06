import { createClient } from 'redis';

let pubClient = null;
let subClient = null;
let redisReady = false;

const getRedisUrl = () => process.env.REDIS_URL || '';
const getRedisKeyPrefix = () => process.env.REDIS_KEY_PREFIX || 'connect';

export const buildRedisKey = (...parts) => [getRedisKeyPrefix(), ...parts]
  .map((part) => String(part).replace(/:+/g, ':'))
  .join(':');

export const isRedisCacheEnabled = () => (
  process.env.REDIS_CACHE_ENABLED === 'true' && isRedisReady()
);

export const initializeRedis = async () => {
  const url = getRedisUrl();

  if (!url) {
    console.log('Redis not configured; using Mongo/in-memory realtime fallback');
    return { pubClient: null, subClient: null };
  }

  if (isRedisReady() && subClient?.isOpen) {
    return { pubClient, subClient };
  }

  try {
    pubClient = createClient({ url });
    subClient = pubClient.duplicate();

    pubClient.on('error', (error) => {
      redisReady = false;
      console.error('Redis pub error:', error.message);
    });

    subClient.on('error', (error) => {
      redisReady = false;
      console.error('Redis sub error:', error.message);
    });

    await Promise.all([pubClient.connect(), subClient.connect()]);
    redisReady = true;
    console.log('Redis connected for Socket.io and ticket cache');

    return { pubClient, subClient };
  } catch (error) {
    redisReady = false;
    console.error('Redis disabled after connection failure:', error.message);
    return { pubClient: null, subClient: null };
  }
};

export const getRedisClients = () => ({ pubClient, subClient });

export const isRedisReady = () => redisReady && pubClient?.isOpen;

export const runRedis = async (operation, fallback = null) => {
  if (!isRedisReady()) return fallback;

  try {
    return await operation(pubClient);
  } catch (error) {
    console.error('Redis operation failed:', error.message);
    return fallback;
  }
};

export const shutdownRedis = async () => {
  const clients = [subClient, pubClient].filter((client) => client?.isOpen);
  await Promise.allSettled(clients.map((client) => client.quit()));
  pubClient = null;
  subClient = null;
  redisReady = false;
};

export const getCachedJson = async (key) => runRedis(async (client) => {
  const value = await client.get(key);
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    await client.del(key);
    return null;
  }
}, null);

export const setCachedJson = async (key, value, ttlSeconds) => runRedis(
  (client) => client.set(key, JSON.stringify(value), { EX: ttlSeconds }),
  null
);

export const getDomainCacheVersion = async (domain) => runRedis(async (client) => {
  const key = buildRedisKey('cache', 'version', domain);
  const current = await client.get(key);
  if (current) return current;
  await client.set(key, '1', { NX: true });
  return (await client.get(key)) || '1';
}, '1');

export const bumpDomainCacheVersion = async (domain) => runRedis(
  (client) => client.incr(buildRedisKey('cache', 'version', domain)),
  null
);

export const markUserOnline = async (userId, socketId, ttlSeconds = 120) => {
  const key = buildRedisKey('online', 'user', userId, 'sockets');
  await runRedis(async (client) => {
    await client.sAdd(key, socketId);
    await client.expire(key, ttlSeconds);
  });
};

export const markUserOfflineSocket = async (userId, socketId) => {
  const key = buildRedisKey('online', 'user', userId, 'sockets');
  return runRedis(async (client) => {
    await client.sRem(key, socketId);
    return client.sCard(key);
  }, null);
};

export const isUserOnlineCached = async (userId) => {
  const key = buildRedisKey('online', 'user', userId, 'sockets');
  return runRedis(async (client) => (await client.sCard(key)) > 0, null);
};

export const setHelperBusy = async (helperId, ticketId, ttlSeconds = 7200) => {
  await runRedis(async (client) => {
    await client.set(buildRedisKey('helper', 'busy', helperId), String(ticketId), { EX: ttlSeconds });
  });
};

export const clearHelperBusy = async (helperId) => {
  await runRedis(async (client) => client.del(buildRedisKey('helper', 'busy', helperId)));
};

export const isHelperBusyCached = async (helperId) => {
  return runRedis(async (client) => client.exists(buildRedisKey('helper', 'busy', helperId)), null);
};

export const getHelpersBusyCached = async (helperIds) => runRedis(async (client) => {
  const ids = helperIds.map(String);
  if (ids.length === 0) return new Map();
  const values = await client.mGet(ids.map((id) => buildRedisKey('helper', 'busy', id)));
  return new Map(ids.map((id, index) => [id, Boolean(values[index])]));
}, null);

export const addDirectPendingTicket = async (helperId, ticketId) => {
  await runRedis(async (client) => client.sAdd(buildRedisKey('direct', 'pending', helperId), String(ticketId)));
};

export const removeDirectPendingTicket = async (helperId, ticketId) => {
  await runRedis(async (client) => client.sRem(buildRedisKey('direct', 'pending', helperId), String(ticketId)));
};

export const addHelperSkillCache = async (user) => {
  const skills = user?.skills || [];
  if (!user?._id || !user?.isInstructor || skills.length === 0) return;

  await runRedis(async (client) => {
    const score = Number(user.rating || 5) * 1000 + Number(user.reputationPoints || 0);
    await Promise.all(
      skills.map((skill) => client.zAdd(buildRedisKey('skill', skill, 'helpers'), [{ score, value: String(user._id) }]))
    );
  });
};
