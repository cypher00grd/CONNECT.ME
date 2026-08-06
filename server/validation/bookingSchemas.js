import { z } from 'zod';
import { objectIdSchema } from './commonSchemas.js';

export const createCheckoutSessionSchema = z.object({
  roomId: objectIdSchema
}).strict();
