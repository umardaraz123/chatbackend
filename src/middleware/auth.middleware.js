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
            console.log("No token found in cookies or Authorization header");
            return res.status(401).json({ message: "Unauthorized - No token provided" });
        }
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        } catch (jwtError) {
            console.log("JWT verification error:", jwtError.message);
            return res.status(401).json({ message: "Unauthorized - Invalid or expired token" });
        }
        if(!decoded) {
            console.log("Token verification failed");
            return res.status(401).json({ message: "Unauthorized - Invalid token" });
        }
        const user = await User.findById(decoded._id).select("-password");
        if (!user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        req.user = user;
        next();
    } catch (error) {
        console.log("Error in auth middleware:", error.message || error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}