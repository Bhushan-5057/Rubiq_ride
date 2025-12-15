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
export const addRideTimeoutJob = async (rideId, delay = 15000) => {
  try {
    const job = await rideTimeoutQueue.add(
      "rideTimeout",
      { rideId },
      {
        delay, // 15 seconds delay
        jobId: `ride_timeout_${rideId}`,
        removeOnComplete: true,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
      }
    );
    console.log(`Added ride timeout job ${job.id} for ride ${rideId}`);
    return job;
  } catch (error) {
    console.error("Error adding ride timeout job:", error);
    throw error;
  }
};

// Clean up function
export const cleanupQueue = async () => {
  await rideTimeoutQueue.clean(0, 1000, "completed");
  await rideTimeoutQueue.clean(0, 1000, "failed");
};