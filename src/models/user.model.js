import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    dateOfBirth: { type: Date, required: true },
    gender: { type: String, required: true },
 
    profilePic: { type: String },
    photos: [{ type: String }], // Array of photo URLs for gallery
    videos: [{ type: String }], // Array of video URLs
    bio: { type: String },
    profession: { type: String }, // Professional title (e.g., "Professional model")
    lifeGoal: { type: String }, // Life goal/quote
    location: { type: String },
    interests: { type: [String], default: [] }, // Ensure it's an array
    lookingFor: { type: String },
    
    // Support both formats for backward compatibility
    preferredAgeRange: { 
      type: mongoose.Schema.Types.Mixed, // Allows both string and object
      default: { min: 18, max: 100 }
    },
    
    phoneNumber: { type: String },
    hairs: { type: String },
    eyes: { type: String },
    height: { type: String },
    weight: { type: String },
    sociability: { type: String },
    orientation: { type: String },
    smoking: { type: String },
    alcohol: { type: String },
    relationship: { type: String },
    
    role: { type: String, enum: ['admin', 'customer'], default: 'customer' },
    
    friends: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],

    // Block system
    blockedUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],

    // Profile Views tracking
    profileViews: [{
      viewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      viewedAt: { type: Date, default: Date.now }
    }],

    // Profile Boost (30-min visibility boost)
    boostActive: { type: Boolean, default: false },
    boostExpiresAt: { type: Date, default: null },
    boostCount: { type: Number, default: 3 }, // free boosts per day

    // Super Likes
    superLikesLeft: { type: Number, default: 5 },
    superLikesResetAt: { type: Date, default: null },

    // User Mood / Status
    mood: {
      type: String,
      enum: ['happy', 'flirty', 'chill', 'adventurous', 'lonely', 'excited', null],
      default: null
    },
    moodUpdatedAt: { type: Date, default: null },

    // Last Active / Online Status
    lastActive: { type: Date, default: null },

    // Daily Login Streak
    streak: { type: Number, default: 0 },
    lastStreakDate: { type: Date, default: null },

    // Reports
    reports: [{
      reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      reason: { type: String, enum: ['spam', 'fake', 'inappropriate', 'harassment', 'other'] },
      reportedAt: { type: Date, default: Date.now }
    }],
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);

export default User;
