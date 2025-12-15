import { Ride } from "../../models/ride/ride.model.js";
import mongoose from "mongoose";

// Driver Stats
export async function getDriverStats(driverId) {
  const stats = await Ride.aggregate([
    {
      $match: {
        driver: new mongoose.Types.ObjectId(driverId)
      }
    },
    {
      $group: {
        _id: null,
        accepted: {
          $sum: { $cond: [{ $eq: ["$status", "accepted"] }, 1, 0] }
        },
        completed: {
          $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] }
        },
        rejected: {
          $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] }
        },
        missed: {
          $sum: { $cond: [{ $eq: ["$status", "missed"] }, 1, 0] }
        }
      }
    }
  ]);

  return stats[0] ?? {
    accepted: 0,
    completed: 0,
    rejected: 0,
    missed: 0
  };
}

// Passenger Stats
export async function getPassengerStats(passengerId) {
  const stats = await Ride.aggregate([
    {
      $match: {
        passenger: new mongoose.Types.ObjectId(passengerId)
      }
    },
    {
      $group: {
        _id: null,
        created: {
          $sum: { $cond: [{ $eq: ["$status", "created"] }, 1, 0] }
        },
        completed: {
          $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] }
        },
        canceled: {
          $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] }
        }
      }
    }
  ]);

  return stats[0] ?? {
    created: 0,
    completed: 0,
    canceled: 0
  };
}
