// src/queues/rideTimeout.queue.js
import { Queue } from "bullmq";
import { redis } from "../config/redis.js";

const queueOptions = {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: true,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000, // 5 seconds
    },
  },
};

export const rideTimeoutQueue = new Queue("rideTimeoutQueue", queueOptions);

// Add job with retry logic
export const addRideTimeoutJob = async (rideId, delay = 60000) => {
  const createdAt = Date.now();
  const expectedFireAt = new Date(createdAt + delay);

  console.log(
    "🕒 RIDE TIMEOUT JOB CREATED",
    "\nRide ID:", rideId,
    "\nCreated At:", new Date(createdAt).toISOString(),
    "\nExpected Fire At:", expectedFireAt.toISOString(),
    "\nDelay:", delay / 1000, "seconds"
  );

  try {
    const job = await rideTimeoutQueue.add(
      "rideTimeout",
      {
        rideId,
        createdAt, // 👈 used to calculate real delay
      },
      {
        delay, // 1 minute
        jobId: `ride_timeout_${rideId}`, // unchanged
        removeOnComplete: true,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
      }
    );

    console.log(`✅ Ride timeout job added. Job ID: ${job.id}`);
    return job;
  } catch (error) {
    console.error("❌ Error adding ride timeout job:", error);
    throw error;
  }
};

// Clean up function
export const cleanupQueue = async () => {
  await rideTimeoutQueue.clean(0, 1000, "completed");
  await rideTimeoutQueue.clean(0, 1000, "failed");
};
