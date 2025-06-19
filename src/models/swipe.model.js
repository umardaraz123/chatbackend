// models/swipe.model.js
import mongoose from 'mongoose';

const swipeSchema = new mongoose.Schema({
  swiper: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  swiped: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    enum: ['like', 'dislike'],
    required: true
  },
  likeType: {
    type: String,
    enum: ['crush', 'intrigued', 'curious', 'fun'],
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure a user can only swipe once on another user
swipeSchema.index({ swiper: 1, swiped: 1 }, { unique: true });

const matchSchema = new mongoose.Schema({
  users: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  isMutualEmotion: {
    type: Boolean,
    default: false
  },
  yourLikeType: {
    type: String,
    enum: ['crush', 'intrigued', 'curious', 'fun'],
    default: null
  },
  theirLikeType: {
    type: String,
    enum: ['crush', 'intrigued', 'curious', 'fun'],
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Swipe', swipeSchema);
export const Match = mongoose.model('Match', matchSchema);