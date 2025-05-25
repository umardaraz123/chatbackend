import express from 'express';
import { login, logout, signup,updateProfile,checkAuth,getUserDetails, getUsers,findMatches,getMatchDetails,getUserById } from '../controllers/auth.controller.js';
import { protectRoute } from '../middleware/auth.middleware.js';

const router = express.Router();
router.post('/signup', signup)
router.post('/login',login)
router.post('/logout',logout)
router.put('/update-profile',protectRoute, updateProfile)
router.get('/check',protectRoute, checkAuth)
router.get('/users',protectRoute, getUsers)
router.get('/user-detail',protectRoute, getUserDetails)

// Option 1: Use different paths to avoid conflicts
router.get("/matches/find", protectRoute, findMatches);
router.get("/matches/details/:userId", protectRoute, getMatchDetails);
router.get("/user/:userId", protectRoute, getUserById);

// Option 2: Or use query parameters instead
// router.get("/matches", protectRoute, findMatches);
// router.get("/match-details", protectRoute, getMatchDetails); // Use ?userId=xxx

export default router;