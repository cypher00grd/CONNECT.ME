import { loadTestEnvironment } from './load-test-env.mjs';
import { assertSafeTestEnvironment } from './test-db-guard.mjs';

loadTestEnvironment();
assertSafeTestEnvironment();

const { startServer } = await import('../server.js');
await startServer({ port: Number(process.env.PORT || 5001) });
