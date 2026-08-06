import { z } from 'zod';

export const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

export const idParamSchema = z.object({
  id: objectIdSchema
}).strict();

export const requestIdParamSchema = z.object({
  id: objectIdSchema,
  requestId: objectIdSchema
}).strict();

export const tagSchema = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .regex(/^[a-zA-Z0-9+#.\-\s]+$/, 'Tag contains unsupported characters');

export const screenshotSchema = z.object({
  url: z.string().trim().url().max(1000),
  name: z.string().trim().max(120).optional().default(''),
  size: z.coerce.number().int().min(0).max(5 * 1024 * 1024).optional().default(0)
}).strict();

export const optionalMoneySchema = z.preprocess(
  (value) => (value === '' || value === null || value === undefined ? 0 : value),
  z.coerce.number().min(0).max(100000)
);

export const booleanLikeSchema = z.union([
  z.boolean(),
  z.enum(['true', 'false']).transform((value) => value === 'true')
]);
