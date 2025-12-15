import mongoose from "mongoose";

// Keep track of the connection status
let connection = null;

export async function connectDB() {
  if (connection) {
    console.log('Using existing database connection');
    return connection;
  }

  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error("MongoDB connection string (MONGODB_URI) is missing in environment variables");
    }

    mongoose.set("strictQuery", true);

    const options = {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      retryWrites: true,
      w: 'majority'
    };

    console.log('Connecting to MongoDB...');
    await mongoose.connect(uri, options);
    connection = mongoose.connection;
    
    connection.on("disconnected", () => {
      console.warn("MongoDB disconnected. Attempting to reconnect...");
      connection = null;
    });

    connection.on("reconnected", () => {
      console.log("MongoDB reconnected");
    });

    connection.on("error", (err) => {
      console.error("MongoDB connection error:", err);
      connection = null;
    });

    console.log("MongoDB connected successfully");
    return connection;
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
    throw error;
  }
}

// Export the connection status
export function isDBConnected() {
  return connection !== null && connection.readyState === 1;
} 

export { mongoose };