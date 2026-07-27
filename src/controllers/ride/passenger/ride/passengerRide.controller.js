import {
  createRideService,
  updateRideService,
  endRideService,
  updatePassengerLocationService,
} from "../../../../services/rideServices/passengerRideService/passengerRide.service.js";
import { cancelRideService } from "../../../../services/rideServices/rideCancellation.service.js";
import {
  createPaymentOrder,
  verifyPayment as verifyRazorpayPayment,
} from "../../../../services/payment/payment.service.js";
import {
  SOCKET_EVENTS,
  emitToDriver,
  emitToPassenger,
} from "../../../../config/socket/socket.js";
import { Ride } from "../../../../models/ride/ride.model.js";
import { Passenger } from "../../../../models/passenger/passenger.model.js";
import { sendToUser } from "../../../../services/notification/sendToUser.js";
import { Driver } from "../../../../models/driver/driver.model.js";
import { PASSENGER_CANCELLATION_REASONS } from "../../../../common/cancellationReasons.js";

//-------------------------- Update passenger Location --------------------------

export const updatePassengerLocation = async (req, res, next) => {
  try {
    const { lng, lat } = req.body;

    if (typeof lng !== "number" || typeof lat !== "number") {
      throw new Error("Latitude and longitude must be valid numbers");
    }

    const passenger = req.passenger;

    const updatedPassenger = await updatePassengerLocationService(
      passenger,
      lng,
      lat,
    );

    res.status(200).json({
      success: true,
      message: updatedPassenger.dbSaved
        ? "Passenger location saved successfully"
        : "Passenger location already exists",
      passenger: updatedPassenger,
      dbSaved: updatedPassenger.dbSaved,
    });
  } catch (error) {
    next(error);
  }
};

//---------------------------- Create Ride ----------------------------

