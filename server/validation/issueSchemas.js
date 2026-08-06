import { z } from 'zod';
import { optionalMoneySchema, screenshotSchema, tagSchema } from './commonSchemas.js';

const sessionTypeSchema = z.enum([
  'debugging',
  'code_review',
  'pair_programming',
  'architecture_review',
  'mentoring',
  'mock_interview',
  'deployment_help',
  'other'
]);

const difficultySchema = z.enum(['beginner', 'intermediate', 'advanced']);

const optionalUrlSchema = z
  .string()
  .trim()
  .max(500)
  .refine((value) => {
    if (!value) return true;
    try {
      const parsed = new URL(value);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }, 'Must be a valid http or https URL');

export const createIssueSchema = z.object({
  title: z.string().trim().min(1).max(120),
  details: z.string().trim().min(1).max(5000),
  tags: z.array(tagSchema).min(1).max(5),
  screenshots: z.array(screenshotSchema).max(5).optional().default([]),
  sessionType: sessionTypeSchema.optional().default('debugging'),
  techStack: z.array(tagSchema).max(8).optional().default([]),
  difficulty: difficultySchema.optional().default('intermediate'),
  repoUrl: optionalUrlSchema.optional().default(''),
  errorContext: z.string().trim().max(3000).optional().default(''),
  bountyAmount: optionalMoneySchema.optional().default(0)
}).strict();

export const createIssueRequestSchema = z.object({
  message: z.string().trim().max(800).optional().default('')
}).strict();
