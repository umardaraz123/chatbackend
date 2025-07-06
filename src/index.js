import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
dotenv.config();
import userRoutes from './routes/user.route.js';
import productRoutes from './routes/product.route.js';
import authRoutes from './routes/auth.route.js';
import { connectDB } from './lib/db.js';
import { createAdmin } from './controllers/user.controller.js';

const app = express();
app.use(cookieParser());


app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(express.json({ limit: '10mb' })); // or higher, e.g. '20mb'
// Update the allowedOrigins array to include your mobile IP without trailing slash
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? [process.env.FRONTEND_URL || 'https://boneandbone.netlify.app']
  : [
      'http://localhost:5173', 
      'http://localhost:3000', 
      'http://192.168.18.118:5173'  // Remove the trailing slash
    ];

// Also update CORS to be more permissive in development
app.use(cors({
  origin: function(origin, callback) {
    console.log('Request origin:', origin); // Debug log
    
    // Allow requests with no origin (like mobile apps, curl requests)
    if (!origin) return callback(null, true);
    
    // In development, be more permissive
    if (process.env.NODE_ENV !== 'production') {
      // Allow any origin that starts with your IP
      if (origin.startsWith('http://192.168.18.118')) {
        return callback(null, true);
      }
      // Allow localhost origins
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
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

const PORT = process.env.PORT || 3000;

// Add a test route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Backend is working now!',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});


// API Routes
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/auth', authRoutes);

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




// Initialize database connection
let dbInitialized = false;

const initializeApp = async () => {
  if (!dbInitialized) {
    try {
      console.log('🌐 Initializing database connection...');
      await connectDB();
      console.log('✅ Database connection established');
      
      // Create admin user after DB connection
      await createAdmin();
      console.log('✅ Admin user ensured');
      
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

      server.listen(PORT,'0.0.0.0', () => {
        console.log(`🚀 Server started on port: ${PORT}`);
        
      });
    } catch (error) {
      console.error('❌ Failed to start server:', error);
    }
  };

  startServer();
}