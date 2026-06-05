import { Feedback } from "../../models/feedback/feedback.model.js";
import { Driver } from "../../models/driver/driver.model.js";
import { Passenger } from "../../models/passenger/passenger.model.js";
import { Ride } from "../../models/ride/ride.model.js";

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
