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
        completed: {
          $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] }
        },
        cancelled: {
          $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] }
        },
        missed: {
          $sum: { $cond: [{ $eq: ["$status", "missed"] }, 1, 0] }
        }
      }
    }
  ]);

  return stats[0] ?? {
    completed: 0,
    cancelled: 0,
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
        completed: {
          $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] }
        },
        cancelled: {
          $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] }
        }
      }
    }
  ]);

  return stats[0] ?? {
    completed: 0,
    cancelled: 0
  };
} 


