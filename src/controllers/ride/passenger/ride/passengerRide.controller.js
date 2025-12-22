import { createRideService, cancelRideService, updateRideService, endRideService }
  from "../../../../services/rideServices/passengerRideService/passengerRide.service.js";
import { createPaymentIntent, confirmPaymentIntent } from "../../../../services/payment/payment.service.js";
import { getIO } from "../../../../config/socket/socket.js";
import { Ride } from "../../../../models/ride/ride.model.js";
import { Passenger } from "../../../../models/passenger/passenger.model.js";
import { sendPushNotification } from "../../../../services/notification/notification.service.js"

//---------------------------- Create Ride ---------------------------- 
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

    // Notify nearby drivers about the new ride request
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

    // Send push notifications to nearby drivers
    for (const driver of nearbyDrivers) {
      if (driver.fcmToken) {
        await sendPushNotification({
          token: driver.fcmToken,
          title: 'New Ride Request',
          body: `You have a new ride request from a passenger.`,
          data: {
            type: 'new_ride_request',
            rideId: ride._id.toString()
          }
        })
      }
    }

    // Notify passenger about ride creation
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

    // Send push notification to passenger
    const passenger = await Passenger.findById(passengerId);
    if (passenger?.fcmToken) {
      await sendPushNotification({
        token: passenger.fcmToken,
        title: 'Ride Created',
        body: `Your ride has been created successfully.`,
        data: {
          type: 'ride_created',
          rideId: ride._id.toString()
        }
      })
    }

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

//------------------------------ Update Ride ------------------------------
export const updateRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const passengerId = req.passenger._id;
    const { drop } = req.body;

    const ride = await updateRideService({ rideId, passengerId, drop });

    const io = getIO();

    // Notify passenger about ride update
    io.to(passengerId.toString()).emit("drop_location_updated", {
      rideId: ride._id,
      status: ride.status,
      pickup: ride.pickup,
      drop: ride.drop,
      distance: ride.distance,
      fareEstimate: ride.fareEstimate,
    });

    // Send push notification to passenger
    const passenger = await Passenger.findById(passengerId);
    if (passenger?.fcmToken) {
      await sendPushNotification({
        token: passenger.fcmToken,
        title: 'Drop Location Updated',
        body: `Your drop location has been updated successfully.`,
        data: {
          type: 'drop_location_updated',
          rideId: ride._id.toString()
        }
      })
    }

      // Notify driver about ride update
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

      // Send push notification to driver
      if (ride.driver) {
        const driver = await Driver.findById(ride.driver);
        if (driver?.fcmToken) {
          await sendPushNotification({
            token: driver.fcmToken,
            title: 'Drop Location Updated',
            body: `Your drop location has been updated successfully.`,
            data: {
              type: 'drop_location_updated',
              rideId: ride._id.toString()
            }
          })
        }
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

  //--------------------------------- Cancel Ride --------------------------------- 
  export const cancelRide = async (req, res) => {
    try {
      const passengerId = req.passenger._id;
      const { rideId } = req.params;

      const ride = await cancelRideService(passengerId, rideId);

      const io = getIO();

      // Notify passenger about ride cancellation
      io.to(passengerId.toString()).emit("ride_cancelled", {
        rideId: ride._id,
        status: ride.status,
      });

      // Send push notification to passenger
      const passenger = await Passenger.findById(passengerId);
      if (passenger?.fcmToken) {
        await sendPushNotification({
          token: passenger.fcmToken,
          title: 'Ride Cancelled',
          body: `Your ride has been cancelled successfully.`,
          data: {
            type: 'ride_cancelled',
            rideId: ride._id.toString()
          } 
        })
      }

      // Notify driver about ride cancellation
      if (ride.driver) {
        io.to(ride.driver.toString()).emit("ride_cancelled", {
          rideId: ride._id,
          status: ride.status,
        });
      } 

      // Send push notification to driver
      if (ride.driver) {
        const driver = await Driver.findById(ride.driver);
        if (driver?.fcmToken) {
          await sendPushNotification({
            token: driver.fcmToken,
            title: 'Ride Cancelled',
            body: `The ride has been cancelled by the passenger.`,
            data: {
              type: 'ride_cancelled',
              rideId: ride._id.toString()
            }
          })
        }
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

  //-------------------------- End Ride --------------------------  
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

      // Notify passenger about ride completion
      io.to(passengerId.toString()).emit("ride_ended", {
        rideId: completedRide._id,
        status: completedRide.status,
        paymentStatus: completedRide.paymentStatus,
      }); 

      // Send push notification to passenger
      const passenger = await Passenger.findById(passengerId);
      if (passenger?.fcmToken) {
        await sendPushNotification({
          token: passenger.fcmToken,
          title: 'Ride Completed',
          body: `Your ride has been completed successfully.`,
          data: {
            type: 'ride_ended',
            rideId: completedRide._id.toString()
          }
        })
      }

      // Notify driver about ride completion
      if (completedRide.driver) {
        io.to(completedRide.driver.toString()).emit("ride_ended", {
          rideId: completedRide._id,
          status: completedRide.status,
          paymentStatus: completedRide.paymentStatus,
        });
      } 

      // Send push notification to driver
      if (completedRide.driver) {
        const driver = await Driver.findById(completedRide.driver);
        if (driver?.fcmToken) {
          await sendPushNotification({
            token: driver.fcmToken,
            title: 'Ride Completed',
            body: `The ride has been completed successfully.`,
            data: {
              type: 'ride_ended',
              rideId: completedRide._id.toString()
            }
          })
        }
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

  //------------------------------ Confirm Payment ------------------------------
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