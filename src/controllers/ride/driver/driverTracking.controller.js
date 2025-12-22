import { getIO } from "../../../config/socket/socket.js";
import {
  acceptRideService,
  cancelRideService,
  driverArrivedService,
  startRideService,
  completeRideService,
  updateDriverLocationService
} from "../../../services/rideServices/driverTrackingService/driverTracking.service.js";
import { getDistanceInMeters } from "../../../common/utlis.js";
import { Ride } from "../../../models/ride/ride.model.js";
import { refundPayment } from "../../../services/payment/payment.service.js";
import { Driver } from "../../../models/driver/driver.model.js";
import { Passenger } from "../../../models/passenger/passenger.model.js";
import { sendPushNotification } from "../../../services/notification/notification.service.js"

//----------------------------- Driver Accept Ride -----------------------------
export const acceptRide = async (req, res, next) => {
  try {
    const driverId = req.driver._id;
    const { rideId } = req.body;

    if (!rideId) {
      return res.status(400).json({
        success: false,
        message: "rideId is required",
      });
    }

    const ride = await acceptRideService({ rideId, driverId });

    const io = getIO();

    // Notify passenger about driver assignment
    io.to(ride.passenger.toString()).emit("driver_assigned", {
      rideId: ride._id,
      driver: {
        id: driverId,
        name: req.driver.name,
        vehicleNumber: req.driver.vehicleNumber,
        vehicleType: req.driver.vehicleType,
      },
      status: ride.status,
      pickup: ride.pickup,
      drop: ride.drop,
      fareEstimate: ride.fareEstimate,
    });

    // Notify passenger that driver assigned via push notification
    const passenger = await Passenger.findById(ride.passenger);
    if (passenger?.fcmToken) {
      await sendPushNotification({
        token: passenger.fcmToken,
        title: "Ride Accepted",
        body: `Your ride has been accepted by ${req.driver.name}.`,
        data: {
          type: "driver_assigned",
          rideId: ride._id.toString()
        }
      })
    }


    res.json({ success: true, ride });
  } catch (error) {
    next(error);
  }
};

//------------------------- Driver Arrived -------------------------
export const driverArrived = async (req, res, next) => {
  try {
    const driverId = req.driver._id;
    const { rideId, driverLocationCoordinates } = req.body;
    const ride = await driverArrivedService({
      rideId,
      driverId,
      driverLocationCoordinates,
    });

    // Notify passenger that driver has arrived
    const io = getIO();
    io.to(ride.passenger.toString()).emit("driver_arrived", {
      rideId: ride._id,
    });

    // Notify passenger that driver arrived via push notification
    const passenger = await Passenger.findById(ride.passenger);
    if (passenger?.fcmToken) {
      await sendPushNotification({
        token: passenger.fcmToken,
        title: "Driver Arrived",
        body: `Your driver has arrived. Please get ready.`,
        data: {
          type: "driver_arrived",
          rideId: ride._id.toString()
        }
      })
    }
    res.json({ success: true, ride });
  } catch (error) {
    next(error);
  }
};

//------------------------- Driver Start Ride -------------------------
export const startRide = async (req, res, next) => {
  try {
    const driverId = req.driver._id;
    const { rideId, otpForStartRide, driverLocationCoordinates } = req.body;
    const ride = await startRideService({
      rideId,
      driverId,
      otpForStartRide,
      driverLocationCoordinates,
    });

    // Notify passenger that ride has started
    const io = getIO();
    io.to(ride.passenger.toString()).emit("ride_started", {
      rideId: ride._id,
    });

    // Notify passenger that ride started via push notification
    const passenger = await Passenger.findById(ride.passenger);
    if (passenger?.fcmToken) {
      await sendPushNotification({
        token: passenger.fcmToken,
        title: "Ride Started",
        body: `Your ride has started. Enjoy your trip!`,
        data: {
          type: "ride_started",
          rideId: ride._id.toString()
        }
      })
    }
    res.json({ success: true, ride });
  } catch (error) {
    next(error);
  }
}

