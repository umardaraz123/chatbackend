import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
dotenv.config();
import authRoutes from './routes/auth.route.js';
import messageRoutes from './routes/message.route.js';
import swipeRoutes from './routes/swipe.route.js'; // Add this import
import friendRequestRoutes from './routes/friendRequest.route.js'; // Add this import
import { connectDB } from './lib/db.js';
import { createAdminIfNotExists } from './lib/createAdmin.js';

const app = express();
app.use(cookieParser());

// Increase body size limit for photo/video uploads (100MB for videos)
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Update the allowedOrigins array to include your mobile IP without trailing slash
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? [process.env.FRONTEND_URL || 'https://boneandbone.netlify.app']
  : [
      'http://localhost:5173', 
      'http://localhost:3000'
    ];

// CORS configuration
app.use(cors({
  origin: function(origin, callback) {
    console.log('Request origin:', origin);
    
    // Allow requests with no origin (like mobile apps, curl requests)
    if (!origin) return callback(null, true);
    
    // In development, allow localhost
    if (process.env.NODE_ENV !== 'production') {
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }
    }
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    console.log(`Origin ${origin} not allowed by CORS`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  exposedHeaders: ['Set-Cookie']
}));

// Handle preflight requests
app.options('*', cors());

const PORT = process.env.PORT || 3000;

// Add a test route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Backend is working now!',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/message', messageRoutes);
app.use('/api/swipe', swipeRoutes); // Add this line
app.use('/api/friend-request', friendRequestRoutes); // Add this line

// Create HTTP server
const server = createServer(app);

// Create Socket.io server
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:5173',
      'https://boneandbone.netlify.app'
    ],
    credentials: true,
  }
});

// Online users mapping
const onlineUsers = new Map();

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // User comes online
  socket.on('online', (userId) => {
    onlineUsers.set(userId, socket.id);
    io.emit('userOnlineStatus', Array.from(onlineUsers.keys()));
  });

  // User joins a chat room (room name will be a composite of both user IDs)
  socket.on('joinChat', (chatRoom) => {
    socket.join(chatRoom);
    console.log(`User joined room: ${chatRoom}`);
  });

  // User sends a message
  socket.on('sendMessage', (message) => {
    const receiverSocketId = onlineUsers.get(message.receiverId);
    
    // Create a room name (using sorted user IDs to ensure consistency)
    const users = [message.senderId, message.receiverId].sort();
    const room = `chat_${users[0]}_${users[1]}`;
    
    // Send to the room (both sender and receiver)
    io.to(room).emit('receiveMessage', message);
    
    // If receiver is online, send notification
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('newMessageNotification', {
        senderId: message.senderId,
        message: message.text ? message.text : 'Sent you an image',
      });
    }
  });

  // Add new socket events for swipe notifications
  socket.on('newMatch', (matchData) => {
    const { user1Id, user2Id, matchInfo } = matchData;
    
    // Send match notification to both users
    const user1SocketId = onlineUsers.get(user1Id);
    const user2SocketId = onlineUsers.get(user2Id);
    
    if (user1SocketId) {
      io.to(user1SocketId).emit('matchNotification', {
        type: 'new_match',
        matchedUser: matchInfo.user2,
        message: "It's a match! 🎉"
      });
    }
    
    if (user2SocketId) {
      io.to(user2SocketId).emit('matchNotification', {
        type: 'new_match',
        matchedUser: matchInfo.user1,
        message: "It's a match! 🎉"
      });
    }
  });

  // Friend request notifications
  socket.on('friendRequestSent', (data) => {
    const { recipientId, requesterInfo } = data;
    const recipientSocketId = onlineUsers.get(recipientId);
    
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('friendRequestNotification', {
        type: 'friend_request',
        requester: requesterInfo,
        message: `${requesterInfo.fullName} sent you a friend request!`
      });
    }
  });

  // User starts typing
  socket.on('typing', ({chatRoom, userId}) => {
    socket.to(chatRoom).emit('userTyping', userId);
  });

  // User stops typing
  socket.on('stopTyping', (chatRoom) => {
    socket.to(chatRoom).emit('userStoppedTyping');
  });

  // User goes offline
  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
    
    // Find and remove disconnected user
    for (const [key, value] of onlineUsers.entries()) {
      if (value === socket.id) {
        onlineUsers.delete(key);
        io.emit('userOnlineStatus', Array.from(onlineUsers.keys()));
        break;
      }
    }
  });
});

// Initialize database connection
let dbInitialized = false;

const initializeApp = async () => {
  if (!dbInitialized) {
    try {
      console.log('🌐 Initializing database connection...');
      await connectDB();
      console.log('✅ Database connection established');
      
      await createAdminIfNotExists();
      console.log('👤 Admin user verified');
      
      dbInitialized = true;
    } catch (err) {
      console.error('❌ Database initialization failed:', err);
      // Don't throw error - let individual routes handle DB reconnection
    }
  }
};

// Initialize on startup
initializeApp();

// For Vercel serverless functions
export default app;

// Start server for local development
if (process.env.NODE_ENV !== 'production') {
  const startServer = async () => {
    try {
      await initializeApp();

      server.listen(PORT, () => {
        console.log(`🚀 Server started on http://localhost:${PORT}`);
        
      });
    } catch (error) {
      console.error('❌ Failed to start server:', error);
    }
  };

  startServer();
}