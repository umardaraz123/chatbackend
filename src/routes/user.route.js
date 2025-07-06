import express from 'express';
import { createSeller, updateSeller, getUser, deleteUser, getUsers } from '../controllers/user.controller.js';
import { protectRoute } from '../middleware/auth.middleware.js';

const router = express.Router();


// Get all users
router.get('/', protectRoute, getUsers);

router.post('/seller', createSeller);
router.put('/seller/:sellerId', protectRoute, updateSeller);

// Get user details by ID
router.get('/:userId', protectRoute, getUser);

// Delete user by ID
router.delete('/:userId', protectRoute, deleteUser);


export default router;
