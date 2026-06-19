import mongoose from "mongoose";
import { Complaint } from "../../../../models/complaint/complaint.model.js";

//------------------------------------------------------
// Summary Complaint Stats
//------------------------------------------------------
export const getComplaintSummaryAggregation = async () => {
  return Complaint.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);
};

//------------------------------------------------------
// Driver Complaint Stats By Id
//------------------------------------------------------
export const getDriverComplaintStatsAggregation = async (
  driverId
) => {
  return Complaint.aggregate([
    {
      $match: {
        targetType: "Driver",
        against: new mongoose.Types.ObjectId(driverId),
      },
    },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);
};

//------------------------------------------------------
// Driver Complaint Count List
//------------------------------------------------------
export const getDriverComplaintListAggregation = async (
  driverIds
) => {
  return Complaint.aggregate([
    {
      $match: {
        targetType: "Driver",
        against: {
          $in: driverIds,
        },
      },
    },
    {
      $group: {
        _id: "$against",
        complaints: {
          $sum: 1,
        },
      },
    },
  ]);
};

//------------------------------------------------------
// Passenger Complaint Stats By Id
//------------------------------------------------------
export const getPassengerComplaintStatsAggregation =
  async (passengerId) => {
    return Complaint.aggregate([
      {
        $match: {
          raisedByUser: "Passenger",
          raisedBy: new mongoose.Types.ObjectId(passengerId),
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);
  };

//------------------------------------------------------
// Passenger Complaint Count List
//------------------------------------------------------
export const getPassengerComplaintListAggregation =
  async (passengerIds) => {
    return Complaint.aggregate([
      {
        $match: {
          raisedByUser: "Passenger",
          raisedBy: {
            $in: passengerIds,
          },
        },
      },
      {
        $group: {
          _id: "$raisedBy",
          complaints: {
            $sum: 1,
          },
        },
      },
    ]);
  };

//------------------------------------------------------
// Complaint Formatter
//------------------------------------------------------
export const formatComplaintStats = (
  complaintStats = []
) => {
  return {
    total: complaintStats.reduce(
      (sum, item) => sum + item.count,
      0
    ),

    pending:
      complaintStats.find(
        (item) => item._id === "PENDING"
      )?.count || 0,

    inProgress:
      complaintStats.find(
        (item) => item._id === "IN_PROGRESS"
      )?.count || 0,

    resolved:
      complaintStats.find(
        (item) => item._id === "RESOLVED"
      )?.count || 0,

    closed:
      complaintStats.find(
        (item) => item._id === "CLOSED"
      )?.count || 0,
  };
};