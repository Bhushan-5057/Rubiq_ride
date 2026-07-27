import {
  getAllRidesForDriverService,
  getRideByIdService
} from "../../../services/driverServices/index.js";

//--------------------------- Get Ride by ID ---------------------------
export const getRideById = async (req, res, next) => {
  try {
    const driverId = req.driver._id;
    const { rideId } = req.params;
    const ride = await getRideByIdService(rideId, driverId);
    res.status(200).json({
      success: true,
      message: "Ride data fetched successfully",
      ride
    });
  } catch (error) {
    next(error)
  }
};

//----------------------------- Get All Rides ----------------------------- 
export const getAllRidesForDriver = async (req, res) => {
  try {
    const driverId = req.driver._id;
    const { rides, stats } = await getAllRidesForDriverService(
      driverId,
      req.query,
    );
    res.status(200).json({ success: true, rides, stats });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};
