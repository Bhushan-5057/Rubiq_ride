import mongoose from "mongoose";
import { Ride } from "../../../../models/ride/ride.model.js";

//-------------------------------------- Driver Ride Stats ----------------------------------------------
export const getDriverRideStatsAggregation = async (
  driverId
) => {
  return Ride.aggregate([
    {
      $match: {
        driver: new mongoose.Types.ObjectId(driverId),
      },
    },
    {
      $group: {
        _id: null,

        completedRides: {
          $sum: {
            $cond: [
              { $eq: ["$status", "completed"] },
              1,
              0,
            ],
          },
        },

        cancelledRides: {
          $sum: {
            $cond: [
              { $eq: ["$status", "cancelled"] },
              1,
              0,
            ],
          },
        },

        missedRides: {
          $sum: {
            $cond: [
              { $eq: ["$status", "missed"] },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);
};

//----------------------------------- Passenger Ride Stats -------------------------------------------
export const getPassengerRideStatsAggregation =
  async (passengerId) => {
    return Ride.aggregate([
      {
        $match: {
          passenger: new mongoose.Types.ObjectId(
            passengerId
          ),
        },
      },
      {
        $group: {
          _id: null,

          completedRides: {
            $sum: {
              $cond: [
                { $eq: ["$status", "completed"] },
                1,
                0,
              ],
            },
          },

          cancelledRides: {
            $sum: {
              $cond: [
                { $eq: ["$status", "cancelled"] },
                1,
                0,
              ],
            },
          },

          missedRides: {
            $sum: {
              $cond: [
                { $eq: ["$status", "missed"] },
                1,
                0,
              ],
            },
          },

          totalSpent: {
            $sum: "$fareEstimate",
          },
        },
      },
    ]);
  };

//--------------------------------- Driver List Ride Stats -------------------------------------------
export const getDriverListRideAggregation =
  async (driverIds) => {
    return Ride.aggregate([
      {
        $match: {
          driver: {
            $in: driverIds,
          },
        },
      },
      {
        $group: {
          _id: "$driver",

          completedRides: {
            $sum: {
              $cond: [
                { $eq: ["$status", "completed"] },
                1,
                0,
              ],
            },
          },

          cancelledRides: {
            $sum: {
              $cond: [
                { $eq: ["$status", "cancelled"] },
                1,
                0,
              ],
            },
          },

          missedRides: {
            $sum: {
              $cond: [
                { $eq: ["$status", "missed"] },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);
  };

//------------------------------ Passenger List Ride Stats ---------------------------------
export const getPassengerListRideAggregation =
  async (passengerIds) => {
    return Ride.aggregate([
      {
        $match: {
          passenger: {
            $in: passengerIds,
          },
        },
      },
      {
        $group: {
          _id: "$passenger",

          completedRides: {
            $sum: {
              $cond: [
                { $eq: ["$status", "completed"] },
                1,
                0,
              ],
            },
          },

          cancelledRides: {
            $sum: {
              $cond: [
                { $eq: ["$status", "cancelled"] },
                1,
                0,
              ],
            },
          },

          missedRides: {
            $sum: {
              $cond: [
                { $eq: ["$status", "missed"] },
                1,
                0,
              ],
            },
          },

          totalSpent: {
            $sum: "$fareEstimate",
          },
        },
      },
    ]);
  }; 

//-------------------------- Ride Vehicle Type Stats --------------------------
  export const getRideVehicleTypeAggregation =
  async () => {
    return Ride.aggregate([
      {
        $group: {
          _id: "$vehicleType",
          count: {
            $sum: 1,
          },
        },
      },
    ]);
  };