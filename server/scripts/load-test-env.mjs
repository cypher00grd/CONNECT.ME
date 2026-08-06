import dotenv from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';

export const loadTestEnvironment = () => {
  const examplePath = resolve(process.cwd(), '.env.test.example');
  const localPath = resolve(process.cwd(), '.env.test.local');

  dotenv.config({ path: examplePath, override: false, quiet: true });
  if (existsSync(localPath)) {
    dotenv.config({ path: localPath, override: true, quiet: true });
  }

  process.env.NODE_ENV = 'test';
  return process.env;
};
