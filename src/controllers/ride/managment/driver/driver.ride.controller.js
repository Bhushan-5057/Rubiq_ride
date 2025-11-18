import { getIO } from "../../../../config/socket/socket.js";
import { acceptRideService, rejectRideService, startRideService,completeRideService } from "../../../../services/ride/managment/driver/accept.service.js";

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
