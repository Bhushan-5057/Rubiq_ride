import mongoose from "mongoose";
import { Driver } from "../../../models/driver/driver.model.js";
import { Passenger } from "../../../models/passenger/passenger.model.js";
import { Ride } from "../../../models/ride/ride.model.js";
import { Complaint } from "../../../models/complaint/complaint.model.js";
import {
  getComplaintSummaryAggregation,
  getDriverComplaintStatsAggregation,
  getDriverComplaintListAggregation,
  getPassengerComplaintStatsAggregation,
  getPassengerComplaintListAggregation,
  formatComplaintStats,
} from "./aggregations/complaintReport.aggregation.js";

import {
  getDriverRideStatsAggregation,
  getPassengerRideStatsAggregation,
  getDriverListRideAggregation,
  getPassengerListRideAggregation,
  getRideVehicleTypeAggregation,
} from "./aggregations/rideReport.aggregation.js";

import { getRevenueAggregation } from "./aggregations/revenueReport.aggregation.js";

const createError = (message, status) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

//------------------------------------- Summary Report -----------------------------------------
export const getSummaryReportService = async () => {
  const [
    totalPassengers,
    activePassengers,
    totalDrivers,
    activeDrivers,
    totalRides,
    completedRides,
    cancelledRides,
    missedRides,
    totalComplaints,
    complaintStats,
    revenueStats,
  ] = await Promise.all([
    Passenger.countDocuments(),
    Passenger.countDocuments({ status: "ACTIVE" }),

    Driver.countDocuments(),
    Driver.countDocuments({ status: "ACTIVE" }),

    Ride.countDocuments(),
    Ride.countDocuments({ status: "completed" }),
    Ride.countDocuments({ status: "cancelled" }),
    Ride.countDocuments({ status: "missed" }),

    Complaint.countDocuments(),

    getComplaintSummaryAggregation(),

    getRevenueAggregation(),
  ]);

  return {
    totalPassengers,
    activePassengers,

    totalDrivers,
    activeDrivers,

    totalRides,
    completedRides,
    cancelledRides,
    missedRides,

    totalComplaints,

    pendingComplaints:
      complaintStats.find((c) => c._id === "PENDING")?.count || 0,

    inProgressComplaints:
      complaintStats.find((c) => c._id === "IN_PROGRESS")?.count || 0,

    resolvedComplaints:
      complaintStats.find((c) => c._id === "RESOLVED")?.count || 0,

    closedComplaints:
      complaintStats.find((c) => c._id === "CLOSED")?.count || 0,

    totalRevenue: revenueStats[0]?.totalRevenue || 0,
    totalDriverPayout: revenueStats[0]?.totalDriverPayout || 0,
    totalPlatformFee: revenueStats[0]?.totalPlatformFee || 0,
  };
};

//-------------------------- Drivers Report By ID --------------------------
export const getDriverReportByIdService = async (driverId) => {
  const driver = await Driver.findById(driverId)
    .select(
      `
      name
      email
      contactNumber
      vehicleNumber
      vehicleType
      approvalStatus
      status
      rating
      earnings
      createdAt
    `,
    )
    .lean();

  if (!driver) {
    throw createError("Driver not found", 404);
  }

  const complaintStats = await getDriverComplaintStatsAggregation(driverId);

  const rideStats = await getDriverRideStatsAggregation(driverId);

  const stats = rideStats[0] || {};

  const complaints = {
    total: complaintStats.reduce((sum, item) => sum + item.count, 0),

    pending: complaintStats.find((item) => item._id === "PENDING")?.count || 0,

    inProgress:
      complaintStats.find((item) => item._id === "IN_PROGRESS")?.count || 0,

    resolved:
      complaintStats.find((item) => item._id === "RESOLVED")?.count || 0,

    closed: complaintStats.find((item) => item._id === "CLOSED")?.count || 0,
  };

  return {
    ...driver,
    complaints,
    completedRides: stats.completedRides || 0,
    cancelledRides: stats.cancelledRides || 0,
    missedRides: stats.missedRides || 0,
    totalEarnings: driver.earnings?.totalEarnings || 0,
    totalDriverPayout: driver.earnings?.totalDriverPayout || 0,
    totalPlatformFee: driver.earnings?.totalPlatformFee || 0,
  };
};

