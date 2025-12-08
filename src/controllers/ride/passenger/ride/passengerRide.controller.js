import { createRideService, cancelRideService, updateRideService, endRideService, giveDriverFeedbackService } 
from "../../../../services/rideServices/passengerRideService/passengerRide.service.js";
import { createPaymentIntent, confirmPaymentIntent } from "../../../../services/payment/payment.service.js";
import { getIO } from "../../../../config/socket/socket.js";
import { Ride } from "../../../../models/ride/ride.model.js";

//controller to create a new ride for passenger
export const createRide = async (req, res) => {
  try {
    const passengerId = req.passenger._id;
    const { pickup, drop, vehicleType, paymentMethod } = req.body;

    // Validate payment method
    if (!['cash', 'card', 'online'].includes(paymentMethod)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid payment method. Must be one of: cash, card, online' 
      });
    }

    const { ride, nearbyDrivers } = await createRideService({
      passengerId,
      pickup,
      drop,
      vehicleType,
      paymentMethod,
    });

    let paymentData = {};
    
    // Handle card/online payment if required before ride
    if (paymentMethod !== 'cash' && ride.isPaymentRequiredBeforeRide) {
      const paymentResult = await createPaymentIntent(
        ride.fareEstimate,
        'inr',
        { 
          rideId: ride._id.toString(),
          passengerId: passengerId.toString(),
          type: 'ride_payment'
        },
        req.passenger.stripeCustomerId
      );

      if (!paymentResult.success) {
        await Ride.findByIdAndUpdate(ride._id, { 
          paymentStatus: 'failed',
          status: 'cancelled'
        });
        
        return res.status(400).json({ 
          success: false, 
          message: 'Payment processing failed',
          error: paymentResult.error
        });
      }

      // Update ride with payment intent
      ride.paymentIntentId = paymentResult.paymentIntentId;
      ride.paymentStatus = 'pending';
      await ride.save();

      paymentData = {
        clientSecret: paymentResult.clientSecret,
        paymentIntentId: paymentResult.paymentIntentId,
        requiresAction: paymentResult.requiresAction,
        paymentStatus: 'pending'
      };
    }

    const io = getIO();

    nearbyDrivers.forEach((driver) => {
      io.to(driver._id.toString()).emit("new_ride_request", {
        rideId: ride._id,
        pickup,
        drop,
        fareEstimate: ride.fareEstimate,
        vehicleType: ride.vehicleType,
        paymentMethod: ride.paymentMethod,
        paymentStatus: ride.paymentStatus
      });
    });

    io.to(passengerId.toString()).emit("ride_created", {
      rideId: ride._id,
      pickup,
      drop,
      fareEstimate: ride.fareEstimate,
      vehicleType: ride.vehicleType,
      paymentMethod: ride.paymentMethod,
      paymentStatus: ride.paymentStatus,
      ...paymentData
    });

    res.status(201).json({ 
      success: true, 
      ride,
      ...paymentData
    });
  } catch (e) {
    console.error('Error creating ride:', e);
    res.status(500).json({ 
      success: false, 
      message: e.message || 'Failed to create ride' 
    });
  }
};

