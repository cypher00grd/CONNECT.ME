const LOCAL_TEST_HOSTS = new Set(['localhost', '127.0.0.1', '::1', 'mongo-test']);

export const inspectTestDatabaseTarget = (uri = process.env.MONGODB_URI) => {
  if (!uri) {
    throw new Error('MONGODB_URI is required for test database operations');
  }

  let parsed;
  try {
    parsed = new URL(uri);
  } catch {
    throw new Error('MONGODB_URI is not a valid MongoDB URL');
  }

  const database = parsed.pathname.replace(/^\//, '').split('/')[0];
  const host = parsed.hostname;

  if (!LOCAL_TEST_HOSTS.has(host)) {
    throw new Error(`Refusing test database operation on remote host: ${host}`);
  }

  if (!database.endsWith('_test')) {
    throw new Error(`Refusing test database operation on database without _test suffix: ${database || '(missing)'}`);
  }

  return { host, database };
};

export const assertSafeTestEnvironment = (uri = process.env.MONGODB_URI) => {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error(`Refusing test database operation when NODE_ENV=${process.env.NODE_ENV || '(unset)'}`);
  }

  return inspectTestDatabaseTarget(uri);
};
