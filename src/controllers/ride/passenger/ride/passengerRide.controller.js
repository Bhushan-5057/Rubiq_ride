import { createRideService,cancelRideService, updateRideService } 
from "../../../../services/rideServices/passengerRideService/passengerRideService/passengerRide.service.js";
import { getIO } from "../../../../config/socket/socket.js";


export const createRide = async (req, res) => {
  try {
    const passengerId = req.passenger._id;

    const { pickup, drop } = req.body;

    const { ride, nearbyDrivers } = await createRideService({
      passengerId,
      pickup,
      drop,
    });

    const io = getIO();

    nearbyDrivers.forEach((driver) => {
      io.to(driver._id.toString()).emit("rideRequest", {
        rideId: ride._id,
        pickup,
        drop,
        fareEstimate: ride.fareEstimate,
      });
    });

    io.to(passengerId.toString()).emit("rideCreated", {
      rideId: ride._id,
      pickup,
      drop,
      fareEstimate: ride.fareEstimate,
    });

    res.status(201).json({ success: true, ride });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};


export const updateRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const passengerId = req.passenger._id;
    const { drop } = req.body;

    const ride = await updateRideService({ rideId, passengerId, drop });

    const io = getIO();

    io.to(passengerId.toString()).emit("rideUpdated", {
      rideId: ride._id,
      status: ride.status,
      pickup: ride.pickup,
      drop: ride.drop,
      distance: ride.distance,
      fareEstimate: ride.fareEstimate,
    });

    if (ride.driver) {
      io.to(ride.driver.toString()).emit("rideUpdated", {
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
