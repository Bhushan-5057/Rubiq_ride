import { cancelRideService } from "../../../../../../services/ride/managment/passenger/rideStatus/cancelRide/cancelRide.Service.js";


export const cancelRide = async (req, res) => {
  try {
    const passengerId = req.passenger._id; 
    const { rideId } = req.params;

    const ride = await cancelRideService(passengerId, rideId);

    res.status(200).json({
      success: true,
      message: "Ride cancelled successfully",
      ride,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
