import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
export const protectRoute = async (req, res, next) => {
    try {
        // Check token from cookies or Authorization header
        let token;
        
        // Check cookies first
        if (req.cookies && req.cookies.jwt) {
            token = req.cookies.jwt;
        } 
        // Then check Authorization header
        else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        
        if (!token) {
            return res.status(401).json({ message: "Unauthorized - No token provided" });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if(!decoded) {
            console.log("Token verification failed");
            return res.status(401).json({ message: "Unauthorized - Invalid token" });
        }
        const user = await User.findById(decoded.userId).select("-password");
        if (!user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        // Update lastActive (throttle: only write if >2 minutes since last update)
        const now = new Date();
        const twoMinAgo = new Date(now - 2 * 60 * 1000);
        if (!user.lastActive || user.lastActive < twoMinAgo) {
            User.findByIdAndUpdate(user._id, { lastActive: now }).catch(() => {});
        }
        req.user = user;
        next();
    } catch (error) {
        console.log("Error in auth middleware:", error);
        return res.status(401).json({ message: "Unauthorized" });
    }
}