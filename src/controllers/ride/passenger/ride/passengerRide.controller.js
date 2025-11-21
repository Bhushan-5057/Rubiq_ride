import { createRideService,cancelRideService, updateRideService } 
from "../../../../services/rideServices/passengerRideService/passengerRideService/passengerRide.service.js";
import { getIO } from "../../../../config/socket/socket.js";
import { Ride } from "../../../../models/ride/ride.model.js";
import { Driver } from "../../../../models/driver/driver.model.js";

//controller to create a new ride for passenger
export const createRide = async (req, res) => {
  try {
    const passengerId = req.passenger._id;

    const { pickup, drop, vehicleType } = req.body;

    const { ride, nearbyDrivers } = await createRideService({
      passengerId,
      pickup,
      drop,
      vehicleType,
    });

    const io = getIO();

    nearbyDrivers.forEach((driver) => {
      io.to(driver._id.toString()).emit("new_ride_request", {
        rideId: ride._id,
        pickup,
        drop,
        fareEstimate: ride.fareEstimate,
        vehicleType: ride.vehicleType,
      });
    });

    io.to(passengerId.toString()).emit("ride_created", {
      rideId: ride._id,
      pickup,
      drop,
      fareEstimate: ride.fareEstimate,
      vehicleType: ride.vehicleType,
    });

    res.status(201).json({ success: true, ride });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
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

//controller for passenger to give feedback to driver
export const giveDriverFeedback = async (req, res) => {
  try {
    const passengerId = req.passenger._id;
    const { rideId, rating, comment } = req.body;

    if (![1, 2, 3, 4, 5].includes(Number(rating))) {
      return res.status(400).json({ success: false, message: "Invalid rating" });
    }

    const ride = await Ride.findById(rideId);

    if (!ride || ride.passenger.toString() !== passengerId.toString()) {
      return res.status(404).json({ success: false, message: "Ride not found" });
    }

    if (!ride.driver) {
      return res.status(400).json({ success: false, message: "Driver not assigned for this ride" });
    }

    const io = getIO();

    await Driver.findByIdAndUpdate(ride.driver, {
      $push: {
        feedbacks: {
          rating: Number(rating),
          comment,
          passenger: passengerId,
          ride: rideId,
        },
      },
    });

    io.to(ride.driver.toString()).emit("driver_feedback_received", {
      rideId,
      rating: Number(rating),
      comment,
      passengerId,
    });

    res.status(200).json({ success: true, message: "Feedback submitted successfully" });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
