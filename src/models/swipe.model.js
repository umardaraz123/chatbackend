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
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure a user can only swipe once on another user
swipeSchema.index({ swiper: 1, swiped: 1 }, { unique: true });

export default mongoose.model('Swipe', swipeSchema);