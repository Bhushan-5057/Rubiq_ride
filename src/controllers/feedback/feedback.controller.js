import FeedbackService from '../../services/feedback/feedback.service.js';


export const submitDriverFeedback = async (req, res) => {
  try {
    if (!req.passenger) {
      return res.status(403).json({ success: false, message: 'Only passengers can submit driver feedback' });
    }

    const { rideId, rating, comment } = req.body;
    
    const feedback = await FeedbackService.submitDriverFeedback({
      rideId,
      passengerId: req.passenger._id,
      rating: parseInt(rating),
      comment
    });

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

export const submitPassengerFeedback = async (req, res) => {
  try {
    if (!req.driver) {
      return res.status(403).json({ success: false, message: 'Only drivers can submit passenger feedback' });
    }

    const { rideId, rating, comment } = req.body;
    
    const feedback = await FeedbackService.submitPassengerFeedback({
      rideId,
      driverId: req.driver._id,
      rating: parseInt(rating),
      comment
    });

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

    const feedback = await FeedbackService.getUserFeedback(userType, user._id);
    
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

    const feedback = await FeedbackService.getUserFeedback(userType, userId);
    
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

export const getRideFeedback = async (req, res) => {
  try {
    const { rideId } = req.params;
    const user = req.user || req.driver || req.passenger;
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const feedback = await FeedbackService.getRideFeedback(rideId, user._id);
    
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