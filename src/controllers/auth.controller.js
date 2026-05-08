import { generateToken } from "../lib/utils.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import cloudinary from "../lib/cloudinary.js";
import { connectDB } from "../lib/db.js";
import PasswordReset from "../models/passwordReset.model.js";
import { sendOTPEmail, sendPasswordResetSuccessEmail } from "../lib/emailService.js";

// Helper function to ensure DB connection
const ensureDbConnected = async () => {
  try {
    // Import mongoose safely (avoiding any undefined issues)
    let mongoose;
    try {
      mongoose = (await import('mongoose')).default;
    } catch (importError) {
      console.log('Error importing mongoose, trying direct import');
      const mongooseModule = await import('mongoose');
      mongoose = mongooseModule;
    }
    
    // Check connection status safely
    let needsConnection = true;
    
    if (mongoose && mongoose.connection) {
      try {
        const state = mongoose.connection.readyState;
        needsConnection = state !== 1; // 1 means connected
        console.log(`MongoDB connection state: ${state} (${needsConnection ? 'needs connection' : 'already connected'})`);
      } catch (stateError) {
        console.log('Error checking mongoose state:', stateError.message);
      }
    }
    
    if (needsConnection) {
      console.log('MongoDB not connected or state check failed, connecting now...');
      await connectDB();
      console.log('MongoDB connection attempt completed');
    }
    
    return true;
  } catch (error) {
    console.error("Failed to connect to database:", error);
    // Don't throw, just return false to allow degraded operation
    return false;
  }
};

