import {
  SOCKET_EVENTS,
  emitToDriver,
  emitToPassenger,
} from "../../../config/socket/socket.js";
import {
  acceptRideService,
  driverArrivedService,
  startRideService,
  completeRideService,
  updateDriverLocationService
} from "../../../services/rideServices/driverTrackingService/driverTracking.service.js";
import { cancelRideService } from "../../../services/rideServices/rideCancellation.service.js";
import { getDistanceMatrix } from "../../../services/googleMaps/googleMaps.service.js";
import { Ride } from "../../../models/ride/ride.model.js";
import { refundPayment } from "../../../services/payment/payment.service.js";
import { Driver } from "../../../models/driver/driver.model.js";
import { Passenger } from "../../../models/passenger/passenger.model.js";
import { sendToUser } from "../../../services/notification/sendToUser.js";
import { DRIVER_CANCELLATION_REASONS } from "../../../common/cancellationReasons.js";
import {
  emitAdminDashboardStats,
  emitAdminDriverLocation,
  emitAdminEvent,
  emitAdminRideEvent,
} from "../../../helpers/admin-realtime.helper.js";

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

    const payload = {
      rideId: ride._id,
      driver: {
        id: driverId,
        name: req.driver.name,
        contactNumber: req.driver.contactNumber,
        vehicleNumber: req.driver.vehicleNumber,
        vehicleType: req.driver.vehicleType,
      },
      status: ride.status,
      pickup: ride.pickup,
      drop: ride.drop,
      fareEstimate: ride.fareEstimate,
    }

    // Notify passenger about driver assignment
    emitToPassenger(ride.passenger, SOCKET_EVENTS.RIDE_DRIVER_ASSIGNED, payload)
    await emitAdminRideEvent("admin:ride_status_updated", ride, {
      action: SOCKET_EVENTS.RIDE_DRIVER_ASSIGNED,
      driverId: driverId.toString(),
    });

    // Notify passenger that driver assigned via push notification 
    const passengerId = ride.passenger;

    const passenger = await Passenger.findById(passengerId).select("fcmTokens");
    await sendToUser({
      user: passenger,
      title: "Ride Accepted",
      body: "Driver accepted your ride request.",
      data: {
        type: SOCKET_EVENTS.RIDE_DRIVER_ASSIGNED,
        rideId: ride._id.toString()
      },
      userType: "passenger",
    })
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

    const payload = {
      rideId: ride._id,
      driver: {
        id: driverId,
        name: req.driver.name,
        contactNumber: req.driver.contactNumber,
        vehicleNumber: req.driver.vehicleNumber,
        vehicleType: req.driver.vehicleType,
      },
      status: ride.status,
      pickup: ride.pickup,
      drop: ride.drop,
      fareEstimate: ride.fareEstimate,
    }

    // Notify passenger that driver has arrived
    emitToPassenger(ride.passenger, SOCKET_EVENTS.DRIVER_ARRIVED, payload)
    await emitAdminRideEvent("admin:ride_status_updated", ride, {
      action: SOCKET_EVENTS.DRIVER_ARRIVED,
      driverId: driverId.toString(),
    });

    // Notify passenger that driver arrived via push notification
    const passenger = await Passenger.findById(ride.passenger).select("fcmTokens");
    await sendToUser({
      user: passenger,
      title: "Driver Arrived",
      body: "Driver has arrived at your pickup location.",
      data: {
        type: SOCKET_EVENTS.DRIVER_ARRIVED,
        rideId: ride._id.toString(),
      },
      userType: "passenger",
    })
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
    emitToPassenger(ride.passenger, SOCKET_EVENTS.RIDE_STARTED, {
      rideId: ride._id,
    });
    await emitAdminRideEvent("admin:ride_status_updated", ride, {
      action: SOCKET_EVENTS.RIDE_STARTED,
      driverId: driverId.toString(),
    });

    // Notify passenger that ride started via push notification
    const passenger = await Passenger.findById(ride.passenger).select("fcmTokens");;
    await sendToUser({
      user: passenger,
      title: "Ride Started",
      body: "Your ride has started.",
      data: {
        type: SOCKET_EVENTS.RIDE_STARTED,
        rideId: ride._id.toString(),
      },
      userType: "passenger",
    });
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

    // Emit ride ended event with payment status
    emitToPassenger(ride.passenger, SOCKET_EVENTS.RIDE_COMPLETED, {
      rideId: ride._id,
      status: ride.status,
      paymentStatus: ride.paymentStatus,
      paymentMethod: ride.paymentMethod,
      fare: ride.fareEstimate
    });
    await emitAdminRideEvent("admin:trip_completed", ride, {
      completedBy: "Driver",
      driverId: driverId.toString(),
    });

    // Notify passenger that ride ended via push notification
    const passenger = await Passenger.findById(ride.passenger).select("fcmTokens");;
    await sendToUser({
      user: passenger,
      title: "Ride Completed",
      body: "Your ride has been completed.",
      data: {
        type: SOCKET_EVENTS.RIDE_COMPLETED,
        rideId: ride._id.toString(),
      },
      userType: "passenger",
    });

    // If payment is cash, mark as paid immediately
    if (ride.paymentMethod === 'cash') {
      ride.paymentStatus = 'paid';
      ride.transactionDate = new Date();
      await ride.save();
    }

    if (ride.paymentStatus === 'paid') {
      const driver = await Driver.findById(driverId).select("fcmTokens");

      emitToDriver(driverId, "payment:received", {
        rideId: ride._id,
        amount: ride.fareEstimate,
        currency: 'inr',
        paymentMethod: ride.paymentMethod
      });
      emitAdminEvent("admin:payout_notification", {
        rideId: ride._id.toString(),
        driverId: driverId.toString(),
        amount: ride.fareEstimate,
        currency: "inr",
        paymentMethod: ride.paymentMethod,
      });

      await sendToUser({
        user: driver,
        title: "Payment Received",
        body: "Payment for the ride has been received.",
        data: {
          type: "payment:received",
          rideId: ride._id.toString(),
        },
        userType: "driver",
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
    const { rideId, reasonCode, reasonText } = req.body;

    if (!reasonCode) {
      return res.status(400).json({
        success: false,
        message: "Cancellation reason is required"
      });
    }

    // Get the ride first to check payment status
    const ride = await Ride.findOne({ _id: rideId, driver: driverId });

    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }

    // If payment was captured in advance, process refund.
    if (ride.paymentStatus === 'paid') {
      if (ride.razorpayPaymentId) {
        try {
          await refundPayment(ride.razorpayPaymentId, null, {
            rideId: ride._id.toString(),
            reason: 'ride_cancelled',
          });
        } catch (error) {
          console.error('Error processing refund:', error);
          // Continue with rejection even if refund fails
        }
      }

      // Update payment status
      ride.paymentStatus = 'refunded';
      await ride.save();
    } else if (ride.paymentStatus === 'pending') {
      ride.paymentStatus = 'failed';
      await ride.save();
    }

    const updatedRide = await cancelRideService({
      rideId,
      actorId: driverId,
      cancelledBy: "Driver",
      reasonCode,
      reasonText,
      paymentStatus: ride.paymentStatus,
    });

    // Notify passenger about ride cancellation
    emitToPassenger(updatedRide.passenger, SOCKET_EVENTS.RIDE_CANCELLED_BY_DRIVER, {
      rideId: updatedRide._id,
      cancelledBy: "Driver",
      reasonCode: updatedRide.cancellation.reasonCode,
      reasonText: updatedRide.cancellation.reasonText,
      paymentStatus: updatedRide.paymentStatus,
      refundProcessed: updatedRide.paymentStatus === 'refunded'
    });
    await emitAdminRideEvent("admin:ride_cancelled", updatedRide, {
      cancelledBy: "Driver",
      reasonCode: updatedRide.cancellation.reasonCode,
      reasonText: updatedRide.cancellation.reasonText,
      refundProcessed: updatedRide.paymentStatus === "refunded",
    });

    // Notify passenger about ride cancellation via push notification
    const passenger = await Passenger.findById(updatedRide.passenger).select("fcmTokens");
    await sendToUser({
      user: passenger,
      title: "Ride Cancelled",
      body: "Your driver cancelled the ride.",
      data: {
        type: SOCKET_EVENTS.RIDE_CANCELLED_BY_DRIVER,
        rideId: updatedRide._id.toString(),
      },
      userType: "passenger",
    });
    res.json({
      success: true,
      message: "Ride cancelled successfully",
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
      lat,
      rideId
    );

    const { ride, ...driverLocation } = updatedDriver;

    if (ride?.passenger) {
      const passengerId = ride.passenger.toString();

      // Always emit real-time location update
      emitToPassenger(passengerId, SOCKET_EVENTS.DRIVER_LOCATION_UPDATED, {
        rideId,
        driver: driverLocation,
        status: ride.status,
        timestamp: new Date().getTime(),
      });
      emitAdminDriverLocation(driverLocation, {
        rideId,
        status: ride.status,
        passengerId,
      });

      if (ride.status === "accepted") {
        let etaMinutes = null;
        let distanceToPickup = null;
        try {
          if (driverLocation.dbSaved && ride.pickup?.coordinates?.length === 2 && driverLocation?.coordinates) {
            const matrix = await getDistanceMatrix({
              origins: [driverLocation.coordinates],
              destinations: [ride.pickup.coordinates],
            });
            const element = matrix.rows[0]?.elements[0];
            etaMinutes = element?.durationInTraffic?.minutes || element?.duration?.minutes || null;
            distanceToPickup = element?.distance || null;
          }
        } catch (e) {
          etaMinutes = null;
        }

        // Notify passenger that driver is on the way
        emitToPassenger(passengerId, SOCKET_EVENTS.DRIVER_EN_ROUTE, {
          rideId,
          driver: driverLocation,
          pickupLocation: ride.pickup,
          etaMinutes,
          distanceToPickup,
          message: "Your driver is on the way",
        });
      }

      if (ride.status === "ongoing" || ride.status === "started") {
        let etaToDrop = null;
        let distanceToDrop = null;
        try {
          if (driverLocation.dbSaved && ride.drop?.coordinates?.length === 2 && driverLocation?.coordinates) {
            const matrix = await getDistanceMatrix({
              origins: [driverLocation.coordinates],
              destinations: [ride.drop.coordinates],
            });
            const element = matrix.rows[0]?.elements[0];
            etaToDrop = element?.durationInTraffic?.minutes || element?.duration?.minutes || null;
            distanceToDrop = element?.distance || null;
          }
        } catch (e) {
          etaToDrop = null;
        }

        emitToPassenger(passengerId, SOCKET_EVENTS.DRIVER_LOCATION_UPDATED, {
          rideId,
          driver: driverLocation,
          dropLocation: ride.drop,
          etaToDropMinutes: etaToDrop,
          distanceToDrop,
          message: "Your ride is in progress",
        });
      }
    }

    res.json({
      success: true,
      message: "Location updated",
      driver: driverLocation,
      dbSaved: driverLocation.dbSaved,
    });
    await emitAdminDashboardStats();
  } catch (error) {
    next(error);
  }
};

//------------------------- Driver Cancellation Reasons ------------------------- 

export const getDriverCancellationReasons = (req, res, next) => {
  try {
    const reasons = Object.entries(DRIVER_CANCELLATION_REASONS).map(
      ([code, text]) => ({ code, text })
    )
    res.json({
      success: true,
      message: "Driver Cancellaition Reasons fetched succesfully",
      reasons
    })
  } catch (error) {
    next(error)
  }
}
