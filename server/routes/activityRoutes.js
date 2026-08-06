import express from 'express';
import { getMyActivity } from '../controllers/activityController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/me', getMyActivity);

export default router;