//-------------------------- Driver Complete Ride --------------------------
export const completeRide = async (req, res, next) => {
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

    // Notify passenger that ride ended via push notification
    const passenger = await Passenger.findById(ride.passenger);
    if (passenger?.fcmToken) {
      await sendPushNotification({
        token: passenger.fcmToken,
        title: "Ride Completed",
        body: `Your ride has been completed. Please proceed with the payment.`,
        data: {
          type: "ride_ended",
          rideId: ride._id.toString()
        }
      })
    }

    // If payment is cash, mark as paid immediately
    if (ride.paymentMethod === 'cash') {
      ride.paymentStatus = 'paid';
      ride.transactionDate = new Date();
      await ride.save();

      // Notify driver about successful cash payment
      io.to(driverId.toString()).emit('payment_received', {
        rideId: ride._id,
        amount: ride.fareEstimate,
        currency: 'inr',
        paymentMethod: 'cash'
      });
    }

    // Notify driver payment received via push notification
    const driver = await Driver.findById(driverId);
    if (driver?.fcmToken) {
      await sendPushNotification({
        token: driver.fcmToken,
        title: "Payment Received",
        body: `Payment for ride ${ride._id} has been received.`,
        data: {
          type: "payment_received",
          rideId: ride._id.toString()
        }
      })
    }

    // If payment was made online before ride, ensure it's captured
    if (ride.paymentMethod !== 'cash' && ride.isPaymentRequiredBeforeRide && ride.paymentStatus === 'pending') {
      ride.paymentStatus = 'paid';
      ride.transactionDate = new Date();
      await ride.save();

      // Notify driver about successful payment
      io.to(driverId.toString()).emit('payment_received', {
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
  } catch (error) {
    next(error);
  }
};

//------------------------------- Driver Cancel Ride -------------------------------
export const cancelRide = async (req, res, next) => {
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

    // Cancel the ride
    const updatedRide = await cancelRideService({ rideId, driverId });

    // Notify passenger about ride cancellation
    const io = getIO();
    io.to(updatedRide.passenger.toString()).emit("ride_cancelled", {
      rideId: updatedRide._id,
      paymentStatus: updatedRide.paymentStatus,
      refundProcessed: updatedRide.paymentStatus === 'refunded'
    });

    // Notify passenger about ride cancellation via push notification
    const passenger = await Passenger.findById(updatedRide.passenger);
    if (passenger?.fcmToken) {
      await sendPushNotification({
        token: passenger.fcmToken,
        title: "Ride Cancelled",
        body: `Your ride has been cancelled by the driver.`,
        data: {
          type: "ride_cancelled",
          rideId: updatedRide._id.toString()
        }
      })
    }

    res.json({
      success: true,
      ride: updatedRide,
      refundProcessed: updatedRide.paymentStatus === 'refunded'
    });
  } catch (error) {
    next(error);
  }
};

//------------------------------ Update Driver Location ------------------------------
export const updateDriverLocation = async (req, res, next) => {
  try {
    const { lng, lat, rideId } = req.body;

    if (typeof lng !== "number" || typeof lat !== "number") {
      throw new Error("Latitude and longitude must be valid numbers");
    }

    const updatedDriver = await updateDriverLocationService(
      req.driver,
      lng,
      lat
    );

    if (rideId) {
      const ride = await Ride.findOne({
        _id: rideId,
        driver: req.driver._id,
        passenger: { $exists: true, $ne: null },
        status: { $in: ["accepted", "ongoing", "started"] },
      }).select("passenger status pickup drop").lean();

      if (ride?.passenger) {
        const io = getIO();
        const passengerId = ride.passenger.toString();

        // Always emit real-time location update
        io.to(passengerId).emit("driver_location_update", {
          rideId,
          driver: updatedDriver,
          status: ride.status,
          timestamp: new Date().getTime(),
        });

        if (ride.status === "accepted") {
          let etaMinutes = null;
          try {
            if (ride.pickup?.coordinates?.length === 2 && updatedDriver?.coordinates) {
              const meters = getDistanceInMeters(updatedDriver.coordinates, ride.pickup.coordinates);
              const avgSpeedMps = 8; // ~28.8 km/h estimate
              const etaSec = meters / avgSpeedMps;
              etaMinutes = Math.max(1, Math.round(etaSec / 60));
            }
          } catch (e) {
            etaMinutes = null;
          }

          // Notify passenger that driver is on the way
          io.to(passengerId).emit("on_the_way", {
            rideId,
            driver: updatedDriver,
            pickupLocation: ride.pickup,
            etaMinutes,
            message: "Your driver is on the way",
          });
        }

        if (ride.status === "ongoing" || ride.status === "started") {
          let etaToDrop = null;
          try {
            if (ride.drop?.coordinates?.length === 2 && updatedDriver?.coordinates) {
              const meters = getDistanceInMeters(updatedDriver.coordinates, ride.drop.coordinates);
              const avgSpeedMps = 8;
              const etaSec = meters / avgSpeedMps;
              etaToDrop = Math.max(1, Math.round(etaSec / 60));
            }
          } catch (e) {
            etaToDrop = null;
          }

          io.to(passengerId).emit("ride_in_progress", {
            rideId,
            driver: updatedDriver,
            dropLocation: ride.drop,
            etaToDropMinutes: etaToDrop,
            message: "Your ride is in progress",
          });
        }
      }
    }

    res.json({
      success: true,
      message: "Location updated",
      driver: updatedDriver,
      dbSaved: updatedDriver.dbSaved,
    });
  } catch (error) {
    next(error);
  }
};


// export const updateDriverLocation = async (req, res) => {
//   try {
//     const { lng, lat, rideId } = req.body;

//     if (typeof lng !== 'number' || typeof lat !== 'number') {
//       throw new Error('Latitude and longitude are required and must be numbers');
//     }

//     const updatedDriver = await updateDriverLocationService(req.driver, lng, lat, rideId);

//     // Only proceed with ride-specific updates if rideId is provided
//     if (rideId) {
//       const ride = await Ride.findOne({
//         _id: rideId,
//         driver: req.driver._id,
//         passenger: { $exists: true, $ne: null },
//         status: { $in: ["accepted", "on_the_way", "driver_arrived", "ongoing", "completed"] }
//       }).select('passenger status paymentStatus paymentMethod').lean();

//       if (ride && ride.passenger) {
//         // Notify passenger with driver's updated location
//         const io = getIO();
//         const updateData = {
//           rideId,
//           driver: {
//             id: req.driver._id,
//             name: req.driver.name,
//             vehicleType: req.driver.vehicleType,
//             vehicleNumber: req.driver.vehicleNumber,
//           },
//           coordinates: [lng, lat],
//           longitude: lng,
//           latitude: lat,
//           updatedAt: new Date(),
//           status: ride.status,
//           paymentStatus: ride.paymentStatus,
//           paymentMethod: ride.paymentMethod
//         };

//         // Send update to passenger
//         io.to(ride.passenger.toString()).emit("driver_location_update", updateData);

//         // Notify passenger about driver's location update via push notification
//         const passenger = await Passenger.findById(ride.passenger);
//         if (passenger?.fcmToken) {
//           await sendPushNotification({
//             token: passenger.fcmToken,
//             title: "Driver Location Update",
//             body: `Your driver's location has been updated.`,
//             data: {
//               type: "driver_location_update",
//               rideId: ride._id.toString()
//             }
//           })
//         }

//         // If ride is completed but payment is pending, notify passenger
//         if (ride.status === 'completed' && ride.paymentStatus === 'pending' && ride.paymentMethod !== 'cash') {
//           io.to(ride.passenger.toString()).emit("payment:required", {
//             rideId,
//             amount: ride.fareEstimate,
//             currency: 'inr'
//           });
//         }
//       }
//     }

//     res.json({
//       success: true,
//       message: "Location updated successfully",
//       driver: updatedDriver,
//     });
//   } catch (err) {
//     console.error('Error updating driver location:', err);
//     res.status(400).json({
//       success: false,
//       message: err.message || 'Failed to update location'
//     });
//   }
// };