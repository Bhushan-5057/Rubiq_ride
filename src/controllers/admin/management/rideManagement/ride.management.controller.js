import { deleteAllRidesService, deleteRideService, getAllRidesService,getSingleRideService } 
from "../../../../services/rideServices/adminRideServices/getRidesForAdmin.service.js"; 


export const getRideById = async (req, res) => {
  try {
    const { rideId } = req.params;
    if (!rideId) throw new Error("Ride ID is required");  
    const rides = await getSingleRideService(rideId);
    res.status(200).json({
      success: true,
      rides,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }

}


export const getAllRides = async (req, res) => {
  try {
    const rides = await getAllRidesService();

    res.status(200).json({
      success: true,
      rides,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};


//delete ride controller
export const deleteRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    if (!rideId) throw new Error("Ride ID is required");

    await deleteRideService(rideId);

    res.status(200).json({ success: true, message: "Ride deleted successfully" });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};


//delete all rides controller
export const deleteAllRides = async (req, res) => {
  try {
    const deletedCount = await deleteAllRidesService();

    res.status(200).json({
      success: true,
      message: `${deletedCount} rides deleted successfully`,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};