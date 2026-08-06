import express from 'express';
import {
  createRoom,
  getFeedRooms,
  getMyRooms,
  getRoom,
  joinRoom,
  leaveRoom,
  destroyRoom,
  getRoomMessages,
  scheduleRoom,
  startEvent,
  getUserScheduledRooms
} from '../controllers/roomController.js';
import { protect } from '../middleware/auth.js';
import { cacheAuthenticatedResponse, invalidateCacheDomains } from '../middleware/cache.js';

const router = express.Router();

// All routes are protected
router.use(protect);

router.post('/', invalidateCacheDomains('rooms'), createRoom);
router.post('/schedule', invalidateCacheDomains('rooms'), scheduleRoom);
router.get('/feed', cacheAuthenticatedResponse({ domain: 'rooms', ttlSeconds: 15 }), getFeedRooms);
router.get('/my-rooms', getMyRooms);
router.get('/user/:userId/scheduled', getUserScheduledRooms);
router.get('/:id', getRoom);
router.get('/:id/messages', getRoomMessages);
router.post('/:id/join', invalidateCacheDomains('rooms'), joinRoom);
router.post('/:id/leave', invalidateCacheDomains('rooms'), leaveRoom);
router.post('/:id/start-event', invalidateCacheDomains('rooms'), startEvent);
router.delete('/:id', invalidateCacheDomains('rooms'), destroyRoom);

export default router;
