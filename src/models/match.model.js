// models/Match.js
import mongoose from 'mongoose';

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

// Use this pattern to prevent overwriting
const Match = mongoose.models.Match || mongoose.model('Match', matchSchema);

export default Match;