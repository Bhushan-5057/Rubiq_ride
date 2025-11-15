import { getIO } from "../../../../config/socket/socket.js";
import { acceptRideService } from "../../../../services/ride/managment/driver/accept.service.js";

export const acceptRide = async (req, res) => {
  try {
    const driverId = req.driver._id; 
    const { rideId } = req.body;    

    const ride = await acceptRideService({ rideId, driverId });

    const io = getIO();

    io.to(ride.passenger.toString()).emit("rideAccepted", {
      rideId: ride._id,
      driver: {
        id: driverId,
        name: req.driver.name,
        vehicleNumber: req.driver.vehicleNumber,
        vehicleType: req.driver.vehicleType,
      },
      pickup: ride.pickup,
      drop: ride.drop,
      fareEstimate: ride.fareEstimate,
    });

    res.json({ success: true, ride });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};
