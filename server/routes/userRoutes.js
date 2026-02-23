import express from 'express';
import {
  searchUsers,
  getUserProfile,
  followUser,
  unfollowUser,
  getNotifications,
  markNotificationsRead,
  getSuggestions,
  notifyFollowers,
} from '../controllers/userController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes are protected
router.use(protect);

router.get('/search', searchUsers);
router.get('/suggestions', getSuggestions);
router.get('/notifications', getNotifications);
router.put('/notifications/read', markNotificationsRead);
router.post('/notify-followers', notifyFollowers);
router.get('/:username', getUserProfile);
router.post('/:id/follow', followUser);
router.post('/:id/unfollow', unfollowUser);

export default router;