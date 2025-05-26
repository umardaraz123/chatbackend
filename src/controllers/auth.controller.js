import { generateToken } from "../lib/utils.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import cloudinary from "../lib/cloudinary.js";

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

  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user._id, res);

    return res.status(200).json({
      token,
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      profilePic: user.profilePic,
    });
  } catch (error) {
    console.log(error);
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

    res.status(200).json(user);
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
    location,
    interests,
    lookingFor,
    preferredAgeRange,
    phoneNumber,
    profilePic,
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

    // Update only provided fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (dateOfBirth) user.dateOfBirth = dateOfBirth;
    if (gender) user.gender = gender;
    if (bio) user.bio = bio;
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
      gender: user.gender,
      bio: user.bio,
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
export const checkAuth = (req, res) => {
  try {
    if (req.user) {
      return res.status(200).json(req.user);
    } else {
      return res.status(401).json({ message: "Unauthorized" });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
//get users
export const getUsers = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const users = await User.find({ _id: { $ne: loggedInUserId } }).select(
      "-password"
    );
    console.log("Fetched Users:", users);
    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get specific user details by ID
export const getUserById = async (req, res) => {
  try {
    const { userId } = req.params; // Get user ID from URL params
    
    // Validate if userId is provided
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const user = await User.findById(userId).select("-password"); // don't send password

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
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
