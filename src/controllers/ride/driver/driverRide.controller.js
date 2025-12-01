import { getIO } from "../../../config/socket/socket.js";
import { 
  acceptRideService, 
  rejectRideService, 
  startRideService, 
  completeRideService, 
  givePassengerFeedbackService 
} from "../../../services/rideServices/index.js";
import { updateDriverLocationService } from "../../../services/driverServices/index.js";
import { Ride } from "../../../models/ride/ride.model.js";

//controller for driver to accept ride
export const acceptRide = async (req, res) => {
  try {
    const driverId = req.driver._id;
    const { rideId } = req.body;

    const ride = await acceptRideService({ rideId, driverId });

    const io = getIO();

    io.to(ride.passenger.toString()).emit("driver_assigned", {
      rideId: ride._id,
      driver: {
        id: driverId,
        name: req.driver.name,
        vehicleNumber: req.driver.vehicleNumber,
        vehicleType: req.driver.vehicleType,
      },
      status:ride.status,
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
    const { rideId, otpForStartRide, driverLocationCoordinates } = req.body;
    const ride = await startRideService({
      rideId,
      driverId,
      otpForStartRide,
      driverLocationCoordinates,
    });
    const io = getIO();
    io.to(ride.passenger.toString()).emit("ride_started", {
      rideId: ride._id,
    });
    res.json({ success: true, ride });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
}

//controller for driver to complete ride
export const completeRide = async (req, res) => {
  try {
    const driverId = req.driver._id;
    const { rideId, driverLocationCoordinates } = req.body;
    const ride = await completeRideService({
      rideId,
      driverId,
      driverLocationCoordinates,
    });
    const io = getIO();
    io.to(ride.passenger.toString()).emit("ride_ended", {
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

//controller to update driver location
export const updateDriverLocation = async (req, res) => {
  try {
    const { lng, lat,  rideId } = req.body;

    if (typeof lng !== 'number' || typeof lat !== 'number') {
      throw new Error('Latitude and longitude are required and must be numbers');
    }

    const updatedDriver = await updateDriverLocationService(req.driver, lng,lat,  rideId);

    // Only proceed with ride-specific updates if rideId is provided
    if (rideId) {
      const ride = await Ride.findOne({
        _id: rideId,
        driver: req.driver._id,
        passenger: { $exists: true, $ne: null },
        status: { $in: ["accepted", "on_the_way", "driver_arrived", "ongoing"] }
      }).select('passenger status').lean();

      if (ride && ride.passenger) {
        const io = getIO();
        io.to(ride.passenger.toString()).emit("driverLocationUpdate", {
          rideId,
          driver: {
            id: req.driver._id,
            name: req.driver.name,
            vehicleType: req.driver.vehicleType,
            vehicleNumber: req.driver.vehicleNumber,
          },
          coordinates: [lng, lat],
          longitude: lng,
          latitude: lat,
          updatedAt: new Date(),
          status: ride.status // Include current ride status in the update
        });
      }
    }

    res.json({
      success: true,
      message: "Location updated successfully",
      driver: updatedDriver,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

//controller for driver to give feedback to passenger
export const givePassengerFeedback = async (req, res) => {
  try {
    const driverId = req.driver._id;
    const { rideId, rating, comment } = req.body;

    if (![1, 2, 3, 4, 5].includes(Number(rating))) {
      return res.status(400).json({ success: false, message: "Invalid rating" });
    }

    const result = await givePassengerFeedbackService({
      rideId,
      driverId,
      rating,
      comment,
    });

    const io = getIO();

    io.to(result.passengerId.toString()).emit("passenger_feedback_received", {
      rideId: result.rideId,
      rating: result.rating,
      comment: result.comment,
      driverId,
    });

    res.status(200).json({ success: true, message: "Passenger Feedback submitted successfully" });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};