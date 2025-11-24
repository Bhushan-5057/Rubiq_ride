import { getIO } from "../../../config/socket/socket.js";
import { acceptRideService, rejectRideService, startRideService, completeRideService, driverOnTheWayService, driverArrivedService, givePassengerFeedbackService } from "../../../services/rideServices/index.js";
import { updateDriverLocationService, getAllRidesForDriverService, getRideByIdService } from "../../../services/driverServices/index.js";
import { Ride } from "../../../models/ride/ride.model.js";

//controller to get ride by id for driver
export const getRideById = async (req, res) => {
  try {
    const driverId = req.driver._id;
    const { rideId } = req.params;
    const ride = await getRideByIdService(rideId, driverId);
    res.status(200).json({ success: true, ride });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

//controller to get all rides for driver
export const getAllRidesForDriver = async (req, res) => {
  try {
    const driverId = req.driver._id;
    const rides = await getAllRidesForDriverService(driverId);
    res.status(200).json({ success: true, rides });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
}

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
    console.log("Received OTP:", otpForStartRide);
    console.log("Ride ID:", rideId);
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

//controller for driver to notify passenger that driver is on the way
export const driverOnTheWay = async (req, res) => {
  try {
    const driverId = req.driver._id;
    const { rideId, driverLocationCoordinates } = req.body;

    const ride = await driverOnTheWayService({
      rideId,
      driverId,
      driverLocationCoordinates,
    });

    const io = getIO();

    io.to(ride.passenger.toString()).emit("driver_on_the_way", {
      rideId: ride._id,
      driver: {
        id: driverId,
        name: req.driver.name,
        vehicleType: req.driver.vehicleType,
        vehicleNumber: req.driver.vehicleNumber,
      },
    });

    res.status(200).json({ success: true, message: "Notified passenger that driver is on the way" });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

//controller for driver to notify passenger that driver has arrived
export const driverArrived = async (req, res) => {
  try {
    const driverId = req.driver._id;
    const { rideId, driverLocationCoordinates } = req.body;

    const ride = await driverArrivedService({
      rideId,
      driverId,
      driverLocationCoordinates,
    });

    const io = getIO();

    io.to(ride.passenger.toString()).emit("driver_arrived", {
      rideId: ride._id,
      driver: {
        id: driverId,
        name: req.driver.name,
        vehicleType: req.driver.vehicleType,
        vehicleNumber: req.driver.vehicleNumber,
      },
    });

    res.status(200).json({ success: true, message: "Notified passenger that driver has arrived" });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
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