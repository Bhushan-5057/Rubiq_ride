import { updateDriverLocationService } from "../../../../services/driver/management/ride/driver.ride.service.js";
import { getIO } from "../../../../config/socket/socket.js";
import { Ride } from "../../../../models/ride/ride.model.js";

export const updateDriverLocation = async (req, res) => {
  try {
    const { lat, lng } = req.body;

    const updatedDriver = await updateDriverLocationService(req.driver, lat, lng);

    const io = getIO();

    const activeRides = await Ride.find({
      driver: req.driver._id,
      status: { $in: ["accepted", "ongoing"] },
    }).lean();

    activeRides.forEach((ride) => {
      if (!ride.passenger) return;

      io.to(ride.passenger.toString()).emit("driverLocationUpdate", {
        rideId: ride._id,
        driver: {
          id: req.driver._id,
          name: req.driver.name,
          vehicleType: req.driver.vehicleType,
          vehicleNumber: req.driver.vehicleNumber,
        },
        coordinates: updatedDriver.coordinates,
        latitude: updatedDriver.latitude,
        longitude: updatedDriver.longitude,
        updatedAt: updatedDriver.updatedAt,
      });
    });

    res.json({
      success: true,
      message: "Location updated successfully",
      driver: updatedDriver,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};