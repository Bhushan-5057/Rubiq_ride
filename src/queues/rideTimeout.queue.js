// // src/queues/rideTimeout.queue.js
// import { Queue } from "bullmq";
// import { getRedis } from "../config/redis.js";

// let redis
// const getRedisConnection = () => {
//   if (!redis) redis = getRedis()
//   return redis
// }

// const queueOptions = {
//   connection: getRedisConnection(),
//   defaultJobOptions: {
//     removeOnComplete: true,
//     attempts: 3,
//     backoff: {
//       type: "exponential",
//       delay: 5000, // 5 seconds
//     },
//   },
// };

// let rideTimeoutQueue;

// export const getRideTimeoutQueue = () => {
//   if (!rideTimeoutQueue) {
//     rideTimeoutQueue = new Queue("rideTimeoutQueue", queueOptions);
//   }
//   return rideTimeoutQueue;
// };

// // Add job with retry logic
// export const addRideTimeoutJob = async (rideId, delay = 60000) => {
//   const createdAt = Date.now();
//   const expectedFireAt = new Date(createdAt + delay);

//   console.log(
//     "🕒 RIDE TIMEOUT JOB CREATED",
//     "\nRide ID:", rideId,
//     "\nCreated At:", new Date(createdAt).toISOString(),
//     "\nExpected Fire At:", expectedFireAt.toISOString(),
//     "\nDelay:", delay / 1000, "seconds"
//   );

//   try {
//     const job = await getRideTimeoutQueue().add(
//       "rideTimeout",
//       {
//         rideId,
//         createdAt, // 👈 used to calculate real delay
//       },
//       {
//         delay, // 1 minute
//         jobId: `ride_timeout_${rideId}`, // unchanged
//         removeOnComplete: true,
//         attempts: 3,
//         backoff: {
//           type: "exponential",
//           delay: 5000,
//         },
//       }
//     );

//     console.log(`✅ Ride timeout job added. Job ID: ${job.id}`);
//     return job;
//   } catch (error) {
//     console.error("❌ Error adding ride timeout job:", error);
//     throw error;
//   }
// };

// // Clean up function
// export const cleanupQueue = async () => {
//    const queue = getRideTimeoutQueue();
//   await rideTimeoutQueue.clean(0, 1000, "completed");
//   await rideTimeoutQueue.clean(0, 1000, "failed");
// }; 

import { Queue } from "bullmq";
import { getRedis } from "../config/redis.js";

let redis;
const getRedisConnection = () => {
  if (!redis) redis = getRedis();
  return redis;
};

let rideTimeoutQueue;

export const getRideTimeoutQueue = () => {
  if (!rideTimeoutQueue) {
    rideTimeoutQueue = new Queue("rideTimeoutQueue", {
      connection: getRedisConnection(),
      defaultJobOptions: {
        removeOnComplete: true,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
      },
    });
  }
  return rideTimeoutQueue;
};

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
    const job = await getRideTimeoutQueue().add(
      "rideTimeout",
      { rideId, createdAt },
      {
        delay,
        jobId: `ride_timeout_${rideId}`,
      }
    );

    console.log(`✅ Ride timeout job added. Job ID: ${job.id}`);
    return job;
  } catch (error) {
    console.error("❌ Error adding ride timeout job:", error);
    throw error;
  }
};

// Cleanup
export const cleanupQueue = async () => {
  const queue = getRideTimeoutQueue();
  await queue.clean(0, 1000, "completed");
  await queue.clean(0, 1000, "failed");
};

