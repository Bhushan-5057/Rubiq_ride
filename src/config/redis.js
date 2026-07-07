import Redis from "ioredis";

let redis;
let bullmqStatusLogged = false;

const isBullMQEnabled = () => process.env.ENABLE_BULLMQ === "true";

const logBullMQStatus = () => {
  if (!bullmqStatusLogged) {
    console.log(isBullMQEnabled() ? "BullMQ is enabled." : "BullMQ is disabled.");
    bullmqStatusLogged = true;
  }
};

export const initRedis = () => {
  logBullMQStatus();

  if (!isBullMQEnabled()) {
    return null;
  }

  if (redis) return redis;

  redis = new Redis({
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.REDIS_PORT || 6379),
    maxRetriesPerRequest: null,
    retryStrategy: (times) => Math.min(times * 1000, 5000),
  });

  redis.on("connect", () => {
    console.log("✅ Redis Connected");
  });

  redis.on("error", (err) => {
    console.error("Redis Error:", err);
  });

  return redis;
};

export const getRedis = () => {
  if (!isBullMQEnabled()) {
    logBullMQStatus();
    return null;
  }

  return redis || initRedis();
};