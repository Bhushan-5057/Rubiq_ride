import { Redis } from "ioredis";
import config from "../helpers/systemConfig.helper.js";

let redis;

export const initRedis = () => {
  if (redis) return redis;

  const portValue = config.get("REDIS_PORT", "6379"); 
  const port = Number(portValue);

  const redisConfig = {
    host: config.get("REDIS_HOST", "127.0.0.1"),
    port: Number.isNaN(port) ? 6379 : port,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: (times) => {
      const delay = Math.min(times * 1000, 5000);
      return delay;
    },
    reconnectOnError: (err) => {
      const targetError = "READONLY";
      if (err.message.includes(targetError)) {
        return true;
      }
      return false;
    },
  };

  console.log("REDIS PORT RAW:", config.get("REDIS_PORT"))

  redis = new Redis(redisConfig);

  // Handle Redis connection events
  redis.on("connect", () => {
    console.log("Connected to Redis");
  });

  redis.on("error", (err) => {
    console.error("Redis error:", err);
  });

  // Test the connection
  (async () => {
    try {
      await redis.ping();
      console.log("Redis connection test successful");
    } catch (err) {
      console.error("Redis connection test failed:", err);
    }
  })();

  return redis;
};

export const getRedis = () => {
  if (!redis) {
    return initRedis();
  }
  return redis;
};