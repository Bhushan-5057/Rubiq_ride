import { Ride } from "../../../models/ride/ride.model.js";

//----------------- Get Single Ride -----------------
export async function getSingleRideService(rideId) {
  if (!rideId) throw new Error("Ride ID is required");
  const ride = await Ride.findById(rideId)
    .populate("passenger", "name contactNumber email")
    .populate("driver", "name vehicleNumber vehicleType contactNumber");

  if (!ride) throw new Error("Ride not found");

  return {
    rideId: ride._id,
    status: ride.status,
    fareEstimate: ride.fareEstimate,
    distance: ride.distance,
    pickup: ride.pickup,
    drop: ride.drop,
    passenger: ride.passenger ? {
      id: ride.passenger._id,
      name: ride.passenger.name,
      contactNumber: ride.passenger.contactNumber,
      email: ride.passenger.email,
    } : null,
    driver: ride.driver ? {
      id: ride.driver._id,  
      name: ride.driver.name,
      vehicleNumber: ride.driver.vehicleNumber,
      vehicleType: ride.driver.vehicleType,
      contactNumber: ride.driver.contactNumber,
    } : null,
    createdAt: ride.createdAt,
    updatedAt: ride.updatedAt,
  };
}

//----------------- Get All Rides -----------------
export async function getAllRidesService(filters = {}) {
  const {
    page = 1,
    limit = 5,
    status,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    startDate,
    endDate,
  } = filters;

  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  // Build match stage
  const match = {};

  // Status filter
  if (status) {
    match.status = status;
  }

  // Date range filter
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      match.createdAt.$lte = endOfDay;
    }
  }

  // Aggregation pipeline
  const pipeline = [
    { $match: match },

    // Join passenger data
    {
      $lookup: {
        from: "passengers",
        localField: "passenger",
        foreignField: "_id",
        as: "passenger"
      }
    },
    { $unwind: { path: "$passenger", preserveNullAndEmptyArrays: true }},

    // Join driver data
    {
      $lookup: {
        from: "drivers",
        localField: "driver",
        foreignField: "_id",
        as: "driver"
      }
    },
    { $unwind: { path: "$driver", preserveNullAndEmptyArrays: true }},
  ];

  // Search filter
  if (search) {
    const searchRegex = new RegExp(search, "i");

    pipeline.push({
      $match: {
        $or: [
          { "pickup.address": searchRegex },
          { "drop.address": searchRegex },
          { status: searchRegex },
          { "passenger.name": searchRegex },
          { "passenger.contactNumber": searchRegex },
          { "driver.name": searchRegex },
          { "driver.vehicleNumber": searchRegex }
        ]
      }
    });
  }

  // Count total documents BEFORE pagination
  const totalPipeline = [...pipeline, { $count: "total" }];
  const totalResult = await Ride.aggregate(totalPipeline);
  const total = totalResult.length > 0 ? totalResult[0].total : 0;

  // Add sorting, pagination, final formatting
  pipeline.push(
    { $sort: sort },
    { $skip: skip },
    { $limit: Number(limit) },
    {
      $project: {
        _id: 1,
        status: 1,
        fareEstimate: 1,
        distance: 1,
        pickup: 1,
        drop: 1,
        createdAt: 1,
        updatedAt: 1,
        passenger: {
          _id: "$passenger._id",
          name: "$passenger.name",
          contactNumber: "$passenger.contactNumber",
          email: "$passenger.email"
        },
        driver: {
          _id: "$driver._id",
          name: "$driver.name",
          vehicleNumber: "$driver.vehicleNumber",
          vehicleType: "$driver.vehicleType",
          contactNumber: "$driver.contactNumber"
        }
      }
    }
  ); 

  const rides = await Ride.aggregate(pipeline);

  return {
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit)
    },
    data: rides.map(ride => ({
      rideId: ride._id,
      ...ride
    }))
  };
}


//----------------- Delete Ride -----------------
export async function deleteRideService(rideId) {
  const ride = await Ride.findById(rideId);
  if (!ride) throw new Error("Ride not found");
  await ride.deleteOne();
  return true;
}

//----------------- Delete All Rides -----------------
export async function deleteAllRidesService() {
  const result = await Ride.deleteMany({}); 
  return result.deletedCount; 
}