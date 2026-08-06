import { describe, expect, it } from 'vitest';
import { signupSchema, updateProfileSchema } from '../../validation/authSchemas.js';
import { inferCategoryFromTags, normalizeCategory } from '../../utils/categories.js';
import { createCheckoutSessionSchema } from '../../validation/bookingSchemas.js';
import {
  booleanLikeSchema,
  idParamSchema,
  optionalMoneySchema,
  requestIdParamSchema,
  screenshotSchema,
  tagSchema
} from '../../validation/commonSchemas.js';
import { createIssueRequestSchema, createIssueSchema } from '../../validation/issueSchemas.js';
import { createTicketSchema, reviewTicketSchema } from '../../validation/ticketSchemas.js';

describe('developer profile validation', () => {
  it('accepts a valid developer signup', () => {
    expect(signupSchema.safeParse({
      username: 'test_dev',
      email: 'test@example.test',
      password: 'ConnectTest!1',
      displayName: 'Test Developer',
      skills: ['React'],
      specialization: 'frontend'
    }).success).toBe(true);
  });

  it('rejects unsupported developer filters and excessive skills', () => {
    expect(updateProfileSchema.safeParse({
      specialization: 'unknown',
      skills: ['1', '2', '3', '4', '5', '6']
    }).success).toBe(false);
  });
});

describe('technology categories', () => {
  it('maps legacy categories to other', () => {
    expect(normalizeCategory('gaming')).toBe('other');
  });

  it('infers categories from technology tags', () => {
    expect(inferCategoryFromTags(['react', 'css'])).toBe('frontend');
    expect(inferCategoryFromTags(['docker'])).toBe('devops');
  });

  it('uses other for empty or unknown category values', () => {
    expect(normalizeCategory()).toBe('other');
    expect(inferCategoryFromTags(['unknown-tech'])).toBe('other');
  });
});

describe('API payload schemas', () => {
  const objectId = '507f1f77bcf86cd799439011';

  it('validates identifiers and checkout requests', () => {
    expect(idParamSchema.parse({ id: objectId })).toEqual({ id: objectId });
    expect(requestIdParamSchema.safeParse({ id: objectId, requestId: 'invalid' }).success).toBe(false);
    expect(createCheckoutSessionSchema.safeParse({ roomId: objectId }).success).toBe(true);
  });

  it('normalizes common money, boolean, tag, and screenshot inputs', () => {
    expect(optionalMoneySchema.parse('')).toBe(0);
    expect(optionalMoneySchema.parse('199')).toBe(199);
    expect(booleanLikeSchema.parse('true')).toBe(true);
    expect(booleanLikeSchema.parse('false')).toBe(false);
    expect(tagSchema.safeParse('react.js').success).toBe(true);
    expect(tagSchema.safeParse('<script>').success).toBe(false);
    expect(screenshotSchema.parse({ url: 'https://example.test/image.png', size: '42' }).size).toBe(42);
  });

  it('validates issues and applies defaults', () => {
    const issue = createIssueSchema.parse({ title: 'Bug', details: 'Details', tags: ['react'] });
    expect(issue).toMatchObject({ bountyAmount: 0, screenshots: [], difficulty: 'intermediate' });
    expect(createIssueSchema.safeParse({ title: 'Bug', details: 'Details', tags: [], repoUrl: 'file:///tmp' }).success).toBe(false);
    expect(createIssueRequestSchema.parse({})).toEqual({ message: '' });
  });

  it('validates tickets, durations, reviews, and boolean-like values', () => {
    const ticket = createTicketSchema.parse({
      title: 'Need help',
      description: 'Debug this issue',
      tags: ['node'],
      estimatedMinutes: '60',
      targetHelper: objectId
    });
    expect(ticket.estimatedMinutes).toBe(60);
    expect(createTicketSchema.safeParse({
      title: 'Need help', description: 'Debug this issue', tags: ['node'], estimatedMinutes: 45
    }).success).toBe(false);

    expect(reviewTicketSchema.parse({ stars: '5', issueFixed: 'true' })).toMatchObject({
      stars: 5,
      issueFixed: true,
      conceptUnderstood: false
    });
    expect(reviewTicketSchema.safeParse({ stars: 6 }).success).toBe(false);
  });
});
