import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import mongoose from "mongoose";

// Get users for chat sidebar
export const getUsersForSidebar = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    // Get all users except current user and admins
    const users = await User.find({ 
      _id: { $ne: currentUserId },
      role: { $ne: 'admin' }
    }).select("-password");

    return res.status(200).json(users);
  } catch (error) {
    console.error("Error in getUsersForSidebar controller: ", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Get messages between current user and selected user
export const getMessages = async (req, res) => {
  try {
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    // Validate user ID
    if (!mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    // Find messages between the two users (in both directions)
    const messages = await Message.find({
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
    }).sort({ createdAt: 1 });

    return res.status(200).json(messages);
  } catch (error) {
    console.error("Error in getMessages controller: ", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Send message to another user
export const sendMessage = async (req, res) => {
  try {
    const { id: receiverId } = req.params;
    const senderId = req.user._id;
    const { text, image } = req.body;

    // Validate user ID
    if (!mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    // Check if receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ error: "Receiver not found" });
    }

    // Create new message
    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image,
    });

    // Save message to database
    await newMessage.save();

    // Emit socket event (will be handled in WebSocket setup)

    return res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error in sendMessage controller: ", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};