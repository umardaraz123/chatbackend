import express from 'express';
import { protectRoute } from '../middleware/auth.middleware.js';
import {
  getFeed,
  createPost,
  updatePost,
  deletePost,
  toggleLike,
  addComment,
  deleteComment,
  getMyPosts,
} from '../controllers/post.controller.js';

const router = express.Router();

// All post routes require authentication
router.use(protectRoute);

router.get('/feed', getFeed);          // GET  /api/posts/feed
router.get('/my', getMyPosts);         // GET  /api/posts/my

router.post('/', createPost);          // POST /api/posts
router.put('/:id', updatePost);        // PUT  /api/posts/:id
router.delete('/:id', deletePost);     // DELETE /api/posts/:id

router.post('/:id/like', toggleLike);  // POST /api/posts/:id/like

router.post('/:id/comments', addComment);                        // POST   /api/posts/:id/comments
router.delete('/:id/comments/:commentId', deleteComment);        // DELETE /api/posts/:id/comments/:commentId

export default router;
