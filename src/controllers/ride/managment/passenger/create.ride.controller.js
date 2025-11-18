import { getIO } from "../../../../config/socket/socket.js";
import { createRideService } from "../../../../services/ride/managment/passenger/create.service.js";

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

    res.status(201).json({ success: true, ride });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};
