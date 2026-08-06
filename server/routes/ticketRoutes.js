import express from 'express';
import {
  approveHelper,
  cancelMyTicket,
  createTicket,
  getMyTickets,
  getTicket,
  getTicketFeed,
  lockTicket,
  rejectHelper,
  refreshTicketPayment,
  reviewTicket,
  resolveMyTicket
} from '../controllers/ticketController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParamSchema } from '../validation/commonSchemas.js';
import { createTicketSchema, reviewTicketSchema } from '../validation/ticketSchemas.js';
import { paymentRateLimiter } from '../middleware/security.js';

const router = express.Router();

router.use(protect);

router.post('/', validate({ body: createTicketSchema }), createTicket);
router.get('/feed', getTicketFeed);
router.get('/my', getMyTickets);
router.get('/:id', validate({ params: idParamSchema }), getTicket);
router.post('/:id/lock', validate({ params: idParamSchema }), lockTicket);
router.post('/:id/approve', validate({ params: idParamSchema }), approveHelper);
router.post('/:id/reject', validate({ params: idParamSchema }), rejectHelper);
router.post('/:id/cancel', validate({ params: idParamSchema }), cancelMyTicket);
router.post('/:id/resolve', validate({ params: idParamSchema }), resolveMyTicket);
router.post('/:id/refresh-payment', paymentRateLimiter, validate({ params: idParamSchema }), refreshTicketPayment);
router.post('/:id/review', validate({ params: idParamSchema, body: reviewTicketSchema }), reviewTicket);

export default router;
