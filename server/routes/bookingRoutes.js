import express from 'express';
import {
    createCheckoutSession,
    stripeWebhook
} from '../controllers/bookingController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Stripe Checkout requires authentication
router.post('/create-checkout-session', protect, createCheckoutSession);

// Webhook endpoint (authentication bypassed, verified via Stripe Signature instead)
router.post('/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

export default router;
