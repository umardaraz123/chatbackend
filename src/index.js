import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
dotenv.config();
import authRoutes from './routes/auth.route.js';
import messageRoutes from './routes/message.route.js';
import { connectDB } from './lib/db.js';
import { createAdminIfNotExists } from './lib/createAdmin.js';

const app = express();
app.use(cookieParser()) 

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Update CORS for production
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? [process.env.FRONTEND_URL || 'https://boneandbone.netlify.app']
  : ['http://localhost:5173'];

console.log('CORS settings:', {
  environment: process.env.NODE_ENV,
  allowedOrigins
});

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      console.log(`Origin ${origin} not allowed by CORS`);
      // Consider allowing all origins in development
      if (process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      return callback(null, allowedOrigins[0]); // Default to first allowed origin
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

const PORT = process.env.PORT || 3000;

// Add a test route
app.get('/', (req, res) => {
  res.json({ message: 'Backend is working!' });
});

app.use('/api/auth', authRoutes)
app.use('/api/message', messageRoutes)

// Create HTTP server
const server = createServer(app);

// Create Socket.io server
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
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

// For Vercel export
export default app;

// Connect to database immediately 
console.log('🌐 Initializing database connection...');
connectDB()
  .then((connection) => {
    console.log('✅ Database connection established');
    return createAdminIfNotExists();
  })
  .then(() => {
    console.log('👤 Admin user verified');
  })
  .catch(err => {
    console.error('❌ Database initialization failed:', err);
    // Don't exit the process on error - let individual routes handle DB reconnection
  });

// Start server
const startServer = async () => {
  try {
    // In local development, wait a bit for the database connection to establish
    if (process.env.NODE_ENV !== 'production') {
      console.log('⏳ Waiting for database connection...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    server.listen(PORT, () => {
      console.log('🚀 Server started on port:' + PORT);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
  }
};

// Start server in all environments
// For Vercel, this won't actually start a listening server
// but the Express handlers will still work
startServer();