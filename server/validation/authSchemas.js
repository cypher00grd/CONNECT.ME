import { z } from 'zod';

const skillSchema = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .regex(/^[a-zA-Z0-9+#.\-\s]+$/, 'Skill contains unsupported characters');

const techItemSchema = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .regex(/^[a-zA-Z0-9+#.\-\s]+$/, 'Tech stack item contains unsupported characters');

const techStackSchema = z.object({
  languages: z.array(techItemSchema).max(8).optional(),
  frameworks: z.array(techItemSchema).max(8).optional(),
  tools: z.array(techItemSchema).max(8).optional()
}).strict();

const experienceLevelSchema = z.enum(['student', 'junior', 'mid', 'senior', 'staff', 'principal', 'lead']);
const specializationSchema = z.enum(['frontend', 'backend', 'fullstack', 'devops', 'mobile', 'data_ml', 'system_design', 'security', 'dsa', 'other']);
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
const githubUsernameSchema = z
  .string()
  .trim()
  .max(39)
  .regex(/^[a-zA-Z0-9-]*$/, 'GitHub username can only contain letters, numbers, and hyphens');

const developerPreferencesSchema = z.object({
  preferredSessionTypes: z.array(sessionTypeSchema).max(8).optional(),
  notificationTechTags: z.array(techItemSchema).max(12).optional(),
  availabilityTimezone: z.string().trim().min(1).max(80).optional(),
  availabilityNote: z.string().trim().max(240).optional(),
  hourlyRate: z.coerce.number().min(0).max(100000).optional()
}).strict();

export const signupSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(20)
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers and underscores'),
  email: z.string().trim().email().max(254),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password cannot exceed 128 characters'),
  displayName: z.string().trim().min(1).max(50),
  isInstructor: z.boolean().optional(),
  skills: z.array(skillSchema).max(5).optional(),
  githubUsername: githubUsernameSchema.optional(),
  githubUrl: z.string().trim().url().max(500).or(z.literal('')).optional(),
  techStack: techStackSchema.optional(),
  experienceLevel: experienceLevelSchema.optional(),
  yearsOfExperience: z.coerce.number().int().min(0).max(50).optional(),
  specialization: specializationSchema.optional(),
  openToMentor: z.boolean().optional(),
  lookingForHelp: z.boolean().optional(),
  developerPreferences: developerPreferencesSchema.optional()
}).strict();

export const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128)
}).strict();

export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(50).optional(),
  bio: z.string().trim().max(500).optional(),
  avatar: z.string().trim().url().max(500).or(z.literal('')).optional(),
  isInstructor: z.boolean().optional(),
  skills: z.array(skillSchema).max(5).optional(),
  githubUsername: githubUsernameSchema.optional(),
  githubUrl: z.string().trim().url().max(500).or(z.literal('')).optional(),
  techStack: techStackSchema.optional(),
  experienceLevel: experienceLevelSchema.optional(),
  yearsOfExperience: z.coerce.number().int().min(0).max(50).optional(),
  specialization: specializationSchema.optional(),
  openToMentor: z.boolean().optional(),
  lookingForHelp: z.boolean().optional(),
  developerPreferences: developerPreferencesSchema.optional()
}).strict();
