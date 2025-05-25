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
    bio: { type: String },
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
    
    role: { type: String, enum: ['admin', 'customer'], default: 'customer' }
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);

export default User;
