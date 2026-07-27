import dotenv from 'dotenv';
dotenv.config();
import { Worker } from "bullmq";
import { connectDB, mongoose } from "../config/dbConnect.js";
import { initRedis, getRedis } from '../config/redis.js';
import { Ride } from "../models/ride/ride.model.js";
import {
  markCurrentDriverMissed,
  offerRideToNextDriver,
} from "../helpers/autoAssignRide.helper.js";

const isBullMQEnabled = process.env.ENABLE_BULLMQ === "true";

const shutdownWorker = async (worker) => {
  console.log('Shutting down worker...');
  if (worker) {
    await worker.close();
    console.log('Worker closed');
  }
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
  setTimeout(() => process.exit(0), 500);
};

const createWorker = async () => {
  if (!isBullMQEnabled) {
    console.log("BullMQ is disabled.");
    return null;
  }

  console.log("BullMQ is enabled.");

  try {
    await connectDB();
    initRedis();

    const redis = getRedis();

    const worker = new Worker(
      "rideTimeoutQueue",
      async (job) => {
        try {
          const now = Date.now();
          const createdAt = job.data.createdAt;
          const actualDelaySec = createdAt
            ? ((now - createdAt) / 1000).toFixed(2)
            : "UNKNOWN";

          console.log(
            "\n⏰ RIDE TIMEOUT EXECUTED",
            "\nRide ID:", job.data.rideId,
            "\nExecuted At:", new Date(now).toISOString(),
            "\nActual Delay:", actualDelaySec, "seconds"
          );

          const ride = await Ride.findById(job.data.rideId).populate({
            path: "passenger",
            select: "name contactNumber rating",
          });

          if (!ride) {
            console.log(`Ride ${job.data.rideId} not found`);
            return;
          }

          // Only rotate offers while the ride is still waiting for acceptance.
          if (ride.status !== "pending") {
            console.log(`Ride ${ride._id} already ${ride.status}`);
            return;
          }

          // Current offer window expired → missed for that driver only.
          // Ride status stays pending; passenger is not notified.
          const missResult = await markCurrentDriverMissed(ride);
          if (!missResult.stillPending) {
            console.log(
              `Ride ${ride._id} left pending during timeout; skipping rotation`,
            );
            return;
          }

          // Re-load to pick up skippedDrivers / status after concurrent accept.
          const latest = await Ride.findById(ride._id).populate({
            path: "passenger",
            select: "name contactNumber rating",
          });

          if (!latest || latest.status !== "pending") {
            console.log(
              `Ride ${ride._id} no longer pending after timeout handling`,
            );
            return;
          }

          await offerRideToNextDriver(latest, {
            scheduleTimeout: true,
            passengerPayload: {
              passenger: latest.passenger
                ? {
                    name: latest.passenger.name,
                    contactNumber: latest.passenger.contactNumber,
                    rating: latest.passenger.rating,
                  }
                : undefined,
            },
          });

          console.log(`Successfully rotated offer for ride ${ride._id}`);
        } catch (error) {
          console.error("Error in ride timeout worker:", error);
          throw error;
        }
      },
      {
        connection: redis,
        concurrency: 5,
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
      }
    );

    worker.on('completed', (job) => {
      console.log(`Job ${job.id} completed successfully`);
    });

    worker.on('failed', (job, error) => {
      console.error(`Job ${job?.id} failed:`, error.message);
    });

    worker.on('error', (error) => {
      console.error('Worker error:', error);
    });

    console.log('Ride timeout worker started');
    return worker;
  } catch (error) {
    console.error('Failed to create worker:', error);
    process.exit(1);
  }
};

createWorker().then((worker) => {
  if (!worker) {
    return;
  }

  const shutdownHandler = async () => {
    await shutdownWorker(worker);
  };

  process.on('SIGTERM', shutdownHandler);
  process.on('SIGINT', shutdownHandler);
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    shutdownHandler().then(() => process.exit(1));
  });
}).catch((error) => {
  console.error('Failed to start worker:', error);
  process.exit(1);
});
