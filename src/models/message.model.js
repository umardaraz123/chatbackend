import mongoose from "mongoose";
import User from "./user.model.js";
const messageSchema = new mongoose.Schema({ 
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: User,
        required: true,
    },
    receiverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: User,
        required: true,
    },
    text: {
        type: String,
        
    },
    image: {
        type: String,
        
    },
    audio: {
        type: String,
    },
    audioDuration: {
        type: Number,
    },
    read: {
        type: Boolean,
        default: false,
    },

    // Message Reactions
    reactions: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        emoji: { type: String, required: true },
        createdAt: { type: Date, default: Date.now }
    }],
   
    },
    { timestamps: true }

);

    const Message = mongoose.model("Message", messageSchema);
    export default Message;