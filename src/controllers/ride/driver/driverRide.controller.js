import { getIO } from "../../../config/socket/socket.js";
import { acceptRideService, rejectRideService, startRideService,completeRideService } from "../../../services/rideServices/driverRideService/driverRideService.service.js";
import { updateDriverLocationService } from "../../../services/driverServices/driverManagementService/driverRideService/driverRide.service.js";
import { Ride } from "../../../models/ride/ride.model.js"; 


//controller for driver to accept ride
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

//controller for driver to start ride
export const startRide = async (req, res) => {
    try {
        const driverId = req.driver._id;
        const { rideId, otpForStartRide } = req.body;
        console.log("Received OTP:", otpForStartRide);
        console.log("Ride ID:", rideId);
        const ride = await startRideService({ rideId, driverId, otpForStartRide });
        const io = getIO();
        io.to(ride.passenger.toString()).emit("rideStarted", {
            rideId: ride._id,
        });
        res.json({ success: true, ride });
    } catch (e) {
        res.status(400).json({ success: false, message: e.message });
    }
} 

export const completeRide = async (req, res) => {
    try {
        const driverId = req.driver._id;
        const { rideId } = req.body;
        const ride = await completeRideService({ rideId, driverId }); 
        const io = getIO();
        io.to(ride.passenger.toString()).emit("rideCompleted", {
            rideId: ride._id,
        });
        res.json({ success: true, ride });
    } catch (e) {
        res.status(400).json({ success: false, message: e.message });
    }

}

//controller for driver to reject ride
export const rejectRide = async (req, res) => {
    try {
        const driverId = req.driver._id;
        const { rideId } = req.body;
        const ride = await rejectRideService({ rideId, driverId });

        const io = getIO();

        io.to(ride.passenger.toString()).emit("rideRejected", {
            rideId: ride._id,
        });
        res.json({ success: true, ride });
    } catch (e) {
        res.status(400).json({ success: false, message: e.message });
    }
} 

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
