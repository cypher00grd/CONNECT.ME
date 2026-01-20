import express from 'express';
import {
  createRoom,
  getFeedRooms,
  getMyRooms,
  getRoom,
  joinRoom,
  leaveRoom,
  destroyRoom,
  getRoomMessages
} from '../controllers/roomController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes are protected
router.use(protect);

router.post('/', createRoom);
router.get('/feed', getFeedRooms);
router.get('/my-rooms', getMyRooms);
router.get('/:id', getRoom);
router.get('/:id/messages', getRoomMessages);
router.post('/:id/join', joinRoom);
router.post('/:id/leave', leaveRoom);
router.delete('/:id', destroyRoom);

export default router;