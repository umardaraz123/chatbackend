// models/friendRequest.model.js
import mongoose from 'mongoose';

const friendRequestSchema = new mongoose.Schema({
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

friendRequestSchema.index({ requester: 1, recipient: 1 }, { unique: true });

export default mongoose.model('FriendRequest', friendRequestSchema);