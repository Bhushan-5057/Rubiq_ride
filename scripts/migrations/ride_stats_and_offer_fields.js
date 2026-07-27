/**
 * Migration: backfill rideStats counters and ride offer fields.
 *
 * Idempotent:
 * - Only sets rideStats when missing
 * - Only sets currentOfferedDriver/skippedDrivers defaults when missing
 * - Re-running recalculates counters from Ride history (safe overwrite of counters)
 *
 * Usage:
 *   node scripts/migrations/ride_stats_and_offer_fields.js
 *   node scripts/migrations/ride_stats_and_offer_fields.js --rollback
 */
import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import { connectDB } from "../../src/config/dbConnect.js";
import { Driver } from "../../src/models/driver/driver.model.js";
import { Passenger } from "../../src/models/passenger/passenger.model.js";
import { Ride } from "../../src/models/ride/ride.model.js";

const isRollback = process.argv.includes("--rollback");

async function backfillRideOfferFields() {
  const result = await Ride.updateMany(
    {
      $or: [
        { currentOfferedDriver: { $exists: false } },
        { skippedDrivers: { $exists: false } },
      ],
    },
    {
      $set: {
        currentOfferedDriver: null,
        skippedDrivers: [],
      },
    },
  );
  console.log(
    `Ride offer fields backfilled. matched=${result.matchedCount} modified=${result.modifiedCount}`,
  );
}

async function backfillDriverRideStats() {
  const drivers = await Driver.find({}).select("_id");
  let updated = 0;

  for (const driver of drivers) {
    const [completed, cancelled, missed] = await Promise.all([
      Ride.countDocuments({ driver: driver._id, status: "completed" }),
      Ride.countDocuments({ driver: driver._id, status: "cancelled" }),
      // Historical misses: rides that ended as missed where driver was notified.
      Ride.countDocuments({
        status: "missed",
        notifiedDrivers: driver._id,
      }),
    ]);

    // Preserve higher missed counter if already incremented by live timeouts.
    const existing = await Driver.findById(driver._id).select("rideStats");
    const missedCount = Math.max(existing?.rideStats?.missed || 0, missed);

    await Driver.updateOne(
      { _id: driver._id },
      {
        $set: {
          rideStats: {
            completed,
            cancelled,
            missed: missedCount,
          },
        },
      },
    );
    updated += 1;
  }

  console.log(`Driver rideStats backfilled for ${updated} drivers`);
}

async function backfillPassengerRideStats() {
  const passengers = await Passenger.find({}).select("_id");
  let updated = 0;

  for (const passenger of passengers) {
    const [completed, cancelled] = await Promise.all([
      Ride.countDocuments({ passenger: passenger._id, status: "completed" }),
      Ride.countDocuments({ passenger: passenger._id, status: "cancelled" }),
    ]);

    await Passenger.updateOne(
      { _id: passenger._id },
      {
        $set: {
          rideStats: {
            completed,
            cancelled,
          },
        },
      },
    );
    updated += 1;
  }

  console.log(`Passenger rideStats backfilled for ${updated} passengers`);
}

async function rollback() {
  await Ride.updateMany(
    {},
    {
      $unset: {
        currentOfferedDriver: "",
        skippedDrivers: "",
      },
    },
  );
  await Driver.updateMany({}, { $unset: { rideStats: "" } });
  await Passenger.updateMany({}, { $unset: { rideStats: "" } });
  console.log("Rollback complete: removed rideStats and offer fields");
}

async function run() {
  await connectDB();

  if (isRollback) {
    await rollback();
  } else {
    await backfillRideOfferFields();
    await backfillDriverRideStats();
    await backfillPassengerRideStats();
  }

  await mongoose.connection.close();
  console.log("Migration finished");
}

run().catch(async (error) => {
  console.error("Migration failed:", error);
  try {
    await mongoose.connection.close();
  } catch {
    // ignore
  }
  process.exit(1);
});
