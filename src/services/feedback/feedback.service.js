import { Feedback } from "../../models/feedback/feedback.model.js";
import { Driver } from "../../models/driver/driver.model.js";
import { Passenger } from "../../models/passenger/passenger.model.js";
import { Ride } from "../../models/ride/ride.model.js";

class FeedbackService {
  // Submit feedback for a ride
  static async submitFeedback(feedbackData) {
    const { ride, givenBy, givenByUser, givenTo, givenToUser, rating, comment } = feedbackData;

    // Validate rating
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    // Check if feedback already exists for this ride and giver
    const existingFeedback = await Feedback.findOne({
      ride,
      givenBy,
      givenByUser,
    });

    if (existingFeedback) {
      throw new Error('Feedback already submitted for this ride');
    }

    // Create new feedback
    const feedback = new Feedback({
      ride,
      givenBy,
      givenByUser,
      givenTo,
      givenToUser,
      rating,
      comment,
    });

    // Save the feedback
    await feedback.save();

    // Update the recipient's rating
    await this._updateUserRating(givenTo, givenToUser);

    return feedback;
  }

  // Submit feedback for a passenger (from driver)
  static async submitPassengerFeedback({ rideId, driverId, rating, comment }) {
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

    return this.submitFeedback({
      ride: rideId,
      givenBy: 'driver',
      givenByUser: driverId,
      givenTo: 'passenger',
      givenToUser: ride.passenger,
      rating,
      comment,
    });
  }

  // Submit feedback for a driver (from passenger)
  static async submitDriverFeedback({ rideId, passengerId, rating, comment }) {
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

    return this.submitFeedback({
      ride: rideId,
      givenBy: 'passenger',
      givenByUser: passengerId,
      givenTo: 'driver',
      givenToUser: ride.driver,
      rating,
      comment,
    });
  }

  // Get feedback for a user
  static async getUserFeedback(userType, userId) {
    return Feedback.find({
      givenTo: userType,
      givenToUser: userId,
    })
      .populate('givenByUser', 'name profileImage')
      .sort({ createdAt: -1 });
  }

  // Get feedback for a specific ride
  static async getRideFeedback(rideId, userId) {
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

  // Update user rating (private method)
  static async _updateUserRating(userType, userId) {
    // Get all feedback for this user
    const feedbacks = await Feedback.find({
      givenTo: userType,
      givenToUser: userId,
    });

    if (feedbacks.length === 0) return;

    // Calculate new average rating
    const totalRating = feedbacks.reduce((sum, fb) => sum + fb.rating, 0);
    const averageRating = Math.round((totalRating / feedbacks.length) * 10) / 10; // Round to 1 decimal

    // Update the appropriate model
    if (userType === 'driver') {
      await Driver.findByIdAndUpdate(userId, {
        $set: { 'rating.average': averageRating, 'rating.count': feedbacks.length },
      });
    } else if (userType === 'passenger') {
      await Passenger.findByIdAndUpdate(userId, {
        $set: { 'rating.average': averageRating, 'rating.count': feedbacks.length },
      });
    }
  }
}

export default FeedbackService;
