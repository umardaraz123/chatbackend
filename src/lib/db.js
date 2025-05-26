import mongoose from 'mongoose';

// Track connection state
let isConnected = false;

export const connectDB = async () => {
  // If already connected, reuse the connection
  if (isConnected) {
    console.log('👌 Using existing MongoDB connection');
    return;
  }

  try {
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
    
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    throw new Error(`MongoDB connection failed: ${error.message}`);
  }
};
