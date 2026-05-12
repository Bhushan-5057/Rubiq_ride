import dotenv from 'dotenv';
dotenv.config();
import { Worker } from "bullmq";
import { connectDB, mongoose } from "../config/dbConnect.js";
import { initRedis, getRedis } from '../config/redis.js';
import { Ride } from "../models/ride/ride.model.js";
import { autoAssignRideToNextDriver } from "../helpers/autoAssignRide.helper.js";
import { getIO } from "../config/socket/socket.js";

const shutdownWorker = async (worker) => {
  console.log('🛑 Shutting down worker...');
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

          const ride = await Ride.findById(job.data.rideId)
            .populate('notifiedDrivers');

          if (!ride) {
            console.log(`❌ Ride ${job.data.rideId} not found`);
            return;
          }

          if (ride.status !== "pending") {
            console.log(`ℹ️ Ride ${ride._id} already ${ride.status}`);
            return;
          }

          // Update ride status to missed
          ride.status = "missed";
          await ride.save();

          // Notify passenger
          const io = getIO();
          io.to(ride.passenger.toString()).emit("ride_missed", {
            rideId: ride._id,
            message: "No driver accepted your ride.",
          });

          // Try to reassign
          await autoAssignRideToNextDriver(ride);

          console.log(`🚀 Successfully processed timeout for ride ${ride._id}`);
        } catch (error) {
          console.error("❌ Error in ride timeout worker:", error);
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
      console.log(`✅ Job ${job.id} completed successfully`);
    });

    worker.on('failed', (job, error) => {
      console.error(`❌ Job ${job?.id} failed:`, error.message);
    });

    worker.on('error', (error) => {
      console.error('❌ Worker error:', error);
    });

    console.log('✅ Ride timeout worker started');
    return worker;
  } catch (error) {
    console.error('❌ Failed to create worker:', error);
    process.exit(1);
  }
};

createWorker().then(worker => {
  const shutdownHandler = async () => {
    await shutdownWorker(worker);
  };

  process.on('SIGTERM', shutdownHandler);
  process.on('SIGINT', shutdownHandler);
  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    shutdownHandler().then(() => process.exit(1));
  });
}).catch(error => {
  console.error('❌ Failed to start worker:', error);
  process.exit(1);
});
