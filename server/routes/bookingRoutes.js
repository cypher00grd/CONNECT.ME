import express from 'express';
import {
    createCheckoutSession
} from '../controllers/bookingController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createCheckoutSessionSchema } from '../validation/bookingSchemas.js';

const router = express.Router();

// Stripe Checkout requires authentication
router.post('/create-checkout-session', protect, validate({ body: createCheckoutSessionSchema }), createCheckoutSession);

export default router;
