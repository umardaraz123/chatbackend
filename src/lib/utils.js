import jwt from "jsonwebtoken";
export const generateToken = (userId,res) => {
  try {
    // Make sure JWT_SECRET is defined
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not defined in environment variables");
      return null;
    }
    
    const token= jwt.sign({ userId }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    
    // Set cookie with better compatibility for serverless environments
    try {
      res.cookie("jwt", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV !== "development",
        sameSite: process.env.NODE_ENV === "development" ? "lax" : "none",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: "/",
      });
    } catch (cookieError) {
      console.error("Error setting cookie:", cookieError);
      // Continue even if setting cookie fails, as we'll return the token
    }
    
    return token;
  } catch (error) {
    console.error("Token generation error:", error);
    return null;
  }
}