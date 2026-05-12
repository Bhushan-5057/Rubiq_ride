import Redis from "ioredis";

let redis;

export const initRedis = () => {
  if (redis) return redis;

  const host = process.env.REDIS_HOST || "127.0.0.1";
  const port = Number(process.env.REDIS_PORT || "6379");
  const password = process.env.REDIS_PASSWORD;

  if (!host || !port || !password) {
    throw new Error("❌ Missing Redis config (HOST / PORT / PASSWORD)");
  }

  redis = new Redis({
    host,
    port,
    password,
    tls: {}, // ✅ REQUIRED FOR UPSTASH
    maxRetriesPerRequest: null,
    retryStrategy: (times) => Math.min(times * 1000, 5000),
  });

  redis.on("connect", () => {
    console.log("✅ Connected to Redis (Upstash)");
  });

  redis.on("error", (err) => {
    console.error("❌ Redis error:", err);
  });

  return redis;
};

export const getRedis = () => {
  if (!redis) return initRedis();
  return redis;
};
