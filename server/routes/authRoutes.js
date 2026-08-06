import express from 'express';
import { signup, login, getMe, updateProfile, refreshSession, logout } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { loginSchema, signupSchema, updateProfileSchema } from '../validation/authSchemas.js';
import { invalidateCacheDomains } from '../middleware/cache.js';

const router = express.Router();

// Public routes
router.post('/signup', validate({ body: signupSchema }), signup);
router.post('/login', validate({ body: loginSchema }), login);
router.post('/refresh', refreshSession);
router.post('/logout', logout);

// Protected routes
router.get('/me', protect, getMe);
router.put('/profile', protect, validate({ body: updateProfileSchema }), invalidateCacheDomains('suggestions'), updateProfile);

export default router;
