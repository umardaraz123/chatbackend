// routes/friendRequest.route.js
import express from 'express';
import { 
  sendFriendRequest, 
  getFriendRequests, 
  respondToFriendRequest,
  getFriends 
} from '../controllers/friendRequest.controller.js';
import { protectRoute } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/send', protectRoute, sendFriendRequest);
router.get('/requests', protectRoute, getFriendRequests);
router.put('/respond/:requestId', protectRoute, respondToFriendRequest);
router.get('/friends', protectRoute, getFriends);

export default router;