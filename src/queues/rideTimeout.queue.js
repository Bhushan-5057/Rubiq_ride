import { Queue } from "bullmq";
import { getRedis } from "../config/redis.js";

let rideTimeoutQueue;
let bullmqStatusLogged = false;

const isBullMQEnabled = () => process.env.ENABLE_BULLMQ === "true";

const logBullMQStatus = () => {
  if (!bullmqStatusLogged) {
    console.log(isBullMQEnabled() ? "BullMQ is enabled." : "BullMQ is disabled.");
    bullmqStatusLogged = true;
  }
};

export const getRideTimeoutQueue = () => {
  if (!isBullMQEnabled()) {
    logBullMQStatus();
    return null;
  }

  if (!rideTimeoutQueue) {
    rideTimeoutQueue = new Queue("rideTimeoutQueue", {
      connection: getRedis(),
      defaultJobOptions: {
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    });
  }

  return rideTimeoutQueue;
};

export const addRideTimeoutJob = async (rideId, delay = 60000) => {
  const queue = getRideTimeoutQueue();

  if (!queue) {
    return null;
  }

  const existingJob = await queue.getJob(rideId.toString());

  if (existingJob) {
    console.log(`Timeout job already exists for ride ${rideId}`);
    return existingJob;
  }

  return queue.add(
    "rideTimeout",
    {
      rideId,
      createdAt: Date.now(),
    },
    {
      delay,
      jobId: rideId.toString(),
      removeOnComplete: 1000,
      removeOnFail: 5000,
    }
  );
};

export const removeRideTimeoutJob = async (rideId) => {
  const queue = getRideTimeoutQueue();

  if (!queue) {
    return null;
  }

  const job = await queue.getJob(rideId.toString());

  if (job) {
    await job.remove();
    console.log(`Removed timeout job for ride ${rideId}`);
  }
};

export const cleanupQueue = async () => {
  const queue = getRideTimeoutQueue();

  if (!queue) {
    return null;
  }

  await queue.clean(0, 1000, "completed");
  await queue.clean(0, 1000, "failed");
};