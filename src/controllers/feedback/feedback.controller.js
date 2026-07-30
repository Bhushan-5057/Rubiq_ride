import {
  submitDriverFeedbackService,
  submitPassengerFeedbackService,
  getUserFeedbackService,
  getRideFeedbackService,
  getAllFeedbackService
} from '../../services/feedback/feedback.service.js';
import {
  SOCKET_EVENTS,
} from '../../config/socket/socket.js';
import { Ride } from '../../models/ride/ride.model.js';
import { notifyRideParticipant } from '../../helpers/rideNotify.helper.js';


//---------------------- Passenger Feedback To Driver ----------------------
export const submitDriverFeedback = async (req, res) => {
  try {
    if (!req.passenger) {
      return res.status(403).json({ success: false, message: 'Only passengers can submit driver feedback' });
    }

    const { rideId, rating, comment } = req.body;

    const feedback = await submitDriverFeedbackService({
      rideId,
      passengerId: req.passenger._id,
      rating: parseInt(rating),
      comment
    });

    const ride = await Ride.findById(rideId).select("driver passenger")

    if (ride?.driver) {
      await notifyRideParticipant({
        ride,
        userId: ride.driver,
        role: "driver",
        event: SOCKET_EVENTS.DRIVER_FEEDBACK_RECEIVED,
        payload: {
          rideId,
          rating: feedback.rating,
          comment: feedback.comment,
          fromPassenger: req.passenger._id,
        },
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Driver feedback submitted successfully',
      data: feedback
    });
  } catch (error) {
    console.error('Error submitting driver feedback:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to submit driver feedback'
    });
  }
};

//---------------------- Driver Feedback To Passenger ----------------------
export const submitPassengerFeedback = async (req, res) => {
  try {
    if (!req.driver) {
      return res.status(403).json({ success: false, message: 'Only drivers can submit passenger feedback' });
    }

    const { rideId, rating, comment } = req.body;

    const feedback = await submitPassengerFeedbackService({
      rideId,
      driverId: req.driver._id,
      rating: parseInt(rating),
      comment
    });

    const ride = await Ride.findById(rideId).select("passenger driver")

    if (ride?.passenger) {
      await notifyRideParticipant({
        ride,
        userId: ride.passenger,
        role: "passenger",
        event: SOCKET_EVENTS.PASSENGER_FEEDBACK_RECEIVED,
        payload: {
          rideId,
          rating: feedback.rating,
          comment: feedback.comment,
          fromDriver: req.driver._id,
        },
        push: {
          title: "New Driver feedback",
          body: "Driver submitted feedback.",
          data: { rideId: rideId.toString() },
        },
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Passenger feedback submitted successfully',
      data: feedback
    });
  } catch (error) {
    console.error('Error submitting passenger feedback:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to submit passenger feedback'
    });
  }
};

//--------------------- Get User Feedback ---------------------
export const getMyFeedback = async (req, res) => {
  try {
    const user = req.user || req.driver || req.passenger;

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    let userType;
    if (req.driver) {
      userType = 'driver';
    } else if (req.passenger) {
      userType = 'passenger';
    } else {
      return res.status(400).json({ success: false, message: 'Invalid user type' });
    }

    const feedback = await getUserFeedbackService(userType, user._id);

    return res.status(200).json({
      success: true,
      data: feedback
    });
  } catch (error) {
    console.error('Error fetching user feedback:', error);
    return res.status(400).json({
      success: false,
      message: 'Failed to fetch user feedback'
    });
  }
};

//--------------------- Get User Feedback For Admin ---------------------
export const getUserFeedback = async (req, res) => {
  try {
    const { userId } = req.params;
    const { userType } = req.query; // 'driver' or 'passenger'

    if (!['driver', 'passenger'].includes(userType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user type. Must be either "driver" or "passenger"'
      });
    }

    const feedback = await getUserFeedbackService(userType, userId);

    return res.status(200).json({
      success: true,
      data: feedback
    });
  } catch (error) {
    console.error('Error fetching user feedback:', error);
    return res.status(400).json({
      success: false,
      message: 'Failed to fetch user feedback'
    });
  }
};

//------------------------ Get Feedback On Ride For (Driver/Passenger) ------------------------ 
export const getRideFeedback = async (req, res) => {
  try {
    const { rideId } = req.params;
    const user = req.user || req.driver || req.passenger;

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const feedback = await getRideFeedbackService(rideId, user._id);

    return res.status(200).json({
      success: true,
      data: feedback
    });
  } catch (error) {
    console.error('Error fetching ride feedback:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to fetch ride feedback'
    });
  }
};

//--------------------- Get All Feedback For Admin ---------------------
export const getAllFeedback = async (req, res) => {
  try {
    const {
      page,
      limit,
      rating,
      givenBy,
      givenTo,
      rideId,
      startDate,
      endDate,
    } = req.query;

    const result = await getAllFeedbackService({
      page,
      limit,
      rating,
      givenBy,
      givenTo,
      rideId,
      startDate,
      endDate,
    });

    return res.status(200).json({
      success: true,
      message: 'Feedback fetched successfully',
      data: result
    });
  } catch (error) {
    console.error('Error fetching all feedback:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to fetch feedback'
    });
  }
};
