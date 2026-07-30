import {
  SOCKET_EVENTS,
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
import { DRIVER_CANCELLATION_REASONS } from "../../../common/cancellationReasons.js";
import { notifyRideParticipant } from "../../../helpers/rideNotify.helper.js";

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

    // Ride-scoped: only the booking passenger (online → socket, offline → push)
    await notifyRideParticipant({
      ride,
      userId: ride.passenger,
      role: "passenger",
      event: SOCKET_EVENTS.RIDE_DRIVER_ASSIGNED,
      payload,
      push: {
        title: "Ride Accepted",
        body: "Driver accepted your ride request.",
        data: { rideId: ride._id.toString() },
      },
    });
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

    // Ride-scoped: passenger only (canonical + legacy event names)
    await notifyRideParticipant({
      ride,
      userId: ride.passenger,
      role: "passenger",
      event: SOCKET_EVENTS.DRIVER_ARRIVED,
      payload,
      push: {
        title: "Driver Arrived",
        body: "Driver has arrived at your pickup location.",
        data: { rideId: ride._id.toString() },
      },
    });
    await notifyRideParticipant({
      ride,
      userId: ride.passenger,
      role: "passenger",
      event: SOCKET_EVENTS.DRIVER_ARRIVED_LEGACY,
      payload,
    });
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

    await notifyRideParticipant({
      ride,
      userId: ride.passenger,
      role: "passenger",
      event: SOCKET_EVENTS.RIDE_STARTED,
      payload: { rideId: ride._id },
      push: {
        title: "Ride Started",
        body: "Your ride has started.",
        data: { rideId: ride._id.toString() },
      },
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

    const completedPayload = {
      rideId: ride._id,
      status: ride.status,
      paymentStatus: ride.paymentStatus,
      paymentMethod: ride.paymentMethod,
      fare: ride.fareEstimate,
    };

    await notifyRideParticipant({
      ride,
      userId: ride.passenger,
      role: "passenger",
      event: SOCKET_EVENTS.RIDE_COMPLETED,
      payload: completedPayload,
      push: {
        title: "Ride Completed",
        body: "Your ride has been completed.",
        data: { rideId: ride._id.toString() },
      },
    });

    // If payment is cash, mark as paid immediately
    if (ride.paymentMethod === 'cash') {
      ride.paymentStatus = 'paid';
      ride.transactionDate = new Date();
      await ride.save();
    }

    if (ride.paymentStatus === 'paid') {
      await notifyRideParticipant({
        ride,
        userId: driverId,
        role: "driver",
        event: "payment:received",
        payload: {
          rideId: ride._id,
          amount: ride.fareEstimate,
          currency: "inr",
          paymentMethod: ride.paymentMethod,
        },
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

    await notifyRideParticipant({
      ride: updatedRide,
      userId: updatedRide.passenger,
      role: "passenger",
      event: SOCKET_EVENTS.RIDE_CANCELLED_BY_DRIVER,
      payload: {
        rideId: updatedRide._id,
        cancelledBy: "Driver",
        reasonCode: updatedRide.cancellation.reasonCode,
        reasonText: updatedRide.cancellation.reasonText,
        paymentStatus: updatedRide.paymentStatus,
        refundProcessed: updatedRide.paymentStatus === "refunded",
      },
      push: {
        title: "Ride Cancelled",
        body: "Your driver cancelled the ride.",
        data: { rideId: updatedRide._id.toString() },
      },
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
      const locationPayload = {
        rideId,
        driver: driverLocation,
        status: ride.status,
        timestamp: new Date().getTime(),
      };

      if (
        (ride.status === "started" || ride.status === "ongoing") &&
        driverLocation.dbSaved &&
        ride.drop?.coordinates?.length === 2 &&
        driverLocation?.coordinates
      ) {
        try {
          const matrix = await getDistanceMatrix({
            origins: [driverLocation.coordinates],
            destinations: [ride.drop.coordinates],
          });
          const element = matrix.rows[0]?.elements[0];
          locationPayload.dropLocation = ride.drop;
          locationPayload.etaToDropMinutes =
            element?.durationInTraffic?.minutes ||
            element?.duration?.minutes ||
            null;
          locationPayload.distanceToDrop = element?.distance || null;
          locationPayload.message = "Your ride is in progress";
        } catch {
          locationPayload.message = "Your ride is in progress";
        }
      }

      // High-frequency: socket only to ride passenger (no push / no nearby fan-out)
      await notifyRideParticipant({
        ride,
        userId: passengerId,
        role: "passenger",
        event: SOCKET_EVENTS.DRIVER_LOCATION_UPDATED,
        payload: locationPayload,
      });

      if (ride.status === "accepted") {
        let etaMinutes = null;
        let distanceToPickup = null;
        try {
          if (
            driverLocation.dbSaved &&
            ride.pickup?.coordinates?.length === 2 &&
            driverLocation?.coordinates
          ) {
            const matrix = await getDistanceMatrix({
              origins: [driverLocation.coordinates],
              destinations: [ride.pickup.coordinates],
            });
            const element = matrix.rows[0]?.elements[0];
            etaMinutes =
              element?.durationInTraffic?.minutes ||
              element?.duration?.minutes ||
              null;
            distanceToPickup = element?.distance || null;
          }
        } catch {
          etaMinutes = null;
        }

        await notifyRideParticipant({
          ride,
          userId: passengerId,
          role: "passenger",
          event: SOCKET_EVENTS.DRIVER_ON_ROUTE,
          payload: {
            rideId,
            driver: driverLocation,
            pickupLocation: ride.pickup,
            etaMinutes,
            distanceToPickup,
            message: "Your driver is on the way",
          },
        });
      }
    }

    res.json({
      success: true,
      message: "Location updated",
      driver: driverLocation,
      dbSaved: driverLocation.dbSaved,
    });
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