//-------------------------------- Driver Report -------------------------------------
export const getDriverReportService = async ({
  page = 1,
  limit = 10,
  fromDate,
  toDate,
}) => {
  const skip = (page - 1) * limit;

  const query = {};

  if (fromDate || toDate) {
    query.createdAt = {};

    if (fromDate) {
      query.createdAt.$gte = new Date(fromDate);
    }

    if (toDate) {
      query.createdAt.$lte = new Date(toDate);
    }
  }

  const [drivers, total] = await Promise.all([
    Driver.find(query)
      .select(
        `
        name
        email
        contactNumber
        vehicleNumber
        vehicleType
        approvalStatus
        status
        rating
        earnings
        createdAt
      `,
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    Driver.countDocuments(query),
  ]);

  const driverIds = drivers.map((driver) => driver._id);

  const complaintStats = await getDriverComplaintListAggregation(driverIds);;

  const complaintMap = new Map(
    complaintStats.map((item) => [String(item._id), item.complaints]),
  );

  const rideStats = await getDriverListRideAggregation(driverIds);

  const rideMap = new Map(rideStats.map((item) => [String(item._id), item]));

  const data = drivers.map((driver) => {
    const stats = rideMap.get(String(driver._id));

    return {
      ...driver,
      completedRides: stats?.completedRides || 0,
      cancelledRides: stats?.cancelledRides || 0,
      missedRides: stats?.missedRides || 0,
      totalEarnings: driver.earnings?.totalEarnings || 0,
      totalDriverPayout: driver.earnings?.totalDriverPayout || 0,
      totalPlatformFee: driver.earnings?.totalPlatformFee || 0,
      totalComplaints: complaintMap.get(String(driver._id)) || 0,
    };
  });

  return {
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPreviousPage: page > 1,
    },
    data,
  };
};

//--------------------------------- Passneger Report By ID --------------------------
export const getPassengerReportByIdService = async (passengerId) => {
  const passenger = await Passenger.findById(passengerId)
    .select(
      `
      name
      email
      contactNumber
      status
      rating
      createdAt
    `,
    )
    .lean();

  if (!passenger) {
    throw createError("Passenger not found", 404);
  }

  const rideStats = await getPassengerRideStatsAggregation(passengerId);

  const complaintStats =
    await getPassengerComplaintStatsAggregation(passengerId);

  const complaints = {
    total: complaintStats.reduce((sum, item) => sum + item.count, 0),

    pending: complaintStats.find((item) => item._id === "PENDING")?.count || 0,

    inProgress:
      complaintStats.find((item) => item._id === "IN_PROGRESS")?.count || 0,

    resolved:
      complaintStats.find((item) => item._id === "RESOLVED")?.count || 0,

    closed: complaintStats.find((item) => item._id === "CLOSED")?.count || 0,
  };

  const stats = rideStats[0] || {};

  return {
    ...passenger,
    complaints,
    completedRides: stats.completedRides || 0,
    cancelledRides: stats.cancelledRides || 0,
    missedRides: stats.missedRides || 0,
    totalSpent: stats.totalSpent || 0,
  };
};

//----------------------------------------- Passenger Report -----------------------------------
export const getPassengerReportService = async ({
  page = 1,
  limit = 10,
  fromDate,
  toDate,
}) => {
  const skip = (page - 1) * limit;

  const query = {};

  if (fromDate || toDate) {
    query.createdAt = {};

    if (fromDate) {
      query.createdAt.$gte = new Date(fromDate);
    }

    if (toDate) {
      query.createdAt.$lte = new Date(toDate);
    }
  }

  const [passengers, total] = await Promise.all([
    Passenger.find(query)
      .select(
        `
        name
        email
        contactNumber
        status
        rating
        createdAt
      `,
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    Passenger.countDocuments(query),
  ]);

  const passengerIds = passengers.map((passenger) => passenger._id);

  const complaintStats =
    await getPassengerComplaintListAggregation(passengerIds);

  const rideStats = await getPassengerListRideAggregation(passengerIds);

  const rideMap = new Map(rideStats.map((item) => [String(item._id), item]));

  const complaintMap = new Map(
    complaintStats.map((item) => [String(item._id), item.complaints]),
  );

  const data = passengers.map((passenger) => {
    const stats = rideMap.get(String(passenger._id));

    return {
      ...passenger,
      completedRides: stats?.completedRides || 0,
      cancelledRides: stats?.cancelledRides || 0,
      missedRides: stats?.missedRides || 0,
      totalSpent: stats?.totalSpent || 0,
      totalComplaints: complaintMap.get(String(passenger._id)) || 0,
    };
  });

  return {
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPreviousPage: page > 1,
    },
    data,
  };
};

//----------------------------------------- Revenue Report ----------------------------------------------
export const getRevenueReportService = async () => {
  const revenue = await getRevenueAggregation();

  return {
    totalRevenue: revenue[0]?.totalRevenue || 0,
    totalDriverPayout: revenue[0]?.totalDriverPayout || 0,
    totalPlatformFee: revenue[0]?.totalPlatformFee || 0,
  };
};

//--------------------------------------------- Ride Report --------------------------------------------
export const getRideReportService = async () => {
  const [
    totalRides,
    completedRides,
    cancelledRides,
    missedRides,
    vehicleStats,
  ] = await Promise.all([
    Ride.countDocuments(),
    Ride.countDocuments({ status: "completed" }),
    Ride.countDocuments({ status: "cancelled" }),
    Ride.countDocuments({ status: "missed" }),

    getRideVehicleTypeAggregation(),
  ]);

  return {
    totalRides,
    completedRides,
    cancelledRides,
    missedRides,
    ridesByVehicleType: {
      cab: vehicleStats.find((v) => v._id === "cab")?.count || 0,
      bike: vehicleStats.find((v) => v._id === "bike")?.count || 0,
      auto: vehicleStats.find((v) => v._id === "auto")?.count || 0,
    },
  };
};
