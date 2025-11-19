import { cancelRideService, updateRideService } from "../../../../../../services/ride/managment/passenger/rideStatus/cancelRide/cancelRide.service.js";


export const updateRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const passengerId = req.passenger._id;
    const { drop } = req.body;

    const ride = await updateRideService({ rideId, passengerId, drop });

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

    res.status(200).json({
      success: true,
      message: "Ride cancelled successfully",
      ride,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
