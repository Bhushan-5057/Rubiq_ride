import { Feedback } from "../models/feedback/feedback.model.js";
import { Driver } from "../models/driver/driver.model.js";
import { Passenger } from "../models/passenger/passenger.model.js";

class FeedbackHelper {
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

  static async getUserFeedback(userType, userId) {
    return Feedback.find({
      givenTo: userType,
      givenToUser: userId,
    })
      .populate('givenByUser', 'name profileImage')
      .sort({ createdAt: -1 });
  }
}

export default FeedbackHelper;