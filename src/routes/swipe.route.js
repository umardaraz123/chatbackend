// routes/swipe.route.js
import express from 'express';
import { 
  getSwipeableUsers, 
  swipeUser, 
  getMatches,
  getDetailedMatches,
  getLikedUsers, 
  getSwipeStats,
  getReceivedSwipes
} from '../controllers/swipe.controller.js';
import { protectRoute } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/users', protectRoute, getSwipeableUsers);
router.post('/swipe', protectRoute, swipeUser);
router.get('/matches', protectRoute, getMatches);
router.get('/matches/detailed', protectRoute, getDetailedMatches);
router.get('/liked', protectRoute, getLikedUsers);
router.get('/stats', protectRoute, getSwipeStats);
router.get('/received', protectRoute, getReceivedSwipes);

export default router;