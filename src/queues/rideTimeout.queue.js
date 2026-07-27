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

/**
 * @param {string} rideId
 * @param {number} delay
 * @param {{ forceNew?: boolean }} [options]
 *   forceNew — schedule a fresh delayed job even if a prior jobId is still active
 *   (needed when auto-reassign runs inside the timeout worker).
 */
export const addRideTimeoutJob = async (
  rideId,
  delay = 10_000,
  options = {},
) => {
  const queue = getRideTimeoutQueue();

  if (!queue) {
    return null;
  }

  const rid = rideId.toString();
  const { forceNew = false } = options;
  const jobId = forceNew ? `${rid}:${Date.now()}` : rid;

  if (!forceNew) {
    const existingJob = await queue.getJob(rid);

    if (existingJob) {
      const state = await existingJob.getState();
      if (state === "completed" || state === "failed") {
        await existingJob.remove();
      } else {
        console.log(`Timeout job already exists for ride ${rid} (${state})`);
        return existingJob;
      }
    }
  }

  return queue.add(
    "rideTimeout",
    {
      rideId: rid,
      createdAt: Date.now(),
    },
    {
      delay,
      jobId,
      removeOnComplete: 1000,
      removeOnFail: 5000,
    },
  );
};

export const removeRideTimeoutJob = async (rideId) => {
  const queue = getRideTimeoutQueue();

  if (!queue) {
    return null;
  }

  const rid = rideId.toString();
  // Cover both canonical jobId (rideId) and forceNew suffixes (rideId:timestamp).
  const jobs = await queue.getJobs(["delayed", "wait", "waiting", "paused"]);

  for (const job of jobs) {
    if (job?.data?.rideId?.toString() !== rid) continue;
    try {
      await job.remove();
      console.log(`Removed timeout job ${job.id} for ride ${rid}`);
    } catch (error) {
      console.warn(
        `Unable to remove timeout job ${job?.id} for ride ${rid}:`,
        error.message,
      );
    }
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
