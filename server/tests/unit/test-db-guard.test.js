import { afterEach, describe, expect, it } from 'vitest';
import { assertSafeTestEnvironment, inspectTestDatabaseTarget } from '../../scripts/test-db-guard.mjs';

const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv;
});

describe('test database guard', () => {
  it('accepts the local Docker test database', () => {
    expect(inspectTestDatabaseTarget(
      'mongodb://user:password@127.0.0.1:27018/connect_test?authSource=admin'
    )).toEqual({ host: '127.0.0.1', database: 'connect_test' });
  });

  it('rejects remote MongoDB hosts', () => {
    expect(() => inspectTestDatabaseTarget(
      'mongodb+srv://user:password@example.mongodb.net/connect_test'
    )).toThrow(/remote host/i);
  });

  it('rejects databases without the _test suffix', () => {
    expect(() => inspectTestDatabaseTarget(
      'mongodb://127.0.0.1:27017/connect'
    )).toThrow(/_test suffix/i);
  });

  it('rejects destructive commands outside NODE_ENV=test', () => {
    process.env.NODE_ENV = 'development';
    expect(() => assertSafeTestEnvironment(
      'mongodb://127.0.0.1:27017/connect_test'
    )).toThrow(/NODE_ENV/i);
  });
});
