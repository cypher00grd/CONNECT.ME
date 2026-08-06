import crypto from 'crypto';
import {
  buildRedisKey,
  bumpDomainCacheVersion,
  getCachedJson,
  getDomainCacheVersion,
  isRedisCacheEnabled,
  setCachedJson
} from '../services/redisService.js';

export const normalizeQuery = (query = {}) => Object.fromEntries(
  Object.entries(query)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => [key, Array.isArray(value) ? [...value].sort() : String(value)])
);

export const buildResponseCacheKey = ({ domain, version, userId, path, query }) => {
  const fingerprint = crypto
    .createHash('sha256')
    .update(JSON.stringify({ path, query: normalizeQuery(query) }))
    .digest('hex')
    .slice(0, 24);
  return buildRedisKey('cache', domain, `v${version}`, userId, fingerprint);
};

const exposeCacheStatus = (res, value) => {
  if (process.env.EXPOSE_CACHE_HEADERS === 'true') {
    res.setHeader('X-Cache-Status', value);
  }
};

export const cacheAuthenticatedResponse = ({ domain, ttlSeconds }) => async (req, res, next) => {
  if (!isRedisCacheEnabled()) {
    exposeCacheStatus(res, 'BYPASS');
    return next();
  }

  try {
    const version = await getDomainCacheVersion(domain);
    const key = buildResponseCacheKey({
      domain,
      version,
      userId: req.user?._id?.toString?.() || 'anonymous',
      path: req.baseUrl + req.path,
      query: req.query
    });
    const cached = await getCachedJson(key);

    if (cached !== null) {
      exposeCacheStatus(res, 'HIT');
      return res.status(200).json(cached);
    }

    exposeCacheStatus(res, 'MISS');
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      res.json = originalJson;
      if (res.statusCode < 200 || res.statusCode >= 300) return originalJson(body);
      return setCachedJson(key, body, ttlSeconds).then(() => originalJson(body));
    };
    return next();
  } catch (error) {
    console.error(`Cache read failed for ${domain}:`, error.message);
    exposeCacheStatus(res, 'BYPASS');
    return next();
  }
};

export const invalidateCacheDomains = (...domains) => (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    res.json = originalJson;
    if (res.statusCode < 200 || res.statusCode >= 300 || !isRedisCacheEnabled()) {
      return originalJson(body);
    }

    return Promise.all(domains.map(bumpDomainCacheVersion))
      .catch((error) => console.error('Cache invalidation failed:', error.message))
      .then(() => originalJson(body));
  };
  next();
};