export const createRide = async (req, res) => {
  try {
    const passengerId = req.passenger._id;
    const { pickup, drop, vehicleType, paymentMethod } = req.body;

    // Validate payment method
    if (!["cash", "card", "online"].includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment method. Must be one of: cash, card, online",
      });
    }

    const { ride, nearbyDrivers, offeredDriver, driverEtas } = await createRideService({
      passengerId,
      pickup,
      drop,
      vehicleType,
      paymentMethod,
    });

    let paymentData = {};

    // Handle card/online payment if required before ride
    if (paymentMethod !== "cash" && ride.isPaymentRequiredBeforeRide) {
      const paymentResult = await createPaymentOrder(ride.fareEstimate, "INR", {
        rideId: ride._id.toString(),
        passengerId: passengerId.toString(),
        type: "ride_payment",
      });

      if (!paymentResult.success) {
        await Ride.findByIdAndUpdate(ride._id, {
          paymentStatus: "failed",
          status: "cancelled",
        });

        return res.status(400).json({
          success: false,
          message: "Payment processing failed",
          error: paymentResult.error,
        });
      }

      ride.paymentProvider = "razorpay";
      ride.paymentOrderId = paymentResult.orderId;
      ride.razorpayOrderId = paymentResult.orderId;
      ride.paymentStatus = "pending";
      await ride.save();

      paymentData = {
        provider: "razorpay",
        keyId: paymentResult.keyId,
        orderId: paymentResult.orderId,
        amountInPaise: paymentResult.amountInPaise,
        currency: paymentResult.currency,
        paymentStatus: "pending",
      };
    }

    // Notify only the sequentially offered driver (rotation continues via timeout).
    const driversToNotify = offeredDriver ? [offeredDriver] : [];

    driversToNotify.forEach((driver) => {
      const driverId = driver._id.toString();
      console.log("Emitting ride.requested to driver room:", driverId);
      emitToDriver(driverId, SOCKET_EVENTS.RIDE_REQUESTED, {
        rideId: ride._id,
        pickup: ride.pickup,
        drop: ride.drop,
        fareEstimate: ride.fareEstimate,
        distance: ride.distance,
        routeDetails: ride.routeDetails,
        driverEta:
          driverEtas.find((eta) => eta.driverId.toString() === driverId) ||
          null,
        vehicleType: ride.vehicleType,
        paymentMethod: ride.paymentMethod,
        paymentStatus: ride.paymentStatus,
        passenger: {
          name: ride.passenger.name,
          contactNumber: ride.passenger.contactNumber,
          rating: ride.passenger.rating,
        },
      });
    });
    console.log(
      "Offered driver:",
      offeredDriver?._id?.toString?.() || null,
      "| Nearby candidates:",
      nearbyDrivers.map((d) => d._id.toString()),
    );
    // Send push notifications to the offered driver
    for (const driver of driversToNotify) {
      const driverData = await Driver.findById(driver._id).select("fcmTokens");

      if (!driverData?.fcmTokens?.length) {
        console.log(
          "Skipping driver, no FCM tokens:",
          driver._id.toString(),
        );
        continue;
      }

      await sendToUser({
        user: driverData,
        title: "New Ride Request",
        body: "You have received a new ride request.",
        data: {
          type: SOCKET_EVENTS.RIDE_REQUESTED,
          rideId: ride._id.toString(),
        },
        userType: "driver",
      });
    }

    // Notify passenger about ride creation
    emitToPassenger(passengerId, SOCKET_EVENTS.RIDE_CREATED, {
      rideId: ride._id,
      pickup: ride.pickup,
      drop: ride.drop,
      fareEstimate: ride.fareEstimate,
      distance: ride.distance,
      routeDetails: ride.routeDetails,
      driverEtas,
      vehicleType: ride.vehicleType,
      paymentMethod: ride.paymentMethod,
      paymentStatus: ride.paymentStatus,
      ...paymentData,
    });

    // Send push notification to passenger
    const passenger = await Passenger.findById(passengerId).select("fcmTokens");

    await sendToUser({
      user: passenger,
      title: "Ride Created",
      body: "Your ride has been created successfully.",
      data: {
        type: SOCKET_EVENTS.RIDE_CREATED,
        rideId: ride._id.toString(),
      },
      userType: "passenger",
    });

    res.status(201).json({
      success: true,
      ride,
      driverEtas,
      ...paymentData,
    });
  } catch (error) {
    console.error("Error creating ride:", error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to create ride",
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

    // Notify passenger about ride update
    emitToPassenger(passengerId, SOCKET_EVENTS.RIDE_DROP_LOCATION_UPDATED, {
      rideId: ride._id,
      status: ride.status,
      pickup: ride.pickup,
      drop: ride.drop,
      distance: ride.distance,
      fareEstimate: ride.fareEstimate,
      routeDetails: ride.routeDetails,
    });

    // Send push notification to passenger
    const passenger = await Passenger.findById(passengerId).select("fcmTokens");
    await sendToUser({
      user: passenger,
      title: "Drop Location Updated",
      body: "Your destination has been updated.",
      data: {
        type: SOCKET_EVENTS.RIDE_DROP_LOCATION_UPDATED,
        rideId: ride._id.toString(),
      },
      userType: "passenger",
    });

    // Notify driver about ride update
    if (ride.driver) {
      emitToDriver(ride.driver, SOCKET_EVENTS.RIDE_DROP_LOCATION_UPDATED, {
        rideId: ride._id,
        status: ride.status,
        pickup: ride.pickup,
        drop: ride.drop,
        distance: ride.distance,
        fareEstimate: ride.fareEstimate,
        routeDetails: ride.routeDetails,
        vehicleType: ride.vehicleType,
        paymentMethod: ride.paymentMethod,
        paymentStatus: ride.paymentStatus,
        passenger: {
          name: ride.passenger.name,
          contactNumber: ride.passenger.contactNumber,
          rating: ride.passenger.rating,
        },
      });
    }

    // Send push notification to driver
    if (ride.driver) {
      const driver = await Driver.findById(ride.driver).select("fcmTokens");
      await sendToUser({
        user: driver,
        title: "Drop Location Updated",
        body: "Passenger updated the destination.",
        data: {
          type: SOCKET_EVENTS.RIDE_DROP_LOCATION_UPDATED,
          rideId: ride._id.toString(),
        },
        userType: "driver",
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

//--------------------------------- Cancel Ride ---------------------------------

export const cancelRide = async (req, res, next) => {
  try {
    const passengerId = req.passenger._id;
    const { reasonCode, reasonText, rideId } = req.body;

    if (!rideId) {
      return res.status(400).json({
        success: false,
        message: "Ride ID is required",
      });
    }

    if (!reasonCode) {
      return res.status(400).json({
        success: false,
        message: "Cancellation reason is required",
      });
    }

    const ride = await cancelRideService({
      rideId,
      actorId: passengerId,
      cancelledBy: "Passenger",
      reasonCode,
      reasonText,
    });

    // Notify passenger about ride cancellation
    emitToPassenger(passengerId, SOCKET_EVENTS.RIDE_CANCELLED_BY_PASSENGER, {
      rideId: ride._id,
      status: ride.status,
      cancelledBy: "Passenger",
      reasonCode: ride.cancellation.reasonCode,
      reasonText: ride.cancellation.reasonText,
    });

    // Send push notification to passenger
    const passenger = await Passenger.findById(passengerId).select("fcmTokens");

    await sendToUser({
      user: passenger,
      title: "Ride Cancelled",
      body: "Your ride has been cancelled successfully.",
      data: {
        type: SOCKET_EVENTS.RIDE_CANCELLED_BY_PASSENGER,
        rideId: ride._id.toString(),
      },
      userType: "passenger",
    });

    const driverToNotify = ride.driver || ride._offeredDriverId;

    // Notify assigned or currently offered driver about ride cancellation
    if (driverToNotify) {
      emitToDriver(driverToNotify, SOCKET_EVENTS.RIDE_CANCELLED_BY_PASSENGER, {
        rideId: ride._id,
        status: ride.status,
        cancelledBy: "Passenger",
        reasonCode: ride.cancellation.reasonCode,
        reasonText: ride.cancellation.reasonText,
      });

      const driver = await Driver.findById(driverToNotify).select("fcmTokens");
      await sendToUser({
        user: driver,
        title: "Ride Cancelled",
        body: "Passenger cancelled the ride.",
        data: {
          type: SOCKET_EVENTS.RIDE_CANCELLED_BY_PASSENGER,
          rideId: ride._id.toString(),
        },
        userType: "driver",
      });
    }
    res.status(200).json({
      success: true,
      message: "Ride cancelled successfully",
      ride,
    });
  } catch (error) {
    next(error);
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
      return res
        .status(404)
        .json({ success: false, message: "Ride not found" });
    }

    // For card/online payments after ride completion
    if (ride.paymentMethod !== "cash" && !ride.isPaymentRequiredBeforeRide) {
      const paymentResult = await createPaymentOrder(ride.fareEstimate, "INR", {
        rideId: ride._id.toString(),
        passengerId: passengerId.toString(),
        type: "ride_payment",
      });

      if (!paymentResult.success) {
        return res.status(400).json({
          success: false,
          message: "Payment processing failed",
          error: paymentResult.error,
        });
      }

      ride.paymentProvider = "razorpay";
      ride.paymentOrderId = paymentResult.orderId;
      ride.razorpayOrderId = paymentResult.orderId;
      ride.paymentStatus = "pending";
      await ride.save();

      // Send payment details to client
      return res.status(200).json({
        success: true,
        requiresPayment: true,
        provider: "razorpay",
        keyId: paymentResult.keyId,
        orderId: paymentResult.orderId,
        amountInPaise: paymentResult.amountInPaise,
        currency: paymentResult.currency,
        message: "Payment required to complete ride",
        ride,
      });
    }

    // For cash payments or pre-paid rides, complete the ride
    const completedRide = await endRideService({
      rideId,
      passengerId,
      passengerLocationCoordinates,
    });

    // Notify passenger about ride completion
    emitToPassenger(passengerId, SOCKET_EVENTS.RIDE_COMPLETED, {
      rideId: completedRide._id,
      status: completedRide.status,
      paymentStatus: completedRide.paymentStatus,
    });

    // Send push notification to passenger
    const passenger = await Passenger.findById(passengerId).select("fcmTokens");
    await sendToUser({
      user: passenger,
      title: "Ride Completed",
      body: `Your ride has been completed successfully.`,
      data: {
        type: SOCKET_EVENTS.RIDE_COMPLETED,
        rideId: completedRide._id.toString(),
      },
      userType: "passenger",
    });

    // Notify driver about ride completion
    if (completedRide.driver) {
      emitToDriver(completedRide.driver, SOCKET_EVENTS.RIDE_COMPLETED, {
        rideId: completedRide._id,
        status: completedRide.status,
        paymentStatus: completedRide.paymentStatus,
      });
    }

    // Send push notification to driver
    if (completedRide.driver) {
      const driver = await Driver.findById(completedRide.driver).select(
        "fcmTokens",
      );
      await sendToUser({
        user: driver,
        title: "Ride Completed",
        body: "Ride completed successfully.",
        data: {
          type: SOCKET_EVENTS.RIDE_COMPLETED,
          rideId: completedRide._id.toString(),
        },
        userType: "driver",
      });
    }
    res.status(200).json({
      success: true,
      message: "Ride ended successfully",
      ride: completedRide,
    });
  } catch (err) {
    console.error("Error ending ride:", err);
    res.status(400).json({
      success: false,
      message: err.message || "Failed to end ride",
    });
  }
};

//------------------------ Get Passenger Cancellation Reason ------------------------

export const getPassengerCancellationReasons = (req, res, next) => {
  try {
    const reasons = Object.entries(PASSENGER_CANCELLATION_REASONS).map(
      ([code, text]) => ({ code, text }),
    );
    res.json({
      success: true,
      message: "Passenger Cancellaition Reasons fetched succesfully",
      reasons,
    });
  } catch (error) {
    next(error);
  }
};

//------------------------------ Confirm Payment ------------------------------

export const confirmPayment = async (req, res) => {
  try {
    const passengerId = req.passenger._id;
    const { rideId, razorpayOrderId, razorpayPaymentId, razorpaySignature } =
      req.body;

    // Verify the ride exists and belongs to the passenger
    const ride = await Ride.findOne({ _id: rideId, passenger: passengerId });

    if (!ride) {
      return res
        .status(404)
        .json({ success: false, message: "Ride not found" });
    }

    const paymentResult = await verifyRazorpayPayment({
      rideId,
      passengerId,
      razorpayOrderId: razorpayOrderId || ride.razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    if (!paymentResult.success) {
      // Update ride status if payment fails
      if (ride.paymentStatus !== "paid") {
        ride.paymentStatus = "failed";
        await ride.save();
      }

      return res.status(400).json({
        success: false,
        message: "Payment confirmation failed",
        error: paymentResult.error,
        paymentStatus: "failed",
      });
    }

    if (paymentResult.paymentStatus === "paid") {
      ride.paymentStatus = "paid";
      ride.paymentProvider = "razorpay";
      ride.paymentOrderId = paymentResult.orderId;
      ride.razorpayOrderId = paymentResult.orderId;
      ride.razorpayPaymentId = paymentResult.paymentId;
      ride.razorpaySignature = razorpaySignature;
      ride.transactionDate = new Date();
      await ride.save();

      // Complete the ride if it was waiting for payment
      if (ride.status === "completed" && ride.paymentStatus === "paid") {
        await endRideService({
          rideId: ride._id,
          passengerId: ride.passenger,
          paymentStatus: "paid",
        });
      }

      // Notify driver about successful payment
      if (ride.driver) {
        emitToDriver(ride.driver, "payment:received", {
          rideId: ride._id,
          amount: ride.fareEstimate,
          currency: "inr",
        });
      }
    }

    res.status(200).json({
      success: true,
      paymentStatus: ride.paymentStatus,
      provider: "razorpay",
      orderId: paymentResult.orderId,
      paymentId: paymentResult.paymentId,
      ride,
    });
  } catch (err) {
    console.error("Error confirming payment:", err);
    res.status(400).json({
      success: false,
      message: err.message || "Failed to confirm payment",
    });
  }
};
