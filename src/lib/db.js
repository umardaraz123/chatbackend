import mongoose from 'mongoose';

// File retained for database connection logic if needed.

// Track connection state
let isConnected = false;

export const connectDB = async () => {
  try {
    // If already connected, reuse the connection
    if (isConnected && mongoose.connection && mongoose.connection.readyState === 1) {
      console.log('👌 Using existing MongoDB connection');
      return mongoose.connection;
    }

    // Check if MongoDB URI is defined
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    console.log('🔄 Creating new MongoDB connection...');
    
    // Set mongoose options for serverless environments
    mongoose.set('strictQuery', false);
    
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000, // Increased timeout for Vercel
      socketTimeoutMS: 60000, // Increased socket timeout
      maxPoolSize: 10, // Reduce pool size for serverless
    });

    isConnected = true;
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    
    // Handle disconnection events
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected!');
      isConnected = false;
    });
    
    return mongoose.connection;
    
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    isConnected = false;
    throw new Error(`MongoDB connection failed: ${error.message}`);
  }
};
