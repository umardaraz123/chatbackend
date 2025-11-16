import express from 'express';
import { login, logout, signup,updateProfile,checkAuth,getUserDetails, getUsers,findMatches,getMatchDetails,getUserById, requestPasswordReset, verifyOTP, resetPassword, sendSignupOTP, verifySignupOTP, completeSignup } from '../controllers/auth.controller.js';
import { protectRoute } from '../middleware/auth.middleware.js';

const router = express.Router();
router.post('/signup', signup)

// New signup flow routes
router.post('/signup/send-otp', sendSignupOTP)
router.post('/signup/verify-otp', verifySignupOTP)
router.post('/signup/complete', completeSignup)

router.post('/login',login)
router.post('/logout',logout)
router.put('/update-profile',protectRoute, updateProfile)
router.get('/check',protectRoute, checkAuth)
router.get('/users',protectRoute, getUsers)
router.get('/user-detail',protectRoute, getUserDetails)

// Password reset routes (no auth required)
router.post('/forgot-password', requestPasswordReset)
router.post('/verify-otp', verifyOTP)
router.post('/reset-password', resetPassword)

// Option 1: Use different paths to avoid conflicts
router.get("/matches/find", protectRoute, findMatches);
router.get("/matches/details/:userId", protectRoute, getMatchDetails);
router.get("/user/:userId", protectRoute, getUserById);

// Option 2: Or use query parameters instead
// router.get("/matches", protectRoute, findMatches);
// router.get("/match-details", protectRoute, getMatchDetails); // Use ?userId=xxx

export default router;