//controller to update an existing ride for passenger
export const updateRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const passengerId = req.passenger._id;
    const { drop } = req.body;

    const ride = await updateRideService({ rideId, passengerId, drop });

    const io = getIO();

    io.to(passengerId.toString()).emit("drop_location_updated", {
      rideId: ride._id,
      status: ride.status,
      pickup: ride.pickup,
      drop: ride.drop,
      distance: ride.distance,
      fareEstimate: ride.fareEstimate,
    });

    if (ride.driver) {
      io.to(ride.driver.toString()).emit("drop_location_updated", {
        rideId: ride._id,
        status: ride.status,
        pickup: ride.pickup,
        drop: ride.drop,
        distance: ride.distance,
        fareEstimate: ride.fareEstimate,
      });
    }

    res.status(200).json({
      success: true,
      message: "Ride updated successfully",
      ride,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

//controller to cancel a ride for passenger
export const cancelRide = async (req, res) => {
  try {
    const passengerId = req.passenger._id;
    const { rideId } = req.params;

    const ride = await cancelRideService(passengerId, rideId);

    const io = getIO();

    io.to(passengerId.toString()).emit("rideCancelled", {
      rideId: ride._id,
      status: ride.status,
    });

    if (ride.driver) {
      io.to(ride.driver.toString()).emit("rideCancelled", {
        rideId: ride._id,
        status: ride.status,
      });
    }

    res.status(200).json({
      success: true,
      message: "Ride cancelled successfully",
      ride,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

//controller to end a ride for passenger
export const endRide = async (req, res) => {
  try {
    const passengerId = req.passenger._id;
    const { rideId, passengerLocationCoordinates } = req.body;

    // Get the ride first to check payment status
    const ride = await Ride.findOne({ _id: rideId, passenger: passengerId });
    
    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }

    // For card/online payments after ride completion
    if (ride.paymentMethod !== 'cash' && !ride.isPaymentRequiredBeforeRide) {
      // Create payment intent for the final fare
      const paymentResult = await createPaymentIntent(
        ride.fareEstimate,
        'inr',
        { 
          rideId: ride._id.toString(),
          passengerId: passengerId.toString(),
          type: 'ride_payment'
        },
        req.passenger.stripeCustomerId
      );

      if (!paymentResult.success) {
        return res.status(400).json({ 
          success: false, 
          message: 'Payment processing failed',
          error: paymentResult.error
        });
      }

      // Update ride with payment intent
      ride.paymentIntentId = paymentResult.paymentIntentId;
      ride.paymentStatus = 'pending';
      await ride.save();

      // Send payment details to client
      return res.status(200).json({
        success: true,
        requiresPayment: true,
        clientSecret: paymentResult.clientSecret,
        paymentIntentId: paymentResult.paymentIntentId,
        requiresAction: paymentResult.requiresAction,
        message: 'Payment required to complete ride',
        ride
      });
    }

    // For cash payments or pre-paid rides, complete the ride
    const completedRide = await endRideService({
      rideId,
      passengerId,
      passengerLocationCoordinates,
    });

    const io = getIO();

    io.to(passengerId.toString()).emit("ride_ended", {
      rideId: completedRide._id,
      status: completedRide.status,
      paymentStatus: completedRide.paymentStatus,
    });

    if (completedRide.driver) {
      io.to(completedRide.driver.toString()).emit("ride_ended", {
        rideId: completedRide._id,
        status: completedRide.status,
        paymentStatus: completedRide.paymentStatus,
      });
    }

    res.status(200).json({
      success: true,
      message: "Ride ended successfully",
      ride: completedRide,
    });
  } catch (err) {
    console.error('Error ending ride:', err);
    res.status(400).json({ 
      success: false, 
      message: err.message || 'Failed to end ride' 
    });
  }
};

// Confirm payment for a ride
export const confirmPayment = async (req, res) => {
  try {
    const passengerId = req.passenger._id;
    const { rideId, paymentIntentId } = req.body;

    // Verify the ride exists and belongs to the passenger
    const ride = await Ride.findOne({ _id: rideId, passenger: passengerId });
    
    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }

    // Verify the payment intent
    const paymentResult = await confirmPaymentIntent(paymentIntentId || ride.paymentIntentId);
    
    if (!paymentResult.success) {
      // Update ride status if payment fails
      if (ride.paymentStatus !== 'paid') {
        ride.paymentStatus = 'failed';
        await ride.save();
      }
      
      return res.status(400).json({ 
        success: false, 
        message: 'Payment confirmation failed',
        error: paymentResult.error,
        paymentStatus: 'failed'
      });
    }

    // Update ride status based on payment result
    if (paymentResult.status === 'succeeded') {
      ride.paymentStatus = 'paid';
      ride.transactionDate = new Date();
      await ride.save();

      // Complete the ride if it was waiting for payment
      if (ride.status === 'completed' && ride.paymentStatus === 'paid') {
        await endRideService({
          rideId: ride._id,
          passengerId: ride.passenger,
          paymentStatus: 'paid'
        });
      }

      // Notify driver about successful payment
      if (ride.driver) {
        const io = getIO();
        io.to(ride.driver.toString()).emit('payment:received', {
          rideId: ride._id,
          amount: ride.fareEstimate,
          currency: 'inr'
        });
      }
    }

    res.status(200).json({
      success: true,
      paymentStatus: ride.paymentStatus,
      requiresAction: paymentResult.requiresAction,
      clientSecret: paymentResult.clientSecret,
      ride
    });
  } catch (err) {
    console.error('Error confirming payment:', err);
    res.status(400).json({ 
      success: false, 
      message: err.message || 'Failed to confirm payment' 
    });
  }
};

//controller for passenger to give feedback to driver
export const giveDriverFeedback = async (req, res) => {
  try {
    const passengerId = req.passenger._id;
    const { rideId, rating, comment } = req.body;

    if (![1, 2, 3, 4, 5].includes(Number(rating))) {
      return res.status(400).json({ success: false, message: "Invalid rating" });
    }
    const result = await giveDriverFeedbackService({
      rideId,
      passengerId,
      rating,
      comment,
    });

    const io = getIO();

    io.to(result.driverId.toString()).emit("driver_feedback_received", {
      rideId: result.rideId,
      rating: result.rating,
      comment: result.comment,
      passengerId,
    });

    res.status(200).json({ success: true, message: "Driver Feedback submitted successfully" });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};