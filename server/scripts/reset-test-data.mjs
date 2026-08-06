import mongoose from 'mongoose';
import { loadTestEnvironment } from './load-test-env.mjs';
import { assertSafeTestEnvironment } from './test-db-guard.mjs';

loadTestEnvironment();
const target = assertSafeTestEnvironment();

try {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  await mongoose.connection.dropDatabase();
  console.log(`Reset test database ${target.database} on ${target.host}`);
} finally {
  await mongoose.disconnect();
}
