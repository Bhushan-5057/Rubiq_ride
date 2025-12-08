import { getIO } from "../../../config/socket/socket.js";
import { 
  acceptRideService, 
  rejectRideService, 
  startRideService, 
  completeRideService, 
  givePassengerFeedbackService 
} from "../../../services/rideServices/index.js";
import { updateDriverLocationService } from "../../../services/driverServices/index.js";
import { Ride } from "../../../models/ride/ride.model.js";
import { refundPayment } from "../../../services/payment/payment.service.js";

//controller for driver to accept ride
export const acceptRide = async (req, res) => {
  try {
    const driverId = req.driver._id;
    const { rideId } = req.body;

    const ride = await acceptRideService({ rideId, driverId });

    const io = getIO();

    io.to(ride.passenger.toString()).emit("driver_assigned", {
      rideId: ride._id,
      driver: {
        id: driverId,
        name: req.driver.name,
        vehicleNumber: req.driver.vehicleNumber,
        vehicleType: req.driver.vehicleType,
      },
      status:ride.status,
      pickup: ride.pickup,
      drop: ride.drop,
      fareEstimate: ride.fareEstimate,
    });

    res.json({ success: true, ride });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

//controller for driver to start ride
export const startRide = async (req, res) => {
  try {
    const driverId = req.driver._id;
    const { rideId, otpForStartRide, driverLocationCoordinates } = req.body;
    const ride = await startRideService({
      rideId,
      driverId,
      otpForStartRide,
      driverLocationCoordinates,
    });
    const io = getIO();
    io.to(ride.passenger.toString()).emit("ride_started", {
      rideId: ride._id,
    });
    res.json({ success: true, ride });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
}

//controller for driver to complete ride
export const completeRide = async (req, res) => {
  try {
    const driverId = req.driver._id;
    const { rideId, driverLocationCoordinates } = req.body;
    
    // Complete the ride
    const ride = await completeRideService({
      rideId,
      driverId,
      driverLocationCoordinates,
    });

    const io = getIO();
    
    // Emit ride ended event with payment status
    io.to(ride.passenger.toString()).emit("ride_ended", {
      rideId: ride._id,
      status: ride.status,
      paymentStatus: ride.paymentStatus,
      paymentMethod: ride.paymentMethod,
      fare: ride.fareEstimate
    });

    // If payment is cash, mark as paid immediately
    if (ride.paymentMethod === 'cash') {
      ride.paymentStatus = 'paid';
      ride.transactionDate = new Date();
      await ride.save();
      
      // Notify driver about successful cash payment
      io.to(driverId.toString()).emit('payment:received', {
        rideId: ride._id,
        amount: ride.fareEstimate,
        currency: 'inr',
        paymentMethod: 'cash'
      });
    }
    
    // If payment was made online before ride, ensure it's captured
    if (ride.paymentMethod !== 'cash' && ride.isPaymentRequiredBeforeRide && ride.paymentStatus === 'pending') {
      ride.paymentStatus = 'paid';
      ride.transactionDate = new Date();
      await ride.save();
      
      // Notify driver about successful payment
      io.to(driverId.toString()).emit('payment:received', {
        rideId: ride._id,
        amount: ride.fareEstimate,
        currency: 'inr',
        paymentMethod: ride.paymentMethod
      });
    }

    res.json({ 
      success: true, 
      ride,
      paymentStatus: ride.paymentStatus,
      paymentMethod: ride.paymentMethod
    });
  } catch (e) {
    console.error('Error completing ride:', e);
    res.status(400).json({ 
      success: false, 
      message: e.message || 'Failed to complete ride' 
    });
  }
};

//controller for driver to reject ride
export const rejectRide = async (req, res) => {
  try {
    const driverId = req.driver._id;
    const { rideId } = req.body;
    
    // Get the ride first to check payment status
    const ride = await Ride.findOne({ _id: rideId, driver: driverId });
    
    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }
    
    // If payment was made in advance, process refund
    if (ride.paymentStatus === 'paid' || ride.paymentStatus === 'pending') {
      if (ride.paymentIntentId) {
        try {
          await refundPayment(ride.paymentIntentId, null, 'ride_cancelled');
        } catch (error) {
          console.error('Error processing refund:', error);
          // Continue with rejection even if refund fails
        }
      }
      
      // Update payment status
      ride.paymentStatus = 'refunded';
      await ride.save();
    }
    
    // Reject the ride
    const updatedRide = await rejectRideService({ rideId, driverId });

    const io = getIO();

    io.to(updatedRide.passenger.toString()).emit("rideRejected", {
      rideId: updatedRide._id,
      paymentStatus: updatedRide.paymentStatus,
      refundProcessed: updatedRide.paymentStatus === 'refunded'
    });
    
    res.json({ 
      success: true, 
      ride: updatedRide,
      refundProcessed: updatedRide.paymentStatus === 'refunded'
    });
  } catch (e) {
    console.error('Error rejecting ride:', e);
    res.status(400).json({ 
      success: false, 
      message: e.message || 'Failed to reject ride' 
    });
  }
};

//controller to update driver location
export const updateDriverLocation = async (req, res) => {
  try {
    const { lng, lat, rideId } = req.body;

    if (typeof lng !== 'number' || typeof lat !== 'number') {
      throw new Error('Latitude and longitude are required and must be numbers');
    }

    const updatedDriver = await updateDriverLocationService(req.driver, lng, lat, rideId);

    // Only proceed with ride-specific updates if rideId is provided
    if (rideId) {
      const ride = await Ride.findOne({
        _id: rideId,
        driver: req.driver._id,
        passenger: { $exists: true, $ne: null },
        status: { $in: ["accepted", "on_the_way", "driver_arrived", "ongoing", "completed"] }
      }).select('passenger status paymentStatus paymentMethod').lean();

      if (ride && ride.passenger) {
        const io = getIO();
        const updateData = {
          rideId,
          driver: {
            id: req.driver._id,
            name: req.driver.name,
            vehicleType: req.driver.vehicleType,
            vehicleNumber: req.driver.vehicleNumber,
          },
          coordinates: [lng, lat],
          longitude: lng,
          latitude: lat,
          updatedAt: new Date(),
          status: ride.status,
          paymentStatus: ride.paymentStatus,
          paymentMethod: ride.paymentMethod
        };

        // Send update to passenger
        io.to(ride.passenger.toString()).emit("driverLocationUpdate", updateData);
        
        // If ride is completed but payment is pending, notify passenger
        if (ride.status === 'completed' && ride.paymentStatus === 'pending' && ride.paymentMethod !== 'cash') {
          io.to(ride.passenger.toString()).emit("payment:required", {
            rideId,
            amount: ride.fareEstimate,
            currency: 'inr'
          });
        }
      }
    }

    res.json({
      success: true,
      message: "Location updated successfully",
      driver: updatedDriver,
    });
  } catch (err) {
    console.error('Error updating driver location:', err);
    res.status(400).json({ 
      success: false, 
      message: err.message || 'Failed to update location' 
    });
  }
};

//controller for driver to give feedback to passenger
export const givePassengerFeedback = async (req, res) => {
  try {
    const driverId = req.driver._id;
    const { rideId, rating, comment } = req.body;

    if (![1, 2, 3, 4, 5].includes(Number(rating))) {
      return res.status(400).json({ success: false, message: "Invalid rating" });
    }

    const result = await givePassengerFeedbackService({
      rideId,
      driverId,
      rating,
      comment,
    });

    const io = getIO();

    io.to(result.passengerId.toString()).emit("passenger_feedback_received", {
      rideId: result.rideId,
      rating: result.rating,
      comment: result.comment,
      driverId,
    });

    res.status(200).json({ success: true, message: "Passenger Feedback submitted successfully" });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};