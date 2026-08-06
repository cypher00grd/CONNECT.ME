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
import { cacheAuthenticatedResponse, invalidateCacheDomains } from '../middleware/cache.js';

const router = express.Router();

// All routes are protected
router.use(protect);

router.get('/search', searchUsers);
router.get('/suggestions', cacheAuthenticatedResponse({ domain: 'suggestions', ttlSeconds: 30 }), getSuggestions);
router.get('/notifications', getNotifications);
router.put('/notifications/read', markNotificationsRead);
router.post('/notify-followers', notifyFollowers);
router.get('/:username', getUserProfile);
router.post('/:id/follow', invalidateCacheDomains('suggestions'), followUser);
router.post('/:id/unfollow', invalidateCacheDomains('suggestions'), unfollowUser);

export default router;
