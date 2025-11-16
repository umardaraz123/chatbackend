import express from 'express';
import { 
  getUsersForSidebar,
  getMessages,
  sendMessage,
  markMessagesAsRead,
  getUnreadCount 
} from '../controllers/message.controller.js';

import { protectRoute } from '../middleware/auth.middleware.js';

const router = express.Router();
router.get("/users",protectRoute,getUsersForSidebar)
router.get("/:id",protectRoute,getMessages)
router.post("/send/:id",protectRoute,sendMessage)
router.put("/read/:id",protectRoute,markMessagesAsRead)
router.get("/unread/count",protectRoute,getUnreadCount)
export default router;