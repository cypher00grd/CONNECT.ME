import mongoose from 'mongoose';
import { assertSafeTestEnvironment } from '../../scripts/test-db-guard.mjs';

export const connectTestDatabase = async () => {
  assertSafeTestEnvironment();
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  }
  return mongoose.connection;
};

export const resetTestDatabase = async () => {
  assertSafeTestEnvironment();
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
  }
};

export const disconnectTestDatabase = async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
};
