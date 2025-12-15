// src/config/redis.js
import { Redis } from "ioredis";

const redisConfig = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy: (times) => {
    const delay = Math.min(times * 1000, 5000);
    return delay;
  },
  reconnectOnError: (err) => {
    const targetError = "READONLY";
    if (err.message.includes(targetError)) {
      return true; // or return 1 or 2 to delay the reconnection
    }
    return false;
  }
};

export const redis = new Redis(redisConfig);

// Handle Redis connection events
redis.on('connect', () => {
  console.log('Connected to Redis');
});

redis.on('error', (err) => {
  console.error('Redis error:', err);
});

// Test the connection
const testConnection = async () => {
  try {
    await redis.ping();
    console.log('Redis connection test successful');
  } catch (err) {
    console.error('Redis connection test failed:', err);
  }
};

testConnection();