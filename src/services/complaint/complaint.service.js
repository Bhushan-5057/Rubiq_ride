import { Complaint } from "../../models/complaint/complaint.model.js";
import { Ride } from "../../models/ride/ride.model.js";
import mongoose from "mongoose";
import { validateComplaintParticipants } from "../../helpers/complaintParticipants.helper.js";
import { validateComplaintStatusTransition } from "../../helpers/complaintStatus.helper.js";

const createError = (message, status) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const complaintPopulation = [
  { path: "raisedBy", select: "name email phone" },
  { path: "against", select: "name email phone" },
  { path: "rideId", select: "pickupLocation dropoffLocation fare" },
];

//------------------ Create Complaint ------------------
export const createComplaintService = async (complaintData) => {
  if (
    !complaintData.rideId ||
    !mongoose.isValidObjectId(complaintData.rideId)
  ) {
    throw createError("Ride not found", 404);
  }

  const ride = await Ride.findById(complaintData.rideId).select(
    "passenger driver",
  );

  if (!ride) {
    throw createError("Ride not found", 404);
  }

  validateComplaintParticipants({
    ride,
    raisedBy: complaintData.raisedBy,
    raisedByRole: complaintData.raisedByUser,
    against: complaintData.against,
    targetType: complaintData.targetType,
  });

  const complaint = await Complaint.create(complaintData);
  return complaint;
};

//------------------ Get Complaint By ID ------------------
export const getComplaintByIdService = async (id) => {
  const complaint = await Complaint.findById(id).populate(complaintPopulation);

  if (!complaint) {
    throw createError("Complaint not found", 404);
  }
  return complaint;
};

//------------------ Update Complaint Status ------------------
export const updateComplaintStatusService = async (id, updateData) => {
  const complaint = await Complaint.findById(id);

  if (!complaint) {
    throw createError("Complaint not found", 404);
  }

  validateComplaintStatusTransition(complaint.status, updateData.status);

  if (
    ["RESOLVED", "CLOSED"].includes(updateData.status) &&
    !updateData.adminResponse?.trim()
  ) {
    throw createError(
      "adminResponse is required when status is RESOLVED or CLOSED",
      400,
    );
  }

  complaint.status = updateData.status;

  if (updateData.adminResponse) {
    complaint.adminResponse = updateData.adminResponse.trim();
  }

  if (updateData.status === "RESOLVED") {
    complaint.resolvedAt = new Date();
  }

  if (updateData.status === "CLOSED") {
    complaint.closedAt = new Date();
  }

  await complaint.save();

  return Complaint.findById(complaint._id).populate(complaintPopulation);
};

//------------------ Get All Complaints ------------------
export const getComplaintsService = async (filter, options) => {
  const { page = 1, limit = 5 } = options;
  const skip = (page - 1) * limit;

  // Build the query
  const query = {};
  if (filter.status) query.status = filter.status;
  if (filter.raisedBy) query.raisedBy = filter.raisedBy;
  if (filter.category) query.category = filter.category;

  if (filter.rideId) {
    query.rideId = filter.rideId;
  }

  const complaintsPromise = Complaint.find(query)
    .populate("raisedBy", "name email phone")
    .populate("against", "name email phone")
    .populate("rideId", "pickupLocation dropoffLocation fare")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const countPromise = Complaint.countDocuments(query);

  const [complaints, total] = await Promise.all([
    complaintsPromise,
    countPromise,
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
    data: complaints,
  };
};

//------------------ Get Complaint For Specific User ------------------
export const getMyComplaintsService = async (userId, options) => {
  const { page = 1, limit = 10 } = options;
  const skip = (page - 1) * limit;

  const query = { raisedBy: userId };

  const complaintsPromise = Complaint.find(query)
    .populate("raisedBy", "name email phone")
    .populate("against", "name email phone")
    .populate("rideId", "pickupLocation dropoffLocation fare")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const countPromise = Complaint.countDocuments(query);

  const [complaints, total] = await Promise.all([
    complaintsPromise,
    countPromise,
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    data: complaints,
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
};