export const signup = async (req, res) => {
  const {
    email,
    password,

    firstName,
    lastName,
    dateOfBirth,
    gender,

    bio,
    location,
    interests,
    lookingFor,
    preferredAgeRange,
    phoneNumber,
    hairs,
    eyes,
    height,
    weight,
    sociability,
    relationship,
    orientation,
    smoking,
    alcohol,
    profilePic, // base64 image from frontend
  } = req.body;

  try {
    // Validate fields
    if (
      !email ||
      !password ||
      !firstName ||
      !lastName ||
      !dateOfBirth ||
      !gender
    ) {
      return res
        .status(400)
        .json({ message: "Please fill all required fields" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    // Check if email or username already exists
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Upload Profile Picture if provided
    let uploadedProfilePicUrl = "";
    if (profilePic) {
      const uploadResponse = await cloudinary.uploader.upload(profilePic);
      uploadedProfilePicUrl = uploadResponse.secure_url;
    }

    // Create new user
    const newUser = new User({
      email,

      password: hashedPassword,
      firstName,
      lastName,
      dateOfBirth,
      gender,

      bio,
      location,
      interests,
      lookingFor,
      preferredAgeRange,
      phoneNumber,
      hairs,
      eyes,
      height,
      weight,
      sociability,
      relationship,
      orientation,
      smoking,
      alcohol,
      profilePic: uploadedProfilePicUrl,
      role: "customer",
    });

    await newUser.save();

    // Generate Token
    const token = generateToken(newUser._id, res); // 🔥 capture returned token

    // Return user data (excluding password)
    return res.status(201).json({
      token,
      _id: newUser._id,

      fullName: `${newUser.firstName} ${newUser.lastName}`,
      email: newUser.email,
      profilePic: newUser.profilePic,
      gender: newUser.gender,
      bio: newUser.bio,
      location: newUser.location,
      interests: newUser.interests,
      lookingFor: newUser.lookingFor,
      preferredAgeRange: newUser.preferredAgeRange,
      phoneNumber: newUser.phoneNumber,
      role: newUser?.role,
      hairs: newUser.hairs,
      eyes: newUser.eyes,
      height: newUser.height,
      weight: newUser.weight,
      sociability: newUser.sociability,
      relationship: newUser.relationship,
      orientation: newUser?.orientation,
      smoking: newUser?.smoking,
      alcohol: newUser.alcohol,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
export const login = async (req, res) => {
  // CORS Headers
  // res.setHeader('Access-Control-Allow-Origin', 'https://boneandbone.netlify.app');
  // res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  // res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  // res.setHeader('Access-Control-Allow-Credentials', 'true');

 
  // if (req.method === 'OPTIONS') {
  //   return res.status(200).end();
  // }

  const { email, password } = req.body;  try {
    // Ensure MongoDB is connected
    await ensureDbConnected();
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Use a timeout promise to prevent hanging
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database query timed out')), 8000)
    );
    
    // Find user with timeout protection
    const userPromise = User.findOne({ email });
    const user = await Promise.race([userPromise, timeoutPromise]);
    
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    
    console.log('🔐 Generating token for user:', user._id, user.email);
    const token = generateToken(user._id, res);
    console.log('✅ Token generated and cookie set');
    
    return res.status(200).json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`,
      email: user.email,
      profilePic: user.profilePic,
      bio: user.bio,
      location: user.location,
      role: user.role,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
    });
  } catch (error) {
    console.log('❌ Login error:', error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const logout = (req, res) => {
  try {
    res.cookie("jwt", "", {
      maxAge: 0,
    });

    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};
//get user details
export const getUserDetails = async (req, res) => {
  try {
    const userId = req.user._id; // assuming you have middleware to attach user to req

    const user = await User.findById(userId).select("-password"); // don't send password

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return the same structured data as login and checkAuth
    res.status(200).json({
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`,
      email: user.email,
      profilePic: user.profilePic,
      photos: user.photos || [],
      videos: user.videos || [],
      bio: user.bio,
      profession: user.profession,
      lifeGoal: user.lifeGoal,
      location: user.location,
      role: user.role,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
      interests: user.interests,
      lookingFor: user.lookingFor,
      preferredAgeRange: user.preferredAgeRange,
      phoneNumber: user.phoneNumber,
      hairs: user.hairs,
      eyes: user.eyes,
      height: user.height,
      weight: user.weight,
      sociability: user.sociability,
      relationship: user.relationship,
      orientation: user.orientation,
      smoking: user.smoking,
      alcohol: user.alcohol,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

//update profile
export const updateProfile = async (req, res) => {
  const userId = req.user._id; // ✅ Changed from req.userId to req.user._id
  const {
    firstName,
    lastName,
    dateOfBirth,
    gender,
    bio,
    profession,
    lifeGoal,
    location,
    interests,
    lookingFor,
    preferredAgeRange,
    phoneNumber,
    profilePic,
    photos, // Array of photos
    videos, // Array of videos
    hairs,
    eyes,
    height,
    weight,
    sociability,
    relationship,
    orientation,
    smoking,
    alcohol,
  } = req.body;

  try {
    // ✅ Add authentication check
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized - User not authenticated" });
    }

    console.log("🔍 Updating profile for user ID:", userId); // Debug log

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    console.log("✅ User found:", user.firstName, user.email); // Debug log

    // Optional: Upload new profile picture
    if (profilePic) {
      try {
        const uploadResponse = await cloudinary.uploader.upload(profilePic);
        user.profilePic = uploadResponse.secure_url;
        console.log("📸 Profile picture uploaded successfully");
      } catch (uploadError) {
        console.error("❌ Cloudinary upload error:", uploadError);
        // Continue with other updates even if image upload fails
      }
    }

    // Handle multiple photos upload
    if (photos && Array.isArray(photos)) {
      try {
        const uploadedPhotos = [];
        for (const photo of photos) {
          if (photo.startsWith('data:')) { // Only upload new base64 images
            const uploadResponse = await cloudinary.uploader.upload(photo);
            uploadedPhotos.push(uploadResponse.secure_url);
          } else {
            uploadedPhotos.push(photo); // Keep existing URLs
          }
        }
        user.photos = uploadedPhotos;
        console.log("📸 Photos uploaded successfully:", uploadedPhotos.length);
      } catch (uploadError) {
        console.error("❌ Photos upload error:", uploadError);
      }
    }

    // Handle videos upload
    if (videos && Array.isArray(videos)) {
      try {
        const uploadedVideos = [];
        for (const video of videos) {
          if (video.startsWith('data:')) { // Only upload new base64 videos
            const uploadResponse = await cloudinary.uploader.upload(video, {
              resource_type: 'video'
            });
            uploadedVideos.push(uploadResponse.secure_url);
          } else {
            uploadedVideos.push(video); // Keep existing URLs
          }
        }
        user.videos = uploadedVideos;
        console.log("🎥 Videos uploaded successfully:", uploadedVideos.length);
      } catch (uploadError) {
        console.error("❌ Videos upload error:", uploadError);
      }
    }

    // Update only provided fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (dateOfBirth) user.dateOfBirth = dateOfBirth;
    if (gender) user.gender = gender;
    if (bio) user.bio = bio;
    if (profession) user.profession = profession;
    if (lifeGoal) user.lifeGoal = lifeGoal;
    if (location) user.location = location;
    if (interests) user.interests = interests;
    if (lookingFor) user.lookingFor = lookingFor;
    if (preferredAgeRange) user.preferredAgeRange = preferredAgeRange;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (hairs) user.hairs = hairs;
    if (eyes) user.eyes = eyes;
    if (height) user.height = height;
    if (weight) user.weight = weight;
    if (sociability) user.sociability = sociability;
    if (relationship) user.relationship = relationship;
    if (orientation) user.orientation = orientation;
    if (smoking) user.smoking = smoking;
    if (alcohol) user.alcohol = alcohol;

    if (!user.role) {
      user.role = "customer"; // Set role if it's missing
    }

    await user.save();
    console.log("✅ Profile updated successfully for:", user.firstName);

    // ✅ Return user data directly (matching your frontend expectation)
    return res.status(200).json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`,
      email: user.email,
      profilePic: user.profilePic,
      photos: user.photos || [],
      videos: user.videos || [],
      gender: user.gender,
      bio: user.bio,
      profession: user.profession,
      lifeGoal: user.lifeGoal,
      location: user.location,
      interests: user.interests,
      lookingFor: user.lookingFor,
      preferredAgeRange: user.preferredAgeRange,
      phoneNumber: user.phoneNumber,
      hairs: user.hairs,
      eyes: user.eyes,
      height: user.height,
      weight: user.weight,
      sociability: user.sociability,
      relationship: user.relationship,
      orientation: user?.orientation,
      smoking: user?.smoking,
      alcohol: user.alcohol,
      role: user?.role,
      dateOfBirth: user.dateOfBirth,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    console.error("❌ Update Error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

//check auth
export const checkAuth = async (req, res) => {
  try {
    console.log('🔍 CheckAuth called, cookies:', req.cookies);
    console.log('🔍 JWT cookie:', req.cookies?.jwt);
    console.log('🔍 Req.user:', req.user ? 'User found' : 'No user');
    
    if (req.user) {
      console.log('✅ User authenticated:', req.user._id, req.user.email);

      // ─── Daily Login Streak ───────────────────────────────────────────
      let streak = req.user.streak || 0;
      try {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const lastDate = req.user.lastStreakDate ? new Date(req.user.lastStreakDate) : null;
        const lastDay = lastDate ? new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate()) : null;
        const diffDays = lastDay ? Math.round((today - lastDay) / (1000 * 60 * 60 * 24)) : null;

        if (!lastDay || diffDays > 1) {
          streak = 1; // reset
        } else if (diffDays === 1) {
          streak = (req.user.streak || 0) + 1; // increment
        }
        // diffDays === 0 → same day, keep current streak without writing
        if (diffDays !== 0) {
          User.findByIdAndUpdate(req.user._id, { streak, lastStreakDate: today }).catch(() => {});
        }
      } catch {}

      return res.status(200).json({
        _id: req.user._id,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        fullName: `${req.user.firstName} ${req.user.lastName}`,
        email: req.user.email,
        profilePic: req.user.profilePic,
        bio: req.user.bio,
        location: req.user.location,
        role: req.user.role,
        dateOfBirth: req.user.dateOfBirth,
        gender: req.user.gender,
        streak,
        lastActive: req.user.lastActive,
      });
    } else {
      console.log('❌ No user found in request');
      return res.status(401).json({ message: "Unauthorized" });
    }
  } catch (error) {
    console.log('❌ CheckAuth error:', error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
//get users
export const getUsers = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const users = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");
    
    // Structure the data consistently like other functions
    const structuredUsers = users.map(user => ({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`,
      email: user.email,
      profilePic: user.profilePic,
      bio: user.bio,
      location: user.location,
      role: user.role,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
      interests: user.interests,
      lookingFor: user.lookingFor,
      preferredAgeRange: user.preferredAgeRange,
      phoneNumber: user.phoneNumber,
      hairs: user.hairs,
      eyes: user.eyes,
      height: user.height,
      weight: user.weight,
      sociability: user.sociability,
      relationship: user.relationship,
      orientation: user.orientation,
      smoking: user.smoking,
      alcohol: user.alcohol,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));
    
    console.log("Fetched Users:", structuredUsers.length);
    res.status(200).json(structuredUsers);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get specific user details by ID
export const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return all user data in structured format
    const structuredUser = {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`,
      email: user.email,
      profilePic: user.profilePic,
      bio: user.bio,
      location: user.location,
      role: user.role,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
      interests: user.interests,
      lookingFor: user.lookingFor,
      preferredAgeRange: user.preferredAgeRange,
      phoneNumber: user.phoneNumber,
      hairs: user.hairs,
      eyes: user.eyes,
      height: user.height,
      weight: user.weight,
      sociability: user.sociability,
      relationship: user.relationship,
      orientation: user.orientation,
      smoking: user.smoking,
      alcohol: user.alcohol,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    res.status(200).json(structuredUser);
  } catch (error) {
    console.error("Error fetching user by ID:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Find matches based on interests, location, lookingFor, and other preferences
export const findMatches = async (req, res) => {
  try {
    console.log("🔍 Finding matches for user:", req.user._id);
    
    const loggedInUserId = req.user._id;
    const loggedInUser = await User.findById(loggedInUserId);

    if (!loggedInUser) {
      console.log("❌ User not found:", loggedInUserId);
      return res.status(404).json({ message: "User not found" });
    }

    console.log("✅ User found:", loggedInUser.firstName, loggedInUser.email);

    // Build match query with safer checks
    let matchQuery = { 
      _id: { $ne: loggedInUserId }
    };

    // Only add role filter if role field exists
    if (loggedInUser.role) {
      matchQuery.role = { $ne: 'admin' };
    }

    console.log("🔎 Match query:", matchQuery);

    // 1. Filter by gender preference (lookingFor) - with safety check
    if (loggedInUser.lookingFor && loggedInUser.lookingFor !== 'everyone' && loggedInUser.lookingFor !== '') {
      matchQuery.gender = loggedInUser.lookingFor;
      console.log("👫 Gender filter applied:", loggedInUser.lookingFor);
    }

    // 2. Filter by age range preference - with safety checks
    if (loggedInUser.preferredAgeRange) {
      let minAge, maxAge;
      
      // Handle both string and object formats
      if (typeof loggedInUser.preferredAgeRange === 'string') {
        // Handle string format like "25-35"
        const ageRange = loggedInUser.preferredAgeRange.split('-');
        minAge = parseInt(ageRange[0]) || 18;
        maxAge = parseInt(ageRange[1]) || 100;
      } else if (typeof loggedInUser.preferredAgeRange === 'object') {
        // Handle object format
        minAge = loggedInUser.preferredAgeRange.min || 18;
        maxAge = loggedInUser.preferredAgeRange.max || 100;
      }

      if (minAge && maxAge) {
        const currentDate = new Date();
        const maxBirthDate = new Date(currentDate.getFullYear() - minAge, currentDate.getMonth(), currentDate.getDate());
        const minBirthDate = new Date(currentDate.getFullYear() - maxAge, currentDate.getMonth(), currentDate.getDate());
        
        matchQuery.dateOfBirth = {
          $gte: minBirthDate,
          $lte: maxBirthDate
        };
        console.log("📅 Age filter applied:", minAge, "-", maxAge);
      }
    }

    console.log("🔍 Final match query:", matchQuery);

    // 3. Get all potential matches
    const allPotentialMatches = await User.find(matchQuery).select("-password");
    console.log("👥 Found", allPotentialMatches.length, "potential matches");

    if (allPotentialMatches.length === 0) {
      return res.status(200).json({
        matches: [],
        totalMatches: 0,
        highMatches: 0,
        mediumMatches: 0,
        lowMatches: 0,
        message: "No potential matches found based on your preferences"
      });
    }
    
    // 4. Calculate match scores with safety checks
    const scoredMatches = allPotentialMatches.map(user => {
      let score = 0;
      let matchReasons = [];
      let detailedScoring = {
        interests: 0,
        location: 0,
        relationship: 0,
        orientation: 0,
        lifestyle: 0,
        age: 0
      };

      try {
        // Interest compatibility (40% weight) - with safety checks
        if (loggedInUser.interests && Array.isArray(loggedInUser.interests) && 
            user.interests && Array.isArray(user.interests) && 
            loggedInUser.interests.length > 0 && user.interests.length > 0) {
          
          const commonInterests = loggedInUser.interests.filter(interest => 
            user.interests.includes(interest)
          );
          
          if (commonInterests.length > 0) {
            const interestScore = (commonInterests.length / Math.max(loggedInUser.interests.length, user.interests.length)) * 40;
            score += interestScore;
            detailedScoring.interests = Math.round(interestScore);
            matchReasons.push(`${commonInterests.length} common interest${commonInterests.length > 1 ? 's' : ''}: ${commonInterests.slice(0, 3).join(', ')}`);
          }
        }

        // Location compatibility (25% weight) - with safety checks
        if (loggedInUser.location && user.location && 
            typeof loggedInUser.location === 'string' && typeof user.location === 'string') {
          
          if (user.location.toLowerCase().includes(loggedInUser.location.toLowerCase()) || 
              loggedInUser.location.toLowerCase().includes(user.location.toLowerCase())) {
            score += 25;
            detailedScoring.location = 25;
            matchReasons.push('Same location');
          }
        }

        // Age compatibility (10% weight) - with safety checks
        if (user.dateOfBirth) {
          try {
            const userAge = new Date().getFullYear() - new Date(user.dateOfBirth).getFullYear();
            let preferredMin = 18, preferredMax = 100;
            
            if (loggedInUser.preferredAgeRange) {
              if (typeof loggedInUser.preferredAgeRange === 'string') {
                const ageRange = loggedInUser.preferredAgeRange.split('-');
                preferredMin = parseInt(ageRange[0]) || 18;
                preferredMax = parseInt(ageRange[1]) || 100;
              } else if (typeof loggedInUser.preferredAgeRange === 'object') {
                preferredMin = loggedInUser.preferredAgeRange.min || 18;
                preferredMax = loggedInUser.preferredAgeRange.max || 100;
              }
            }
            
            if (userAge >= preferredMin && userAge <= preferredMax && userAge > 0) {
              score += 10;
              detailedScoring.age = 10;
              matchReasons.push(`Age compatible (${userAge})`);
            }
          } catch (ageError) {
            console.log("⚠️ Age calculation error for user:", user._id);
          }
        }

        // Relationship goal compatibility (15% weight) - with safety checks
        if (loggedInUser.relationship && user.relationship && 
            typeof loggedInUser.relationship === 'string' && typeof user.relationship === 'string') {
          
          if (loggedInUser.relationship.toLowerCase() === user.relationship.toLowerCase()) {
            score += 15;
            detailedScoring.relationship = 15;
            matchReasons.push('Same relationship goals');
          }
        }

        // Orientation compatibility (7% weight) - with safety checks
        if (loggedInUser.orientation && user.orientation && 
            typeof loggedInUser.orientation === 'string' && typeof user.orientation === 'string') {
          
          if (loggedInUser.orientation.toLowerCase() === user.orientation.toLowerCase()) {
            score += 7;
            detailedScoring.orientation = 7;
            matchReasons.push('Compatible orientation');
          }
        }

        // Lifestyle compatibility (3% weight total) - with safety checks
        let lifestyleScore = 0;
        if (loggedInUser.smoking && user.smoking && 
            typeof loggedInUser.smoking === 'string' && typeof user.smoking === 'string') {
          
          if (loggedInUser.smoking.toLowerCase() === user.smoking.toLowerCase()) {
            lifestyleScore += 1.5;
            matchReasons.push('Same smoking preference');
          }
        }
        
        if (loggedInUser.alcohol && user.alcohol && 
            typeof loggedInUser.alcohol === 'string' && typeof user.alcohol === 'string') {
          
          if (loggedInUser.alcohol.toLowerCase() === user.alcohol.toLowerCase()) {
            lifestyleScore += 1.5;
            matchReasons.push('Same drinking preference');
          }
        }
        
        score += lifestyleScore;
        detailedScoring.lifestyle = Math.round(lifestyleScore);

      } catch (userScoreError) {
        console.log("⚠️ Error calculating score for user:", user._id, userScoreError.message);
      }

      const finalScore = Math.round(score);

      return {
        ...user.toObject(),
        matchScore: finalScore,
        matchReasons: matchReasons,
        detailedScoring: detailedScoring,
        isHighMatch: finalScore >= 70,
        isMediumMatch: finalScore >= 40 && finalScore < 70,
        isLowMatch: finalScore >= 20 && finalScore < 40,
        matchLevel: finalScore >= 70 ? 'High' : finalScore >= 40 ? 'Medium' : finalScore >= 20 ? 'Low' : 'Poor'
      };
    });

    // Filter matches to show only those with 20% or higher compatibility
    const qualifiedMatches = scoredMatches
      .filter(match => match.matchScore >= 20)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 50);

    console.log("✅ Qualified matches found:", qualifiedMatches.length);

    // Return results
    const result = {
      matches: qualifiedMatches,
      totalMatches: qualifiedMatches.length,
      highMatches: qualifiedMatches.filter(m => m.isHighMatch).length,
      mediumMatches: qualifiedMatches.filter(m => m.isMediumMatch).length,
      lowMatches: qualifiedMatches.filter(m => m.isLowMatch).length,
      averageScore: qualifiedMatches.length > 0 
        ? Math.round(qualifiedMatches.reduce((sum, match) => sum + match.matchScore, 0) / qualifiedMatches.length)
        : 0,
      bestMatch: qualifiedMatches[0] || null,
      lastUpdated: new Date()
    };

    if (qualifiedMatches.length === 0) {
      result.message = "No matches found with 20% or higher compatibility. Try updating your profile preferences.";
      result.suggestion = "Add more interests or adjust your age/location preferences for better matches.";
    }

    res.status(200).json(result);

  } catch (error) {
    console.error("❌ Error finding matches:", error);
    console.error("Stack trace:", error.stack);
    res.status(500).json({ 
      message: "Internal Server Error", 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get match details between two users
export const getMatchDetails = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const { userId } = req.params;

    const loggedInUser = await User.findById(loggedInUserId);
    const targetUser = await User.findById(userId).select("-password");

    if (!loggedInUser || !targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Calculate detailed compatibility
    let compatibility = {
      overallScore: 0,
      details: {
        interests: { score: 0, common: [], total: 0 },
        location: { score: 0, match: false },
        age: { score: 0, compatible: false },
        relationship: { score: 0, match: false },
        orientation: { score: 0, match: false },
        lifestyle: { score: 0, smoking: false, alcohol: false }
      }
    };

    // Interest compatibility
    if (loggedInUser.interests && targetUser.interests) {
      const commonInterests = loggedInUser.interests.filter(interest => 
        targetUser.interests.includes(interest)
      );
      const interestScore = (commonInterests.length / Math.max(loggedInUser.interests.length, targetUser.interests.length)) * 40;
      compatibility.details.interests = {
        score: Math.round(interestScore),
        common: commonInterests,
        total: commonInterests.length
      };
      compatibility.overallScore += interestScore;
    }

    // Location compatibility
    if (loggedInUser.location && targetUser.location) {
      const locationMatch = targetUser.location.toLowerCase().includes(loggedInUser.location.toLowerCase()) || 
                           loggedInUser.location.toLowerCase().includes(targetUser.location.toLowerCase());
      if (locationMatch) {
        compatibility.details.location = { score: 25, match: true };
        compatibility.overallScore += 25;
      }
    }

    // Age compatibility
    if (loggedInUser.preferredAgeRange && targetUser.dateOfBirth) {
      const targetAge = new Date().getFullYear() - new Date(targetUser.dateOfBirth).getFullYear();
      const minAge = loggedInUser.preferredAgeRange.min || 18;
      const maxAge = loggedInUser.preferredAgeRange.max || 100;
      
      if (targetAge >= minAge && targetAge <= maxAge) {
        compatibility.details.age = { score: 15, compatible: true, age: targetAge };
        compatibility.overallScore += 15;
      }
    }

    // Relationship compatibility
    if (loggedInUser.relationship && targetUser.relationship && loggedInUser.relationship === targetUser.relationship) {
      compatibility.details.relationship = { score: 20, match: true };
      compatibility.overallScore += 20;
    }

    // Orientation compatibility
    if (loggedInUser.orientation && targetUser.orientation && loggedInUser.orientation === targetUser.orientation) {
      compatibility.details.orientation = { score: 10, match: true };
      compatibility.overallScore += 10;
    }

    // Lifestyle compatibility
    let lifestyleScore = 0;
    let smokingMatch = false;
    let alcoholMatch = false;
    
    if (loggedInUser.smoking && targetUser.smoking && loggedInUser.smoking === targetUser.smoking) {
      lifestyleScore += 2.5;
      smokingMatch = true;
    }
    
    if (loggedInUser.alcohol && targetUser.alcohol && loggedInUser.alcohol === targetUser.alcohol) {
      lifestyleScore += 2.5;
      alcoholMatch = true;
    }
    
    compatibility.details.lifestyle = {
      score: Math.round(lifestyleScore),
      smoking: smokingMatch,
      alcohol: alcoholMatch
    };
    compatibility.overallScore += lifestyleScore;

    compatibility.overallScore = Math.round(compatibility.overallScore);

    res.status(200).json({
      user: targetUser,
      compatibility: compatibility
    });

  } catch (error) {
    console.error("Error getting match details:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Request Password Reset - Send OTP via Email
export const requestPasswordReset = async (req, res) => {
  const { email } = req.body;

  try {
    // Validate email
    if (!email || !email.trim()) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Check if user exists
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    
    if (!user) {
      // Don't reveal if user exists or not (security best practice)
      return res.status(200).json({ 
        message: "If an account exists with this email, you will receive a password reset code." 
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash OTP before storing
    const salt = await bcrypt.genSalt(10);
    const hashedOTP = await bcrypt.hash(otp, salt);

    // Delete any existing OTP for this email
    await PasswordReset.deleteMany({ email: email.toLowerCase().trim() });

    // Save OTP to database
    const passwordReset = new PasswordReset({
      email: email.toLowerCase().trim(),
      otp: hashedOTP,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    });

    await passwordReset.save();

    // Send OTP email
    try {
      await sendOTPEmail(email, otp, user.firstName);
      console.log(`✅ OTP sent to ${email}`);
    } catch (emailError) {
      console.error("Error sending email:", emailError);
      return res.status(500).json({ message: "Failed to send email. Please try again." });
    }

    return res.status(200).json({ 
      message: "Password reset code sent to your email. Please check your inbox.",
      email: email 
    });

  } catch (error) {
    console.error("Error in requestPasswordReset:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Verify OTP
export const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;

  try {
    // Validate input
    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    if (otp.length !== 6) {
      return res.status(400).json({ message: "OTP must be 6 digits" });
    }

    // Find the most recent unused OTP for this email
    const passwordReset = await PasswordReset.findOne({
      email: email.toLowerCase().trim(),
      isUsed: false,
    }).sort({ createdAt: -1 });

    if (!passwordReset) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Check if OTP has expired
    if (new Date() > passwordReset.expiresAt) {
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });
    }

    // Verify OTP
    const isValidOTP = await bcrypt.compare(otp, passwordReset.otp);

    if (!isValidOTP) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // OTP is valid - return success
    return res.status(200).json({ 
      message: "OTP verified successfully",
      email: email 
    });

  } catch (error) {
    console.error("Error in verifyOTP:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Reset Password
export const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  try {
    // Validate input
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "Email, OTP, and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    // Find the most recent unused OTP for this email
    const passwordReset = await PasswordReset.findOne({
      email: email.toLowerCase().trim(),
      isUsed: false,
    }).sort({ createdAt: -1 });

    if (!passwordReset) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Check if OTP has expired
    if (new Date() > passwordReset.expiresAt) {
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });
    }

    // Verify OTP
    const isValidOTP = await bcrypt.compare(otp, passwordReset.otp);

    if (!isValidOTP) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update user password
    user.password = hashedPassword;
    await user.save();

    // Mark OTP as used
    passwordReset.isUsed = true;
    await passwordReset.save();

    // Send success email
    try {
      await sendPasswordResetSuccessEmail(email, user.firstName);
    } catch (emailError) {
      console.error("Error sending success email:", emailError);
      // Don't fail the request if email fails
    }

    console.log(`✅ Password reset successful for ${email}`);

    return res.status(200).json({ 
      message: "Password reset successful. You can now login with your new password." 
    });

  } catch (error) {
    console.error("Error in resetPassword:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Send Signup OTP
export const sendSignupOTP = async (req, res) => {
  const { email } = req.body;

  try {
    // Validate email
    if (!email || !email.trim()) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered. Please login instead." });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash OTP before storing
    const salt = await bcrypt.genSalt(10);
    const hashedOTP = await bcrypt.hash(otp, salt);

    // Delete any existing OTP for this email
    await PasswordReset.deleteMany({ email: email.toLowerCase().trim() });

    // Save OTP to database (reusing PasswordReset model)
    const signupOTP = new PasswordReset({
      email: email.toLowerCase().trim(),
      otp: hashedOTP,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    });

    await signupOTP.save();

    // Send OTP email
    try {
      await sendOTPEmail(email, otp, 'User');
      console.log(`✅ Signup OTP sent to ${email}`);
    } catch (emailError) {
      console.error("Error sending email:", emailError);
      return res.status(500).json({ message: "Failed to send email. Please try again." });
    }

    return res.status(200).json({ 
      message: "Verification code sent to your email. Please check your inbox.",
      email: email 
    });

  } catch (error) {
    console.error("Error in sendSignupOTP:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Verify Signup OTP
export const verifySignupOTP = async (req, res) => {
  const { email, otp } = req.body;

  try {
    // Validate input
    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    if (otp.length !== 6) {
      return res.status(400).json({ message: "OTP must be 6 digits" });
    }

    // Find the most recent unused OTP for this email
    const signupOTP = await PasswordReset.findOne({
      email: email.toLowerCase().trim(),
      isUsed: false,
    }).sort({ createdAt: -1 });

    if (!signupOTP) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Check if OTP has expired
    if (new Date() > signupOTP.expiresAt) {
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });
    }

    // Verify OTP
    const isValidOTP = await bcrypt.compare(otp, signupOTP.otp);

    if (!isValidOTP) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Mark OTP as used
    signupOTP.isUsed = true;
    await signupOTP.save();

    // OTP is valid - return success
    return res.status(200).json({ 
      message: "Email verified successfully",
      email: email,
      verified: true
    });

  } catch (error) {
    console.error("Error in verifySignupOTP:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Complete Signup with all details
export const completeSignup = async (req, res) => {
  const {
    email,
    password,
    fullName,
    userName,
    phoneNumber,
    dateOfBirth,
    gender,
  } = req.body;

  try {
    // Validate required fields
    if (!email || !password || !fullName || !userName || !dateOfBirth || !gender) {
      return res.status(400).json({ message: "Please fill all required fields" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    // Check if email already exists
    const emailExists = await User.findOne({ email: email.toLowerCase().trim() });
    if (emailExists) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // Split fullName into firstName and lastName
    const nameParts = fullName.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || nameParts[0];

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const newUser = new User({
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      phoneNumber: phoneNumber || '',
      role: "customer",
    });

    await newUser.save();

    // Generate Token
    const token = generateToken(newUser._id, res);

    // Return user data (excluding password)
    return res.status(201).json({
      token,
      _id: newUser._id,
      fullName: `${newUser.firstName} ${newUser.lastName}`,
      email: newUser.email,
      profilePic: newUser.profilePic,
      gender: newUser.gender,
      phoneNumber: newUser.phoneNumber,
      role: newUser.role,
      dateOfBirth: newUser.dateOfBirth,
    });
  } catch (error) {
    console.error("Error in completeSignup:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// ─── BLOCK USER ───────────────────────────────────────────────────
export const blockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    if (userId === currentUserId.toString()) {
      return res.status(400).json({ message: 'Cannot block yourself' });
    }

    const target = await User.findById(userId);
    if (!target) return res.status(404).json({ message: 'User not found' });

    await User.findByIdAndUpdate(currentUserId, {
      $addToSet: { blockedUsers: userId }
    });

    res.json({ success: true, message: 'User blocked successfully' });
  } catch (err) {
    console.error('Block user error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const unblockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { blockedUsers: userId }
    });
    res.json({ success: true, message: 'User unblocked' });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getBlockedUsers = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('blockedUsers', 'firstName lastName profilePic');
    res.json(user.blockedUsers || []);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ─── PROFILE VIEWS ────────────────────────────────────────────────
export const recordProfileView = async (req, res) => {
  try {
    const { userId } = req.params;
    const viewerId = req.user._id;

    if (userId === viewerId.toString()) return res.json({ success: true }); // Don't record self-views

    const TWELVE_HOURS = 12 * 60 * 60 * 1000;
    const cutoff = new Date(Date.now() - TWELVE_HOURS);

    // Only add if viewer hasn't viewed this profile in 12h
    const alreadyViewed = await User.findOne({
      _id: userId,
      profileViews: {
        $elemMatch: { viewer: viewerId, viewedAt: { $gte: cutoff } }
      }
    });

    if (!alreadyViewed) {
      await User.findByIdAndUpdate(userId, {
        $push: { profileViews: { viewer: viewerId, viewedAt: new Date() } }
      });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getProfileViews = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('profileViews.viewer', 'firstName lastName profilePic bio location dateOfBirth interests');

    const views = (user.profileViews || [])
      .filter(v => v.viewer) // remove deleted accounts
      .sort((a, b) => b.viewedAt - a.viewedAt) // newest first
      .slice(0, 50); // return last 50

    const calculateAge = (dob) => {
      if (!dob) return null;
      const d = new Date(dob);
      const t = new Date();
      let age = t.getFullYear() - d.getFullYear();
      if (t.getMonth() - d.getMonth() < 0 || (t.getMonth() === d.getMonth() && t.getDate() < d.getDate())) age--;
      return age;
    };

    const structured = views.map(v => ({
      _id: v.viewer._id,
      fullName: `${v.viewer.firstName} ${v.viewer.lastName}`,
      firstName: v.viewer.firstName,
      profilePic: v.viewer.profilePic,
      bio: v.viewer.bio,
      location: v.viewer.location,
      age: calculateAge(v.viewer.dateOfBirth),
      interests: v.viewer.interests || [],
      viewedAt: v.viewedAt
    }));

    res.json({ views: structured, total: structured.length });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ─── REPORT USER ────────────────────────────────────────────────────────────
export const reportUser = async (req, res) => {
  try {
    const reporterId = req.user._id;
    const { userId } = req.params;
    const { reason } = req.body;

    const validReasons = ['spam', 'fake', 'inappropriate', 'harassment', 'other'];
    if (!validReasons.includes(reason)) {
      return res.status(400).json({ message: 'Invalid report reason' });
    }
    if (userId === reporterId.toString()) {
      return res.status(400).json({ message: 'Cannot report yourself' });
    }
    const target = await User.findById(userId);
    if (!target) return res.status(404).json({ message: 'User not found' });

    const alreadyReported = target.reports?.some(r => r.reporter?.toString() === reporterId.toString());
    if (alreadyReported) {
      return res.status(400).json({ message: 'Already reported this user' });
    }

    await User.findByIdAndUpdate(userId, {
      $push: { reports: { reporter: reporterId, reason, reportedAt: new Date() } }
    });

    res.json({ success: true, message: 'Report submitted. Thank you for keeping the community safe.' });
  } catch (err) {
    console.error('Report user error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ─── UPDATE MOOD ─────────────────────────────────────────────────────────────
export const updateMood = async (req, res) => {
  try {
    const { mood } = req.body;
    const validMoods = ['happy', 'flirty', 'chill', 'adventurous', 'lonely', 'excited', null];
    if (!validMoods.includes(mood)) {
      return res.status(400).json({ message: 'Invalid mood' });
    }
    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { mood, moodUpdatedAt: mood ? new Date() : null },
      { new: true, select: 'mood moodUpdatedAt' }
    );
    res.json({ success: true, mood: updated.mood });
  } catch (err) {
    console.error('Update mood error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};
