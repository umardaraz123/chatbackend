// controllers/friendRequest.controller.js
import FriendRequest from '../models/friendRequest.model.js';
import User from '../models/user.model.js';
import Swipe from '../models/swipe.model.js';

export const sendFriendRequest = async (req, res) => {
  try {
    const { recipientId } = req.body;
    const requesterId = req.user._id;

    if (requesterId.toString() === recipientId) {
      return res.status(400).json({ message: "Cannot send friend request to yourself" });
    }

    // Check if recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if they're already friends
    const requester = await User.findById(requesterId);
    if (requester.friends && requester.friends.includes(recipientId)) {
      return res.status(400).json({ message: "Already friends with this user" });
    }

    // Check if friend request already exists
    const existingRequest = await FriendRequest.findOne({
      $or: [
        { requester: requesterId, recipient: recipientId },
        { requester: recipientId, recipient: requesterId }
      ]
    });

    if (existingRequest) {
      return res.status(400).json({ message: "Friend request already exists" });
    }

    // Check if there's any interaction (like or match) between users
    const hasInteraction = await Swipe.findOne({
      $or: [
        { swiper: requesterId, swiped: recipientId, action: 'like' },
        { swiper: recipientId, swiped: requesterId, action: 'like' }
      ]
    });

    if (!hasInteraction) {
      return res.status(400).json({ 
        message: "You can only send friend requests to people you've liked or who have liked you" 
      });
    }

    // Create friend request
    const friendRequest = new FriendRequest({
      requester: requesterId,
      recipient: recipientId,
      status: 'pending'
    });

    await friendRequest.save();

    // Populate the friend request with user details
    await friendRequest.populate('requester', 'firstName lastName profilePic');
    await friendRequest.populate('recipient', 'firstName lastName profilePic');

    res.status(201).json({ 
      message: "Friend request sent successfully",
      friendRequest 
    });

  } catch (error) {
    console.error('Error sending friend request:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getFriendRequests = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get incoming friend requests
    const incomingRequests = await FriendRequest.find({
      recipient: userId,
      status: 'pending'
    }).populate('requester', 'firstName lastName profilePic bio email');

    // Get outgoing friend requests
    const outgoingRequests = await FriendRequest.find({
      requester: userId,
      status: 'pending'
    }).populate('recipient', 'firstName lastName profilePic bio email');

    res.status(200).json({
      incoming: incomingRequests,
      outgoing: outgoingRequests
    });

  } catch (error) {
    console.error('Error fetching friend requests:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const respondToFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action } = req.body; // 'accept' or 'decline'
    const userId = req.user._id;

    const friendRequest = await FriendRequest.findById(requestId);
    
    if (!friendRequest) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    if (friendRequest.recipient.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Not authorized to respond to this request" });
    }

    if (friendRequest.status !== 'pending') {
      return res.status(400).json({ message: "Friend request already processed" });
    }

    if (action === 'accept') {
      // Update friend request status
      friendRequest.status = 'accepted';
      await friendRequest.save();

      // Add each other as friends
      await User.findByIdAndUpdate(
        friendRequest.requester,
        { $addToSet: { friends: friendRequest.recipient } }
      );
      
      await User.findByIdAndUpdate(
        friendRequest.recipient,
        { $addToSet: { friends: friendRequest.requester } }
      );

      res.status(200).json({ message: "Friend request accepted" });
    } else if (action === 'decline') {
      friendRequest.status = 'declined';
      await friendRequest.save();
      
      res.status(200).json({ message: "Friend request declined" });
    } else {
      res.status(400).json({ message: "Invalid action" });
    }

  } catch (error) {
    console.error('Error responding to friend request:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getFriends = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const user = await User.findById(userId).populate('friends', 'firstName lastName profilePic bio email location');
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const friends = user.friends.map(friend => ({
      _id: friend._id,
      firstName: friend.firstName,
      lastName: friend.lastName,
      fullName: `${friend.firstName} ${friend.lastName}`,
      profilePic: friend.profilePic,
      bio: friend.bio,
      email: friend.email,
      location: friend.location
    }));

    res.status(200).json(friends);

  } catch (error) {
    console.error('Error fetching friends:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};