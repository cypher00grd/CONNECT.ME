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

const router = express.Router();

// All routes are protected
router.use(protect);

router.post('/', createRoom);
router.post('/schedule', scheduleRoom);
router.get('/feed', getFeedRooms);
router.get('/my-rooms', getMyRooms);
router.get('/user/:userId/scheduled', getUserScheduledRooms);
router.get('/:id', getRoom);
router.get('/:id/messages', getRoomMessages);
router.post('/:id/join', joinRoom);
router.post('/:id/leave', leaveRoom);
router.post('/:id/start-event', startEvent);
router.delete('/:id', destroyRoom);

export default router;