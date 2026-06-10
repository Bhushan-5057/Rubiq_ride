import { Feedback } from "../../models/feedback/feedback.model.js";
import { Driver } from "../../models/driver/driver.model.js";
import { Passenger } from "../../models/passenger/passenger.model.js";
import { Ride } from "../../models/ride/ride.model.js";
import mongoose from "mongoose";

async function updateUserRating(userType, userId) {
  const UserModel = userType === "driver" ? Driver : Passenger;

  const [ratingStats] = await Feedback.aggregate([
    {
      $match: {
        givenTo: userType,
        givenToUser: userId,
      },
    },
    {
      $group: {
        _id: "$givenToUser",
        average: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);

  await UserModel.findByIdAndUpdate(userId, {
    $set: {
      "rating.average": ratingStats ? Number(ratingStats.average.toFixed(2)) : 0,
      "rating.count": ratingStats?.count || 0,
    },
  });
}

//---------------------- Passenger Feedback To Driver ----------------------
export async function submitPassengerFeedbackService({ rideId, driverId, rating, comment }) {
  const ride = await Ride.findById(rideId);
  if (!ride) {
    throw new Error('Ride not found');
  }

  if (ride.driver.toString() !== driverId.toString()) {
    throw new Error('You are not authorized to give feedback for this ride');
  }

  if (ride.status !== 'completed') {
    throw new Error('Cannot give feedback for an incomplete ride');
  }

  const feedback = await Feedback.create({
    ride: rideId,
    givenBy: 'driver',
    givenByUser: driverId,
    givenTo: 'passenger',
    givenToUser: ride.passenger,
    rating,
    comment,
  });

  await updateUserRating('passenger', ride.passenger);
  return feedback;
}

//---------------------- Driver Feedback To Passenger ----------------------
export async function submitDriverFeedbackService({ rideId, passengerId, rating, comment }) {
  const ride = await Ride.findById(rideId);
  if (!ride) {
    throw new Error('Ride not found');
  }

  if (ride.passenger.toString() !== passengerId.toString()) {
    throw new Error('You are not authorized to give feedback for this ride');
  }

  if (ride.status !== 'completed') {
    throw new Error('Cannot give feedback for an incomplete ride');
  }

  if (!ride.driver) {
    throw new Error('No driver assigned to this ride');
  }

  const feedback = await Feedback.create({
    ride: rideId,
    givenBy: 'passenger',
    givenByUser: passengerId,
    givenTo: 'driver',
    givenToUser: ride.driver,
    rating,
    comment,
  });

  await updateUserRating('driver', ride.driver);
  return feedback;
}

//---------------------- Get Feedback (Driver/Passenger) ----------------------
export async function getUserFeedbackService(userType, userId) {
  return Feedback.find({
    givenTo: userType,
    givenToUser: userId,
  })
    .populate('givenByUser', 'name profileImage')
    .sort({ createdAt: -1 });
}

//---------------------- Get Feedback on Ride (Driver/Passenger)----------------------
export async function getRideFeedbackService(rideId, userId) {
  return Feedback.find({
    ride: rideId,
    $or: [
      { givenByUser: userId },
      { givenToUser: userId }
    ]
  })
    .populate('givenByUser', 'name profileImage')
    .populate('givenToUser', 'name profileImage')
    .sort({ createdAt: -1 });
}

//---------------------- Get All Feedback For Admin ----------------------
export async function getAllFeedbackService({
  page = 1,
  limit = 20,
  rating,
  givenBy,
  givenTo,
  rideId,
  startDate,
  endDate,
} = {}) {
  const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
  const limitNumber = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const skip = (pageNumber - 1) * limitNumber;
  const filter = {};

  if (rating !== undefined && rating !== "") {
    const ratingNumber = parseInt(rating, 10);
    if (!Number.isInteger(ratingNumber) || ratingNumber < 1 || ratingNumber > 5) {
      throw new Error("Invalid rating filter. Rating must be between 1 and 5");
    }
    filter.rating = ratingNumber;
  }

  if (givenBy) {
    if (!["driver", "passenger"].includes(givenBy)) {
      throw new Error('Invalid givenBy filter. Must be either "driver" or "passenger"');
    }
    filter.givenBy = givenBy;
  }

  if (givenTo) {
    if (!["driver", "passenger"].includes(givenTo)) {
      throw new Error('Invalid givenTo filter. Must be either "driver" or "passenger"');
    }
    filter.givenTo = givenTo;
  }

  if (rideId) {
    if (!mongoose.Types.ObjectId.isValid(rideId)) {
      throw new Error("Invalid rideId filter");
    }
    filter.ride = rideId;
  }

  if (startDate || endDate) {
    filter.createdAt = {};

    if (startDate) {
      const from = new Date(startDate);
      if (Number.isNaN(from.getTime())) {
        throw new Error("Invalid startDate filter");
      }
      filter.createdAt.$gte = from;
    }

    if (endDate) {
      const to = new Date(endDate);
      if (Number.isNaN(to.getTime())) {
        throw new Error("Invalid endDate filter");
      }
      filter.createdAt.$lte = to;
    }
  }

  const [feedbacks, total] = await Promise.all([
    Feedback.find(filter)
      .populate('givenByUser', 'name profileImage')
      .populate('givenToUser', 'name profileImage')
      .populate('ride')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber),
    Feedback.countDocuments(filter),
  ]);

  return {
    feedbacks,
    pagination: {
      page: pageNumber,
      limit: limitNumber,
      total,
      pages: Math.ceil(total / limitNumber),
    },
  };
}
